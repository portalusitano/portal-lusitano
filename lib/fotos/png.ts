/**
 * Ler a luminância de um PNG.
 *
 * Ao contrário do JPEG, aqui não há atalho: um PNG guarda os pixels todos e
 * não traz lá dentro nenhuma versão reduzida de si mesmo. Tem de se
 * descomprimir o fluxo e desfazer os filtros por linha, e só depois se reduz.
 *
 * A descompressão é do `node:zlib`, que já cá está — é o mesmo caminho que o
 * `lib/documentos/leitura/texto-pdf.ts` seguiu para os fluxos de um PDF, e pela
 * mesma razão escrita: um deflate em JavaScript seria centenas de linhas para
 * resolver um problema que o Node já resolve, mais depressa e há mais anos.
 *
 * Consequência a assumir: **este ficheiro só corre no servidor.** É a mesma
 * fronteira que o leitor de PDF tem.
 *
 * ## O que se recusa, e porquê
 *
 * - **Entrelaçamento Adam7.** Uma máquina fotográfica não o produz, um
 *   telemóvel não o produz e um exportador de imagem só o faz se lho pedirem.
 *   Desentrelaçar são sete passagens com sete grelhas diferentes — código a
 *   sério, que teria de ser testado a sério, para uma fatia de fotografias que
 *   na prática é vazia. Recusa-se com erro, que é honesto, em vez de se ler mal
 *   e produzir uma impressão que não corresponde à imagem.
 * - **APNG.** O primeiro quadro de um APNG é um PNG válido e é esse que se lê;
 *   os quadros seguintes ficam nos chunks `fdAT`, que aqui se ignoram. Uma
 *   fotografia de cavalo não é uma animação.
 *
 * O canal alfa entra na luminância composto **sobre branco**, e não ignorado.
 * Ignorá-lo faria uma imagem transparente ler-se pelo que está por baixo do
 * alfa — que é muitas vezes preto, ou lixo — em vez de pelo que se vê.
 */

import { inflateSync } from "node:zlib";

import { criarPlano, luminancia, type PlanoLuma } from "./plano";

export class ErroDePng extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroDePng";
  }
}

const ASSINATURA = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const MAX_PIXELS = 80_000_000;
/** Tecto sobre o resultado do inflate, para um chunk comprimido não rebentar. */
const MAX_DESCOMPRIMIDO = 512 * 1024 * 1024;

/** Canais por tipo de cor, pela tabela da norma. */
const CANAIS: Readonly<Record<number, number>> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function lerU32(bytes: Uint8Array, posicao: number): number {
  return (
    bytes[posicao] * 0x1000000 +
    ((bytes[posicao + 1] << 16) | (bytes[posicao + 2] << 8) | bytes[posicao + 3])
  );
}

/**
 * Desfaz os filtros por linha.
 *
 * Cada linha do PNG começa por um byte que diz qual dos cinco filtros lhe foi
 * aplicado, e desfazê-lo depende da linha **já reconstruída** acima e do pixel
 * já reconstruído à esquerda. É por isso que isto é sequencial e não se pode
 * paralelizar: a linha `n` precisa da `n−1` inteira.
 */
