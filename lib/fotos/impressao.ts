/**
 * A impressão digital perceptual de uma fotografia.
 *
 * ## O problema, e porque é que o SHA-256 não chega
 *
 * O `lib/documentos/sinais.ts` já detecta **o mesmo ficheiro** em dois
 * anúncios, por SHA-256. Isso apanha quem descarrega uma fotografia e a volta a
 * enviar tal e qual, e mais ninguém — porque o SHA-256 é um hash
 * criptográfico, e a propriedade que o torna bom para o que faz (mudar um bit
 * muda metade da saída) é exactamente a que o torna inútil aqui. Quem rouba uma
 * fotografia guarda-a outra vez, corta uma margem, encolhe-a para caber no
 * limite de tamanho, carimba-lhe uma marca de água. A imagem é a mesma para
 * qualquer pessoa que olhe, e o SHA-256 já não coincide em nada.
 *
 * Faz falta o contrário de um hash criptográfico: um valor que mude **pouco**
 * quando a imagem muda pouco, e que se compare por distância em vez de por
 * igualdade.
 *
 * ## A impressão escolhida: pHash por DCT, 64 bits
 *
 * A escolha ficou entre as três da praxe, e foi medida antes de ser feita (os
 * números estão mais abaixo e vêm de `__tests__/fotos-impressao.test.ts`):
 *
 * - **aHash** — média de um 8×8, um bit por amostra acima ou abaixo. É trivial.
 *   A fragilidade que se lhe costuma atribuir — ceder ao brilho — **foi medida
 *   e não se confirmou**: comparar contra a própria média torna-a tão
 *   invariante à exposição como as outras duas. Onde cede é na
 *   **discriminação**: 64 amostras contra uma média só é pouca informação, e o
 *   piso das distâncias entre fotografias sem relação nenhuma é mais baixo do
 *   que o da pHash. Num sistema onde um falso positivo custa mais do que uma
 *   detecção falhada, é esse o lado que a exclui.
 * - **dHash** — compara amostras vizinhas na horizontal. É quase de graça e
 *   aguenta muito bem a recompressão e o redimensionamento, porque um
 *   gradiente local é invariante a qualquer transformação monótona do brilho.
 * - **pHash** — DCT bidimensional sobre um 32×32, ficam os 64 coeficientes de
 *   frequência mais baixa sem o DC, cada bit diz se o coeficiente está acima da
 *   mediana.
 *
 * **Escolheu-se a pHash.** Duas notas honestas sobre essa escolha, porque as
 * medições não disseram exactamente o que se esperava delas:
 *
 * 1. **O argumento de custo que costuma travar a pHash não se aplica aqui.** A
 *    pHash é «cara» porque exige descodificar e reduzir a imagem antes da
 *    transformada — mas o `jpeg.ts` deste directório entrega o plano a um
 *    oitavo **sem descodificar a imagem**, colhendo os coeficientes DC que já
 *    lá estão. Feita a redução, a DCT separável de um 32×32 são 2·32³ ≈ 65 mil
 *    multiplicações, uma fracção de milissegundo. O que era caro na pHash é
 *    trabalho que este directório já tinha de fazer.
 * 2. **A pHash não ganhou no recorte, que era o motivo pelo qual se esperava
 *    que ganhasse.** Medida contra um recorte de 5% de margem sem a defesa
 *    descrita na secção seguinte, a pHash deu 10–20 e a dHash 5–12: a dHash
 *    aguentou-o *melhor*. O que decidiu a favor da pHash foi o outro lado da
 *    balança — o piso das imagens diferentes, que na pHash é 6 e na dHash é 5,
 *    e sobretudo a forma da cauda. E o recorte acabou por não se resolver
 *    escolhendo entre as duas: resolveu-se guardando dois enquadramentos.
 *
 * A aHash não entrou em serviço e fica implementada à mesma: é a referência
 * contra a qual as outras duas se justificam, e uma escolha sem alternativa
 * medida ao lado é uma preferência, não uma escolha.
 *
 * ### Porque é que o DC sai fora, e porquê a mediana
 *
 * O coeficiente `[0][0]` da DCT é a média da imagem — o brilho global. Mantê-lo
 * gastava um bit que dizia sempre a mesma coisa (é sempre o maior de todos) e
 * ainda contaminava a mediana. Fora ele, a impressão fica **invariante ao
 * brilho**. E comparar contra a mediana em vez de contra zero ou contra a média
 * torna-a **invariante ao contraste**: multiplicar a imagem inteira por um
 * factor multiplica todos os coeficientes pelo mesmo factor, e a ordem
 * relativa à mediana não muda. Metade dos bits fica a 1 por construção, o que
 * também é o que dá à impressão a entropia que ela precisa de ter.
 *
 * Os 64 coeficientes são os de frequência mais baixa por ordem de diagonal
 * (`u+v` crescente), que é a mesma ordenação por frequência do ziguezague do
 * JPEG. Numa grelha de 32×32 isso ocupa só o canto de cerca de 11×11 — as
 * frequências altas, que são onde a recompressão faz estragos, nunca entram.
 *
 * ## Dois enquadramentos, e não um — porque o recorte foi medido
 *
 * A primeira versão guardava **uma** impressão por fotografia, a do quadro
 * inteiro. Medida contra um recorte de 5% de margem, deu isto: mínimo 10,
 * mediana 12, máximo 20 — enquanto duas imagens diferentes começavam nos 10.
 * Ou seja: **não havia limiar nenhum que apanhasse um recorte de 5% sem
 * apanhar também imagens que nada têm a ver uma com a outra.** E cortar a
 * margem é a primeira coisa que quem rouba uma fotografia faz, porque é o que
 * tira a marca de água do canto.
 *
 * A razão é geométrica e não se resolve com um limiar: tirar 5% de margem e
 * voltar a esticar até ao mesmo quadro muda a frequência de tudo o que lá está
 * em cerca de 11%, e uma DCT mede exactamente frequências. Não é ruído que se
 * absorva — é outro sinal.
 *
 * Por isso guardam-se **duas** impressões por fotografia: a do quadro inteiro
 * e a do **centro a 90%** — a mesma imagem com 5% de margem tirada de cada
 * lado. Comparar duas fotografias passa a ser comparar três pares (inteira
 * contra inteira, inteira contra centro, centro contra inteira) e ficar com o
 * mais curto. Se B for um recorte de A, é o par «inteira de B contra centro de
 * A» que se alinha.
 *
 * O que isso mudou, medido na mesma bateria: o recorte de 5% caiu de
 * «mínimo 10, máximo 20» para «mínimo 0, máximo 2», e o mínimo entre imagens
 * diferentes **não se mexeu**. Não é de graça em termos de risco — são três
 * comparações em vez de uma, portanto três oportunidades de coincidir — mas o
 * centro de uma imagem diferente continua a ser uma imagem diferente, e as
 * medições confirmam-no.
 *
 * ## A que resiste, e a que não resiste
 *
 * **Resiste** a: recompressão JPEG em qualquer qualidade utilizável;
 * redimensionamento para qualquer escala; recorte de margem de 5% (e, com
 * menos folga, entre 2% e 6%); mudanças de brilho e de contraste; conversão
 * entre PNG e JPEG; passar a preto e branco ou mexer na saturação (a cor nem
 * chega a entrar — ver `plano.ts`).
 *
 * **Não resiste** a — e é preciso dizê-lo, porque cada um destes é uma maneira
 * conhecida de fugir: espelhamento horizontal ou rotação de 90° (medido: a
 * distância de uma imagem espelhada para si própria é 28 a 34, ou seja
 * indistinguível de duas imagens diferentes); recortes de 8% ou mais (medido:
 * mediana 8, máximo 14, portanto metade escapa); ficar só com a cabeça do
 * cavalo; uma marca de água opaca sobre grande parte do quadro. O espelhamento
 * é o mais barato de todos para quem o quiser fazer, e a defesa possível —
 * imprimir também a imagem espelhada e guardar mais duas colunas — está
 * descrita no relatório e **não** está feita aqui.
 *
 * ## O limiar, medido e não inventado
 *
 * Os números são a saída de `__tests__/fotos-impressao.test.ts` — que os
 * **imprime**, para que não sejam um número escrito à mão que ninguém sabe de
 * onde veio. Doze imagens sintéticas geradas em código a 640×480 (o
 * repositório não traz uma única imagem vinda de fora), atravessando um
 * codificador e o descodificador de JPEG a sério. Distância de Hamming sobre
 * 64 bits, já com os dois enquadramentos. A recompressão é dupla de verdade —
 * a imagem passa por um JPEG de qualidade 90 e é guardada outra vez.
 *
 * ```
 * a mesma fotografia, transformada       n    mín   mediana   máx
 * ───────────────────────────────────────────────────────────────
 * recomprimida (q90 → q70, q45)         24     0       0       2
 * redimensionada (×0,6 e ×0,35)         24     0       0       2
 * recortada 3% de margem                12     2       6      12
 * recortada 5% de margem                12     0       0       2
 * recortada 8% de margem                12     4       8      14
 * brilho ×1,3 −22                       12     2       4       6
 * JPEG → PNG                            12     0       0       2
 * ───────────────────────────────────────────────────────────────
 * duas fotografias diferentes           66     6      28      38
 * ```
 *
 * A cauda baixa das 66 diferentes, que é a única parte que interessa:
 * `6, 12, 16, 20, 22, 22, 22, 22`. **Há um par a 6 e depois nada até aos 12.**
 *
 * O recorte de 3% ficar pior (máx 12) do que o de 5% (máx 2) não é ruído: é a
 * consequência directa de o segundo enquadramento estar fixado nos 5%. Um
 * recorte de 5% alinha exactamente com o centro guardado; um de 3% não alinha
 * nem com o quadro inteiro nem com o centro, e cai entre as duas cadeiras. É o
 * preço de guardar dois enquadramentos em vez de um contínuo, e está medido em
 * vez de escondido.
 *
 * O par a 6 não é um defeito da impressão: são duas imagens construídas de
 * propósito para partilharem o cenário de fundo e diferirem só no primeiro
 * plano — que é, palavra por palavra, a terceira explicação inocente da lista
 * das regras deste directório («uma coudelaria a anunciar dois cavalos com a
 * mesma fotografia de fundo»). Duas fotografias tiradas no mesmo picadeiro
 * **são** parecidas, e nenhuma impressão perceptual honesta pode dizer o
 * contrário.
 *
 * É isso que fixa o limiar em **8**, e é isso que fixa a forma da saída:
 *
 * - **8** apanha a recompressão inteira, o redimensionamento inteiro, o recorte
 *   até 5% e o brilho, e cai exactamente no vazio entre o par a 6 e o par
 *   seguinte a 12 — quatro bits de folga de cada lado, que é o mais que esta
 *   distribuição dá.
 * - Subir para 12 traria um segundo par de imagens diferentes para dentro da
 *   rede a troco de apanhar mais alguns recortes de 3%; descer para 4 perderia
 *   o recorte de 5% e o brilho, e continuaria a não evitar o par a 6, que é o
 *   único que se gostaria de evitar.
 *
 * E, sobretudo: **um limiar não é uma decisão.** O par a 6 mostra que não
 * existe número nenhum que separe «a mesma fotografia» de «duas fotografias do
 * mesmo sítio». Por isso o `sinais.ts` deste directório não devolve um
 * veredicto — devolve a distância, os dois ids e os dois vendedores, para uma
 * pessoa ir ver. O limiar só decide o que entra na fila de quem revê; nada
 * mais.
 *
 * ## Porque é que a dHash não é uma segunda condição
 *
 * A tentação óbvia era exigir que as duas impressões concordassem, na ideia de
 * que duas medidas independentes cortam os falsos positivos. **Foi medido, e
 * não corta.** Com o limiar da pHash em 8, exigir também `dHash ≤ 10`, `≤ 14`
 * ou `≤ 18` deixa os falsos positivos exactamente onde estavam — 1 em 120 nos
 * três casos — e só faz perder casos legítimos (119 → 118 apanhados). As duas
 * impressões lêem a mesma estrutura da mesma imagem reduzida; de independentes
 * não têm nada.
 *
 * A dHash fica guardada e fica **relatada** ao lado da pHash, porque quem revê
 * ter duas grandezas é melhor do que ter uma. Não é uma condição, e não manda
 * em nada.
 */

