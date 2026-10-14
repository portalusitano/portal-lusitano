import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/seller-auth";
import { motivoValido, MAX_DETALHE } from "@/lib/denuncias";
import { strictLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * POST /api/cavalos/[id]/denuncia
 *
 * Reports a listing to the moderation queue.
 *
 * Signing in is not required — a visitor who spots a scam should not have to
 * create an account first — but anonymous reports are rate limited by IP,
 * because without an account there is no unique constraint stopping someone
 * flooding the queue.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corpo do pedido inválido" }, { status: 400 });
    }

    if (!motivoValido(body.motivo)) {
      return NextResponse.json({ error: "Indique um motivo válido" }, { status: 400 });
    }

    let detalhe: string | null = null;
    if (typeof body.detalhe === "string" && body.detalhe.trim() !== "") {
      detalhe = body.detalhe.trim().slice(0, MAX_DETALHE);
    }

    const { data: cavalo } = await supabaseAdmin
      .from("cavalos_venda")
      .select("id, nome")
      .eq("id", id)
      .maybeSingle();

    if (!cavalo) {
      return NextResponse.json({ error: "Anúncio não encontrado" }, { status: 404 });
    }

    const user = await getAuthenticatedUser();

    if (!user) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      try {
        await strictLimiter.check(3, `denuncia:${ip}`);
      } catch {
        return NextResponse.json(
          { error: "Demasiadas denúncias. Tente novamente mais tarde." },
          { status: 429 }
        );
      }
    }

    const { error } = await supabaseAdmin.from("cavalos_venda_denuncias").insert({
      cavalo_id: id,
      denunciante_id: user?.id ?? null,
      motivo: body.motivo,
      detalhe,
    });

    if (error) {
      // 23505: this account already reported this listing. Reporting twice is
      // not an error worth showing — the queue already has the report.
      if (error.code === "23505") {
        return NextResponse.json({ sucesso: true, jaDenunciado: true });
      }
      logger.error("[denuncia/POST] Supabase error:", error);
      return NextResponse.json({ error: "Erro ao enviar denúncia" }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true }, { status: 201 });
  } catch (error) {
    logger.error("[denuncia/POST] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
