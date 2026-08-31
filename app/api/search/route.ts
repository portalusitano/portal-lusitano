import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-admin";
import { apiLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { sanitizeSearchInput } from "@/lib/sanitize";

interface SearchResult {
  id: string;
  type: "horse" | "product" | "article" | "event" | "stud" | "page";
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
      title_pt: "Eventos",
      title_en: "Events",
      url: "/eventos",
      keywords: ["eventos", "events", "concursos", "feiras", "leiloes"],
    },
    { title_pt: "Mapa", title_en: "Map", url: "/mapa", keywords: ["mapa", "map", "localização"] },
  ];

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
    const searchEvents = !typeFilter || typeFilter === "event";
    const searchStuds = !typeFilter || typeFilter === "stud";
    const perTypeLimit = typeFilter ? limit : 5;

    const [cavalosRes, eventosRes, coudelariasRes] = await Promise.allSettled([
      searchHorses
        ? supabase
            .from("cavalos_venda")
            .select("id, nome, descricao, imagens, slug")
            .eq("status", "active")
            .or(`nome.ilike.%${safeQ}%,descricao.ilike.%${safeQ}%`)
            .limit(perTypeLimit)
        : Promise.resolve({ data: null }),
      searchEvents
        ? supabase
            .from("eventos")
            .select("id, titulo, descricao, slug, imagem")
            .eq("status", "active")
            .or(`titulo.ilike.%${safeQ}%,descricao.ilike.%${safeQ}%`)
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

    // Cavalos
    if (cavalosRes.status === "fulfilled" && cavalosRes.value.data) {
      for (const c of cavalosRes.value.data) {
        results.push({
          id: `horse-${c.id}`,
          type: "horse",
          title: c.nome,
          description: c.descricao?.substring(0, 100),
          url: `/comprar/${c.slug || c.id}`,
          image: Array.isArray(c.imagens) ? c.imagens[0] : undefined,
        });
      }
    }

    // Eventos
    if (eventosRes.status === "fulfilled" && eventosRes.value.data) {
      for (const e of eventosRes.value.data) {
        results.push({
          id: `event-${e.id}`,
          type: "event",
          title: e.titulo,
          description: e.descricao?.substring(0, 100),
          url: `/eventos/${e.slug || e.id}`,
          image: e.imagem,
        });
      }
    }

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
