import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail } from "@/lib/resend";
import { escapeHtml } from "@/lib/sanitize";
import {
  aplicarCriterios,
  alertaEmAtraso,
  descreverAlerta,
  normalizarAlerta,
  type Alerta,
  type CriteriosQuery,
} from "@/lib/marketplace-alertas";
import { LISTING_STATUS } from "@/lib/marketplace-listings";
import { logger } from "@/lib/logger";

/** Alerts processed per run, to keep one invocation inside its time budget. */
const MAX_ALERTAS_POR_EXECUCAO = 100;

/** Listings shown in one email before it just links to the search. */
const MAX_CAVALOS_POR_EMAIL = 6;

interface CavaloAlerta {
  id: string;
  nome: string | null;
  nome_cavalo: string | null;
  preco: number | null;
  foto_principal: string | null;
  image_url: string | null;
  localizacao: string | null;
  idade: number | null;
  created_at: string;
}

function corpoEmail(
  alerta: Alerta,
  cavalos: CavaloAlerta[],
  total: number,
  baseUrl: string
): string {
  const cartoes = cavalos
    .map((c) => {
      const nome = escapeHtml(c.nome || c.nome_cavalo || "Cavalo Lusitano");
      const foto = c.foto_principal || c.image_url;
      const preco =
        typeof c.preco === "number"
          ? new Intl.NumberFormat("pt-PT", {
              style: "currency",
              currency: "EUR",
              maximumFractionDigits: 0,
            }).format(c.preco)
          : "Sob consulta";

      const detalhes = [
        c.idade ? `${c.idade} anos` : null,
        c.localizacao ? escapeHtml(c.localizacao) : null,
      ]
        .filter(Boolean)
        .join(" · ");

      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;">
            ${
              foto
                ? `<img src="${escapeHtml(foto)}" alt="" width="80" height="80" style="float:left;margin-right:14px;object-fit:cover;border-radius:4px;">`
                : ""
            }
            <a href="${baseUrl}/comprar/${c.id}" style="color:#1a1a1a;text-decoration:none;font-size:16px;font-weight:600;">${nome}</a>
            <div style="color:#c5a059;font-size:15px;margin-top:4px;">${preco}</div>
            ${detalhes ? `<div style="color:#777;font-size:13px;margin-top:2px;">${detalhes}</div>` : ""}
          </td>
        </tr>`;
    })
    .join("");

  const extra =
    total > cavalos.length
      ? `<p style="color:#777;font-size:14px;">…e mais ${total - cavalos.length} ${
          total - cavalos.length === 1 ? "cavalo" : "cavalos"
        }.</p>`
      : "";

  return `
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px;">
      <p style="color:#c5a059;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Portal Lusitano</p>
      <h1 style="font-size:22px;font-weight:400;color:#1a1a1a;">
        ${total === 1 ? "Um novo cavalo" : `${total} novos cavalos`} para a sua pesquisa
      </h1>
      <p style="color:#555;font-size:14px;">
        <strong>${escapeHtml(alerta.nome)}</strong><br>
        <span style="color:#888;font-size:13px;">${escapeHtml(descreverAlerta(alerta))}</span>
      </p>
      <table style="width:100%;border-collapse:collapse;margin-top:20px;">${cartoes}</table>
      ${extra}
      <p style="margin-top:28px;">
        <a href="${baseUrl}/comprar" style="background:#c5a059;color:#000;padding:12px 24px;text-decoration:none;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Ver marketplace</a>
      </p>
      <p style="color:#999;font-size:11px;margin-top:32px;border-top:1px solid #eee;padding-top:16px;">
        Recebe este email porque criou um alerta de pesquisa no Portal Lusitano.
        <a href="${baseUrl}/minha-conta/alertas" style="color:#c5a059;">Gerir os meus alertas</a>
      </p>
    </div>`;
}

/**
 * GET /api/cron/alertas
 *
 * Sends one email per due saved search, covering listings published since that
 * alert last reported. Alerts with nothing new are skipped silently and keep
 * their previous timestamp, so a quiet week does not cost the user an email.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("[cron/alertas] CRON_SECRET env var is not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const expected = `Bearer ${cronSecret}`;
  const authBuffer = Buffer.from(authHeader || "");
  const expectedBuffer = Buffer.from(expected);
  if (
    authBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(authBuffer, expectedBuffer)
  ) {
    logger.warn("[cron/alertas] Unauthorized cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://portal-lusitano.pt";
  const agora = new Date();

  let enviados = 0;
  let semNovidades = 0;
  let falhados = 0;

  try {
    const { data: linhas, error } = await supabaseAdmin
      .from("marketplace_alertas")
      .select("*")
      .eq("ativo", true)
      .order("ultimo_envio_at", { ascending: true, nullsFirst: true })
      .limit(MAX_ALERTAS_POR_EXECUCAO);

    if (error) {
      logger.error("[cron/alertas] Failed to load alerts:", error);
      return NextResponse.json({ error: "Erro ao carregar alertas" }, { status: 500 });
    }

    for (const linha of linhas || []) {
      const alerta = normalizarAlerta(linha);

      if (!alertaEmAtraso(alerta.frequencia, alerta.ultimoEnvioAt, agora)) continue;

      // Everything published since this alert last reported. Falls back to the
      // alert's creation date, so a brand-new alert never dumps the back
      // catalogue into someone's inbox.
      const fronteira = alerta.ultimoEnvioAt || (linha.desde as string);

      try {
        const base = supabaseAdmin
          .from("cavalos_venda")
          .select(
            "id, nome, nome_cavalo, preco, foto_principal, image_url, localizacao, idade, created_at"
          )
          .eq("status", LISTING_STATUS.ACTIVE)
          .gt("created_at", fronteira)
          .order("created_at", { ascending: false })
          .limit(MAX_CAVALOS_POR_EMAIL) as unknown as CriteriosQuery<{
          data: CavaloAlerta[] | null;
        }>;

        const { data: cavalos } = await aplicarCriterios(base, alerta);

        if (!cavalos || cavalos.length === 0) {
          semNovidades++;
          continue;
        }

        // The subscriber's address lives in auth.users, never duplicated here.
        const { data: conta } = await supabaseAdmin.auth.admin.getUserById(linha.user_id as string);
        const email = conta?.user?.email;

        if (!email) {
          logger.warn("[cron/alertas] Alert with no reachable account:", alerta.id);
          continue;
        }

        await sendEmail({
          to: email,
          subject:
            cavalos.length === 1
              ? `Novo cavalo para si: ${cavalos[0].nome || cavalos[0].nome_cavalo}`
              : `${cavalos.length} novos cavalos para a sua pesquisa`,
          html: corpoEmail(alerta, cavalos, cavalos.length, baseUrl),
          template: "alerta-marketplace",
        });

        // Only advance the boundary after the email actually went out; a failed
        // send must leave the listings to be reported next run.
        await supabaseAdmin
          .from("marketplace_alertas")
          .update({ ultimo_envio_at: agora.toISOString() })
          .eq("id", alerta.id);

        enviados++;
      } catch (e) {
        falhados++;
        logger.error(`[cron/alertas] Failed to process alert ${alerta.id}:`, e);
      }
    }

    return NextResponse.json({ enviados, semNovidades, falhados });
  } catch (error) {
    logger.error("[cron/alertas] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
