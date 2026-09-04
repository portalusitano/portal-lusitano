/**
 * As decisões: reclamar, verificar, recusar.
 *
 * O que aqui se testa não é o feliz caminho de cada rota — é a regra que dá
 * sentido à palavra «verificado». Se um destes testes cair, o painel deixa de
 * ser a peça que sustenta a afirmação que o anúncio faz ao público.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Duplos
// ---------------------------------------------------------------------------
const mockFrom = vi.fn();
const mockVerifySession = vi.fn();

// A fábrica é içada para o topo do ficheiro, por isso não pode fechar sobre
// uma constante declarada depois. As referências dentro dos métodos são
// tardias, e essas são seguras.
vi.mock("@/lib/supabase-admin", () => {
  const duplo = {
    from: (...args: unknown[]) => mockFrom(...args),
    storage: { from: () => ({ download: vi.fn() }) },
  };
  return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
});

vi.mock("@/lib/auth", () => ({
  verifySession: (...args: unknown[]) => mockVerifySession(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { POST as verificar } from "@/app/api/admin/documentos/[id]/verificar/route";
import { POST as recusar } from "@/app/api/admin/documentos/[id]/recusar/route";
import { POST as reclamar, DELETE as largar } from "@/app/api/admin/documentos/[id]/reclamar/route";

const ID = "11111111-2222-4333-8444-555555555555";
const params = Promise.resolve({ id: ID });

/**
 * Um duplo de `update(...).eq(...).in(...).select()`.
 *
 * Guarda os filtros e o que se escreveu, porque é sobre eles que os testes
 * mais importantes deste ficheiro fazem as afirmações: o que a rota grava, e
 * em que condição.
 */
function cadeiaDeEscrita(devolve: { data: unknown; error: unknown }) {
  const registo = {
    escrito: null as Record<string, unknown> | null,
    filtrosEq: [] as [string, unknown][],
    filtrosIn: [] as [string, unknown][],
  };
  const cadeia: Record<string, unknown> = {};
  cadeia.update = vi.fn((valores: Record<string, unknown>) => {
    registo.escrito = valores;
    return cadeia;
  });
  cadeia.eq = vi.fn((coluna: string, valor: unknown) => {
    registo.filtrosEq.push([coluna, valor]);
    return cadeia;
  });
  cadeia.in = vi.fn((coluna: string, valor: unknown) => {
    registo.filtrosIn.push([coluna, valor]);
    return cadeia;
  });
  cadeia.select = vi.fn(() => Promise.resolve(devolve));
  return { cadeia, registo };
}

/** Um duplo de `select(...).eq(...).maybeSingle()`, para a leitura de recurso. */
function cadeiaDeLeitura(devolve: { data: unknown; error?: unknown }) {
  const cadeia: Record<string, unknown> = {};
  cadeia.select = vi.fn(() => cadeia);
  cadeia.eq = vi.fn(() => cadeia);
  cadeia.maybeSingle = vi.fn(() => Promise.resolve({ error: null, ...devolve }));
  return cadeia;
}

function pedidoJson(corpo: unknown) {
  return new NextRequest("http://localhost:3000/api/admin/documentos/x/recusar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
}

function pedidoVazio() {
  return new NextRequest("http://localhost:3000/api/admin/documentos/x", { method: "POST" });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifySession.mockResolvedValue("admin@portal-lusitano.pt");
});

// ---------------------------------------------------------------------------
// A sessão, em todas as rotas
// ---------------------------------------------------------------------------
describe("a sessão é exigida em cada rota, não só na página", () => {
  const rotas: [string, () => Promise<Response>][] = [
    ["verificar", () => verificar(pedidoVazio(), { params })],
    ["recusar", () => recusar(pedidoJson({ motivo: "qualquer" }), { params })],
    ["reclamar", () => reclamar(pedidoVazio(), { params })],
    ["largar", () => largar(pedidoVazio(), { params })],
  ];

  for (const [nome, chamar] of rotas) {
    it(`${nome} devolve 401 sem sessão e não toca na base`, async () => {
      mockVerifySession.mockResolvedValue(null);
      const resposta = await chamar();
      expect(resposta.status).toBe(401);
      // O que interessa não é só o código: é que nada foi lido nem escrito.
      expect(mockFrom).not.toHaveBeenCalled();
    });
  }
});

