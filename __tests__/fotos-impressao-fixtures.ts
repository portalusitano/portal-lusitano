/**
 * As imagens de amostra e os codificadores que os testes de `lib/fotos`
 * precisam.
 *
 * **Nenhum byte de imagem entra neste repositório vindo de fora.** Tudo o que
 * os testes medem é gerado aqui: as imagens por uma função, e os ficheiros por
 * um codificador de JPEG e um de PNG escritos de propósito.
 *
 * O codificador não é um luxo. Sem ele, a única maneira de medir o limiar era
 * sobre planos de luminância inventados, e isso mediria a aritmética da
 * impressão sem nunca atravessar o descodificador — que é a parte grande, a
 * que tem os bugs e a que ninguém mais neste projecto testa. Com ele, cada
 * medição passa por Huffman, quantização, subamostragem e marcadores a sério,
 * e o descodificador de `lib/fotos/jpeg.ts` fica com uma contraprova
 * independente: se a média dos blocos que ele lê batesse certo por acaso, não
 * batia certo em doze imagens, três qualidades e duas subamostragens.
 *
 * O codificador é **baseline, tabelas de Huffman da norma, sem optimização**.
 * Não precisa de ser bom — precisa de ser correcto.
 *
 * Este ficheiro não termina em `.test.ts` de propósito: o `vitest.config.ts` só
 * reclama os ficheiros terminados em `.test.ts` ou `.test.tsx`, portanto isto é
 * uma biblioteca de apoio e não uma suite vazia.
 */

import { deflateSync } from "node:zlib";

import { criarPlano, luminancia, type PlanoLuma } from "@/lib/fotos/plano";

// ─── Imagens sintéticas ──────────────────────────────────────────────────────

export interface ImagemRgb {
  largura: number;
  altura: number;
  /** Três bytes por pixel, em linhas. */
  rgb: Uint8Array;
}

/**
 * Um gerador pseudo-aleatório determinista (mulberry32).
 *
 * `Math.random` num teste que mede limiares é a maneira certa de ter uma suite
 * que passa em quatro corridas de cinco. Com semente, os números do comentário
 * do `impressao.ts` são reproduzíveis por quem os quiser conferir.
 */
export function aleatorio(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Uma imagem com estrutura a várias escalas, como uma fotografia tem.
 *
 * Não é ruído: ruído puro não tem coeficientes de baixa frequência e faria a
 * pHash medir-se sobre a parte da imagem que ela deita fora, o que dava um
 * limiar bonito e mentiroso. Isto são meia dúzia de ondas de frequências e
 * fases diferentes, mais três manchas suaves e um pouco de granulado — que é
 * uma caricatura grosseira do que um espectro de fotografia tem: muita energia
 * em baixo, pouca em cima.
 *
 * `fundo` permite que duas imagens partilhem as ondas de frequência mais baixa
 * e difiram só no primeiro plano. É o caso difícil de verdade: duas
 * fotografias tiradas na mesma coudelaria, com o mesmo picadeiro atrás e
 * cavalos diferentes à frente. Se o limiar falhar, falha aí — e não em duas
 * imagens que não têm nada a ver uma com a outra.
 */
export function imagemSintetica(opcoes: {
  largura: number;
  altura: number;
  semente: number;
  /** Semente das ondas de baixa frequência. Igual em duas imagens = mesmo cenário. */
  fundo?: number;
}): ImagemRgb {
  const { largura, altura, semente } = opcoes;
  const rndFundo = aleatorio(opcoes.fundo ?? semente);
  const rnd = aleatorio(semente);

  const ondasFundo = Array.from({ length: 4 }, () => ({
    fx: (rndFundo() * 2.5 + 0.4) / largura,
    fy: (rndFundo() * 2.5 + 0.4) / altura,
    fase: rndFundo() * Math.PI * 2,
    amplitude: 22 + rndFundo() * 26,
  }));
  const ondasFrente = Array.from({ length: 5 }, () => ({
    fx: (rnd() * 14 + 2) / largura,
    fy: (rnd() * 14 + 2) / altura,
    fase: rnd() * Math.PI * 2,
    amplitude: 10 + rnd() * 22,
  }));
  const manchas = Array.from({ length: 3 }, () => ({
    cx: rnd() * largura,
    cy: rnd() * altura,
    raio: (0.12 + rnd() * 0.22) * Math.min(largura, altura),
    peso: (rnd() - 0.5) * 90,
  }));
  const matiz = [0.9 + rnd() * 0.2, 0.9 + rnd() * 0.2, 0.9 + rnd() * 0.2];

  const rgb = new Uint8Array(largura * altura * 3);
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      let v = 128;
      for (const o of ondasFundo) {
        v += o.amplitude * Math.sin(2 * Math.PI * (o.fx * x + o.fy * y) + o.fase);
      }
      for (const o of ondasFrente) {
        v += o.amplitude * Math.sin(2 * Math.PI * (o.fx * x + o.fy * y) + o.fase);
      }
      for (const m of manchas) {
        const dx = (x - m.cx) / m.raio;
        const dy = (y - m.cy) / m.raio;
        const d2 = dx * dx + dy * dy;
        if (d2 < 1) v += m.peso * (1 - d2) * (1 - d2);
      }
      // Granulado fino, determinista na posição: é o que a recompressão vai
      // atacar, e é bom que exista para o teste não ser mais fácil do que a
      // realidade.
      v += (((x * 7919 + y * 104729) % 17) - 8) * 1.1;

      const p = (y * largura + x) * 3;
      for (let c = 0; c < 3; c++) {
        const valor = Math.round(v * matiz[c] + (c - 1) * 6);
        rgb[p + c] = valor < 0 ? 0 : valor > 255 ? 255 : valor;
      }
    }
  }
  return { largura, altura, rgb };
}

