/**
 * A tecla Enter no último passo não paga.
 *
 * ## O defeito, medido
 *
 * O `<form>` desta página tem um `onSubmit` só, e ele faz duas coisas
 * diferentes conforme o passo: nos passos 1 a 3 avança, no passo 4 chama o
 * `handleSubmit`, que sobe os anexos e abre o Stripe. Isso é de propósito nos
 * três primeiros — é o que faz a tecla Enter avançar como em qualquer
 * formulário, e a razão está escrita no `FormNavigation.tsx`.
 *
 * No quarto não pode ser. **Medido no banco de ensaio, contra a versão
 * anterior a este trabalho: com a caixa dos termos em foco, uma tecla Enter
 * disparava um `POST /api/vender-cavalo/upload`** — ou seja, começava a
 * publicação sem ninguém ter carregado no botão de pagar. Era um risco de
 * gabinete enquanto o passo 4 era só aquela caixa: para lá chegar era preciso
 * ter uma caixa de selecção em foco e carregar em Enter em vez de Espaço.
 *
 * Com os cinco campos da factura neste passo passa a ser o hábito de toda a
 * gente: escreve-se o NIF e carrega-se em Enter, que é o que se faz numa caixa
 * de texto desde que há caixas de texto.
 *
 * ## Porque é uma regra sobre o foco e não sobre o `submitter`
 *
 * A saída óbvia seria olhar para o `submitter` do `SubmitEvent` e só pagar
 * quando ele é o botão de pagar. Não serve: numa submissão implícita — que é
 * o nome que a especificação dá a esta tecla — o browser **activa o botão por
 * omissão do formulário**, e o botão por omissão deste formulário *é* o botão
 * de pagar. O `submitter` seria o mesmo nos dois casos.
 *
 * O que distingue quem carregou no botão de quem carregou em Enter noutro
 * sítio é **o elemento que tem o foco**, e é isso que esta função lê.
 *
 * ## O que continua a passar
 *
 * - Um `<button>` — Enter num botão é carregar nele, e é assim que quem navega
 *   por teclado paga.
 * - Uma `<a>` — Enter numa ligação é segui-la.
 * - Um `<textarea>` — Enter ali é uma linha nova e nunca submeteu nada.
 * - Tudo, nos passos 1 a 3.
 */

/** Os nomes de elemento em que Enter guarda o significado próprio. */
const DONOS_DA_TECLA = new Set(["BUTTON", "A", "TEXTAREA"]);

/**
 * A tecla deve ser travada antes de chegar ao `onSubmit`?
 *
 * @param tecla   o `key` do evento.
 * @param nomeDoAlvo o `tagName` do elemento com o foco, em maiúsculas.
 * @param passo   o passo em que o formulário está.
 * @param ultimoPasso o número do último passo — o que cobra.
 */
export function travarEnter(
  tecla: string,
  nomeDoAlvo: string,
  passo: number,
  ultimoPasso: number
): boolean {
  if (tecla !== "Enter") return false;
  if (passo !== ultimoPasso) return false;
  return !DONOS_DA_TECLA.has(nomeDoAlvo.toUpperCase());
}
