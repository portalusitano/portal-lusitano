// Componentes de JSON-LD para SEO estruturado

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://portal-lusitano.pt";

// Schema da Organizacao
export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Portal Lusitano",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description:
      "Marketplace premium de cavalos Lusitanos. Loja equestre, leiloes exclusivos e arquivo editorial.",
    foundingDate: "2023",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["Portuguese", "English"],
    },
    sameAs: ["https://instagram.com/portal_lusitano", "https://tiktok.com/@portal_lusitano"],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Schema do Website
export function WebsiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Portal Lusitano",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/directorio?pesquisa={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Schema de Produto
interface ProductSchemaProps {
  name: string;
  description: string;
  image: string;
  price: string;
  currency?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
  sku?: string;
}

export function ProductSchema({
  name,
  description,
  image,
  price,
  currency = "EUR",
  availability = "InStock",
  sku,
}: ProductSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image,
    sku,
    brand: { "@type": "Brand", name: "Portal Lusitano" },
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
      seller: { "@type": "Organization", name: "Portal Lusitano" },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Schema de Artigo
interface ArticleSchemaProps {
  title: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  authorUrl?: string;
  newsArticle?: boolean; // true = NewsArticle (Google News eligible), false = Article genérico
  estimatedReadTime?: number; // em minutos
}

export function ArticleSchema({
  title,
  description,
  image,
  datePublished,
  dateModified,
  author = "Portal Lusitano",
  authorUrl,
  newsArticle = false,
  estimatedReadTime,
}: ArticleSchemaProps) {
  const isNamedAuthor = author !== "Portal Lusitano";
  const schema = {
    "@context": "https://schema.org",
    "@type": newsArticle ? "NewsArticle" : "Article",
    headline: title,
    description,
    image,
    datePublished,
    dateModified: dateModified || datePublished,
    author: isNamedAuthor
      ? { "@type": "Person", name: author, ...(authorUrl ? { url: authorUrl } : {}) }
      : { "@type": "Organization", name: "Portal Lusitano", url: siteUrl },
    publisher: {
      "@type": "Organization",
      name: "Portal Lusitano",
      logo: { "@type": "ImageObject", url: `${siteUrl}/logo.png` },
    },
    ...(estimatedReadTime ? { timeRequired: `PT${estimatedReadTime}M` } : {}),
    // SpeakableSpecification: permite ao Google Assistant ler partes do artigo em voz alta
    ...(newsArticle
      ? {
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: ["h1", "h2", ".article-intro", "article > p:first-of-type"],
          },
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Schema de Breadcrumb
interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Schema de FAQ
interface FAQItem {
  question: string;
  answer: string;
}

export function FAQSchema({ items }: { items: FAQItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Schema de Evento
interface EventSchemaProps {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location?: string;
  address?: string;
  image?: string;
  price?: string;
  organizer?: string;
}

export function EventSchema({
  name,
  description,
  startDate,
  endDate,
  location,
  address,
  image,
  price,
  organizer = "Portal Lusitano",
}: EventSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    description,
    startDate,
    endDate: endDate || startDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: location
      ? "https://schema.org/OfflineEventAttendanceMode"
      : "https://schema.org/OnlineEventAttendanceMode",
    location: location
      ? { "@type": "Place", name: location, address: address || location }
      : { "@type": "VirtualLocation", url: siteUrl },
    organizer: { "@type": "Organization", name: organizer, url: siteUrl },
    image,
    offers: price
      ? {
          "@type": "Offer",
          price: price === "Gratuito" ? "0" : price.replace(/[^0-9]/g, ""),
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
        }
      : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Schema de Local Business (para coudelarias)
interface LocalBusinessSchemaProps {
  name: string;
  description: string;
  address: string;
  telephone?: string;
  email?: string;
  website?: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
}

export function LocalBusinessSchema({
  name,
  description,
  address,
  telephone,
  email,
  website,
  image,
  rating,
  reviewCount,
}: LocalBusinessSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteUrl}/directorio/${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
    description,
    address: { "@type": "PostalAddress", addressLocality: address, addressCountry: "PT" },
    telephone,
    email,
    url: website || siteUrl,
    image,
    aggregateRating:
      rating && reviewCount
        ? {
            "@type": "AggregateRating",
            ratingValue: rating,
            reviewCount: reviewCount,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    priceRange: "€€€",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Schema de Cavalo à Venda
interface HorseSchemaProps {
  name: string;
  description: string;
  image?: string;
  price?: number;
  breed?: string;
  age?: number;
  color?: string;
  seller?: string;
  location?: string;
}

export function HorseSchema({
  name,
  description,
  image,
  price,
  breed = "Lusitano",
  age,
  color,
  seller,
  location,
}: HorseSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image,
    brand: { "@type": "Brand", name: breed },
    category: "Horses",
    additionalProperty: [
      age ? { "@type": "PropertyValue", name: "Age", value: `${age} years` } : null,
      color ? { "@type": "PropertyValue", name: "Color", value: color } : null,
      { "@type": "PropertyValue", name: "Breed", value: breed },
    ].filter(Boolean),
    offers: {
      "@type": "Offer",
      price: price || undefined,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: seller || "Portal Lusitano", address: location },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Schema de ItemList (para listas de itens - cavalos, ferramentas, etc.)
interface ItemListItem {
  name: string;
  description?: string;
  url?: string;
  image?: string;
}

export function ItemListSchema({
  name,
  description,
  items,
}: {
  name: string;
  description?: string;
  items: ItemListItem[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    description,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      description: item.description,
      url: item.url,
      image: item.image,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Schema de Pagina de Coleccao (para listagens)
interface CollectionPageSchemaProps {
  name: string;
  description: string;
  url: string;
}

export function CollectionPageSchema({ name, description, url }: CollectionPageSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url,
    isPartOf: { "@type": "WebSite", name: "Portal Lusitano", url: siteUrl },
    inLanguage: "pt-PT",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Schema de Aplicacao Web (para ferramentas)
interface WebApplicationSchemaProps {
  name: string;
  description: string;
  url: string;
}

export function WebApplicationSchema({ name, description, url }: WebApplicationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url,
    applicationCategory: "UtilityApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    provider: { "@type": "Organization", name: "Portal Lusitano", url: siteUrl },
    inLanguage: "pt-PT",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Schema de Pagina Medica (para piroplasmose)
export function MedicalWebPageSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: "Piroplasmose Equina — Guia Completo",
    description:
      "Guia completo sobre piroplasmose equina: prevalência em Portugal, impacto na exportação, diagnóstico, tratamento e prevenção.",
    url: `${siteUrl}/piroplasmose`,
    lastReviewed: "2026-02-01",
    about: {
      "@type": "MedicalCondition",
      name: "Piroplasmose Equina",
      alternateName: ["Equine Piroplasmosis", "Babesiose Equina"],
      associatedAnatomy: { "@type": "AnatomicalStructure", name: "Sangue (eritrócitos)" },
      cause: [
        { "@type": "InfectiveAgent", name: "Theileria equi" },
        { "@type": "InfectiveAgent", name: "Babesia caballi" },
      ],
    },
    medicalAudience: {
      "@type": "MedicalAudience",
      audienceType: "Veterinários, Proprietários de Cavalos",
    },
    inLanguage: "pt-PT",
    publisher: { "@type": "Organization", name: "Portal Lusitano", url: siteUrl },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Schema DefinedTermSet (para glossários — ajuda Google a identificar definições)
interface DefinedTerm {
  name: string;
  description: string;
  alternateName?: string;
}

export function DefinedTermSetSchema({
  name,
  description,
  url,
  terms,
}: {
  name: string;
  description: string;
  url: string;
  terms: DefinedTerm[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name,
    description,
    url,
    inLanguage: "pt-PT",
    publisher: { "@type": "Organization", name: "Portal Lusitano", url: siteUrl },
    hasDefinedTerm: terms.map((term) => ({
      "@type": "DefinedTerm",
      name: term.name,
      description: term.description,
      inDefinedTermSet: url,
      ...(term.alternateName ? { alternateName: term.alternateName } : {}),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Schema de Livro (para ebook)
export function BookSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: "Introdução ao Cavalo Lusitano",
    description:
      "O guia essencial para quem quer conhecer a raça mais nobre da Península Ibérica. História, linhagens, cuidados e dicas para compradores.",
    author: { "@type": "Organization", name: "Portal Lusitano" },
    publisher: { "@type": "Organization", name: "Portal Lusitano" },
    inLanguage: "pt",
    bookFormat: "https://schema.org/EBook",
    isAccessibleForFree: true,
    numberOfPages: 30,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/ebook-gratis`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Schema de Oferta para eBook Grátis (lead magnet — melhora CTR com "Free" em SERPs)
export function EbookOfferSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: "Introdução ao Cavalo Lusitano — eBook Gratuito",
    description:
      "Guia gratuito em formato digital sobre o cavalo Lusitano: história, linhagens, cuidados e dicas para compradores.",
    price: "0",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    url: `${siteUrl}/ebook-gratis`,
    offeredBy: { "@type": "Organization", name: "Portal Lusitano", url: siteUrl },
    eligibleRegion: { "@type": "Place", name: "Worldwide" },
    category: "EBook",
    itemOffered: {
      "@type": "Book",
      name: "Introdução ao Cavalo Lusitano",
      bookFormat: "https://schema.org/EBook",
      inLanguage: "pt",
      numberOfPages: 30,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Schema de AboutPage (E-E-A-T — sinaliza credibilidade e autoridade ao Google)
export function AboutPageSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Sobre o Portal Lusitano",
    url: `${siteUrl}/sobre`,
    description:
      "O Portal Lusitano é a plataforma digital mais completa dedicada ao cavalo Lusitano. Marketplace, directório de coudelarias, ferramentas equestres e arquivo editorial.",
    mainEntity: {
      "@type": "Organization",
      name: "Portal Lusitano",
      url: siteUrl,
      logo: `${siteUrl}/logo.png`,
      foundingDate: "2023",
      description:
        "Marketplace premium de cavalos Lusitanos. Loja equestre, directório de coudelarias certificadas e arquivo editorial especializado.",
      location: {
        "@type": "Place",
        name: "Portugal",
        address: { "@type": "PostalAddress", addressCountry: "PT" },
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        availableLanguage: ["Portuguese", "English", "Spanish"],
      },
      sameAs: ["https://instagram.com/portal_lusitano", "https://tiktok.com/@portal_lusitano"],
      knowsAbout: [
        "Cavalo Lusitano",
        "Dressage",
        "Working Equitation",
        "Atrelagem",
        "Genealogia Equina",
        "Raça PSL",
        "Alta Escola",
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Schema de VideoObject (para cavalos com vídeo — melhora presença nos resultados de pesquisa)
interface VideoObjectSchemaProps {
  name: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  uploadDate?: string;
  duration?: string; // formato ISO 8601: PT2M30S
}

export function VideoObjectSchema({
  name,
  description,
  videoUrl,
  thumbnailUrl,
  uploadDate,
  duration,
}: VideoObjectSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name,
    description,
    contentUrl: videoUrl,
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    ...(uploadDate ? { uploadDate } : {}),
    ...(duration ? { duration } : {}),
    publisher: { "@type": "Organization", name: "Portal Lusitano", url: siteUrl },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Schema de EducationalArticle (para conteúdo académico — genealogia, linhagens)
interface EducationalArticleSchemaProps {
  name: string;
  description: string;
  url: string;
  keywords?: string[];
  educationalLevel?: "Beginner" | "Intermediate" | "Advanced";
}

export function EducationalArticleSchema({
  name,
  description,
  url,
  keywords = [],
  educationalLevel = "Advanced",
}: EducationalArticleSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name,
    description,
    url,
    educationalLevel,
    educationalUse: "Reference",
    keywords: keywords.join(", "),
    learningResourceType: "Article",
    author: { "@type": "Organization", name: "Portal Lusitano", url: siteUrl },
    publisher: { "@type": "Organization", name: "Portal Lusitano", url: siteUrl },
    inLanguage: "pt-PT",
    isPartOf: { "@type": "WebSite", name: "Portal Lusitano", url: siteUrl },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
