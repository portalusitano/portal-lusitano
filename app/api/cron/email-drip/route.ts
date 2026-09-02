import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail } from "@/lib/resend";
import { generateUnsubscribeToken } from "@/lib/sanitize";
import { logger } from "@/lib/logger";

// ─── CONFIGURATION ───────────────────────────────────────────────────────────

const MAX_EMAILS_PER_RUN = 50;

/**
 * Drip sequence definition.
 * Each step fires after `delayDays` since signup (created_at).
 */
interface DripStep {
  delayDays: number;
  subject: string;
  template: string;
  getContent: (name: string, email: string, baseUrl: string) => string;
}

const DRIP_SEQUENCE: DripStep[] = [
  // Step 0 → 2 days: Educational
  {
    delayDays: 2,
    subject: "3 Erros Que Quase Todos Cometem ao Comprar um Lusitano",
    template: "drip-step-0-erros",
    getContent: getStep0Content,
  },
  // Step 1 → 5 days: Soft sell
  {
    delayDays: 5,
    subject: "Ferramentas Pro Para Quem Leva o Lusitano a Serio",
    template: "drip-step-1-ferramentas",
    getContent: getStep1Content,
  },
  // Step 2 → 10 days: Social proof / case study
  {
    delayDays: 10,
    subject: "Como a Coudelaria Vale do Tejo Encontrou Compradores em 3 Semanas",
    template: "drip-step-2-case-study",
    getContent: getStep2Content,
  },
  // Step 3 → 15 days: Urgency / discount
  {
    delayDays: 15,
    subject: "Oferta Limitada: 20% Desconto no Plano Pro",
    template: "drip-step-3-oferta",
    getContent: getStep3Content,
  },
  // Step 4 → 30 days: Last chance / trial
  {
    delayDays: 30,
    subject: "Ultima Chance — Experimenta o Pro Sem Compromisso",
    template: "drip-step-4-ultima-chance",
    getContent: getStep4Content,
  },
];

