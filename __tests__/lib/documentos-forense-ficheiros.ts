/**
 * Ficheiros feitos à mão para os testes do exame forense.
 *
 * São ficheiros a sério — bytes com a estrutura que a norma manda —, e não
 * amostras gravadas. A razão é a mesma que o `documentos-leitura-pdfs.ts` dá, e
 * aqui há uma segunda: os ficheiros que este módulo examina são documentos de
 * identificação de cavalos, e **não se vai buscar um Livro Azul verdadeiro de
 * alguém para o pôr num repositório**. Cada caso monta-se: o PDF guardado duas
 * vezes, o que traz um produtor, o que tem um rectângulo branco por cima de um
 * campo, o JPEG com EXIF e coordenadas.
 *
 * Onde é possível reaproveita-se o `montarPdf` que já cá estava. O que aqui se
 * acrescenta é o remate `startxref … %%EOF` — que esse não escreve, por não
 * precisar dele —, e é justamente o remate que o exame das revisões conta.
 */

import { deflateSync } from "node:zlib";

// ─── Bytes ───────────────────────────────────────────────────────────────────

export function bytesDe(valor: string): Uint8Array {
  return new Uint8Array(Buffer.from(valor, "latin1"));
}

export function juntar(pedacos: readonly Uint8Array[]): Uint8Array {
  const total = pedacos.reduce((soma, p) => soma + p.length, 0);
  const saida = new Uint8Array(total);
  let escrito = 0;
  for (const pedaco of pedacos) {
    saida.set(pedaco, escrito);
    escrito += pedaco.length;
  }
  return saida;
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

export interface ObjectoPdf {
  numero: number;
  dicionario: string;
  stream?: string | Uint8Array;
  comprimir?: boolean;
}

function corpoDosObjectos(objectos: readonly ObjectoPdf[]): Uint8Array {
  const pedacos: Uint8Array[] = [];
  for (const objecto of objectos) {
    if (objecto.stream === undefined) {
      pedacos.push(bytesDe(`${objecto.numero} 0 obj\n${objecto.dicionario}\nendobj\n`));
      continue;
    }
    const crus = typeof objecto.stream === "string" ? bytesDe(objecto.stream) : objecto.stream;
    const dados = objecto.comprimir ? new Uint8Array(deflateSync(crus)) : crus;
    const filtro = objecto.comprimir ? "/Filter /FlateDecode " : "";
    const dicionario = objecto.dicionario.replace(
      /\s*>>\s*$/,
      ` ${filtro}/Length ${dados.length} >>`
    );
    pedacos.push(bytesDe(`${objecto.numero} 0 obj\n${dicionario}\nstream\n`));
    pedacos.push(dados);
    pedacos.push(bytesDe("\nendstream\nendobj\n"));
  }
  return juntar(pedacos);
}

/**
 * Um PDF com um remate a sério — `startxref`, um deslocamento e `%%EOF`.
 *
 * O deslocamento não aponta para uma tabela verdadeira, e não faz falta: o
 * exame não a lê, varre os objectos, e é essa decisão que aqui se exerce.
 */
export function montarPdfComRemate(
  objectos: readonly ObjectoPdf[],
  opcoes: { trailer?: string; cabecalho?: string } = {}
): Uint8Array {
  const cabecalho = bytesDe(opcoes.cabecalho ?? "%PDF-1.7\n");
  const corpo = corpoDosObjectos(objectos);
  const trailer = opcoes.trailer ?? "<< /Root 1 0 R >>";
  const remate = bytesDe(`trailer\n${trailer}\nstartxref\n${cabecalho.length}\n%%EOF\n`);
  return juntar([cabecalho, corpo, remate]);
}

/**
 * O mesmo ficheiro, guardado outra vez sem se reescrever: o original inteiro,
 * e por cima dele os objectos novos e um segundo remate.
 *
 * É isto, e literalmente isto, que o Acrobat faz ao preencher um formulário.
 */
export function acrescentarRevisao(
  base: Uint8Array,
  objectos: readonly ObjectoPdf[],
  opcoes: { trailer?: string } = {}
): Uint8Array {
  const corpo = corpoDosObjectos(objectos);
  const trailer = opcoes.trailer ?? `<< /Root 1 0 R /Prev ${base.length} >>`;
  const remate = bytesDe(`trailer\n${trailer}\nstartxref\n${base.length}\n%%EOF\n`);
  return juntar([base, corpo, remate]);
}

/** As páginas mínimas para um PDF ter um documento lá dentro. */
export function esqueleto(conteudo: string, extras = ""): ObjectoPdf[] {
  return [
    { numero: 1, dicionario: "<< /Type /Catalog /Pages 2 0 R >>" },
    { numero: 2, dicionario: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
    {
      numero: 3,
      dicionario:
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R " +
        `/Resources << /Font << /F1 5 0 R >> ${extras} >> >>`,
    },
    { numero: 4, dicionario: "<< >>", stream: conteudo },
    {
      numero: 5,
      dicionario: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    },
  ];
}

// ─── TIFF e EXIF ─────────────────────────────────────────────────────────────

export type ValorExif =
  | { ascii: string }
  | { short: number }
  | { long: number }
  | { rationals: readonly (readonly [number, number])[] };

export interface EntradaExif {
  etiqueta: number;
  valor: ValorExif;
}

interface EntradaPreparada {
  etiqueta: number;
  tipo: number;
  contagem: number;
  /** Os bytes do valor, quando não cabem nos quatro do próprio registo. */
  fora?: Uint8Array;
  /** O valor inline, quando cabe. */
  dentro?: number;
}

function prepararEntrada(entrada: EntradaExif): EntradaPreparada {
  const { etiqueta, valor } = entrada;
  if ("ascii" in valor) {
    // A norma manda o terminador a zero dentro da contagem. Um valor de até
    // quatro bytes fica no próprio registo em vez de ir para a área de dados —
    // é o `escreverLista` que decide, pelo comprimento.
    const bytes = juntar([bytesDe(valor.ascii), new Uint8Array([0])]);
    return { etiqueta, tipo: 2, contagem: bytes.length, fora: bytes };
  }
  if ("short" in valor) return { etiqueta, tipo: 3, contagem: 1, dentro: valor.short };
  if ("long" in valor) return { etiqueta, tipo: 4, contagem: 1, dentro: valor.long };

  const bytes = new Uint8Array(valor.rationals.length * 8);
  const vista = new DataView(bytes.buffer);
  valor.rationals.forEach(([n, d], i) => {
    vista.setUint32(i * 8, n, true);
    vista.setUint32(i * 8 + 4, d, true);
  });
  return { etiqueta, tipo: 5, contagem: valor.rationals.length, fora: bytes };
}

function tamanhoDaLista(quantas: number): number {
  return 2 + 12 * quantas + 4;
}

function parear(valor: number): number {
  return valor % 2 === 0 ? valor : valor + 1;
}

/**
 * Um bloco TIFF em ordem de bytes pequena primeiro, com IFD0 e, se pedidos, os
 * blocos Exif e GPS apontados a partir dele.
 *
 * A disposição é a normal: cada lista de entradas seguida da área onde ficam os
 * valores que não cabem nos quatro bytes do registo.
 */
export function montarTiff(entrada: {
  ifd0?: readonly EntradaExif[];
  exif?: readonly EntradaExif[];
  gps?: readonly EntradaExif[];
}): Uint8Array {
  const ifd0 = (entrada.ifd0 ?? []).map(prepararEntrada);
  const exif = (entrada.exif ?? []).map(prepararEntrada);
  const gps = (entrada.gps ?? []).map(prepararEntrada);

  const comExif = exif.length > 0;
  const comGps = gps.length > 0;
  const quantasIfd0 = ifd0.length + (comExif ? 1 : 0) + (comGps ? 1 : 0);

  const dados = (lista: readonly EntradaPreparada[]) =>
    lista.reduce((soma, e) => soma + (e.fora ? parear(e.fora.length) : 0), 0);

  const posIfd0 = 8;
  const posDados0 = posIfd0 + tamanhoDaLista(quantasIfd0);
  const posExif = posDados0 + dados(ifd0);
  const posDadosExif = posExif + (comExif ? tamanhoDaLista(exif.length) : 0);
  const posGps = posDadosExif + dados(exif);
  const posDadosGps = posGps + (comGps ? tamanhoDaLista(gps.length) : 0);
  const total = posDadosGps + dados(gps);

  const saida = new Uint8Array(total);
  const vista = new DataView(saida.buffer);

  saida[0] = 0x49;
  saida[1] = 0x49;
  vista.setUint16(2, 42, true);
  vista.setUint32(4, posIfd0, true);

  const escreverLista = (
    lista: readonly EntradaPreparada[],
    posicao: number,
    posicaoDados: number,
    ponteiros: readonly { etiqueta: number; destino: number }[]
  ) => {
    const todas: EntradaPreparada[] = [
      ...lista,
      ...ponteiros.map((p) => ({
        etiqueta: p.etiqueta,
        tipo: 4,
        contagem: 1,
        dentro: p.destino,
      })),
    ].sort((a, b) => a.etiqueta - b.etiqueta);

    vista.setUint16(posicao, todas.length, true);
    let cursor = posicaoDados;
    todas.forEach((e, i) => {
      const base = posicao + 2 + i * 12;
      vista.setUint16(base, e.etiqueta, true);
      vista.setUint16(base + 2, e.tipo, true);
      vista.setUint32(base + 4, e.contagem, true);
      if (e.fora) {
        if (e.fora.length <= 4) {
          saida.set(e.fora, base + 8);
        } else {
          vista.setUint32(base + 8, cursor, true);
          saida.set(e.fora, cursor);
          cursor += parear(e.fora.length);
        }
      } else {
        vista.setUint32(base + 8, e.dentro ?? 0, true);
      }
    });
    vista.setUint32(posicao + 2 + todas.length * 12, 0, true);
  };

  escreverLista(ifd0, posIfd0, posDados0, [
    ...(comExif ? [{ etiqueta: 0x8769, destino: posExif }] : []),
    ...(comGps ? [{ etiqueta: 0x8825, destino: posGps }] : []),
  ]);
  if (comExif) escreverLista(exif, posExif, posDadosExif, []);
  if (comGps) escreverLista(gps, posGps, posDadosGps, []);

  return saida;
}

// ─── JPEG ────────────────────────────────────────────────────────────────────

function segmento(marcador: number, conteudo: Uint8Array): Uint8Array {
  const comprimento = conteudo.length + 2;
  return juntar([
    new Uint8Array([0xff, marcador, (comprimento >> 8) & 0xff, comprimento & 0xff]),
    conteudo,
  ]);
}

/** Uma tabela de quantização plausível: identificador zero e 64 valores. */
export function tabelaDeQuantizacao(valor = 16): Uint8Array {
  return juntar([new Uint8Array([0x00]), new Uint8Array(64).fill(valor)]);
}

/**
 * Um JPEG com a estrutura mínima que a norma manda.
 *
 * Os dados comprimidos são de mentira — este exame não descodifica um único
 * pixel, percorre segmentos —, mas os segmentos e os marcadores são os certos,
 * incluindo o preenchimento `FF 00` no meio dos dados, que é o caso que faz
 * rebentar quem percorre um JPEG de qualquer maneira.
 */
export function montarJpeg(
  opcoes: {
    exif?: Uint8Array;
    xmp?: string;
    comentario?: string;
    largura?: number;
    altura?: number;
    progressivo?: boolean;
    tabelas?: readonly Uint8Array[];
    depoisDoFim?: Uint8Array;
    photoshop?: boolean;
  } = {}
): Uint8Array {
  const largura = opcoes.largura ?? 1200;
  const altura = opcoes.altura ?? 900;
  const pedacos: Uint8Array[] = [new Uint8Array([0xff, 0xd8])];

  if (opcoes.exif) {
    pedacos.push(segmento(0xe1, juntar([bytesDe("Exif\0\0"), opcoes.exif])));
  }
  if (opcoes.xmp) {
    pedacos.push(
      segmento(0xe1, juntar([bytesDe("http://ns.adobe.com/xap/1.0/\0"), bytesDe(opcoes.xmp)]))
    );
  }
  if (opcoes.photoshop) {
    pedacos.push(segmento(0xed, juntar([bytesDe("Photoshop 3.0\0"), new Uint8Array(4)])));
  }
  if (opcoes.comentario) pedacos.push(segmento(0xfe, bytesDe(opcoes.comentario)));

  for (const tabela of opcoes.tabelas ?? [tabelaDeQuantizacao()]) {
    pedacos.push(segmento(0xdb, tabela));
  }

  // SOF: precisão, altura, largura, um componente.
  pedacos.push(
    segmento(
      opcoes.progressivo ? 0xc2 : 0xc0,
      new Uint8Array([
        8,
        (altura >> 8) & 0xff,
        altura & 0xff,
        (largura >> 8) & 0xff,
        largura & 0xff,
        1,
        1,
        0x11,
        0,
      ])
    )
  );

  pedacos.push(segmento(0xda, new Uint8Array([1, 1, 0, 0, 63, 0])));
  // Dados comprimidos de mentira, com um `FF 00` — o preenchimento da norma — e
  // um marcador de reinício pelo meio.
  pedacos.push(new Uint8Array([0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56, 0x78]));
  pedacos.push(new Uint8Array([0xff, 0xd9]));
  if (opcoes.depoisDoFim) pedacos.push(opcoes.depoisDoFim);

  return juntar(pedacos);
}

// ─── PNG ─────────────────────────────────────────────────────────────────────

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

/** O CRC-32 que a norma do PNG manda em cada bloco. As amostras são a sério. */
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = TABELA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function blocoPng(tipo: string, conteudo: Uint8Array): Uint8Array {
  const cabeca = new Uint8Array(8);
  new DataView(cabeca.buffer).setUint32(0, conteudo.length);
  cabeca.set(bytesDe(tipo), 4);
  const cauda = new Uint8Array(4);
  new DataView(cauda.buffer).setUint32(0, crc32(juntar([bytesDe(tipo), conteudo])));
  return juntar([cabeca, conteudo, cauda]);
}

export function montarPng(
  opcoes: {
    largura?: number;
    altura?: number;
    texto?: readonly (readonly [string, string])[];
    exif?: Uint8Array;
  } = {}
): Uint8Array {
  const largura = opcoes.largura ?? 800;
  const altura = opcoes.altura ?? 600;

  const ihdr = new Uint8Array(13);
  const vista = new DataView(ihdr.buffer);
  vista.setUint32(0, largura);
  vista.setUint32(4, altura);
  ihdr[8] = 8;
  ihdr[9] = 2;

  const pedacos: Uint8Array[] = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    blocoPng("IHDR", ihdr),
  ];

  for (const [chave, valor] of opcoes.texto ?? []) {
    pedacos.push(blocoPng("tEXt", juntar([bytesDe(chave), new Uint8Array([0]), bytesDe(valor)])));
  }
  if (opcoes.exif) pedacos.push(blocoPng("eXIf", opcoes.exif));

  pedacos.push(blocoPng("IDAT", new Uint8Array([0x78, 0x9c, 0x63, 0x00, 0x00, 0x00, 0x01])));
  pedacos.push(blocoPng("IEND", new Uint8Array(0)));
  return juntar(pedacos);
}

// ─── WebP ────────────────────────────────────────────────────────────────────

function blocoRiff(tipo: string, conteudo: Uint8Array): Uint8Array {
  const cabeca = new Uint8Array(8);
  cabeca.set(bytesDe(tipo), 0);
  new DataView(cabeca.buffer).setUint32(4, conteudo.length, true);
  const enchimento = conteudo.length % 2 === 1 ? new Uint8Array(1) : new Uint8Array(0);
  return juntar([cabeca, conteudo, enchimento]);
}

export function montarWebp(
  opcoes: { largura?: number; altura?: number; exif?: Uint8Array; xmp?: string } = {}
): Uint8Array {
  const largura = (opcoes.largura ?? 640) - 1;
  const altura = (opcoes.altura ?? 480) - 1;

  const vp8x = new Uint8Array(10);
  vp8x[0] = (opcoes.exif ? 0x08 : 0) | (opcoes.xmp ? 0x04 : 0);
  vp8x[4] = largura & 0xff;
  vp8x[5] = (largura >> 8) & 0xff;
  vp8x[6] = (largura >> 16) & 0xff;
  vp8x[7] = altura & 0xff;
  vp8x[8] = (altura >> 8) & 0xff;
  vp8x[9] = (altura >> 16) & 0xff;

  const corpo = juntar([
    bytesDe("WEBP"),
    blocoRiff("VP8X", vp8x),
    ...(opcoes.exif ? [blocoRiff("EXIF", opcoes.exif)] : []),
    ...(opcoes.xmp ? [blocoRiff("XMP ", bytesDe(opcoes.xmp))] : []),
    blocoRiff("VP8L", new Uint8Array([0x2f, 0x00, 0x00, 0x00, 0x00])),
  ]);

  const cabeca = new Uint8Array(8);
  cabeca.set(bytesDe("RIFF"), 0);
  new DataView(cabeca.buffer).setUint32(4, corpo.length, true);
  return juntar([cabeca, corpo]);
}
