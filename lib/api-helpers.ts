import { NextResponse } from "next/server";

// Standard API response format
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

export function apiSuccess<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  const response: ApiResponse<T> = { data };
  if (meta) response.meta = meta;
  return NextResponse.json(response, { status });
}

export function apiError(message: string, status = 500, _context?: string) {
  return NextResponse.json({ error: message } satisfies ApiResponse, { status });
}
