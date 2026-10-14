/**
 * ── Um distintivo que está em quase todos não distingue nada ──────────────
 *
 * Vinte das vinte e nove coudelarias têm `destaque` a `true`. O rótulo era
 * `.selo-destaque`, o dourado, e passou a `.selo-forte`, branco, porque
 * sessenta e nove por cento de uma grelha vestida com o acento é o acento a
 * deixar de assinalar seja o que for. Mudar a cor não chegou e não podia
 * chegar: o problema nunca foi o dourado, foi um rótulo que quase toda a
 * gente tem, a ocupar o canto superior esquerdo de cada fotografia — o sítio
 * de mais valor do cartão — para dizer uma coisa que não separa nenhum deles
 * dos outros. O dono do produto viu-o em produção: «está tudo em destaque e
 * não pode estar».
 *
 * A regra passou então a ser sobre a proporção, e não sobre a linha: o
 * distintivo escreve-se enquanto for de uma minoria — até um quarto — e
 * cala-se acima disso. Um quarto e não metade porque o que está em metade de
 * uma grelha não é um destaque, é um estado por omissão com outro nome.
 *
 * ── E a proporção era medida no sítio errado ──────────────────────────────
 *
 * Isto vivia dentro do `MapaClient` e era calculado sobre **o que estava no
 * ecrã** — `visiveis`, o que sobra do funil —, com a justificação escrita de
 * que «filtrar por uma região onde só uma é destaque faz o distintivo voltar,
 * e está certo que volte: ali ele distingue». Medido contra as vinte e nove
 * verdadeiras, essa frase é falsa duas vezes.
 *
 * Primeiro, não há região nenhuma que o faça: a proporção de `destaque` é 69%
 * no total e **54% a 100% em cada uma das cinco regiões**. Enumerado o espaço
 * de filtros que se pode mesmo alcançar — cinco regiões vezes as palavras que
 * a caixa aceita, mais o estado sem filtro, 335 estados não vazios —, o
 * distintivo aparece em **zero**.
 *
 * Segundo, e pior: o conjunto que estava a decidir muda a **cada tecla**, e
 * por isso a decisão pisca. Medido a escrever «veiga» na caixa da lista:
 *
 *   v → 19 cartões, 0 selos    veig  → 2 cartões, 0 selos
 *   ve → 8 cartões, 0 selos    veiga → 2 cartões, 0 selos
 *   vei → 4 cartões, **1 selo**
 *
 * Os únicos estados que acendiam o distintivo eram fragmentos de palavra —
 * `vei`, `san`, `ira`, `a v`. Um distintivo que aparece a meio de uma palavra
 * e desaparece quando se acaba de a escrever não é um sinal: é um erro de
 * desenho a piscar.
 *
 * E a raridade é o argumento, não a atenuante. Enumerados os 4096
 * subconjuntos de uma colecção com a proporção destes dados, **40 deles** —
 * um por cento — davam a resposta contrária à do conjunto todo. Um por cento
 * é pouco de mais para alguém ler «esta distingue-se» e muito para nunca se
 * ver: é a definição de um pisca-pisca.
 *
 * A conta passa a ser sobre **o conjunto todo**, que é onde a pergunta faz
 * sentido — «este rótulo distingue as coudelarias deste site?» é uma pergunta
 * sobre o site e não sobre o que sobrou de uma pesquisa a meio. Com os dados
 * de hoje a resposta é não, e o distintivo cala-se em todos os estados, sempre
 * o mesmo. No dia em que a coluna voltar a marcar poucos, ele volta sozinho e
 * volta em todos — que é o que uma regra sobre os dados deve fazer.
 *
 * É deliberadamente uma decisão de apresentação e não de dados: a coluna
 * `destaque` continua a valer o que vale e a ordenação continua a usá-la.
 */
export function destaqueDistingue(coudelarias: readonly { destaque: boolean }[]): boolean {
  const comDestaque = coudelarias.reduce((n, c) => n + (c.destaque ? 1 : 0), 0);
  return comDestaque > 0 && comDestaque * 4 <= coudelarias.length;
}
