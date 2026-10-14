/**
 * Sanitize user input for use in PostgREST .or() filter strings.
 * Only allows letters (including accented), numbers, spaces, and hyphens.
 * Strips all special characters that could be used in injection attacks.
 */
export function sanitizeSearchInput(input: string): string {
  return input
    .replace(/[^a-zA-ZÀ-ÿ0-9\s\-]/g, "")
    .trim()
    .substring(0, 100);
}

/**
 * Escape the LIKE wildcards `%` and `_` so a value is matched literally by
 * PostgREST's `like`/`ilike` filters.
 *
 * Without this, a value such as `a_b@example.com` would also match
 * `axb@example.com`, letting one user's identifier select another user's rows.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Escape HTML special characters to prevent XSS in email templates.
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

import crypto from "crypto";

/**
 * Generate HMAC-SHA256 token for secure unsubscribe links.
 * Uses UNSUBSCRIBE_SECRET env var (falls back to ADMIN_SECRET).
 */
export function generateUnsubscribeToken(email: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error("UNSUBSCRIBE_SECRET or ADMIN_SECRET environment variable is required");
  }
  return crypto.createHmac("sha256", secret).update(email.toLowerCase().trim()).digest("hex");
}

/**
 * Verify HMAC token for unsubscribe requests.
 */
export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = generateUnsubscribeToken(email);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
