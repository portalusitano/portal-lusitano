/**
 * POST /api/meus-anuncios/documentos/[id]/substituir — enviar outro ficheiro
 * para um documento recusado.
 *
 * É a única rota deste lado que **escreve**, e por isso é a que precisa de mais
 * guardas. Por ordem de importância:
 *
 * 1. **Nada do que aqui se escreve pode ser `verificado`.** Nem com um campo a
 *    dizê-lo no formulário. Esse estado escreve-se num sítio só.
 * 2. **A `referencia` não autoriza.** Quem autoriza é a sessão e a ligação ao
 *    anúncio; a referência que a linha nova leva é a da recusada, e serve só
 *    para o painel de revisão saber que é a mesma submissão.
 * 3. **A linha recusada não se apaga nem se altera.** A decisão de quem reviu
 *    fica escrita; sem ela não há como discutir mais tarde o que foi decidido.
 * 4. **Só um documento recusado se substitui.** Trocar por baixo de quem está a
 *    rever, ou por cima de um verificado, é desfazer o trabalho de uma pessoa.
 * 5. **Quem decide o tipo do ficheiro são os bytes**, e a origem confere-se
 *    porque um `POST` multipart é um pedido simples que qualquer sítio pode
 *    enviar com o cookie desta sessão.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const estado = vi.hoisted(() => ({
  utilizador: { id: "user-1" } as { id: string } | null,
  documento: null as Record<string, unknown> | null,
  anuncio: null as Record<string, unknown> | null,
  contagem: { count: 0 as number | null, error: null as { message: string } | null },
  erroDeUpload: null as { message: string } | null,
  erroDeInsercao: null as { message: string } | null,
  erroDeLigacao: null as { message: string } | null,
  subidos: [] as Array<{ balde: string; caminho: string }>,
  inseridos: [] as Array<Record<string, unknown>>,
  actualizados: [] as Array<{ tabela: string; valores: Record<string, unknown> }>,
  removidos: [] as string[][],
  urlsPublicos: 0,
  avisos: [] as Array<{ mensagem: string; dados: unknown }>,
}));

vi.mock("@/lib/supabase-admin", () => {
  const cadeia = (tabela: string) => {
    let ehContagem = false;
    const alvo: Record<string, unknown> = {
      maybeSingle: async () => ({
        data: tabela === "documentos_cavalo" ? estado.documento : estado.anuncio,
        error: null,
      }),
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve({ data: null, error: estado.erroDeLigacao }).then(resolve, reject),
      insert: async (linha: Record<string, unknown>) => {
        estado.inseridos.push(linha);
        return { data: null, error: estado.erroDeInsercao };
      },
      update: (valores: Record<string, unknown>) => {
        estado.actualizados.push({ tabela, valores });
        return alvo;
      },
    };
    alvo.select = (_colunas?: unknown, opcoes?: { count?: string; head?: boolean }) => {
      // `select("id", { count: "exact", head: true })` é a contagem por
      // referência; tudo o resto é uma leitura normal.
      ehContagem = Boolean(opcoes?.count);
      return alvo;
    };
    alvo.eq = () =>
      ehContagem
        ? Promise.resolve({ count: estado.contagem.count, error: estado.contagem.error })
        : alvo;
    alvo.in = () => alvo;
    alvo.order = () => alvo;
    return alvo;
  };

  const duplo = {
    from: (tabela: string) => cadeia(tabela),
    storage: {
      from: (balde: string) => ({
        upload: async (caminho: string) => {
          estado.subidos.push({ balde, caminho });
          return { data: null, error: estado.erroDeUpload };
        },
        remove: async (caminhos: string[]) => {
          estado.removidos.push(caminhos);
          return { data: null, error: null };
        },
        getPublicUrl: () => {
          estado.urlsPublicos += 1;
          return { data: { publicUrl: "NUNCA" } };
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
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn((mensagem: string, dados: unknown) => {
      estado.avisos.push({ mensagem, dados });
    }),
    error: vi.fn(),
  },
}));

import { POST } from "@/app/api/meus-anuncios/documentos/[id]/substituir/route";
import { MAX_DOCUMENTOS_POR_REFERENCIA } from "@/lib/documentos/guardar";

const ID = "11111111-2222-4333-8444-555555555555";
const CAVALO = "aaaaaaaa-0000-4000-8000-000000000001";
const REFERENCIA = "3f7c1e2a-0000-4000-8000-000000000001";
const ORIGEM = "http://localhost:3000";

const bytesPdf = () => new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const bytesPng = () =>
  new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const bytesLixo = () => new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);

function ficheiro(nome: string, conteudo: Uint8Array, tipoDeclarado: string, tamanho?: number) {
  const f = new File([conteudo as unknown as BlobPart], nome, { type: tipoDeclarado });
  Object.defineProperty(f, "size", { value: tamanho ?? conteudo.byteLength });
  Object.defineProperty(f, "arrayBuffer", {
    value: async () => conteudo.buffer.slice(0) as ArrayBuffer,
  });
  return f;
}

function pedido(
  campos: Array<[string, string | File]>,
  opcoes: { origem?: string | null } = {}
): NextRequest {
  const dados = new FormData();
  for (const [chave, valor] of campos) dados.append(chave, valor as string);

  const cabecalhos = new Map<string, string>();
  const origem = opcoes.origem === undefined ? ORIGEM : opcoes.origem;
  if (origem !== null) cabecalhos.set("origin", origem);

  return {
    headers: { get: (nome: string) => cabecalhos.get(nome.toLowerCase()) ?? null },
    formData: async () => dados,
  } as unknown as NextRequest;
}

const comPdf = (opcoes?: { origem?: string | null }) =>
  pedido([["ficheiro", ficheiro("novo livro azul.pdf", bytesPdf(), "application/pdf")]], opcoes);

const params = (id: string = ID) => ({ params: Promise.resolve({ id }) });

/**
 * O `strictLimiter` é um cache em memória partilhado por todo o processo e com
 * um minuto de vida. A chave desta rota é a conta, por isso cada teste usa uma
 * conta diferente — senão o sexto pedido apanhava um 429 por causa dos cinco
 * anteriores e a suite passava a depender da ordem por que corre.
 */