import { descodificarLuma } from "./descodificar";
import { reamostrarPlano, recortarPlano, type PlanoLuma } from "./plano";

/** O lado da grelha sobre a qual a DCT corre. */
export const LADO_DCT = 32;

/** Quantos bits tem uma impressão. */
export const BITS_DA_IMPRESSAO = 64;

/**
 * A margem que se tira de cada lado para o segundo enquadramento.
 *
 * Cinco por cento porque é o recorte que se está a tentar apanhar — o que tira
 * a marca de água do canto sem dar pela falta de nada. Ver o cabeçalho.
 */
export const MARGEM_DO_CENTRO = 0.05;

/**
 * A distância de Hamming a partir da qual duas fotografias deixam de entrar na
 * fila de quem revê.
 *
 * **Não é uma fronteira entre culpado e inocente** — essa não existe, e a
 * medição mostra-o: há um par de imagens diferentes a distância 6. É a largura
 * da rede. Ver o cabeçalho deste ficheiro para os números.
 */
export const LIMIAR_PHASH = 8;

/** A impressão de uma fotografia, nos dois enquadramentos. */
export interface ImpressaoDeFotografia {
  /** A pHash do quadro inteiro. 64 bits em 16 dígitos hexadecimais. */
  phash: string;
  /** A pHash do centro a 90%. É esta que apanha um recorte de margem. */
  phashCentro: string;
  /** A dHash do quadro inteiro. Relatada, nunca usada como condição. */
  dhash: string;
  /** A dHash do centro a 90%. */
  dhashCentro: string;
  /** As dimensões da fotografia, em pixels. */
  largura: number;
  altura: number;
}

