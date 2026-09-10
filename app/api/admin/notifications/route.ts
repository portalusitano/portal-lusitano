import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { verifySession } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const email = await verifySession();
    if (!email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const _unreadOnly = searchParams.get("unread") === "true";

    // Buscar eventos recentes de várias fontes
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const notifications: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: string;
      link: string;
      icon: string;
      priority: string;
    }> = [];

    // 1. Novas Mensagens (últimas 24h)
    const { data: newMessages } = await supabase
      .from("contact_submissions")
      .select("id, name, form_type, created_at")
      .eq("status", "novo")
      .gte("created_at", last24h)
      .order("created_at", { ascending: false })
      .limit(5);

    if (newMessages) {
      newMessages.forEach((msg) => {
        notifications.push({
          id: `msg_${msg.id}`,
          type: "message",
          title: "Nova Mensagem",
          description: `${msg.name} enviou uma mensagem (${msg.form_type})`,
          timestamp: msg.created_at,
          link: `/admin-app?tab=mensagens&id=${msg.id}`,
          icon: "📧",
          priority: "high",
        });
      });
    }

    // 2. Novos Pagamentos (últimas 24h)
    const { data: newPayments } = await supabase
      .from("payments")
      .select("id, email, amount, product_type, created_at")
      .eq("status", "succeeded")
      .gte("created_at", last24h)
      .order("created_at", { ascending: false })
      .limit(5);

    if (newPayments) {
      newPayments.forEach((payment) => {
        notifications.push({
          id: `payment_${payment.id}`,
          type: "payment",
          title: "Novo Pagamento",
          description: `€${(payment.amount / 100).toFixed(2)} de ${payment.email} (${payment.product_type})`,
          timestamp: payment.created_at,
          link: `/admin-app?tab=financeiro`,
          icon: "💰",
          priority: "high",
        });
      });
    }

    // 3. Reviews Pendentes
    const { data: pendingReviews } = await supabase
      // `reviews_cavalos` não existe; a tabela é `reviews`.
      .from("reviews")
      .select("id, autor_nome, avaliacao, created_at")
      .eq("status", "pending")
      .gte("created_at", last7days)
      .order("created_at", { ascending: false })
      .limit(5);

    if (pendingReviews) {
      pendingReviews.forEach((review) => {
        notifications.push({
          id: `review_${review.id}`,
          type: "review",
          title: "Review Pendente",
          description: `${review.autor_nome} deixou uma review (${review.avaliacao}/5)`,
          timestamp: review.created_at,
          link: `/admin-app?tab=reviews`,
          icon: "⭐",
          priority: "medium",
        });
      });
    }

    // 4. Cavalos Novos (pendentes aprovação)
    const { data: newCavalos } = await supabase
      .from("cavalos_venda")
      .select("id, nome, preco, created_at")
      .eq("status", "pending")
      .gte("created_at", last7days)
      .order("created_at", { ascending: false })
      .limit(5);

    if (newCavalos) {
      newCavalos.forEach((cavalo) => {
        notifications.push({
          id: `cavalo_${cavalo.id}`,
          type: "cavalo",
          title: "Novo Cavalo Pendente",
          description: `${cavalo.nome} (€${cavalo.preco}) aguarda aprovação`,
          timestamp: cavalo.created_at,
          link: `/admin-app?tab=cavalos`,
          icon: "🐴",
          priority: "medium",
        });
      });
    }

    // 5. Uploads Instagram Pendentes
    const { data: instagramUploads } = await supabase
      .from("instagram_uploads")
      .select("id, caption, created_at")
      .eq("status", "pending")
      .gte("created_at", last7days)
      .order("created_at", { ascending: false })
      .limit(3);

    if (instagramUploads) {
      instagramUploads.forEach((upload) => {
        notifications.push({
          id: `instagram_${upload.id}`,
          type: "instagram",
          title: "Upload Instagram Pendente",
          description: `Novo conteúdo pronto para publicar`,
          timestamp: upload.created_at,
          link: `/admin-app?tab=instagram`,
          icon: "📸",
          priority: "low",
        });
      });
    }

    // Ordenar por data (mais recente primeiro)
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Aplicar limite
    const limitedNotifications = notifications.slice(0, limit);

    // Contar não lidas (últimas 24h são consideradas não lidas)
    const unreadCount = notifications.filter(
      (n) => new Date(n.timestamp) > new Date(last24h)
    ).length;

    return NextResponse.json({
      notifications: limitedNotifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    logger.error("Notifications error:", error);
    return NextResponse.json({ error: "Erro ao carregar notificações" }, { status: 500 });
  }
}
