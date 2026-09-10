import { describe, it, expect } from "vitest";
import rateLimit from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("should allow requests under the limit", async () => {
    const limiter = rateLimit({
      interval: 60000,
      uniqueTokenPerInterval: 500,
    });

    // First request should succeed
    await expect(limiter.check(5, "user1")).resolves.toBeUndefined();

    // Second request should succeed
    await expect(limiter.check(5, "user1")).resolves.toBeUndefined();

    // Third request should succeed
    await expect(limiter.check(5, "user1")).resolves.toBeUndefined();
  });

  it("should reject requests over the limit", async () => {
    const limiter = rateLimit({
      interval: 60000,
      uniqueTokenPerInterval: 500,
    });

    // Make requests up to the limit
    await limiter.check(3, "user2");
    await limiter.check(3, "user2");

    // Third request should be rejected (limit is 3, and we're at it)
    await expect(limiter.check(3, "user2")).rejects.toThrow("Rate limit exceeded");
  });

  it("should track different tokens separately", async () => {
    const limiter = rateLimit({
      interval: 60000,
      uniqueTokenPerInterval: 500,
    });

    // User 1 uses up their limit
    await limiter.check(2, "userA");
    await expect(limiter.check(2, "userA")).rejects.toThrow();

    // User 2 should still be able to make requests
    await expect(limiter.check(2, "userB")).resolves.toBeUndefined();
  });

  it("should include rate limit info in error message", async () => {
    const limiter = rateLimit({
      interval: 60000, // 1 minute
      uniqueTokenPerInterval: 500,
    });

    // Use up the limit (limit is 2, so first succeeds, second fails)
    await limiter.check(2, "userD");

    // Verify error message contains expected information
    try {
      await limiter.check(2, "userD");
      expect.fail("Should have thrown");
    } catch (error) {
      expect((error as Error).message).toContain("Rate limit exceeded");
      expect((error as Error).message).toContain("Maximum 2 requests");
    }
  });

  it("should handle high concurrency", async () => {
    const limiter = rateLimit({
      interval: 60000,
      uniqueTokenPerInterval: 1000,
    });

    const limit = 10;
    const promises: Promise<void>[] = [];

    // Make many concurrent requests
    for (let i = 0; i < limit - 1; i++) {
      promises.push(limiter.check(limit, "concurrent"));
    }

    // All should succeed
    await expect(Promise.all(promises)).resolves.toBeDefined();
  });
});

/**
 * ── A capacidade do cache é uma defesa, e por isso tem teste ────────────────
 *
 * O `uniqueTokenPerInterval` é o `max` de um `LRUCache`: passada a capacidade, o
 * LRU deita fora a entrada menos usada, e a entrada que se deita fora é a
 * contagem de alguém. Quem a perde volta ao orçamento inteiro **sem o tempo
 * passar**.
 *
 * O `strictLimiter` — o que segura o `MAX_CONVERSAS_NOVAS_POR_MINUTO` do chat,
 * os envios de fotografia de perfil e as denúncias — estava a 100. Cem chaves
 * por minuto não é um ataque: é um site com cem pessoas a usá-lo.
 *
 * O primeiro teste mostra o mecanismo com um cache pequeno de propósito, que é
 * a reprodução do defeito. O segundo mostra que à capacidade a que os
 * limitadores estão agora isso não acontece.
 */
describe("a capacidade do cache não pode apagar uma contagem", () => {
  it("com capacidade pequena, as chaves de outros devolvem o orçamento (o defeito)", async () => {
    const pequeno = rateLimit({ interval: 60000, uniqueTokenPerInterval: 10 });

    await pequeno.check(3, "eu");
    await pequeno.check(3, "eu");
    await expect(pequeno.check(3, "eu")).rejects.toThrow();

    for (let i = 0; i < 10; i++) await pequeno.check(3, `outro-${i}`);

    // A minha contagem foi deitada fora: o orçamento voltou do nada.
    await expect(pequeno.check(3, "eu")).resolves.toBeUndefined();
  });

  it("à capacidade a que os limitadores estão, não devolve", async () => {
    const { strictLimiter } = await import("@/lib/rate-limit");

    await strictLimiter.check(3, "capacidade:eu");
    await strictLimiter.check(3, "capacidade:eu");
    await expect(strictLimiter.check(3, "capacidade:eu")).rejects.toThrow();

    // Mil chaves diferentes — dez vezes a capacidade que o strictLimiter tinha.
    for (let i = 0; i < 1000; i++) await strictLimiter.check(3, `capacidade:outro-${i}`);

    await expect(strictLimiter.check(3, "capacidade:eu")).rejects.toThrow();
  });
});
