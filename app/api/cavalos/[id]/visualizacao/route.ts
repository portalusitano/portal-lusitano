import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/seller-auth";
import { visitorHash } from "@/lib/visitor-hash";
import { logger } from "@/lib/logger";

/**
 * POST /api/cavalos/[id]/visualizacao
 *
 * Records that someone looked at a listing. Deduplicated to one view per visitor
 * per day inside the database function, so refreshing does not inflate the only
 * return figure the seller gets for a paid listing.
 *
 * The seller's own visits are not counted: a number that goes up every time you
 * check your own advert tells the seller nothing.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { data: cavalo } = await supabaseAdmin
      .from("cavalos_venda")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (!cavalo) {
      return NextResponse.json({ contada: false }, { status: 404 });
    }

    const user = await getAuthenticatedUser();
    if (user && cavalo.user_id && user.id === cavalo.user_id) {
      return NextResponse.json({ contada: false, motivo: "propria" });
    }

    const { data, error } = await supabaseAdmin.rpc("registar_visualizacao_cavalo", {
      p_cavalo_id: id,
      p_visitante_hash: visitorHash(req),
    });

    if (error) {
      // A lost view is not worth failing the page over.
      logger.error("[visualizacao/POST] RPC error:", error);
      return NextResponse.json({ contada: false });
    }

    return NextResponse.json({ contada: data === true });
  } catch (error) {
    logger.error("[visualizacao/POST] Unexpected error:", error);
    return NextResponse.json({ contada: false });
  }
}
