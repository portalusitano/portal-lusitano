/**
 * Os números do cavalo, e de onde vêm.
 *
 * ## Porque é que este ficheiro existe separado
 *
 * Um limiar inventado é uma recusa injusta com ar de rigor. Escrever `340` no
 * meio de uma função é fácil; explicar dali a três meses porque é que são 340 e
 * não 300 já não é, e quem vier a seguir só tem duas hipóteses — acreditar ou
 * mudar às cegas. Por isso **todas as constantes biológicas deste subsistema
 * vivem aqui, e cada uma leva a fonte por cima**. Se um número não tiver fonte,
 * a regra que dependia dele não se escreve.
 *
 * Nenhum destes números recusa nada por si. Servem para separar o que é
 * **impossível** — as duas afirmações não podem ser ambas verdadeiras — do que
 * é **improvável**, que é raro e acontece. É a distinção inteira do módulo, e é
 * por isso que os limites estão todos do lado generoso: um cavalo verdadeiro
 * apanhado por um limite apertado é o erro caro deste sistema.
 *
 * ## Fontes
 *
 * - **Gestação.** Merck Veterinary Manual, *Management of Reproduction:
 *   Horses*: a gestação da égua dura em média cerca de 340 dias, com o
 *   intervalo normal entre 320 e 362 dias; potros nascidos antes dos 300 dias
 *   raramente sobrevivem.
 * - **Cio do potro.** Merck, idem: a primeira ovulação depois do parto («foal
 *   heat») dá-se entre o 5.º e o 12.º dia.
 * - **Puberdade.** Merck, *Breeding Soundness Examination*: a puberdade chega
 *   entre os 12 e os 15 meses nos dois sexos.
 * - **Longevidade.** O cavalo doméstico vive tipicamente 25 a 30 anos; o mais
 *   velho de que há registo verificado, «Old Billy» (1760–1822), chegou aos 62.
 * - **Crescimento.** Hintz, Hintz & Van Vleck (1979), *Growth rate of
 *   Thoroughbreds*, J. Anim. Sci. 48:480, e as curvas do NRC, *Nutrient
 *   Requirements of Horses*: a altura ao garrote em percentagem da altura
 *   adulta, por idade.
 * - **Altura do Lusitano.** O padrão da APSL põe o Lusitano adulto à volta de
 *   1,55–1,65 m ao garrote. O valor que aqui se usa como tecto — 180 cm — não é
 *   o padrão: é um limite deliberadamente muito acima dele, para que a regra do
 *   crescimento nunca dispare sobre um exemplar genuinamente grande.
 */

// ─── Reprodução ──────────────────────────────────────────────────────────────

/**
 * O intervalo mais curto entre dois partos da mesma égua, em dias.
 *
 * A conta é a soma de dois números com fonte, e não um palpite arredondado: a
 * gestação normal mais curta (320 dias) mais a primeira ovulação depois do
 * parto (5 dias). Uma égua que pariu hoje não pode voltar a parir antes disso.
 *
 * **Continua a ser um improvável e não um impossível**, e a razão é a
 * transferência de embriões: o livro de origem regista a mãe **genética**, e o
 * embrião pode ser gestado por uma receptora. Uma égua doadora pode assim ter
 * dois filhos registados com poucos meses de diferença sem que nada disto
 * tenha sido violado. É raro, é caro, e existe — que é a definição de
 * improvável.
 */
export const DIAS_MINIMOS_ENTRE_PARTOS = 320 + 5;

/**
 * Dois potros nascidos no mesmo dia, ou em dias seguidos, são gémeos.
 *
 * A gemelaridade na égua é rara e quase sempre reduzida a um só embrião, mas
 * acontece e é registada. Por isso um intervalo até este valor **não** produz
 * achado nenhum: seria levantar a mão sobre o caso normal de um par de gémeos.
 */
export const DIAS_DE_GEMEOS = 1;

/**
 * A idade mínima, em meses, a que um cavalo pode ser pai ou mãe de um potro
 * nascido vivo.
 *
 * Puberdade aos 12 meses — o extremo baixo do intervalo com fonte — mais 340
 * dias de gestação dão 23 meses. Ficam 22, um mês abaixo, de propósito: o mês
 * a mais é o que garante que uma data de nascimento arredondada ao ano, coisa
 * corrente nos cavalos mais velhos, nunca chega a acusar ninguém.
 */
