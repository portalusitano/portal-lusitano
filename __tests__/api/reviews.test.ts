import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockFrom = vi.fn();

// O duplo é criado dentro da fábrica: vi.mock é içado para o topo do ficheiro,
// por isso não pode referenciar uma constante declarada fora. A referência a
// mockFrom é lazy (dentro do método), essa é segura.
vi.mock("@/lib/supabase-admin", () => {
  const duplo = { from: (...args: unknown[]) => mockFrom(...args) };
  return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
});

vi.mock("@/lib/rate-limit", () => ({
  apiLimiter: {
    check: vi.fn().mockResolvedValue(undefined),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/reviews");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString(), { method: "GET" });
}

function createPostRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Cria uma chain Supabase onde todos os metodos de query retornam o proprio
 * objecto (fluent), e o resultado final e thenable com resolvedValue.
 */
function createQueryChain(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};

  const returnSelf = vi.fn().mockImplementation(() => chain);

  chain.select = returnSelf;
  chain.eq = returnSelf;
  chain.not = returnSelf;
  chain.order = returnSelf;
  chain.limit = returnSelf;

  // Make the chain thenable so `await query` resolves to resolvedValue
  chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(resolvedValue).then(resolve, reject);

  return chain;
}

function createInsertChain(resolvedValue: { data: unknown; error: unknown }) {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
            Promise.resolve(resolvedValue).then(resolve, reject),
        }),
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests - GET
// ---------------------------------------------------------------------------
describe("GET /api/reviews", () => {
  let GET: typeof import("@/app/api/reviews/route").GET;

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock("@/lib/supabase-admin", () => {
      const duplo = { from: (...args: unknown[]) => mockFrom(...args) };
      return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
    });

    vi.doMock("@/lib/rate-limit", () => ({
      apiLimiter: {
        check: vi.fn().mockResolvedValue(undefined),
      },
    }));

    const routeModule = await import("@/app/api/reviews/route");
    GET = routeModule.GET;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar 400 sem coudelaria_id nem ferramenta_slug", async () => {
    const request = createGetRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("obrigat");
  });

  it("deve retornar reviews de coudelaria com estatisticas", async () => {
    const mockReviews = [
      { id: "r1", avaliacao: 5, comentario: "Excelente" },
      { id: "r2", avaliacao: 4, comentario: "Muito bom" },
    ];

    mockFrom.mockReturnValue(createQueryChain({ data: mockReviews, error: null }));

    const request = createGetRequest({ coudelaria_id: "coud-1" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reviews).toEqual(mockReviews);
    expect(data.stats.total).toBe(2);
    expect(data.stats.media).toBe(4.5);
  });

  it("deve retornar reviews de ferramenta por slug", async () => {
    const mockReviews = [{ id: "r1", avaliacao: 5, ferramenta_slug: "calculadora-valor" }];

    mockFrom.mockReturnValue(createQueryChain({ data: mockReviews, error: null }));

    const request = createGetRequest({ ferramenta_slug: "calculadora-valor" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reviews).toEqual(mockReviews);
    expect(data.stats.total).toBe(1);
    expect(data.stats.media).toBe(5);
  });

  it("deve retornar todas as reviews de ferramentas com slug='all'", async () => {
    mockFrom.mockReturnValue(createQueryChain({ data: [], error: null }));

    const request = createGetRequest({ ferramenta_slug: "all" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.total).toBe(0);
    expect(data.stats.media).toBe(0);
  });

  it("deve retornar 500 quando Supabase falha no GET", async () => {
    mockFrom.mockReturnValue(createQueryChain({ data: null, error: { message: "DB error" } }));

    const request = createGetRequest({ coudelaria_id: "coud-1" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Erro");
  });

  it("deve calcular media arredondada a uma casa decimal", async () => {
    const mockReviews = [
      { id: "r1", avaliacao: 3 },
      { id: "r2", avaliacao: 4 },
      { id: "r3", avaliacao: 5 },
    ];

    mockFrom.mockReturnValue(createQueryChain({ data: mockReviews, error: null }));

    const request = createGetRequest({ coudelaria_id: "coud-1" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.total).toBe(3);
    expect(data.stats.media).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Tests - POST (Review de coudelaria)
// ---------------------------------------------------------------------------
describe("POST /api/reviews - coudelaria", () => {
  let POST: typeof import("@/app/api/reviews/route").POST;

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock("@/lib/supabase-admin", () => {
      const duplo = { from: (...args: unknown[]) => mockFrom(...args) };
      return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
    });

    vi.doMock("@/lib/rate-limit", () => ({
      apiLimiter: {
        check: vi.fn().mockResolvedValue(undefined),
      },
    }));

    const routeModule = await import("@/app/api/reviews/route");
    POST = routeModule.POST;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("deve criar review de coudelaria com dados validos", async () => {
    const mockReview = { id: "new-1", status: "pending" };
    mockFrom.mockReturnValue(createInsertChain({ data: mockReview, error: null }));

    const request = createPostRequest({
      coudelaria_id: "coud-1",
      autor_nome: "Joao Silva",
      avaliacao: 5,
      comentario: "Coudelaria fantastica, cavalos de grande qualidade.",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.review).toEqual(mockReview);
  });

  it("deve rejeitar review sem nome do autor", async () => {
    const request = createPostRequest({
      coudelaria_id: "coud-1",
      autor_nome: "",
      avaliacao: 5,
      comentario: "Bom trabalho",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("deve rejeitar review com avaliacao fora do intervalo", async () => {
    const request = createPostRequest({
      coudelaria_id: "coud-1",
      autor_nome: "Teste",
      avaliacao: 6,
      comentario: "Comentario valido",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("deve rejeitar review sem comentario", async () => {
    const request = createPostRequest({
      coudelaria_id: "coud-1",
      autor_nome: "Teste",
      avaliacao: 4,
      comentario: "",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("deve retornar 429 quando rate limit excedido", async () => {
    vi.resetModules();

    vi.doMock("@/lib/rate-limit", () => ({
      apiLimiter: {
        check: vi.fn().mockRejectedValue(new Error("Rate limit")),
      },
    }));

    vi.doMock("@/lib/supabase-admin", () => {
      const duplo = { from: (...args: unknown[]) => mockFrom(...args) };
      return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
    });

    const routeModule = await import("@/app/api/reviews/route");
    const request = createPostRequest({
      coudelaria_id: "coud-1",
      autor_nome: "Teste",
      avaliacao: 4,
      comentario: "Comentario",
    });
    const response = await routeModule.POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain("Demasiados pedidos");
  });

  it("deve retornar 500 quando insert falha", async () => {
    mockFrom.mockReturnValue(createInsertChain({ data: null, error: { message: "Insert error" } }));

    const request = createPostRequest({
      coudelaria_id: "coud-1",
      autor_nome: "Joao",
      avaliacao: 3,
      comentario: "Comentario de teste suficientemente longo",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("submeter");
  });
});

// ---------------------------------------------------------------------------
// Tests - POST (Review de ferramenta)
// ---------------------------------------------------------------------------
describe("POST /api/reviews - ferramenta", () => {
  let POST: typeof import("@/app/api/reviews/route").POST;

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock("@/lib/supabase-admin", () => {
      const duplo = { from: (...args: unknown[]) => mockFrom(...args) };
      return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
    });

    vi.doMock("@/lib/rate-limit", () => ({
      apiLimiter: {
        check: vi.fn().mockResolvedValue(undefined),
      },
    }));

    const routeModule = await import("@/app/api/reviews/route");
    POST = routeModule.POST;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("deve criar review de ferramenta com dados validos", async () => {
    const mockReview = { id: "tool-r1", status: "approved" };
    mockFrom.mockReturnValue(createInsertChain({ data: mockReview, error: null }));

    const request = createPostRequest({
      ferramenta_slug: "calculadora-valor",
      autor_nome: "Maria",
      avaliacao: 5,
      comentario: "Ferramenta muito util para estimar valores.",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.review).toEqual(mockReview);
  });

  it("deve rejeitar ferramenta_slug invalido", async () => {
    const request = createPostRequest({
      ferramenta_slug: "slug-inexistente",
      autor_nome: "Teste",
      avaliacao: 4,
      comentario: "Bom trabalho na ferramenta",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("inv");
  });

  it("deve rejeitar review de ferramenta sem comentario", async () => {
    const request = createPostRequest({
      ferramenta_slug: "calculadora-valor",
      autor_nome: "Teste",
      avaliacao: 3,
      comentario: "",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("deve rejeitar review de ferramenta com avaliacao 0", async () => {
    const request = createPostRequest({
      ferramenta_slug: "comparador-cavalos",
      autor_nome: "Teste",
      avaliacao: 0,
      comentario: "Nao funciona",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("deve aceitar todos os slugs de ferramentas validos", async () => {
    const validSlugs = [
      "calculadora-valor",
      "comparador-cavalos",
      "verificador-compatibilidade",
      "analise-perfil",
    ];

    for (const slug of validSlugs) {
      vi.resetModules();

      vi.doMock("@/lib/supabase-admin", () => {
        const duplo = {
          from: vi.fn().mockReturnValue(createInsertChain({ data: { id: "r-ok" }, error: null })),
        };
        return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
      });

      vi.doMock("@/lib/rate-limit", () => ({
        apiLimiter: {
          check: vi.fn().mockResolvedValue(undefined),
        },
      }));

      const routeModule = await import("@/app/api/reviews/route");
      const request = createPostRequest({
        ferramenta_slug: slug,
        autor_nome: "Teste",
        avaliacao: 4,
        comentario: "Comentario de teste valido",
      });
      const response = await routeModule.POST(request);

      expect(response.status).toBe(200);
    }
  });
});