function desfiltrar(
  bruto: Uint8Array,
  largura: number,
  altura: number,
  bytesPorPixel: number
): Uint8Array {
  const bytesPorLinha = largura * bytesPorPixel;
  const esperado = (bytesPorLinha + 1) * altura;
  if (bruto.length < esperado) {
    throw new ErroDePng(`Dados a menos: ${bruto.length} bytes para ${esperado} esperados`);
  }

  const saida = new Uint8Array(bytesPorLinha * altura);
  let origem = 0;
  for (let y = 0; y < altura; y++) {
    const filtro = bruto[origem++];
    const linha = y * bytesPorLinha;
    const acima = linha - bytesPorLinha;

    for (let i = 0; i < bytesPorLinha; i++) {
      const x = bruto[origem + i];
      const a = i >= bytesPorPixel ? saida[linha + i - bytesPorPixel] : 0;
      const b = y > 0 ? saida[acima + i] : 0;
      const c = y > 0 && i >= bytesPorPixel ? saida[acima + i - bytesPorPixel] : 0;

      let valor: number;
      switch (filtro) {
        case 0:
          valor = x;
          break;
        case 1:
          valor = x + a;
          break;
        case 2:
          valor = x + b;
          break;
        case 3:
          valor = x + ((a + b) >> 1);
          break;
        case 4: {
          // Paeth: escolhe entre esquerda, cima e diagonal aquele que estiver
          // mais perto da previsão linear `a + b − c`.
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          valor = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default:
          throw new ErroDePng(`Filtro de linha desconhecido: ${filtro}`);
      }
      saida[linha + i] = valor & 0xff;
    }
    origem += bytesPorLinha;
  }
  return saida;
}

/** Lê um PNG e devolve o plano de luminância à resolução da imagem. */
export function lerLumaDePng(bytes: Uint8Array): PlanoLuma {
  if (bytes.length < 8 + 25) throw new ErroDePng("Demasiado curto para ser um PNG");
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== ASSINATURA[i]) throw new ErroDePng("Assinatura de PNG errada");
  }

  let largura = 0;
  let altura = 0;
  let profundidade = 0;
  let tipoDeCor = 0;
  let paleta: Uint8Array | null = null;
  const pedacos: Uint8Array[] = [];
  let viuCabecalho = false;

  let posicao = 8;
  while (posicao + 8 <= bytes.length) {
    const comprimento = lerU32(bytes, posicao);
    if (comprimento > bytes.length) throw new ErroDePng("Chunk com comprimento impossível");
    const tipo = String.fromCharCode(
      bytes[posicao + 4],
      bytes[posicao + 5],
      bytes[posicao + 6],
      bytes[posicao + 7]
    );
    const dados = posicao + 8;
    if (dados + comprimento > bytes.length) throw new ErroDePng("Chunk truncado");

    if (tipo === "IHDR") {
      if (comprimento < 13) throw new ErroDePng("IHDR truncado");
      largura = lerU32(bytes, dados);
      altura = lerU32(bytes, dados + 4);
      profundidade = bytes[dados + 8];
      tipoDeCor = bytes[dados + 9];
      const entrelacado = bytes[dados + 12];
      if (largura < 1 || altura < 1) throw new ErroDePng("PNG sem dimensões");
      if (largura * altura > MAX_PIXELS) {
        throw new ErroDePng(`Imagem demasiado grande: ${largura}×${altura}`);
      }
      if (entrelacado !== 0) throw new ErroDePng("PNG entrelaçado (Adam7) não suportado");
      if (CANAIS[tipoDeCor] === undefined) {
        throw new ErroDePng(`Tipo de cor desconhecido: ${tipoDeCor}`);
      }
      if (tipoDeCor === 3 ? profundidade > 8 : profundidade !== 8 && profundidade !== 16) {
        throw new ErroDePng(`Profundidade de ${profundidade} bits não suportada`);
      }
      viuCabecalho = true;
    } else if (tipo === "PLTE") {
      paleta = bytes.slice(dados, dados + comprimento);
    } else if (tipo === "IDAT") {
      pedacos.push(bytes.subarray(dados, dados + comprimento));
    } else if (tipo === "IEND") {
      break;
    }

    posicao = dados + comprimento + 4; // + CRC, que não se verifica.
  }

  if (!viuCabecalho) throw new ErroDePng("PNG sem IHDR");
  if (pedacos.length === 0) throw new ErroDePng("PNG sem dados de imagem");

  // Os IDAT são um único fluxo deflate partido em pedaços: juntam-se antes de
  // descomprimir, porque cada pedaço isolado não é um fluxo válido.
  let total = 0;
  for (const p of pedacos) total += p.length;
  const comprimido = new Uint8Array(total);
  let offset = 0;
  for (const p of pedacos) {
    comprimido.set(p, offset);
    offset += p.length;
  }

  let bruto: Uint8Array;
  try {
    bruto = new Uint8Array(inflateSync(comprimido, { maxOutputLength: MAX_DESCOMPRIMIDO }));
  } catch (erro) {
    throw new ErroDePng(`Fluxo comprimido inválido: ${(erro as Error).message}`);
  }

  const canais = CANAIS[tipoDeCor];
  const plano = criarPlano(largura, altura);

  if (tipoDeCor === 3) {
    if (!paleta) throw new ErroDePng("PNG com paleta mas sem PLTE");
    // Com paleta a profundidade pode ser 1, 2, 4 ou 8 bits por índice, e as
    // linhas vêm alinhadas ao byte. É o único caso em que um pixel não ocupa um
    // número inteiro de bytes.
    const bytesPorLinha = Math.ceil((largura * profundidade) / 8);
    const pixels = desfiltrarComBits(bruto, bytesPorLinha, altura, profundidade);
    const porByte = 8 / profundidade;
    const mascara = (1 << profundidade) - 1;
    for (let y = 0; y < altura; y++) {
      for (let x = 0; x < largura; x++) {
        const byte = pixels[y * bytesPorLinha + Math.floor(x / porByte)];
        const deslocamento = 8 - profundidade * ((x % porByte) + 1);
        const indice = (byte >> deslocamento) & mascara;
        const p = indice * 3;
        plano.amostras[y * largura + x] =
          p + 2 < paleta.length ? luminancia(paleta[p], paleta[p + 1], paleta[p + 2]) : 0;
      }
    }
    return plano;
  }

  const bytesPorAmostra = profundidade === 16 ? 2 : 1;
  const bytesPorPixel = canais * bytesPorAmostra;
  const pixels = desfiltrar(bruto, largura, altura, bytesPorPixel);
  // A 16 bits fica-se pelo byte alto. O oitavo bit de precisão já é muito mais
  // do que uma impressão perceptual consegue usar, e converter tudo para 8 bits
  // aqui evita um segundo caminho em todo o resto do ficheiro.
  // A 16 bits o byte alto vem primeiro (o PNG é big-endian), portanto ler só o
  // primeiro byte de cada amostra é exactamente reduzir a 8 bits.
  for (let i = 0, n = largura * altura; i < n; i++) {
    const p = i * bytesPorPixel;
    let r: number;
    let g: number;
    let b: number;
    let a = 255;
    if (canais === 1) {
      r = g = b = pixels[p];
    } else if (canais === 2) {
      r = g = b = pixels[p];
      a = pixels[p + bytesPorAmostra];
    } else if (canais === 3) {
      r = pixels[p];
      g = pixels[p + bytesPorAmostra];
      b = pixels[p + 2 * bytesPorAmostra];
    } else {
      r = pixels[p];
      g = pixels[p + bytesPorAmostra];
      b = pixels[p + 2 * bytesPorAmostra];
      a = pixels[p + 3 * bytesPorAmostra];
    }
    const luz = luminancia(r, g, b);
    // Composição sobre branco. Ver o cabeçalho.
    plano.amostras[i] = a === 255 ? luz : (luz * a + 255 * (255 - a)) / 255;
  }

  return plano;
}

