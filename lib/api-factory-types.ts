import { NextRequest } from "next/server";
import { ZodSchema } from "zod";
import { AuthContext } from "./api-factory-middleware";

/**
 * Type definitions for API Factory
 */

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Authentication level requirement for a route
 * - 'none': No authentication required (public)
 * - 'user': User session required (logged in)
 * - 'admin': Admin session required (elevated privileges)
 */
export type AuthLevel = "none" | "user" | "admin";

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  requests: number;
  /** Time window in milliseconds */
  window: number;
}

/**
 * ISR (Incremental Static Regeneration) cache configuration
 */
export interface CacheConfig {
  /** Seconds until cache revalidation (0 = no cache, false = cache forever) */
  revalidate: number | false;
}

/**
 * API route factory options
 * Defines behavior for validation, auth, caching, and rate limiting
 */
export interface ApiRouteOptions {
  /** Zod schema for request body/query validation */
  schema?: ZodSchema;
  /** Authentication level requirement */
  auth?: AuthLevel;
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig;
  /** Cache configuration for ISR */
  cache?: CacheConfig;
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * Authentication context passed to handler
 */
export type ApiAuthContext = AuthContext;

/**
 * Request context passed to handler
 * Contains auth state, request parameters, and metadata
 */
export interface ApiContext {
  /** Authentication context */
  auth: ApiAuthContext;
  /** Route/query parameters */
  params: Record<string, string | string[]>;
  /** Query string parameters (same as params for now) */
  query: Record<string, string | string[]>;
  /** Client IP address */
  ip?: string;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Successful API response
 */
export interface ApiSuccessResponse<T = unknown> {
  ok: true;
  data: T;
  timestamp?: number;
}

/**
 * Error API response
 */
export interface ApiErrorResponse {
  ok: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp?: number;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// HANDLER TYPES
// ============================================================================

/**
 * API handler function
 * Can return data (which will be wrapped) or NextResponse (sent as-is)
 *
 * @template T Return type of handler
 *
 * @example
 * ```typescript
 * const handler: ApiHandler<{ id: string }> = async (req, context) => {
 *   return { id: context.params.id };
 * };
 * ```
 */
export type ApiHandler<T = unknown> = (
  req: NextRequest,
  context: ApiContext
) => Promise<T | NextResponse>;

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Custom error thrown within factory middleware
 * Converted to proper HTTP response with status code
 */
export interface ApiFactoryError {
  status: number;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Type guard for API factory errors
 */
export function isApiFactoryError(error: unknown): error is ApiFactoryError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    "message" in error &&
    typeof (error as ApiFactoryError).status === "number" &&
    typeof (error as ApiFactoryError).message === "string"
  );
}

// ============================================================================
// EXPORT COMMONLY USED TYPE COMBINATIONS
// ============================================================================

/**
 * Typed handler for routes without special requirements
 */
export type SimpleApiHandler<T = unknown> = ApiHandler<T>;

/**
 * Typed handler for authenticated routes
 */
export type AuthenticatedApiHandler<T = unknown> = ApiHandler<T>;

/**
 * Typed handler for admin-only routes
 */
export type AdminApiHandler<T = unknown> = ApiHandler<T>;

import { NextResponse } from "next/server";

/**
 * Re-export NextResponse for convenience in handler definitions
 */
export { NextResponse };
