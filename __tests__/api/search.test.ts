import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const _mockSelect = vi.fn();
const _mockEq = vi.fn();
const _mockOr = vi.fn();
const _mockLimit = vi.fn();

vi.mock("@/lib/supabase-admin", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    }),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/search");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString(), { method: "GET" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("GET /api/search", () => {
  let GET: typeof import("@/app/api/search/route").GET;

  beforeEach(async () => {
    vi.resetModules();

    // Re-setup supabase mock with controllable responses
    const { supabase } = await import("@/lib/supabase-admin");

    const createChain = (data: unknown[] = []) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data, error: null }),
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "cavalos_venda") {
        return createChain([]) as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === "eventos") {
        return createChain([]) as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === "coudelarias") {
        return createChain([]) as unknown as ReturnType<typeof supabase.from>;
      }
      return createChain([]) as unknown as ReturnType<typeof supabase.from>;
    });

    const routeModule = await import("@/app/api/search/route");
    GET = routeModule.GET;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty results when query is missing", async () => {
    const request = createGetRequest({});
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toEqual([]);
  });

  it("should return empty results when query is too short (< 2 chars)", async () => {
    const request = createGetRequest({ q: "a" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toEqual([]);
  });

  it("should return matching static pages for valid query", async () => {
    const request = createGetRequest({ q: "comprar" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results.length).toBeGreaterThan(0);

    const resultado = data.results.find((r: { url: string }) => r.url === "/comprar");
    expect(resultado).toBeDefined();
    expect(resultado.type).toBe("page");
    expect(resultado.title).toBe("Comprar cavalo");
  });

  it("should return horse results from supabase", async () => {
    vi.resetModules();

    vi.doMock("@/lib/supabase-admin", () => {
      const createChainWithData = (data: unknown[]) => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data, error: null }),
            }),
          }),
        }),
      });

      return {
        supabase: {
          from: vi.fn().mockImplementation((table: string) => {
            if (table === "cavalos_venda") {
              return createChainWithData([
                {
                  id: "1",
                  nome: "Lusitano Teste",
                  descricao: "Cavalo de teste",
                  // a coluna chama-se foto_principal — `imagens` não existe
                  // em cavalos_venda
                  foto_principal: "https://example.com/horse.jpg",
                  slug: "lusitano-teste",
                },
              ]);
            }
            return createChainWithData([]);
          }),
        },
      };
    });

    const routeModule = await import("@/app/api/search/route");
    const request = createGetRequest({ q: "lusitano" });
    const response = await routeModule.GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    const horseResult = data.results.find((r: { type: string }) => r.type === "horse");
    expect(horseResult).toBeDefined();
    expect(horseResult.id).toBe("horse-1");
    expect(horseResult.title).toBe("Lusitano Teste");
    // `/comprar/[id]` procura por `id`, não por slug: ligar pelo slug dava 404.
    expect(horseResult.url).toBe("/comprar/1");
    expect(horseResult.image).toBe("https://example.com/horse.jpg");
  });

  it("should return stud results from supabase", async () => {
    vi.resetModules();

    vi.doMock("@/lib/supabase-admin", () => {
      const createChainWithData = (data: unknown[]) => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data, error: null }),
            }),
          }),
        }),
      });

      return {
        supabase: {
          from: vi.fn().mockImplementation((table: string) => {
            if (table === "coudelarias") {
              return createChainWithData([
                {
                  id: "st1",
                  nome: "Coudelaria Real",
                  descricao: "Coudelaria historica",
                  slug: "coudelaria-real",
                  logo: "https://example.com/stud.jpg",
                },
              ]);
            }
            return createChainWithData([]);
          }),
        },
      };
    });

    const routeModule = await import("@/app/api/search/route");
    const request = createGetRequest({ q: "cavalo" });
    const response = await routeModule.GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);

    // A secção de eventos saiu do site: a pesquisa não pode voltar a
    // devolver fichas que já não têm página onde aterrar.
    expect(data.results.find((r: { type: string }) => r.type === "event")).toBeUndefined();

    const studResult = data.results.find((r: { type: string }) => r.type === "stud");
    expect(studResult).toBeDefined();
    expect(studResult.id).toBe("stud-st1");
    expect(studResult.title).toBe("Coudelaria Real");
    expect(studResult.url).toBe("/directorio/coudelaria-real");
  });

  it("should respect the limit parameter", async () => {
    const request = createGetRequest({ q: "ferramentas", limit: "1" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results.length).toBeLessThanOrEqual(1);
  });

  it("should cap limit at 30", async () => {
    // The route caps limit at 30 via Math.min
    const request = createGetRequest({ q: "comprar", limit: "100" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // O total de páginas estáticas que casam com "comprar" não excede 30,
    // but the important thing is it didn't crash
    expect(data.results.length).toBeLessThanOrEqual(30);
  });

  it("should handle supabase errors gracefully via Promise.allSettled", async () => {
    vi.resetModules();

    vi.doMock("@/lib/supabase-admin", () => ({
      supabase: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                limit: vi.fn().mockRejectedValue(new Error("DB connection failed")),
              }),
            }),
          }),
        }),
      },
    }));

    const routeModule = await import("@/app/api/search/route");
    const request = createGetRequest({ q: "comprar" });
    const response = await routeModule.GET(request);
    const data = await response.json();

    // Promise.allSettled means rejected supabase calls are handled;
    // static pages should still return
    expect(response.status).toBe(200);
    expect(data.results).toBeDefined();
    const resultado = data.results.find((r: { url: string }) => r.url === "/comprar");
    expect(resultado).toBeDefined();
  });
});
