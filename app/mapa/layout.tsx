import type { Metadata } from "next";
import { preload } from "react-dom";
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

/**
 * ── As texturas do globo saem da cauda da cascata ─────────────────────────
 *
 * Medido no browser, a 1400×950, com o servidor em rede local: o documento
 * está no browser aos 54ms e as texturas do globo — 640 KiB em cinco WebP,
 * mais 54 KiB de contornos — só começam a ser pedidas aos **1703ms**. Não é
 * a rede: é uma cadeia de três esperas em série. O HTML chega; a hidratação
 * corre; só então o `next/dynamic` do `<GloboTerra>` pede o pedaço com o
 * three.js lá dentro (155 KiB, pedido aos 1005ms); só quando esse pedaço
 * corre é que o `TextureLoader` abre o primeiro pedido. Um segundo e meio em
 * que a ligação está livre e a coisa mais pesada da página está parada à
 * espera de que alguém a mande buscar.
 *
 * O browser sabe pedir isto sozinho se lhe dissermos — e o único sítio onde
 * lho podemos dizer antes de haver JavaScript é o documento. O
 * `TextureLoader` encontra depois tudo já em cache quando finalmente
 * pergunta.
 *
 * As cinco imagens nem chegam ao corpo do documento: o Next promove-as a
 * cabeçalho `Link:` da resposta, e por isso o browser começa a puxá-las
 * **antes do primeiro byte de HTML**. Aqui isso não é um pormenor: o
 * `inlineCss` do `next.config.js` põe 225 KiB de folha de estilo dentro do
 * `<head>`, e o `<head>` acaba ao byte 233 785 de um documento de 522 KiB —
 * uma etiqueta escrita lá dentro esperava por tudo isso. Os contornos vão em
 * `<link>` no `<head>`, porque `as="fetch"` não é promovido.
 *
 * Duas coisas **têm** de bater certo com quem as vai buscar, senão o browser
 * descarrega duas vezes e a medida sai pela culatra:
 *
 *  - O `THREE.TextureLoader` põe `crossOrigin = "anonymous"` nas imagens que
 *    cria (é o valor por omissão do `THREE.Loader`), logo o `preload` leva
 *    `crossOrigin` também. Sem isso são dois pedidos por textura.
 *  - Os contornos vêm de um `fetch()`, e um `fetch()` de mesma origem
 *    corresponde a `as="fetch"` **com** `crossOrigin` — é o par que o Chrome
 *    dá por equivalente.
 *
 * Medido depois, e é a prova de que o par está certo: **seis ficheiros
 * anunciados, seis pedidos**, zero avisos de recurso pré-carregado e não
 * usado, nas duas vistas.
 *
 * A prioridade é **alta**, e isso foi medido contra as outras duas hipóteses.
 * A dúvida era legítima — 640 KiB à frente podiam empurrar para trás os
 * pedaços de JavaScript de que a hidratação precisa, e com eles o primeiro
 * nome escrito. Três braços do mesmo build, três servidores, nove rodadas
 * intercaladas por vista para a carga da máquina entrar por igual nos três
 * (medianas, em ms):
 *
 *                    sem preload   prio baixa   prio alta
 *   1400×950
 *     texturas no fim      2095         621         382
 *     primeiro nome        1847        1715        1738
 *   390×700
 *     texturas no fim      1798         623         308
 *     primeiro nome        1368        1668        1456
 *
 * O planeta compõe-se **1,7s mais cedo** no computador e **1,5s no
 * telemóvel**, e o primeiro nome não se mexe: a dispersão entre carregamentos
 * do mesmo braço (1441–2900ms sem preload) é várias vezes maior do que a
 * diferença entre braços, ou seja o que atrasa o primeiro nome não é a rede —
 * é a cadeia do `import()` — e as texturas nunca lhe estiveram no caminho.
 * Baixa também funcionava; alta é melhor e não custa nada, por isso é alta.
 *
 * E há uma segunda leitura, mais importante do que a primeira: **as texturas
 * deixam de depender de o JavaScript ser rápido**. Medido outra vez com a
 * máquina cheia — três `next build` de outros agentes ao mesmo tempo, `load`
 * a subir de 740ms para 3200 —, o braço sem preload afunda com ela (as
 * texturas acabam a 3658ms no computador e 3620 no telemóvel, porque esperam
 * pela cadeia toda) e o braço com preload não dá por nada (237 e 209). O que
 * se comprou não foi um segundo e meio: foi tirar 640 KiB da cauda de uma
 * cadeia que se estica com o telefone de quem está a ver.
 *
 * O que isto **não** resolve fica escrito para o próximo: o primeiro nome
 * continua a nascer aos ~1,7s porque o pedaço do three.js só é pedido depois
 * de a página hidratar. Quem o pode encurtar é o `<GloboTerra>` deixar de ser
 * um `next/dynamic`, e isso não se decide daqui.
 *
 * A lista está escrita aqui e não importada do `<GloboTerra>` porque este
 * ficheiro é servidor e aquele é uma ilha de cliente carregada a pedido —
 * importar-lhe o módulo para ler cinco cadeias traria o three.js para o
 * pedido do servidor. Se lá mudarem os nomes, mudam aqui; há um teste que os
 * confronta com os do componente, para a lista não se calar.
 */
const TEXTURAS_DO_GLOBO = [
  "/globo/dia.webp",
  "/globo/relevo.webp",
  "/globo/luzes.webp",
  "/globo/brilho.webp",
  "/globo/cor.webp",
] as const;

/* Um ficheiro de rota do App Router só pode exportar o que o Next conhece —
   por isso a lista não sai daqui, e quem a confronta com a do componente é o
   teste, que lê os dois ficheiros. */
const CONTORNOS_DO_GLOBO = "/globo/contornos.json";

export default function Layout({ children }: { children: React.ReactNode }) {
  /* `preload` do `react-dom` e não seis `<link>` em JSX: com JSX o React
     escreve as etiquetas duas vezes — uma içada para o `<head>` e outra onde
     estão, no corpo. O browser desdobra os pedidos, por isso a transferência
     era a mesma, mas o documento levava seis etiquetas a dizer o que já
     estava dito e quem o lesse via um erro que não era um. */
  for (const src of TEXTURAS_DO_GLOBO) {
    preload(src, {
      as: "image",
      type: "image/webp",
      crossOrigin: "anonymous",
      fetchPriority: "high",
    });
  }
  preload(CONTORNOS_DO_GLOBO, {
    as: "fetch",
    type: "application/json",
    crossOrigin: "anonymous",
    fetchPriority: "high",
  });

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