/** O plano de luminância de uma imagem RGB, sem passar por ficheiro nenhum. */
export function planoDeImagem(imagem: ImagemRgb): PlanoLuma {
  const plano = criarPlano(imagem.largura, imagem.altura);
  for (let i = 0, n = imagem.largura * imagem.altura; i < n; i++) {
    plano.amostras[i] = luminancia(imagem.rgb[i * 3], imagem.rgb[i * 3 + 1], imagem.rgb[i * 3 + 2]);
  }
  return plano;
}

/** Redimensiona por média de área, canal a canal. */
export function redimensionar(imagem: ImagemRgb, largura: number, altura: number): ImagemRgb {
  const rgb = new Uint8Array(largura * altura * 3);
  const ex = imagem.largura / largura;
  const ey = imagem.altura / altura;
  for (let y = 0; y < altura; y++) {
    const y0 = Math.floor(y * ey);
    const y1 = Math.max(y0 + 1, Math.ceil((y + 1) * ey));
    for (let x = 0; x < largura; x++) {
      const x0 = Math.floor(x * ex);
      const x1 = Math.max(x0 + 1, Math.ceil((x + 1) * ex));
      const somas = [0, 0, 0];
      let n = 0;
      for (let sy = y0; sy < y1 && sy < imagem.altura; sy++) {
        for (let sx = x0; sx < x1 && sx < imagem.largura; sx++) {
          const p = (sy * imagem.largura + sx) * 3;
          somas[0] += imagem.rgb[p];
          somas[1] += imagem.rgb[p + 1];
          somas[2] += imagem.rgb[p + 2];
          n++;
        }
      }
      const d = (y * largura + x) * 3;
      for (let c = 0; c < 3; c++) rgb[d + c] = Math.round(somas[c] / Math.max(1, n));
    }
  }
  return { largura, altura, rgb };
}

/** Tira `fraccao` de margem de cada lado. */
export function recortar(imagem: ImagemRgb, fraccao: number): ImagemRgb {
  const mx = Math.round(imagem.largura * fraccao);
  const my = Math.round(imagem.altura * fraccao);
  const largura = imagem.largura - 2 * mx;
  const altura = imagem.altura - 2 * my;
  const rgb = new Uint8Array(largura * altura * 3);
  for (let y = 0; y < altura; y++) {
    const origem = ((y + my) * imagem.largura + mx) * 3;
    rgb.set(imagem.rgb.subarray(origem, origem + largura * 3), y * largura * 3);
  }
  return { largura, altura, rgb };
}

/** Multiplica o brilho e desloca-o, para testar a invariância a exposição. */
export function ajustarBrilho(imagem: ImagemRgb, ganho: number, deslocamento: number): ImagemRgb {
  const rgb = new Uint8Array(imagem.rgb.length);
  for (let i = 0; i < rgb.length; i++) {
    const v = Math.round(imagem.rgb[i] * ganho + deslocamento);
    rgb[i] = v < 0 ? 0 : v > 255 ? 255 : v;
  }
  return { largura: imagem.largura, altura: imagem.altura, rgb };
}

