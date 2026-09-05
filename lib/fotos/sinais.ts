/**
 * Os sinais que se conseguem calcular sobre as fotografias dos anúncios.
 *
 * É o irmão do `lib/documentos/sinais.ts` e segue-lhe a regra central inteira:
 * **um sinal é um facto contado, nunca uma acusação.** «Esta fotografia está a
 * distância 3 desta outra, no anúncio X, do vendedor Y.» Não há nota, não há
 * percentagem, não há semáforo, e a palavra «roubada» não aparece — nem aqui
 * nem em nome de campo nenhum. Quem decide é uma pessoa, com os dois anúncios
 * abertos à frente.
 *
 * ## Porque é que isso não é excesso de escrúpulo
 *
 * Uma fotografia repetida tem explicações inocentes, e são comuns:
 *
 * - o mesmo criador a republicar o mesmo cavalo passado um ano;
 * - um cavalo revendido, com o novo dono a reutilizar as fotos do anúncio de
 *   onde o comprou — que ele pode até ter recebido de propósito;
 * - uma coudelaria a anunciar dois cavalos com a mesma fotografia de picadeiro
 *   ao fundo;
 * - a mesma fotografia de grupo usada em dois anúncios da mesma casa.
 *
 * E há uma razão a mais, que veio da medição e não de uma opinião: o
 * `impressao.ts` mediu **duas imagens genuinamente diferentes a distância 6**,
 * abaixo do limiar de 8. Eram duas fotografias do mesmo cenário com sujeitos
 * diferentes — a terceira explicação da lista. Não existe limiar que separe
 * «a mesma fotografia» de «duas fotografias do mesmo sítio», portanto qualquer
 * saída que afirmasse mais do que uma distância estaria a afirmar o que não
 * sabe.
 *
 * ## Vendedores diferentes é o que interessa
 *
 * A mesma fotografia em dois anúncios do mesmo vendedor é rotina e não vale
 * uma linha na fila de ninguém. Em dois vendedores diferentes é o caso que
 * vale a pena olhar.
 *
 * E há aqui uma armadilha que este repositório já pisou uma vez, no
 * `registoEmVendedoresDiferentes`: **um anúncio sem conta associada não conta
 * como «outro vendedor».** Não saber quem anunciou não é saber que foi outro.
 * Sem essa regra, todos os anúncios anónimos acusavam-se uns aos outros — e
 * anúncios anónimos é o que uma base nova tem de sobra.
 *
 * ## O que fica de fora, de propósito
 *
 * - **Duas fotografias do mesmo anúncio.** Dez fotografias do mesmo cavalo na
 *   mesma sessão são parecidas por construção; pô-las numa fila de revisão era
 *   encher a fila com o caso mais comum e mais inocente que existe.
 * - **A mesma fotografia repetida na mesma lista.** É um engano ao carregar
 *   ficheiros, não uma fraude.
 * - **Agrupar em famílias.** A semelhança não é transitiva — A pode estar a 7
 *   de B e B a 7 de C sem A e C terem nada a ver. Juntá-las num grupo obrigava
 *   a escolher um critério que não existe, e o grupo passaria a afirmar mais do
 *   que os pares que o formaram. A saída é **pares**, que é o que se mediu.
 */

import {
  compararImpressoes,
  dentroDoLimiar,
  impressaoValida,
  type ComparacaoDeImpressoes,
  type Enquadramento,
  type ImpressaoDeFotografia,
} from "./impressao";

// ─── O que os sinais precisam de receber ─────────────────────────────────────

/**
 * Uma fotografia já impressa, tal como uma linha da base a devolve.
 *
 * O `url` é o que identifica a fotografia dentro do anúncio, porque é isso que
 * a coluna `cavalos_venda.fotos` guarda — um array de URLs públicos. Não se
 * inventa aqui um id que a base não tem.
 */
export interface FotografiaParaSinais extends ImpressaoDeFotografia {
  /** O anúncio a que pertence. */
  cavaloId: string;
  /** O URL público, que é como o anúncio a nomeia. */
  url: string;
}

/**
 * Um anúncio, reduzido ao que estes sinais lêem.
 *
 * Os nomes são os das colunas de `cavalos_venda`, como no
 * `lib/documentos/sinais.ts`: copiá-los tal e qual poupa uma tradução que só
 * existiria para ficar bonita e que seria mais um sítio onde alguém se engana.
 */
export interface AnuncioDaFotografia {
  id: string;
  /** A conta do vendedor. `null` num anúncio que nunca foi reclamado. */
  user_id: string | null;
  status: string | null;
}

/**
 * Os estados que contam. São os mesmos do `lib/documentos/sinais.ts`, e pela
 * mesma razão: um anúncio vendido ou removido pode legitimamente partilhar as
 * fotografias com o que lhe sucedeu.
 */
export const ESTADOS_ACTIVOS = ["active", "reservado"] as const;

