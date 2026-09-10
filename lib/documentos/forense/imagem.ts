/**
 * O que uma imagem carrega além dos pixéis.
 *
 * Um JPEG, um PNG e um WebP não são um bloco de pixéis: são uma sequência de
 * segmentos, e a maior parte deles não é imagem nenhuma — é o EXIF que a
 * câmara escreveu, o XMP que o editor acrescentou, o comentário que a
 * biblioteca de compressão deixou, a miniatura, e por vezes bytes que ficaram
 * lá por engano de quem gravou. Percorrer os segmentos é ler tudo isso sem
 * descodificar um único pixel.
 *
 * ## O que não se faz aqui, e é a decisão que mais custou
 *
 * Não há análise de recompressão. A ideia — comparar a imagem consigo mesma
 * recomprimida, e ver que zonas reagem de maneira diferente porque já tinham
 * sido comprimidas antes — precisa de um codificador de JPEG, que este
 * repositório não tem e que não se acrescenta em duzentas linhas sem enganos.
 * E o modo de falhar dessa análise é o pior possível: ela não se cala quando
 * não sabe, **desenha uma zona colada onde não há nenhuma**. Uma imagem
 * digitalizada com iluminação desigual, um cabeçalho impresso a laser sobre
 * papel timbrado, um selo em relevo — dão todos manchas que uma análise mal
 * calibrada aponta como montagem. Preferi não a entregar a entregá-la a
 * apontar criadores honestos.
 *
 * Fica o que se mede sem adivinhar, e uma parte disso é sólida e útil: se o
 * EXIF diz que a fotografia tinha 4032 por 3024 e o ficheiro tem 1200 por 900,
 * a imagem foi redimensionada depois de captada. Isso não é uma inferência, é
 * uma subtracção.
 */

import { inflateSync } from "node:zlib";

import type { CampoDeMetadados } from "./achados";
import { lerExif, type LeituraExif } from "./exif";
import { limparCampo } from "./pdf-cru";
import { campoXmp, distintos, pareceXmp, valoresXmp } from "./xmp";

/** Comentários e blocos de texto, para o painel não receber um despejo. */
const MAX_CAMPOS_DE_TEXTO = 12;
/** Um segmento maior do que isto num documento de um cavalo é um engano. */
const MAX_BYTES_DE_SEGMENTO = 8 * 1024 * 1024;
/** Segmentos percorridos antes de se desistir. Um JPEG normal tem dezenas. */
const MAX_SEGMENTOS = 4096;

export interface LeituraDeImagem {
  campos: CampoDeMetadados[];
  exif?: LeituraExif;
  /** As medidas em pixéis lidas do próprio fluxo comprimido. */
  medidas?: [number, number];
  /** Só num JPEG. */
  jpeg?: EstruturaJpeg;
}

export interface EstruturaJpeg {
  progressivo: boolean;
  tabelasDeQuantizacao: number;
  /** Os bytes das tabelas, por ordem, para se lhes tirar uma impressão. */
  bytesDasTabelas: Uint8Array;
  varrimentos: number;
  bytesDepoisDoFim: number;
}

function comoTexto(bytes: Uint8Array): string {
  let saida = "";
  const passo = 0x8000;
  for (let i = 0; i < bytes.length; i += passo) {
    saida += String.fromCharCode(...bytes.subarray(i, Math.min(i + passo, bytes.length)));
  }
  return saida;
}

function comeca(bytes: Uint8Array, assinatura: readonly number[]): boolean {
  if (bytes.length < assinatura.length) return false;
  return assinatura.every((b, i) => bytes[i] === b);
}

// ─── JPEG ────────────────────────────────────────────────────────────────────

const MARCADORES_SOF = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

const PREFIXO_EXIF = "Exif\0\0";
const PREFIXO_XMP = "http://ns.adobe.com/xap/1.0/\0";

/**
 * Percorre os segmentos de um JPEG.
 *
 * O caminho difícil é o `SOS`: a partir dele vêm os dados comprimidos, que não
 * têm comprimento declarado e que contêm bytes `FF` a valer. A norma resolve-o
 * com o preenchimento — um `FF` de dados é sempre seguido de `00` — e com os
 * marcadores de reinício `D0`–`D7`, que aparecem no meio dos dados e não
 * terminam nada. Saltar de `FF` em `FF` ignorando esses dois casos leva ao
 * marcador seguinte a sério.
 */
