/**
 * Ler a luminância de um JPEG sem descodificar o JPEG.
 *
 * ## A ideia toda, numa frase
 *
 * Num JPEG, o primeiro coeficiente de cada bloco de 8×8 — o **DC** — é, por
 * definição da DCT, oito vezes a média dos 64 pixels desse bloco. Ou seja: a
 * grelha dos coeficientes DC do canal Y **já é** a fotografia reduzida a um
 * oitavo, com um filtro de caixa perfeito, e está lá dentro à espera. Uma
 * impressão perceptual não quer mais do que isso.
 *
 * Por isso este ficheiro não é um descodificador de JPEG. Não faz
 * transformada inversa, não desfaz a subamostragem da crominância, não
 * converte YCbCr para RGB e nunca escreve um pixel. Faz uma passagem de
 * Huffman pelo ficheiro, guarda o DC de cada bloco de Y e **deita fora os 63
 * coeficientes AC à medida que os lê**.
 *
 * Os AC têm de ser lidos — o código de Huffman é de comprimento variável, não
 * há como saltar por cima sem os descodificar —, mas ler um coeficiente e
 * esquecê-lo custa uma fracção do que custa desquantizá-lo, passá-lo por uma
 * IDCT de 8×8 e escrever 64 bytes. É esse o negócio: fica a parte barata do
 * descodificador e sai a cara, e o que se perde é detalhe abaixo dos 8 pixels,
 * que a impressão ia deitar fora na reamostragem de qualquer maneira.
 *
 * ## Porquê sem dependências
 *
 * O `package-lock.json` é partilhado, e o leitor de PDF deste repositório
 * (`lib/documentos/leitura/texto-pdf.ts`) foi escrito com a mesma regra. Mas a
 * razão de fundo é outra e é melhor: um descodificador de JPEG completo é
 * milhares de linhas de aritmética sobre bytes que vêm de fora, e é uma das
 * superfícies de ataque mais bem conhecidas que há. Este ficheiro nunca aloca
 * em função de um número lido do ficheiro sem o validar primeiro, e nunca
 * escreve um buffer de saída do tamanho da imagem — o maior objecto que cria é
 * a grelha de DC, que tem um sexagésimo-quarto dos pixels.
 *
 * ## O que aceita e o que recusa
 *
 * Aceita **baseline** (SOF0), **extended sequential** (SOF1) e **progressivo**
 * (SOF2), com 1 ou 3 componentes, 8 bits por amostra, Huffman, com ou sem
 * intervalos de reinício.
 *
 * No progressivo aproveita-se uma segunda prenda: os coeficientes DC vêm todos
 * na **primeira** varredura, antes de qualquer AC. Lê-se essa varredura e as
 * suas varreduras de refinamento, e **saltam-se por completo as varreduras de
 * AC** — não é preciso descodificá-las, basta procurar o marcador seguinte. Um
 * JPEG progressivo custa aqui menos do que um baseline.
 *
 * Recusa, com erro e sem inventar nada:
 * - codificação aritmética (SOF9/SOF10) — não existe na prática;
 * - JPEG sem perdas (SOF3) e hierárquico (SOF5–7);
 * - precisão de 12 bits;
 * - 4 componentes (CMYK/YCCK) — nesses a componente 0 é o ciano, não a
 *   luminância, e tratá-la como luz era imprimir uma imagem que não existe;
 * - ficheiros truncados.
 *
 * Recusar é a resposta certa: uma impressão errada é pior do que não haver
 * impressão nenhuma, porque uma impressão errada acaba num par com uma
 * distância que alguém vai ler como um facto.
 */

import { criarPlano, type PlanoLuma } from "./plano";

/** O erro que este módulo levanta. Quem chama distingue-o de um erro de rede. */
export class ErroDeJpeg extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroDeJpeg";
  }
}

