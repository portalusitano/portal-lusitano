import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Duplos
// ---------------------------------------------------------------------------

/**
 * Estado partilhado com os duplos.
 *
 * Declarado com vi.hoisted porque as fábricas de vi.mock são içadas para o topo
 * do ficheiro e não conseguem ver constantes declaradas normalmente.
 */
const estado = vi.hoisted(() => {
  /** Utilizador devolvido pelo cliente SSR; null = sessão anónima. */
  const ref: {
    utilizador: { id: string; email: string } | null;
    resultados: Array<{ data?: unknown; error?: unknown }>;
    chamadasFrom: string[];
  } = { utilizador: null, resultados: [], chamadasFrom: [] };
  return ref;
});

/**
 * Cadeia de query encadeável em qualquer ordem e resolúvel em qualquer ponto.
 *
 * Assim o teste não fica preso à sequência exacta de .select().eq().order() que
 * a rota use hoje: o que interessa afirmar é a resposta, não a forma da query.
 */
function criarCadeia(resultado: { data?: unknown; error?: unknown }) {
  const cadeia: Record<string, unknown> = {};
  for (const metodo of [
    "select",
    "eq",
    "neq",
    "in",
    "order",
    "limit",
    "single",
    "maybeSingle",
    "insert",
    "update",
    "delete",
  ]) {
    cadeia[metodo] = vi.fn(() => cadeia);
  }
  cadeia.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(resultado).then(resolve, reject);
  return cadeia;
}

vi.mock("@/lib/supabase-admin", () => {
  const duplo = {
    from: vi.fn((tabela: string) => {
      estado.chamadasFrom.push(tabela);
      return criarCadeia(estado.resultados.shift() ?? { data: [], error: null });
    }),
  };
  return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
});

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: async () => ({ data: { user: estado.utilizador }, error: null }),
    },
  })),
}));

import { GET, POST, DELETE } from "@/app/api/favoritos/route";

// ---------------------------------------------------------------------------
// Ajudantes
// ---------------------------------------------------------------------------
const autenticar = () => {
  estado.utilizador = { id: "user-1", email: "user@teste.pt" };
};

const pedidoGet = () => new NextRequest("http://localhost:3000/api/favoritos");

const pedidoPost = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/favoritos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const pedidoDelete = (params: Record<string, string> = {}) => {
  const url = new URL("http://localhost:3000/api/favoritos");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString(), { method: "DELETE" });
};

beforeEach(() => {
  estado.utilizador = null;
  estado.resultados = [];
  estado.chamadasFrom.length = 0;
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------
describe("GET /api/favoritos", () => {
  it("devolve lista vazia a um visitante anónimo, em vez de 401", async () => {
    // Ter favoritos guardados localmente sem conta é legítimo; a rota não deve
    // tratar isso como erro.
    const res = await GET(pedidoGet());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.favoritos).toEqual([]);
  });

  it("devolve os favoritos do utilizador autenticado", async () => {
    autenticar();
    estado.resultados = [
      {
        data: [{ id: "f1", item_id: "c1", item_type: "cavalo", created_at: "2026-01-01" }],
        error: null,
      },
      { data: [{ id: "c1", nome: "Imperador" }], error: null },
    ];

    const res = await GET(pedidoGet());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.favoritos).toHaveLength(1);
    expect(estado.chamadasFrom[0]).toBe("favoritos");
  });

  it("enriquece cada favorito com o anúncio correspondente", async () => {
    autenticar();
    estado.resultados = [
      { data: [{ id: "f1", item_id: "c1", item_type: "cavalo" }], error: null },
      { data: [{ id: "c1", nome: "Imperador" }], error: null },
    ];

    const body = await (await GET(pedidoGet())).json();

    expect(body.data.favoritos[0].cavalos_venda).toMatchObject({ nome: "Imperador" });
    expect(body.data.favoritos[0].coudelarias).toBeNull();
  });

  it("responde 500 quando a base de dados falha", async () => {
    autenticar();
    estado.resultados = [{ data: null, error: { message: "boom" } }];

    const res = await GET(pedidoGet());

    expect(res.status).toBe(500);
  });

  it("devolve lista vazia quando o utilizador ainda não guardou nada", async () => {
    autenticar();
    estado.resultados = [{ data: [], error: null }];

    const body = await (await GET(pedidoGet())).json();

    expect(body.data.favoritos).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------
describe("POST /api/favoritos", () => {
  it("recusa um visitante anónimo", async () => {
    const res = await POST(pedidoPost({ item_id: "c1", item_type: "cavalo" }));
    expect(res.status).toBe(401);
  });

  it("exige item_id", async () => {
    autenticar();
    const res = await POST(pedidoPost({ item_type: "cavalo" }));
    expect(res.status).toBe(400);
  });

  it("exige item_type", async () => {
    autenticar();
    const res = await POST(pedidoPost({ item_id: "c1" }));
    expect(res.status).toBe(400);
  });

  it("é idempotente: guardar duas vezes não é erro", async () => {
    autenticar();
    estado.resultados = [{ data: { id: "existente" }, error: null }];

    const res = await POST(pedidoPost({ item_id: "c1", item_type: "cavalo" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.success).toBe(true);
  });

  it("guarda um favorito novo", async () => {
    autenticar();
    estado.resultados = [
      { data: null, error: null }, // não existe ainda
      { data: null, error: null }, // insert
    ];

    const res = await POST(pedidoPost({ item_id: "c1", item_type: "cavalo" }));

    expect(res.status).toBe(200);
    expect((await res.json()).data.success).toBe(true);
  });

  it("responde 500 quando a gravação falha", async () => {
    autenticar();
    estado.resultados = [
      { data: null, error: null },
      { data: null, error: { message: "insert falhou" } },
    ];

    const res = await POST(pedidoPost({ item_id: "c1", item_type: "cavalo" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("favorito");
  });
});

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------
describe("DELETE /api/favoritos", () => {
  it("recusa um visitante anónimo", async () => {
    const res = await DELETE(pedidoDelete({ item_id: "c1", item_type: "cavalo" }));
    expect(res.status).toBe(401);
  });

  it("exige os parâmetros do item", async () => {
    autenticar();
    const res = await DELETE(pedidoDelete());
    expect(res.status).toBe(400);
  });

  it("remove um favorito", async () => {
    autenticar();
    estado.resultados = [{ data: null, error: null }];

    const res = await DELETE(pedidoDelete({ item_id: "c1", item_type: "cavalo" }));

    expect(res.status).toBe(200);
  });

  it("limpa todos os favoritos com ?all=true", async () => {
    autenticar();
    estado.resultados = [{ data: null, error: null }];

    const res = await DELETE(pedidoDelete({ all: "true" }));

    expect(res.status).toBe(200);
  });

  it("responde 500 quando a remoção falha", async () => {
    autenticar();
    estado.resultados = [{ data: null, error: { message: "delete falhou" } }];

    const res = await DELETE(pedidoDelete({ item_id: "c1", item_type: "cavalo" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("favorito");
  });
});
