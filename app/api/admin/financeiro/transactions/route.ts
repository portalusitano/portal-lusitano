import { NextRequest } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { apiSuccess, apiError } from "@/lib/api-helpers";
import { createApiRoute } from "@/lib/createApiRoute";
import { sanitizeSearchInput } from "@/lib/sanitize";

export const GET = createApiRoute(
  async (req: NextRequest) => {
    const searchParams = req.nextUrl.searchParams;

    // Parâmetros de filtro
    const productType = searchParams.get("product_type"); // 'cavalo_anuncio', 'instagram_ad', 'publicidade'
    const status = searchParams.get("status"); // 'succeeded', 'pending', 'failed'
    const startDate = searchParams.get("start_date"); // YYYY-MM-DD
    const endDate = searchParams.get("end_date"); // YYYY-MM-DD
    const search = searchParams.get("search"); // Pesquisa por email ou descrição

    // Parâmetros de paginação
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Construir query
    let query = supabase
      .from("payments")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    // Aplicar filtros
    if (productType && productType !== "all") {
      query = query.eq("product_type", productType);
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (startDate) {
      query = query.gte("created_at", `${startDate}T00:00:00`);
    }

    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59`);
    }

    if (search) {
      const safeSearch = sanitizeSearchInput(search);
      if (safeSearch) {
        query = query.or(
          `email.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%,stripe_payment_intent_id.ilike.%${safeSearch}%`
        );
      }
    }

    // Aplicar paginação
    query = query.range(from, to);

    const { data: transactions, error, count } = await query;

    if (error) {
      return apiError("Erro ao buscar transações", 500);
    }

    // Formatar transações para o frontend
    const formattedTransactions =
      transactions?.map((transaction) => {
        const productLabels: Record<string, string> = {
          cavalo_anuncio: "Anúncio de Cavalo",
          instagram_ad: "Instagram",
          publicidade: "Publicidade",
        };

        const statusLabels: Record<string, string> = {
          succeeded: "Sucesso",
          pending: "Pendente",
          failed: "Falhado",
        };

        return {
          id: transaction.id,
          date: transaction.created_at,
          email: transaction.email,
          productType: productLabels[transaction.product_type || ""] || "Outros",
          productTypeKey: transaction.product_type,
          amount: transaction.amount / 100, // Converter para euros
          currency: transaction.currency?.toUpperCase() || "EUR",
          status: statusLabels[transaction.status] || transaction.status,
          statusKey: transaction.status,
          description: transaction.description,
          stripePaymentId: transaction.stripe_payment_intent_id,
          stripeSessionId: transaction.stripe_session_id,
          metadata: transaction.product_metadata,
        };
      }) || [];

    return apiSuccess({
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  },
  { auth: "admin" }
);
