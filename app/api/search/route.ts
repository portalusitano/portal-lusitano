import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-admin";
import { apiLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { sanitizeSearchInput } from "@/lib/sanitize";

interface SearchResult {
  id: string;
  type: "horse" | "product" | "article" | "stud" | "page";
  title: string;
  description?: string;
  url: string;
  image?: string;
}

// Páginas estáticas pesquisáveis
const STATIC_PAGES: Array<{ title_pt: string; title_en: string; url: string; keywords: string[] }> =
  [
    {
      title_pt: "Comprar cavalo",
      title_en: "Buy a horse",
      url: "/comprar",
      keywords: ["comprar", "buy", "cavalo", "horse", "marketplace", "venda", "anuncios"],
    },
    {
      title_pt: "Vender cavalo",
      title_en: "Sell a horse",
      url: "/vender-cavalo",
      keywords: ["vender", "sell", "anunciar", "anuncio", "publicar"],
    },
    {
      title_pt: "Coudelarias",
      title_en: "Stud Farms",
      url: "/directorio",
      keywords: ["coudelarias", "studs", "criadores", "directorio", "directory"],
    },
    {
      title_pt: "Mapa",
      title_en: "Map",
      url: "/mapa",
      keywords: ["mapa", "map", "localização"],
    },
  ];

/**
 * Escreve no log a razão por que uma das consultas não trouxe nada.
 * O `Promise.allSettled` cumpre-se mesmo quando o PostgREST devolve erro — nesse
 * caso `data` vem a `null` e a categoria inteira sai dos resultados sem deixar
 * rasto. Um ecrã de pesquisa vazio que devia ser um erro é uma mentira.
 */
function registarFalha(
  tabela: string,
  resultado: PromiseSettledResult<{ data?: unknown; error?: unknown }>
) {
  if (resultado.status === "rejected") {
    logger.error(`[search] consulta a ${tabela} rejeitada:`, resultado.reason);
    return;
  }
  if (resultado.value?.error) {
    logger.error(`[search] consulta a ${tabela} falhou:`, resultado.value.error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    try {
      await apiLimiter.check(30, ip);
    } catch {
      return NextResponse.json({ error: "Demasiados pedidos" }, { status: 429 });
    }
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "12"), 30);
    const typeFilter = searchParams.get("type"); // horse, event, stud, page, or null for all

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const safeQ = sanitizeSearchInput(q);
    const searchTerm = q.toLowerCase();
    const results: SearchResult[] = [];

    // Pesquisar em paralelo: Supabase tables + páginas estáticas
    // Só pesquisa nas tabelas relevantes se não houver filtro de tipo, ou se o filtro corresponder
    const searchHorses = !typeFilter || typeFilter === "horse";
    const searchStuds = !typeFilter || typeFilter === "stud";
    const perTypeLimit = typeFilter ? limit : 5;

    const [cavalosRes, coudelariasRes] = await Promise.allSettled([
      searchHorses
        ? supabase
            .from("cavalos_venda")
            .select("id, nome, descricao, foto_principal, fotos, slug")
            .eq("status", "active")
            .or(`nome.ilike.%${safeQ}%,descricao.ilike.%${safeQ}%`)
            .limit(perTypeLimit)
        : Promise.resolve({ data: null }),
      searchStuds
        ? supabase
            .from("coudelarias")
            .select("id, nome, descricao, slug, logo")
            .eq("status", "active")
            .or(`nome.ilike.%${safeQ}%,descricao.ilike.%${safeQ}%`)
            .limit(perTypeLimit)
        : Promise.resolve({ data: null }),
    ]);

    // Uma consulta falhada não é uma consulta sem resultados. Sem isto, um erro
    // de coluna ou de rede lê-se como «não há nada» — e foi assim que os
    // cavalos desapareceram da pesquisa em silêncio.
    registarFalha("cavalos_venda", cavalosRes);
    registarFalha("coudelarias", coudelariasRes);

    // Cavalos
    if (cavalosRes.status === "fulfilled" && cavalosRes.value.data) {
      for (const c of cavalosRes.value.data) {
        results.push({
          id: `horse-${c.id}`,
          type: "horse",
          title: c.nome,
          description: c.descricao?.substring(0, 100),
          // `/comprar/[id]` procura mesmo por `id` (`.eq("id", …)` numa coluna
          // uuid). Passar-lhe o slug dava 404 em todos os cavalos da pesquisa —
          // e o slug existe sempre, porque o webhook do Stripe gera um. Todos
          // os outros sítios do site (grelha, favoritos, sitemap, alertas,
          // `generateStaticParams`) ligam por `id`.
          url: `/comprar/${c.id}`,
          image: c.foto_principal || (Array.isArray(c.fotos) ? c.fotos[0] : undefined),
        });
      }
    }

    // Eventos

    // Coudelarias
    if (coudelariasRes.status === "fulfilled" && coudelariasRes.value.data) {
      for (const s of coudelariasRes.value.data) {
        results.push({
          id: `stud-${s.id}`,
          type: "stud",
          title: s.nome,
          description: s.descricao?.substring(0, 100),
          url: `/directorio/${s.slug || s.id}`,
          image: s.logo,
        });
      }
    }

    // Páginas estáticas (só se não houver filtro de tipo, ou filtro = page)
    if (!typeFilter || typeFilter === "page") {
      for (const page of STATIC_PAGES) {
        const matches =
          page.title_pt.toLowerCase().includes(searchTerm) ||
          page.title_en.toLowerCase().includes(searchTerm) ||
          page.keywords.some((k) => k.includes(searchTerm) || searchTerm.includes(k));
        if (matches) {
          results.push({
            id: `page-${page.url}`,
            type: "page",
            title: page.title_pt,
            url: page.url,
          });
        }
      }
    }

    // Limitar resultados
    return NextResponse.json(
      { results: results.slice(0, limit) },
      {
        headers: {
          // Search results are query-specific — short CDN cache, Vary ensures per-query caching
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
          Vary: "Accept-Encoding",
        },
      }
    );
  } catch (error) {
    logger.error("Erro na pesquisa:", error);
    return NextResponse.json({ error: "Erro na pesquisa" }, { status: 500 });
  }
}
