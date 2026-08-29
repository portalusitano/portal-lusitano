import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { verifySession } from "@/lib/auth";
import { rotuloMotivo } from "@/lib/denuncias";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/denuncias
 *
 * The moderation queue. Pending reports first and oldest first within that, so
 * the report waiting longest is the one at the top.
 */
export async function GET(request: NextRequest) {
  try {
    const email = await verifySession();
    if (!email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pendente";

    let query = supabase
      .from("cavalos_venda_denuncias")
      .select("*")
      .order("created_at", { ascending: true });

    if (status !== "todas") {
      query = query.eq("status", status);
    }

    const { data: denuncias, error } = await query;

    if (error) {
      logger.error("[admin/denuncias/GET] Supabase error:", error);
      return NextResponse.json({ error: "Erro ao carregar denúncias" }, { status: 500 });
    }

    if (!denuncias || denuncias.length === 0) {
      return NextResponse.json({ denuncias: [] });
    }

    // Listings fetched separately — same reason as the inbox: no reliance on
    // PostgREST relationship embedding.
    const cavaloIds = [...new Set(denuncias.map((d) => d.cavalo_id))];
    const { data: cavalos } = await supabase
      .from("cavalos_venda")
      .select("id, nome, nome_cavalo, slug, status, vendedor_email, vendedor_nome")
      .in("id", cavaloIds);

    const porCavalo = new Map((cavalos || []).map((c) => [c.id, c]));

    return NextResponse.json({
      denuncias: denuncias.map((d) => {
        const cavalo = porCavalo.get(d.cavalo_id) as Record<string, unknown> | undefined;
        return {
          id: d.id,
          cavaloId: d.cavalo_id,
          cavaloNome:
            (cavalo?.nome as string) || (cavalo?.nome_cavalo as string) || "Anúncio removido",
          cavaloStatus: (cavalo?.status as string) || null,
          vendedorNome: (cavalo?.vendedor_nome as string) || null,
          vendedorEmail: (cavalo?.vendedor_email as string) || null,
          motivo: d.motivo,
          motivoLabel: rotuloMotivo(d.motivo),
          detalhe: d.detalhe,
          status: d.status,
          anonima: !d.denunciante_id,
          createdAt: d.created_at,
          notaInterna: d.nota_interna,
        };
      }),
    });
  } catch (error) {
    logger.error("[admin/denuncias/GET] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
