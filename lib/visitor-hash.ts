/**
 * Privacy-preserving visitor fingerprint, used only to deduplicate listing views.
 *
 * The raw IP address never leaves this module and is never stored. What reaches
 * the database is an HMAC of the IP and user-agent salted with the current date,
 * so the same visitor produces a different value tomorrow and cannot be followed
 * across days — which is all the deduplication window needs.
 */

import crypto from "crypto";
import type { NextRequest } from "next/server";

/**
 * Client IP as seen through the proxy chain.
 *
 * Takes the first entry of `x-forwarded-for`, which is the original client;
 * later entries are proxies. Falls back to `x-real-ip`.
 */
function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "desconhecido";
}

/**
 * Builds the daily visitor hash for a request.
 *
 * @param req the incoming request
 * @param now injectable for tests
 */
export function visitorHash(req: NextRequest, now: Date = new Date()): string {
  // Reuses the same secret as the other HMACs in the project. Without it the
  // hash would be guessable from an IP, which would make the stored value
  // reversible by anyone who could read the table.
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.ADMIN_SECRET || "";

  const dia = now.toISOString().slice(0, 10);
  const material = `${clientIp(req)}|${req.headers.get("user-agent") || ""}|${dia}`;

  return crypto
    .createHmac("sha256", secret || dia)
    .update(material)
    .digest("hex")
    .slice(0, 32);
}
