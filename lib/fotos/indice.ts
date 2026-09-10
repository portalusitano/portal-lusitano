/**
 * Como é que se encontram as fotografias parecidas sem ler a tabela toda.
 *
 * ## O problema, e qual é ele mesmo
 *
 * Uma impressão perceptual compara-se por **distância**, e uma base de dados
 * indexa por **igualdade**. Não há `WHERE phash ≈ $1` — um índice B-tree sobre
 * a coluna serve para ordenar e para procurar um valor exacto, e a distância de
 * Hamming não respeita essa ordem: duas impressões a distância 1 podem cair nas
 * duas pontas opostas da ordenação (`7fff…` e `ffff…` diferem num bit).
 *
 * Convém dizer qual **não** é o problema. Comparar impressões é barato:
 * medido, 820 nanossegundos por par, ou seja **20 000 fotografias percorridas
 * em 16 ms**. O custo de uma varredura não está no processador — está em
 * arrastar todas as linhas da base para a memória do servidor a cada
 * fotografia publicada. É esse o trabalho que cresce, e é esse que se corta.
 *
 * ## O que se faz hoje, e é o que esta base pede
 *
 * Hoje esta base é pequena. Ler as impressões dos anúncios em pé e percorrê-las
 * é uma consulta que devolve alguns milhares de linhas de 16 bytes e uma
 * varredura de milissegundos. **É o que está implementado, e é o correcto para
 * o tamanho que isto tem** — a instrução foi não optimizar para um milhão de
 * anúncios que não existem.
 *
 * O que este ficheiro acrescenta é a **peça que torna a consulta estreita
 * quando isso deixar de chegar**, e que não custa nada ter já: partir a
 * impressão em quatro blocos de 16 bits.
 *
 * ## Porque é que quatro blocos funcionam, e não é uma heurística
 *
 * É o princípio dos pombais, e é exacto. Se duas impressões de 64 bits diferem
 * em no máximo `d` bits, e se as partirmos em `k` blocos, então **pelo menos
 * `k − d` blocos têm de ser exactamente iguais** — porque cada bit diferente
 * só pode estragar um bloco. Com `k = d + 1`, pelo menos um bloco coincide
 * sempre.
 *
 * Com o limiar em 8 isso pedia nove blocos, de sete bits cada — e um bloco de
 * sete bits tem 128 valores possíveis, portanto cada balde apanharia um
 * centésimo da tabela e a consulta não filtrava nada. Não serve.
 *
 * Serve o contrário: **quatro blocos de 16 bits garantem, sem falhas, todos os
 * pares até distância 3**, e apanham a maior parte dos que estão entre 4 e 8
 * sem os garantir. Um bloco de 16 bits tem 65 536 valores, portanto um balde é
 * estreito de verdade.
 *
 * A palavra que interessa é **garantia**: até 3, o índice não pode perder um
 * par; acima disso pode. Por isso o índice é um **acelerador e não a
 * definição** — quem decide se dois pares são vizinhos continua a ser o
 * `compararImpressoes`, e quem quiser a garantia inteira até 8 varre.
 *
 * ## O que se faria no dia do milhão
 *
 * Está escrito no relatório e resume-se a três caminhos, por ordem de custo:
 * mais blocos com uma segunda passagem (multi-index hashing, Norouzi et al.),
 * uma tabela de vizinhança pré-calculada, ou uma extensão do PostgreSQL que
 * saiba distância de Hamming num índice. Nenhum deles se justifica hoje, e
 * nenhum deles muda o que este ficheiro faz — todos assentam nos mesmos blocos.
 */

import { impressaoValida } from "./impressao";

/**
 * Em quantos blocos se parte a impressão.
 *
 * Quatro, de 16 bits — que é também o tamanho que cabe num `int` de qualquer
 * base sem truques. Ver o cabeçalho.
 */
export const BLOCOS_POR_IMPRESSAO = 4;

/** Os dígitos hexadecimais de cada bloco. */
const DIGITOS_POR_BLOCO = 16 / BLOCOS_POR_IMPRESSAO;

/**
 * A distância até à qual os blocos garantem que nenhum par se perde.
 *
 * `BLOCOS_POR_IMPRESSAO − 1`. Acima disto o índice continua a apanhar a maior
 * parte, mas deixa de ser uma garantia — e a diferença entre «apanha quase
 * tudo» e «não pode perder nada» é a única coisa que interessa saber sobre um
 * índice.
 */
export const DISTANCIA_GARANTIDA = BLOCOS_POR_IMPRESSAO - 1;

/**
 * Os quatro blocos de uma impressão, como texto.
 *
 * São strings e não números de propósito: é assim que vão para a base, é assim
 * que se comparam sem surpresas de sinal, e um `0f3a` continua a ler-se como o
 * pedaço da impressão de que veio.
 */
export function blocosDaImpressao(impressao: string): string[] {
  if (!impressaoValida(impressao)) {
    throw new Error("Impressão mal formada: esperavam-se 16 dígitos hexadecimais minúsculos");
  }
  const blocos: string[] = [];
  for (let i = 0; i < BLOCOS_POR_IMPRESSAO; i++) {
    blocos.push(impressao.slice(i * DIGITOS_POR_BLOCO, (i + 1) * DIGITOS_POR_BLOCO));
  }
  return blocos;
}