// ─── ROUTE HANDLER ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ── Auth: verify CRON_SECRET ──
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("[email-drip] CRON_SECRET env var is not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const expected = `Bearer ${cronSecret}`;
  const authBuffer = Buffer.from(authHeader || "");
  const expectedBuffer = Buffer.from(expected);
  if (
    authBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(authBuffer, expectedBuffer)
  ) {
    logger.warn("[email-drip] Unauthorized cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://portal-lusitano.pt";
  const now = new Date();

  let totalSent = 0;
  let totalFailed = 0;
  const results: Array<{ email: string; step: number; success: boolean; error?: string }> = [];

  try {
    // ── Fetch eligible leads ──
    //
    // `leads` tem sete colunas: `id`, `email`, `nome`, `utm_source`,
    // `utm_medium`, `utm_campaign` e `created_at`. Desta consulta, só `email`
    // e `created_at` existem — `name` é `nome`, e `sequence_step`, `source` e
    // `status` não existem de todo. Esta cadeia de emails nunca correu: o
    // PostgREST devolve 42703 e a rota responde 500 a cada firing do cron.
    //
    // O que aqui se corrige é o que é inequívoco: `name` → `nome`. As outras
    // três não se acrescentam por migração, porque não é uma correcção de
    // nomes — é desenhar a funcionalidade: decidir quem entra na cadeia, o que
    // marca a saída e como se conta o passo. Isso é uma decisão de produto e
    // de esquema, não uma linha de código, e fica registada como dívida em
    // `__tests__/lib/colunas-supabase.test.ts` com esta razão.
    const { data: leads, error: fetchError } = await supabaseAdmin
      .from("leads")
      .select("email, nome, sequence_step, created_at")
      .eq("source", "free-ebook")
      .eq("status", "active")
      .gte("sequence_step", 0)
      .lte("sequence_step", DRIP_SEQUENCE.length - 1)
      .order("created_at", { ascending: true })
      .limit(MAX_EMAILS_PER_RUN * 2); // fetch extra to account for leads not yet due

    if (fetchError) {
      logger.error("[email-drip] Failed to fetch leads:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch leads", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!leads || leads.length === 0) {
      logger.info("[email-drip] No eligible leads found");
      return NextResponse.json({ sent: 0, failed: 0, message: "No eligible leads" });
    }

    // ── Process each lead ──
    for (const lead of leads) {
      if (totalSent + totalFailed >= MAX_EMAILS_PER_RUN) {
        logger.info(`[email-drip] Rate limit reached (${MAX_EMAILS_PER_RUN} emails per run)`);
        break;
      }

      const step = lead.sequence_step;
      if (step < 0 || step >= DRIP_SEQUENCE.length) continue;

      const dripStep = DRIP_SEQUENCE[step];
      const createdAt = new Date(lead.created_at);
      const daysSinceSignup = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      // Not yet time for this step
      if (daysSinceSignup < dripStep.delayDays) continue;

      const leadName = lead.nome || "Amigo";

      try {
        const html = dripStep.getContent(leadName, lead.email, baseUrl);
        const emailResult = await sendEmail({
          to: lead.email,
          subject: dripStep.subject,
          html,
          template: dripStep.template,
        });

        if (emailResult.success) {
          // Increment sequence_step (or mark completed after last step)
          const isLastStep = step >= DRIP_SEQUENCE.length - 1;
          const updateData = isLastStep
            ? { sequence_step: step + 1, status: "completed" }
            : { sequence_step: step + 1 };

          const { error: updateError } = await supabaseAdmin
            .from("leads")
            .update(updateData)
            .eq("email", lead.email);

          if (updateError) {
            logger.error(`[email-drip] Failed to update lead ${lead.email}:`, updateError);
          }

          totalSent++;
          results.push({ email: lead.email, step, success: true });
          logger.info(`[email-drip] Sent step ${step} to ${lead.email}`);
        } else {
          totalFailed++;
          results.push({
            email: lead.email,
            step,
            success: false,
            error: "Email send failed",
          });
          logger.error(`[email-drip] Failed to send step ${step} to ${lead.email}`);
        }
      } catch (err) {
        totalFailed++;
        results.push({
          email: lead.email,
          step,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
        logger.error(`[email-drip] Error processing ${lead.email}:`, err);
      }
    }

    logger.info(`[email-drip] Run complete: ${totalSent} sent, ${totalFailed} failed`);
    return NextResponse.json({ sent: totalSent, failed: totalFailed, results });
  } catch (err) {
    logger.error("[email-drip] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : undefined },
      { status: 500 }
    );
  }
}

// ─── BASE EMAIL TEMPLATE ─────────────────────────────────────────────────────
// Replicates the baseEmailTemplate from lib/resend.ts (which is not exported)
// with the same Portal Lusitano branding: #050505 dark, #C5A059 gold

function baseEmailTemplate(content: string, footerEmail: string, baseUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portal Lusitano</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f0; font-family: Georgia, 'Times New Roman', serif; }
    .wrapper { max-width: 600px; margin: 0 auto; }
    .header { background: #050505; padding: 40px 40px 32px; border-bottom: 2px solid #C5A059; }
    .header-logo { font-size: 11px; letter-spacing: 0.4em; text-transform: uppercase; color: #C5A059; margin: 0 0 8px; }
    .header-title { font-size: 22px; color: #ffffff; margin: 0; font-weight: normal; letter-spacing: 0.02em; }
    .body { background: #ffffff; padding: 48px 40px; }
    .body p { margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #333333; font-family: Arial, sans-serif; }
    .body p.lead { font-size: 18px; color: #1a1a1a; }
    .divider { border: 0; height: 1px; background: #e8e8e4; margin: 32px 0; }
    .cta-box { background: #050505; padding: 32px; text-align: center; margin: 32px 0; }
    .cta-box p { color: #999999; font-size: 13px; font-family: Arial, sans-serif; margin: 0 0 20px; }
    .btn { display: inline-block; background: #C5A059; color: #000000 !important; text-decoration: none; padding: 14px 36px; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; font-family: Arial, sans-serif; font-weight: bold; }
    .features { margin: 24px 0; }
    .feature-row { padding: 12px 0; border-bottom: 1px solid #f0f0ec; display: flex; gap: 12px; align-items: flex-start; }
    .feature-check { color: #C5A059; font-size: 16px; flex-shrink: 0; margin-top: 2px; }
    .feature-text { font-size: 15px; color: #444444; font-family: Arial, sans-serif; line-height: 1.5; }
    .feature-text strong { color: #1a1a1a; }
    .highlight-box { border-left: 3px solid #C5A059; padding: 16px 20px; background: #fafaf8; margin: 24px 0; }
    .highlight-box p { margin: 0; font-size: 14px; color: #555555; font-family: Arial, sans-serif; line-height: 1.6; }
    .footer { background: #1a1a1a; padding: 32px 40px; }
    .footer p { margin: 0 0 8px; font-size: 12px; color: #666666; font-family: Arial, sans-serif; line-height: 1.6; }
    .footer a { color: #C5A059; text-decoration: none; }
    .footer .footer-name { color: #C5A059; font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <p class="header-logo">Portal Lusitano</p>
      <h1 class="header-title">O Mundo do Cavalo Lusitano</h1>
    </div>
    ${content}
    <div class="footer">
      <p class="footer-name">Portal Lusitano</p>
      <p><a href="${baseUrl}">portal-lusitano.pt</a></p>
      <p style="margin-top: 20px; color: #444444;">
        Recebeste este email porque descarregaste o ebook gratuito no Portal Lusitano.<br>
        Podes <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(footerEmail)}&token=${footerEmail ? generateUnsubscribeToken(footerEmail) : ""}">cancelar a subscricao</a> a qualquer momento.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ─── STEP 0: 3 Erros ao Comprar Lusitano (Educational) ──────────────────────

function getStep0Content(name: string, email: string, baseUrl: string): string {
  const safeName = name.split(" ")[0] || name;

  const content = `
    <div class="body">
      <p class="lead">${safeName}, conheces estes 3 erros?</p>
      <p>Depois de anos a acompanhar o mercado do Cavalo Lusitano, identificamos os 3 erros mais comuns que compradores cometem — e que custam milhares de euros.</p>

      <hr class="divider">

      <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.3em; color: #999999; font-family: Arial, sans-serif;">Os 3 erros mais comuns</p>
      <div class="features">
        <div class="feature-row">
          <span class="feature-check">1.</span>
          <span class="feature-text"><strong>Nao verificar a genealogia completa</strong> — Muitos compradores confiam apenas no registo basico. Um Lusitano com linhagem comprovada pode valer 2 a 3 vezes mais. Sem verificacao, arriscas pagar demais por um cavalo sem pedigree solido.</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">2.</span>
          <span class="feature-text"><strong>Ignorar a compatibilidade cavaleiro-cavalo</strong> — Um Lusitano excelente para dressage pode nao ser ideal para equitacao de trabalho. A compatibilidade entre o perfil do cavaleiro e as aptidoes do cavalo e fundamental para uma boa experiencia.</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">3.</span>
          <span class="feature-text"><strong>Nao comparar precos de mercado</strong> — O mercado do Lusitano tem variacao significativa de precos. Sem dados comparativos, e facil pagar 30-50% acima do valor justo — ou deixar escapar uma verdadeira oportunidade.</span>
        </div>
      </div>

      <div class="highlight-box">
        <p><strong>A boa noticia:</strong> O Portal Lusitano tem ferramentas gratuitas que te ajudam a evitar cada um destes erros. A Calculadora de Valor, o Comparador e o Verificador de Compatibilidade estao disponiveis sem custo.</p>
      </div>

      <div class="cta-box">
        <p>Experimenta a ferramenta mais popular do portal</p>
        <a href="${baseUrl}/calculadora-valor" class="btn">Calculadora de Valor</a>
      </div>

      <p style="font-size: 14px; color: #666666; font-family: Arial, sans-serif;">
        Na proxima mensagem, vou mostrar-te como profissionais do sector usam estas ferramentas no dia a dia.<br><br>
        Com os melhores cumprimentos,<br>
        <em>Equipa Portal Lusitano</em>
      </p>
    </div>`;

  return baseEmailTemplate(content, email, baseUrl);
}

// ─── STEP 1: Ferramentas Pro (Soft Sell) ─────────────────────────────────────

function getStep1Content(name: string, email: string, baseUrl: string): string {
  const safeName = name.split(" ")[0] || name;

  const content = `
    <div class="body">
      <p class="lead">${safeName}, conheces as Ferramentas Pro?</p>
      <p>As ferramentas gratuitas do Portal Lusitano dao-te uma primeira analise. Mas se levas a serio a compra, venda ou criacao de Lusitanos, o plano Pro leva tudo a outro nivel.</p>

      <hr class="divider">

      <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.3em; color: #999999; font-family: Arial, sans-serif;">O que muda com o Pro</p>
      <div class="features">
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Usos ilimitados</strong> em todas as 4 ferramentas de analise — sem restricoes</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Analises mais profundas</strong> — dados de mercado detalhados, intervalos de confianca e comparacao historica</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Relatorios PDF</strong> — exporta analises profissionais para partilhar com veterinarios, seguradoras ou parceiros</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Historico completo</strong> — todas as tuas analises guardadas e acessiveis a qualquer momento</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Suporte prioritario</strong> — resposta em menos de 24 horas</span>
        </div>
      </div>

      <div class="highlight-box">
        <p>Tudo isto por <strong>9,99 EUR/mes</strong>. Sem compromisso — cancela a qualquer momento com um clique.</p>
      </div>

      <div class="cta-box">
        <p>Ve todos os detalhes do plano Pro</p>
        <a href="${baseUrl}/precos" class="btn">Ver Planos e Precos</a>
      </div>

      <p style="font-size: 14px; color: #666666; font-family: Arial, sans-serif;">
        Com os melhores cumprimentos,<br>
        <em>Equipa Portal Lusitano</em>
      </p>
    </div>`;

  return baseEmailTemplate(content, email, baseUrl);
}

// ─── STEP 2: Case Study (Social Proof) ──────────────────────────────────────

function getStep2Content(name: string, email: string, baseUrl: string): string {
  const safeName = name.split(" ")[0] || name;

  const content = `
    <div class="body">
      <p class="lead">${safeName}, uma historia real do mercado.</p>
      <p>Queriamos partilhar contigo como uma coudelaria portuguesa usou o Portal Lusitano para transformar as suas vendas.</p>

      <hr class="divider">

      <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.3em; color: #999999; font-family: Arial, sans-serif;">Caso de estudo</p>

      <div class="highlight-box">
        <p style="font-size: 16px; color: #1a1a1a; margin-bottom: 12px;"><strong>Coudelaria Vale do Tejo</strong></p>
        <p>A Coudelaria Vale do Tejo, no Ribatejo, tinha 4 cavalos para venda ha mais de 6 meses sem sucesso. Anunciavam em classificados genericos e redes sociais, mas o publico nao era qualificado.</p>
      </div>

      <p><strong>O que mudou:</strong></p>
      <div class="features">
        <div class="feature-row">
          <span class="feature-check">1.</span>
          <span class="feature-text">Registaram-se no Portal Lusitano e publicaram os anuncios no marketplace especializado</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">2.</span>
          <span class="feature-text">Usaram a <strong>Calculadora de Valor Pro</strong> para definir precos competitivos com base em dados reais de mercado</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">3.</span>
          <span class="feature-text">Os compradores no portal ja vinham informados — usavam o Comparador e o Verificador de Compatibilidade antes de contactar</span>
        </div>
      </div>

      <div class="highlight-box">
        <p><strong>Resultado:</strong> 3 dos 4 cavalos foram vendidos em apenas 3 semanas. O quarto vendeu na semana seguinte. Os compradores destacaram a transparencia dos dados como factor decisivo.</p>
      </div>

      <div class="cta-box">
        <p>Descobre como o portal pode ajudar-te tambem</p>
        <a href="${baseUrl}/comprar" class="btn">Explorar Marketplace</a>
      </div>

      <p style="font-size: 14px; color: #666666; font-family: Arial, sans-serif;">
        Com os melhores cumprimentos,<br>
        <em>Equipa Portal Lusitano</em>
      </p>
    </div>`;

  return baseEmailTemplate(content, email, baseUrl);
}

// ─── STEP 3: Oferta Limitada — 20% Desconto (Urgency) ───────────────────────

function getStep3Content(name: string, email: string, baseUrl: string): string {
  const safeName = name.split(" ")[0] || name;

  const content = `
    <div class="body">
      <p class="lead">${safeName}, temos uma oferta especial para ti.</p>
      <p>Como descarregaste o nosso ebook e acompanhas o Portal Lusitano, queremos oferecer-te algo exclusivo.</p>

      <hr class="divider">

      <div style="background: #050505; padding: 40px; text-align: center; margin: 24px 0;">
        <p style="font-size: 11px; letter-spacing: 0.4em; text-transform: uppercase; color: #C5A059; font-family: Arial, sans-serif; margin: 0 0 16px;">Oferta exclusiva para leitores do ebook</p>
        <p style="font-size: 36px; color: #ffffff; font-family: Georgia, serif; margin: 0 0 8px;">20% Desconto</p>
        <p style="font-size: 16px; color: #999999; font-family: Arial, sans-serif; margin: 0 0 24px;">no primeiro mes do Plano Pro</p>
        <p style="font-size: 24px; color: #C5A059; font-family: Georgia, serif; margin: 0 0 8px;"><s style="color: #666666; font-size: 18px;">9,99 EUR</s> &nbsp; 7,99 EUR</p>
        <p style="font-size: 13px; color: #666666; font-family: Arial, sans-serif; margin: 0 0 28px;">primeiro mes — depois 9,99 EUR/mes (cancela quando quiseres)</p>
        <a href="${baseUrl}/precos?promo=ebook20" class="btn" style="background: #C5A059; color: #000000 !important; text-decoration: none; padding: 14px 36px; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; font-family: Arial, sans-serif; font-weight: bold; display: inline-block;">Activar Desconto</a>
      </div>

      <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.3em; color: #999999; font-family: Arial, sans-serif;">Relembrando o que inclui</p>
      <div class="features">
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Usos ilimitados</strong> em Calculadora, Comparador, Compatibilidade e Perfil</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Relatorios PDF</strong> profissionais para partilhar</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Historico completo</strong> de todas as analises</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Suporte prioritario</strong> por email</span>
        </div>
      </div>

      <div class="highlight-box">
        <p>Esta oferta e valida apenas para os proximos 7 dias. Depois disso, o preco regressa ao valor normal de 9,99 EUR/mes.</p>
      </div>

      <p style="font-size: 14px; color: #666666; font-family: Arial, sans-serif;">
        Com os melhores cumprimentos,<br>
        <em>Equipa Portal Lusitano</em>
      </p>
    </div>`;

  return baseEmailTemplate(content, email, baseUrl);
}

// ─── STEP 4: Ultima Chance — Pro Trial (Final) ──────────────────────────────

function getStep4Content(name: string, email: string, baseUrl: string): string {
  const safeName = name.split(" ")[0] || name;

  const content = `
    <div class="body">
      <p class="lead">${safeName}, esta e a ultima mensagem desta serie.</p>
      <p>Ha um mes descarregaste o nosso ebook sobre o Cavalo Lusitano. Esperamos que tenha sido util. Antes de nos despedirmos desta serie de emails, queremos fazer-te uma ultima proposta.</p>

      <hr class="divider">

      <div style="background: #050505; padding: 40px; text-align: center; margin: 24px 0;">
        <p style="font-size: 11px; letter-spacing: 0.4em; text-transform: uppercase; color: #C5A059; font-family: Arial, sans-serif; margin: 0 0 16px;">Ultima oportunidade</p>
        <p style="font-size: 28px; color: #ffffff; font-family: Georgia, serif; margin: 0 0 12px;">Experimenta o Pro</p>
        <p style="font-size: 28px; color: #C5A059; font-family: Georgia, serif; margin: 0 0 8px;">Sem Compromisso</p>
        <p style="font-size: 15px; color: #999999; font-family: Arial, sans-serif; margin: 0 0 28px;">Cancela a qualquer momento durante o primeiro mes.<br>Se nao ficares satisfeito, nao pagas nada.</p>
        <a href="${baseUrl}/precos?promo=ebook-trial" class="btn" style="background: #C5A059; color: #000000 !important; text-decoration: none; padding: 14px 36px; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; font-family: Arial, sans-serif; font-weight: bold; display: inline-block;">Comecar Trial Pro</a>
      </div>

      <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.3em; color: #999999; font-family: Arial, sans-serif;">O que ja ajudamos a descobrir</p>
      <div class="features">
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>+2.500 analises</strong> de valor realizadas por utilizadores do portal</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>+800 comparacoes</strong> entre cavalos para ajudar decisoes informadas</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>+150 coudelarias</strong> registadas no directorio verificado</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>+400 cavalos</strong> listados no marketplace especializado</span>
        </div>
      </div>

      <div class="highlight-box">
        <p>Mesmo que nao subscreva o Pro, o portal continua disponivel com as ferramentas gratuitas, o marketplace e o jornal. Seremos sempre um recurso para a comunidade Lusitana.</p>
      </div>

      <hr class="divider">

      <p style="font-size: 14px; color: #666666; font-family: Arial, sans-serif;">
        Esta foi a ultima mensagem da serie de boas-vindas. A partir de agora, so recebes a nossa newsletter mensal com artigos e novidades — se estiveres subscrito.<br><br>
        Obrigado por fazeres parte da comunidade.<br>
        <em>Equipa Portal Lusitano</em>
      </p>
    </div>`;

  return baseEmailTemplate(content, email, baseUrl);
}
