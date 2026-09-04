/**
 * Guardar um documento: o que fica escrito, e o que se apaga quando a segunda
 * escrita falha.
 *
 * O teste que mais interessa deste ficheiro é o mais aborrecido: o estado
 * inicial é `por_verificar` e não há argumento nem caminho de código que o
 * mude. É esse que impede que, daqui a seis meses, alguém acrescente um
 * `estado` opcional ao pedido «só para o painel de administração poder criar
 * um já verificado».
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { BALDE_DOCUMENTOS } from "@/lib/documentos/contrato";

const estado = vi.hoisted(() => ({
  /** O que o `upload` devolve a seguir. */
  erroDeUpload: null as { message: string } | null,
  /** O que o `insert` devolve a seguir. */
  erroDeInsercao: null as { message: string } | null,
  erroDeRemocao: null as { message: string } | null,
  contagem: { count: 0 as number | null, error: null as { message: string } | null },
  subidos: [] as Array<{ balde: string; caminho: string; opcoes: Record<string, unknown> }>,
  inseridos: [] as Array<Record<string, unknown>>,
  removidos: [] as Array<{ balde: string; caminhos: string[] }>,
  /** Quantas vezes alguém pediu um URL público deste balde. Tem de ficar em zero. */
  urlsPublicos: 0,
}));

vi.mock("@/lib/supabase-admin", () => {
  const armazenamento = {
    from: (balde: string) => ({
      upload: vi.fn(async (caminho: string, _corpo: unknown, opcoes: Record<string, unknown>) => {
        estado.subidos.push({ balde, caminho, opcoes });
        return { data: null, error: estado.erroDeUpload };
      }),
      remove: vi.fn(async (caminhos: string[]) => {
        estado.removidos.push({ balde, caminhos });
        return { data: null, error: estado.erroDeRemocao };
      }),
      getPublicUrl: vi.fn(() => {
        estado.urlsPublicos += 1;
        return { data: { publicUrl: "NUNCA" } };
      }),
    }),
  };

  const tabela = () => ({
    insert: vi.fn(async (linha: Record<string, unknown>) => {
      estado.inseridos.push(linha);
      return { data: null, error: estado.erroDeInsercao };
    }),
    select: vi.fn(() => ({
      eq: vi.fn(async () => estado.contagem),
    })),
  });

  const duplo = { storage: armazenamento, from: vi.fn(tabela) };
  return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
});

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  arrumarNomeOriginal,
  contarDocumentosDaReferencia,
  guardarDocumento,
  sha256Hex,
} from "@/lib/documentos/guardar";

const REFERENCIA = "3f7c1e2a-0000-4000-8000-000000000001";
const PDF = new TextEncoder().encode("%PDF-1.7 prova");
/** Calculado fora deste processo: `printf '%PDF-1.7 prova' | sha256sum`. */
const SHA_DO_PDF = "ea6456ead0c45999c40f4dff91357dbdb44b31f9a82c8c6be57b19203532d3b4";

const pedido = () => ({
  referencia: REFERENCIA,
  tipo: "livro_azul" as const,
  nomeOriginal: "livro azul.pdf",
  mime: "application/pdf" as const,
  conteudo: PDF,
});

beforeEach(() => {
  estado.erroDeUpload = null;
  estado.erroDeInsercao = null;
  estado.erroDeRemocao = null;
  estado.contagem = { count: 0, error: null };
  estado.subidos = [];
  estado.inseridos = [];
  estado.removidos = [];
  estado.urlsPublicos = 0;
});