/**
 * Tectos sobre o que se aceita descodificar.
 *
 * Não são preferências: são o que impede um ficheiro de 200 bytes de mandar
 * alocar gigabytes. As dimensões do JPEG cabem em 16 bits cada, portanto o
 * pior caso legal é 65535×65535 — quatro mil milhões de pixels, sessenta e
 * sete milhões de blocos DC. O tecto está muito abaixo disso e muito acima de
 * qualquer fotografia de cavalo.
 */
const MAX_PIXELS = 80_000_000;
const MAX_COMPONENTES = 4;

// ─── Leitor de bits com o desmascarar do 0xFF ────────────────────────────────

/**
 * O fluxo de bits de uma varredura.
 *
 * Dentro dos dados codificados, um byte `0xFF` é escrito como `0xFF 0x00` para
 * não se confundir com um marcador. Quem lê tem de desfazer isso — e tem de
 * parar quando encontra um `0xFF` seguido de outra coisa, que é o marcador
 * seguinte. Não parar aí é o erro clássico: o descodificador continua a ler o
 * cabeçalho do próximo segmento como se fossem bits de imagem, e produz uma
 * grelha de números plausíveis que não são a fotografia.
 */
class LeitorDeBits {
  private acumulador = 0;
  private disponiveis = 0;
  /** Fica a `true` quando os dados desta varredura acabaram. */
  fim = false;

  constructor(
    private readonly bytes: Uint8Array,
    public posicao: number
  ) {}

  private proximoByte(): number {
    if (this.posicao >= this.bytes.length) {
      this.fim = true;
      return 0;
    }
    const b = this.bytes[this.posicao++];
    if (b !== 0xff) return b;

    const seguinte = this.posicao < this.bytes.length ? this.bytes[this.posicao] : 0xd9;
    if (seguinte === 0x00) {
      this.posicao++;
      return 0xff;
    }
    // Um marcador. Recua-se para que quem procura marcadores o volte a
    // encontrar, e daqui para a frente só saem zeros — que é o que a norma
    // manda alimentar a um descodificador que chegou ao fim dos dados.
    this.posicao--;
    this.fim = true;
    return 0;
  }

  /** Lê um bit. Depois do fim dos dados devolve 0, para sempre. */
  bit(): number {
    if (this.disponiveis === 0) {
      this.acumulador = this.proximoByte();
      this.disponiveis = 8;
    }
    this.disponiveis--;
    return (this.acumulador >> this.disponiveis) & 1;
  }

  /** Lê `n` bits, do mais significativo para o menos. */
  bits(n: number): number {
    let valor = 0;
    for (let i = 0; i < n; i++) valor = (valor << 1) | this.bit();
    return valor;
  }

  /**
   * Alinha ao byte e descarta o que sobrar. É o que se faz antes de um
   * marcador de reinício.
   */
  alinhar(): void {
    this.disponiveis = 0;
    this.fim = false;
  }
}

// ─── Tabelas de Huffman ──────────────────────────────────────────────────────

/**
 * Uma tabela de Huffman em forma canónica.
 *
 * Guarda-se por comprimento de código — `minimo[l]` é o valor do primeiro
 * código de comprimento `l`, `contagem[l]` quantos há — em vez de uma árvore de
 * objectos. A descodificação passa a ser um ciclo de 16 voltas com aritmética
 * inteira, sem seguir apontadores nem tocar no montão: numa fotografia de três
 * megapixels chamam-se estas tabelas mais de um milhão de vezes.
 */
interface TabelaHuffman {
  /** `minimo[l]` = código mínimo de comprimento `l` (1..16). */
  minimo: Int32Array;
  /** `maximo[l]` = código máximo de comprimento `l`, ou −1 se não houver. */
  maximo: Int32Array;
  /** `base[l]` = índice em `valores` do primeiro código de comprimento `l`. */
  base: Int32Array;
  valores: Uint8Array;
}