// ─── Codificador de PNG ──────────────────────────────────────────────────────

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABELA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(tipo: string, dados: Uint8Array): Uint8Array {
  const saida = new Uint8Array(12 + dados.length);
  const dv = new DataView(saida.buffer);
  dv.setUint32(0, dados.length);
  for (let i = 0; i < 4; i++) saida[4 + i] = tipo.charCodeAt(i);
  saida.set(dados, 8);
  dv.setUint32(8 + dados.length, crc32(saida.subarray(4, 8 + dados.length)));
  return saida;
}

/**
 * Escreve um PNG. `tipoDeCor` 2 é RGB, 0 é cinzento, 6 é RGBA.
 *
 * As linhas vão todas com filtro 0 (nenhum) menos as ímpares, que vão com
 * filtro 4 (Paeth): assim o descodificador tem de saber desfazer os dois, e o
 * Paeth — que é o único com aritmética a sério — não fica por testar.
 */
export function codificarPng(imagem: ImagemRgb, tipoDeCor: 0 | 2 | 6 = 2): Uint8Array {
  const canais = tipoDeCor === 0 ? 1 : tipoDeCor === 2 ? 3 : 4;
  const { largura, altura } = imagem;
  const bytesPorLinha = largura * canais;
  const cru = new Uint8Array((bytesPorLinha + 1) * altura);
  const pixels = new Uint8Array(bytesPorLinha * altura);

  for (let i = 0, n = largura * altura; i < n; i++) {
    const p = i * 3;
    if (canais === 1) {
      pixels[i] = Math.round(luminancia(imagem.rgb[p], imagem.rgb[p + 1], imagem.rgb[p + 2]));
    } else {
      const d = i * canais;
      pixels[d] = imagem.rgb[p];
      pixels[d + 1] = imagem.rgb[p + 1];
      pixels[d + 2] = imagem.rgb[p + 2];
      if (canais === 4) pixels[d + 3] = 255;
    }
  }

  for (let y = 0; y < altura; y++) {
    const filtro = y % 2 === 0 ? 0 : 4;
    cru[y * (bytesPorLinha + 1)] = filtro;
    const destino = y * (bytesPorLinha + 1) + 1;
    const linha = y * bytesPorLinha;
    const acima = linha - bytesPorLinha;
    for (let i = 0; i < bytesPorLinha; i++) {
      const x = pixels[linha + i];
      if (filtro === 0) {
        cru[destino + i] = x;
        continue;
      }
      const a = i >= canais ? pixels[linha + i - canais] : 0;
      const b = y > 0 ? pixels[acima + i] : 0;
      const c = y > 0 && i >= canais ? pixels[acima + i - canais] : 0;
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      const previsao = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      cru[destino + i] = (x - previsao) & 0xff;
    }
  }

  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, largura);
  dv.setUint32(4, altura);
  ihdr[8] = 8; // profundidade
  ihdr[9] = tipoDeCor;

  const partes = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", new Uint8Array(deflateSync(cru))),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = partes.reduce((s, p) => s + p.length, 0);
  const saida = new Uint8Array(total);
  let offset = 0;
  for (const p of partes) {
    saida.set(p, offset);
    offset += p.length;
  }
  return saida;
}

// ─── Codificador de JPEG ─────────────────────────────────────────────────────

// prettier-ignore
const ZIGUEZAGUE = [
   0,  1,  8, 16,  9,  2,  3, 10, 17, 24, 32, 25, 18, 11,  4,  5,
  12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13,  6,  7, 14, 21, 28,
  35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51,
  58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63,
];

// prettier-ignore
const QUANT_LUMA = [
  16, 11, 10, 16, 24, 40, 51, 61,
  12, 12, 14, 19, 26, 58, 60, 55,
  14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62,
  18, 22, 37, 56, 68, 109, 103, 77,
  24, 35, 55, 64, 81, 104, 113, 92,
  49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103, 99,
];

// prettier-ignore
const QUANT_CROMA = [
  17, 18, 24, 47, 99, 99, 99, 99,
  18, 21, 26, 66, 99, 99, 99, 99,
  24, 26, 56, 99, 99, 99, 99, 99,
  47, 66, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
];