export function anuncioEstaEmPe(anuncio: Pick<AnuncioDaFotografia, "status">): boolean {
  return (ESTADOS_ACTIVOS as readonly string[]).includes(anuncio.status ?? "");
}

// ─── O que um sinal é ────────────────────────────────────────────────────────

export const TIPOS_DE_SINAL = ["fotografia_parecida"] as const;
export type TipoDeSinal = (typeof TIPOS_DE_SINAL)[number];

/** Uma fotografia tal como o sinal a nomeia para quem revê. */
export interface FotografiaNoSinal {
  cavaloId: string;
  url: string;
  /** A conta do vendedor, ou `null` num anúncio sem conta associada. */
  vendedor: string | null;
  /** As dimensões, que ajudam a perceber qual é o original e qual é a cópia. */
  largura: number;
  altura: number;
}

/**
 * Duas fotografias de anúncios diferentes cuja impressão está perto.
 *
 * Tudo o que este objecto contém é mensurável: duas distâncias em bits, o
 * enquadramento onde a menor apareceu, os ids e os vendedores. Não há nenhum
 * campo que resuma isso a um juízo, e há um teste que o garante comparando as
 * chaves da saída contra uma lista proibida.
 */
export interface SinalFotografiaParecida {
  tipo: "fotografia_parecida";
  /** As duas, por ordem de `cavaloId` e depois de `url`. */
  fotografias: [FotografiaNoSinal, FotografiaNoSinal];
  /** Em quantos dos 64 bits da pHash as duas discordam. */
  distanciaPhash: number;
  /** O mesmo para a dHash, no mesmo enquadramento. Relatada, não decide nada. */
  distanciaDhash: number;
  /** Onde é que a distância mais curta apareceu. Ver `Enquadramento`. */
  enquadramento: Enquadramento;
  /** As contas distintas envolvidas, por ordem. Pode ter 0, 1 ou 2 entradas. */
  vendedores: string[];
  /**
   * Os anúncios do par sem conta associada. Ficam à parte e **não contam** como
   * um vendedor: não saber quem anunciou não é saber que foi outro.
   */
  anunciosSemVendedor: string[];
}

export type Sinal = SinalFotografiaParecida;

// ─── Utilitários privados ────────────────────────────────────────────────────