// ─── A DCT ───────────────────────────────────────────────────────────────────

/**
 * A matriz de cossenos da DCT-II de `LADO_DCT` pontos, calculada uma vez.
 *
 * Calculá-la por chamada eram 1024 `Math.cos` por fotografia a produzir sempre
 * os mesmos 1024 números. É uma constante do módulo, como a grelha de
 * meridianos do `<GloboMapa>` passou a ser.
 */
const COSSENOS = (() => {
  const m = new Float64Array(LADO_DCT * LADO_DCT);
  for (let u = 0; u < LADO_DCT; u++) {
    for (let x = 0; x < LADO_DCT; x++) {
      m[u * LADO_DCT + x] = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * LADO_DCT));
    }
  }
  return m;
})();

/**
 * DCT-II bidimensional, feita como duas passagens de uma dimensão.
 *
 * Separável quer dizer que a transformada de uma grelha é a transformada das
 * linhas seguida da das colunas. São 2·N³ multiplicações em vez de N⁴ — para
 * N=32, 65 mil em vez de um milhão. Os factores de normalização não se aplicam
 * porque a impressão só compara coeficientes contra a mediana dos seus pares,
 * e uma escala comum a todos não muda comparação nenhuma.
 */
function dct2(entrada: Float32Array): Float64Array {
  const n = LADO_DCT;
  const linhas = new Float64Array(n * n);
  for (let y = 0; y < n; y++) {
    const base = y * n;
    for (let u = 0; u < n; u++) {
      let soma = 0;
      const cos = u * n;
      for (let x = 0; x < n; x++) soma += entrada[base + x] * COSSENOS[cos + x];
      linhas[base + u] = soma;
    }
  }
  const saida = new Float64Array(n * n);
  for (let u = 0; u < n; u++) {
    for (let v = 0; v < n; v++) {
      let soma = 0;
      const cos = v * n;
      for (let y = 0; y < n; y++) soma += linhas[y * n + u] * COSSENOS[cos + y];
      saida[v * n + u] = soma;
    }
  }
  return saida;
}

