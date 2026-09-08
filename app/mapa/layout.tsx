import type { Metadata } from "next";
import { BreadcrumbSchema } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Mapa Equestre de Portugal",
  description:
    "Mapa interactivo com coudelarias, centros hípicos, veterinários equinos, ferradores e eventos equestres em todo o território português.",
  keywords: [
    "mapa equestre portugal",
    "coudelarias mapa",
    "centros hípicos portugal",
    "onde montar portugal",
    "equitação portugal mapa",
    "mapa cavalos portugal",
    "centros equestres mapa",
  ],
  alternates: {
    canonical: `${SITE_URL}/mapa`,
    languages: {
      "pt-PT": `${SITE_URL}/mapa`,
      "en-US": `${SITE_URL}/en/mapa`,
      "es-ES": `${SITE_URL}/es/mapa`,
      "x-default": `${SITE_URL}/mapa`,
    },
  },
  openGraph: {
    title: "Mapa Equestre de Portugal | Portal Lusitano",
    description:
      "Mapa interactivo com coudelarias, centros hípicos, veterinários e eventos equestres em Portugal.",
    url: `${SITE_URL}/mapa`,
    siteName: "Portal Lusitano",
    locale: "pt_PT",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Mapa Equestre de Portugal — Portal Lusitano",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mapa Equestre de Portugal | Portal Lusitano",
    description:
      "Mapa interactivo com coudelarias, centros hípicos, veterinários e eventos equestres em Portugal.",
    images: ["/opengraph-image"],
  },
};

/* O anúncio das texturas do globo **não** vive aqui, e a razão está escrita na
   `page.tsx`: o que está no layout entra na carga de pré-busca de quem tem um
   link para o `/mapa`, e o `/directorio` descarregava 569,3 KiB de texturas de
   um globo que não tem. Se voltar para aqui, volta a fuga. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Portal Lusitano", url: SITE_URL },
          { name: "Mapa Equestre", url: `${SITE_URL}/mapa` },
        ]}
      />
      {children}
    </>
  );
}
