import { readdirSync } from "node:fs";
import { preload } from "react-dom";
import { join } from "node:path";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { PASTA_CAPAS, mapaDeCapas } from "@/lib/directorio-capas";
import MapaClient from "@/components/MapaClient";
import type { Coudelaria } from "@/components/MapaClient";
import { lerEstadoDoMapa } from "@/lib/mapa-coudelarias";
import { comSinonimos } from "./sinonimos";
import { COUDELARIA_STATUS } from "@/lib/coudelaria-status";

/**
 * ── E o anúncio vive na página, não no layout ─────────────────────────────
 *
 * Esteve no `layout.tsx`, e daí fugia. Medido no browser: abrir o
 * **`/directorio`** — que não tem globo nenhum — puxava as seis, **569,3 KiB
 * em 6 pedidos**, nas duas vistas. O `/directorio` tem «Mapa de Portugal» e
 * «Ver no mapa» no primeiro ecrã; o `<Link>` pré-busca a carga RSC do
 * `/mapa`, essa carga traz lá dentro as sugestões do `preload` do `react-dom`, e o React
 * executa-as ao receber a stream — sem a rota chegar a ser montada. Era o
 * inverso exacto do que o anúncio veio fazer: comprava 1,5s de composição no
 * `/mapa` e gastava-os na página por onde muita gente entra.
 *
 * A saída não é desfazer o anúncio — o ganho está medido e a tabela dele está
 * aqui em baixo. É pô-lo onde a pré-busca não chega. Um `<Link>` do App Router
 * pré-busca a rota **até à primeira fronteira de `loading`**, e o `/mapa` tem
 * um `loading.tsx`: o `layout` entra nessa carga, a `page` — que é `ƒ` — não.
 * O documento a sério renderiza as duas, por isso o cabeçalho `Link:` continua
 * a sair na resposta, que é o que dá o adiantamento.
 *
 * Medido, e os dois lados ao mesmo tempo, que é a única maneira de saber o que
 * se trocou:
 *
 *                        /directorio            /mapa (última textura pronta)
 *                     pedidos     bytes          mediana de 3 corridas
 *   1400×950  antes   6 / 120   569,3 KiB              465ms
 *             depois  0 / 114     0 KiB                219ms
 *   390×700   antes   6 /  71   569,3 KiB              144ms
 *             depois  0 /  65     0 KiB                187ms
 *
 * Os dois braços do `/mapa` são indistinguíveis dentro do ruído e ambos estão
 * no regime «com preload»: a tabela aqui em baixo dá 2095ms e 1798ms para o
 * braço **sem** anúncio. Não se pagou nada por deixar de gastar meio mega na
 * página ao lado.
 *
 * As chamadas correm **antes do `await`** da base, de propósito: o que se quer
 * é que a sugestão saia no princípio da resposta e não depois de a consulta
 * voltar.
 *
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

/**
 * Que fotografias existem mesmo em `public/images/coudelarias/`.
 *
 * O mapa mostrava três fotografias do Unsplash à vez em todos os cartões,
 * apresentadas como sendo daquela coudelaria. Havia 24 capas verdadeiras no
 * repositório que ninguém usava. A escolha é a mesma do `/directorio` e vem
 * do mesmo módulo — não se escreve aqui uma segunda regra para a mesma coisa.
 *
 * Se a pasta não estiver onde se espera, devolve-se um mapa vazio e os cartões
 * desenham a chapa tipográfica: nunca deixa de haver página por uma leitura
 * de disco.
 */
function lerCapasEmDisco(): Record<string, string> {
  try {
    const raiz = join(process.cwd(), "public", PASTA_CAPAS);
    const pastas: Record<string, string[]> = {};
    for (const entrada of readdirSync(raiz, { withFileTypes: true })) {
      if (!entrada.isDirectory()) continue;
      pastas[entrada.name] = readdirSync(join(raiz, entrada.name));
    }
    return mapaDeCapas(pastas);
  } catch (error) {
    logger.warn("[MapaPage] sem capas em disco:", error);
    return {};
  }
}

/**
 * A página é servida a pedido (`ƒ`), por isso ler a query não lhe custa
 * render nenhum — e é aqui que os filtros de um link partilhado têm de ser
 * lidos. Feito no cliente dentro de um efeito, a primeira pintura mostrava o
 * país inteiro e só depois é que encolhia para a região pedida.
 *
 * É também aqui que o «voltar» do browser é atendido: quem sai do mapa para
 * uma ficha volta a este endereço com os filtros que tinha. Quem os lê é o
 * `lerEstadoDoMapa`, o mesmo módulo que os escreve no cliente — antes eram
 * duas regras separadas e já discordavam no comprimento da pesquisa.
 */