const BITS_DC_LUMA = [0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
const VALORES_DC = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const BITS_DC_CROMA = [0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];
const BITS_AC_LUMA = [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d];
const BITS_AC_CROMA = [0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 0x77];

// prettier-ignore
const VALORES_AC_LUMA = [
  0x01,0x02,0x03,0x00,0x04,0x11,0x05,0x12,0x21,0x31,0x41,0x06,0x13,0x51,0x61,0x07,
  0x22,0x71,0x14,0x32,0x81,0x91,0xa1,0x08,0x23,0x42,0xb1,0xc1,0x15,0x52,0xd1,0xf0,
  0x24,0x33,0x62,0x72,0x82,0x09,0x0a,0x16,0x17,0x18,0x19,0x1a,0x25,0x26,0x27,0x28,
  0x29,0x2a,0x34,0x35,0x36,0x37,0x38,0x39,0x3a,0x43,0x44,0x45,0x46,0x47,0x48,0x49,
  0x4a,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5a,0x63,0x64,0x65,0x66,0x67,0x68,0x69,
  0x6a,0x73,0x74,0x75,0x76,0x77,0x78,0x79,0x7a,0x83,0x84,0x85,0x86,0x87,0x88,0x89,
  0x8a,0x92,0x93,0x94,0x95,0x96,0x97,0x98,0x99,0x9a,0xa2,0xa3,0xa4,0xa5,0xa6,0xa7,
  0xa8,0xa9,0xaa,0xb2,0xb3,0xb4,0xb5,0xb6,0xb7,0xb8,0xb9,0xba,0xc2,0xc3,0xc4,0xc5,
  0xc6,0xc7,0xc8,0xc9,0xca,0xd2,0xd3,0xd4,0xd5,0xd6,0xd7,0xd8,0xd9,0xda,0xe1,0xe2,
  0xe3,0xe4,0xe5,0xe6,0xe7,0xe8,0xe9,0xea,0xf1,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,
  0xf9,0xfa,
];

// prettier-ignore
const VALORES_AC_CROMA = [
  0x00,0x01,0x02,0x03,0x11,0x04,0x05,0x21,0x31,0x06,0x12,0x41,0x51,0x07,0x61,0x71,
  0x13,0x22,0x32,0x81,0x08,0x14,0x42,0x91,0xa1,0xb1,0xc1,0x09,0x23,0x33,0x52,0xf0,
  0x15,0x62,0x72,0xd1,0x0a,0x16,0x24,0x34,0xe1,0x25,0xf1,0x17,0x18,0x19,0x1a,0x26,
  0x27,0x28,0x29,0x2a,0x35,0x36,0x37,0x38,0x39,0x3a,0x43,0x44,0x45,0x46,0x47,0x48,
  0x49,0x4a,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5a,0x63,0x64,0x65,0x66,0x67,0x68,
  0x69,0x6a,0x73,0x74,0x75,0x76,0x77,0x78,0x79,0x7a,0x82,0x83,0x84,0x85,0x86,0x87,
  0x88,0x89,0x8a,0x92,0x93,0x94,0x95,0x96,0x97,0x98,0x99,0x9a,0xa2,0xa3,0xa4,0xa5,
  0xa6,0xa7,0xa8,0xa9,0xaa,0xb2,0xb3,0xb4,0xb5,0xb6,0xb7,0xb8,0xb9,0xba,0xc2,0xc3,
  0xc4,0xc5,0xc6,0xc7,0xc8,0xc9,0xca,0xd2,0xd3,0xd4,0xd5,0xd6,0xd7,0xd8,0xd9,0xda,
  0xe2,0xe3,0xe4,0xe5,0xe6,0xe7,0xe8,0xe9,0xea,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,
  0xf9,0xfa,
];

/** Código canónico e comprimento para cada símbolo de uma tabela. */
function tabelaDeCodigos(bits: number[], valores: number[]): Map<number, [number, number]> {
  const mapa = new Map<number, [number, number]>();
  let codigo = 0;
  let i = 0;
  for (let l = 1; l <= 16; l++) {
    for (let n = 0; n < bits[l - 1]; n++) mapa.set(valores[i++], [codigo++, l]);
    codigo <<= 1;
  }
  return mapa;
}

/** A tabela de quantização escalada pela qualidade, como o libjpeg faz. */
function escalarQuantizacao(base: number[], qualidade: number): number[] {
  const q = Math.max(1, Math.min(100, qualidade));
  const factor = q < 50 ? 5000 / q : 200 - 2 * q;
  return base.map((v) => Math.max(1, Math.min(255, Math.floor((v * factor + 50) / 100))));
}

/**
 * DCT-II 8×8 normalizada, como a norma do JPEG a define, feita em duas
 * passagens separáveis com a matriz de cossenos pré-calculada.
 *
 * A versão directa são 4096 chamadas a `Math.cos` por bloco; num teste que
 * codifica algumas dezenas de imagens isso são minutos de espera por nada.
 */
const COS8 = (() => {
  const m = new Float64Array(64);
  for (let u = 0; u < 8; u++) {
    const c = u === 0 ? Math.SQRT1_2 : 1;
    for (let x = 0; x < 8; x++) {
      m[u * 8 + x] = 0.5 * c * Math.cos(((2 * x + 1) * u * Math.PI) / 16);
    }
  }
  return m;
})();

function fdct(bloco: Float64Array): Float64Array {
  const linhas = new Float64Array(64);
  for (let y = 0; y < 8; y++) {
    for (let u = 0; u < 8; u++) {
      let soma = 0;
      for (let x = 0; x < 8; x++) soma += bloco[y * 8 + x] * COS8[u * 8 + x];
      linhas[y * 8 + u] = soma;
    }
  }
  const saida = new Float64Array(64);
  for (let u = 0; u < 8; u++) {
    for (let v = 0; v < 8; v++) {
      let soma = 0;
      for (let y = 0; y < 8; y++) soma += linhas[y * 8 + u] * COS8[v * 8 + y];
      saida[v * 8 + u] = soma;
    }
  }
  return saida;
}

/** A inversa da `fdct`, para simular o que sai de um descodificador. */
function idct(coeficientes: Float64Array): Float64Array {
  const linhas = new Float64Array(64);
  for (let v = 0; v < 8; v++) {
    for (let x = 0; x < 8; x++) {
      let soma = 0;
      for (let u = 0; u < 8; u++) soma += coeficientes[v * 8 + u] * COS8[u * 8 + x];
      linhas[v * 8 + x] = soma;
    }
  }
  const saida = new Float64Array(64);
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      let soma = 0;
      for (let v = 0; v < 8; v++) soma += linhas[v * 8 + x] * COS8[v * 8 + y];
      saida[y * 8 + x] = soma;
    }
  }
  return saida;
}