/**
 * Os 64 coeficientes de frequência mais baixa, sem o DC, por ordem de diagonal.
 *
 * A ordem é `u+v` crescente e, dentro da mesma diagonal, `u` crescente — a
 * mesma ordenação por frequência que o ziguezague do JPEG faz, sem a
 * complicação de alternar o sentido, que aqui não serviria para nada porque não
 * se está a codificar corridas de zeros. Calculada uma vez.
 */
const COEFICIENTES = (() => {
  const pares: [number, number][] = [];
  for (let d = 0; d <= 2 * (LADO_DCT - 1); d++) {
    for (let u = 0; u <= d; u++) {
      const v = d - u;
      if (v < LADO_DCT && u < LADO_DCT) pares.push([u, v]);
    }
  }
  // Fora o `[0][0]`, que é o brilho global. Ver o cabeçalho.
  return new Int32Array(pares.slice(1, BITS_DA_IMPRESSAO + 1).map(([u, v]) => v * LADO_DCT + u));
})();

// ─── Bits e hexadecimal ──────────────────────────────────────────────────────

/**
 * Empacota 64 booleanos em 16 dígitos hexadecimais.
 *
 * O bit 0 é o dígito mais à esquerda, para que a leitura de um humano bata
 * certo com a ordem dos coeficientes. Faz-se em dois blocos de 32 bits porque
 * um `number` de JavaScript só faz operações sobre bits até aos 32 — juntar os
 * 64 num só era a maneira silenciosa de perder a metade de cima.
 */
