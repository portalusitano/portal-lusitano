import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { verifySession } from "@/lib/auth";
import { logger } from "@/lib/logger";

/** Statuses a moderator can set on a report. */
const ESTADOS = ["pendente", "em_analise", "procedente", "improcedente"];

/**
 * PATCH /api/admin/denuncias/[id]
 *
 * Moves a report through the queue and, when a report is upheld, optionally
 * takes the listing down in the same step — the two decisions are made together
 * in practice, and splitting them leaves reported listings live by accident.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const email = await verifySession();
    if (!email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corpo do pedido inválido" }, { status: 400 });
    }

    const status = typeof body.status === "string" ? body.status : null;
    if (!status || !ESTADOS.includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { status };

    if (typeof body.notaInterna === "string") {
      updates.nota_interna = body.notaInterna.trim().slice(0, 2000) || null;
    }

    // Only a decision closes the report; moving it to "em_analise" leaves it open.
    if (status === "procedente" || status === "improcedente") {
      updates.resolvida_at = new Date().toISOString();
      updates.resolvida_por = email;
    } else {
      updates.resolvida_at = null;
      updates.resolvida_por = null;
    }

    const { data: denuncia, error } = await supabase
      .from("cavalos_venda_denuncias")
      .update(updates)
      .eq("id", id)
      .select("id, cavalo_id, status")
      .single();

    if (error || !denuncia) {
      logger.error("[admin/denuncias/PATCH] Supabase error:", error);
      return NextResponse.json({ error: "Erro ao actualizar denúncia" }, { status: 500 });
    }

    let anuncioRemovido = false;
    if (status === "procedente" && body.removerAnuncio === true) {
      const { error: removerError } = await supabase
        .from("cavalos_venda")
        .update({
          status: "inativo",
          updated_at: new Date().toISOString(),
        })
        .eq("id", denuncia.cavalo_id);

      if (removerError) {
        // The report is already resolved; report the partial outcome rather than
        // pretending the listing came down.
        logger.error("[admin/denuncias/PATCH] Failed to hide listing:", removerError);
      } else {
        anuncioRemovido = true;
      }
    }

    return NextResponse.json({ denuncia, anuncioRemovido });
  } catch (error) {
    logger.error("[admin/denuncias/PATCH] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