function construirTabelaHuffman(contagens: Uint8Array, valores: Uint8Array): TabelaHuffman {
  const minimo = new Int32Array(17);
  const maximo = new Int32Array(17).fill(-1);
  const base = new Int32Array(17);

  let codigo = 0;
  let indice = 0;
  for (let l = 1; l <= 16; l++) {
    const quantos = contagens[l - 1];
    base[l] = indice;
    minimo[l] = codigo;
    if (quantos > 0) {
      maximo[l] = codigo + quantos - 1;
      codigo += quantos;
      indice += quantos;
    } else {
      maximo[l] = -1;
    }
    codigo <<= 1;
  }
  return { minimo, maximo, base, valores };
}

function descodificarHuffman(leitor: LeitorDeBits, tabela: TabelaHuffman): number {
  let codigo = 0;
  for (let l = 1; l <= 16; l++) {
    codigo = (codigo << 1) | leitor.bit();
    const max = tabela.maximo[l];
    if (max >= 0 && codigo <= max) {
      const indice = tabela.base[l] + (codigo - tabela.minimo[l]);
      if (indice >= tabela.valores.length) {
        throw new ErroDeJpeg("Código de Huffman fora da tabela");
      }
      return tabela.valores[indice];
    }
  }
  throw new ErroDeJpeg("Código de Huffman de mais de 16 bits");
}

/**
 * A extensão de sinal da norma: `n` bits lidos como um inteiro com sinal.
 *
 * Um valor cujo bit de topo é 0 é negativo, e vale `lido - 2^n + 1`. Escrever
 * isto ao contrário é um erro que não rebenta — dá uma imagem com o contraste
 * invertido em metade dos blocos —, e por isso está isolado numa função com
 * nome.
 */
function estender(lido: number, n: number): number {
  if (n === 0) return 0;
  return lido < 1 << (n - 1) ? lido - (1 << n) + 1 : lido;
}

// ─── Estrutura do ficheiro ───────────────────────────────────────────────────

interface Componente {
  identificador: number;
  amostragemH: number;
  amostragemV: number;
  tabelaQuantizacao: number;
  /** Blocos na horizontal e vertical, contando o enchimento até ao MCU. */
  blocosPorLinhaMcu: number;
  blocosPorColunaMcu: number;
  /** Blocos que a imagem tem mesmo, sem o enchimento. */
  blocosPorLinha: number;
  blocosPorColuna: number;
  /** O DC de cada bloco, ainda por desquantizar. */
  dc: Int32Array;
  /** O preditor de DC, que anda entre blocos dentro de uma varredura. */
  predicao: number;
  /** Quantas varreduras de refinamento de DC já foram aplicadas. */
  refinamentos: number;
}

function lerU16(bytes: Uint8Array, posicao: number): number {
  if (posicao + 1 >= bytes.length) throw new ErroDeJpeg("Ficheiro truncado");
  return (bytes[posicao] << 8) | bytes[posicao + 1];
}

/**
 * Procura, a partir de `posicao`, o próximo marcador que não seja de reinício.
 *
 * É como se saltam as varreduras de AC de um JPEG progressivo sem as
 * descodificar: os dados codificados nunca contêm um `0xFF` seguido de outra
 * coisa que não `0x00` ou um `RSTn`, portanto o primeiro que aparecer é o fim
 * da varredura.
 */
function procurarMarcador(bytes: Uint8Array, posicao: number): number {
  let i = posicao;
  while (i < bytes.length - 1) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const m = bytes[i + 1];
    if (m === 0x00 || m === 0xff || (m >= 0xd0 && m <= 0xd7)) {
      i += 2;
      continue;
    }
    return i;
  }
  return bytes.length;
}

// ─── A leitura ───────────────────────────────────────────────────────────────

interface Estado {
  largura: number;
  altura: number;
  progressivo: boolean;
  componentes: Componente[];
  /** O valor `[0]` de cada tabela de quantização — o único que o DC usa. */
  quantizacaoDc: Int32Array;
  mcusPorLinha: number;
  mcusPorColuna: number;
  intervaloReinicio: number;
  tabelasDc: (TabelaHuffman | undefined)[];
  tabelasAc: (TabelaHuffman | undefined)[];
}

