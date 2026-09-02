/**
 * Qual é a fotografia de capa de uma coudelaria — e quando é que não há.
 *
 * O cartão do directório escolhia a capa por tentativa e erro no browser:
 * pedia `capa.webp`, esperava pelo `onError`, tentava `capa.jpg`, esperava
 * outra vez e acabava numa fotografia do Unsplash. Duas coisas más ao mesmo
 * tempo:
 *
 * 1. **Nenhum ficheiro `capa.webp` existe no repositório.** Todos os cartões
 *    começavam por um pedido ao optimizador de imagens que dava erro, e o que
 *    se via era um rectângulo preto até o segundo pedido chegar — ou para
 *    sempre, porque `next/image` com `fill` nem sempre volta a disparar.
 * 2. **A fotografia de reserva era stock.** Um cavalo qualquer do Unsplash
 *    apresentado como sendo daquela coudelaria é uma afirmação falsa, tal
 *    como o «1000+ cavalos» que estava no painel do topo. Uma coudelaria sem
 *    fotografia mostra que não tem fotografia; não pede uma emprestada.
 *
 * A escolha passa a ser feita **uma vez, no servidor**, a partir do que existe
 * mesmo em disco. O cartão recebe um caminho ou nada.
 */

/**
 * Por que ordem se procura uma capa dentro da pasta da coudelaria.
 *
 * `galeria-1` entra no fim de propósito: quatro coudelarias têm galeria e não
 * têm capa, e a primeira fotografia da galeria é uma fotografia *delas* — é
 * melhor capa do que nenhuma, e continua a ser verdade.
 */
export const CAPAS_CANDIDATAS = [
  "capa.webp",
  "capa.jpg",
  "capa.jpeg",
  "capa.png",
  "galeria-1.webp",
  "galeria-1.jpg",
] as const;

/** Onde vivem as fotografias das coudelarias, dentro de `public/`. */
export const PASTA_CAPAS = "images/coudelarias";

/**
 * Escolhe a capa de uma coudelaria.
 *
 * @param slug     A pasta da coudelaria.
 * @param ficheiros Os nomes de ficheiro que existem nessa pasta.
 * @returns O caminho público, ou `null` quando não há fotografia nenhuma.
 */
export function escolherCapa(slug: string, ficheiros: readonly string[]): string | null {
  const existentes = new Set(ficheiros);
  for (const nome of CAPAS_CANDIDATAS) {
    if (existentes.has(nome)) return `/${PASTA_CAPAS}/${slug}/${nome}`;
  }
  return null;
}

/**
 * Constrói o mapa `slug → caminho da capa` a partir do que está em disco.
 *
 * Só entram as coudelarias que têm mesmo uma fotografia: uma chave em falta e
 * uma chave a `null` dizem a mesma coisa, e a primeira viaja mais leve para o
 * cliente.
 */
export function mapaDeCapas(pastas: Record<string, readonly string[]>): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const [slug, ficheiros] of Object.entries(pastas)) {
    const capa = escolherCapa(slug, ficheiros);
    if (capa) mapa[slug] = capa;
  }
  return mapa;
}

/**
 * Aquele caminho aponta para um ficheiro que temos mesmo?
 *
 * A base guarda caminhos que a nossa própria pasta pública tem de servir. Se
 * um deles nomeia um ficheiro que não está lá, **está morto, e sabe-se aqui**:
 * no servidor, durante a construção, a partir do varrimento do disco que já se
 * faz — sem um pedido de rede e sem esperar pelo `onError` de ninguém.
 *
 * Medido na base real: 85 de 166 caminhos de galeria apontavam para
 * `imagem-NN.webp`, e em `public/images/coudelarias/` não existe um único
 * `.webp` — são 81 ficheiros, todos `.jpg`. Vinte coudelarias afectadas, e em
 * várias delas a galeria era **inteiramente** de imagens mortas, porque os
 * caminhos da base entram antes dos do disco.
 *
 * Só se julga o que se pode julgar: um caminho para fora desta pasta — um
 * endereço externo, outra origem — devolve `true`, porque daqui não há como
 * saber se responde. Esse fica para a sonda do cliente, na galeria.
 */
export function apontaParaFicheiroQueTemos(
  caminho: string,
  slug: string,
  ficheiros: readonly string[]
): boolean {
  const prefixo = `/${PASTA_CAPAS}/${slug}/`;
  // O `?` e o `#` não fazem parte do nome do ficheiro.
  const semAdornos = caminho.split(/[?#]/)[0] ?? "";
  if (!semAdornos.startsWith(prefixo)) return true;

  const resto = semAdornos.slice(prefixo.length);
  // Uma subpasta não é um nome de ficheiro, e o varrimento não a conhece:
  // não se declara morto o que não se chegou a olhar.
  if (!resto || resto.includes("/")) return true;

  // A base guarda tanto nomes crus («Captura de ecrã ….png», com espaços e
  // acentos) como nomes escapados. O `decodeURIComponent` rebenta com um `%`
  // que não seja um escape válido, e um nome desses é um nome cru.
  let nome = resto;
  try {
    nome = decodeURIComponent(resto);
  } catch {
    nome = resto;
  }

  return ficheiros.includes(nome) || ficheiros.includes(resto);
}

/**
 * A capa a usar num cartão: a da base de dados manda, o disco é a reserva.
 *
 * `foto_capa` é o que a coudelaria carregou; quando está vazio fica o que o
 * repositório tem para aquele slug; quando não há nem uma coisa nem outra
 * devolve `null` e o cartão desenha uma chapa tipográfica em vez de uma
 * fotografia emprestada.
 */
export function capaDoCartao(
  fotoCapa: string | null | undefined,
  slug: string,
  capasEmDisco: Record<string, string>
): string | null {
  const bd = (fotoCapa ?? "").trim();
  if (bd) return bd;
  return capasEmDisco[slug] ?? null;
}

/**
 * As iniciais que a chapa mostra quando não há fotografia.
 *
 * Salta as palavras de ligação («de», «da», «do», «e») e o próprio
 * «Coudelaria», que está em quase todos os nomes e não distingue nada — sem
 * isso metade das chapas dizia «CD».
 */
const PALAVRAS_VAZIAS = new Set([
  "coudelaria",
  "coudelarias",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "the",
  "of",
  "cl",
  "-",
]);

export function iniciaisDe(nome: string, maximo = 2): string {
  const palavras = nome
    .split(/[\s\-–—/]+/)
    .map((p) => p.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((p) => p.length > 0);

  const uteis = palavras.filter((p) => !PALAVRAS_VAZIAS.has(p.toLowerCase()));
  const escolhidas = uteis.length ? uteis : palavras;

  return escolhidas
    .slice(0, maximo)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
