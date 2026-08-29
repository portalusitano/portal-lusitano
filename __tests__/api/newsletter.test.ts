import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockCreate = vi.fn();

// A rota usa writeClient (o cliente com permissão de escrita), não client.
vi.mock("@/lib/client", () => {
  const duplo = { create: (...args: unknown[]) => mockCreate(...args) };
  return { client: duplo, writeClient: duplo };
});

// O envio de boas-vindas é disparado e esquecido pela rota, mas importar o
// módulo real exige as chaves do Resend e faz a rota falhar por inteiro.
vi.mock("@/lib/resend", () => ({
  EmailWorkflows: {
    sendNewsletterWelcome: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  apiLimiter: {
    check: vi.fn().mockResolvedValue(undefined),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createPostRequest(body: unknown) {
  return new Request("http://localhost:3000/api/newsletter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("POST /api/newsletter", () => {
  let POST: typeof import("@/app/api/newsletter/route").POST;

  beforeEach(async () => {
    vi.resetModules();
    mockCreate.mockResolvedValue({ _id: "sub-1" });

    // Re-apply rate-limit mock after resetModules
    vi.doMock("@/lib/rate-limit", () => ({
      apiLimiter: {
        check: vi.fn().mockResolvedValue(undefined),
      },
    }));

    vi.doMock("@/lib/client", () => {
      const duplo = { create: (...args: unknown[]) => mockCreate(...args) };
      return { client: duplo, writeClient: duplo };
    });

    const routeModule = await import("@/app/api/newsletter/route");
    POST = routeModule.POST;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("deve subscrever com email valido", async () => {
    const request = createPostRequest({ email: "teste@exemplo.pt" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Subscrição concluída");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        _type: "subscritor",
        email: "teste@exemplo.pt",
      })
    );
  });

  it("deve rejeitar email invalido", async () => {
    const request = createPostRequest({ email: "nao-e-email" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("deve rejeitar body sem email", async () => {
    const request = createPostRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("deve retornar 429 quando rate limit excedido", async () => {
    vi.resetModules();

    vi.doMock("@/lib/rate-limit", () => ({
      apiLimiter: {
        check: vi.fn().mockRejectedValue(new Error("Rate limit exceeded")),
      },
    }));

    vi.doMock("@/lib/client", () => {
      const duplo = { create: (...args: unknown[]) => mockCreate(...args) };
      return { client: duplo, writeClient: duplo };
    });

    const routeModule = await import("@/app/api/newsletter/route");
    const request = createPostRequest({ email: "teste@exemplo.pt" });
    const response = await routeModule.POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain("Demasiados pedidos");
  });

  it("deve retornar 500 quando Sanity falha", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Sanity connection error"));

    const request = createPostRequest({ email: "teste@exemplo.pt" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Erro ao salvar e-mail");
  });
});
