import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/seller-auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/conversas/por-ler
 *
 * Just the number of unread messages, for the badge in the navigation.
 *
 * `GET /api/conversas` already returns this total, but it loads every message
 * of every conversation to do it. The badge is polled from every page, so it
 * gets a query that counts instead of one that reads.
 *
 * Answers 0 rather than 401 when nobody is signed in: an anonymous visitor has
 * no unread messages, and the navigation should not have to special-case that.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ porLer: 0 });
    }

    const { data: conversas, error: erroConversas } = await supabaseAdmin
      .from("marketplace_conversas")
      .select("id")
      .or(`comprador_id.eq.${user.id},vendedor_id.eq.${user.id}`);

    if (erroConversas) {
      logger.error("[conversas/por-ler] Failed to load conversations:", erroConversas);
      return NextResponse.json({ error: "Erro ao contar mensagens" }, { status: 500 });
    }

    const ids = (conversas || []).map((c) => c.id);
    if (ids.length === 0) {
      return NextResponse.json({ porLer: 0 });
    }

    const { count, error } = await supabaseAdmin
      .from("marketplace_mensagens")
      .select("id", { count: "exact", head: true })
      .in("conversa_id", ids)
      .is("lida_at", null)
      // As próprias mensagens do utilizador nunca contam como por ler.
      .neq("remetente_id", user.id);

    if (error) {
      logger.error("[conversas/por-ler] Failed to count messages:", error);
      return NextResponse.json({ error: "Erro ao contar mensagens" }, { status: 500 });
    }

    return NextResponse.json({ porLer: count ?? 0 });
  } catch (error) {
    logger.error("[conversas/por-ler] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
