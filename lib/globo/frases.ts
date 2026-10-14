/**
 * Encher uma frase dos dicionários.
 *
 * Não é um motor de moldes, e é de propósito que não é: é um `replace` com
 * nome, para que o sítio onde se troca `{n}` por um número seja **um só**. As
 * cadeias do globo vivem em `locales/*.json` com os marcadores `{n}`,
 * `{place}` e `{name}`; quem as enche é isto.
 *
 * Um marcador que a frase não tenha é ignorado sem barulho — as três línguas
 * não são obrigadas a usar os mesmos, e uma tradução que arrume a frase de
 * outra maneira não pode partir o mapa. Um marcador que a frase tenha e
 * ninguém encha fica visível, que é o que se quer: uma chaveta no ecrã
 * denuncia-se, uma frase silenciosamente truncada não.
 */
export function preencher(molde: string, valores: Record<string, string | number>): string {
  let saida = molde;
  for (const [chave, valor] of Object.entries(valores)) {
    saida = saida.split(`{${chave}}`).join(String(valor));
  }
  return saida;
}
