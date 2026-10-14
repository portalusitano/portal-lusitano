import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";
import { resend } from "@/lib/resend";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

const HEALTH_CHECK_TIMEOUT = 3000; // 3 seconds max per service

interface ServiceHealth {
  status: "up" | "down";
  latency_ms?: number;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    stripe: ServiceHealth;
    resend: ServiceHealth;
  };
  version: string;
}

async function checkDatabase(): Promise<ServiceHealth> {
  const startTime = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    const { count, error } = await supabase
      .from("cavalos_venda")
      .select("id", { count: "exact", head: true });

    clearTimeout(timeoutId);

    if (!error && count !== null) {
      const latency = performance.now() - startTime;
      return { status: "up", latency_ms: Math.round(latency) };
    }
    return { status: "down" };
  } catch (error) {
    logger.debug(
      `Database health check failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return { status: "down" };
  }
}

async function checkRedis(): Promise<ServiceHealth> {
  const startTime = performance.now();
  try {
    const redis = Redis.fromEnv();

    // Simple PING command with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    await Promise.race([
      redis.ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), HEALTH_CHECK_TIMEOUT)
      ),
    ]);

    clearTimeout(timeoutId);
    const latency = performance.now() - startTime;
    return { status: "up", latency_ms: Math.round(latency) };
  } catch (error) {
    logger.debug(
      `Redis health check failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return { status: "down" };
  }
}

async function checkStripe(): Promise<ServiceHealth> {
  const startTime = performance.now();
  try {
    // Simple Stripe API call with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    await Promise.race([
      stripe.balance.retrieve(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), HEALTH_CHECK_TIMEOUT)
      ),
    ]);

    clearTimeout(timeoutId);
    const latency = performance.now() - startTime;
    return { status: "up", latency_ms: Math.round(latency) };
  } catch (error) {
    logger.debug(
      `Stripe health check failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return { status: "down" };
  }
}

async function checkResend(): Promise<ServiceHealth> {
  const startTime = performance.now();
  try {
    // Simple Resend API call with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    // Get list of contacts (minimal API call to verify connectivity)
    await Promise.race([
      resend.contacts.list(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), HEALTH_CHECK_TIMEOUT)
      ),
    ]);

    clearTimeout(timeoutId);
    const latency = performance.now() - startTime;
    return { status: "up", latency_ms: Math.round(latency) };
  } catch (error) {
    logger.debug(
      `Resend health check failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return { status: "down" };
  }
}

function getVersion(): string {
  // Try to get version from package.json
  try {
    // At runtime, we'd need to inline this or use env var
    return process.env.APP_VERSION || "0.1.0";
  } catch {
    return "unknown";
  }
}

export async function GET() {
  const timestamp = new Date().toISOString();

  // Run all health checks in parallel with timeout protection
  const [database, redis, stripe_health, resend_health] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkStripe(),
    checkResend(),
  ]);

  const services = {
    database,
    redis,
    stripe: stripe_health,
    resend: resend_health,
  };

  // Determine overall status
  let status: "healthy" | "degraded" | "unhealthy" = "healthy";

  // If database is down, overall status is unhealthy
  if (services.database.status === "down") {
    status = "unhealthy";
  }
  // If any other service is down, overall status is degraded
  else if (Object.values(services).some((svc) => svc.status === "down")) {
    status = "degraded";
  }

  const response: HealthResponse = {
    status,
    timestamp,
    services,
    version: getVersion(),
  };

  return NextResponse.json(response, {
    status: status === "unhealthy" ? 503 : 200,
    headers: {
      // Health endpoint must always reflect live state — never cache
      "Cache-Control": "no-store",
    },
  });
}
