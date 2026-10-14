/**
 * GET /api/meus-anuncios/documentos/[id]/ficheiro — o documento, ao próprio.
 *
 * É a rota mais perigosa deste lado: um passaporte equino traz o nome e a
 * morada do proprietário. Que o dono o possa reler não muda o cuidado com que
 * se serve — muda só quem tem direito a vê-lo.
 *
 * O que estes testes guardam, por ordem de importância:
 *
 * 1. **Nunca `getPublicUrl` e nunca um URL assinado.** Um endereço do balde
 *    que saia daqui é uma chave que viaja sem sessão.
 * 2. **A sessão decide, e decide pelo anúncio.** Um documento de outra conta é
 *    404; um documento ainda sem anúncio também, porque não tem dono conhecido.
 * 3. **Os cabeçalhos que impedem o resto**: nada de cache partilhada, nada de
 *    adivinhar o tipo, nada de `Referer`.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const estado = vi.hoisted(() => ({
  utilizador: { id: "user-1" } as { id: string } | null,
  documento: null as Record<string, unknown> | null,
  anuncio: null as Record<string, unknown> | null,
  erroDownload: null as { message: string } | null,
  urlsPublicos: 0,
  urlsAssinados: 0,
  descarregados: [] as Array<{ balde: string; caminho: string }>,
}));

vi.mock("@/lib/supabase-admin", () => {
  const cadeia = (tabela: string) => {
    const alvo: Record<string, unknown> = {
      maybeSingle: async () => ({
        data: tabela === "documentos_cavalo" ? estado.documento : estado.anuncio,
        error: null,
      }),
    };
    for (const m of ["select", "eq", "in", "order", "update"]) {
      alvo[m] = () => alvo;
    }
    return alvo;
  };

  const duplo = {
    from: (tabela: string) => cadeia(tabela),
    storage: {
      from: (balde: string) => ({
        download: async (caminho: string) => {
          estado.descarregados.push({ balde, caminho });
          if (estado.erroDownload) return { data: null, error: estado.erroDownload };
          const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
          // O `download` do Supabase devolve um `Blob` do Node, que tem
          // `arrayBuffer()`. O do jsdom não tem — daí o duplo escrito à mão.
          return { data: { arrayBuffer: async () => bytes.buffer.slice(0) }, error: null };
        },
        getPublicUrl: () => {
          estado.urlsPublicos += 1;
          return { data: { publicUrl: "NUNCA" } };
        },
        createSignedUrl: async () => {
          estado.urlsAssinados += 1;
          return { data: { signedUrl: "NUNCA" }, error: null };
        },
      }),
    },
  };
  return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
});

vi.mock("@/lib/seller-auth", () => ({
  getAuthenticatedUser: async () => estado.utilizador,
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { GET } from "@/app/api/meus-anuncios/documentos/[id]/ficheiro/route";
import { BALDE_DOCUMENTOS } from "@/lib/documentos/contrato";

const ID = "11111111-2222-4333-8444-555555555555";
const CAVALO = "aaaaaaaa-0000-4000-8000-000000000001";

const pedido = () => ({}) as NextRequest;
const params = (id: string = ID) => Promise.resolve({ id });

beforeEach(() => {
  estado.utilizador = { id: "user-1" };
  estado.documento = {
    id: ID,
    cavalo_id: CAVALO,
    referencia: "3f7c1e2a-0000-4000-8000-000000000001",
    tipo: "passaporte",
    estado: "por_verificar",
    caminho: "ref/passaporte/abc.pdf",
    mime: "application/pdf",
    nome_original: "passaporte do Ícaro.pdf",
    motivo_recusa: null,
  };
  estado.anuncio = { id: CAVALO, nome: "Ícaro" };
  estado.erroDownload = null;
  estado.urlsPublicos = 0;
  estado.urlsAssinados = 0;
  estado.descarregados = [];
});

describe("quem entra", () => {
  it("sem sessão devolve 401", async () => {
    estado.utilizador = null;
    const r = await GET(pedido(), { params: params() });
    expect(r.status).toBe(401);
    expect(estado.descarregados).toHaveLength(0);
  });

  it("um id que não é UUID é recusado antes de chegar à base", async () => {
    const r = await GET(pedido(), { params: params("1 or 1=1") });
    expect(r.status).toBe(400);
    expect(estado.descarregados).toHaveLength(0);
  });

  it("o documento de outra conta é 404, não 403", async () => {
    // A diferença entre «não existe» e «não é seu» responde a «este
    // identificador acertou?» a quem os estiver a adivinhar.
    estado.anuncio = null;
    const r = await GET(pedido(), { params: params() });
    expect(r.status).toBe(404);
    expect(estado.descarregados).toHaveLength(0);
  });

  it("um documento ainda sem anúncio não tem dono, e por isso é 404", async () => {
    estado.documento = { ...estado.documento!, cavalo_id: null };
    const r = await GET(pedido(), { params: params() });
    expect(r.status).toBe(404);
    expect(estado.descarregados).toHaveLength(0);
  });
});

describe("como serve", () => {
  it("descarrega do balde privado e devolve os bytes", async () => {
    const r = await GET(pedido(), { params: params() });
    expect(r.status).toBe(200);
    expect(estado.descarregados).toEqual([
      { balde: BALDE_DOCUMENTOS, caminho: "ref/passaporte/abc.pdf" },
    ]);
    expect(r.headers.get("Content-Type")).toBe("application/pdf");
  });

  it("nunca pede um URL público nem um URL assinado", async () => {
    await GET(pedido(), { params: params() });
    expect(estado.urlsPublicos).toBe(0);
    expect(estado.urlsAssinados).toBe(0);
  });

  it("nenhum endereço do balde aparece na resposta", async () => {
    const r = await GET(pedido(), { params: params() });
    const cabecalhos = JSON.stringify([...r.headers.entries()]);
    expect(cabecalhos).not.toContain("ref/passaporte/abc.pdf");
    expect(cabecalhos).not.toContain("supabase");
  });

  it("põe os cabeçalhos que fecham as portas do lado do browser", async () => {
    const r = await GET(pedido(), { params: params() });
    expect(r.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(r.headers.get("Referrer-Policy")).toBe("no-referrer");
    const cache = r.headers.get("Cache-Control") ?? "";
    expect(cache).toContain("private");
    expect(cache).toContain("no-store");
  });

  it("o nome do ficheiro não deixa injectar um cabeçalho", async () => {
    estado.documento = {
      ...estado.documento!,
      nome_original: 'mau"\r\nSet-Cookie: a=b\r\n.pdf',
    };
    const r = await GET(pedido(), { params: params() });
    const disposicao = r.headers.get("Content-Disposition") ?? "";
    // O que faz de um nome uma injecção é a quebra de linha, não a palavra:
    // `Set-Cookie` dentro de aspas e na mesma linha é texto, e é assim que
    // fica — as aspas e as quebras viram hífen.
    expect(disposicao).not.toContain("\n");
    expect(disposicao).not.toContain("\r");
    expect(disposicao.match(/"/g) ?? []).toHaveLength(2);
  });

  it("um mime fora do contrato não passa a ser servido à escolha de quem o escreveu", async () => {
    estado.documento = { ...estado.documento!, mime: "text/html" };
    const r = await GET(pedido(), { params: params() });
    expect(r.status).toBe(500);
    expect(estado.descarregados).toHaveLength(0);
  });

  it("se o balde não responder, é 502 e não um ficheiro vazio", async () => {
    estado.erroDownload = { message: "indisponível" };
    const r = await GET(pedido(), { params: params() });
    expect(r.status).toBe(502);
  });
});
