import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/seller-auth";
import { validarMensagem, nomeOutraParte, type ChatMensagem } from "@/lib/marketplace-chat";
import { logger } from "@/lib/logger";
import type { User } from "@supabase/supabase-js";

/**
 * Loads a conversation only when the user is one of its two participants.
 *
 * Every read and write in this file goes through here, so a conversation id
 * guessed or copied from elsewhere is invisible to anyone else.
 */
async function conversaDoUtilizador(user: User, conversaId: string) {
  const { data, error } = await supabaseAdmin
    .from("marketplace_conversas")
    .select("*")
    .eq("id", conversaId)
    .or(`comprador_id.eq.${user.id},vendedor_id.eq.${user.id}`)
    .maybeSingle();

  if (error) {
    logger.error("[conversas/[id]] Failed to load conversation:", error);
    return null;
  }

  return data ?? null;
}

/**
 * GET /api/conversas/[id]
 *
 * The full thread. Opening it marks the counterpart's messages as read, which is
 * what clears the unread badge in the inbox.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const conversa = await conversaDoUtilizador(user, id);
    if (!conversa) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

    const { data: mensagens, error } = await supabaseAdmin
      .from("marketplace_mensagens")
      .select("id, corpo, remetente_id, lida_at, created_at")
      .eq("conversa_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error("[conversas/[id]/GET] Failed to load messages:", error);
      return NextResponse.json({ error: "Erro ao carregar mensagens" }, { status: 500 });
    }

    // Best-effort: failing to mark as read must not stop the thread rendering.
    const { error: lidasError } = await supabaseAdmin
      .from("marketplace_mensagens")
      .update({ lida_at: new Date().toISOString() })
      .eq("conversa_id", id)
      .neq("remetente_id", user.id)
      .is("lida_at", null);

    if (lidasError) {
      logger.error("[conversas/[id]/GET] Failed to mark as read:", lidasError);
    }

    const papel = conversa.comprador_id === user.id ? "comprador" : "vendedor";

    const { data: cavalo } = await supabaseAdmin
      .from("cavalos_venda")
      .select("id, nome, nome_cavalo, foto_principal, image_url, preco, status, vendedor_nome")
      .eq("id", conversa.cavalo_id)
      .maybeSingle();

    const linhas: ChatMensagem[] = (mensagens || []).map((m) => ({
      id: m.id,
      corpo: m.corpo,
      createdAt: m.created_at,
      minha: m.remetente_id === user.id,
      lida: Boolean(m.lida_at),
    }));

    return NextResponse.json({
      conversa: {
        id: conversa.id,
        cavaloId: conversa.cavalo_id,
        papel,
        outraParte: nomeOutraParte(papel, conversa.comprador_nome, cavalo?.vendedor_nome || null),
        cavaloNome: cavalo?.nome || cavalo?.nome_cavalo || "Anúncio removido",
        cavaloFoto: cavalo?.foto_principal || cavalo?.image_url || null,
        cavaloPreco: typeof cavalo?.preco === "number" ? cavalo.preco : null,
        cavaloStatus: cavalo?.status || null,
      },
      mensagens: linhas,
    });
  } catch (error) {
    logger.error("[conversas/[id]/GET] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/**
 * POST /api/conversas/[id]
 *
 * Replies in an existing thread. Unlike opening one, this stays available after
 * the listing is sold or withdrawn: an ongoing negotiation should not be cut off
 * the moment the seller updates the listing.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const conversa = await conversaDoUtilizador(user, id);
    if (!conversa) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corpo do pedido inválido" }, { status: 400 });
    }

    const validada = validarMensagem(body.mensagem);
    if ("erro" in validada) {
      return NextResponse.json({ error: validada.erro }, { status: 400 });
    }

    const { data: mensagem, error } = await supabaseAdmin
      .from("marketplace_mensagens")
      .insert({
        conversa_id: id,
        remetente_id: user.id,
        corpo: validada.corpo,
      })
      .select("id, corpo, remetente_id, lida_at, created_at")
      .single();

    if (error || !mensagem) {
      logger.error("[conversas/[id]/POST] Failed to insert message:", error);
      return NextResponse.json({ error: "Erro ao enviar mensagem" }, { status: 500 });
    }

    // Reopen the thread for whoever archived it: a new message should surface
    // again in both inboxes.
    await supabaseAdmin
      .from("marketplace_conversas")
      .update({
        ultima_mensagem_at: new Date().toISOString(),
        arquivada_comprador: false,
        arquivada_vendedor: false,
      })
      .eq("id", id);

    return NextResponse.json(
      {
        mensagem: {
          id: mensagem.id,
          corpo: mensagem.corpo,
          createdAt: mensagem.created_at,
          minha: true,
          lida: false,
        } satisfies ChatMensagem,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("[conversas/[id]/POST] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
