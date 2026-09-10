import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/seller-auth";
import { FREQUENCIAS, normalizarAlerta } from "@/lib/marketplace-alertas";
import { logger } from "@/lib/logger";

/** PATCH /api/alertas/[id] — pause, resume, rename or change frequency. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corpo do pedido inválido" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (typeof body.ativo === "boolean") updates.ativo = body.ativo;

    if (typeof body.nome === "string" && body.nome.trim()) {
      updates.nome = body.nome.trim().slice(0, 120);
    }

    if (FREQUENCIAS.some((f) => f.id === body.frequencia)) {
      updates.frequencia = body.frequencia;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("marketplace_alertas")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) {
      logger.error("[alertas/[id]/PATCH] Supabase error:", error);
      return NextResponse.json({ error: "Erro ao actualizar alerta" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Alerta não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ alerta: normalizarAlerta(data) });
  } catch (error) {
    logger.error("[alertas/[id]/PATCH] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/** DELETE /api/alertas/[id] — removes a saved search for good. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const { error } = await supabaseAdmin
      .from("marketplace_alertas")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      logger.error("[alertas/[id]/DELETE] Supabase error:", error);
      return NextResponse.json({ error: "Erro ao apagar alerta" }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    logger.error("[alertas/[id]/DELETE] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