function lerQuadro(bytes: Uint8Array, posicao: number, progressivo: boolean, estado: Estado): void {
  const comprimento = lerU16(bytes, posicao);
  if (comprimento < 8) throw new ErroDeJpeg("Segmento SOF demasiado curto");
  const precisao = bytes[posicao + 2];
  if (precisao !== 8) {
    throw new ErroDeJpeg(`Precisão de ${precisao} bits não suportada`);
  }
  const altura = lerU16(bytes, posicao + 3);
  const largura = lerU16(bytes, posicao + 5);
  const quantas = bytes[posicao + 7];

  if (largura < 1 || altura < 1) throw new ErroDeJpeg("Imagem sem dimensões");
  if (largura * altura > MAX_PIXELS) {
    throw new ErroDeJpeg(`Imagem demasiado grande: ${largura}×${altura}`);
  }
  if (quantas < 1 || quantas > MAX_COMPONENTES) {
    throw new ErroDeJpeg(`Número de componentes inesperado: ${quantas}`);
  }
  if (quantas === 2 || quantas === 4) {
    // Duas componentes não é nada de conhecido; quatro é CMYK ou YCCK, e aí a
    // componente 0 pode ser o ciano. Ver o cabeçalho.
    throw new ErroDeJpeg(`JPEG de ${quantas} componentes não suportado`);
  }
  if (posicao + 8 + quantas * 3 > bytes.length) throw new ErroDeJpeg("Ficheiro truncado");

  estado.largura = largura;
  estado.altura = altura;
  estado.progressivo = progressivo;
  estado.componentes = [];

  let maxH = 1;
  let maxV = 1;
  const cruas: { id: number; h: number; v: number; q: number }[] = [];
  for (let i = 0; i < quantas; i++) {
    const p = posicao + 8 + i * 3;
    const h = bytes[p + 1] >> 4;
    const v = bytes[p + 1] & 15;
    if (h < 1 || h > 4 || v < 1 || v > 4) {
      throw new ErroDeJpeg("Factores de amostragem inválidos");
    }
    cruas.push({ id: bytes[p], h, v, q: bytes[p + 2] });
    if (h > maxH) maxH = h;
    if (v > maxV) maxV = v;
  }

  estado.mcusPorLinha = Math.ceil(largura / (8 * maxH));
  estado.mcusPorColuna = Math.ceil(altura / (8 * maxV));

  for (const c of cruas) {
    const blocosPorLinha = Math.ceil((Math.ceil(largura / 8) * c.h) / maxH);
    const blocosPorColuna = Math.ceil((Math.ceil(altura / 8) * c.v) / maxV);
    const blocosPorLinhaMcu = estado.mcusPorLinha * c.h;
    const blocosPorColunaMcu = estado.mcusPorColuna * c.v;
    estado.componentes.push({
      identificador: c.id,
      amostragemH: c.h,
      amostragemV: c.v,
      tabelaQuantizacao: c.q,
      blocosPorLinha,
      blocosPorColuna,
      blocosPorLinhaMcu,
      blocosPorColunaMcu,
      dc: new Int32Array(blocosPorLinhaMcu * blocosPorColunaMcu),
      predicao: 0,
      refinamentos: 0,
    });
  }
}

/**
 * Descodifica uma varredura.
 *
 * Devolve a posição logo a seguir aos dados codificados. Trata os três casos
 * que existem: baseline (DC + AC no mesmo bloco), varredura de DC de um
 * progressivo (Ah=0, com deslocamento Al) e refinamento de DC (Ah>0, um bit por
 * bloco). Uma varredura de AC de um progressivo nem chega aqui — quem chama
 * salta-a.
 */
