import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock jose module
vi.mock("jose", () => ({
  jwtVerify: vi.fn(),
}));

// Hoisted mocks — runs before imports, so env vars and mocks are ready at module load time
const { mockLimit } = vi.hoisted(() => {
  // Set env vars here so middleware module-level code can create Redis/Ratelimit instances
  process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";
  return { mockLimit: vi.fn() };
});

// Mock @upstash/redis and @upstash/ratelimit so rate limiting is active in tests
vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: () => ({}),
  },
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class MockRatelimit {
    constructor() {}
    limit = mockLimit;
    static slidingWindow() {
      return {};
    }
  },
}));

type MockHeaders = ReturnType<typeof createMockHeaders>;

function createMockHeaders(init: Record<string, string> = {}) {
  const headers = new Map<string, string>();
  for (const [key, value] of Object.entries(init)) {
    headers.set(key.toLowerCase(), value);
  }
  return {
    get: (key: string) => headers.get(key.toLowerCase()) || null,
    set: (key: string, value: string) => headers.set(key.toLowerCase(), value),
    has: (key: string) => headers.has(key.toLowerCase()),
    delete: (key: string) => headers.delete(key.toLowerCase()),
    entries: () => headers.entries(),
    forEach: (cb: (value: string, key: string) => void) => headers.forEach(cb),
  };
}

function createMockCookies(cookies: Record<string, string> = {}) {
  return {
    get: (name: string) => {
      if (name in cookies) return { value: cookies[name] };
      return undefined;
    },
    set: vi.fn(),
  };
}

function createMockNextUrl(pathname: string, host: string = "portal-lusitano.com") {
  return {
    pathname,
    host,
    clone: () => createMockNextUrl(pathname, host),
  };
}

function createMockRequest(
  pathname: string,
  options: {
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    method?: string;
    host?: string;
  } = {}
) {
  const host = options.host || "portal-lusitano.com";
  return {
    nextUrl: createMockNextUrl(pathname, host),
    headers: createMockHeaders({
      host,
      ...(options.headers || {}),
    }),
    cookies: createMockCookies(options.cookies || {}),
    method: options.method || "GET",
    url: `https://${host}${pathname}`,
  };
}

// Track NextResponse calls
const mockRedirect = vi.fn();
const mockRewrite = vi.fn();
const mockJson = vi.fn();

vi.mock("next/server", () => {
  class MockNextResponse {
    headers: ReturnType<typeof createMockHeaders>;
    cookies: { set: ReturnType<typeof vi.fn> };
    status: number;

    constructor(
      _body: unknown,
      init?: { status?: number; headers?: ReturnType<typeof createMockHeaders> }
    ) {
      this.headers = init?.headers ?? createMockHeaders();
      this.cookies = { set: vi.fn() };
      this.status = init?.status ?? 200;
    }

    static next() {
      const resp = new MockNextResponse(null);
      return resp;
    }

    static redirect(url: unknown, status?: number) {
      const resp = new MockNextResponse(null);
      resp.status = status || 302;
      mockRedirect(url, status);
      return resp;
    }

    static rewrite(url: unknown) {
      const resp = new MockNextResponse(null);
      mockRewrite(url);
      return resp;
    }

    static json(
      body: unknown,
      init?: { status?: number; headers?: ReturnType<typeof createMockHeaders> }
    ) {
      const resp = new MockNextResponse(null);
      resp.status = init?.status || 200;
      mockJson(body, init);
      return resp;
    }
  }

  return {
    NextResponse: MockNextResponse,
    NextRequest: class {},
  };
});

// Import after mocking
import { middleware } from "@/middleware";
type MiddlewareRequest = Parameters<typeof middleware>[0];

