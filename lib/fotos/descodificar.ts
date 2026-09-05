/**
 * Qual é o formato, e quem o sabe ler.
 *
 * O formato lê-se **nos bytes**, nunca no `Content-Type` do `FormData` nem na
 * extensão do nome — os dois são texto que o cliente escreveu. É a segunda das
 * três regras do `lib/documentos/contrato.ts`, e vale aqui inteira: se alguém
 * pode escolher o ramo do descodificador que corre, pode escolher o caminho de
 * código que quer atacar.
 */

import { lerLumaDeJpeg } from "./jpeg";
import { type PlanoLuma } from "./plano";
import { lerLumaDePng } from "./png";

/** Os formatos que este directório sabe imprimir. */
export const FORMATOS = ["jpeg", "png"] as const;
export type Formato = (typeof FORMATOS)[number];

export class ErroDeFormato extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroDeFormato";
  }
}

/**
 * O formato de uma fotografia, pela assinatura dos primeiros bytes.
 *
 * Devolve `null` quando não reconhece — e não levanta erro, porque «não sei o
 * que isto é» é uma resposta legítima que quem chama pode querer tratar sem um
 * `try`.
 *
 * O WebP é reconhecido de propósito, mesmo não sendo descodificado: assim o
 * erro que a rota vê é «WebP, que ainda não sei ler» e não «formato
 * desconhecido», que mandaria alguém procurar um ficheiro corrompido que não
 * existe. Ver `lerLuma` para a razão de não estar feito.
 */
export function formatoDe(bytes: Uint8Array): Formato | "webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return "webp";
  }
  return null;
}

/**
 * O plano de luminância de uma fotografia, seja qual for o formato.
 *
 * ## O WebP não está feito, e é uma falha conhecida
 *
 * A rota de upload aceita `image/webp`, e este ficheiro recusa-o. Não é um
 * esquecimento: um WebP com perdas é um quadro de VP8, ou seja, um
 * descodificador de vídeo inteiro — predição intra, filtro de desbloqueio,
 * codificação aritmética booleana. São milhares de linhas, e escrevê-las à mão
 * para depois só lhes tirar uma média de blocos seria a pior troca deste
 * directório. O WebP sem perdas (VP8L) é bastante mais pequeno mas continua a
 * ser um descodificador com a sua própria árvore de Huffman, transformações de
 * cor e cache de cores.
 *
 * O que isto custa está escrito e não escondido: **uma fotografia enviada em
 * WebP não fica impressa, e por isso não entra em comparação nenhuma.** Quem
 * quiser fugir à detecção só tem de converter para WebP antes de enviar. As
 * duas saídas — restringir a rota a JPEG e PNG, ou trazer uma dependência —
 * estão pesadas no relatório; nenhuma delas se decide neste ficheiro.
 */
export function descodificarLuma(bytes: Uint8Array): PlanoLuma {
  const formato = formatoDe(bytes);
  switch (formato) {
    case "jpeg":
      return lerLumaDeJpeg(bytes);
    case "png":
      return lerLumaDePng(bytes);
    case "webp":
      throw new ErroDeFormato("WebP ainda não é descodificado aqui");
    default:
      throw new ErroDeFormato("Formato de imagem não reconhecido pelos primeiros bytes");
  }
}