let contadorDeContas = 0;

beforeEach(() => {
  estado.utilizador = { id: `user-${(contadorDeContas += 1)}` };
  estado.documento = {
    id: ID,
    cavalo_id: CAVALO,
    referencia: REFERENCIA,
    tipo: "livro_azul",
    estado: "recusado",
    caminho: "ref/livro_azul/abc.pdf",
    mime: "application/pdf",
    nome_original: "livro azul.pdf",
    motivo_recusa: "falta a página do meio",
  };
  estado.anuncio = { id: CAVALO, nome: "Ícaro" };
  estado.contagem = { count: 1, error: null };
  estado.erroDeUpload = null;
  estado.erroDeInsercao = null;
  estado.erroDeLigacao = null;
  estado.subidos = [];
  estado.inseridos = [];
  estado.actualizados = [];
  estado.removidos = [];
  estado.urlsPublicos = 0;
  estado.avisos = [];
});

describe("quem entra", () => {
  it("recusa uma origem de fora", async () => {
    const r = await POST(comPdf({ origem: "https://evil.com" }), params());
    expect(r.status).toBe(403);
    expect(estado.subidos).toHaveLength(0);
  });

  it("recusa um domínio que só começa pelo nosso", async () => {
    const r = await POST(comPdf({ origem: "https://portal-lusitano.pt.evil.com" }), params());
    expect(r.status).toBe(403);
  });

  it("sem sessão devolve 401", async () => {
    estado.utilizador = null;
    const r = await POST(comPdf(), params());
    expect(r.status).toBe(401);
    expect(estado.subidos).toHaveLength(0);
  });

  it("um id que não é UUID é recusado antes de chegar à base", async () => {
    const r = await POST(comPdf(), params("nao-e-uuid"));
    expect(r.status).toBe(400);
  });

  it("o documento de outra conta é 404 e não escreve nada", async () => {
    estado.anuncio = null;
    const r = await POST(comPdf(), params());
    expect(r.status).toBe(404);
    expect(estado.subidos).toHaveLength(0);
    expect(estado.inseridos).toHaveLength(0);
  });

  it("um documento ainda sem anúncio não tem dono, e é 404", async () => {
    // A `referencia` está lá, e não chega: se chegasse, bastava adivinhar um
    // UUID para substituir os documentos de outra pessoa.
    estado.documento = { ...estado.documento!, cavalo_id: null };
    const r = await POST(comPdf(), params());
    expect(r.status).toBe(404);
    expect(estado.inseridos).toHaveLength(0);
  });
});

describe("só o recusado se substitui", () => {
  for (const naoRecusado of ["por_verificar", "em_revisao", "verificado"]) {
    it(`recusa substituir um documento em ${naoRecusado}`, async () => {
      estado.documento = { ...estado.documento!, estado: naoRecusado };
      const r = await POST(comPdf(), params());
      expect(r.status).toBe(409);
      expect(estado.subidos).toHaveLength(0);
      expect(estado.inseridos).toHaveLength(0);
    });
  }
});

