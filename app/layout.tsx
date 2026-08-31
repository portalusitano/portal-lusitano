import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Providers } from "./providers";
import { OrganizationSchema, WebsiteSchema } from "@/components/JsonLd";
import SkipLinks from "@/components/SkipLinks";
import ClientShell from "@/components/ClientShell";

// Geist em toda a interface. O peso 400 chega para quase tudo, títulos
// grandes incluídos — é a moderação do peso que dá o ar caro, não o serif.
// `--font-serif` continua a existir e a apontar para a Geist: havia dezenas
// de `font-serif` espalhados pelo site e trocá-los todos de uma vez era mais
// arriscado do que deixar o nome a resolver para a fonte certa.
const geist = Geist({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-geist",
  display: "swap",
  preload: true,
});

// Números, identificadores e dados tabelados. Alinham em coluna e distinguem-se
// do texto corrido — é o que faz uma tabela de anúncios ler-se de relance.
const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-geist-mono",
  display: "swap",
  preload: true,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://portal-lusitano.pt";

export const viewport: Viewport = {
  themeColor: "#c6a15b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Portal Lusitano",
  },
  metadataBase: new URL(siteUrl),
  title: {
    default: "Portal Lusitano | Cavalos Lusitanos de Elite",
    template: "%s | Portal Lusitano",
  },
  description:
    "O maior marketplace de cavalos Lusitanos em Portugal. Compre cavalos PSL certificados, explore coudelarias, linhagens, eventos equestres e glossário gratuito.",
  keywords: [
    "cavalo lusitano",
    "comprar cavalo lusitano",
    "cavalos lusitanos à venda portugal",
    "cavalo lusitano preço",
    "coudelaria lusitano",
    "cavalo ibérico",
    "lusitano dressage",
    "lusitano working equitation",
    "garanhão lusitano",
    "linhagem lusitano veiga",
    "cavalos portugueses",
    "equestre portugal",
  ],
  authors: [{ name: "Portal Lusitano" }],
  creator: "Portal Lusitano",
  publisher: "Portal Lusitano",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "pt_PT",
    alternateLocale: ["en_GB", "es_ES"],
    url: siteUrl,
    siteName: "Portal Lusitano",
    title: "Portal Lusitano | Cavalos Lusitanos de Elite",
    description:
      "Marketplace premium de cavalos Lusitanos. Loja equestre, coudelarias certificadas e arquivo editorial.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Portal Lusitano - Cavalos Lusitanos de Elite",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Portal Lusitano | Cavalos Lusitanos de Elite",
    description:
      "Marketplace premium de cavalos Lusitanos. Loja equestre, coudelarias certificadas e arquivo editorial.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "google19f6731f9a1a4711",
  },
  alternates: {
    canonical: siteUrl,
    languages: {
      "pt-PT": siteUrl,
      "en-US": `${siteUrl}/en`,
      "es-ES": `${siteUrl}/es`,
      "x-default": siteUrl,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Layout is synchronous (no headers() call) so Next.js can statically cache pages
  // with ISR. The CSP uses 'unsafe-inline' for scripts (no nonces) to allow the
  // theme-detection script and Next.js RSC inline scripts to execute.

  return (
    <html
      lang="pt"
      className={`${geist.variable} ${geistMono.variable} dark`}
      // O script inline em <head> acrescenta `js` e, se for o caso, `light`
      // antes da primeira pintura. O React renderiza sem elas e acusava
      // incompatibilidade de hidratação em todas as páginas.
      suppressHydrationWarning
    >
      <head>
        {/* Corre antes da primeira pintura. Além do tema, marca `.js`, que é
            o que arma o estado inicial das animações de entrada: pô-la só na
            hidratação faria o conteúdo acima da dobra aparecer e voltar a
            desaparecer antes de ser revelado. */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement;try{var t=localStorage.getItem('portal-lusitano-theme');if(t==='light'){d.classList.remove('dark');d.classList.add('light')}}catch(e){}d.classList.add('js')})()`,
          }}
        />
        {/* Preconnect para recursos críticos — reduz latência de first requests */}
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.sanity.io" crossOrigin="anonymous" />
        <link
          rel="preconnect"
          href="https://yrfcepsagtzkxwnnrztd.supabase.co"
          crossOrigin="anonymous"
        />
        {/* dns-prefetch para recursos secundários */}
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
        <link rel="dns-prefetch" href="https://ofrzpaxa.api.sanity.io" />
        <OrganizationSchema />
        <WebsiteSchema />
      </head>
      <body className="bg-[var(--background)] text-[var(--foreground)] antialiased">
        <Providers>
          <SkipLinks />
          <ClientShell />
          <Navbar />
          <main id="main-content">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
