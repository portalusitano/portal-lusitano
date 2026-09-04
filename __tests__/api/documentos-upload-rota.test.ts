/**
 * A rota que recebe os documentos.
 *
 * ## O pedido é um boneco, e a razão
 *
 * A rota lê duas coisas do pedido — `headers.get()` e `formData()` — e mais
 * nada. Montar um `NextRequest` com um corpo `multipart` a sério obrigaria a
 * fazer o `FormData` do jsdom e o corpo do `undici` entenderem-se, o que é uma
 * discussão entre duas bibliotecas e não um teste desta rota. O boneco entrega
 * o `FormData` já feito, que é exactamente o que o `req.formData()` entregaria.
 *
 * ## O que estes testes guardam
 *
 * Os quatro que não podem cair, por esta ordem de importância:
 *
 * 1. **Nada sai daqui `verificado`.** Nem com um campo `estado` no formulário.
 * 2. **Quem decide o tipo são os bytes**, e um PNG declarado como PDF é
 *    guardado como PNG e fica registado como discordância.
 * 3. **O balde nunca dá um URL público.**
 * 4. **A mensagem de recusa diz o que se aceita.**
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const estado = vi.hoisted(() => ({
  erroDeUpload: null as { message: string } | null,
  erroDeInsercao: null as { message: string } | null,
  /** Faz falhar a n-ésima inserção do pedido (1 = a primeira). 0 = nenhuma. */
  falharInsercaoNa: 0,
  contagem: { count: 0 as number | null, error: null as { message: string } | null },
  subidos: [] as Array<{ balde: string; caminho: string; opcoes: Record<string, unknown> }>,
  inseridos: [] as Array<Record<string, unknown>>,
  removidos: [] as string[][],
  urlsPublicos: 0,
  avisos: [] as Array<{ mensagem: string; dados: unknown }>,
}));

vi.mock("@/lib/supabase-admin", () => {
  const armazenamento = {
    from: (balde: string) => ({
      upload: vi.fn(async (caminho: string, _corpo: unknown, opcoes: Record<string, unknown>) => {
        estado.subidos.push({ balde, caminho, opcoes });
        return { data: null, error: estado.erroDeUpload };
      }),
      remove: vi.fn(async (caminhos: string[]) => {
        estado.removidos.push(caminhos);
        return { data: null, error: null };
      }),
      getPublicUrl: vi.fn(() => {
        estado.urlsPublicos += 1;
        return { data: { publicUrl: "NUNCA" } };
      }),
    }),
  };

  const duplo = {
    storage: armazenamento,
    from: vi.fn(() => ({
      insert: vi.fn(async (linha: Record<string, unknown>) => {
        estado.inseridos.push(linha);
        const falhaPontual =
          estado.falharInsercaoNa === estado.inseridos.length
            ? { message: "restrição violada" }
            : null;
        return { data: null, error: falhaPontual ?? estado.erroDeInsercao };
      }),
      select: vi.fn(() => ({ eq: vi.fn(async () => estado.contagem) })),
    })),
  };
  return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
});

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn((mensagem: string, dados: unknown) => {
      estado.avisos.push({ mensagem, dados });
    }),
    error: vi.fn(),
  },
}));

import { POST } from "@/app/api/vender-cavalo/documentos/route";
import { MAX_DOCUMENTOS_POR_REFERENCIA } from "@/lib/documentos/guardar";

// ---------------------------------------------------------------------------
// Ajudantes
// ---------------------------------------------------------------------------

const REFERENCIA = "3f7c1e2a-0000-4000-8000-000000000001";
const ORIGEM = "http://localhost:3000";

const bytesPdf = (enchimento = 0) =>
  new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, ...new Array(enchimento).fill(0x41)]);
const bytesPng = () =>
  new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

/**
 * Um ficheiro com o mínimo que a rota lhe pede — e um `instanceof File`
 * verdadeiro, porque a rota filtra as entradas do `FormData` por isso.
 */
function ficheiro(nome: string, conteudo: Uint8Array, tipoDeclarado: string, tamanho?: number) {
  const f = new File([conteudo as unknown as BlobPart], nome, { type: tipoDeclarado });
  Object.defineProperty(f, "size", { value: tamanho ?? conteudo.byteLength });
  Object.defineProperty(f, "arrayBuffer", {
    value: async () => conteudo.buffer.slice(0) as ArrayBuffer,
  });
  return f;
}

