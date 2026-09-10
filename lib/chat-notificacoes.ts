/**
 * Email notifications for marketplace conversations.
 *
 * A message nobody knows about is the same as no message: the seller pays for a
 * listing, a buyer writes, and without a notification the conversation dies in
 * an inbox nobody opens.
 */

import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail } from "@/lib/resend";
import { escapeHtml } from "@/lib/sanitize";
import { resumirMensagem } from "@/lib/marketplace-chat";
import { logger } from "@/lib/logger";

interface Notificacao {
  conversaId: string;
  destinatarioId: string;
  remetenteNome: string;
  cavaloNome: string;
  corpo: string;
}

/**
 * Whether this message should trigger an email.
 *
 * Only the first unread message in a conversation notifies. During an active
 * back-and-forth the recipient is already reading, and one email per line would
 * be enough to make them mute the whole thing.
 */
export async function devoNotificar(
  conversaId: string,
  remetenteId: string,
  mensagemId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("marketplace_mensagens")
    .select("id")
    .eq("conversa_id", conversaId)
    .eq("remetente_id", remetenteId)
    .is("lida_at", null)
    .neq("id", mensagemId)
    .limit(1);

  if (error) {
    logger.error("[chat-notificacoes] Failed to check unread state:", error);
    // On doubt, notify: a missed message costs more than a duplicate email.
    return true;
  }

  return (data || []).length === 0;
}

function corpoEmail(n: Notificacao, baseUrl: string): string {
  const excerto = resumirMensagem(n.corpo) || "";

  return `
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px;">
      <p style="color:#c5a059;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Portal Lusitano</p>
      <h1 style="font-size:22px;font-weight:400;color:#1a1a1a;">
        Nova mensagem de ${escapeHtml(n.remetenteNome)}
      </h1>
      <p style="color:#777;font-size:14px;">Sobre o anúncio <strong>${escapeHtml(n.cavaloNome)}</strong></p>
      <blockquote style="margin:20px 0;padding:14px 18px;border-left:3px solid #c5a059;background:#faf8f4;color:#333;font-size:15px;">
        ${escapeHtml(excerto)}
      </blockquote>
      <p style="margin-top:24px;">
        <a href="${baseUrl}/minha-conta/mensagens" style="background:#c5a059;color:#000;padding:12px 24px;text-decoration:none;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Responder</a>
      </p>
      <p style="color:#999;font-size:11px;margin-top:32px;border-top:1px solid #eee;padding-top:16px;">
        Responda pelo portal para manter o seu contacto privado.
      </p>
    </div>`;
}

/**
 * Sends the notification, resolving the recipient's address at send time.
 *
 * Never throws: a failed notification must not fail the message that was already
 * stored. The message is in the database either way.
 */
export async function notificarNovaMensagem(n: Notificacao): Promise<void> {
  try {
    const { data: conta } = await supabaseAdmin.auth.admin.getUserById(n.destinatarioId);
    const email = conta?.user?.email;

    if (!email) {
      logger.warn("[chat-notificacoes] Recipient has no reachable address:", n.destinatarioId);
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://portal-lusitano.pt";

    await sendEmail({
      to: email,
      subject: `Nova mensagem sobre ${n.cavaloNome}`,
      html: corpoEmail(n, baseUrl),
      template: "chat-nova-mensagem",
    });
  } catch (error) {
    logger.error("[chat-notificacoes] Failed to notify:", error);
  }
}
