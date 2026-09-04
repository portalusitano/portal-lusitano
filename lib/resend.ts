import { Resend } from "resend";
import { logger } from "@/lib/logger";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { escapeHtml, generateUnsubscribeToken } from "@/lib/sanitize";

function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not defined");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

let _resend: Resend | null = null;
// Lazy-init proxy: delays instantiation until first use, avoiding errors when env vars are missing at import time
export const resend = new Proxy({} as Resend, {
  get(_, prop) {
    if (!_resend) _resend = getResend();
    return (_resend as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Email configuration
export const EMAIL_CONFIG = {
  from: "Portal Lusitano <noreply@portal-lusitano.pt>",
  replyTo: SUPPORT_EMAIL,
};

export const EMAIL_TEMPLATES = {
  WELCOME: "welcome",
  NEWSLETTER_WEEKLY: "newsletter-weekly",
  EBOOK_DOWNLOAD: "ebook-download",
  NEWSLETTER_WELCOME: "newsletter-welcome",
  REGISTRATION_WELCOME: "registration-welcome",
  TOOL_LIMIT_REACHED: "tool-limit-reached",
  DOCUMENTO_RECUSADO: "documento-recusado",
} as const;

// Helper function to send emails
export async function sendEmail({
  to,
  subject,
  html,
  template,
}: {
  to: string | string[];
  subject: string;
  html: string;
  template?: string;
}) {
  try {
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo: EMAIL_CONFIG.replyTo,
      tags: template ? [{ name: "template", value: template }] : undefined,
    });

    return { success: true, id: result.data?.id };
  } catch (error) {
    logger.error("Failed to send email:", error);
    return { success: false, error };
  }
}

// ─── BASE TEMPLATE ────────────────────────────────────────────────────────────
// Dark header + clean white body, consistent with Portal Lusitano brand

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
    .links-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 24px 0; }
    .link-card { border: 1px solid #e8e8e4; padding: 16px; text-decoration: none; display: block; }
    .link-card-label { font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: #999999; font-family: Arial, sans-serif; display: block; margin-bottom: 6px; }
    .link-card-title { font-size: 14px; color: #1a1a1a; font-family: Georgia, serif; display: block; }
    .link-card:hover .link-card-title { color: #C5A059; }
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
        Recebeste este email porque tens uma conta ou subscreveste no Portal Lusitano.<br>
        Podes <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(footerEmail)}&token=${footerEmail ? generateUnsubscribeToken(footerEmail) : ""}">cancelar a subscrição</a> a qualquer momento.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ─── TEMPLATE: EBOOK DOWNLOAD ────────────────────────────────────────────────
// (mantém o existente em api/ebook-gratis/subscribe/route.ts)

// ─── TEMPLATE: NEWSLETTER WELCOME ────────────────────────────────────────────

function getNewsletterWelcomeEmail(baseUrl: string): string {
  const content = `
    <div class="body">
      <p class="lead">Bem-vindo à newsletter do Portal Lusitano.</p>
      <p>A partir de agora receberás os melhores artigos sobre o mundo do Cavalo Lusitano — linhagens, eventos, técnica de dressage, reprodução e muito mais.</p>

      <hr class="divider">

      <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.3em; color: #999999; font-family: Arial, sans-serif;">O que podes esperar</p>
      <div class="features">
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Artigos especializados</strong> sobre genealogia, disciplinas e mercado do Lusitano</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Cavalos em destaque</strong> do marketplace com selecção editorial</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Eventos equestres</strong> em Portugal e no mundo</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Dicas e guias</strong> para compradores e criadores</span>
        </div>
      </div>

      <hr class="divider">

      <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.3em; color: #999999; font-family: Arial, sans-serif;">Enquanto esperas pelo próximo número</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
        <tr>
          <td style="padding-right: 8px; vertical-align: top; width: 50%;">
            <a href="${baseUrl}/ebook-gratis" style="text-decoration: none; display: block; border: 1px solid #e8e8e4; padding: 16px;">
              <span style="font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: #999999; font-family: Arial, sans-serif; display: block; margin-bottom: 6px;">Gratuito</span>
              <span style="font-size: 14px; color: #1a1a1a; font-family: Georgia, serif; display: block;">Ebook de Introducao ao Lusitano</span>
            </a>
          </td>
          <td style="padding-left: 8px; vertical-align: top; width: 50%;">
            <a href="${baseUrl}/ferramentas" style="text-decoration: none; display: block; border: 1px solid #e8e8e4; padding: 16px;">
              <span style="font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: #999999; font-family: Arial, sans-serif; display: block; margin-bottom: 6px;">Ferramentas</span>
              <span style="font-size: 14px; color: #1a1a1a; font-family: Georgia, serif; display: block;">Calculadora de Valor e mais</span>
            </a>
          </td>
        </tr>
      </table>

      <div class="cta-box">
        <p>Explora o maior arquivo editorial sobre o Cavalo Lusitano</p>
        <a href="${baseUrl}/jornal" class="btn">Ler o Jornal</a>
      </div>

      <p style="font-size: 14px; color: #666666; font-family: Arial, sans-serif;">
        Com os melhores cumprimentos,<br>
        <em>Equipa Portal Lusitano</em>
      </p>
    </div>`;

  return baseEmailTemplate(content, "", baseUrl);
}

// ─── TEMPLATE: REGISTRATION WELCOME ──────────────────────────────────────────

function getRegistrationWelcomeEmail(name: string, email: string, baseUrl: string): string {
  const safeName = name.split(" ")[0] || name; // primeiro nome

  const content = `
    <div class="body">
      <p class="lead">${safeName}, a tua conta foi criada.</p>
      <p>Bem-vindo ao Portal Lusitano. Verifica o teu email para activar a conta e teres acesso completo ao portal.</p>

      <div class="highlight-box">
        <p>Depois de confirmares o email, podes usar imediatamente todas as ferramentas gratuitas, explorar o marketplace e aceder ao arquivo do jornal.</p>
      </div>

      <hr class="divider">

      <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.3em; color: #999999; font-family: Arial, sans-serif;">O que tens disponivel</p>
      <div class="features">
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Ferramentas gratuitas</strong> — 1 uso gratuito em cada uma das 4 ferramentas de analise</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Marketplace</strong> — pesquisa cavalos Lusitanos à venda em Portugal</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Directorio</strong> — coudelarias certificadas com avaliações reais</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Jornal</strong> — arquivo de artigos sobre o mundo Lusitano</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Ebook gratuito</strong> — Introducao ao Cavalo Lusitano (30 paginas)</span>
        </div>
      </div>

      <div class="cta-box">
        <p>Comeca com a ferramenta mais popular do portal</p>
        <a href="${baseUrl}/calculadora-valor" class="btn">Calculadora de Valor</a>
      </div>

      <hr class="divider">

      <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.3em; color: #999999; font-family: Arial, sans-serif;">Plano Pro — para uso profissional</p>
      <p style="font-size: 14px; color: #555555; font-family: Arial, sans-serif; line-height: 1.7;">
        Se precisares de usos ilimitados, exportacao de relatorios PDF e historico completo de analises, o plano Pro esta disponivel por <strong style="color: #1a1a1a;">9,99 EUR/mes</strong>. Cancela a qualquer momento.
      </p>
      <p style="margin-top: 8px;">
        <a href="${baseUrl}/precos" style="color: #C5A059; font-family: Arial, sans-serif; font-size: 14px; text-decoration: none;">Ver planos e precos &rarr;</a>
      </p>

      <hr class="divider">

      <p style="font-size: 14px; color: #666666; font-family: Arial, sans-serif;">
        Qualquer duvida, responde a este email.<br>
        <em>Equipa Portal Lusitano</em>
      </p>
    </div>`;

  return baseEmailTemplate(content, email, baseUrl);
}

// ─── TEMPLATE: TOOL LIMIT REACHED ────────────────────────────────────────────

const TOOL_NAMES: Record<string, string> = {
  calculadora: "Calculadora de Valor",
  comparador: "Comparador de Cavalos",
  compatibilidade: "Verificador de Compatibilidade",
  perfil: "Analise de Perfil",
};

function getToolLimitEmail(name: string, email: string, toolSlug: string, baseUrl: string): string {
  const safeName = name.split(" ")[0] || name;
  const toolName = TOOL_NAMES[toolSlug] || "ferramenta";

  const content = `
    <div class="body">
      <p class="lead">${safeName}, esgotaste o uso gratuito da ${toolName}.</p>
      <p>Cada ferramenta inclui 1 analise gratuita para experimentares sem compromisso. Para continuar a usar sem limites, o plano Pro esta disponivel por 9,99 EUR/mes.</p>

      <div class="cta-box">
        <p>Usos ilimitados em todas as ferramentas, relatorios PDF e historico completo</p>
        <a href="${baseUrl}/precos" class="btn">Ver Plano Pro — 9,99 EUR/mes</a>
      </div>

      <hr class="divider">

      <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.3em; color: #999999; font-family: Arial, sans-serif;">O que inclui o Pro</p>
      <div class="features">
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Usos ilimitados</strong> em todas as 4 ferramentas de analise</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Resultados avancados</strong> com analise mais detalhada</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Exportar PDF</strong> — relatorios profissionais para partilhar</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Historico completo</strong> — todas as tuas analises guardadas</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Suporte prioritario</strong> por email</span>
        </div>
      </div>

      <div class="highlight-box">
        <p>Podes cancelar a qualquer momento, sem compromissos ou taxas adicionais. Manterao acesso ao Pro ate ao final do periodo de facturacao em curso.</p>
      </div>

      <hr class="divider">

      <p style="font-size: 14px; color: #666666; font-family: Arial, sans-serif;">
        Qualquer duvida, responde a este email.<br>
        <em>Equipa Portal Lusitano</em>
      </p>
    </div>`;

  return baseEmailTemplate(content, email, baseUrl);
}

// ─── TEMPLATE: CAVALO ANUNCIO CONFIRMAÇÃO ─────────────────────────────────────

export function getCavaloAnuncioConfirmEmail(
  nomeCavalo: string,
  preco: string,
  destaque: boolean,
  email: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://portal-lusitano.pt";
  const safeName = escapeHtml(nomeCavalo);
  const safePreco = escapeHtml(preco);

  const content = `
    <div class="body">
      <p class="lead">Anúncio recebido com sucesso.</p>
      <p>O seu anúncio do cavalo <strong>${safeName}</strong> foi recebido. Os documentos que enviou ficaram guardados e vão ser revistos por uma pessoa da equipa antes de o anúncio ficar visível no marketplace.</p>

      <div class="highlight-box">
        <p>Pode acompanhar o estado de cada documento em <a href="${baseUrl}/minha-conta/documentos" style="color: #C5A059; text-decoration: none;">A minha conta &rsaquo; Documentos</a>. Se algum for recusado, dizemos-lhe porquê e pode enviar outro por lá.</p>
      </div>

      <hr class="divider">

      <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.3em; color: #999999; font-family: Arial, sans-serif;">Detalhes do anúncio</p>
      <div class="features">
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Cavalo:</strong> ${safeName}</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Preço:</strong> €${safePreco}</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Destaque:</strong> ${destaque ? "Sim — 7 dias no topo do marketplace" : "Não"}</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Validade:</strong> 30 dias</span>
        </div>
      </div>

      <div class="cta-box">
        <p>Enquanto espera pela aprovação, explore os outros cavalos disponíveis</p>
        <a href="${baseUrl}/comprar" class="btn">Ver Marketplace</a>
      </div>

      <p style="font-size: 14px; color: #666666; font-family: Arial, sans-serif;">
        Qualquer dúvida, responda a este email.<br>
        <em>Equipa Portal Lusitano</em>
      </p>
    </div>`;

  return baseEmailTemplate(content, email, baseUrl);
}

// ─── TEMPLATE: DOCUMENTO RECUSADO ─────────────────────────────────────────────

/**
 * O aviso que faltava.
 *
 * Um vendedor enviava o Livro Azul, pagava, e se o documento fosse recusado
 * **não acontecia nada**: o motivo ficava gravado na base e ele ficava à espera
 * para sempre. Recusar em silêncio é pior do que não rever — quem não sabe que
 * foi recusado não corrige, e o anúncio dele morre sem ninguém lhe dizer porquê.
 *
 * O corpo é o motivo que quem reviu escreveu, tal como o escreveu. Não se
 * resume, não se suaviza e não se traduz para uma frase da casa: o vendedor
 * precisa de saber o que reenviar, e é aquele texto que lho diz. Vai escapado
 * porque é texto livre que entra em HTML, e as quebras de linha ficam quebras
 * de linha — quem revê escreve em parágrafos e um parágrafo colado numa linha
 * só lê-se pior.
 *
 * Não há aqui prazo nenhum, e não pode haver: não existe fila com prazo nem
 * nada que a percorra sozinha.
 */
export function getDocumentoRecusadoEmail(
  nomeCavalo: string,
  nomeDoTipo: string,
  motivo: string,
  email: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://portal-lusitano.pt";
  const safeCavalo = escapeHtml(nomeCavalo);
  const safeTipo = escapeHtml(nomeDoTipo);
  const safeMotivo = escapeHtml(motivo).replace(/\r?\n/g, "<br>");

  const content = `
    <div class="body">
      <p class="lead">O ${safeTipo} que enviou não foi aceite.</p>
      <p>Revimos o documento que anexou ao anúncio do cavalo <strong>${safeCavalo}</strong> e não pudemos aceitá-lo. O motivo, escrito por quem o reviu:</p>

      <div class="highlight-box">
        <p>${safeMotivo}</p>
      </div>

      <p>Pode enviar outro ficheiro para o mesmo documento sem refazer o anúncio. O anúncio fica como está — não perde nada do que já preencheu.</p>

      <div class="cta-box">
        <p>Ver o estado dos documentos deste anúncio e enviar outro ficheiro</p>
        <a href="${baseUrl}/minha-conta/documentos" class="btn">Os meus documentos</a>
      </div>

      <hr class="divider">

      <p style="font-size: 14px; color: #666666; font-family: Arial, sans-serif;">
        Se acha que houve engano, responda a este email.<br>
        <em>Equipa Portal Lusitano</em>
      </p>
    </div>`;

  return baseEmailTemplate(content, email, baseUrl);
}

// ─── TEMPLATE: PROFISSIONAL CONFIRMAÇÃO ───────────────────────────────────────

export function getProfissionalConfirmEmail(
  nome: string,
  categoria: string,
  email: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://portal-lusitano.pt";
  const safeName = escapeHtml(nome);
  const safeCategoria = escapeHtml(categoria);

  const content = `
    <div class="body">
      <p class="lead">Pagamento confirmado, ${safeName}.</p>
      <p>O seu perfil profissional está agora <strong>em análise</strong> e será aprovado pela nossa equipa nas próximas 24 horas.</p>

      <div class="highlight-box">
        <p>Receberá um email assim que o seu perfil for aprovado e estiver visível no directório profissional.</p>
      </div>

      <hr class="divider">

      <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.3em; color: #999999; font-family: Arial, sans-serif;">Detalhes do registo</p>
      <div class="features">
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Categoria:</strong> ${safeCategoria}</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Subscrição:</strong> €6/mês — cancela a qualquer momento</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Estado:</strong> Em análise</span>
        </div>
      </div>

      <div class="cta-box">
        <p>Explore o directório de profissionais equestres</p>
        <a href="${baseUrl}/profissionais" class="btn">Ver Directório</a>
      </div>

      <p style="font-size: 14px; color: #666666; font-family: Arial, sans-serif;">
        Qualquer dúvida, responda a este email.<br>
        <em>Equipa Portal Lusitano</em>
      </p>
    </div>`;

  return baseEmailTemplate(content, email, baseUrl);
}

// ─── TEMPLATE: FERRAMENTAS PRO ACTIVADAS ──────────────────────────────────────

export function getToolsProActivadoEmail(email: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://portal-lusitano.pt";

  const content = `
    <div class="body">
      <p class="lead">Ferramentas PRO activadas.</p>
      <p>A sua subscrição Pro está agora activa. Tem acesso ilimitado a todas as ferramentas de análise.</p>

      <hr class="divider">

      <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.3em; color: #999999; font-family: Arial, sans-serif;">O que está incluído</p>
      <div class="features">
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Calculadora de Valor</strong> — usos ilimitados</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Comparador de Cavalos</strong> — usos ilimitados</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Verificador de Compatibilidade</strong> — usos ilimitados</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Análise de Perfil</strong> — usos ilimitados</span>
        </div>
        <div class="feature-row">
          <span class="feature-check">—</span>
          <span class="feature-text"><strong>Exportar PDF</strong> — relatórios profissionais</span>
        </div>
      </div>

      <div class="highlight-box">
        <p><strong>Plano:</strong> Pro Mensal — €9,99/mês. Cancela a qualquer momento, sem compromissos.</p>
      </div>

      <div class="cta-box">
        <p>Começa a usar as ferramentas agora</p>
        <a href="${baseUrl}/ferramentas" class="btn">Ir para as Ferramentas</a>
      </div>

      <p style="font-size: 14px; color: #666666; font-family: Arial, sans-serif;">
        Qualquer dúvida, responda a este email.<br>
        <em>Equipa Portal Lusitano</em>
      </p>
    </div>`;

  return baseEmailTemplate(content, email, baseUrl);
}

// ─── EMAIL WORKFLOWS ──────────────────────────────────────────────────────────

export const EmailWorkflows = {
  // Ebook download (já existia)
  async sendEbookWelcome(email: string, name: string) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://portal-lusitano.pt";
    await sendEmail({
      to: email,
      subject: "O teu Ebook Gratuito - Portal Lusitano",
      html: getEbookWelcomeEmailLegacy(name, baseUrl),
      template: EMAIL_TEMPLATES.EBOOK_DOWNLOAD,
    });
  },

  // Newsletter welcome — imediato após subscrição
  async sendNewsletterWelcome(email: string) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://portal-lusitano.pt";
    return sendEmail({
      to: email,
      subject: "Bem-vindo a newsletter do Portal Lusitano",
      html: getNewsletterWelcomeEmail(baseUrl),
      template: EMAIL_TEMPLATES.NEWSLETTER_WELCOME,
    });
  },

  // Registration welcome — após criação de conta
  async sendRegistrationWelcome(email: string, name: string) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://portal-lusitano.pt";
    return sendEmail({
      to: email,
      subject: "A tua conta no Portal Lusitano esta criada",
      html: getRegistrationWelcomeEmail(name, email, baseUrl),
      template: EMAIL_TEMPLATES.REGISTRATION_WELCOME,
    });
  },

  /**
   * Documento recusado — imediatamente a seguir à decisão de quem revê.
   *
   * O assunto nomeia o documento e o cavalo porque é o que se lê antes de abrir
   * e é o que distingue este email de outro igual sobre outro anúncio.
   */
  async sendDocumentoRecusado(
    email: string,
    nomeCavalo: string,
    nomeDoTipo: string,
    motivo: string
  ) {
    return sendEmail({
      to: email,
      subject: `${nomeDoTipo} recusado — anúncio de ${nomeCavalo}`,
      html: getDocumentoRecusadoEmail(nomeCavalo, nomeDoTipo, motivo, email),
      template: EMAIL_TEMPLATES.DOCUMENTO_RECUSADO,
    });
  },

  // Tool limit reached — quando utilizador esgota uso gratuito
  async sendToolLimitReached(email: string, name: string, toolSlug: string) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://portal-lusitano.pt";
    return sendEmail({
      to: email,
      subject: "Actualize para Pro — usos ilimitados por 9,99 EUR/mes",
      html: getToolLimitEmail(name, email, toolSlug, baseUrl),
      template: EMAIL_TEMPLATES.TOOL_LIMIT_REACHED,
    });
  },
};