/**
 * As chaves com que uma fotografia se indexa e se procura.
 *
 * A posição vai na chave (`0:1a2b`) porque um bloco só é igual a outro se
 * estiver **no mesmo sítio**: sem a posição, `1a2b` no primeiro quarto de uma
 * impressão casaria com `1a2b` no terceiro quarto de outra, que não diz nada.
 *
 * Indexam-se os **dois enquadramentos**, e é isso que faz o índice concordar
 * com o `compararImpressoes`: se uma fotografia for um recorte de outra, o que
 * coincide é o quadro inteiro de uma com o centro da outra, e se só o quadro
 * inteiro estivesse indexado o índice nunca as juntava.
 */
export function chavesDeProcura(impressao: { phash: string; phashCentro: string }): string[] {
  const chaves = new Set<string>();
  for (const valor of [impressao.phash, impressao.phashCentro]) {
    blocosDaImpressao(valor).forEach((bloco, posicao) => chaves.add(`${posicao}:${bloco}`));
  }
  return [...chaves].sort();
}

/** O que o índice guarda por fotografia. */
export interface EntradaDoIndice {
  phash: string;
  phashCentro: string;
}

/**
 * Um índice em memória, para quando as impressões já estão cá dentro.
 *
 * Não substitui a consulta à base — substitui o ciclo de todos contra todos
 * quando se compara **uma** fotografia nova contra muitas já lidas.
 */
export class IndiceDeBlocos<T extends EntradaDoIndice> {
  private readonly baldes = new Map<string, T[]>();

  constructor(entradas: readonly T[] = []) {
    for (const entrada of entradas) this.acrescentar(entrada);
  }

  acrescentar(entrada: T): void {
    for (const chave of chavesDeProcura(entrada)) {
      const balde = this.baldes.get(chave);
      if (balde) balde.push(entrada);
      else this.baldes.set(chave, [entrada]);
    }
  }

  /**
   * As candidatas de uma impressão: tudo o que partilha pelo menos um bloco.
   *
   * São **candidatas**, não vizinhas. Quem decide é o `compararImpressoes` —
   * partilhar 16 bits com outra impressão acontece por acaso com alguma
   * frequência, e é para isso que a verificação existe.
   */
  candidatas(impressao: EntradaDoIndice): T[] {
    const vistas = new Set<T>();
    for (const chave of chavesDeProcura(impressao)) {
      const balde = this.baldes.get(chave);
      if (!balde) continue;
      for (const entrada of balde) vistas.add(entrada);
    }
    return [...vistas];
  }

  /** Quantos baldes tem. Serve para medir o índice, e não para decidir nada. */
  get quantosBaldes(): number {
    return this.baldes.size;
  }
}

/**
 * O SQL que a consulta à base faria, montado a partir das chaves.
 *
 * Não corre nada e não conhece cliente nenhum: devolve o texto e os parâmetros,
 * para que quem chama os passe ao Supabase. Está aqui — e não numa rota — para
 * que a forma da consulta viva ao lado da razão pela qual ela tem essa forma, e
 * para que um teste a possa ler sem uma base ligada.
 *
 * A tabela e as colunas são as que o relatório propõe; enquanto a migração não
 * for aplicada, isto é a descrição do que ela terá de suportar.
 */
export function consultaDeCandidatas(
  impressao: EntradaDoIndice,
  opcoes: { tabela?: string; limite?: number } = {}
): { sql: string; parametros: string[] } {
  const tabela = opcoes.tabela ?? "fotos_impressoes";
  const chaves = chavesDeProcura(impressao);
  const marcadores = chaves.map((_, i) => `$${i + 1}`).join(", ");
  const limite = opcoes.limite ?? 500;
  const sql = [
    `SELECT f.id, f.cavalo_id, f.url, f.phash, f.phash_centro, f.dhash, f.dhash_centro,`,
    `       f.largura, f.altura`,
    `  FROM ${tabela} f`,
    `  JOIN cavalos_venda c ON c.id = f.cavalo_id`,
    ` WHERE c.status IN ('active', 'reservado')`,
    `   AND f.blocos && ARRAY[${marcadores}]::text[]`,
    ` LIMIT ${limite}`,
  ].join("\n");
  return { sql, parametros: chaves };
}

/**
 * Uma verificação honesta da promessa dos blocos, para quem duvide.
 *
 * Devolve `true` quando duas impressões a distância `≤ DISTANCIA_GARANTIDA`
 * partilham mesmo um bloco. É usada pelo teste sobre milhares de pares
 * gerados: uma garantia por argumento de pombais é boa, mas uma garantia
 * verificada é melhor, e o erro que ela apanharia — um `slice` trocado — não
 * dá sinal nenhum de si em mais lado nenhum.
 */
export function partilhamBloco(a: string, b: string): boolean {
  const ba = blocosDaImpressao(a);
  const bb = blocosDaImpressao(b);
  return ba.some((bloco, i) => bloco === bb[i]);
}