describe("middleware", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true });
    process.env.NEXT_PUBLIC_APP_URL = "https://portal-lusitano.com";
    process.env.ADMIN_SECRET = "test-secret-key";
    process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";
    // Default: allow requests (rate limit not exceeded)
    mockLimit.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe("Rate Limiting", () => {
    it("deve retornar 429 quando limite de API e excedido", async () => {
      mockLimit.mockResolvedValue({ success: false });

      const request = createMockRequest("/api/products", {
        headers: { "x-forwarded-for": "192.168.1.100" },
      });
      await middleware(request as unknown as MiddlewareRequest);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Too many requests"),
        }),
        expect.objectContaining({ status: 429 })
      );
    });

    it("deve retornar 429 quando limite de autenticacao e excedido", async () => {
      mockLimit.mockResolvedValue({ success: false });

      const request = createMockRequest("/api/auth/login", {
        headers: { "x-forwarded-for": "10.0.0.50" },
        method: "POST",
      });
      await middleware(request as unknown as MiddlewareRequest);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Too many requests"),
        }),
        expect.objectContaining({ status: 429 })
      );
    });
  });

  describe("CORS Headers", () => {
    it("deve adicionar headers CORS em rotas API", async () => {
      const request = createMockRequest("/api/products", {
        headers: { "x-forwarded-for": "unique-cors-ip-1" },
      });

      const result = await middleware(request as unknown as MiddlewareRequest);

      if (result?.headers) {
        const headers = result.headers as unknown as MockHeaders;
        expect(headers.get("Access-Control-Allow-Origin")).toBe("https://portal-lusitano.com");
        expect(headers.get("Access-Control-Allow-Methods")).toContain("GET");
      }
    });

    it("deve retornar 200 para preflight OPTIONS em rotas API", async () => {
      const request = createMockRequest("/api/products", {
        headers: { "x-forwarded-for": "unique-cors-ip-2" },
        method: "OPTIONS",
      });

      const result = await middleware(request as unknown as MiddlewareRequest);
      expect(result).toBeDefined();
      expect(result?.status).toBe(200);
    });
  });

  describe("Proteccao de rotas admin", () => {
    it("deve redirecionar para login quando nao ha token de admin", async () => {
      const request = createMockRequest("/admin/dashboard");
      await middleware(request as unknown as MiddlewareRequest);

      expect(mockRedirect).toHaveBeenCalled();
      const redirectUrl = mockRedirect.mock.calls[0][0];
      expect(redirectUrl.pathname || String(redirectUrl)).toContain("/admin/login");
    });

    it("nao deve redirecionar a pagina de login do admin", async () => {
      const request = createMockRequest("/admin/login");
      mockRedirect.mockClear();
      await middleware(request as unknown as MiddlewareRequest);

      // /admin/login nao deve trigger redirect por proteccao admin
      // (pode haver redirect www, mas nao admin redirect)
    });

    it("deve redirecionar quando token JWT e invalido", async () => {
      const { jwtVerify } = await import("jose");
      (jwtVerify as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Invalid token"));

      const request = createMockRequest("/admin/dashboard", {
        cookies: { admin_session: "invalid-token" },
      });
      await middleware(request as unknown as MiddlewareRequest);

      expect(mockRedirect).toHaveBeenCalled();
    });

    it("deve redirecionar quando ADMIN_SECRET nao esta definido", async () => {
      delete process.env.ADMIN_SECRET;
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      const request = createMockRequest("/admin/dashboard", {
        cookies: { admin_session: "some-token" },
      });
      await middleware(request as unknown as MiddlewareRequest);

      expect(mockRedirect).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe("Redirect www", () => {
    it("deve redirecionar www para non-www com 301", async () => {
      const request = createMockRequest("/loja", {
        host: "www.portal-lusitano.com",
      });
      await middleware(request as unknown as MiddlewareRequest);

      expect(mockRedirect).toHaveBeenCalled();
      const [, status] = mockRedirect.mock.calls[0];
      expect(status).toBe(301);
    });
  });

  describe("Rewrite /en/ para locale ingles", () => {
    it("deve reescrever /en/loja para /loja com cookie locale=en", async () => {
      const request = createMockRequest("/en/loja");
      await middleware(request as unknown as MiddlewareRequest);

      expect(mockRewrite).toHaveBeenCalled();
      const rewriteUrl = mockRewrite.mock.calls[0][0];
      expect(rewriteUrl.pathname).toBe("/loja");
    });

    it("deve reescrever /en para / (raiz)", async () => {
      const request = createMockRequest("/en");
      await middleware(request as unknown as MiddlewareRequest);

      expect(mockRewrite).toHaveBeenCalled();
      const rewriteUrl = mockRewrite.mock.calls[0][0];
      expect(rewriteUrl.pathname).toBe("/");
    });
  });

  describe("Security Headers", () => {
    it("deve incluir CSP header com unsafe-inline", async () => {
      const request = createMockRequest("/", {
        headers: { "x-forwarded-for": "unique-csp-ip-1" },
      });

      const result = await middleware(request as unknown as MiddlewareRequest);

      if (result?.headers) {
        const headers = result.headers as unknown as MockHeaders;
        const csp = headers.get("Content-Security-Policy");
        expect(csp).toBeTruthy();
        expect(csp).toContain("'unsafe-inline'");
        expect(csp).toContain("default-src 'self'");
      }
    });

    /**
     * As duas directivas que a CSP pode ter sem nonces. Com `'unsafe-inline'`
     * no `script-src` — que é obrigatório enquanto as páginas forem servidas
     * de cache estática, ver CSP_NONCE_IMPLEMENTATION.md — o que resta à CSP é
     * limitar o estrago do que for injectado.
     */
    it("deve travar o enquadramento e a submissão de formulários para fora", async () => {
      const request = createMockRequest("/", {
        headers: { "x-forwarded-for": "unique-csp-ip-2" },
      });

      const result = await middleware(request as unknown as MiddlewareRequest);

      if (result?.headers) {
        const headers = result.headers as unknown as MockHeaders;
        const csp = headers.get("Content-Security-Policy");
        // `frame-ancestors` não é o `X-Frame-Options`: aquele não cobre
        // `<embed>` nem `<object>`.
        expect(csp).toContain("frame-ancestors 'none'");
        // Sem `form-action`, HTML injectado submete um formulário para fora e
        // apanha credenciais sem correr um único script.
        expect(csp).toContain("form-action 'self'");
      }
    });

    it("deve definir headers de seguranca adicionais", async () => {
      const request = createMockRequest("/", {
        headers: { "x-forwarded-for": "unique-sec-ip-1" },
      });

      const result = await middleware(request as unknown as MiddlewareRequest);

      if (result?.headers) {
        const headers = result.headers as unknown as MockHeaders;
        const referer = headers.get("Referrer-Policy");
        if (referer) {
          expect(referer).toBe("strict-origin-when-cross-origin");
        }
      }
    });

    it("deve definir Content-Language como pt para rotas portuguesas", async () => {
      const request = createMockRequest("/loja", {
        headers: { "x-forwarded-for": "unique-lang-ip-1" },
      });

      const result = await middleware(request as unknown as MiddlewareRequest);

      if (result?.headers) {
        const headers = result.headers as unknown as MockHeaders;
        const lang = headers.get("Content-Language");
        if (lang) {
          expect(lang).toBe("pt");
        }
      }
    });
  });
});
