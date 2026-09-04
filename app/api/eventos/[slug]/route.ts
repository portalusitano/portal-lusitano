import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

// GET - Buscar evento por slug
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const { data: evento, error } = await supabase
      .from("eventos")
      .select(
        "id, titulo, slug, descricao, descricao_completa, tipo, data_inicio, data_fim, hora_inicio, hora_fim, localizacao, regiao, organizador, website, preco_entrada, imagem_capa, tags, destaque, confirmado, views_count"
      )
      .eq("slug", slug)
      .single();

    if (error || !evento) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    // Incrementar views (fire-and-forget — não bloqueia a resposta).
    //
    // A leitura acima é com a chave anónima, que é o que se quer: é conteúdo
    // público. A escrita **não** pode ser, senão a tabela tem de aceitar UPDATE
    // de qualquer visitante — e um UPDATE não se pode restringir a uma coluna
    // por RLS, portanto quem pudesse somar uma visita podia reescrever o
    // evento inteiro. Contar visitas é trabalho do servidor.
    supabaseAdmin
      .from("eventos")
      .update({ views_count: (evento.views_count || 0) + 1 })
      .eq("id", evento.id)
      .then(({ error: updateErr }) => {
        if (updateErr) logger.error("Failed to increment evento views:", updateErr);
      });

    // Buscar eventos relacionados (mesmo tipo, excluindo o atual)
    const { data: relacionados } = await supabase
      .from("eventos")
      .select("id, titulo, slug, tipo, data_inicio, localizacao, imagem_capa")
      .eq("tipo", evento.tipo)
      .neq("id", evento.id)
      .eq("status", "active")
      .gte("data_inicio", new Date().toISOString().split("T")[0])
      .order("data_inicio", { ascending: true })
      .limit(3);

    const response = NextResponse.json({
      evento,
      relacionados: relacionados || [],
    });
    response.headers.set(
      "Cache-Control",
      "public, max-age=900, s-maxage=900, stale-while-revalidate=3600"
    );
    return response;
  } catch (error) {
    logger.error("Erro:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
