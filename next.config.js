import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker: generates .next/standalone with self-contained server
  // Without this the Dockerfile COPY .next/standalone step silently produces an empty dir
  output: "standalone",

  // Catch performance/hydration bugs in development before they reach production
  reactStrictMode: true,

  // Prevent static page generation from hanging on slow data fetches
  staticPageGenerationTimeout: 120,

  experimental: {
    // Inline critical CSS into HTML — eliminates the render-blocking CSS request
    // that normally adds a full network round-trip before first paint.
    // Especially impactful on mobile and slow connections.
    inlineCss: true,

    // Tree-shake icon and component libraries — biggest single bundle win.
    // Next.js 14.1+ rewrites these imports to per-file paths at compile time,
    // eliminating the barrel-file cost without any call-site changes.
    optimizePackageImports: [
      "lucide-react",
      "@sanity/icons",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "@portabletext/react",
      "@react-email/components",
      "@supabase/supabase-js",
      "@supabase/ssr",
      "clsx",
      "tailwind-merge",
      "zod",
      "jose",
      "@sentry/nextjs",
      "@stripe/stripe-js",
      "web-vitals",
    ],

    // Restore scroll position on browser back/forward navigation,
    // giving instant perceived performance for return visits.
    scrollRestoration: true,

    // Client-side Router Cache: keep visited pages cached so back/forward
    // and re-navigations feel instant (0ms). Default is 0s for dynamic
    // and 300s for static — we extend dynamic to 180s for snappier UX.
    staleTimes: {
      dynamic: 180,
      static: 300,
    },
  },

  // Keep heavy server-only packages out of the client bundle.
  // These are only used in API routes / server components.
  serverExternalPackages: [
    "@react-pdf/renderer",
    "resend",
    "sanitize-html",
    "sharp",
    "jspdf",
    "jspdf-autotable",
    "html2canvas",
    "sanity",
    "next-sanity",
    "@sanity/vision",
  ],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "yrfcepsagtzkxwnnrztd.supabase.co",
      },
    ],
    // Prefer modern formats for smaller payloads
    formats: ["image/avif", "image/webp"],
    // Explicit device breakpoints — avoids unnecessary intermediate sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // Explicit image sizes for fixed-width images (avatars, thumbnails, etc.)
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    // Cache processed images for 30 days on the server — avoids re-processing
    // on every cold start. Default is 60s which causes excessive reprocessing.
    minimumCacheTTL: 2592000,
  },

  // Compress responses
  compress: true,

  // Strict powered-by removal (minor security + saves bytes)
  poweredByHeader: false,

  // Redirects para URLs antigos (blog -> jornal, IDs numéricos -> slugs)
  async redirects() {
    return [
      {
        source: "/blog",
        destination: "/jornal",
        permanent: true,
      },
      {
        source: "/blog/:slug",
        destination: "/jornal/:slug",
        permanent: true,
      },
      {
        source: "/jornal/1",
        destination: "/jornal/genese-cavalo-iberico",
        permanent: true,
      },
      {
        source: "/jornal/2",
        destination: "/jornal/biomecanica-reuniao",
        permanent: true,
      },
      {
        source: "/jornal/3",
        destination: "/jornal/standard-apsl",
        permanent: true,
      },
      {
        source: "/jornal/4",
        destination: "/jornal/genetica-pelagens",
        permanent: true,
      },
      {
        source: "/jornal/5",
        destination: "/jornal/toricidade-selecao-combate",
        permanent: true,
      },
      {
        source: "/jornal/6",
        destination: "/jornal/novilheiro-rubi-revolucao-olimpica",
        permanent: true,
      },
      // Rotas duplicadas → canónicas
      {
        source: "/favoritos",
        destination: "/cavalos-favoritos",
        permanent: true,
      },
      {
        source: "/vender",
        destination: "/vender-cavalo",
        permanent: true,
      },
      {
        source: "/marketplace",
        destination: "/comprar",
        permanent: true,
      },
      {
        source: "/coudelarias",
        destination: "/directorio",
        permanent: true,
      },
    ];
  },

  // Security + Performance Headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
          // O CSP é posto no middleware.ts. Não leva nonces — não pode, com
          // App Router e ISR: o nonce é por pedido e a página em cache é a
          // mesma para toda a gente. Ver CSP_NONCE_IMPLEMENTATION.md.
        ],
      },
      // API routes: individual routes set their own Cache-Control headers
      // (e.g. /api/cavalos → 60s, /api/search → 30s, /api/coudelarias → 30min).
      // Mutation/auth routes explicitly set no-store in their handlers.
      // A blanket no-store here would OVERRIDE all per-route caching.
      // Cache static assets — immutable em prod, revalidável em dev
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              process.env.NODE_ENV === "production"
                ? "public, max-age=31536000, immutable"
                : "public, max-age=0, must-revalidate",
          },
        ],
      },
      // Cache icons for 1 year
      {
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Cache fonts for 1 year
      {
        source: "/:path*.woff2",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Service worker - short cache so updates propagate fast
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      // Manifest - cache 1 day
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
      // Sitemap e robots - cache 24h
      {
        source: "/sitemap.xml",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=3600",
          },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
      // Next.js static chunks — content-hashed filenames make these truly
      // immutable, so 1 year is safe and eliminates all repeat-visit overhead
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
