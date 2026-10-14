import { NextRequest } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { apiSuccess, apiError } from "@/lib/api-helpers";
import { createApiRoute } from "@/lib/createApiRoute";
import { sanitizeSearchInput } from "@/lib/sanitize";

// GET - Listar leads com filtros
export const GET = createApiRoute(
  async (req: NextRequest) => {
    const searchParams = req.nextUrl.searchParams;
    const stage = searchParams.get("stage") || "all";
    const search = searchParams.get("search") || "";

    // Buscar todos os leads
    let query = supabase
      .from("crm_leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    // Filtro por stage
    if (stage !== "all") {
      query = query.eq("stage", stage);
    }

    // Pesquisa (sanitizada contra PostgREST injection)
    if (search) {
      const safe = sanitizeSearchInput(search);
      if (safe) {
        query = query.or(
          `name.ilike.%${safe}%,email.ilike.%${safe}%,company.ilike.%${safe}%,interests.ilike.%${safe}%`
        );
      }
    }

    const { data: leads, error, count } = await query;

    if (error) {
      return apiError("Erro ao carregar leads", 500);
    }

    // Calcular estatísticas por stage
    const allLeads = leads || [];
    const stats = {
      total: count || 0,
      novo: allLeads.filter((l) => l.stage === "novo").length,
      contactado: allLeads.filter((l) => l.stage === "contactado").length,
      qualificado: allLeads.filter((l) => l.stage === "qualificado").length,
      proposta: allLeads.filter((l) => l.stage === "proposta").length,
      negociacao: allLeads.filter((l) => l.stage === "negociacao").length,
      ganho: allLeads.filter((l) => l.stage === "ganho").length,
      perdido: allLeads.filter((l) => l.stage === "perdido").length,
    };

    // Calcular valor total do pipeline (excluindo ganho/perdido)
    const pipelineValue = allLeads
      .filter((l) => !["ganho", "perdido"].includes(l.stage))
      .reduce((sum, l) => sum + ((l.estimated_value || 0) * (l.probability || 50)) / 100, 0);

    const wonValue = allLeads
      .filter((l) => l.stage === "ganho")
      .reduce((sum, l) => sum + (l.actual_value || l.estimated_value || 0), 0);

    return apiSuccess({
      leads,
      stats,
      pipelineValue,
      wonValue,
    });
  },
  { auth: "admin" }
);

// POST - Criar novo lead
export const POST = createApiRoute(
  async (req: NextRequest, ctx) => {
    const body = await req.json();
    const {
      name,
      email: leadEmail,
      telefone,
      company,
      stage = "novo",
      estimated_value = 0,
      probability = 50,
      source_type,
      interests,
      notes,
      budget_min,
      budget_max,
      next_follow_up,
    } = body;

    // Validações
    if (!name || !leadEmail) {
      return apiError("Nome e email são obrigatórios", 400);
    }

    // Criar lead
    const { data: lead, error } = await supabase
      .from("crm_leads")
      .insert({
        name,
        email: leadEmail,
        telefone,
        company,
        stage,
        estimated_value,
        probability,
        source_type,
        interests,
        notes,
        budget_min,
        budget_max,
        next_follow_up: next_follow_up ? new Date(next_follow_up).toISOString() : null,
        owner_email: ctx.auth.email,
      })
      .select()
      .single();

    if (error) {
      return apiError("Erro ao criar lead", 500);
    }

    return apiSuccess({ lead }, undefined, 201);
  },
  { auth: "admin" }
);
