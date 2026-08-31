/**
 * O funil da página `/mapa`.
 *
 * A página tinha duas listas para a mesma coisa e cada uma contava por sua
 * conta: o painel de regiões dizia «Alentejo 13» enquanto a pesquisa já tinha
 * esvaziado o globo. Duas contagens da mesma coisa que se contradizem são
 * pior do que uma contagem só, ainda que grosseira.
 *
 * Aqui há **um** funil. A pesquisa e a região são dois botões do mesmo funil,
 * e o que sai dele é ao mesmo tempo o que o globo acende, o que a lista mostra
 * e o que o contador diz. As contagens por região são calculadas *depois* da
 * pesquisa, para que o painel nunca prometa treze quando há zero.
 */

/** O que o funil precisa de saber de uma coudelaria. Nada mais. */
export interface CoudelariaFiltravel {
  nome: string;
  localizacao: string;
  regiao: string;
  num_cavalos?: number;
}

export interface Filtros {
  /** Texto escrito na caixa de pesquisa. */
  procura?: string;
  /** Região escolhida no painel, ou `null` para todas. */
  regiao?: string | null;
}

/**
 * Tira acentos e passa a minúsculas.
 *
 * Quem escreve «regiao» à pressa não devia ficar sem a Beira Alta, e quem
 * escreve «Golega» sem til não devia ficar sem a Golegã. É uma normalização,
 * não uma pesquisa difusa: continua a ser correspondência de subcadeia.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Uma coudelaria corresponde ao termo pelo nome, pela terra ou pela região. */
function correspondeAoTermo(c: CoudelariaFiltravel, termo: string): boolean {
  return (
    normalizar(c.nome).includes(termo) ||
    normalizar(c.localizacao).includes(termo) ||
    normalizar(c.regiao).includes(termo)
  );
}

/**
 * Aplica só a pesquisa. Fica à parte de `filtrar` porque as contagens por
 * região precisam do universo depois do texto mas antes da região — senão
 * escolher o Alentejo poria todas as outras regiões a zero.
 */
export function filtrarPorTexto<T extends CoudelariaFiltravel>(
  coudelarias: readonly T[],
  procura?: string
): T[] {
  const termo = normalizar(procura ?? "");
  if (!termo) return [...coudelarias];
  return coudelarias.filter((c) => correspondeAoTermo(c, termo));
}

/** O funil completo: texto e depois região. */
export function filtrar<T extends CoudelariaFiltravel>(
  coudelarias: readonly T[],
  { procura, regiao }: Filtros = {}
): T[] {
  const porTexto = filtrarPorTexto(coudelarias, procura);
  if (!regiao) return porTexto;
  return porTexto.filter((c) => c.regiao === regiao);
}

export interface ContagemRegiao {
  regiao: string;
  /** Quantas há nesta região dentro da pesquisa em curso. */
  total: number;
}

/**
 * Regiões com a contagem que vale *agora*, da maior para a menor.
 *
 * `universo` é a lista toda: é dela que sai o conjunto de regiões, para que
 * uma região não desapareça do painel só porque a pesquisa a esvaziou — quem
 * procurou quer ver que ela existe e está a zero, não vê-la sumir. `visiveis`
 * é a lista depois da pesquisa, e é dela que sai o número.
 */
export function contarPorRegiao(
  universo: readonly CoudelariaFiltravel[],
  visiveis: readonly CoudelariaFiltravel[] = universo
): ContagemRegiao[] {
  const contas = new Map<string, number>();
  for (const c of universo) {
    if (!c.regiao) continue;
    if (!contas.has(c.regiao)) contas.set(c.regiao, 0);
  }
  for (const c of visiveis) {
    if (!c.regiao) continue;
    contas.set(c.regiao, (contas.get(c.regiao) ?? 0) + 1);
  }
  return (
    [...contas.entries()]
      .map(([regiao, total]) => ({ regiao, total }))
      // Maior primeiro; em empate, alfabética, para a ordem não dançar entre
      // pesquisas. `localeCompare` com "pt" põe a Beira Alta antes do Centro.
      .sort((a, b) => b.total - a.total || a.regiao.localeCompare(b.regiao, "pt"))
  );
}

/**
 * A soma dos cavalos declarados pelas coudelarias.
 *
 * O número que a página mostrava debaixo de «Cavalos» era
 * `coudelarias.filter(c => c.destaque).length` — a conta das coudelarias em
 * destaque, vinte. Dizia «20 Cavalos» num sítio onde as vinte e nove
 * coudelarias declaram 2746. Um número público que não é o que a etiqueta
 * promete é um defeito, não um pormenor: é isto que o corrige.
 */
export function somarCavalos(coudelarias: readonly CoudelariaFiltravel[]): number {
  return coudelarias.reduce((soma, c) => soma + (c.num_cavalos ?? 0), 0);
}

/** Quantas regiões distintas estão realmente representadas. */
export function contarRegioes(coudelarias: readonly CoudelariaFiltravel[]): number {
  return new Set(coudelarias.map((c) => c.regiao).filter(Boolean)).size;
}

/**
 * Número com separador de milhares na língua da página.
 *
 * 2746 escrito «2746» lê-se como um código; escrito «2 746» lê-se como uma
 * quantidade. Em pt-PT e es-ES o separador é o espaço estreito, em en-US a
 * vírgula — é por isso que se pede ao `Intl` em vez de se meter um ponto.
 */
export function formatarNumero(valor: number, lingua: string = "pt"): string {
  const etiqueta = lingua === "en" ? "en-US" : lingua === "es" ? "es-ES" : "pt-PT";
  return new Intl.NumberFormat(etiqueta).format(valor);
}

/**
 * Parte o título do herói em três, para acender o meio.
 *
 * O componente fazia `t.mapa.title.split("Portugal")` — a palavra estava
 * escrita à mão dentro do JSX. Funcionava por acaso: as três traduções tinham
 * «Portugal» lá dentro. Numa quarta língua, ou numa reescrita do título, o
 * `split` devolvia um só pedaço e o segundo saía `undefined` — e o realce
 * desaparecia sem ninguém dar por isso. Aqui quem manda é o dicionário: a
 * palavra a acender é uma chave (`title_highlight`), e se ela não estiver no
 * título o título sai inteiro e sem realce, em vez de sair partido.
 */
export function partirTitulo(
  titulo: string,
  destaque: string
): { antes: string; meio: string; depois: string } {
  const i = destaque ? titulo.indexOf(destaque) : -1;
  if (i === -1) return { antes: titulo, meio: "", depois: "" };
  return {
    antes: titulo.slice(0, i),
    meio: destaque,
    depois: titulo.slice(i + destaque.length),
  };
}