describe("sha256Hex", () => {
  it("dá os vectores publicados do SHA-256", () => {
    expect(sha256Hex(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
    expect(sha256Hex(new Uint8Array([]))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });

  it("dá hexadecimal minúsculo de 64 caracteres, que é o que a coluna exige", () => {
    expect(sha256Hex(PDF)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("arrumarNomeOriginal", () => {
  it("deixa um nome normal como está, acentos incluídos", () => {
    expect(arrumarNomeOriginal("Livro Azul do Ulisses.pdf")).toBe("Livro Azul do Ulisses.pdf");
    expect(arrumarNomeOriginal("digitalização.pdf")).toBe("digitalização.pdf");
  });

  it("fica com a última parte de um caminho", () => {
    expect(arrumarNomeOriginal("../../etc/passwd")).toBe("passwd");
    expect(arrumarNomeOriginal("C:\\Users\\ana\\livro.pdf")).toBe("livro.pdf");
  });

  it("tira os caracteres de controlo", () => {
    expect(arrumarNomeOriginal("livro\u0000\u001b[31mazul.pdf")).toBe("livro[31mazul.pdf");
  });

  it("põe tecto no comprimento", () => {
    expect(arrumarNomeOriginal("a".repeat(5000))).toHaveLength(200);
  });

  it("nunca devolve vazio", () => {
    expect(arrumarNomeOriginal("")).toBe("documento");
    expect(arrumarNomeOriginal("///")).toBe("documento");
  });
});

describe("guardarDocumento — o caminho feliz", () => {
  it("sobe para o balde privado e escreve a linha", async () => {
    const resultado = await guardarDocumento(pedido());
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    expect(estado.subidos).toHaveLength(1);
    expect(estado.subidos[0]!.balde).toBe(BALDE_DOCUMENTOS);
    expect(estado.subidos[0]!.opcoes).toMatchObject({
      contentType: "application/pdf",
      upsert: false,
    });

    // O caminho é `referência/tipo/uuid.ext` — o nome que o vendedor deu ao
    // ficheiro não entra nele.
    expect(estado.subidos[0]!.caminho).toMatch(
      new RegExp(`^${REFERENCIA}/livro_azul/[0-9a-f-]{36}\\.pdf$`)
    );
    expect(estado.subidos[0]!.caminho).not.toContain("livro azul");
  });

  it("o estado escrito é `por_verificar`, e mais nenhum", async () => {
    await guardarDocumento(pedido());
    expect(estado.inseridos[0]).toMatchObject({ estado: "por_verificar" });
  });

  it("escreve o SHA-256 do conteúdo e os bytes a sério", async () => {
    await guardarDocumento(pedido());
    expect(estado.inseridos[0]).toMatchObject({
      sha256: SHA_DO_PDF,
      bytes: PDF.byteLength,
      mime: "application/pdf",
      nome_original: "livro azul.pdf",
      referencia: REFERENCIA,
      tipo: "livro_azul",
    });
  });

  it("não pergunta o URL público do balde nem uma vez", async () => {
    await guardarDocumento(pedido());
    expect(estado.urlsPublicos).toBe(0);
  });

  it("o `cavalo_id` fica por escrever: o anúncio ainda não existe", async () => {
    await guardarDocumento(pedido());
    expect(estado.inseridos[0]).not.toHaveProperty("cavalo_id");
  });
});

describe("guardarDocumento — quando corre mal", () => {
  it("o ficheiro não sobe: não se escreve linha nenhuma", async () => {
    estado.erroDeUpload = { message: "sem espaço" };
    const resultado = await guardarDocumento(pedido());
    expect(resultado).toEqual({ ok: false, falha: "armazenamento" });
    expect(estado.inseridos).toHaveLength(0);
  });

  it("a linha não entra: o ficheiro é apagado do balde", async () => {
    estado.erroDeInsercao = { message: "restrição violada" };
    const resultado = await guardarDocumento(pedido());
    expect(resultado).toEqual({ ok: false, falha: "base" });
    expect(estado.removidos).toHaveLength(1);
    expect(estado.removidos[0]!.caminhos).toEqual([estado.subidos[0]!.caminho]);
  });

  it("se a limpeza também falhar, devolve na mesma — não rebenta", async () => {
    estado.erroDeInsercao = { message: "restrição violada" };
    estado.erroDeRemocao = { message: "objecto não encontrado" };
    await expect(guardarDocumento(pedido())).resolves.toEqual({ ok: false, falha: "base" });
  });
});

describe("contarDocumentosDaReferencia", () => {
  it("devolve a contagem", async () => {
    estado.contagem = { count: 7, error: null };
    await expect(contarDocumentosDaReferencia(REFERENCIA)).resolves.toBe(7);
  });

  it("devolve `null` quando a pergunta falha — «não sei» não é zero", async () => {
    estado.contagem = { count: null, error: { message: "sem ligação" } };
    await expect(contarDocumentosDaReferencia(REFERENCIA)).resolves.toBeNull();
  });
});