describe("o que fica escrito", () => {
  it("a linha nova nasce por verificar, e nunca verificada", async () => {
    const r = await POST(comPdf(), params());
    expect(r.status).toBe(200);
    expect(estado.inseridos).toHaveLength(1);
    expect(estado.inseridos[0].estado).toBe("por_verificar");
  });

  it("nem um campo `estado` no formulário a promove", async () => {
    const r = await POST(
      pedido([
        ["estado", "verificado"],
        ["ficheiro", ficheiro("a.pdf", bytesPdf(), "application/pdf")],
      ]),
      params()
    );
    expect(r.status).toBe(200);
    expect(estado.inseridos[0].estado).toBe("por_verificar");
    const escrito = JSON.stringify(estado.inseridos) + JSON.stringify(estado.actualizados);
    expect(escrito).not.toContain("verificado");
  });

  it("herda o tipo do documento recusado — quem envia não escolhe o que aquilo é", async () => {
    estado.documento = { ...estado.documento!, tipo: "passaporte" };
    await POST(
      pedido([
        ["tipo", "livro_azul"],
        ["ficheiro", ficheiro("a.pdf", bytesPdf(), "application/pdf")],
      ]),
      params()
    );
    expect(estado.inseridos[0].tipo).toBe("passaporte");
  });

  it("leva a referência da recusada, para o painel saber que é a mesma submissão", async () => {
    await POST(comPdf(), params());
    expect(estado.inseridos[0].referencia).toBe(REFERENCIA);
  });

  it("não apaga nem altera a linha recusada", async () => {
    await POST(comPdf(), params());
    // A única escrita sobre uma linha existente é a ligação da linha nova ao
    // anúncio, e é a linha nova que a leva.
    expect(estado.actualizados).toEqual([
      { tabela: "documentos_cavalo", valores: { cavalo_id: CAVALO } },
    ]);
    expect(estado.removidos).toHaveLength(0);
  });

  it("liga a linha nova ao anúncio de quem a enviou", async () => {
    const corpo = await (await POST(comPdf(), params())).json();
    expect(corpo.documento.anuncioId).toBe(CAVALO);
    expect(corpo.documento.estado).toBe("por_verificar");
  });

  it("nunca pede um URL público ao balde", async () => {
    await POST(comPdf(), params());
    expect(estado.urlsPublicos).toBe(0);
  });
});

describe("o ficheiro", () => {
  it("quem decide o tipo são os bytes, e a discordância fica registada", async () => {
    const r = await POST(
      pedido([["ficheiro", ficheiro("mentira.pdf", bytesPng(), "application/pdf")]]),
      params()
    );
    expect(r.status).toBe(200);
    expect(estado.inseridos[0].mime).toBe("image/png");
    expect(estado.avisos.length).toBeGreaterThan(0);
  });

  it("um formato que não é dos quatro é recusado, e a mensagem diz quais são", async () => {
    const r = await POST(
      pedido([["ficheiro", ficheiro("virus.pdf", bytesLixo(), "application/pdf")]]),
      params()
    );
    expect(r.status).toBe(400);
    const corpo = await r.json();
    expect(corpo.error).toContain("PDF");
    expect(corpo.error).toContain("WebP");
    expect(estado.subidos).toHaveLength(0);
  });

  it("um ficheiro vazio não passa", async () => {
    const r = await POST(
      pedido([["ficheiro", ficheiro("vazio.pdf", bytesPdf(), "application/pdf", 0)]]),
      params()
    );
    expect(r.status).toBe(400);
  });

  it("acima do tecto é 413 e a mensagem traz o tecto do contrato", async () => {
    const r = await POST(
      pedido([
        ["ficheiro", ficheiro("enorme.pdf", bytesPdf(), "application/pdf", 11 * 1024 * 1024)],
      ]),
      params()
    );
    expect(r.status).toBe(413);
    await expect(r.json()).resolves.toMatchObject({ error: expect.stringContaining("10 MB") });
  });

  it("sem ficheiro nenhum é 400", async () => {
    const r = await POST(pedido([]), params());
    expect(r.status).toBe(400);
  });

  it("dois ficheiros no mesmo pedido é 400", async () => {
    const r = await POST(
      pedido([
        ["ficheiro", ficheiro("a.pdf", bytesPdf(), "application/pdf")],
        ["ficheiro", ficheiro("b.pdf", bytesPdf(), "application/pdf")],
      ]),
      params()
    );
    expect(r.status).toBe(400);
  });

  it("respeita o tecto de documentos por referência", async () => {
    estado.contagem = { count: MAX_DOCUMENTOS_POR_REFERENCIA, error: null };
    const r = await POST(comPdf(), params());
    expect(r.status).toBe(400);
    expect(estado.subidos).toHaveLength(0);
  });

  it("uma contagem que falhou não trava quem está a corrigir uma recusa", async () => {
    estado.contagem = { count: null, error: { message: "timeout" } };
    const r = await POST(comPdf(), params());
    expect(r.status).toBe(200);
  });
});

describe("quando alguma coisa falha", () => {
  it("se o balde recusar, nada fica registado", async () => {
    estado.erroDeUpload = { message: "sem espaço" };
    const r = await POST(comPdf(), params());
    expect(r.status).toBe(500);
    expect(estado.inseridos).toHaveLength(0);
  });

  it("se a ligação ao anúncio falhar, diz-se — não se finge que ficou tudo bem", async () => {
    // O ficheiro está guardado e o painel de revisão dá com ele pela
    // referência; o que falhou foi a ligação, e sem ela o vendedor não o vê.
    estado.erroDeLigacao = { message: "conflito" };
    const r = await POST(comPdf(), params());
    expect(r.status).toBe(500);
    const corpo = await r.json();
    expect(corpo.error).toContain("não ficou ligado");
  });
});
