import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser, getOwnedListing } from "@/lib/seller-auth";
import { normalizeListing } from "@/lib/marketplace-listings";
import { fotosDaLinha, validarFotos } from "@/lib/marketplace-fotos";
import { logger } from "@/lib/logger";

/**
 * PUT /api/meus-anuncios/[id]/fotos
 *
 * Replaces the listing's photos with the list the seller sent, in the order
 * they sent it — the first one becomes the cover, which is what shows up in
 * search results and in anything shared.
 *
 * Separate from the PATCH route on purpose: photos are the one field whose
 * values are URLs, and the check that they point at this project's storage is
 * easier to get right, and to read, on its own.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const listing = await getOwnedListing(user, id);
    if (!listing) {
      return NextResponse.json({ error: "Anúncio não encontrado" }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corpo do pedido inválido" }, { status: 400 });
    }

    const resultado = validarFotos(
      body.fotos,
      fotosDaLinha(listing),
      process.env.NEXT_PUBLIC_SUPABASE_URL
    );

    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.erro }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("cavalos_venda")
      .update({
        fotos: resultado.fotos,
        foto_principal: resultado.principal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      logger.error("[meus-anuncios/fotos] Supabase error:", error);
      return NextResponse.json({ error: "Erro ao guardar fotografias" }, { status: 500 });
    }

    return NextResponse.json({ anuncio: normalizeListing(data) });
  } catch (error) {
    logger.error("[meus-anuncios/fotos] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