function lerVarredura(bytes: Uint8Array, posicao: number, estado: Estado): number {
  const comprimento = lerU16(bytes, posicao);
  if (comprimento < 6) throw new ErroDeJpeg("Segmento SOS demasiado curto");
  const quantas = bytes[posicao + 2];
  if (posicao + 3 + quantas * 2 + 3 > bytes.length) throw new ErroDeJpeg("Ficheiro truncado");

  const naVarredura: { componente: Componente; tabelaDc: number; tabelaAc: number }[] = [];
  for (let i = 0; i < quantas; i++) {
    const p = posicao + 3 + i * 2;
    const id = bytes[p];
    const componente = estado.componentes.find((c) => c.identificador === id);
    if (!componente) throw new ErroDeJpeg(`Varredura sobre componente ${id}, que não existe`);
    naVarredura.push({ componente, tabelaDc: bytes[p + 1] >> 4, tabelaAc: bytes[p + 1] & 15 });
  }

  const fimEspectro = bytes[posicao + 3 + quantas * 2 + 1];
  const aproximacao = bytes[posicao + 3 + quantas * 2 + 2];
  const ah = aproximacao >> 4;
  const al = aproximacao & 15;

  const inicioDados = posicao + comprimento;
  const leitor = new LeitorDeBits(bytes, inicioDados);
  for (const { componente } of naVarredura) componente.predicao = 0;

  const refinamentoDeDc = estado.progressivo && ah > 0;
  const intervalo = estado.intervaloReinicio;
  let porReiniciar = intervalo;

  /** Trata um marcador de reinício, se for altura dele. */
  const talvezReiniciar = (): void => {
    if (intervalo === 0) return;
    porReiniciar--;
    if (porReiniciar > 0) return;
    porReiniciar = intervalo;
    leitor.alinhar();
    // Salta o `FFDn`, que está algures a partir daqui.
    let p = leitor.posicao;
    while (
      p < bytes.length - 1 &&
      !(bytes[p] === 0xff && bytes[p + 1] >= 0xd0 && bytes[p + 1] <= 0xd7)
    ) {
      p++;
    }
    if (p < bytes.length - 1) leitor.posicao = p + 2;
    for (const { componente } of naVarredura) componente.predicao = 0;
  };

  const bloco = (
    entrada: { componente: Componente; tabelaDc: number; tabelaAc: number },
    indice: number
  ): void => {
    const { componente, tabelaDc, tabelaAc } = entrada;

    if (refinamentoDeDc) {
      // Um bit por bloco, que acrescenta precisão a um DC já lido.
      if (leitor.bit()) componente.dc[indice] |= 1 << al;
      return;
    }

    const dcHuff = estado.tabelasDc[tabelaDc];
    if (!dcHuff) throw new ErroDeJpeg(`Tabela de Huffman DC ${tabelaDc} não definida`);
    const categoria = descodificarHuffman(leitor, dcHuff);
    if (categoria > 15) throw new ErroDeJpeg("Categoria de DC inválida");
    const diferenca = categoria === 0 ? 0 : estender(leitor.bits(categoria), categoria);
    componente.predicao += diferenca;
    componente.dc[indice] = componente.predicao << al;

    if (estado.progressivo) return; // Numa varredura de DC não há AC nenhum.

    // Baseline: os 63 AC têm de ser lidos, e são deitados fora à medida. É o
    // único trabalho que este ficheiro faz sem guardar nada — e é o que
    // permite não fazer IDCT nenhuma.
    const acHuff = estado.tabelasAc[tabelaAc];
    if (!acHuff) throw new ErroDeJpeg(`Tabela de Huffman AC ${tabelaAc} não definida`);
    let k = 1;
    while (k <= fimEspectro) {
      const simbolo = descodificarHuffman(leitor, acHuff);
      const tamanho = simbolo & 15;
      const salto = simbolo >> 4;
      if (tamanho === 0) {
        if (salto !== 15) break; // Fim do bloco.
        k += 16;
        continue;
      }
      k += salto + 1;
      if (k > 64) throw new ErroDeJpeg("Coeficiente AC fora do bloco");
      leitor.bits(tamanho);
    }
  };

  if (naVarredura.length === 1) {
    // Varredura não entrelaçada: os blocos percorrem-se pela grelha real da
    // componente, sem o enchimento até ao MCU. Usar aqui a grelha com
    // enchimento é o erro que desalinha a imagem toda a partir da segunda
    // linha, e é subtil porque em imagens cujas dimensões são múltiplas do MCU
    // as duas grelhas coincidem.
    const entrada = naVarredura[0];
    const { componente } = entrada;
    for (let by = 0; by < componente.blocosPorColuna; by++) {
      for (let bx = 0; bx < componente.blocosPorLinha; bx++) {
        bloco(entrada, by * componente.blocosPorLinhaMcu + bx);
        talvezReiniciar();
      }
    }
  } else {
    for (let my = 0; my < estado.mcusPorColuna; my++) {
      for (let mx = 0; mx < estado.mcusPorLinha; mx++) {
        for (const entrada of naVarredura) {
          const { componente } = entrada;
          for (let v = 0; v < componente.amostragemV; v++) {
            for (let h = 0; h < componente.amostragemH; h++) {
              const by = my * componente.amostragemV + v;
              const bx = mx * componente.amostragemH + h;
              bloco(entrada, by * componente.blocosPorLinhaMcu + bx);
            }
          }
        }
        talvezReiniciar();
      }
    }
  }

  if (!refinamentoDeDc) {
    for (const { componente } of naVarredura) componente.refinamentos++;
  }

  return procurarMarcador(bytes, Math.max(leitor.posicao, inicioDados));
}

