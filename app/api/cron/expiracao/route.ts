import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail } from "@/lib/resend";
import { escapeHtml } from "@/lib/sanitize";
import { avisoDevido, descreverAviso, type LimiarAviso } from "@/lib/expiracao-anuncios";
import { LISTING_STATUS, daysUntil } from "@/lib/marketplace-listings";
import { logger } from "@/lib/logger";

/** Listings inspected per run, to keep one invocation inside its time budget. */
const MAX_ANUNCIOS_POR_EXECUCAO = 200;

interface LinhaAnuncio {
  id: string;
  nome: string | null;
  status: string | null;
  user_id: string | null;
  // A coluna chama-se `vendedor_email`. Estava aqui como `contacto_email`, que
  // a tabela não tem — e pedir uma coluna inexistente ao PostgREST faz a
  // consulta INTEIRA devolver `null`, não a linha sem essa coluna. Logo este
  // cron nunca enviou um único aviso de expiração.
  vendedor_email: string | null;
  listing_expires_at: string | null;
  aviso_expiracao_dias: number | null;
  aviso_expiracao_prazo: string | null;
}

function corpoEmail(limiar: LimiarAviso, nome: string, anuncioId: string, baseUrl: string): string {
  const { titulo, corpo } = descreverAviso(limiar, nome);

  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <p style="color:#c5a059;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;margin:0 0 8px;">Portal Lusitano</p>
      <h1 style="font-size:22px;margin:0 0 16px;color:#111;">${escapeHtml(titulo)}</h1>
      <p style="font-size:15px;line-height:1.6;color:#333;margin:0 0 24px;">${escapeHtml(corpo)}</p>
      <p style="margin:0 0 24px;">
        <a href="${baseUrl}/minha-conta/anuncios" style="display:inline-block;background:#c5a059;color:#000;text-decoration:none;padding:12px 24px;font-size:13px;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;">Gerir os meus anúncios</a>
      </p>
      <p style="font-size:13px;line-height:1.6;color:#555;margin:0 0 24px;">
        Se o cavalo já foi vendido, marque o anúncio como vendido — assim deixa de receber estes avisos.
        <a href="${baseUrl}/comprar/${encodeURIComponent(anuncioId)}" style="color:#c5a059;">Ver o anúncio</a>
      </p>
      <p style="font-size:11px;color:#888;border-top:1px solid #eee;padding-top:16px;margin:0;">
        Recebe este email porque tem um anúncio publicado no Portal Lusitano.
      </p>
    </div>`;
}

/**
 * Resolves the seller's address: the account's email when the listing has been
 * claimed, and the contact address on the listing otherwise. Listings created
 * before accounts existed only have the latter.
 */
async function emailDoVendedor(linha: LinhaAnuncio): Promise<string | null> {
  if (linha.user_id) {
    const { data } = await supabaseAdmin.auth.admin.getUserById(linha.user_id);
    if (data?.user?.email) return data.user.email;
  }
  return linha.vendedor_email || null;
}

/**
 * GET /api/cron/expiracao
 *
 * Warns sellers before their paid listing period runs out — seven days out,
 * the day before, and on the day itself. Until this existed the listing simply
 * stopped appearing and the seller found out by noticing the silence.
 *
 * Each threshold is sent once per paid period; renewing a listing moves the
 * deadline and starts the cycle again.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("[cron/expiracao] CRON_SECRET env var is not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const expected = `Bearer ${cronSecret}`;
  const authBuffer = Buffer.from(authHeader || "");
  const expectedBuffer = Buffer.from(expected);
  if (
    authBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(authBuffer, expectedBuffer)
  ) {
    logger.warn("[cron/expiracao] Unauthorized cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://portal-lusitano.pt";
  const agora = new Date();

  let avisados = 0;
  let semAviso = 0;
  let semDestinatario = 0;
  let falhados = 0;

  try {
    const { data: linhas, error } = await supabaseAdmin
      .from("cavalos_venda")
      .select(
        "id, nome, status, user_id, vendedor_email, listing_expires_at, aviso_expiracao_dias, aviso_expiracao_prazo"
      )
      .in("status", [LISTING_STATUS.ACTIVE, LISTING_STATUS.RESERVADO])
      .not("listing_expires_at", "is", null)
      .order("listing_expires_at", { ascending: true })
      .limit(MAX_ANUNCIOS_POR_EXECUCAO);

    if (error) {
      logger.error("[cron/expiracao] Failed to load listings:", error);
      return NextResponse.json({ error: "Erro ao carregar anúncios" }, { status: 500 });
    }

    for (const linha of (linhas || []) as LinhaAnuncio[]) {
      const limiar = avisoDevido(
        daysUntil(linha.listing_expires_at, agora),
        linha.listing_expires_at,
        {
          limiar: linha.aviso_expiracao_dias,
          prazo: linha.aviso_expiracao_prazo,
        }
      );

      if (limiar === null) {
        semAviso++;
        continue;
      }

      try {
        const email = await emailDoVendedor(linha);
        if (!email) {
          semDestinatario++;
          logger.warn("[cron/expiracao] Listing with no reachable seller:", linha.id);
          continue;
        }

        const nome = linha.nome || "o seu cavalo";

        await sendEmail({
          to: email,
          subject: descreverAviso(limiar, nome).assunto,
          html: corpoEmail(limiar, nome, linha.id, baseUrl),
          template: "expiracao-anuncio",
        });

        // Only record the warning once it actually went out; a failed send has
        // to be retried on the next run rather than silently swallowed.
        await supabaseAdmin
          .from("cavalos_venda")
          .update({
            aviso_expiracao_dias: limiar,
            aviso_expiracao_prazo: linha.listing_expires_at,
            aviso_expiracao_at: agora.toISOString(),
          })
          .eq("id", linha.id);

        avisados++;
      } catch (e) {
        falhados++;
        logger.error(`[cron/expiracao] Failed to warn about listing ${linha.id}:`, e);
      }
    }

    return NextResponse.json({ avisados, semAviso, semDestinatario, falhados });
  } catch (error) {
    logger.error("[cron/expiracao] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
