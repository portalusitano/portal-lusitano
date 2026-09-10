/**
 * GET /api/meus-anuncios/documentos — o que o vendedor vê dos documentos dele.
 *
 * Os três que não podem cair:
 *
 * 1. **Sem sessão não sai nada**, e a sessão é a que manda: os documentos que
 *    saem são os dos anúncios desta conta, e a consulta é feita a partir deles.
 * 2. **A `referencia` não entra na conta.** Foi escrito na rota que a recebe
 *    que ela não autoriza nada, e é aqui que essa promessa se cumpre ou se
 *    quebra — um documento ainda sem anúncio não tem dono conhecido.
 * 3. **Não sai o caminho no balde**, nem o SHA, nem a leitura automática, nem
 *    o e-mail de quem revê.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const estado = vi.hoisted(() => ({
  utilizador: { id: "user-1" } as { id: string } | null,
  anuncios: [] as Array<Record<string, unknown>>,
  documentos: [] as Array<Record<string, unknown>>,
  erroAnuncios: null as { message: string } | null,
  erroDocumentos: null as { message: string } | null,
  /** Todas as chamadas encadeadas, para se poder afirmar por onde a consulta foi. */
  chamadas: [] as Array<{ tabela: string; ops: Array<{ m: string; args: unknown[] }> }>,
}));

vi.mock("@/lib/supabase-admin", () => {
  const cadeia = (tabela: string) => {
    const ops: Array<{ m: string; args: unknown[] }> = [];
    estado.chamadas.push({ tabela, ops });

    const responder = () => {
      if (tabela === "cavalos_venda") {
        return { data: estado.erroAnuncios ? null : estado.anuncios, error: estado.erroAnuncios };
      }
      return {
        data: estado.erroDocumentos ? null : estado.documentos,
        error: estado.erroDocumentos,
      };
    };

    const alvo: Record<string, unknown> = {
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(responder()).then(resolve, reject),
      maybeSingle: async () => {
        const r = responder() as { data: unknown[] | null; error: unknown };
        return { data: r.data?.[0] ?? null, error: r.error };
      },
    };
    for (const m of ["select", "eq", "in", "order", "neq", "is", "update"]) {
      alvo[m] = (...args: unknown[]) => {
        ops.push({ m, args });
        return alvo;
      };
    }
    return alvo;
  };

  const duplo = { from: (tabela: string) => cadeia(tabela), storage: { from: vi.fn() } };
  return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
});

vi.mock("@/lib/seller-auth", () => ({
  getAuthenticatedUser: async () => estado.utilizador,
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { GET } from "@/app/api/meus-anuncios/documentos/route";

const CAVALO = "aaaaaaaa-0000-4000-8000-000000000001";

function documento(extra: Record<string, unknown> = {}) {
  return {
    id: "11111111-2222-4333-8444-555555555555",
    cavalo_id: CAVALO,
    tipo: "livro_azul",
    estado: "por_verificar",
    motivo_recusa: null,
    nome_original: "livro azul.pdf",
    mime: "application/pdf",
    bytes: 2048,
    criado_em: "2026-09-01T10:00:00.000Z",
    verificado_em: null,
    ...extra,
  };
}

beforeEach(() => {
  estado.utilizador = { id: "user-1" };
  estado.anuncios = [{ id: CAVALO, nome: "Ícaro", created_at: "2026-08-01T00:00:00.000Z" }];
  estado.documentos = [documento()];
  estado.erroAnuncios = null;
  estado.erroDocumentos = null;
  estado.chamadas = [];
});

describe("quem entra", () => {
  it("sem sessão devolve 401 e não pergunta nada à base", async () => {
    estado.utilizador = null;
    const r = await GET();
    expect(r.status).toBe(401);
    expect(estado.chamadas).toHaveLength(0);
  });

  it("os anúncios são procurados pelo dono da sessão", async () => {
    await GET();
    const consulta = estado.chamadas.find((c) => c.tabela === "cavalos_venda");
    expect(consulta).toBeDefined();
    expect(consulta!.ops).toContainEqual({ m: "eq", args: ["user_id", "user-1"] });
  });

  it("os documentos são procurados dentro dos anúncios dessa sessão, nunca por referência", async () => {
    await GET();
    const consulta = estado.chamadas.find((c) => c.tabela === "documentos_cavalo");
    expect(consulta).toBeDefined();
    expect(consulta!.ops).toContainEqual({ m: "in", args: ["cavalo_id", [CAVALO]] });

    const porReferencia = consulta!.ops.some(
      (o) => Array.isArray(o.args) && o.args[0] === "referencia"
    );
    expect(porReferencia).toBe(false);
  });

  it("sem anúncios não chega a perguntar pelos documentos de ninguém", async () => {
    estado.anuncios = [];
    const r = await GET();
    expect(r.status).toBe(200);
    await expect(r.json()).resolves.toEqual({ anuncios: [] });
    expect(estado.chamadas.some((c) => c.tabela === "documentos_cavalo")).toBe(false);
  });
});

describe("o que sai", () => {
  it("agrupa os documentos pelo anúncio a que pertencem", async () => {
    const r = await GET();
    const corpo = await r.json();
    expect(corpo.anuncios).toHaveLength(1);
    expect(corpo.anuncios[0].nome).toBe("Ícaro");
    expect(corpo.anuncios[0].documentos).toHaveLength(1);
    expect(corpo.anuncios[0].documentos[0].estado).toBe("por_verificar");
  });

  it("um anúncio sem documentos vem na mesma, com a lista vazia", async () => {
    // É informação: quem julga ter anexado o Livro Azul fica a saber que não
    // chegou cá.
    estado.documentos = [];
    const corpo = await (await GET()).json();
    expect(corpo.anuncios[0].documentos).toEqual([]);
  });

  it("não deixa sair o caminho no balde, o sha, a leitura nem quem reviu", async () => {
    estado.documentos = [
      documento({
        caminho: "ref/livro_azul/abc.pdf",
        sha256: "b".repeat(64),
        leitura: { texto: "coisas", origem: "pdf" },
        conflitos: [{ campo: "microchip", noFormulario: "1", noDocumento: "2" }],
        verificado_por: "revisor@portal-lusitano.pt",
        referencia: "3f7c1e2a-0000-4000-8000-000000000001",
      }),
    ];
    const texto = JSON.stringify(await (await GET()).json());
    expect(texto).not.toContain("ref/livro_azul/abc.pdf");
    expect(texto).not.toContain("b".repeat(64));
    expect(texto).not.toContain("revisor@portal-lusitano.pt");
    expect(texto).not.toContain("3f7c1e2a-0000-4000-8000-000000000001");
    expect(texto).not.toContain("conflitos");
  });

  it("uma linha corrompida não deita a página abaixo — cai só ela", async () => {
    estado.documentos = [documento({ estado: "quase_verificado" }), documento({ id: "outro" })];
    const corpo = await (await GET()).json();
    expect(corpo.anuncios[0].documentos).toHaveLength(1);
    expect(corpo.anuncios[0].documentos[0].id).toBe("outro");
  });

  it("a resposta não fica em cache pelo caminho", async () => {
    const r = await GET();
    expect(r.headers.get("Cache-Control")).toContain("private");
    expect(r.headers.get("Cache-Control")).toContain("no-store");
  });

  it("uma falha na base é um 500, não uma lista vazia que parece verdade", async () => {
    estado.erroDocumentos = { message: "timeout" };
    const r = await GET();
    expect(r.status).toBe(500);
  });
});
