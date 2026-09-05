import type { Metadata } from "next";
import { BreadcrumbSchema, CollectionPageSchema } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/constants";

// ISR: Revalidate directory every hour
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Directório de Coudelarias",
  description:
    "Coudelarias de cavalos Lusitanos em Portugal, por região: localidade, ano de fundação, efectivo declarado, especialidades e linhagens.",
  keywords: [
    "coudelarias portugal",
    "directório coudelarias",
    "criadores lusitanos",
    "coudelarias PSL",
    "criadores cavalos portugal",
  ],
  alternates: {
    canonical: `${SITE_URL}/directorio`,
    languages: {
      "pt-PT": `${SITE_URL}/directorio`,
      "en-US": `${SITE_URL}/en/directorio`,
      "es-ES": `${SITE_URL}/es/directorio`,
      "x-default": `${SITE_URL}/directorio`,
    },
  },
  openGraph: {
    title: "Directório de Coudelarias | Portal Lusitano",
    description:
      "Coudelarias de cavalos Lusitanos em Portugal, por região: localidade, ano de fundação, efectivo declarado, especialidades e linhagens.",
    url: `${SITE_URL}/directorio`,
    siteName: "Portal Lusitano",
    locale: "pt_PT",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Directório de Coudelarias — Portal Lusitano",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Directório de Coudelarias | Portal Lusitano",
    description:
      "Coudelarias de cavalos Lusitanos em Portugal, por região: localidade, ano de fundação, efectivo declarado, especialidades e linhagens.",
    images: ["/opengraph-image"],
  },
};

export default function DirectorioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Portal Lusitano", url: SITE_URL },
          { name: "Directório de Coudelarias", url: `${SITE_URL}/directorio` },
        ]}
      />
      <CollectionPageSchema
        name="Directório de Coudelarias"
        description="Coudelarias de cavalos Lusitanos em Portugal, por região: localidade, ano de fundação, efectivo declarado, especialidades e linhagens."
        url={`${SITE_URL}/directorio`}
      />
      {children}
    </>
  );
}
