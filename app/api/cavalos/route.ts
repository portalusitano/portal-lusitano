import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";
import { sanitizeSearchInput } from "@/lib/sanitize";
import { filtroNaoExpirado } from "@/lib/marketplace-listings";

// GET - Listar cavalos à venda
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sexo = searchParams.get("sexo");
    const regiao = searchParams.get("regiao");
    const precoMin = searchParams.get("precoMin");
    const precoMax = searchParams.get("precoMax");
    const nivel = searchParams.get("nivel");
    const disciplina = searchParams.get("disciplina");
    const search = searchParams.get("search");

    let query = supabase
      .from("cavalos_venda")
      .select(
        "id, nome, slug, sexo, idade, preco, regiao, nivel_treino, disciplinas, raca, foto_principal, fotos, destaque, created_at, coudelarias(nome, slug)"
      )
      .eq("status", "active")
      .or(filtroNaoExpirado())
      .order("destaque", { ascending: false })
      .order("created_at", { ascending: false });

    if (sexo && sexo !== "todos") {
      query = query.eq("sexo", sexo);
    }

    if (regiao && regiao !== "Todas") {
      query = query.eq("regiao", regiao);
    }

    if (precoMin) {
      query = query.gte("preco", parseFloat(precoMin));
    }

    if (precoMax) {
      query = query.lte("preco", parseFloat(precoMax));
    }

    if (nivel && nivel !== "todos") {
      query = query.eq("nivel_treino", nivel);
    }

    if (disciplina && disciplina !== "todas") {
      query = query.contains("disciplinas", [disciplina]);
    }

    if (search) {
      const safeSearch = sanitizeSearchInput(search);
      query = query.or(`nome.ilike.%${safeSearch}%,descricao.ilike.%${safeSearch}%`);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Erro ao buscar cavalos:", error);
      return NextResponse.json({ error: "Erro ao buscar cavalos" }, { status: 500 });
    }

    return NextResponse.json(
      { cavalos: data },
      {
        headers: {
          // Marketplace listings — cache 60s at CDN, serve stale up to 5 min while revalidating
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    logger.error("Erro:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