export const MESES_IDADE_MINIMA_DE_PROGENITOR = 22;

/**
 * A idade a partir da qual se cobre um cavalo na prática, em meses.
 *
 * Éguas e garanhões entram normalmente à reprodução aos três anos. Entre os 22
 * e os 36 meses o cruzamento é possível — potras cobertas ao ano existem — mas
 * é bastante fora do corrente para valer a pena perguntar.
 */
export const MESES_IDADE_HABITUAL_DE_PROGENITOR = 36;

// ─── Longevidade ─────────────────────────────────────────────────────────────

/**
 * A idade a partir da qual um cavalo vivo é invulgar, em anos.
 *
 * **Não há aqui um limite de impossibilidade, e é de propósito.** O cavalo
 * doméstico vive 25 a 30 anos, mas o recorde verificado são 62, e um cavalo de
 * 32 existe. Recusar um anúncio por causa da idade seria recusar precisamente
 * os cavalos cujo dono mais precisa de os colocar. Acima disto pergunta-se, e
 * mais nada.
 */
export const ANOS_LONGEVIDADE_INVULGAR = 30;

// ─── Crescimento ─────────────────────────────────────────────────────────────

/**
 * A altura ao garrote em fracção da altura adulta, por idade em meses.
 *
 * Um potro nasce com cerca de 61% da altura que vai ter e chega aos 91% ao fim
 * do primeiro ano — o cavalo cresce quase todo em altura muito antes de estar
 * feito. É por isso que uma altura de adulto declarada num animal de seis meses
 * não é uma questão de opinião: implica uma altura adulta que não existe.
 */
export const CRESCIMENTO_EM_ALTURA: ReadonlyArray<readonly [meses: number, fraccao: number]> = [
  [0, 0.61],
  [3, 0.76],
  [6, 0.84],
  [12, 0.91],
  [18, 0.95],
  [24, 0.96],
  [36, 0.99],
  [48, 1],
];

/** Passados quatro anos a curva está fechada e não há nada a inferir. */
export const MESES_CRESCIMENTO_COMPLETO = 48;

/**
 * O tecto acima do qual uma altura adulta implícita deixa de ser credível.
 *
 * **Não é o padrão da raça.** O padrão põe o Lusitano entre 1,55 e 1,65 m, e um
 * limite nesse valor faria a regra disparar sobre exemplares grandes e sobre
 * anúncios de outra raça que passaram pelo mesmo formulário. 180 cm está muito
 * acima de qualquer Lusitano registado e ainda abaixo de um cavalo de tiro: é o
 * limite que só apanha o caso em que a conta do crescimento não fecha de longe.
 */
export const ALTURA_ADULTA_MAXIMA_CREDIVEL = 180;

/**
 * A fracção da altura adulta que um cavalo desta idade já tem.
 *
 * Interpola entre os pontos da tabela em vez de escolher o mais próximo: aos
 * nove meses, o degrau entre os 84% dos seis e os 91% dos doze seria uma
 * descontinuidade que faria a regra disparar de um lado e não do outro sem que
 * nada tivesse mudado no cavalo.
 */
export function fraccaoDaAlturaAdulta(mesesDeIdade: number): number {
  if (!Number.isFinite(mesesDeIdade) || mesesDeIdade <= 0) return CRESCIMENTO_EM_ALTURA[0][1];
  if (mesesDeIdade >= MESES_CRESCIMENTO_COMPLETO) return 1;

  for (let i = 1; i < CRESCIMENTO_EM_ALTURA.length; i++) {
    const [mesesAntes, fraccaoAntes] = CRESCIMENTO_EM_ALTURA[i - 1];
    const [mesesDepois, fraccaoDepois] = CRESCIMENTO_EM_ALTURA[i];
    if (mesesDeIdade > mesesDepois) continue;
    const passo = (mesesDeIdade - mesesAntes) / (mesesDepois - mesesAntes);
    return fraccaoAntes + passo * (fraccaoDepois - fraccaoAntes);
  }
  return 1;
}
