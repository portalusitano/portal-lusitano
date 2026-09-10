/**
 * Server-side i18n utilities
 *
 * Permite usar traduções em Server Components e gerar
 * metadata SEO na língua correcta.
 */

export const locales = ["pt", "en", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "pt";

/**
 * Dicionários de SEO metadata para cada locale.
 * Usados em generateMetadata() dos Server Components.
 */
const seoMetadata: Record<
  Locale,
  {
    siteName: string;
    siteDescription: string;
    ogLocale: string;
    keywords: string[];
  }
> = {
  pt: {
    siteName: "Portal Lusitano | Cavalos Lusitanos de Elite",
    siteDescription:
      "Classificados de cavalos Puro Sangue Lusitano em Portugal, com directório de coudelarias, mapa e calendário de eventos.",
    ogLocale: "pt_PT",
    keywords: [
      "cavalo lusitano",
      "cavalos portugueses",
      "equitação",
      "dressage",
      "coudelaria",
      "PRE",
      "cavalo ibérico",
      "comprar cavalo",
      "equestre portugal",
    ],
  },
  en: {
    siteName: "Portal Lusitano | Elite Lusitano Horses",
    siteDescription:
      "Classified ads for Puro Sangue Lusitano horses in Portugal, with a directory of stud farms, a map and an events calendar.",
    ogLocale: "en_US",
    keywords: [
      "lusitano horse",
      "portuguese horses",
      "equestrian",
      "dressage",
      "stud farm",
      "PRE",
      "iberian horse",
      "buy horse",
      "equestrian portugal",
    ],
  },
  es: {
    siteName: "Portal Lusitano | Caballos Lusitanos de Elite",
    siteDescription:
      "Anuncios clasificados de caballos Puro Sangue Lusitano en Portugal, con directorio de yeguadas, mapa y calendario de eventos.",
    ogLocale: "es_ES",
    keywords: [
      "caballo lusitano",
      "caballos portugueses",
      "ecuestre",
      "doma clasica",
      "yeguada",
      "PRE",
      "caballo iberico",
      "comprar caballo",
      "ecuestre portugal",
    ],
  },
};

export function getSEOMetadata(locale: Locale) {
  return seoMetadata[locale];
}

/**
 * Detectar locale a partir do pathname
 */
export function getLocaleFromPathname(pathname: string): Locale {
  if (pathname.startsWith("/en/") || pathname === "/en") {
    return "en";
  }
  if (pathname.startsWith("/es/") || pathname === "/es") {
    return "es";
  }
  return defaultLocale;
}

/**
 * Gerar hreflang links para SEO
 */
export function getAlternateLinks(pathname: string, siteUrl: string) {
  // Remover prefixo /en/ ou /es/ se existir
  const cleanPath = pathname.replace(/^\/(en|es)/, "") || "/";

  return {
    "pt-PT": `${siteUrl}${cleanPath}`,
    "en-US": `${siteUrl}/en${cleanPath === "/" ? "" : cleanPath}`,
    "es-ES": `${siteUrl}/es${cleanPath === "/" ? "" : cleanPath}`,
    "x-default": `${siteUrl}${cleanPath}`,
  };
}

/**
 * Verificar se um locale é válido
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}