function lerJpeg(bytes: Uint8Array): LeituraDeImagem | null {
  if (!comeca(bytes, [0xff, 0xd8])) return null;

  const campos: CampoDeMetadados[] = [];
  const tabelas: Uint8Array[] = [];
  const comentarios: string[] = [];
  let exif: LeituraExif | undefined;
  let xmp = "";
  let temPhotoshop = false;
  let progressivo = false;
  let varrimentos = 0;
  let medidas: [number, number] | undefined;
  let fimDaImagem = -1;

  let i = 2;
  let segmentos = 0;

  while (i + 1 < bytes.length && segmentos < MAX_SEGMENTOS) {
    segmentos += 1;
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }

    let marcador = bytes[i + 1];
    // Uma corrida de `FF` é preenchimento; o marcador é o último byte dela.
    let j = i + 1;
    while (marcador === 0xff && j + 1 < bytes.length) {
      j += 1;
      marcador = bytes[j];
    }

    if (marcador === 0xd9) {
      fimDaImagem = j + 1;
      break;
    }
    if (marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) {
      i = j + 1;
      continue;
    }

    if (j + 2 >= bytes.length) break;
    const comprimento = (bytes[j + 1] << 8) | bytes[j + 2];
    if (comprimento < 2) break;
    const inicio = j + 3;
    const fim = Math.min(bytes.length, inicio + comprimento - 2);
    if (fim - inicio > MAX_BYTES_DE_SEGMENTO) break;
    const conteudo = bytes.subarray(inicio, fim);

    if (marcador === 0xdb) tabelas.push(conteudo);
    else if (marcador === 0xfe) comentarios.push(limparCampo(comoTexto(conteudo)));
    else if (marcador === 0xed && comoTexto(conteudo.subarray(0, 13)) === "Photoshop 3.0") {
      temPhotoshop = true;
    } else if (marcador === 0xe1) {
      const cabeca = comoTexto(conteudo.subarray(0, 32));
      if (cabeca.startsWith(PREFIXO_EXIF)) {
        exif = lerExif(conteudo.subarray(6)) ?? exif;
      } else if (cabeca.startsWith(PREFIXO_XMP)) {
        xmp += comoTexto(conteudo.subarray(PREFIXO_XMP.length));
      }
    } else if (MARCADORES_SOF.has(marcador)) {
      if (marcador === 0xc2 || marcador === 0xc6 || marcador === 0xca) progressivo = true;
      if (conteudo.length >= 5 && !medidas) {
        const altura = (conteudo[1] << 8) | conteudo[2];
        const largura = (conteudo[3] << 8) | conteudo[4];
        if (largura > 0 && altura > 0) medidas = [largura, altura];
      }
    } else if (marcador === 0xda) {
      varrimentos += 1;
      // Os dados comprimidos começam aqui. Vai-se até ao marcador seguinte que
      // não seja preenchimento nem reinício.
      let k = fim;
      while (k + 1 < bytes.length) {
        if (bytes[k] !== 0xff) {
          k += 1;
          continue;
        }
        const seguinte = bytes[k + 1];
        if (seguinte === 0x00 || seguinte === 0xff || (seguinte >= 0xd0 && seguinte <= 0xd7)) {
          k += 2;
          continue;
        }
        break;
      }
      i = k;
      continue;
    }

    i = fim;
  }

  const bytesDasTabelas = new Uint8Array(tabelas.reduce((soma, t) => soma + t.length, 0));
  let escrito = 0;
  for (const tabela of tabelas) {
    bytesDasTabelas.set(tabela, escrito);
    escrito += tabela.length;
  }

  for (const comentario of comentarios.slice(0, MAX_CAMPOS_DE_TEXTO)) {
    if (comentario) campos.push({ campo: "Comentário JPEG", valor: comentario });
  }
  if (temPhotoshop) {
    campos.push({ campo: "Bloco de recursos", valor: "Photoshop 3.0 (IPTC/IRB)" });
  }
  campos.push(...camposDeXmp(xmp));

  return {
    campos,
    ...(exif ? { exif } : {}),
    ...(medidas ? { medidas } : {}),
    jpeg: {
      progressivo,
      tabelasDeQuantizacao: tabelas.length,
      bytesDasTabelas,
      varrimentos,
      bytesDepoisDoFim: fimDaImagem === -1 ? 0 : Math.max(0, bytes.length - fimDaImagem),
    },
  };
}

// ─── PNG ─────────────────────────────────────────────────────────────────────