let contadorDeIps = 0;

/**
 * Cada pedido leva um IP diferente de propósito.
 *
 * O `strictLimiter` é um cache em memória partilhado por todo o processo e com
 * um minuto de vida: com o mesmo IP em todos os testes, o quinto começava a
 * apanhar 429 por causa dos quatro anteriores, e a suite ficava dependente da
 * ordem por que corre.
 */
function pedido(
  campos: Array<[string, string | File]>,
  opcoes: { origem?: string | null; ip?: string } = {}
) {
  const dados = new FormData();
  for (const [chave, valor] of campos) dados.append(chave, valor as string);

  const cabecalhos = new Map<string, string>();
  const origem = opcoes.origem === undefined ? ORIGEM : opcoes.origem;
  if (origem !== null) cabecalhos.set("origin", origem);
  cabecalhos.set("x-forwarded-for", opcoes.ip ?? `10.0.0.${(contadorDeIps += 1) % 250}`);

  return {
    headers: { get: (nome: string) => cabecalhos.get(nome.toLowerCase()) ?? null },
    formData: async () => dados,
  } as unknown as NextRequest;
}

const comLivroAzul = (extra: Array<[string, string | File]> = []) =>
  pedido([
    ["referencia", REFERENCIA],
    ["livro_azul", ficheiro("livro azul.pdf", bytesPdf(64), "application/pdf")],
    ...extra,
  ]);

beforeEach(() => {
  estado.erroDeUpload = null;
  estado.erroDeInsercao = null;
  estado.falharInsercaoNa = 0;
  estado.contagem = { count: 0, error: null };
  estado.subidos = [];
  estado.inseridos = [];
  estado.removidos = [];
  estado.urlsPublicos = 0;
  estado.avisos = [];
});

// ---------------------------------------------------------------------------
// Quem entra
// ---------------------------------------------------------------------------

describe("quem entra", () => {
  it("recusa uma origem de fora", async () => {
    const r = await POST(pedido([["referencia", REFERENCIA]], { origem: "https://evil.com" }));
    expect(r.status).toBe(403);
    expect(estado.subidos).toHaveLength(0);
  });

  it("recusa um domínio que só começa pelo nosso", async () => {
    const r = await POST(
      pedido([["referencia", REFERENCIA]], { origem: "https://portal-lusitano.pt.evil.com" })
    );
    expect(r.status).toBe(403);
  });

  it("recusa um pedido sem `Origin` — um browser nosso manda-o sempre", async () => {
    const r = await POST(pedido([["referencia", REFERENCIA]], { origem: null }));
    expect(r.status).toBe(403);
  });

  it("trava quem insiste, e a mensagem diz quanto tempo esperar", async () => {
    const ip = "203.0.113.77";
    let ultima = 200;
    for (let i = 0; i < 8; i += 1) {
      const r = await POST(
        pedido(
          [
            ["referencia", REFERENCIA],
            ["livro_azul", ficheiro("a.pdf", bytesPdf(4), "application/pdf")],
          ],
          { ip }
        )
      );
      ultima = r.status;
      if (ultima === 429) {
        await expect(r.json()).resolves.toMatchObject({ error: expect.stringContaining("minuto") });
        break;
      }
    }
    expect(ultima).toBe(429);
  });
});

// ---------------------------------------------------------------------------
// A referência
// ---------------------------------------------------------------------------

