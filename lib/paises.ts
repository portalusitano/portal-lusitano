import { CODIGOS_DE_PAIS, type CodigoDePais } from "@/lib/paises-codigos";

export type { CodigoDePais };
export { CODIGOS_DE_PAIS };

/**
 * Os países, na língua de quem está a ler.
 *
 * Eram onze, escritos à mão em português, num formulário de um site que vende
 * cavalos para fora — e o décimo segundo chamava-se «Outro», que é o que uma
 * lista curta produz: uma gaveta onde o dado se perde.
 *
 * Agora são 251, e **os nomes não estão escritos em lado nenhum**. Quem os
 * traduz é o `Intl.DisplayNames`, que vem no browser e no Node: dá-se-lhe
 * `PT` e ele devolve «Portugal», «Portugal», «Portugal»; dá-se-lhe `NL` e
 * devolve «Países Baixos», «Netherlands», «Países Bajos». É por isso que o
 * ficheiro de códigos tem 251 linhas e não 753, e é por isso que o dia em que
 * o site ganhar uma quarta língua não tem trabalho nenhum aqui.
 *
 * **O que se guarda é o código, não o nome.** «Alemanha», «Germany» e
 * «Alemania» são o mesmo país; `DE` é o mesmo em qualquer língua e não muda
 * quando alguém corrige uma tradução.
 */

/** Onde o Lusitano está, e por isso onde a maior parte das respostas cai. */
export const PAISES_FREQUENTES: readonly CodigoDePais[] = [
  "PT",
  "ES",
  "BR",
  "FR",
  "DE",
  "GB",
  "NL",
  "BE",
  "IT",
  "US",
] as const;

export interface Pais {
  codigo: CodigoDePais;
  nome: string;
}

/**
 * A lista para uma caixa de escolha: primeiro os frequentes, pela ordem em que
 * estão escritos, e a seguir todos os outros por ordem alfabética **da língua
 * de quem lê** — o `Intl.Collator` sabe que em português o Á vem com o A e que
 * em espanhol a Ñ vem depois do N, coisas que um `sort()` não sabe.
 *
 * Os frequentes não vão repetidos lá abaixo: quem já os viu no topo não os
 * quer encontrar outra vez a meio de duzentos.
 */
export function paisesParaEscolha(lingua: string): { frequentes: Pais[]; restantes: Pais[] } {
  const nomes = new Intl.DisplayNames([lingua], { type: "region" });
  const nomeDe = (codigo: CodigoDePais): Pais => ({
    codigo,
    // `of` devolve o próprio código quando não conhece a região. Não acontece
    // com esta lista, que saiu do mesmo ICU — mas se acontecer, um código é
    // melhor do que um vazio.
    nome: nomes.of(codigo) ?? codigo,
  });

  const frequentes = PAISES_FREQUENTES.map(nomeDe);
  const jaEsta = new Set<string>(PAISES_FREQUENTES);
  const comparar = new Intl.Collator(lingua).compare;
  const restantes = CODIGOS_DE_PAIS.filter((c) => !jaEsta.has(c))
    .map(nomeDe)
    .sort((a, b) => comparar(a.nome, b.nome));

  return { frequentes, restantes };
}

/** O nome de um país, para o mostrar num anúncio já publicado. */
export function nomeDoPais(codigo: string, lingua: string): string {
  if (!codigo) return "";
  try {
    return new Intl.DisplayNames([lingua], { type: "region" }).of(codigo) ?? codigo;
  } catch {
    return codigo;
  }
}