export default async function MapaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /* ── E o anúncio também não se faz a quem pediu a lista ────────────────
     O bloco acima conta como o anúncio fugiu do `layout` para a `page` porque
     o `/directorio` descarregava 569,3 KiB de um globo que não tem. A mesma
     falha ficou uma porta mais para dentro: **`/mapa?vista=lista` é uma
     grelha de cartões e puxava as seis texturas na mesma.** Não é um endereço
     de canto — é o que o interruptor de vistas escreve na barra, o que quem o
     usou tem no histórico, e o que se partilha depois de encontrar uma
     coudelaria pela lista. Medido no browser, nas duas vistas: **6 pedidos e
     569,3 KiB de um globo que aquela página não monta**, com prioridade alta,
     à frente dos vinte e quatro `.jpg` das capas que ela **vai** mostrar.

     Quem decide é a mesma leitura da consulta que decide a vista, e por isso
     não há aqui uma segunda regra a manter sincronizada com a primeira: se o
     `lerEstadoDoMapa` disser `lista`, não se anuncia nada.

     A ordem muda e o que ela protegia mantém-se. O comentário de cima pede as
     chamadas **antes do `await` da base**, para a sugestão sair no princípio
     da resposta; continuam. O que passa para a frente delas é o `await
     searchParams`, que não é uma ida à rede — é um objecto já resolvido pelo
     Next quando o `render` começa, e não há por onde custar milissegundos.
     Medido na mesma, e medido em condições que o pudessem mostrar: 25 pares
     intercalados de pedidos ao `/mapa`, dois servidores do mesmo build a
     correr lado a lado. Mediana **43ms antes e 39ms depois**, com os quartis
     iguais nos dois (34 e 51 contra 34 e 53) e caudas até 140 e 109 — ou
     seja, a dispersão dentro de cada braço é dez vezes maior do que a
     diferença entre eles. Não se pagou nada, e com esta amostra também não se
     poderia afirmar que se ganhou. */
  const params = await searchParams;
  const vistaPedida = lerEstadoDoMapa(comSinonimos(params), []).vista;

  if (vistaPedida === "globo") {
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
  }

  const supabase = await createSupabaseServerClient();

  /* Quatro colunas saíram do pedido: `telefone`, `email`, `website` e
     `especialidades`. Nenhuma delas era lida por ninguém — serviam a janela
     de detalhe que já não existe —, e as quatro iam na carga do servidor para
     o browser em cada uma das vinte e nove linhas. A `especialidades` é a
     pior das quatro: é `jsonb` e nesta base guarda uma cadeia com JSON lá
     dentro, mas a interface declarava-a `string[]`. Um tipo que mente é uma
     armadilha à espera de quem lhe pegue. */
  const { data, error } = await supabase
    .from("coudelarias")
    .select(
      "id, slug, nome, descricao, localizacao, regiao, foto_capa, destaque, is_pro, coordenadas_lat, coordenadas_lng, num_cavalos"
    )
    .eq("status", COUDELARIA_STATUS.ACTIVE)
    .order("destaque", { ascending: false })
    .order("nome", { ascending: true });

  /* ── Não encontrar nada e não conseguir procurar não são o mesmo ────────
     O erro era deitado fora com um `const { data }` e a página seguia com a
     lista vazia. Medido com a base a devolver 500: a /mapa respondia HTTP 200
     e escrevia «0 resultados · Nenhuma coudelaria corresponde · Experimente
     outro nome, outra terra ou outra região» — a culpar uma pesquisa que
     ninguém tinha feito por uma falha que era nossa. Quem lê isto tenta outra
     palavra, e outra, e vai-se embora convencido de que o mapa está vazio.

     Também não se lança para o `error.tsx`: essa é a página inteira trocada
     por um ponto de exclamação, sem cabeçalho, sem navegação e sem saída para
     o directório, que continua a funcionar. A falha diz-se onde o mapa
     estaria, e o resto da página fica de pé. */
  if (error) {
    logger.error("[MapaPage] a base não devolveu as coudelarias:", error);
  }

  const coudelarias: Coudelaria[] = (data ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    slug: c.slug,
    descricao: c.descricao ?? "",
    localizacao: c.localizacao ?? "",
    regiao: c.regiao ?? "",
    foto_capa: c.foto_capa ?? undefined,
    is_pro: c.is_pro ?? false,
    destaque: c.destaque ?? false,
    coordenadas_lat: c.coordenadas_lat ?? undefined,
    coordenadas_lng: c.coordenadas_lng ?? undefined,
    num_cavalos: c.num_cavalos ?? undefined,
  }));

  const inicial = lerEstadoDoMapa(
    /* `?search=` é o nome que o `/directorio` usa para a mesma pergunta, e
       entre as duas páginas há links nos dois sentidos — ver `sinonimos`. */
    comSinonimos(params),
    coudelarias.map((c) => c.regiao)
  );

  return (
    <MapaClient
      coudelarias={coudelarias}
      capas={lerCapasEmDisco()}
      inicial={inicial}
      falhou={Boolean(error)}
    />
  );
}