// ---------------------------------------------------------------------------
// Verificar
// ---------------------------------------------------------------------------
describe("POST verificar", () => {
  it("grava o autor e a hora — a base recusa um verificado sem os dois", async () => {
    const { cadeia, registo } = cadeiaDeEscrita({
      data: [
        {
          id: ID,
          estado: "verificado",
          verificado_por: "admin@portal-lusitano.pt",
          verificado_em: "2026-09-04T10:00:00Z",
        },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(cadeia);

    const resposta = await verificar(pedidoVazio(), { params });

    expect(resposta.status).toBe(200);
    expect(registo.escrito).toMatchObject({
      estado: "verificado",
      verificado_por: "admin@portal-lusitano.pt",
    });
    expect(typeof registo.escrito?.verificado_em).toBe("string");
  });

  it("o autor é a sessão, nunca algo que venha do pedido", async () => {
    mockVerifySession.mockResolvedValue("outro@portal-lusitano.pt");
    const { cadeia, registo } = cadeiaDeEscrita({
      data: [{ id: ID, estado: "verificado", verificado_por: "x", verificado_em: "y" }],
      error: null,
    });
    mockFrom.mockReturnValue(cadeia);

    // Um corpo a tentar dizer quem verificou. Não há corpo nesta rota, e este
    // teste existe para que continue a não haver.
    await verificar(pedidoJson({ verificado_por: "intruso@exemplo.pt" }), { params });

    expect(registo.escrito?.verificado_por).toBe("outro@portal-lusitano.pt");
  });

  it("só promove a partir de um estado não terminal", async () => {
    const { cadeia, registo } = cadeiaDeEscrita({
      data: [{ id: ID, estado: "verificado", verificado_por: "a", verificado_em: "b" }],
      error: null,
    });
    mockFrom.mockReturnValue(cadeia);

    await verificar(pedidoVazio(), { params });

    // A condição vai no `where`, não numa leitura anterior: é isso que impede
    // dois administradores de escreverem por cima um do outro.
    expect(registo.filtrosIn).toContainEqual(["estado", ["por_verificar", "em_revisao"]]);
  });

  it("não passa por cima de uma decisão já tomada — 409, com quem a tomou", async () => {
    const { cadeia } = cadeiaDeEscrita({ data: [], error: null });
    const leitura = cadeiaDeLeitura({
      data: { estado: "recusado", verificado_por: "outra@portal-lusitano.pt" },
    });
    mockFrom.mockReturnValueOnce(cadeia).mockReturnValueOnce(leitura);

    const resposta = await verificar(pedidoVazio(), { params });
    const corpo = await resposta.json();

    expect(resposta.status).toBe(409);
    expect(corpo.estado).toBe("recusado");
    expect(corpo.erro).toContain("outra@portal-lusitano.pt");
  });

  it("recusa um id que não seja um UUID antes de chegar à base", async () => {
    const resposta = await verificar(pedidoVazio(), {
      params: Promise.resolve({ id: "nao-e-um-uuid" }),
    });
    expect(resposta.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Recusar
// ---------------------------------------------------------------------------
describe("POST recusar", () => {
  it("sem motivo não recusa, e não escreve nada", async () => {
    const resposta = await recusar(pedidoJson({}), { params });
    expect(resposta.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("um motivo só de espaços é um motivo vazio", async () => {
    const resposta = await recusar(pedidoJson({ motivo: "   \n\t  " }), { params });
    expect(resposta.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("grava o motivo aparado e quem recusou", async () => {
    const { cadeia, registo } = cadeiaDeEscrita({
      data: [{ id: ID, estado: "recusado", motivo_recusa: "Falta a página do microchip." }],
      error: null,
    });
    mockFrom.mockReturnValue(cadeia);

    const resposta = await recusar(pedidoJson({ motivo: "  Falta a página do microchip.  " }), {
      params,
    });

    expect(resposta.status).toBe(200);
    expect(registo.escrito).toMatchObject({
      estado: "recusado",
      motivo_recusa: "Falta a página do microchip.",
      verificado_por: "admin@portal-lusitano.pt",
    });
  });

  it("recusa um motivo maior do que o tecto", async () => {
    const resposta = await recusar(pedidoJson({ motivo: "a".repeat(2001) }), { params });
    expect(resposta.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("um corpo que não é JSON dá 400, não 500", async () => {
    const pedido = new NextRequest("http://localhost:3000/api/admin/documentos/x/recusar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "isto não é json",
    });
    const resposta = await recusar(pedido, { params });
    expect(resposta.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Reclamar
// ---------------------------------------------------------------------------
describe("reclamar e largar", () => {
  it("reclamar move de por_verificar para em_revisao, com o estado no where", async () => {
    const { cadeia, registo } = cadeiaDeEscrita({
      data: [{ id: ID, estado: "em_revisao" }],
      error: null,
    });
    mockFrom.mockReturnValue(cadeia);

    const resposta = await reclamar(pedidoVazio(), { params });

    expect(resposta.status).toBe(200);
    expect(registo.escrito).toEqual({ estado: "em_revisao" });
    expect(registo.filtrosEq).toContainEqual(["estado", "por_verificar"]);
  });

  it("reclamar não escreve autor nenhum — não é uma decisão", async () => {
    const { cadeia, registo } = cadeiaDeEscrita({
      data: [{ id: ID, estado: "em_revisao" }],
      error: null,
    });
    mockFrom.mockReturnValue(cadeia);

    await reclamar(pedidoVazio(), { params });

    expect(registo.escrito).not.toHaveProperty("verificado_por");
    expect(registo.escrito).not.toHaveProperty("verificado_em");
  });

  it("quem chega em segundo apanha 409 e sabe porquê", async () => {
    const { cadeia } = cadeiaDeEscrita({ data: [], error: null });
    const leitura = cadeiaDeLeitura({ data: { estado: "em_revisao" } });
    mockFrom.mockReturnValueOnce(cadeia).mockReturnValueOnce(leitura);

    const resposta = await reclamar(pedidoVazio(), { params });
    const corpo = await resposta.json();

    expect(resposta.status).toBe(409);
    expect(corpo.erro).toContain("outra pessoa");
  });

  it("um documento que não existe dá 404", async () => {
    const { cadeia } = cadeiaDeEscrita({ data: [], error: null });
    const leitura = cadeiaDeLeitura({ data: null });
    mockFrom.mockReturnValueOnce(cadeia).mockReturnValueOnce(leitura);

    const resposta = await reclamar(pedidoVazio(), { params });
    expect(resposta.status).toBe(404);
  });

  it("largar devolve o documento à fila", async () => {
    const { cadeia, registo } = cadeiaDeEscrita({
      data: [{ id: ID, estado: "por_verificar" }],
      error: null,
    });
    mockFrom.mockReturnValue(cadeia);

    const resposta = await largar(pedidoVazio(), { params });

    expect(resposta.status).toBe(200);
    expect(registo.escrito).toEqual({ estado: "por_verificar" });
    expect(registo.filtrosEq).toContainEqual(["estado", "em_revisao"]);
  });
});
