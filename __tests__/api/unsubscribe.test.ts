import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";

// A rota passou a exigir um token HMAC, para terceiros não conseguirem cancelar
// subscrições alheias. O segredo tem de existir antes de a rota ser importada.
process.env.UNSUBSCRIBE_SECRET = "segredo-de-teste";

/** Gera o mesmo token que o link do email levaria. */
function tokenPara(email: string) {
  return crypto
    .createHmac("sha256", process.env.UNSUBSCRIBE_SECRET as string)
    .update(email.toLowerCase().trim())
    .digest("hex");
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockFrom = vi.fn();

vi.mock("@/lib/supabase-admin", () => {
  const duplo = { from: (...args: unknown[]) => mockFrom(...args) };
  return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createPostRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createUpdateChain(resolvedValue: { error: unknown }) {
  return {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
          Promise.resolve(resolvedValue).then(resolve, reject),
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("POST /api/unsubscribe", () => {
  let POST: typeof import("@/app/api/unsubscribe/route").POST;

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock("@/lib/supabase-admin", () => {
      const duplo = { from: (...args: unknown[]) => mockFrom(...args) };
      return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
    });

    const routeModule = await import("@/app/api/unsubscribe/route");
    POST = routeModule.POST;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("deve cancelar subscricao com email valido", async () => {
    mockFrom.mockReturnValue(createUpdateChain({ error: null }));

    const request = createPostRequest({
      email: "user@teste.pt",
      token: tokenPara("user@teste.pt"),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("cancelada");
  });

  it("deve normalizar email para minusculas", async () => {
    mockFrom.mockReturnValue(createUpdateChain({ error: null }));

    const request = createPostRequest({
      email: "USER@TESTE.PT",
      token: tokenPara("USER@TESTE.PT"),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verificar que o update foi chamado com a table leads
    expect(mockFrom).toHaveBeenCalledWith("leads");
  });

  it("deve retornar 400 quando email em falta", async () => {
    const request = createPostRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("obrigat");
  });

  it("deve retornar 400 quando email invalido", async () => {
    const request = createPostRequest({ email: "nao-e-email", token: "irrelevante" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("inv");
  });

  it("deve retornar 400 quando email e string vazia", async () => {
    const request = createPostRequest({ email: "" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("deve retornar 500 quando update no Supabase falha", async () => {
    mockFrom.mockReturnValue(createUpdateChain({ error: { message: "Update failed" } }));

    const request = createPostRequest({
      email: "user@teste.pt",
      token: tokenPara("user@teste.pt"),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Erro");
  });

  it("deve retornar 500 quando body invalido (JSON parse error)", async () => {
    const request = new NextRequest("http://localhost:3000/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Erro");
  });

  it("deve rejeitar emails com formatos invalidos especificos", async () => {
    const invalidEmails = [
      "user@",
      "@domain.com",
      "user@.com",
      "user@domain.",
      "user space@domain.com",
    ];

    for (const email of invalidEmails) {
      const request = createPostRequest({ email, token: "irrelevante" });
      const response = await POST(request);

      expect(response.status).toBe(400);
    }
  });
});
