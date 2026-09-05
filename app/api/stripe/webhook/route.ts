import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { resend } from "@/lib/resend";
import Stripe from "stripe";
import { CONTACT_EMAIL } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { queueWebhookRetry } from "@/lib/webhook-retry";
import { handleCavaloAnuncio } from "./handlers/checkout-cavalo";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`Webhook signature verification failed: ${errorMsg}`);

    // Alert admin on signature failure — may indicate replay attack or misconfiguration
    resend.emails
      .send({
        from: "Portal Lusitano <admin@portal-lusitano.pt>",
        to: CONTACT_EMAIL,
        subject: "[ALERTA SEGURANÇA] Falha de verificação Stripe Webhook",
        html: `
        <h2>⚠️ Falha de Assinatura Stripe Webhook</h2>
        <p>Uma tentativa de webhook falhou na verificação de assinatura.</p>
        <p><strong>Erro:</strong> ${errorMsg}</p>
        <p><strong>Hora:</strong> ${new Date().toISOString()}</p>
        <p>Isto pode indicar:</p>
        <ul>
          <li>Tentativa de replay attack</li>
          <li>Webhook secret incorreto</li>
          <li>Request de fonte não autorizada</li>
        </ul>
        <p>Verifique o dashboard Stripe para actividade suspeita.</p>
      `,
      })
      .catch(() => {}); // fire-and-forget, don't block the response

    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { data: existingPayment } = await supabaseAdmin
          .from("payments")
          .select("id")
          .eq("stripe_session_id", session.id)
          .maybeSingle();

        if (existingPayment) {
          logger.warn(`Duplicate webhook received for checkout session ${session.id}, skipping`);
          return Response.json({ received: true, duplicate: true });
        }

        await handleCheckoutCompleted(session);
        break;
      }
      default:
        break;
    }

    return Response.json({ received: true });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Webhook handler error: ${errorMsg}`, {
      eventId: event.id,
      eventType: event.type,
    });

    // Queue failed event for retry instead of losing it
    try {
      await queueWebhookRetry(event.id, event.type, JSON.stringify(event.data.object));
    } catch (queueError) {
      logger.error("Failed to queue webhook for retry:", queueError);
    }

    // Still return 500 so Stripe knows to retry, but we've also queued it locally
    return Response.json(
      { error: "Webhook handler failed, event queued for retry" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata;

  if (!metadata) {
    return;
  }

  switch (metadata.type) {
    case "cavalo_anuncio":
      await handleCavaloAnuncio(session, metadata);
      break;
    default:
      break;
  }
}