/** A ordem da saída é sempre a mesma para a mesma entrada. */
function porTexto(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Valores distintos, por ordem, sem repetições e sem nulos. */
function distintosOrdenados(valores: readonly (string | null)[]): string[] {
  return [...new Set(valores.filter((v): v is string => typeof v === "string"))].sort(porTexto);
}

/** Qual das duas fotografias se escreve primeiro. */
function antesDe(a: FotografiaParaSinais, b: FotografiaParaSinais): boolean {
  return a.cavaloId !== b.cavaloId ? a.cavaloId < b.cavaloId : a.url < b.url;
}

function nomear(f: FotografiaParaSinais, vendedor: string | null): FotografiaNoSinal {
  return {
    cavaloId: f.cavaloId,
    url: f.url,
    vendedor,
    largura: f.largura,
    altura: f.altura,
  };
}

/**
 * O enquadramento visto do outro lado.
 *
 * Quando se troca a ordem das duas fotografias para as escrever, o
 * `inteira-centro` passa a `centro-inteira` — senão a saída dizia que A é um
 * recorte de B quando o que se mediu foi o contrário. Um campo que se inverte
 * com a ordem e ninguém inverte é a maneira silenciosa de escrever um facto
 * falso.
 */
function espelharEnquadramento(e: Enquadramento): Enquadramento {
  if (e === "inteira-centro") return "centro-inteira";
  if (e === "centro-inteira") return "inteira-centro";
  return e;
}

// ─── Os pares ────────────────────────────────────────────────────────────────

export interface OpcoesDosSinais {
  /**
   * Só pares de anúncios com **duas contas conhecidas e diferentes**. É o que
   * a regra manda para a fila de revisão, e é a omissão.
   *
   * A `false` devolve também os pares do mesmo vendedor e os que envolvem
   * anúncios anónimos — serve um painel que queira ver tudo, e nunca uma fila
   * de trabalho.
   */
  soVendedoresDiferentes?: boolean;
  /**
   * Só anúncios em pé. É a omissão, pela mesma razão que no
   * `lib/documentos/sinais.ts`: um cavalo revendido partilha legitimamente as
   * fotografias com o anúncio de onde veio.
   */
  soAnunciosEmPe?: boolean;
}

/**
 * Os pares de fotografias parecidas, entre anúncios diferentes.
 *
 * A comparação é de todos contra todos — ver `indice.ts` para o porquê de isso
 * chegar hoje e para o que se faria numa base grande. Um anúncio que a lista
 * de anúncios não conheça é deitado fora em silêncio: sem ele não se sabe o
 * estado nem o vendedor, e adivinhar qualquer um dos dois seria pior do que
 * não dizer nada.
 */
export function fotografiasParecidas(
  fotografias: readonly FotografiaParaSinais[],
  anuncios: readonly AnuncioDaFotografia[],
  opcoes: OpcoesDosSinais = {}
): SinalFotografiaParecida[] {
  const soVendedoresDiferentes = opcoes.soVendedoresDiferentes ?? true;
  const soAnunciosEmPe = opcoes.soAnunciosEmPe ?? true;

  const porId = new Map(anuncios.map((a) => [a.id, a]));
  const candidatas = fotografias.filter((f) => {
    const anuncio = porId.get(f.cavaloId);
    if (!anuncio) return false;
    if (soAnunciosEmPe && !anuncioEstaEmPe(anuncio)) return false;
    // Uma impressão mal formada não entra. Deixá-la entrar dava um erro no meio
    // de uma varredura de milhares de pares, o que esconde qual foi a linha má.
    return (
      impressaoValida(f.phash) &&
      impressaoValida(f.phashCentro) &&
      impressaoValida(f.dhash) &&
      impressaoValida(f.dhashCentro)
    );
  });

  const sinais: SinalFotografiaParecida[] = [];

  for (let i = 0; i < candidatas.length; i++) {
    for (let j = i + 1; j < candidatas.length; j++) {
      const a = candidatas[i];
      const b = candidatas[j];

      // Duas fotografias do mesmo anúncio são a mesma sessão fotográfica.
      if (a.cavaloId === b.cavaloId) continue;

      const vendedorA = porId.get(a.cavaloId)?.user_id ?? null;
      const vendedorB = porId.get(b.cavaloId)?.user_id ?? null;
      const vendedores = distintosOrdenados([vendedorA, vendedorB]);

      // Dois anúncios anónimos não são dois vendedores; um anónimo com um
      // conhecido também não. É preciso conhecer os dois e serem diferentes.
      if (soVendedoresDiferentes && vendedores.length < 2) continue;

      const comparacao: ComparacaoDeImpressoes = compararImpressoes(a, b);
      if (!dentroDoLimiar(comparacao)) continue;

      const trocar = !antesDe(a, b);
      const primeira = trocar ? b : a;
      const segunda = trocar ? a : b;

      sinais.push({
        tipo: "fotografia_parecida",
        fotografias: [
          nomear(primeira, trocar ? vendedorB : vendedorA),
          nomear(segunda, trocar ? vendedorA : vendedorB),
        ],
        distanciaPhash: comparacao.distanciaPhash,
        distanciaDhash: comparacao.distanciaDhash,
        enquadramento: trocar
          ? espelharEnquadramento(comparacao.enquadramento)
          : comparacao.enquadramento,
        vendedores,
        anunciosSemVendedor: distintosOrdenados([
          vendedorA === null ? a.cavaloId : null,
          vendedorB === null ? b.cavaloId : null,
        ]),
      });
    }
  }

  return ordenarSinais(sinais);
}

/**
 * A ordem em que os pares valem a pena ser lidos: primeiro os mais próximos,
 * e a seguir por id, para que dois carregamentos deem a mesma lista.
 *
 * A distância entra como ordem e não como nota — é a mesma diferença que
 * separa «esta linha vem primeiro» de «esta linha é mais grave».
 */
function ordenarSinais(sinais: SinalFotografiaParecida[]): SinalFotografiaParecida[] {
  return [...sinais].sort((x, y) => {
    if (x.distanciaPhash !== y.distanciaPhash) return x.distanciaPhash - y.distanciaPhash;
    const a = porTexto(x.fotografias[0].cavaloId, y.fotografias[0].cavaloId);
    if (a !== 0) return a;
    const b = porTexto(x.fotografias[0].url, y.fotografias[0].url);
    if (b !== 0) return b;
    const c = porTexto(x.fotografias[1].cavaloId, y.fotografias[1].cavaloId);
    if (c !== 0) return c;
    return porTexto(x.fotografias[1].url, y.fotografias[1].url);
  });
}

/**
 * Uma fotografia nova contra as que já lá estão.
 *
 * É o caminho que interessa a quem publica um anúncio: compara-se uma contra
 * as candidatas que o índice devolveu, e não todas contra todas. Devolve o
 * mesmo tipo de facto.
 */
export function parecidasComUmaFotografia(
  nova: FotografiaParaSinais,
  existentes: readonly FotografiaParaSinais[],
  anuncios: readonly AnuncioDaFotografia[],
  opcoes: OpcoesDosSinais = {}
): SinalFotografiaParecida[] {
  return fotografiasParecidas([nova, ...existentes], anuncios, opcoes).filter((s) =>
    s.fotografias.some((f) => f.cavaloId === nova.cavaloId && f.url === nova.url)
  );
}