function empacotar(bits: boolean[]): string {
  let saida = "";
  for (let bloco = 0; bloco < 2; bloco++) {
    let alto = 0;
    let baixo = 0;
    for (let i = 0; i < 16; i++) alto = (alto << 1) | (bits[bloco * 32 + i] ? 1 : 0);
    for (let i = 16; i < 32; i++) baixo = (baixo << 1) | (bits[bloco * 32 + i] ? 1 : 0);
    saida += alto.toString(16).padStart(4, "0") + baixo.toString(16).padStart(4, "0");
  }
  return saida;
}

/** A mediana de um conjunto de números, sem lhe mexer na ordem original. */
function mediana(valores: readonly number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = ordenados.length >> 1;
  return ordenados.length % 2 === 1 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

// ─── As três impressões ──────────────────────────────────────────────────────

/**
 * A pHash de um plano de luminância.
 *
 * Exportada à parte de `impressaoDeFotografia` porque é sobre planos que se
 * medem os limiares: um teste que quisesse medir a resistência ao recorte
 * teria de codificar um JPEG novo por cada recorte só para lhe poder chamar a
 * função, o que é enfiar um codificador no meio de uma medição que não é sobre
 * ele.
 */
export function phashDePlano(plano: PlanoLuma): string {
  const reduzido = reamostrarPlano(plano, LADO_DCT, LADO_DCT);
  const coeficientes = dct2(reduzido.amostras);
  const escolhidos: number[] = [];
  for (let i = 0; i < COEFICIENTES.length; i++) escolhidos.push(coeficientes[COEFICIENTES[i]]);
  const m = mediana(escolhidos);
  return empacotar(escolhidos.map((c) => c > m));
}

/**
 * A dHash de um plano: 9×8 amostras, um bit por par de vizinhos na horizontal.
 *
 * Nove colunas para dar oito comparações. É essa diferença entre vizinhos que
 * a torna cega a qualquer mudança monótona do brilho — se a imagem inteira
 * clarear, todos os pares clareiam juntos e nenhuma comparação muda de lado.
 */
export function dhashDePlano(plano: PlanoLuma): string {
  const reduzido = reamostrarPlano(plano, 9, 8);
  const bits: boolean[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      bits.push(reduzido.amostras[y * 9 + x] > reduzido.amostras[y * 9 + x + 1]);
    }
  }
  return empacotar(bits);
}

