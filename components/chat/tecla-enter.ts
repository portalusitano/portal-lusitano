/**
 * A tecla Enter num fio de conversa.
 *
 * ## A lição já paga, e porque se aplica aqui
 *
 * O `components/vender-cavalo/tecla-enter.ts` conta o que custou descobrir que
 * **a regra tem de ser sobre o foco** e não sobre o evento: numa submissão
 * implícita o browser activa o botão por omissão do formulário, e o
 * `submitter` fica igual em quem carregou no botão e em quem carregou em Enter
 * noutro sítio.
 *
 * Aqui a forma é outra — não há `<form>` a submeter, há um `onKeyDown` — mas o
 * erro que se pode cometer é o mesmo: escrever a regra a partir do evento e
 * não de quem tem o foco. Um `keydown` de Enter apanhado no fio inteiro
 * enviaria a mensagem quando alguém carrega em Enter no botão de voltar, ou
 * numa ligação para o anúncio. Por isso o `nomeDoAlvo` entra na conta, e não é
 * cerimónia: é a mesma regra, e é a única coisa que separa «enviar» de
 * «seguir a ligação».
 *
 * ## As outras quatro condições, e a razão de cada uma
 *
 * - **A escrever com um IME** (chinês, japonês, coreano) o Enter confirma o
 *   candidato que está a ser escolhido. Enviar aí é enviar meia palavra. É o
 *   `isComposing` do evento, que o browser põe a `true` durante a composição.
 * - **Shift+Enter** é a linha nova, e é o que toda a gente já espera.
 * - **Alt+Enter** também: é linha nova noutros clientes, e não vale a pena
 *   inventar-lhe um terceiro significado.
 * - **Ctrl+Enter e ⌘+Enter enviam sempre**, incluindo em telemóvel com teclado
 *   ligado: é um gesto explícito, ninguém lá chega sem querer.
 *
 * ## E o Enter simples num ecrã táctil não envia
 *
 * Num teclado de vidro, a tecla de retorno é como se fazem parágrafos, e não
 * há convenção nenhuma que a ligue a «enviar» — quem envia é o botão, que ali
 * está sempre à vista e a 44 pixéis do polegar. Enviar ao primeiro Enter num
 * telemóvel é publicar meio recado, e num fio de conversa isso não se desfaz.
 * Em computador é ao contrário: escrever e carregar em Enter é o gesto de
 * qualquer conversa desde que há conversas escritas.
 */

/**
 * Os nomes de elemento em que Enter guarda o significado próprio, e onde por
 * isso nunca envia — mesmo que o ouvinte apanhe a tecla.
 */
const DONOS_DA_TECLA = new Set(["BUTTON", "A", "SELECT", "SUMMARY"]);

export interface TeclaNoFio {
  /** O `key` do evento. */
  tecla: string;
  /** O `tagName` do elemento com o foco, como o browser o dá. */
  nomeDoAlvo: string;
  shift?: boolean;
  alt?: boolean;
  ctrl?: boolean;
  meta?: boolean;
  /** O `isComposing` do evento — verdadeiro a meio de uma composição de IME. */
  aCompor?: boolean;
  /** Verdadeiro quando o aparelho não tem apontador fino (`pointer: coarse`). */
  tactil?: boolean;
}

/** A tecla que acabou de ser carregada deve enviar a mensagem? */
export function deveEnviarComEnter({
  tecla,
  nomeDoAlvo,
  shift = false,
  alt = false,
  ctrl = false,
  meta = false,
  aCompor = false,
  tactil = false,
}: TeclaNoFio): boolean {
  if (tecla !== "Enter") return false;
  // A meio de uma composição, Enter é de quem está a escrever.
  if (aCompor) return false;
  // A regra do foco, que é a que este ficheiro existe para não deixar cair.
  if (DONOS_DA_TECLA.has(nomeDoAlvo.toUpperCase())) return false;
  // O gesto explícito ganha a tudo o que vem a seguir.
  if (ctrl || meta) return true;
  if (shift || alt) return false;
  return !tactil;
}