/**
 * A imagem tal como sai de um descodificador de JPEG depois de ser guardada
 * com aquela qualidade.
 *
 * Serve para medir a **recompressão a sério**, que é o caso que interessa:
 * quem rouba uma fotografia descarrega um JPEG já comprimido e volta a
 * guardá-lo, e os dois erros de quantização acumulam-se. Comparar duas
 * codificações independentes do mesmo original mediria menos do que isso e
 * dava um limiar optimista.
 *
 * Faz-se a 4:4:4 e sem passar pelo fluxo de bits: o que muda os pixels é a
 * quantização e a transformada, e essas estão aqui inteiras. O Huffman é sem
 * perdas e não tinha nada a acrescentar à medição.
 */
export function passarPorJpeg(imagem: ImagemRgb, qualidade: number): ImagemRgb {
  const { largura, altura } = imagem;
  const qLuma = escalarQuantizacao(QUANT_LUMA, qualidade);
  const qCroma = escalarQuantizacao(QUANT_CROMA, qualidade);

  const canais = [
    new Float64Array(largura * altura),
    new Float64Array(largura * altura),
    new Float64Array(largura * altura),
  ];
  for (let i = 0, n = largura * altura; i < n; i++) {
    const r = imagem.rgb[i * 3];
    const g = imagem.rgb[i * 3 + 1];
    const b = imagem.rgb[i * 3 + 2];
    canais[0][i] = luminancia(r, g, b);
    canais[1][i] = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    canais[2][i] = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  }

  const bloco = new Float64Array(64);
  for (let ci = 0; ci < 3; ci++) {
    const quantizacao = ci === 0 ? qLuma : qCroma;
    const plano = canais[ci];
    for (let by = 0; by * 8 < altura; by++) {
      for (let bx = 0; bx * 8 < largura; bx++) {
        for (let j = 0; j < 8; j++) {
          for (let i = 0; i < 8; i++) {
            const x = Math.min(largura - 1, bx * 8 + i);
            const y = Math.min(altura - 1, by * 8 + j);
            bloco[j * 8 + i] = plano[y * largura + x] - 128;
          }
        }
        const coeficientes = fdct(bloco);
        for (let i = 0; i < 64; i++) {
          coeficientes[i] = Math.round(coeficientes[i] / quantizacao[i]) * quantizacao[i];
        }
        const reconstruido = idct(coeficientes);
        for (let j = 0; j < 8; j++) {
          const y = by * 8 + j;
          if (y >= altura) break;
          for (let i = 0; i < 8; i++) {
            const x = bx * 8 + i;
            if (x >= largura) break;
            plano[y * largura + x] = reconstruido[j * 8 + i] + 128;
          }
        }
      }
    }
  }

  const rgb = new Uint8Array(largura * altura * 3);
  for (let i = 0, n = largura * altura; i < n; i++) {
    const y = canais[0][i];
    const cb = canais[1][i] - 128;
    const cr = canais[2][i] - 128;
    const valores = [y + 1.402 * cr, y - 0.344136 * cb - 0.714136 * cr, y + 1.772 * cb];
    for (let c = 0; c < 3; c++) {
      const v = Math.round(valores[c]);
      rgb[i * 3 + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
  return { largura, altura, rgb };
}

class EscritorDeBits {
  bytes: number[] = [];
  private acumulador = 0;
  private ocupados = 0;

  escrever(codigo: number, comprimento: number): void {
    for (let i = comprimento - 1; i >= 0; i--) {
      this.acumulador = (this.acumulador << 1) | ((codigo >> i) & 1);
      this.ocupados++;
      if (this.ocupados !== 8) continue;
      const b = this.acumulador & 0xff;
      this.bytes.push(b);
      // Byte-stuffing: dentro dos dados um 0xFF escreve-se 0xFF 0x00.
      if (b === 0xff) this.bytes.push(0x00);
      this.acumulador = 0;
      this.ocupados = 0;
    }
  }

  /** Enche o último byte com uns, como a norma manda. */
  terminar(): void {
    while (this.ocupados !== 0) this.escrever(1, 1);
  }
}

/** Categoria e bits do valor, pela extensão de sinal da norma. */
function categoria(valor: number): [number, number] {
  if (valor === 0) return [0, 0];
  const absoluto = Math.abs(valor);
  let n = 0;
  while (absoluto >= 1 << n) n++;
  return [n, valor > 0 ? valor : valor + (1 << n) - 1];
}

export interface OpcoesJpeg {
  qualidade?: number;
  /** `[h, v]` da luminância. `[1,1]` é 4:4:4, `[2,2]` é 4:2:0. */
  subamostragem?: [1 | 2, 1 | 2];
  /** Blocos por intervalo de reinício. 0 desliga. */
  reinicio?: number;
  /** Escreve um progressivo com uma única varredura de DC. */
  progressivo?: boolean;
  /** Só a luminância: um SOF de uma componente. */
  cinzento?: boolean;
}

/**
 * Escreve um JPEG baseline (ou um progressivo só com a varredura de DC).
 *
 * O caminho progressivo emite SOF2 e uma varredura com `Ss=Se=0`, seguida de
 * uma varredura de refinamento de DC. Não escreve varredura de AC nenhuma — o
 * ficheiro sai legal e visivelmente aos quadrados, o que não faz mal a ninguém
 * porque **é exactamente a parte que o descodificador de `lib/fotos/jpeg.ts`
 * lê**. Escrever aqui um codificador progressivo completo era escrever muito
 * código para exercitar as varreduras que esse descodificador salta sem ler.
 */
export function codificarJpeg(imagem: ImagemRgb, opcoes: OpcoesJpeg = {}): Uint8Array {
  const qualidade = opcoes.qualidade ?? 85;
  const [hLuma, vLuma] = opcoes.subamostragem ?? [1, 1];
  const cinzento = opcoes.cinzento ?? false;
  const progressivo = opcoes.progressivo ?? false;
  const reinicio = opcoes.reinicio ?? 0;
  const { largura, altura } = imagem;

  const qLuma = escalarQuantizacao(QUANT_LUMA, qualidade);
  const qCroma = escalarQuantizacao(QUANT_CROMA, qualidade);

  // YCbCr à resolução total; a subamostragem faz-se ao ler os blocos.
  const y = new Float64Array(largura * altura);
  const cb = new Float64Array(largura * altura);
  const cr = new Float64Array(largura * altura);
  for (let i = 0, n = largura * altura; i < n; i++) {
    const r = imagem.rgb[i * 3];
    const g = imagem.rgb[i * 3 + 1];
    const b = imagem.rgb[i * 3 + 2];
    y[i] = luminancia(r, g, b);
    cb[i] = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    cr[i] = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  }

  const saida: number[] = [];
  const u8 = (...v: number[]) => saida.push(...v);
  const u16 = (v: number) => saida.push((v >> 8) & 0xff, v & 0xff);

  u8(0xff, 0xd8);

  // DQT
  u8(0xff, 0xdb);
  u16(2 + (cinzento ? 65 : 130));
  u8(0x00);
  for (let i = 0; i < 64; i++) u8(qLuma[ZIGUEZAGUE[i]]);
  if (!cinzento) {
    u8(0x01);
    for (let i = 0; i < 64; i++) u8(qCroma[ZIGUEZAGUE[i]]);
  }

  const componentes = cinzento
    ? [{ id: 1, h: 1, v: 1, q: 0 }]
    : [
        { id: 1, h: hLuma, v: vLuma, q: 0 },
        { id: 2, h: 1, v: 1, q: 1 },
        { id: 3, h: 1, v: 1, q: 1 },
      ];

  // SOF
  u8(0xff, progressivo ? 0xc2 : 0xc0);
  u16(8 + 3 * componentes.length);
  u8(8);
  u16(altura);
  u16(largura);
  u8(componentes.length);
  for (const c of componentes) u8(c.id, (c.h << 4) | c.v, c.q);

  // DHT
  const escreverTabela = (classe: number, indice: number, bits: number[], valores: number[]) => {
    u8(0xff, 0xc4);
    u16(3 + 16 + valores.length);
    u8((classe << 4) | indice);
    u8(...bits);
    u8(...valores);
  };
  escreverTabela(0, 0, BITS_DC_LUMA, VALORES_DC);
  escreverTabela(1, 0, BITS_AC_LUMA, VALORES_AC_LUMA);
  if (!cinzento) {
    escreverTabela(0, 1, BITS_DC_CROMA, VALORES_DC);
    escreverTabela(1, 1, BITS_AC_CROMA, VALORES_AC_CROMA);
  }

  const codigosDc = [
    tabelaDeCodigos(BITS_DC_LUMA, VALORES_DC),
    tabelaDeCodigos(BITS_DC_CROMA, VALORES_DC),
  ];
  const codigosAc = [
    tabelaDeCodigos(BITS_AC_LUMA, VALORES_AC_LUMA),
    tabelaDeCodigos(BITS_AC_CROMA, VALORES_AC_CROMA),
  ];

  if (reinicio > 0) {
    u8(0xff, 0xdd);
    u16(4);
    u16(reinicio);
  }

  const maxH = Math.max(...componentes.map((c) => c.h));
  const maxV = Math.max(...componentes.map((c) => c.v));
  const mcusPorLinha = Math.ceil(largura / (8 * maxH));
  const mcusPorColuna = Math.ceil(altura / (8 * maxV));

  const planos = [y, cb, cr];

  /** Lê um bloco 8×8 da componente, com replicação da borda no enchimento. */
  const lerBloco = (indice: number, bx: number, by: number): Float64Array => {
    const c = componentes[indice];
    const escalaX = maxH / c.h;
    const escalaY = maxV / c.v;
    const plano = planos[indice];
    const bloco = new Float64Array(64);
    for (let j = 0; j < 8; j++) {
      for (let i = 0; i < 8; i++) {
        // Média da caixa que este ponto cobre no plano à resolução total: é
        // assim que se subamostra a crominância sem serrilhar.
        let soma = 0;
        let n = 0;
        for (let sy = 0; sy < escalaY; sy++) {
          for (let sx = 0; sx < escalaX; sx++) {
            const px = Math.min(largura - 1, Math.floor((bx * 8 + i) * escalaX + sx));
            const py = Math.min(altura - 1, Math.floor((by * 8 + j) * escalaY + sy));
            soma += plano[py * largura + px];
            n++;
          }
        }
        bloco[j * 8 + i] = soma / n - 128;
      }
    }
    return bloco;
  };

  // Quantiza-se tudo primeiro. O progressivo precisa de percorrer os mesmos
  // blocos duas vezes — uma para os bits de cima do DC, outra para o de baixo —
  // e refazer a DCT na segunda passagem era duplicar o trabalho todo.
  const quantizados: Int32Array[] = componentes.map((c) => {
    const largura8 = mcusPorLinha * c.h;
    const altura8 = mcusPorColuna * c.v;
    return new Int32Array(largura8 * altura8 * 64);
  });
  for (let ci = 0; ci < componentes.length; ci++) {
    const c = componentes[ci];
    const quantizacao = c.q === 0 ? qLuma : qCroma;
    const largura8 = mcusPorLinha * c.h;
    for (let by = 0; by < mcusPorColuna * c.v; by++) {
      for (let bx = 0; bx < largura8; bx++) {
        const coeficientes = fdct(lerBloco(ci, bx, by));
        const base = (by * largura8 + bx) * 64;
        for (let i = 0; i < 64; i++) {
          quantizados[ci][base + i] = Math.round(coeficientes[i] / quantizacao[i]);
        }
      }
    }
  }

  const escritor = new EscritorDeBits();
  const predicoes = [0, 0, 0];

  const indiceDoBloco = (ci: number, bx: number, by: number) =>
    (by * mcusPorLinha * componentes[ci].h + bx) * 64;

  /** Escreve o DC de um bloco, deslocado `al` bits para a direita. */
  const escreverDc = (ci: number, bx: number, by: number, al: number) => {
    const c = componentes[ci];
    const valor = quantizados[ci][indiceDoBloco(ci, bx, by)] >> al;
    const dc = valor - predicoes[ci];
    predicoes[ci] = valor;
    const [cat, bits] = categoria(dc);
    const codigo = codigosDc[c.q === 0 ? 0 : 1].get(cat);
    if (!codigo) throw new Error(`Categoria de DC ${cat} fora da tabela`);
    escritor.escrever(codigo[0], codigo[1]);
    if (cat > 0) escritor.escrever(bits, cat);
  };

  /** Escreve os 63 AC de um bloco, em ziguezague com corridas de zeros. */
  const escreverAc = (ci: number, bx: number, by: number) => {
    const c = componentes[ci];
    const base = indiceDoBloco(ci, bx, by);
    const ac = codigosAc[c.q === 0 ? 0 : 1];
    let corrida = 0;
    for (let k = 1; k < 64; k++) {
      const valor = quantizados[ci][base + ZIGUEZAGUE[k]];
      if (valor === 0) {
        corrida++;
        continue;
      }
      while (corrida > 15) {
        const zrl = ac.get(0xf0);
        if (!zrl) throw new Error("ZRL fora da tabela");
        escritor.escrever(zrl[0], zrl[1]);
        corrida -= 16;
      }
      const [cat, bits] = categoria(valor);
      const codigo = ac.get((corrida << 4) | cat);
      if (!codigo) throw new Error(`Símbolo AC ${(corrida << 4) | cat} fora da tabela`);
      escritor.escrever(codigo[0], codigo[1]);
      escritor.escrever(bits, cat);
      corrida = 0;
    }
    if (corrida > 0) {
      const eob = ac.get(0x00);
      if (!eob) throw new Error("EOB fora da tabela");
      escritor.escrever(eob[0], eob[1]);
    }
  };

  const cabecalhoDeVarredura = (se: number, ah: number, al: number) => {
    u8(0xff, 0xda);
    u16(6 + 2 * componentes.length);
    u8(componentes.length);
    for (const c of componentes) u8(c.id, c.q === 0 ? 0x00 : 0x11);
    u8(0, se, (ah << 4) | al);
  };

  /** Descarrega os bytes do escritor para a saída, sem espalhar o array. */
  const despejar = () => {
    escritor.terminar();
    for (const b of escritor.bytes) saida.push(b);
    escritor.bytes.length = 0;
  };

  const percorrerMcus = (visita: (ci: number, bx: number, by: number) => void) => {
    predicoes[0] = predicoes[1] = predicoes[2] = 0;
    let porReiniciar = reinicio;
    let proximoRst = 0;
    for (let my = 0; my < mcusPorColuna; my++) {
      for (let mx = 0; mx < mcusPorLinha; mx++) {
        for (let ci = 0; ci < componentes.length; ci++) {
          const c = componentes[ci];
          for (let v = 0; v < c.v; v++) {
            for (let h = 0; h < c.h; h++) visita(ci, mx * c.h + h, my * c.v + v);
          }
        }
        const ultimo = my === mcusPorColuna - 1 && mx === mcusPorLinha - 1;
        if (reinicio > 0 && --porReiniciar === 0 && !ultimo) {
          escritor.terminar();
          escritor.bytes.push(0xff, 0xd0 + proximoRst);
          proximoRst = (proximoRst + 1) % 8;
          porReiniciar = reinicio;
          predicoes[0] = predicoes[1] = predicoes[2] = 0;
        }
      }
    }
  };

  if (progressivo) {
    // Varredura 1: os bits de cima do DC (Al=1). Varredura 2: o bit que falta
    // (Ah=1, Al=0), um por bloco e sem Huffman nenhum, que é como a norma
    // define o refinamento. As varreduras de AC não se escrevem — ver o
    // comentário desta função.
    cabecalhoDeVarredura(0, 0, 1);
    percorrerMcus((ci, bx, by) => escreverDc(ci, bx, by, 1));
    despejar();

    cabecalhoDeVarredura(0, 1, 0);
    percorrerMcus((ci, bx, by) => {
      escritor.escrever(quantizados[ci][indiceDoBloco(ci, bx, by)] & 1, 1);
    });
    despejar();
  } else {
    cabecalhoDeVarredura(63, 0, 0);
    percorrerMcus((ci, bx, by) => {
      escreverDc(ci, bx, by, 0);
      escreverAc(ci, bx, by);
    });
    despejar();
  }

  saida.push(0xff, 0xd9);
  return new Uint8Array(saida);
}