/**
 * A aHash de um plano: 8×8 amostras contra a sua própria média.
 *
 * Não é usada em produção e é de propósito que fica exportada: é a referência
 * contra a qual o teste mostra que as outras duas valem o que custam. Uma
 * escolha sem alternativa medida ao lado é uma preferência, não uma escolha.
 */
export function ahashDePlano(plano: PlanoLuma): string {
  const reduzido = reamostrarPlano(plano, 8, 8);
  let soma = 0;
  for (let i = 0; i < 64; i++) soma += reduzido.amostras[i];
  const media = soma / 64;
  const bits: boolean[] = [];
  for (let i = 0; i < 64; i++) bits.push(reduzido.amostras[i] > media);
  return empacotar(bits);
}

/**
 * O centro do plano, com `MARGEM_DO_CENTRO` tirado de cada lado.
 *
 * Numa imagem pequena de mais a margem arredonda para zero e o centro passa a
 * ser o plano inteiro. É a resposta certa: as duas impressões ficam iguais, o
 * que custa uma comparação repetida e não estraga nada — melhor do que
 * rebentar, e melhor do que inventar um recorte de um pixel.
 */
function centroDoPlano(plano: PlanoLuma): PlanoLuma {
  const mx = Math.round(plano.largura * MARGEM_DO_CENTRO);
  const my = Math.round(plano.altura * MARGEM_DO_CENTRO);
  if (mx === 0 && my === 0) return plano;
  return recortarPlano(plano, mx, my, plano.largura - 2 * mx, plano.altura - 2 * my);
}

/**
 * A impressão de uma fotografia, a partir dos bytes do ficheiro.
 *
 * Não recebe o `Content-Type` declarado e não olha para o nome do ficheiro: o
 * formato lê-se nos bytes, que é a segunda regra do
 * `lib/documentos/contrato.ts` e vale aqui pela mesma razão.
 *
 * O ficheiro é descodificado **uma vez**; os quatro valores saem todos do
 * mesmo plano. A descodificação é a parte cara — medido, 104ms num JPEG de 6
 * megapixels contra menos de um milissegundo para as quatro impressões.
 */
export function impressaoDeFotografia(bytes: Uint8Array): ImpressaoDeFotografia {
  const plano = descodificarLuma(bytes);
  const centro = centroDoPlano(plano);
  return {
    phash: phashDePlano(plano),
    phashCentro: phashDePlano(centro),
    dhash: dhashDePlano(plano),
    dhashCentro: dhashDePlano(centro),
    largura: plano.larguraOriginal,
    altura: plano.alturaOriginal,
  };
}

// ─── A distância ─────────────────────────────────────────────────────────────

const HEXADECIMAL = /^[0-9a-f]{16}$/;

/** Uma impressão bem formada: 16 dígitos hexadecimais minúsculos. */
export function impressaoValida(valor: unknown): valor is string {
  return typeof valor === "string" && HEXADECIMAL.test(valor);
}

/**
 * Conta os bits a 1 de um inteiro de 32 bits.
 *
 * É o algoritmo de Wegner na forma paralela — soma bits dois a dois, depois
 * quatro a quatro, e por aí. Doze operações inteiras, sem ciclo e sem tabela.
 * O ciclo de 32 voltas que isto substitui é a diferença entre uma varredura de
 * mil fotografias custar meio milissegundo ou dez.
 */
