import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/seller-auth";
import {
  validarMensagem,
  resumirMensagem,
  nomeOutraParte,
  type ChatConversa,
} from "@/lib/marketplace-chat";
import { LISTING_STATUS } from "@/lib/marketplace-listings";
import { logger } from "@/lib/logger";

/** Display name for the authenticated user, used when opening a conversation. */
function nomeDoUtilizador(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  const meta = user.user_metadata || {};
  const completo = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  if (completo) return completo.slice(0, 120);
  // Local part of the email, never the address itself — the counterpart should
  // not receive a contact the person did not choose to share.
  return (user.email?.split("@")[0] || "Utilizador").slice(0, 120);
}

/**
 * GET /api/conversas
 *
 * The authenticated user's inbox, covering both roles: conversations where they
 * are buying and conversations about listings they are selling.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: conversas, error } = await supabaseAdmin
      .from("marketplace_conversas")
      .select("*")
      .or(`comprador_id.eq.${user.id},vendedor_id.eq.${user.id}`)
      .order("ultima_mensagem_at", { ascending: false });

    if (error) {
      logger.error("[conversas/GET] Supabase error:", error);
      return NextResponse.json({ error: "Erro ao carregar mensagens" }, { status: 500 });
    }

    if (!conversas || conversas.length === 0) {
      return NextResponse.json({ conversas: [], porLer: 0 });
    }

    // Listings and messages are fetched separately rather than through an
    // embedded select: PostgREST relationship embedding depends on its schema
    // cache, and this codebase has been bitten by that before.
    const cavaloIds = [...new Set(conversas.map((c) => c.cavalo_id))];
    const conversaIds = conversas.map((c) => c.id);

    const [{ data: cavalos }, { data: mensagens }] = await Promise.all([
      supabaseAdmin
        .from("cavalos_venda")
        .select("id, nome, nome_cavalo, foto_principal, image_url, preco, vendedor_nome")
        .in("id", cavaloIds),
      supabaseAdmin
        .from("marketplace_mensagens")
        .select("conversa_id, corpo, remetente_id, lida_at, created_at")
        .in("conversa_id", conversaIds)
        .order("created_at", { ascending: true }),
    ]);

    const porCavalo = new Map((cavalos || []).map((c) => [c.id, c]));

    // One pass over the messages builds both the preview and the unread count.
    const ultimaPorConversa = new Map<string, string>();
    const porLerPorConversa = new Map<string, number>();
    for (const m of mensagens || []) {
      ultimaPorConversa.set(m.conversa_id, m.corpo);
      if (m.remetente_id !== user.id && !m.lida_at) {
        porLerPorConversa.set(m.conversa_id, (porLerPorConversa.get(m.conversa_id) || 0) + 1);
      }
    }

    const resultado: ChatConversa[] = conversas.map((c) => {
      const papel = c.comprador_id === user.id ? "comprador" : "vendedor";
      const cavalo = porCavalo.get(c.cavalo_id) as Record<string, unknown> | undefined;

      return {
        id: c.id,
        cavaloId: c.cavalo_id,
        papel,
        outraParte: nomeOutraParte(
          papel,
          c.comprador_nome,
          (cavalo?.vendedor_nome as string) || null
        ),
        cavaloNome:
          (cavalo?.nome as string) || (cavalo?.nome_cavalo as string) || "Anúncio removido",
        cavaloFoto: (cavalo?.foto_principal as string) || (cavalo?.image_url as string) || null,
        cavaloPreco: typeof cavalo?.preco === "number" ? cavalo.preco : null,
        ultimaMensagem: resumirMensagem(ultimaPorConversa.get(c.id)),
        ultimaMensagemAt: c.ultima_mensagem_at,
        porLer: porLerPorConversa.get(c.id) || 0,
        arquivada: papel === "comprador" ? c.arquivada_comprador : c.arquivada_vendedor,
      };
    });

    return NextResponse.json({
      conversas: resultado,
      porLer: resultado.reduce((total, c) => total + c.porLer, 0),
    });
  } catch (error) {
    logger.error("[conversas/GET] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/**
 * POST /api/conversas
 *
 * Opens the conversation about a listing and posts the first message. Contacting
 * the same listing again reuses the existing thread rather than starting a new
 * one, so the seller sees one continuous conversation per interested buyer.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corpo do pedido inválido" }, { status: 400 });
    }

    const cavaloId = typeof body.cavaloId === "string" ? body.cavaloId : null;
    if (!cavaloId) {
      return NextResponse.json({ error: "Anúncio não indicado" }, { status: 400 });
    }

    const validada = validarMensagem(body.mensagem);
    if ("erro" in validada) {
      return NextResponse.json({ error: validada.erro }, { status: 400 });
    }

    const { data: cavalo, error: cavaloError } = await supabaseAdmin
      .from("cavalos_venda")
      .select("id, user_id, status, nome")
      .eq("id", cavaloId)
      .maybeSingle();

    if (cavaloError) {
      logger.error("[conversas/POST] Failed to load listing:", cavaloError);
      return NextResponse.json({ error: "Erro ao abrir conversa" }, { status: 500 });
    }

    if (!cavalo) {
      return NextResponse.json({ error: "Anúncio não encontrado" }, { status: 404 });
    }

    // Only listings the public can see accept new conversations. An existing
    // thread stays usable after the listing is sold — see the [id] route.
    if (cavalo.status !== LISTING_STATUS.ACTIVE && cavalo.status !== LISTING_STATUS.RESERVADO) {
      return NextResponse.json({ error: "Este anúncio já não está disponível" }, { status: 409 });
    }

    if (!cavalo.user_id) {
      return NextResponse.json(
        { error: "Este anúncio não tem mensagens no portal. Use os contactos indicados." },
        { status: 409 }
      );
    }

    if (cavalo.user_id === user.id) {
      return NextResponse.json({ error: "Este anúncio é seu" }, { status: 409 });
    }

    // Reuse the thread when it exists. The unique constraint on
    // (cavalo_id, comprador_id) is what actually guarantees this under a race.
    const { data: existente } = await supabaseAdmin
      .from("marketplace_conversas")
      .select("id")
      .eq("cavalo_id", cavaloId)
      .eq("comprador_id", user.id)
      .maybeSingle();

    let conversaId = existente?.id as string | undefined;

    if (!conversaId) {
      const { data: criada, error: criarError } = await supabaseAdmin
        .from("marketplace_conversas")
        .insert({
          cavalo_id: cavaloId,
          comprador_id: user.id,
          vendedor_id: cavalo.user_id,
          comprador_nome: nomeDoUtilizador(user),
        })
        .select("id")
        .single();

      if (criarError || !criada) {
        // Another request opened the same thread between the check and the
        // insert; fall back to that one instead of failing the send.
        const { data: corrida } = await supabaseAdmin
          .from("marketplace_conversas")
          .select("id")
          .eq("cavalo_id", cavaloId)
          .eq("comprador_id", user.id)
          .maybeSingle();

        if (!corrida) {
          logger.error("[conversas/POST] Failed to create conversation:", criarError);
          return NextResponse.json({ error: "Erro ao abrir conversa" }, { status: 500 });
        }
        conversaId = corrida.id;
      } else {
        conversaId = criada.id;
      }
    }

    const { error: mensagemError } = await supabaseAdmin.from("marketplace_mensagens").insert({
      conversa_id: conversaId,
      remetente_id: user.id,
      corpo: validada.corpo,
    });

    if (mensagemError) {
      logger.error("[conversas/POST] Failed to insert message:", mensagemError);
      return NextResponse.json({ error: "Erro ao enviar mensagem" }, { status: 500 });
    }

    await supabaseAdmin
      .from("marketplace_conversas")
      .update({ ultima_mensagem_at: new Date().toISOString() })
      .eq("id", conversaId);

    return NextResponse.json({ conversaId }, { status: 201 });
  } catch (error) {
    logger.error("[conversas/POST] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
