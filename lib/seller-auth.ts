/**
 * Authentication and ownership helpers for the seller area ("Os meus anúncios").
 *
 * Unlike `profissional-auth`, being a seller is not a role: any authenticated
 * user who has paid for a listing owns it. Ownership therefore lives on the
 * listing row (`cavalos_venda.user_id`), not on the account.
 */

import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { escapeLikePattern } from "@/lib/sanitize";
import { logger } from "@/lib/logger";

/** Returns the authenticated user, or null when there is no valid session. */
export async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

/**
 * Attaches unclaimed listings to the user when the Stripe checkout email matches
 * their account email.
 *
 * Listings are created by the Stripe webhook, which has no session — so a seller
 * who paid before signing up, or who signed up afterwards, would otherwise never
 * see their own listing. The migration backfills what existed at deploy time;
 * this covers everything created since.
 *
 * Only rows with `user_id IS NULL` are touched, so a listing already owned by
 * another account can never be reassigned.
 *
 * @returns the number of listings newly claimed
 */
export async function claimListingsByEmail(user: User): Promise<number> {
  if (!user.email) return 0;

  // Two steps on purpose. `ilike` narrows the scan cheaply, but PostgREST also
  // rewrites `*` into a `%` wildcard and that rewrite cannot be escaped — so the
  // pattern is only ever a filter, never the authority on who owns a listing.
  // The exact comparison below is what actually decides.
  const { data: candidatos, error: selectError } = await supabaseAdmin
    .from("cavalos_venda")
    .select("id, vendedor_email")
    .is("user_id", null)
    .ilike("vendedor_email", escapeLikePattern(user.email));

  if (selectError) {
    // A failed claim is not fatal — the seller still sees everything already
    // linked to their account, so log and carry on rather than failing the page.
    logger.error("[seller-auth] Failed to look up unclaimed listings:", selectError);
    return 0;
  }

  const alvo = user.email.trim().toLowerCase();
  const ids = (candidatos || [])
    .filter(
      (row) =>
        typeof row.vendedor_email === "string" && row.vendedor_email.trim().toLowerCase() === alvo
    )
    .map((row) => row.id);

  if (ids.length === 0) return 0;

  const { data, error } = await supabaseAdmin
    .from("cavalos_venda")
    .update({ user_id: user.id })
    .is("user_id", null)
    .in("id", ids)
    .select("id");

  if (error) {
    logger.error("[seller-auth] Failed to claim listings by email:", error);
    return 0;
  }

  return data?.length ?? 0;
}

/**
 * Loads a single listing only if it belongs to the given user.
 *
 * Every mutation route funnels through this, so an id guessed or scraped from
 * the public marketplace cannot be edited by anyone but its owner.
 */
export async function getOwnedListing(
  user: User,
  listingId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabaseAdmin
    .from("cavalos_venda")
    .select("*")
    .eq("id", listingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    logger.error("[seller-auth] Failed to load owned listing:", error);
    return null;
  }

  return data ?? null;
}
