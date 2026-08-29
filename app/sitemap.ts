import { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase-admin";
import { LISTING_STATUS, filtroNaoExpirado } from "@/lib/marketplace-listings";
import { logger } from "@/lib/logger";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://portal-lusitano.pt";

/** Adds hreflang alternates for PT / EN / ES to a sitemap entry. */
function withAlternates(
  path: string,
  entry: Omit<MetadataRoute.Sitemap[number], "url" | "alternates">
): MetadataRoute.Sitemap[number] {
  const cleanPath = path === "/" ? "" : path;
  return {
    ...entry,
    url: `${siteUrl}${path}`,
    alternates: {
      languages: {
        "pt-PT": `${siteUrl}${path}`,
        "en-US": `${siteUrl}/en${cleanPath}`,
        "es-ES": `${siteUrl}/es${cleanPath}`,
      },
    },
  };
}

/**
 * Sitemap for the Lusitano marketplace.
 *
 * Listings carry the highest priority after the two entry points: they are the
 * pages that answer a buyer's search, and they turn over constantly. Account
 * pages are deliberately absent — they are noindex and private.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentDate = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    withAlternates("/", { lastModified: currentDate, changeFrequency: "daily", priority: 1 }),
    withAlternates("/comprar", {
      lastModified: currentDate,
      changeFrequency: "hourly",
      priority: 0.95,
    }),
    withAlternates("/vender-cavalo", {
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
    }),
    withAlternates("/directorio", {
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
    withAlternates("/eventos", {
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.7,
    }),
    withAlternates("/mapa", {
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.6,
    }),
    withAlternates("/sobre", {
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.5,
    }),
    withAlternates("/faq", {
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.5,
    }),
    withAlternates("/contacto", {
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.4,
    }),
    withAlternates("/termos", {
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.2,
    }),
    withAlternates("/privacidade", {
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.2,
    }),
  ];

  const [cavalosResult, coudelariasResult, eventosResult] = await Promise.allSettled([
    supabase
      .from("cavalos_venda")
      .select("id, updated_at, created_at")
      .in("status", [LISTING_STATUS.ACTIVE, LISTING_STATUS.RESERVADO])
      .or(filtroNaoExpirado()),
    supabase.from("coudelarias").select("slug, updated_at"),
    supabase.from("eventos").select("slug, updated_at").eq("status", "active"),
  ]);

  let cavalosPages: MetadataRoute.Sitemap = [];
  if (cavalosResult.status === "fulfilled" && cavalosResult.value.data) {
    cavalosPages = cavalosResult.value.data.map((c) =>
      withAlternates(`/comprar/${c.id}`, {
        lastModified: c.updated_at || c.created_at || currentDate,
        changeFrequency: "daily",
        priority: 0.85,
      })
    );
  } else if (cavalosResult.status === "rejected") {
    logger.error("Erro ao buscar cavalos para sitemap:", cavalosResult.reason);
  }

  let coudelariasPages: MetadataRoute.Sitemap = [];
  if (coudelariasResult.status === "fulfilled" && coudelariasResult.value.data) {
    coudelariasPages = coudelariasResult.value.data
      .filter((c) => c.slug)
      .map((c) =>
        withAlternates(`/directorio/${c.slug}`, {
          lastModified: c.updated_at || currentDate,
          changeFrequency: "weekly",
          priority: 0.6,
        })
      );
  } else if (coudelariasResult.status === "rejected") {
    logger.error("Erro ao buscar coudelarias para sitemap:", coudelariasResult.reason);
  }

  let eventosPages: MetadataRoute.Sitemap = [];
  if (eventosResult.status === "fulfilled" && eventosResult.value.data) {
    eventosPages = eventosResult.value.data
      .filter((e) => e.slug)
      .map((e) =>
        withAlternates(`/eventos/${e.slug}`, {
          lastModified: e.updated_at || currentDate,
          changeFrequency: "weekly",
          priority: 0.5,
        })
      );
  } else if (eventosResult.status === "rejected") {
    logger.error("Erro ao buscar eventos para sitemap:", eventosResult.reason);
  }

  return [...staticPages, ...cavalosPages, ...coudelariasPages, ...eventosPages];
}
