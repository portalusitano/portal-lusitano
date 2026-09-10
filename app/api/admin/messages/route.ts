import { NextRequest } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { apiSuccess, apiError } from "@/lib/api-helpers";
import { createApiRoute } from "@/lib/createApiRoute";
import { sanitizeSearchInput } from "@/lib/sanitize";

export const GET = createApiRoute(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);

    // Parâmetros de filtro
    const formType = searchParams.get("form_type"); // 'vender_cavalo', 'publicidade', 'instagram', 'all'
    const status = searchParams.get("status"); // 'novo', 'lido', 'respondido', 'arquivado', 'all'
    const priority = searchParams.get("priority"); // 'baixa', 'normal', 'alta', 'urgente', 'all'
    const search = searchParams.get("search"); // Busca por nome/email/empresa
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Construir query base
    let query = supabase
      .from("contact_submissions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    // Aplicar filtros
    if (formType && formType !== "all") {
      query = query.eq("form_type", formType);
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (priority && priority !== "all") {
      query = query.eq("priority", priority);
    }

    // Busca por texto (nome, email, empresa)
    if (search && search.trim()) {
      const safeSearch = sanitizeSearchInput(search);
      query = query.or(
        `name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,company.ilike.%${safeSearch}%`
      );
    }

    // Paginação
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return apiError("Erro ao listar mensagens", 500);
    }

    return apiSuccess({
      messages: data || [],
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
