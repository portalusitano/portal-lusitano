import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser, claimListingsByEmail } from "@/lib/seller-auth";
import { normalizeListing, LISTING_STATUS } from "@/lib/marketplace-listings";
import { logger } from "@/lib/logger";

/**
 * GET /api/meus-anuncios
 *
 * Lists every listing owned by the authenticated seller, in any status except
 * the soft-deleted ones, together with the engagement counters the seller area
 * displays (views and saves).
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Pick up listings paid for before the account existed (or under a different
    // checkout email casing) so the seller is never shown an empty page for
    // listings that are genuinely theirs.
    await claimListingsByEmail(user);

    const { data, error } = await supabaseAdmin
      .from("cavalos_venda")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", LISTING_STATUS.REMOVIDO)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("[meus-anuncios/GET] Supabase error:", error);
      return NextResponse.json({ error: "Erro ao carregar anúncios" }, { status: 500 });
    }

    const now = new Date();
    const anuncios = (data || []).map((row) => normalizeListing(row, now));

    // Saves per listing. Counted in one round-trip rather than per listing, and
    // treated as best-effort: a failure here must not hide the listings.
    const favoritosPorAnuncio: Record<string, number> = {};
    if (anuncios.length > 0) {
      const { data: favoritos, error: favoritosError } = await supabaseAdmin
        .from("favoritos")
        .select("item_id")
        .eq("item_type", "cavalo")
        .in(
          "item_id",
          anuncios.map((a) => a.id)
        );

      if (favoritosError) {
        logger.error("[meus-anuncios/GET] Failed to count favoritos:", favoritosError);
      } else {
        for (const favorito of favoritos || []) {
          const id = String(favorito.item_id);
          favoritosPorAnuncio[id] = (favoritosPorAnuncio[id] || 0) + 1;
        }
      }
    }

    return NextResponse.json({
      anuncios: anuncios.map((anuncio) => ({
        ...anuncio,
        favoritos: favoritosPorAnuncio[anuncio.id] || 0,
      })),
      resumo: {
        total: anuncios.length,
        publicados: anuncios.filter((a) => a.publico).length,
        emAprovacao: anuncios.filter((a) => a.status === LISTING_STATUS.PENDING).length,
        vendidos: anuncios.filter((a) => a.status === LISTING_STATUS.VENDIDO).length,
        expirados: anuncios.filter((a) => a.expirado).length,
        totalVisualizacoes: anuncios.reduce((sum, a) => sum + a.views, 0),
      },
    });
  } catch (error) {
    logger.error("[meus-anuncios/GET] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
