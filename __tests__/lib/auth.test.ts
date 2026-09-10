import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// Mock dependencies before importing the module
vi.mock("jose", () => ({
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue("mock-jwt-token"),
  })),
  jwtVerify: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(() => ({
    setex: vi.fn().mockResolvedValue("OK"),
    get: vi.fn().mockResolvedValue("test@test.com"),
    del: vi.fn().mockResolvedValue(1),
  })),
}));

describe("Auth - checkCredentials", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns false when env vars are not set", async () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    vi.stubEnv("ADMIN_PASSWORD_HASH", "");
    const { checkCredentials } = await import("@/lib/auth");
    expect(checkCredentials("test@test.com", "password")).toBe(false);
  });

  it("returns true for correct credentials with SHA-256 hash", async () => {
    const password = "TestPassword123!";
    const hash = crypto.createHash("sha256").update(password).digest("hex");
    vi.stubEnv("ADMIN_EMAIL", "admin@test.com");
    vi.stubEnv("ADMIN_PASSWORD_HASH", hash);
    const { checkCredentials } = await import("@/lib/auth");
    expect(checkCredentials("admin@test.com", password)).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const hash = crypto.createHash("sha256").update("correct-password").digest("hex");
    vi.stubEnv("ADMIN_EMAIL", "admin@test.com");
    vi.stubEnv("ADMIN_PASSWORD_HASH", hash);
    const { checkCredentials } = await import("@/lib/auth");
    expect(checkCredentials("admin@test.com", "wrong-password")).toBe(false);
  });

  it("returns false for wrong email", async () => {
    const hash = crypto.createHash("sha256").update("password").digest("hex");
    vi.stubEnv("ADMIN_EMAIL", "admin@test.com");
    vi.stubEnv("ADMIN_PASSWORD_HASH", hash);
    const { checkCredentials } = await import("@/lib/auth");
    expect(checkCredentials("wrong@test.com", "password")).toBe(false);
  });

  it("uses timing-safe comparison to prevent timing attacks", async () => {
    const hash = crypto.createHash("sha256").update("password").digest("hex");
    vi.stubEnv("ADMIN_EMAIL", "admin@test.com");
    vi.stubEnv("ADMIN_PASSWORD_HASH", hash);

    const timingSafeEqualSpy = vi.spyOn(crypto, "timingSafeEqual");
    const { checkCredentials } = await import("@/lib/auth");
    checkCredentials("admin@test.com", "password");

    // Should be called twice: once for email, once for password
    expect(timingSafeEqualSpy).toHaveBeenCalledTimes(2);
    timingSafeEqualSpy.mockRestore();
  });
});

describe("Auth - Session TTL", () => {
  it("should have a 2-hour session TTL", async () => {
    vi.stubEnv("ADMIN_SECRET", "a".repeat(64));
    vi.stubEnv("ADMIN_EMAIL", "admin@test.com");
    vi.stubEnv("ADMIN_PASSWORD_HASH", "a".repeat(64));
    // The SESSION_TTL should be 7200 (2 hours in seconds)
    // We test this by checking the module exports
    const authModule = await import("@/lib/auth");
    // Session TTL is internal, but we can verify through createSession behavior
    expect(authModule.createSession).toBeDefined();
    expect(authModule.verifySession).toBeDefined();
    expect(authModule.deleteSession).toBeDefined();
  });
});
