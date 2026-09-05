import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser, getOwnedListing } from "@/lib/seller-auth";
import {
  LISTING_STATUS,
  canSellerTransition,
  isExpired,
  normalizeListing,
  type ListingStatus,
} from "@/lib/marketplace-listings";
import { logger } from "@/lib/logger";

/** Upper bound on a listing price, in euros. Guards against overflow and typos. */
const MAX_PRECO = 100_000_000;

const MAX_LENGTHS: Record<string, number> = {
  descricao: 5000,
  localizacao: 255,
  regiao: 100,
  vendedor_nome: 255,
  vendedor_telefone: 50,
  vendedor_whatsapp: 50,
  video_url: 500,
};

const BOOLEAN_FIELDS = [
  "preco_negociavel",
  "preco_sob_consulta",
  "aceita_troca",
  "transporte_incluido",
] as const;

const TEXT_FIELDS = [
  "descricao",
  "localizacao",
  "regiao",
  "vendedor_nome",
  "vendedor_telefone",
  "vendedor_whatsapp",
] as const;

/**
 * Validates the seller-supplied patch and returns only the columns that may be
 * written. Anything not explicitly handled here is dropped, so a crafted body
 * cannot reach `status`, `destaque`, `verificado`, `user_id` or the tier columns.
 */
function buildUpdates(body: Record<string, unknown>): {
  updates: Record<string, unknown>;
  errors: string[];
} {
  const updates: Record<string, unknown> = {};
  const errors: string[] = [];

  if ("preco" in body && body.preco !== undefined) {
    if (body.preco === null || body.preco === "") {
      updates.preco = null;
    } else {
      const preco = Number(body.preco);
      if (!Number.isFinite(preco) || preco < 0 || preco > MAX_PRECO) {
        errors.push("Preço inválido");
      } else {
        updates.preco = preco;
      }
    }
  }

  for (const field of BOOLEAN_FIELDS) {
    if (field in body && body[field] !== undefined) {
      if (typeof body[field] !== "boolean") {
        errors.push(`Campo ${field} tem de ser verdadeiro ou falso`);
      } else {
        updates[field] = body[field];
      }
    }
  }

  for (const field of TEXT_FIELDS) {
    if (field in body && body[field] !== undefined) {
      const value = body[field];
      if (value === null || value === "") {
        updates[field] = null;
        continue;
      }
      if (typeof value !== "string") {
        errors.push(`Campo ${field} inválido`);
        continue;
      }
      updates[field] = value.trim().slice(0, MAX_LENGTHS[field]);
    }
  }

  if ("video_url" in body && body.video_url !== undefined) {
    const value = body.video_url;
    if (value === null || value === "") {
      updates.video_url = null;
    } else if (typeof value !== "string") {
      errors.push("URL de vídeo inválido");
    } else {
      const trimmed = value.trim().slice(0, MAX_LENGTHS.video_url);
      // Only http(s): a javascript: or data: URL here would be rendered as a
      // link on the public listing page.
      let parsed: URL | null = null;
      try {
        parsed = new URL(trimmed);
      } catch {
        parsed = null;
      }
      if (!parsed || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) {
        errors.push("URL de vídeo tem de começar por http:// ou https://");
      } else {
        updates.video_url = trimmed;
      }
    }
  }

  return { updates, errors };
}

/**
 * PATCH /api/meus-anuncios/[id]
 *
 * Edits the seller-controlled fields of one listing and/or moves it between the
 * statuses a seller may set (reservado, vendido, pausado, republicado).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { updates, errors } = buildUpdates(body);

    if ("status" in body && body.status !== undefined) {
      const proximoStatus = String(body.status) as ListingStatus;
      const statusAtual = String(listing.status || LISTING_STATUS.PENDING);
      const expirado = isExpired(
        typeof listing.listing_expires_at === "string" ? listing.listing_expires_at : null
      );

      if (!canSellerTransition(statusAtual, proximoStatus, { expirado })) {
        return NextResponse.json(
          {
            error: expirado
              ? "O anúncio expirou. Publique um novo anúncio para voltar ao marketplace."
              : "Alteração de estado não permitida",
          },
          { status: 409 }
        );
      }

      updates.status = proximoStatus;
      // Stamped once, on the transition itself — republishing later clears it so
      // the sale date always refers to the current listing cycle.
      updates.vendido_at =
        proximoStatus === LISTING_STATUS.VENDIDO ? new Date().toISOString() : null;
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(". ") }, { status: 400 });
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("cavalos_venda")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      logger.error("[meus-anuncios/PATCH] Supabase error:", error);
      return NextResponse.json({ error: "Erro ao actualizar anúncio" }, { status: 500 });
    }

    return NextResponse.json({ anuncio: normalizeListing(data) });
  } catch (error) {
    logger.error("[meus-anuncios/PATCH] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/**
 * DELETE /api/meus-anuncios/[id]
 *
 * Removes the listing from the seller's list and from the marketplace. The row
 * is kept (status = 'removido') because payments and admin reports reference it.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { error } = await supabaseAdmin
      .from("cavalos_venda")
      .update({
        status: LISTING_STATUS.REMOVIDO,
        removido_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      logger.error("[meus-anuncios/DELETE] Supabase error:", error);
      return NextResponse.json({ error: "Erro ao remover anúncio" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[meus-anuncios/DELETE] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
