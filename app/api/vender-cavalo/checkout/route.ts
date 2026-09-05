import { stripe } from "@/lib/stripe";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { strictLimiter } from "@/lib/rate-limit";
import { getListingTier } from "@/lib/listing-tiers";
import { getAuthenticatedUser } from "@/lib/seller-auth";

export async function POST(req: NextRequest) {
  try {
    // Rate limit: max 3 checkout sessions per minute per IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await strictLimiter.check(3, `checkout-vender:${ip}`);
  } catch {
    return NextResponse.json(
      { error: "Demasiados pedidos. Tente novamente mais tarde." },
      { status: 429 }
    );
  }

  try {
    const { tier, formData } = await req.json();

    // Validar tier
    const tierData = getListingTier(tier);
    if (!tierData) {
      return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
    }

    if (!formData || !formData.nomeCavalo) {
      return NextResponse.json({ error: "Dados do formulário inválidos" }, { status: 400 });
    }

    // Se o vendedor estiver autenticado, o anúncio fica desde já ligado à conta
    // dele. O webhook não tem sessão, por isso o id viaja nos metadados Stripe.
    // Publicar sem conta continua a funcionar: nesse caso o anúncio é reclamado
    // mais tarde por correspondência de email (ver lib/seller-auth).
    const user = await getAuthenticatedUser();

    // Guardar contacto em BD antes de criar sessão Stripe
    const isDestaque = tier === "destaque" || tier === "premium";
    const { data: submission, error: submissionError } = await supabase
      .from("contact_submissions")
      .insert({
        form_type: "vender_cavalo",
        name: formData.proprietarioNome || "N/A",
        email: formData.proprietarioEmail,
        telefone: formData.proprietarioTelefone || null,
        company: null,
        form_data: {
          ...formData,
          tier,
        },
        status: "novo",
        priority: isDestaque ? "alta" : "normal",
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
        user_agent: req.headers.get("user-agent") || null,
      })
      .select()
      .single();

    if (submissionError || !submission) {
      logger.error("Erro ao guardar contacto:", submissionError);
      return NextResponse.json(
        { error: "Erro ao processar formulário. Tente novamente." },
        { status: 500 }
      );
    }

    // Criar sessão de checkout Stripe com preço do tier
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Anúncio ${tierData.name} — ${tierData.durationDays} dias`,
              description: tierData.features[0],
            },
            unit_amount: tierData.priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/vender-cavalo/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/vender-cavalo`,
      customer_email: formData.proprietarioEmail,
      metadata: {
        type: "cavalo_anuncio",
        contact_submission_id: submission.id,
        tier,
        duration_days: String(tierData.durationDays),
        destaque: isDestaque ? "true" : "false",
        nome: formData.nomeCavalo.substring(0, 100),
        ...(user ? { user_id: user.id } : {}),
      },
      billing_address_collection: "auto",
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logger.error("Checkout creation error:", error);
    return NextResponse.json({ error: "Erro ao criar checkout" }, { status: 500 });
  }
}
