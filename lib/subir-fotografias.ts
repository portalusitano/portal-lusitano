/**
 * Subir as fotografias de um anúncio em várias voltas, e não numa só.
 *
 * ## Porquê
 *
 * O `handleSubmit` metia todas as fotografias num `FormData` e mandava-o numa
 * volta. As funções serverless da Vercel têm um tecto de **4,5 MB para o corpo
 * do pedido**; passado esse tecto a plataforma responde 413 e o pedido nunca
 * chega ao nosso código — o erro não aparece nos nossos registos, e a mensagem
 * que o vendedor lê não é uma que tenhamos escrito.
 *
 * Medido num Chromium a sério, com uma fotografia do tamanho das que saem de
 * um telemóvel (4032×3024, 4,86 MB):
 *
 * | | 1 fotografia | 3 (o mínimo exigido) | 10 (um plano pago) |
 * |---|---|---|---|
 * | como estava | 4,86 MB | **13,9 MB — 413** | **48,6 MB — 413** |
 * | já encolhida | 692 KB | 1,98 MB — cabe | **6,6 MB — ainda 413** |
 *
 * Encolher (`lib/comprimir-imagem.ts`) resolve o caso mínimo e **não resolve
 * os planos pagos**: dez fotografias encolhidas continuam a passar o tecto, e
 * há planos de quinze e de fotografias ilimitadas. As duas peças são precisas,
 * e nenhuma substitui a outra.
 *
 * ## O que isto não é
 *
 * **Não é uma tentativa de adivinhar o tecto exacto.** O orçamento é
 * deliberadamente menor do que os 4,5 MB, porque o corpo de um `multipart` não
 * é só a soma dos ficheiros — leva fronteiras, cabeçalhos por parte e os
 * nomes. Ficar rente ao tecto para poupar uma volta é trocar uma volta por um
 * 413 que a pessoa vê no último passo do formulário.
 *
 * **Não faz as voltas em paralelo.** Seriam mais rápidas numa rede boa e
 * piores na rede de uma cavalariça, que é onde isto corre: várias subidas a
 * disputar a mesma ligação estreita acabam todas mais tarde do que se fossem
 * em fila, e uma falha a meio deixa metade subida sem se saber qual.
 */

/**
 * O que cabe num pedido. São 3,5 MB contra um tecto de 4,5: a folga leva o
 * peso do `multipart` e o resto do formulário, e ainda sobra para uma
 * fotografia sair maior do que o previsto.
 */
export const ORCAMENTO_POR_VOLTA = 3.5 * 1024 * 1024;

/**
 * Quantas fotografias, no máximo, por volta — mesmo que sejam todas pequenas.
 * Um pedido com trinta partes é lento a montar no telemóvel e demora a ser
 * lido do outro lado; e uma falha nesse pedido deita fora trinta subidas.
 */
export const MAXIMO_POR_VOLTA = 4;

/**
 * Agrupa as fotografias em voltas que cabem no orçamento.
 *
 * Um ficheiro sozinho maior do que o orçamento **vai à mesma, sozinho**. Não é
 * optimismo: é que a alternativa seria recusá-lo aqui, e recusar uma
 * fotografia que talvez passasse é pior do que tentar e deixar o servidor
 * responder. Só se garante que não leva companhia.
 */
export function agruparEmVoltas<T extends { size: number }>(
  ficheiros: T[],
  orcamento: number = ORCAMENTO_POR_VOLTA,
  maximo: number = MAXIMO_POR_VOLTA
): T[][] {
  const voltas: T[][] = [];
  let volta: T[] = [];
  let peso = 0;

  for (const f of ficheiros) {
    const naoCabe = volta.length > 0 && (peso + f.size > orcamento || volta.length >= maximo);
    if (naoCabe) {
      voltas.push(volta);
      volta = [];
      peso = 0;
    }
    volta.push(f);
    peso += f.size;
  }

  if (volta.length > 0) voltas.push(volta);
  return voltas;
}

export interface ResultadoDaSubida {
  urls: string[];
  /** Quantas voltas foram precisas. Serve para explicar a espera a quem vê. */
  voltas: number;
}

/**
 * Sobe tudo, volta a volta, pela ordem em que as fotografias vêm — que é a
 * ordem em que o vendedor as escolheu, e a ordem por que vão aparecer.
 *
 * Se uma volta falhar, **lança com o que já tinha subido**. Quem chama decide:
 * as fotografias das voltas anteriores estão no balde e os URLs não se perdem,
 * o que evita que uma segunda tentativa suba tudo outra vez.
 */
export class SubidaFalhada extends Error {
  constructor(
    mensagem: string,
    /** Os URLs das voltas que chegaram a subir antes da falha. */
    readonly urlsJaSubidos: string[]
  ) {
    super(mensagem);
    this.name = "SubidaFalhada";
  }
}

export async function subirFotografias(
  ficheiros: File[],
  subirUmaVolta: (lote: File[]) => Promise<string[]>,
  opcoes: {
    orcamento?: number;
    maximo?: number;
    /** Chamado ao fim de cada volta, para a barra andar. */
    aoProgredir?: (subidas: number, total: number) => void;
  } = {}
): Promise<ResultadoDaSubida> {
  const voltas = agruparEmVoltas(ficheiros, opcoes.orcamento, opcoes.maximo);
  const urls: string[] = [];

  for (const lote of voltas) {
    try {
      urls.push(...(await subirUmaVolta(lote)));
    } catch (erro) {
      throw new SubidaFalhada(erro instanceof Error ? erro.message : String(erro), urls);
    }
    opcoes.aoProgredir?.(urls.length, ficheiros.length);
  }

  return { urls, voltas: voltas.length };
}
