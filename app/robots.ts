import { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://portal-lusitano.pt";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/minha-conta/",
          "/login",
          "/registar",
          "/sucesso",
          "/offline",
          "/unsubscribe",
          "/cavalos-favoritos",
          "/favoritos",
          "/studio/",
          "/directorio/registar",
          "/resultado/",
        ],
      },
      // AI scrapers — bloquear conteúdo editorial
      { userAgent: "GPTBot", disallow: ["/"] },
      { userAgent: "CCBot", disallow: ["/"] },
      { userAgent: "Google-Extended", disallow: ["/"] },
      { userAgent: "anthropic-ai", disallow: ["/"] },
      { userAgent: "Claude-Web", disallow: ["/"] },
      { userAgent: "PerplexityBot", disallow: ["/"] },
      { userAgent: "Bytespider", disallow: ["/"] },
      { userAgent: "PetalBot", disallow: ["/"] },
      { userAgent: "meta-externalagent", disallow: ["/"] },
      { userAgent: "Amazonbot", disallow: ["/"] },
      { userAgent: "Applebot-Extended", disallow: ["/"] },
      { userAgent: "cohere-ai", disallow: ["/"] },
      { userAgent: "omgili", disallow: ["/"] },
      { userAgent: "Diffbot", disallow: ["/"] },
      { userAgent: "ImagesiftBot", disallow: ["/"] },
      { userAgent: "YouBot", disallow: ["/"] },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
