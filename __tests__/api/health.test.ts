import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * A rota verifica quatro serviços em paralelo — base de dados, Redis, Stripe e
 * Resend — e o estado global depende de todos. Cada caso monta os quatro
 * explicitamente, porque mockar só um deixava os outros a falhar e o resultado
 * nunca seria "healthy".
 */
function montarDependencias({
  db = { count: 10, error: null },
  redisOk = true,
  stripeOk = true,
  resendOk = true,
}: {
  db?: { count: number | null; error: unknown } | "lanca";
  redisOk?: boolean;
  stripeOk?: boolean;
  resendOk?: boolean;
} = {}) {
  vi.doMock("@/lib/supabase-admin", () => {
    const duplo = {
      from: vi.fn().mockReturnValue({
        select:
          db === "lanca"
            ? vi.fn().mockRejectedValue(new Error("ligação perdida"))
            : vi.fn().mockResolvedValue(db),
      }),
    };
    return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
  });

  vi.doMock("@upstash/redis", () => ({
    Redis: {
      fromEnv: () => ({
        ping: redisOk
          ? vi.fn().mockResolvedValue("PONG")
          : vi.fn().mockRejectedValue(new Error("redis em baixo")),
      }),
    },
  }));

  vi.doMock("@/lib/stripe", () => ({
    stripe: {
      balance: {
        retrieve: stripeOk
          ? vi.fn().mockResolvedValue({})
          : vi.fn().mockRejectedValue(new Error("stripe em baixo")),
      },
    },
  }));

  vi.doMock("@/lib/resend", () => ({
    resend: {
      contacts: {
        list: resendOk
          ? vi.fn().mockResolvedValue({})
          : vi.fn().mockRejectedValue(new Error("resend em baixo")),
      },
    },
  }));
}

async function chamar() {
  const { GET } = await import("@/app/api/health/route");
  const response = await GET();
  return { response, data: await response.json() };
}

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.doUnmock("@/lib/supabase-admin");
    vi.doUnmock("@upstash/redis");
    vi.doUnmock("@/lib/stripe");
    vi.doUnmock("@/lib/resend");
  });

  it("responde healthy com 200 quando os quatro serviços respondem", async () => {
    montarDependencias();
    const { response, data } = await chamar();

    expect(response.status).toBe(200);
    expect(data.status).toBe("healthy");
  });

  it("marca cada serviço individualmente como up", async () => {
    montarDependencias();
    const { data } = await chamar();

    expect(data.services.database.status).toBe("up");
    expect(data.services.redis.status).toBe("up");
    expect(data.services.stripe.status).toBe("up");
    expect(data.services.resend.status).toBe("up");
  });

  it("reporta a latência de cada serviço que responde", async () => {
    montarDependencias();
    const { data } = await chamar();

    expect(typeof data.services.database.latency_ms).toBe("number");
    expect(data.services.database.latency_ms).toBeGreaterThanOrEqual(0);
  });

  it("responde unhealthy com 503 quando a base de dados devolve erro", async () => {
    // Sem base de dados não há marketplace: é falha total, não degradação.
    montarDependencias({ db: { count: null, error: { message: "boom" } } });
    const { response, data } = await chamar();

    expect(response.status).toBe(503);
    expect(data.status).toBe("unhealthy");
    expect(data.services.database.status).toBe("down");
  });

  it("responde unhealthy quando a base de dados lança excepção", async () => {
    montarDependencias({ db: "lanca" });
    const { response, data } = await chamar();

    expect(response.status).toBe(503);
    expect(data.status).toBe("unhealthy");
  });

  it("trata count nulo sem erro como base de dados em baixo", async () => {
    montarDependencias({ db: { count: null, error: null } });
    const { data } = await chamar();

    expect(data.services.database.status).toBe("down");
  });

  it("responde degraded com 200 quando só o Redis está em baixo", async () => {
    // O site continua a servir anúncios sem cache: degradado, não fora de serviço.
    montarDependencias({ redisOk: false });
    const { response, data } = await chamar();

    expect(response.status).toBe(200);
    expect(data.status).toBe("degraded");
    expect(data.services.redis.status).toBe("down");
  });

  it("responde degraded quando o Stripe está em baixo", async () => {
    montarDependencias({ stripeOk: false });
    const { data } = await chamar();

    expect(data.status).toBe("degraded");
    expect(data.services.stripe.status).toBe("down");
  });

  it("responde degraded quando o Resend está em baixo", async () => {
    montarDependencias({ resendOk: false });
    const { data } = await chamar();

    expect(data.status).toBe("degraded");
  });

  it("inclui um timestamp em formato ISO", async () => {
    montarDependencias();
    const { data } = await chamar();

    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(new Date(data.timestamp).toString()).not.toBe("Invalid Date");
  });

  it("inclui a versão da aplicação", async () => {
    montarDependencias();
    const { data } = await chamar();

    expect(typeof data.version).toBe("string");
    expect(data.version.length).toBeGreaterThan(0);
  });
});