function bitsA1(x: number): number {
  x = x - ((x >> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
  x = (x + (x >> 4)) & 0x0f0f0f0f;
  return (x * 0x01010101) >> 24;
}

/**
 * A distância de Hamming entre duas impressões: em quantos dos 64 bits elas
 * discordam.
 *
 * Levanta erro se uma delas não for uma impressão bem formada. Devolver um
 * número grande para uma entrada inválida seria pior: passaria por «são
 * diferentes», e uma impressão corrompida na base ficaria invisível para
 * sempre em vez de dar erro no dia em que apareceu.
 */
export function distanciaDeHamming(a: string, b: string): number {
  if (!impressaoValida(a) || !impressaoValida(b)) {
    throw new Error("Impressão mal formada: esperavam-se 16 dígitos hexadecimais minúsculos");
  }
  // Em dois blocos de 32 bits: `parseInt` de 16 dígitos hexadecimais dá um
  // número de vírgula flutuante e os operadores sobre bits truncavam-no.
  const d1 = bitsA1(parseInt(a.slice(0, 8), 16) ^ parseInt(b.slice(0, 8), 16));
  const d2 = bitsA1(parseInt(a.slice(8), 16) ^ parseInt(b.slice(8), 16));
  return d1 + d2;
}

// ─── Comparar duas fotografias ───────────────────────────────────────────────

/**
 * Que enquadramentos é que se alinharam. É um facto sobre a comparação e é
 * útil a quem revê: `inteira-centro` quer dizer que a primeira fotografia
 * inteira coincide com o miolo da segunda — ou seja, que a primeira parece ser
 * um recorte da segunda.
 */
export const ENQUADRAMENTOS = ["inteira-inteira", "inteira-centro", "centro-inteira"] as const;
export type Enquadramento = (typeof ENQUADRAMENTOS)[number];

/** O que se sabe depois de comparar duas impressões. Factos, e só. */
export interface ComparacaoDeImpressoes {
  /** A menor distância de pHash entre os três enquadramentos comparáveis. */
  distanciaPhash: number;
  /** A distância de dHash **no mesmo enquadramento**. Ver abaixo. */
  distanciaDhash: number;
  /** O enquadramento onde a pHash ficou mais curta. */
  enquadramento: Enquadramento;
}

/**
 * Compara duas fotografias pelas suas impressões.
 *
 * São três enquadramentos e não quatro: `centro-centro` não se compara porque
 * não corresponde a transformação nenhuma que alguém faça. Se as duas
 * fotografias forem a mesma, `inteira-inteira` já as apanha; se uma for um
 * recorte da outra, é um dos dois cruzados. Comparar também os dois centros
 * era uma quarta oportunidade de coincidir por acaso a troco de nada.
 *
 * A dHash é lida **no enquadramento que a pHash escolheu**, e não no que lhe
 * fosse mais favorável. Deixá-la escolher o seu daria sempre o menor de seis
 * números, o que faz um valor que parece uma segunda medida e é só o mínimo de
 * mais tentativas.
 */
export function compararImpressoes(
  a: ImpressaoDeFotografia,
  b: ImpressaoDeFotografia
): ComparacaoDeImpressoes {
  const pares: [Enquadramento, string, string, string, string][] = [
    ["inteira-inteira", a.phash, b.phash, a.dhash, b.dhash],
    ["inteira-centro", a.phash, b.phashCentro, a.dhash, b.dhashCentro],
    ["centro-inteira", a.phashCentro, b.phash, a.dhashCentro, b.dhash],
  ];

  let melhor: ComparacaoDeImpressoes | null = null;
  for (const [enquadramento, pa, pb, da, db] of pares) {
    const distanciaPhash = distanciaDeHamming(pa, pb);
    // Em caso de empate fica o primeiro, e a ordem da lista é fixa: a mesma
    // entrada dá sempre a mesma saída, que é a regra do `porTexto` do
    // `lib/documentos/sinais.ts`.
    if (melhor !== null && distanciaPhash >= melhor.distanciaPhash) continue;
    melhor = { distanciaPhash, distanciaDhash: distanciaDeHamming(da, db), enquadramento };
  }
  // A lista tem sempre três pares, portanto `melhor` nunca fica nulo — mas o
  // TypeScript não lê isso de dentro de um ciclo, e um `!` era esconder-lhe a
  // pergunta em vez de a responder.
  if (melhor === null) throw new Error("Comparação sem enquadramentos");
  return melhor;
}

/**
 * A distância é curta o suficiente para o par valer uma olhadela?
 *
 * Não devolve «são a mesma fotografia» e o nome diz porquê. Ver o cabeçalho:
 * há um par de imagens diferentes medido a distância 6.
 */
export function dentroDoLimiar(comparacao: ComparacaoDeImpressoes): boolean {
  return comparacao.distanciaPhash <= LIMIAR_PHASH;
}
