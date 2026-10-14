import type { Metadata } from "next";
import { BreadcrumbSchema, CollectionPageSchema, FAQSchema } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/constants";

/* A descrição desta página prometia «linhagem certificada APSL, veterinário
   verificado e entrega segura», e ia repetida quatro vezes — metadados,
   OpenGraph, Twitter e o `CollectionPageSchema`. Nenhuma das três se sustenta:
   ninguém confronta a linhagem com o stud-book, não há veterinário nenhum a
   ver os anúncios, e o portal não entrega cavalos — nem sequer recebe o
   dinheiro deles. Uma descrição de resultado de pesquisa é a primeira coisa
   que alguém lê sobre o site, e é a mais barata de escrever a mentir. */
export const metadata: Metadata = {
  title: "Comprar Cavalo Lusitano",
  description:
    "Cavalos Lusitanos à venda em Portugal, anunciados directamente pelos criadores e proprietários. Contacto directo, sem intermediários.",
  keywords: [
    "comprar cavalo lusitano",
    "cavalos à venda portugal",
    "PSL venda",
    "cavalos dressage venda",
    "compra cavalos",
  ],
  alternates: {
    canonical: `${SITE_URL}/comprar`,
    languages: {
      "pt-PT": `${SITE_URL}/comprar`,
      "en-US": `${SITE_URL}/en/comprar`,
      "es-ES": `${SITE_URL}/es/comprar`,
      "x-default": `${SITE_URL}/comprar`,
    },
  },
  openGraph: {
    title: "Comprar Cavalo Lusitano | Portal Lusitano",
    description:
      "Cavalos Lusitanos à venda em Portugal, anunciados directamente pelos criadores e proprietários. Contacto directo, sem intermediários.",
    url: `${SITE_URL}/comprar`,
    siteName: "Portal Lusitano",
    locale: "pt_PT",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Comprar Cavalo Lusitano — Portal Lusitano",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Comprar Cavalo Lusitano | Portal Lusitano",
    description:
      "Cavalos Lusitanos à venda em Portugal, anunciados directamente pelos criadores e proprietários. Contacto directo, sem intermediários.",
    images: ["/opengraph-image"],
  },
};

export default function ComprarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Portal Lusitano", url: SITE_URL },
          { name: "Comprar Cavalo Lusitano", url: `${SITE_URL}/comprar` },
        ]}
      />
      <CollectionPageSchema
        name="Comprar Cavalo Lusitano"
        description="Cavalos Lusitanos à venda em Portugal, anunciados directamente pelos criadores e proprietários. Contacto directo, sem intermediários."
        url={`${SITE_URL}/comprar`}
      />
      <FAQSchema
        items={[
          {
            question: "Como comprar um cavalo Lusitano no Portal Lusitano?",
            answer:
              "Navegue pelos anúncios, utilize os filtros de idade, preço e disciplina para encontrar o exemplar ideal. Cada anúncio inclui fotos, linhagem e contacto directo com o vendedor.",
          },
          {
            question: "Os cavalos são verificados?",
            // A resposta anterior escapava-se pela tangente — «incluem
            // informação de linhagem APSL quando disponível» — e deixava a
            // pergunta sem resposta. Quem a faz quer saber uma coisa só, e a
            // resposta honesta é «não»; dizê-la antes de tudo o resto é o que
            // torna útil o conselho que vem a seguir.
            answer:
              "Não. Tudo o que está num anúncio — linhagem, medidas, historial e documentação — é declarado pelo vendedor, e o Portal Lusitano não o confirma junto da APSL nem de nenhum stud-book. Peça sempre para ver o Livro Azul e o passaporte do cavalo, e faça uma inspecção veterinária presencial antes de comprar.",
          },
          {
            question: "Quanto custa um cavalo Lusitano?",
            answer:
              "O preço varia conforme a idade, treino, linhagem e aptidão. Cavalos jovens sem treino começam nos 5.000€, enquanto exemplares de competição podem ultrapassar os 50.000€.",
          },
        ]}
      />
      {children}
    </>
  );
}