/**
 * O desfiltrar do caso com paleta, onde a unidade não é o pixel mas o byte.
 *
 * O filtro do PNG opera sempre sobre bytes, e o «pixel anterior» é o byte a
 * `ceil(bits_por_pixel / 8)` de distância — que abaixo de 8 bits é 1. Escrever
 * isto como um caso do `desfiltrar` normal obrigava-o a saber de bits; fica
 * aqui, curto e à parte.
 */
function desfiltrarComBits(
  bruto: Uint8Array,
  bytesPorLinha: number,
  altura: number,
  profundidade: number
): Uint8Array {
  const distancia = Math.max(1, Math.ceil(profundidade / 8));
  const esperado = (bytesPorLinha + 1) * altura;
  if (bruto.length < esperado) throw new ErroDePng("Dados a menos para as linhas declaradas");

  const saida = new Uint8Array(bytesPorLinha * altura);
  let origem = 0;
  for (let y = 0; y < altura; y++) {
    const filtro = bruto[origem++];
    const linha = y * bytesPorLinha;
    const acima = linha - bytesPorLinha;
    for (let i = 0; i < bytesPorLinha; i++) {
      const x = bruto[origem + i];
      const a = i >= distancia ? saida[linha + i - distancia] : 0;
      const b = y > 0 ? saida[acima + i] : 0;
      const c = y > 0 && i >= distancia ? saida[acima + i - distancia] : 0;
      let valor: number;
      switch (filtro) {
        case 0:
          valor = x;
          break;
        case 1:
          valor = x + a;
          break;
        case 2:
          valor = x + b;
          break;
        case 3:
          valor = x + ((a + b) >> 1);
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          valor = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default:
          throw new ErroDePng(`Filtro de linha desconhecido: ${filtro}`);
      }
      saida[linha + i] = valor & 0xff;
    }
    origem += bytesPorLinha;
  }
  return saida;
}