// Legacy ebook template (mantido para compatibilidade com ebook route existente)
function getEbookWelcomeEmailLegacy(name: string, baseUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #C5A059 0%, #8B6914 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .button { display: inline-block; background: #C5A059; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bem-vindo ao Portal Lusitano!</h1>
      <p>Obrigado por descarregares o nosso ebook, ${name}!</p>
    </div>
    <div class="content">
      <h2>O Teu Ebook Esta Pronto</h2>
      <p>Podes aceder ao teu ebook gratuito "Introducao ao Cavalo Lusitano" a qualquer momento.</p>
      <a href="${baseUrl}/ebook-gratis/download" class="button">Ver Ebook</a>
      <h3>O Que Vais Aprender:</h3>
      <ul>
        <li>A historia e origem do Cavalo Lusitano</li>
        <li>Caracteristicas unicas da raca</li>
        <li>Temperamento e aptidoes</li>
        <li>Como identificar um Lusitano puro</li>
      </ul>
      <p>Abraco,<br><em>Equipa Portal Lusitano</em></p>
    </div>
    <div class="footer">
      <p>Portal Lusitano - O Mundo do Cavalo Lusitano</p>
      <p>www.portal-lusitano.pt</p>
    </div>
  </div>
</body>
</html>
  `;
}