describe("a referência", () => {
  it("recusa um pedido sem referência", async () => {
    const r = await POST(
      pedido([["livro_azul", ficheiro("a.pdf", bytesPdf(4), "application/pdf")]])
    );
    expect(r.status).toBe(400);
  });

  it("recusa uma referência que não é um UUID", async () => {
    for (const má of ["", "../../outra", "12345", "não-é-uuid"]) {
      const r = await POST(
        pedido([
          ["referencia", má],
          ["livro_azul", ficheiro("a.pdf", bytesPdf(4), "application/pdf")],
        ])
      );
      expect(r.status).toBe(400);
    }
    expect(estado.subidos).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Os ficheiros
// ---------------------------------------------------------------------------

describe("os ficheiros", () => {
  it("recusa um pedido sem documento nenhum", async () => {
    const r = await POST(pedido([["referencia", REFERENCIA]]));
    expect(r.status).toBe(400);
    await expect(r.json()).resolves.toMatchObject({ error: "Nenhum documento enviado." });
  });

  it("recusa dois ficheiros para o mesmo tipo", async () => {
    const r = await POST(
      pedido([
        ["referencia", REFERENCIA],
        ["livro_azul", ficheiro("a.pdf", bytesPdf(4), "application/pdf")],
        ["livro_azul", ficheiro("b.pdf", bytesPdf(4), "application/pdf")],
      ])
    );
    expect(r.status).toBe(400);
    expect(estado.subidos).toHaveLength(0);
  });

  it("aceita os três tipos de uma vez", async () => {
    const r = await POST(
      pedido([
        ["referencia", REFERENCIA],
        ["livro_azul", ficheiro("livro.pdf", bytesPdf(4), "application/pdf")],
        ["passaporte", ficheiro("passe.png", bytesPng(), "image/png")],
        ["exame_vet", ficheiro("exame.pdf", bytesPdf(4), "application/pdf")],
      ])
    );
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo.documentos.map((d: { tipo: string }) => d.tipo)).toEqual([
      "livro_azul",
      "passaporte",
      "exame_vet",
    ]);
  });

  it("ignora um campo com o nome de um documento que não traz ficheiro", async () => {
    const r = await POST(
      pedido([
        ["referencia", REFERENCIA],
        ["passaporte", "não sou um ficheiro"],
        ["livro_azul", ficheiro("livro.pdf", bytesPdf(4), "application/pdf")],
      ])
    );
    expect(r.status).toBe(200);
    expect(estado.inseridos).toHaveLength(1);
  });

  it("recusa um ficheiro acima dos 10 MB, com 413", async () => {
    const r = await POST(
      pedido([
        ["referencia", REFERENCIA],
        [
          "livro_azul",
          ficheiro("enorme.pdf", bytesPdf(4), "application/pdf", 10 * 1024 * 1024 + 1),
        ],
      ])
    );
    expect(r.status).toBe(413);
    expect(estado.subidos).toHaveLength(0);
  });

  it("recusa um ficheiro vazio", async () => {
    const r = await POST(
      pedido([
        ["referencia", REFERENCIA],
        ["livro_azul", ficheiro("vazio.pdf", new Uint8Array([]), "application/pdf", 0)],
      ])
    );
    expect(r.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// O tipo lê-se nos bytes
// ---------------------------------------------------------------------------

describe("o tipo lê-se nos bytes", () => {
  it("recusa um ficheiro que não é nenhum dos quatro, dizendo quais são", async () => {
    const texto = new TextEncoder().encode("o livro azul está na gaveta");
    const r = await POST(
      pedido([
        ["referencia", REFERENCIA],
        ["livro_azul", ficheiro("livro.pdf", texto, "application/pdf")],
      ])
    );
    expect(r.status).toBe(400);
    const { error } = await r.json();
    // A mensagem não é «tipo inválido»: diz o que se aceita.
    for (const formato of ["PDF", "JPEG", "PNG", "WebP"]) expect(error).toContain(formato);
    expect(estado.subidos).toHaveLength(0);
  });

  it("recusa um HTML com nome de PDF e `Content-Type` de PDF", async () => {
    const html = new TextEncoder().encode("<!doctype html><script>alert(1)</script>");
    const r = await POST(
      pedido([
        ["referencia", REFERENCIA],
        ["livro_azul", ficheiro("livro-azul.pdf", html, "application/pdf")],
      ])
    );
    expect(r.status).toBe(400);
  });

  it("guarda um PNG declarado como PDF **como PNG**, e regista a discordância", async () => {
    const r = await POST(
      pedido([
        ["referencia", REFERENCIA],
        ["livro_azul", ficheiro("livro-azul.pdf", bytesPng(), "application/pdf")],
      ])
    );
    expect(r.status).toBe(200);
    expect(estado.inseridos[0]).toMatchObject({ mime: "image/png" });
    expect(estado.subidos[0]!.caminho).toMatch(/\.png$/);
    expect(estado.subidos[0]!.opcoes).toMatchObject({ contentType: "image/png" });

    expect(estado.avisos).toHaveLength(1);
    expect(estado.avisos[0]!.dados).toMatchObject({
      declarado: "application/pdf",
      real: "image/png",
    });
  });

  it("não levanta a mão a quem declara `application/octet-stream`", async () => {
    const r = await POST(
      pedido([
        ["referencia", REFERENCIA],
        ["livro_azul", ficheiro("livro.pdf", bytesPdf(4), "application/octet-stream")],
      ])
    );
    expect(r.status).toBe(200);
    expect(estado.avisos).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// O que fica escrito
// ---------------------------------------------------------------------------

describe("o que fica escrito", () => {
  it("nada sai daqui verificado, nem com um `estado` no formulário", async () => {
    const r = await POST(comLivroAzul([["estado", "verificado"]]));
    expect(r.status).toBe(200);

    expect(estado.inseridos[0]).toMatchObject({ estado: "por_verificar" });
    const corpo = await r.json();
    expect(corpo.documentos[0].estado).toBe("por_verificar");

    // E nenhum dos campos de quem verifica é escrito por esta rota.
    expect(estado.inseridos[0]).not.toHaveProperty("verificado_por");
    expect(estado.inseridos[0]).not.toHaveProperty("verificado_em");
  });

  it("o balde nunca dá um URL público", async () => {
    await POST(comLivroAzul());
    expect(estado.urlsPublicos).toBe(0);
  });

  it("o caminho de armazenamento não vai na resposta", async () => {
    const r = await POST(comLivroAzul());
    const corpo = await r.json();
    expect(corpo.documentos[0]).not.toHaveProperty("caminho");
    expect(JSON.stringify(corpo)).not.toContain("documentos-cavalos");
  });

  it("a resposta traz o que o formulário precisa de mostrar", async () => {
    const r = await POST(comLivroAzul());
    const corpo = await r.json();
    expect(corpo.referencia).toBe(REFERENCIA);
    expect(corpo.documentos[0]).toMatchObject({
      tipo: "livro_azul",
      estado: "por_verificar",
      mime: "application/pdf",
      nomeOriginal: "livro azul.pdf",
      bytes: 69,
    });
    expect(corpo.documentos[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

// ---------------------------------------------------------------------------
// O tecto por referência
// ---------------------------------------------------------------------------

describe("o tecto por referência", () => {
  it("recusa quando a referência já tem documentos a mais", async () => {
    estado.contagem = { count: MAX_DOCUMENTOS_POR_REFERENCIA, error: null };
    const r = await POST(comLivroAzul());
    expect(r.status).toBe(400);
    expect(estado.subidos).toHaveLength(0);
  });

  it("deixa passar quando a contagem falha — «não sei» não trava um anúncio", async () => {
    estado.contagem = { count: null, error: { message: "sem ligação" } };
    const r = await POST(comLivroAzul());
    expect(r.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Quando corre mal
// ---------------------------------------------------------------------------

describe("quando corre mal", () => {
  it("a subida falha: 500 e nada escrito", async () => {
    estado.erroDeUpload = { message: "sem espaço" };
    const r = await POST(comLivroAzul());
    expect(r.status).toBe(500);
    expect(estado.inseridos).toHaveLength(0);
  });

  it("a linha não entra: 500 e o ficheiro é apagado", async () => {
    estado.erroDeInsercao = { message: "restrição violada" };
    const r = await POST(comLivroAzul());
    expect(r.status).toBe(500);
    expect(estado.removidos).toHaveLength(1);
  });

  it("o segundo falha e o primeiro fica — e a resposta diz qual ficou", async () => {
    // Apagar um documento verdadeiro para deixar a resposta simétrica seria
    // perder dados por arrumação.
    estado.falharInsercaoNa = 2;

    const r = await POST(
      pedido([
        ["referencia", REFERENCIA],
        ["livro_azul", ficheiro("livro.pdf", bytesPdf(4), "application/pdf")],
        ["passaporte", ficheiro("passe.png", bytesPng(), "image/png")],
      ])
    );

    expect(r.status).toBe(500);
    const corpo = await r.json();
    expect(corpo.guardados).toHaveLength(1);
    expect(corpo.guardados[0].tipo).toBe("livro_azul");
  });

  it("um `formData()` que rebenta dá 500 e não deita o processo abaixo", async () => {
    const mau = {
      headers: {
        get: (n: string) => (n.toLowerCase() === "origin" ? ORIGEM : "198.51.100.9"),
      },
      formData: async () => {
        throw new Error("corpo mal formado");
      },
    } as unknown as NextRequest;
    const r = await POST(mau);
    expect(r.status).toBe(500);
  });
});
