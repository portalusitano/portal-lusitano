import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

interface WebVital {
  name: string;
  value: number;
  rating?: "good" | "needs-improvement" | "poor";
  delta?: number;
  id?: string;
  navigationType?: string;
}

export async function POST(req: NextRequest) {
  try {
    const vital: WebVital = await req.json();

    // Validate required fields
    if (!vital.name || typeof vital.value !== "number") {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    // Log poor vitals for immediate attention
    if (vital.rating === "poor") {
      logger.warn("Poor Web Vital detected", {
        name: vital.name,
        value: Math.round(vital.value),
        rating: vital.rating,
        page: req.headers.get("referer") || "unknown",
        navigationType: vital.navigationType,
      });
    }

    // Log all vitals in development for analysis
    if (process.env.NODE_ENV === "development") {
      logger.debug("Web Vital recorded", {
        name: vital.name,
        value: Math.round(vital.value),
        rating: vital.rating,
        delta: vital.delta ? Math.round(vital.delta) : undefined,
        id: vital.id,
      });
    }

    // Critical vitals thresholds (Google Core Web Vitals)
    const thresholds: Record<string, { good: number; needsImprovement: number }> = {
      LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
      FID: { good: 100, needsImprovement: 300 }, // First Input Delay
      INP: { good: 200, needsImprovement: 500 }, // Interaction to Next Paint
      CLS: { good: 0.1, needsImprovement: 0.25 }, // Cumulative Layout Shift
      TTFB: { good: 800, needsImprovement: 1800 }, // Time to First Byte
      FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
    };

    const threshold = thresholds[vital.name];
    if (threshold && vital.value > threshold.needsImprovement) {
      logger.warn("Critical Web Vital threshold exceeded", {
        metric: vital.name,
        value: Math.round(vital.value),
        threshold: threshold.needsImprovement,
        severity: "critical",
      });
    }

    // Return success
    return NextResponse.json(
      {
        received: true,
        metric: vital.name,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Failed to process Web Vital", {
      error: error instanceof Error ? error.message : "Unknown error",
      body: req.body,
    });

    return NextResponse.json({ error: "Failed to process vitals" }, { status: 400 });
  }
}

// Health check for monitoring
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "web-vitals-analytics",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
