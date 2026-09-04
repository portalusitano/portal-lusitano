/**
 * O plano de luminância: a forma única a que qualquer fotografia se reduz antes
 * de ser impressa digitalmente.
 *
 * Tudo o que este directório faz assenta aqui. Um JPEG e um PNG não têm nada em
 * comum enquanto ficheiros — um é DCT com Huffman, o outro é deflate com
 * filtros por linha —, mas os dois sabem chegar a isto: uma grelha de números
 * de 0 a 255, uma amostra por posição, sem cor.
 *
 * ## Porque é que a cor sai fora
 *
 * A impressão perceptual mede **estrutura**, não cor. Quem rouba uma
 * fotografia mexe no balanço de brancos, aplica um filtro quente, aumenta a
 * saturação — e a estrutura fica onde estava. Guardar a cor seria guardar
 * exactamente a parte que o adversário sabe mudar de graça. Além disso, num
 * JPEG a crominância vem quase sempre a metade da resolução (4:2:0), o que a
 * torna a pior das três componentes para medir detalhe.
 *
 * O peso de cada canal é o da Rec. 601, o mesmo que o JPEG usa para construir o
 * seu canal Y. Não é uma escolha estética: é o que faz com que a luminância
 * lida de um PNG e a lida de um JPEG do mesmo original sejam a mesma grandeza.
 *
 * ## Porque é que as amostras são `Float32Array`
 *
 * O plano que vem de um JPEG não é feito de pixels: é feito de médias de blocos
 * de 8×8 reconstruídas a partir do coeficiente DC, e essas médias são
 * fraccionárias. Arredondá-las a inteiros à entrada perdia precisão antes de a
 * reamostragem e a DCT a poderem usar. O arredondamento, se for preciso,
 * faz-se no fim.
 */

/** Uma grelha de luminância, em linhas, com `largura * altura` amostras. */
export interface PlanoLuma {
  largura: number;
  altura: number;
  /** Luminância por amostra, na escala 0–255. Pode ser fraccionária. */
  amostras: Float32Array;
  /**
   * As dimensões da fotografia original, em pixels.
   *
   * O plano pode ser muito mais pequeno do que a fotografia — o do JPEG vem a
   * um oitavo, porque é isso que os coeficientes DC dão de graça. Quem lê a
   * impressão tem direito a saber de que tamanho era a imagem, e este é o
   * único sítio onde essa informação ainda existe.
   */
  larguraOriginal: number;
  alturaOriginal: number;
}

/** Cria um plano vazio, com as amostras a zero. */
export function criarPlano(
  largura: number,
  altura: number,
  larguraOriginal = largura,
  alturaOriginal = altura
): PlanoLuma {
  if (!Number.isInteger(largura) || !Number.isInteger(altura) || largura < 1 || altura < 1) {
    throw new Error(`Dimensões inválidas para um plano de luminância: ${largura}×${altura}`);
  }
  return {
    largura,
    altura,
    amostras: new Float32Array(largura * altura),
    larguraOriginal,
    alturaOriginal,
  };
}

/**
 * A luminância de um pixel RGB, pelos pesos da Rec. 601.
 *
 * São os mesmos coeficientes que a norma do JPEG (ITU-T T.871) usa para
 * construir o canal Y a partir do RGB. Usar aqui os da Rec. 709, que é a
 * tentação moderna, faria a luminância de um PNG e a de um JPEG do mesmo
 * original discordarem em alguns níveis — pouco, mas de graça e sem razão.
 */
export function luminancia(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Reamostra um plano para outras dimensões, com média por área.
 *
 * Cada amostra de saída é a média das amostras de entrada que caem debaixo
 * dela, pesadas pela fracção que lhes toca. Isto vale nos dois sentidos: a
 * encolher é um filtro de caixa como deve ser, a crescer replica com as
 * fronteiras certas.
 *
 * **Não é subamostragem por salto**, e a diferença importa. Escolher uma
 * amostra em cada oito deita fora sete oitavos do sinal e deixa entrar o ruído
 * de alta frequência que a recompressão inventa — ou seja, faz precisamente
 * com que a impressão mude quando a imagem não mudou. A média por área é o
 * filtro passa-baixo que a impressão perceptual precisa antes de tudo o resto.
 */
export function reamostrarPlano(plano: PlanoLuma, largura: number, altura: number): PlanoLuma {
  const destino = criarPlano(largura, altura, plano.larguraOriginal, plano.alturaOriginal);
  if (plano.largura === largura && plano.altura === altura) {
    destino.amostras.set(plano.amostras);
    return destino;
  }

  const escalaX = plano.largura / largura;
  const escalaY = plano.altura / altura;

  // Os limites de cada coluna de saída calculam-se uma vez e reaproveitam-se em
  // todas as linhas: são os mesmos para todas, e refazê-los por linha era
  // multiplicar por `altura` um trabalho que não depende dela.
  const inicioX = new Int32Array(largura);
  const fimX = new Int32Array(largura);
  for (let x = 0; x < largura; x++) {
    const de = x * escalaX;
    const ate = (x + 1) * escalaX;
    inicioX[x] = Math.floor(de);
    // `ate` cai exactamente numa fronteira quando a escala é inteira; sem o
    // `max` a coluna ficava vazia e a média dava zero — uma risca preta a cada
    // oito colunas, que é o género de erro que só se vê na imagem final.
    fimX[x] = Math.max(inicioX[x] + 1, Math.ceil(ate));
  }

  for (let y = 0; y < altura; y++) {
    const deY = y * escalaY;
    const ateY = (y + 1) * escalaY;
    const y0 = Math.floor(deY);
    const y1 = Math.max(y0 + 1, Math.ceil(ateY));

    for (let x = 0; x < largura; x++) {
      const deX = x * escalaX;
      const ateX = (x + 1) * escalaX;
      const x0 = inicioX[x];
      const x1 = fimX[x];

      let soma = 0;
      let peso = 0;
      for (let sy = y0; sy < y1 && sy < plano.altura; sy++) {
        const pesoY = Math.min(sy + 1, ateY) - Math.max(sy, deY);
        if (pesoY <= 0) continue;
        const linha = sy * plano.largura;
        for (let sx = x0; sx < x1 && sx < plano.largura; sx++) {
          const pesoX = Math.min(sx + 1, ateX) - Math.max(sx, deX);
          if (pesoX <= 0) continue;
          const p = pesoX * pesoY;
          soma += plano.amostras[linha + sx] * p;
          peso += p;
        }
      }
      destino.amostras[y * largura + x] = peso > 0 ? soma / peso : 0;
    }
  }

  return destino;
}

/**
 * Corta uma janela do plano.
 *
 * Serve o teste de recorte, que é onde se mede se a impressão sobrevive a
 * alguém tirar 5% de margem. Vive aqui e não no ficheiro de teste porque um
 * recorte com as fronteiras trocadas dá distâncias erradas, e um erro desses
 * dentro de um teste passa por resultado.
 */
export function recortarPlano(
  plano: PlanoLuma,
  x: number,
  y: number,
  largura: number,
  altura: number
): PlanoLuma {
  if (x < 0 || y < 0 || x + largura > plano.largura || y + altura > plano.altura) {
    throw new Error("Recorte fora do plano");
  }
  const destino = criarPlano(largura, altura, largura, altura);
  for (let ly = 0; ly < altura; ly++) {
    const origem = (y + ly) * plano.largura + x;
    destino.amostras.set(plano.amostras.subarray(origem, origem + largura), ly * largura);
  }
  return destino;
}