/**
 * Lê um JPEG e devolve o plano de luminância a um oitavo da resolução.
 *
 * O plano tem `ceil(largura/8) × ceil(altura/8)` amostras quando o Y é a
 * componente de maior amostragem, que é o caso de qualquer JPEG normal. Os
 * valores são médias de blocos de 8×8, na escala 0–255.
 */
export function lerLumaDeJpeg(bytes: Uint8Array): PlanoLuma {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new ErroDeJpeg("Não começa por SOI");
  }

  const estado: Estado = {
    largura: 0,
    altura: 0,
    progressivo: false,
    componentes: [],
    quantizacaoDc: new Int32Array(4).fill(1),
    mcusPorLinha: 0,
    mcusPorColuna: 0,
    intervaloReinicio: 0,
    tabelasDc: [],
    tabelasAc: [],
  };

  let posicao = 2;
  let viuQuadro = false;

  while (posicao < bytes.length - 1) {
    if (bytes[posicao] !== 0xff) {
      // Lixo entre segmentos. Procura-se o marcador seguinte em vez de desistir:
      // há máquinas fotográficas que deixam bytes de enchimento aqui.
      posicao = procurarMarcador(bytes, posicao);
      continue;
    }
    let marcador = bytes[posicao + 1];
    while (marcador === 0xff && posicao + 2 < bytes.length) {
      posicao++;
      marcador = bytes[posicao + 1];
    }
    posicao += 2;

    if (marcador === 0xd9) break; // EOI
    // Marcadores sem carga nenhuma. O `0xd8` está aqui porque um SOI repetido
    // acontece em ficheiros remendados, e lê-lo como um segmento com
    // comprimento faz o leitor saltar para o meio dos dados.
    if (marcador === 0x01 || marcador === 0xd8 || (marcador >= 0xd0 && marcador <= 0xd7)) {
      continue;
    }

    // Os modos que não se descodificam. A codificação aritmética ocupa
    // 0xC9–0xCB e 0xCD–0xCF, mais o 0xCC (DAC) que só existe para a servir;
    // 0xC3 é o modo sem perdas e 0xC5–0xC7 o hierárquico. Nenhum deles tem os
    // coeficientes DC onde este ficheiro os vai buscar.
    if ((marcador >= 0xc9 && marcador <= 0xcf) || marcador === 0xcc) {
      throw new ErroDeJpeg("JPEG com codificação aritmética não suportado");
    }
    if (marcador === 0xc3 || (marcador >= 0xc5 && marcador <= 0xc8)) {
      throw new ErroDeJpeg(`Modo de JPEG não suportado (SOF 0x${marcador.toString(16)})`);
    }

    const comprimento = lerU16(bytes, posicao);
    if (comprimento < 2 || posicao + comprimento > bytes.length) {
      throw new ErroDeJpeg("Segmento com comprimento inválido");
    }

    switch (marcador) {
      case 0xdb: {
        // DQT. Só interessa o valor `[0]` de cada tabela: é o único que o DC
        // usa, e os outros 63 multiplicam coeficientes que se deitam fora.
        let p = posicao + 2;
        const fim = posicao + comprimento;
        while (p < fim) {
          const precisao = bytes[p] >> 4;
          const indice = bytes[p] & 15;
          if (indice > 3) throw new ErroDeJpeg("Índice de tabela de quantização inválido");
          p++;
          if (precisao === 0) {
            estado.quantizacaoDc[indice] = bytes[p];
            p += 64;
          } else {
            estado.quantizacaoDc[indice] = lerU16(bytes, p);
            p += 128;
          }
        }
        break;
      }
      case 0xc4: {
        // DHT.
        let p = posicao + 2;
        const fim = posicao + comprimento;
        while (p + 17 <= fim) {
          const classe = bytes[p] >> 4;
          const indice = bytes[p] & 15;
          if (indice > 3) throw new ErroDeJpeg("Índice de tabela de Huffman inválido");
          const contagens = bytes.subarray(p + 1, p + 17);
          let total = 0;
          for (let i = 0; i < 16; i++) total += contagens[i];
          if (p + 17 + total > fim) throw new ErroDeJpeg("Tabela de Huffman truncada");
          const valores = bytes.slice(p + 17, p + 17 + total);
          const tabela = construirTabelaHuffman(contagens, valores);
          if (classe === 0) estado.tabelasDc[indice] = tabela;
          else estado.tabelasAc[indice] = tabela;
          p += 17 + total;
        }
        break;
      }
      case 0xdd:
        estado.intervaloReinicio = lerU16(bytes, posicao + 2);
        break;
      case 0xc0:
      case 0xc1:
      case 0xc2:
        lerQuadro(bytes, posicao, marcador === 0xc2, estado);
        viuQuadro = true;
        break;
      case 0xda: {
        if (!viuQuadro) throw new ErroDeJpeg("Varredura antes do cabeçalho da imagem");
        const quantas = bytes[posicao + 2];
        const inicioEspectro = bytes[posicao + 3 + quantas * 2];
        // Numa varredura de AC de um progressivo (Ss > 0) não há DC nenhum a
        // colher. Salta-se sem descodificar — é o que torna o progressivo mais
        // barato aqui do que o baseline.
        if (estado.progressivo && inicioEspectro > 0) {
          posicao = procurarMarcador(bytes, posicao + lerU16(bytes, posicao));
          continue;
        }
        posicao = lerVarredura(bytes, posicao, estado);
        continue;
      }
      default:
        break; // APPn, COM e companhia: nada aqui interessa.
    }

    posicao += comprimento;
  }

  if (!viuQuadro || estado.componentes.length === 0) {
    throw new ErroDeJpeg("JPEG sem cabeçalho de imagem");
  }

  const y = estado.componentes[0];
  if (y.refinamentos === 0) {
    throw new ErroDeJpeg("JPEG sem dados para a componente de luminância");
  }

  // O DC de um bloco é oito vezes a média dos seus 64 pixels, depois do desvio
  // de nível de −128 que a norma aplica antes da transformada. Desfazer as duas
  // coisas dá a média em 0–255, que é o que um plano de luminância é.
  const quantizacao = estado.quantizacaoDc[y.tabelaQuantizacao] || 1;
  const plano = criarPlano(y.blocosPorLinha, y.blocosPorColuna, estado.largura, estado.altura);
  for (let by = 0; by < y.blocosPorColuna; by++) {
    for (let bx = 0; bx < y.blocosPorLinha; bx++) {
      const bruto = (y.dc[by * y.blocosPorLinhaMcu + bx] * quantizacao) / 8 + 128;
      plano.amostras[by * y.blocosPorLinha + bx] = bruto < 0 ? 0 : bruto > 255 ? 255 : bruto;
    }
  }
  return plano;
}
