/**
 * O recorte ao quadrado, em números.
 *
 * ── Porque é que isto não é uma biblioteca ────────────────────────────────
 *
 * As bibliotecas de recorte que se usam para isto pesam entre 25 e 60 KiB
 * comprimidos, e o que trazem é um gesto de arrasto, um gesto de pinça e esta
 * conta. O gesto de arrasto são doze linhas de `pointermove`; a pinça, num
 * quadrado que já tem cursor de zoom, não acrescenta um caso de uso; e a conta
 * é este ficheiro. O que a biblioteca **não** traz é o que aqui importa mais:
 * o teclado. Ver o comentário do `EditorAvatar` — o recorte tem de funcionar
 * sem rato, e a maneira honesta de o fazer são comandos com valor, não teclas
 * de atalho por cima de um gesto.
 *
 * ── O modelo ──────────────────────────────────────────────────────────────
 *
 * Duas grandezas e mais nenhuma:
 *
 *   `zoom`    1 é o enquadramento que **enche** o quadrado com o lado menor da
 *             fotografia — o «cover» de sempre. Nunca desce abaixo de 1, senão
 *             sobrava fundo dentro do quadrado e um retrato com faixas pretas
 *             é pior do que um retrato apertado.
 *   `centro`  o ponto da fotografia que fica no meio do quadrado, em
 *             coordenadas de 0 a 1. Normalizado e não em pixéis para que
 *             mudar o zoom não desloque o enquadramento.
 *
 * A invariante — **o quadrado nunca sai de dentro da fotografia** — está
 * fixada por um teste sobre mil enquadramentos gerados ao acaso, incluindo os
 * degenerados (fotografias de 1px de lado, panorâmicas de 1:60, zoom no
 * tecto). É a mesma ideia das seiscentas grelhas dos testes das manchas do
 * globo: uma função total, sem um ramo que devolva um recorte impossível.
 */

/** O zoom não passa daqui: a 6× de uma fotografia de 512px vê-se a grelha. */
export const ZOOM_MAX = 6;
export const ZOOM_MIN = 1;

export interface Fonte {
  largura: number;
  altura: number;
}

export interface Enquadramento {
  zoom: number;
  /** Em fracções do lado, de 0 a 1. */
  centro: { x: number; y: number };
}

export const ENQUADRAMENTO_INICIAL: Enquadramento = { zoom: 1, centro: { x: 0.5, y: 0.5 } };

/** O quadrado a cortar, em pixéis da fotografia de origem. */
export interface Recorte {
  sx: number;
  sy: number;
  lado: number;
}

function prender(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return v < min ? min : v > max ? max : v;
}

/**
 * O lado do quadrado visível, em pixéis da fotografia.
 *
 * A zoom 1 é o lado menor: é o maior quadrado que cabe inteiro lá dentro.
 */
export function ladoVisivel(fonte: Fonte, zoom: number): number {
  const menor = Math.min(fonte.largura, fonte.altura);
  return menor / prender(zoom, ZOOM_MIN, ZOOM_MAX);
}

/**
 * Um enquadramento pedido, devolvido dentro dos limites.
 *
 * Prende primeiro o zoom e só depois o centro, porque é o zoom que decide de
 * quanta folga o centro dispõe. Ao contrário, um zoom que aperte deixava o
 * centro preso a limites que já não são os dele.
 */
export function limitarEnquadramento(fonte: Fonte, pedido: Enquadramento): Enquadramento {
  const zoom = prender(pedido.zoom, ZOOM_MIN, ZOOM_MAX);
  const lado = ladoVisivel(fonte, zoom);

  /* A folga de cada eixo, em fracções desse eixo. Num eixo que seja o menor da
     fotografia e com zoom 1, a folga é zero e o centro fica exactamente a
     0,5 — não há por onde deslizar, e é isso que se quer. */
  const folgaX = fonte.largura > 0 ? lado / 2 / fonte.largura : 0.5;
  const folgaY = fonte.altura > 0 ? lado / 2 / fonte.altura : 0.5;

  return {
    zoom,
    centro: {
      x: prender(pedido.centro.x, Math.min(folgaX, 0.5), Math.max(1 - folgaX, 0.5)),
      y: prender(pedido.centro.y, Math.min(folgaY, 0.5), Math.max(1 - folgaY, 0.5)),
    },
  };
}

/**
 * O quadrado a cortar. Recebe um enquadramento qualquer e devolve um recorte
 * que está sempre inteiro dentro da fotografia.
 */
export function recorteQuadrado(fonte: Fonte, pedido: Enquadramento): Recorte {
  if (!(fonte.largura > 0) || !(fonte.altura > 0)) return { sx: 0, sy: 0, lado: 0 };

  const enq = limitarEnquadramento(fonte, pedido);
  const lado = ladoVisivel(fonte, enq.zoom);

  /* O `Math.min` final é o cinto de segurança da aritmética de vírgula
     flutuante: com o centro já preso, `sx + lado` pode exceder a largura por
     uma fracção de pixel, e um `drawImage` com origem fora da imagem devolve
     uma faixa transparente na borda. */
  const sx = prender(enq.centro.x * fonte.largura - lado / 2, 0, Math.max(0, fonte.largura - lado));
  const sy = prender(enq.centro.y * fonte.altura - lado / 2, 0, Math.max(0, fonte.altura - lado));

  return { sx, sy, lado };
}

/**
 * Deslocar o enquadramento por uma distância medida **no quadrado do ecrã**.
 *
 * É o que o arrasto e as setas do teclado precisam: os dois falam em pixéis do
 * ecrã, e a conversão para fracções da fotografia depende do zoom. Sem isto,
 * arrastar 10px afastava o mesmo tanto a zoom 1 e a zoom 6, o que se sente
 * como um comando que muda de sensibilidade sozinho.
 */
export function deslocar(
  fonte: Fonte,
  enq: Enquadramento,
  dxEcra: number,
  dyEcra: number,
  ladoDoQuadradoNoEcra: number
): Enquadramento {
  if (!(ladoDoQuadradoNoEcra > 0)) return enq;
  const lado = ladoVisivel(fonte, enq.zoom);
  const porPixel = lado / ladoDoQuadradoNoEcra; // pixéis da fotografia por pixel de ecrã

  return limitarEnquadramento(fonte, {
    zoom: enq.zoom,
    centro: {
      x: enq.centro.x - (dxEcra * porPixel) / fonte.largura,
      y: enq.centro.y - (dyEcra * porPixel) / fonte.altura,
    },
  });
}

/**
 * O lado do quadrado que se vai gravar.
 *
 * Nunca maior do que o que a fotografia tem para dar: ampliar 512 pixéis a
 * partir de 200 não acrescenta um único detalhe e triplica os bytes. Nunca é
 * também um número qualquer — é potência de dois ou o que houver.
 */
export function ladoDeSaida(recorte: Recorte, ladoDesejado: number): number {
  return Math.max(1, Math.round(Math.min(ladoDesejado, recorte.lado)));
}