const ASSINATURA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** As chaves de texto de um PNG que dizem alguma coisa sobre a origem. */
const CHAVES_DE_TEXTO = new Set([
  "Software",
  "Source",
  "Comment",
  "Description",
  "Author",
  "Creation Time",
  "Title",
  "Copyright",
]);

function lerPng(bytes: Uint8Array): LeituraDeImagem | null {
  if (!comeca(bytes, ASSINATURA_PNG)) return null;

  const campos: CampoDeMetadados[] = [];
  let exif: LeituraExif | undefined;
  let xmp = "";
  let medidas: [number, number] | undefined;

  let i = 8;
  let chunks = 0;
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  while (i + 8 <= bytes.length && chunks < MAX_SEGMENTOS) {
    chunks += 1;
    const comprimento = vista.getUint32(i);
    if (comprimento > MAX_BYTES_DE_SEGMENTO) break;
    const tipo = comoTexto(bytes.subarray(i + 4, i + 8));
    const inicio = i + 8;
    const fim = inicio + comprimento;
    if (fim > bytes.length) break;
    const conteudo = bytes.subarray(inicio, fim);

    if (tipo === "IHDR" && conteudo.length >= 8) {
      const largura = vista.getUint32(inicio);
      const altura = vista.getUint32(inicio + 4);
      if (largura > 0 && altura > 0) medidas = [largura, altura];
    } else if (tipo === "eXIf") {
      exif = lerExif(conteudo) ?? exif;
    } else if (tipo === "iTXt" || tipo === "tEXt" || tipo === "zTXt") {
      const campo = lerTextoDePng(tipo, conteudo);
      if (campo && campos.length < MAX_CAMPOS_DE_TEXTO) {
        if (campo.campo === "XML:com.adobe.xmp") xmp += campo.valor;
        else campos.push(campo);
      }
    } else if (tipo === "IEND") {
      break;
    }

    i = fim + 4;
  }

  campos.push(...camposDeXmp(xmp));
  if (campos.length === 0 && !exif) return medidas ? { campos, medidas } : null;

  return {
    campos,
    ...(exif ? { exif } : {}),
    ...(medidas ? { medidas } : {}),
  };
}

function lerTextoDePng(tipo: string, conteudo: Uint8Array): CampoDeMetadados | null {
  const nulo = conteudo.indexOf(0);
  if (nulo <= 0) return null;
  const chave = comoTexto(conteudo.subarray(0, nulo));

  if (tipo === "tEXt") {
    if (!CHAVES_DE_TEXTO.has(chave)) return null;
    return { campo: chave, valor: limparCampo(comoTexto(conteudo.subarray(nulo + 1))) };
  }

  if (tipo === "zTXt") {
    if (!CHAVES_DE_TEXTO.has(chave)) return null;
    try {
      const inflado = inflateSync(conteudo.subarray(nulo + 2), {
        maxOutputLength: MAX_BYTES_DE_SEGMENTO,
      });
      return { campo: chave, valor: limparCampo(comoTexto(new Uint8Array(inflado))) };
    } catch {
      return null;
    }
  }

  // iTXt: chave, bandeira de compressão, método, língua, chave traduzida, texto.
  if (conteudo.length < nulo + 3) return null;
  const comprimido = conteudo[nulo + 1] === 1;
  let p = nulo + 3;
  for (let saltos = 0; saltos < 2; saltos += 1) {
    const seguinte = conteudo.indexOf(0, p);
    if (seguinte === -1) return null;
    p = seguinte + 1;
  }
  const corpo = conteudo.subarray(p);
  if (!comprimido) {
    if (chave !== "XML:com.adobe.xmp" && !CHAVES_DE_TEXTO.has(chave)) return null;
    return { campo: chave, valor: comoTexto(corpo).slice(0, 60_000) };
  }
  try {
    const inflado = inflateSync(corpo, { maxOutputLength: MAX_BYTES_DE_SEGMENTO });
    if (chave !== "XML:com.adobe.xmp" && !CHAVES_DE_TEXTO.has(chave)) return null;
    return { campo: chave, valor: comoTexto(new Uint8Array(inflado)).slice(0, 60_000) };
  } catch {
    return null;
  }
}

// ─── WebP ────────────────────────────────────────────────────────────────────

/**
 * Um WebP é um contentor RIFF: quatro letras, quatro bytes de comprimento, os
 * dados, e um byte de enchimento se o comprimento for ímpar.
 *
 * As medidas saem do `VP8X`, e não dos outros dois formatos de fluxo, porque
 * **um WebP com EXIF é obrigatoriamente `VP8X`** — a norma só prevê metadados
 * no formato estendido. Ler os outros dois seria escrever descodificação de
 * cabeçalhos VP8 para uma comparação que nunca chegaria a acontecer.
 */
