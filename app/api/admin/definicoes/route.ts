import { NextRequest } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { apiSuccess, apiError } from "@/lib/api-helpers";
import { createApiRoute } from "@/lib/createApiRoute";

// GET - Listar todas as definições (com filtro opcional por categoria)
export const GET = createApiRoute(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category"); // 'all' ou categoria específica

    let query = supabase
      .from("site_settings")
      .select(
        "id, key, value, category, label, description, input_type, options, is_required, validation_regex, updated_by, updated_at"
      )
      .order("category", { ascending: true })
      .order("label", { ascending: true });

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data: settings, error } = await query;

    if (error) {
      return apiError("Erro ao listar definições", 500);
    }

    // Agrupar por categoria para facilitar na UI
    const grouped: Record<string, typeof settings> = {};
    settings?.forEach((setting) => {
      if (!grouped[setting.category]) {
        grouped[setting.category] = [];
      }
      grouped[setting.category].push(setting);
    });

    return apiSuccess({
      settings: settings || [],
      grouped,
      categories: Object.keys(grouped),
    });
  },
  { auth: "admin" }
);

// POST - Criar nova definição (admin avançado)
export const POST = createApiRoute(
  async (req: NextRequest, ctx) => {
    const body = await req.json();
    const {
      key,
      value,
      category,
      label,
      description,
      input_type,
      options,
      is_required,
      validation_regex,
    } = body;

    // Validações básicas
    if (!key || !value || !category || !label || !input_type) {
      return apiError("Campos obrigatórios em falta", 400);
    }

    const { data: setting, error } = await supabase
      .from("site_settings")
      .insert({
        key,
        value,
        category,
        label,
        description,
        input_type,
        options,
        is_required,
        validation_regex,
        updated_by: ctx.auth.email,
      })
      .select()
      .single();

    if (error) {
      return apiError("Erro ao criar definição", 500);
    }

    return apiSuccess({ setting });
  },
  { auth: "admin" }
);
