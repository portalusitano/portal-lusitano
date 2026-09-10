import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/seller-auth";
import {
  MAX_ALERTAS_POR_UTILIZADOR,
  FREQUENCIAS,
  aplicarCriterios,
  descreverAlerta,
  normalizarAlerta,
  normalizarCriterios,
  type CriteriosQuery,
} from "@/lib/marketplace-alertas";
import { LISTING_STATUS } from "@/lib/marketplace-listings";
import { logger } from "@/lib/logger";

/** GET /api/alertas — the authenticated user's saved searches. */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("marketplace_alertas")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("[alertas/GET] Supabase error:", error);
      return NextResponse.json({ error: "Erro ao carregar alertas" }, { status: 500 });
    }

    return NextResponse.json({
      alertas: (data || []).map(normalizarAlerta),
      maximo: MAX_ALERTAS_POR_UTILIZADOR,
    });
  } catch (error) {
    logger.error("[alertas/GET] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/**
 * POST /api/alertas
 *
 * Saves a search. The response carries how many listings match right now, so the
 * user immediately sees whether the criteria are too narrow — an alert that can
 * never fire is worse than no alert, because it looks like it is working.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corpo do pedido inválido" }, { status: 400 });
    }

    const { criterios, erros } = normalizarCriterios(body);
    if (erros.length > 0) {
      return NextResponse.json({ error: erros.join(". ") }, { status: 400 });
    }

    const frequencia = FREQUENCIAS.some((f) => f.id === body.frequencia)
      ? (body.frequencia as string)
      : "diaria";

    const { count } = await supabaseAdmin
      .from("marketplace_alertas")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count ?? 0) >= MAX_ALERTAS_POR_UTILIZADOR) {
      return NextResponse.json(
        { error: `Só pode ter ${MAX_ALERTAS_POR_UTILIZADOR} alertas. Apague um primeiro.` },
        { status: 409 }
      );
    }

    const nome =
      typeof body.nome === "string" && body.nome.trim()
        ? body.nome.trim().slice(0, 120)
        : descreverAlerta(criterios);

    const { data, error } = await supabaseAdmin
      .from("marketplace_alertas")
      .insert({
        user_id: user.id,
        nome,
        frequencia,
        sexo: criterios.sexo,
        regiao: criterios.regiao,
        preco_min: criterios.precoMin,
        preco_max: criterios.precoMax,
        idade_min: criterios.idadeMin,
        idade_max: criterios.idadeMax,
        disciplina: criterios.disciplina,
        nivel: criterios.nivel,
        termo: criterios.termo,
      })
      .select("*")
      .single();

    if (error || !data) {
      logger.error("[alertas/POST] Supabase error:", error);
      return NextResponse.json({ error: "Erro ao criar alerta" }, { status: 500 });
    }

    // How many listings match today. Informative only — a failure here must not
    // undo an alert that was saved successfully.
    let correspondencias: number | null = null;
    try {
      const base = supabaseAdmin
        .from("cavalos_venda")
        .select("id", { count: "exact", head: true })
        .eq("status", LISTING_STATUS.ACTIVE) as unknown as CriteriosQuery<{
        count: number | null;
      }>;
      const { count: total } = await aplicarCriterios(base, criterios);
      correspondencias = total ?? null;
    } catch (e) {
      logger.error("[alertas/POST] Failed to count matches:", e);
    }

    return NextResponse.json({ alerta: normalizarAlerta(data), correspondencias }, { status: 201 });
  } catch (error) {
    logger.error("[alertas/POST] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