function lerWebp(bytes: Uint8Array): LeituraDeImagem | null {
  if (bytes.length < 12) return null;
  if (comoTexto(bytes.subarray(0, 4)) !== "RIFF") return null;
  if (comoTexto(bytes.subarray(8, 12)) !== "WEBP") return null;

  const campos: CampoDeMetadados[] = [];
  let exif: LeituraExif | undefined;
  let xmp = "";
  let medidas: [number, number] | undefined;

  let i = 12;
  let chunks = 0;
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  while (i + 8 <= bytes.length && chunks < MAX_SEGMENTOS) {
    chunks += 1;
    const tipo = comoTexto(bytes.subarray(i, i + 4));
    const comprimento = vista.getUint32(i + 4, true);
    if (comprimento > MAX_BYTES_DE_SEGMENTO) break;
    const inicio = i + 8;
    const fim = inicio + comprimento;
    if (fim > bytes.length) break;
    const conteudo = bytes.subarray(inicio, fim);

    if (tipo === "VP8X" && conteudo.length >= 10) {
      const largura = 1 + (conteudo[4] | (conteudo[5] << 8) | (conteudo[6] << 16));
      const altura = 1 + (conteudo[7] | (conteudo[8] << 8) | (conteudo[9] << 16));
      medidas = [largura, altura];
    } else if (tipo === "EXIF") {
      const cabeca = comoTexto(conteudo.subarray(0, 6));
      exif = lerExif(cabeca === PREFIXO_EXIF ? conteudo.subarray(6) : conteudo) ?? exif;
    } else if (tipo === "XMP ") {
      xmp += comoTexto(conteudo);
    }

    i = fim + (comprimento % 2);
  }

  campos.push(...camposDeXmp(xmp));
  if (campos.length === 0 && !exif) return medidas ? { campos, medidas } : null;

  return {
    campos,
    ...(exif ? { exif } : {}),
    ...(medidas ? { medidas } : {}),
  };
}

// ─── XMP dentro de uma imagem ────────────────────────────────────────────────

/**
 * Os campos do XMP de uma imagem.
 *
 * São menos do que os que se lêem de um PDF, e de propósito: aqui interessa
 * quem produziu e o que já se lhe fez. O `xmpMM:History` de uma imagem é o
 * mesmo registo de gravações que a Adobe escreve num PDF, e o
 * `photoshop:LegacyIPTCDigest` é a marca de que passou por um bloco IPTC.
 */
function camposDeXmp(xmp: string): CampoDeMetadados[] {
  if (!xmp || !pareceXmp(xmp)) return [];
  const campos: CampoDeMetadados[] = [];

  for (const nome of ["xmp:CreatorTool", "tiff:Make", "tiff:Model", "dc:creator"]) {
    const valor = campoXmp(xmp, nome);
    if (valor) campos.push({ campo: nome, valor });
  }

  const historia = /<xmpMM:History>([\s\S]{0,60000}?)<\/xmpMM:History>/.exec(xmp);
  if (historia) {
    const ferramentas = distintos(valoresXmp(historia[1], "stEvt:softwareAgent"));
    const operacoes = distintos(valoresXmp(historia[1], "stEvt:action"));
    if (ferramentas.length > 0) {
      campos.push({ campo: "xmpMM:History (ferramentas)", valor: ferramentas.join(", ") });
    }
    if (operacoes.length > 0) {
      campos.push({ campo: "xmpMM:History (acções)", valor: operacoes.join(", ") });
    }
  }

  return campos;
}

// ─── A porta ─────────────────────────────────────────────────────────────────

/**
 * O que se conseguiu ler de uma imagem, ou `null` se os bytes não são do
 * formato que o MIME diz.
 *
 * Nunca lança. Um contentor cortado a meio devolve o que se leu até ao sítio
 * onde deixou de fazer sentido — que é a resposta certa: um ficheiro truncado
 * ainda tem EXIF, e o EXIF ainda é verdade.
 */
export function lerImagem(bytes: Uint8Array, mime: string): LeituraDeImagem | null {
  try {
    if (mime === "image/jpeg") return lerJpeg(bytes);
    if (mime === "image/png") return lerPng(bytes);
    if (mime === "image/webp") return lerWebp(bytes);
  } catch {
    return null;
  }
  return null;
}
