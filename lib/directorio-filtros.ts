/**
 * Estado de pesquisa do directório de coudelarias.
 *
 * Vale aqui a mesma regra do marketplace: **o URL é a única fonte de verdade**.
 * É isso que torna uma pesquisa partilhável, guardável nos favoritos e
 * sobrevivente ao botão «anterior» — três coisas que se esperam de um
 * classificados e que estado de componente sozinho não dá.
 *
 * O outro motivo para este módulo existir é que os números que a página mostra
 * têm de ser **contados**, não escritos à mão. Enquanto a contagem de regiões
 * saía do comprimento de uma lista estática, a página dizia sete quando havia
 * cinco. Contagens vivem aqui, com testes.
 */

import { paginar } from "@/lib/marketplace-filtros";
import { lerListaDeTexto } from "@/lib/coudelaria-ficha";
import {
  ACTIVIDADES,
  actividadesDe,
  contarActividades,
  temActividade,
  type Actividade,
} from "@/lib/especialidades";

/** Coudelarias por página. */
export const POR_PAGINA = 24;

export type Ordenacao = "recomendadas" | "nome" | "antiguidade" | "cavalos";

/** Os ids são estáveis (vão para o URL); o rótulo é traduzido na página. */
export const ORDENACOES: Ordenacao[] = ["recomendadas", "nome", "antiguidade", "cavalos"];

export interface FiltrosDirectorio {
  search: string;
  regiao: string;
  /** Uma das sete actividades de `lib/especialidades`, ou vazio. */
  actividade: string;
  ordenar: Ordenacao;
  pagina: number;
}

export const FILTROS_VAZIOS: FiltrosDirectorio = {
  search: "",
  regiao: "",
  actividade: "",
  ordenar: "recomendadas",
  pagina: 1,
};

/** Vista mínima e só de leitura do `URLSearchParams`, para o módulo ser testável. */
export interface LeitorParams {
  get(chave: string): string | null;
}

function texto(valor: string | null, max = 80): string {
  if (!valor) return "";
  const limpo = valor.trim();
  // "todas" era o que a versão anterior, de pastilhas, usava para «sem preferência».
  if (limpo === "todas" || limpo === "todos" || limpo === "all") return "";
  return limpo.slice(0, max);
}

/**
 * Lê o estado de pesquisa a partir do URL.
 *
 * Tudo é validado: um URL editado à mão ou já velho dá o valor por omissão em
 * vez de um filtro que não encontra nada e não explica porquê.
 */
export function lerFiltros(params: LeitorParams): FiltrosDirectorio {
  const ordenarBruto = params.get("ordenar");
  const ordenar = ORDENACOES.includes(ordenarBruto as Ordenacao)
    ? (ordenarBruto as Ordenacao)
    : "recomendadas";

  const paginaBruta = Number(params.get("pagina"));
  const pagina =
    Number.isFinite(paginaBruta) && paginaBruta >= 1
      ? Math.min(Math.floor(paginaBruta), 10_000)
      : 1;

  return {
    search: texto(params.get("search")),
    regiao: texto(params.get("regiao"), 60),
    actividade: lerActividade(params),
    ordenar,
    pagina,
  };
}

/**
 * A actividade escolhida, validada contra as sete que existem.
 *
 * O parâmetro chamava-se `especialidade` e levava o texto em bruto da base —
 * `?especialidade=Turismo%20Equestre`. Esses links foram partilhados e não
 * podem passar a devolver um ecrã vazio sem explicação, por isso o valor
 * antigo ainda se lê: passa pela taxonomia e aterra na actividade que lhe
 * corresponde («Turismo Equestre» → `turismo`). O que não for reconhecido dá
 * «sem filtro», que é o estado que mostra as vinte e nove.
 */
function lerActividade(params: LeitorParams): string {
  const escolhida = texto(params.get("actividade"), 40).toLowerCase();
  if (ACTIVIDADES.includes(escolhida as Actividade)) return escolhida;

  const legado = texto(params.get("especialidade"), 60);
  return legado ? (actividadesDe([legado])[0] ?? "") : "";
}

/**
 * Volta a escrever o estado no query string.
 *
 * Os valores por omissão ficam de fora, para o URL ser curto e um `/directorio`
 * sem nada se ler como «sem filtros» em vez de uma parede de parâmetros vazios.
 */
export function escreverFiltros(f: FiltrosDirectorio): string {
  const p = new URLSearchParams();
  if (f.search) p.set("search", f.search);
  if (f.regiao) p.set("regiao", f.regiao);
  if (f.actividade) p.set("actividade", f.actividade);
  if (f.ordenar !== "recomendadas") p.set("ordenar", f.ordenar);
  if (f.pagina > 1) p.set("pagina", String(f.pagina));
  return p.toString();
}

/** Verdadeiro quando alguma coisa estreita a lista (a ordenação e a página não). */
export function temFiltrosActivos(f: FiltrosDirectorio): boolean {
  return Boolean(f.search || f.regiao || f.actividade);
}

/** Quantos filtros estão a estreitar a lista. */
export function contarFiltrosActivos(f: FiltrosDirectorio): number {
  let n = 0;
  if (f.search) n++;
  if (f.regiao) n++;
  if (f.actividade) n++;
  return n;
}

/** Os campos que a listagem lê. Estrutural, para quem chama passar o seu próprio tipo. */
export interface CoudelariaListavel {
  slug: string;
  nome: string;
  descricao?: string | null;
  localizacao?: string | null;
  regiao?: string | null;
  ano_fundacao?: number | null;
  num_cavalos?: number | null;
  /* `unknown` e não `string[]`: as duas colunas são `jsonb` e nesta base há
     linhas que guardam uma **string** com JSON lá dentro em vez de um array.
     Escrever `string[]` aqui era o tipo a prometer o que a base não cumpre —
     e um tipo que mente é pior do que nenhum, porque cala a pergunta. */
  especialidades?: unknown;
  linhagens?: unknown;
  destaque?: boolean | null;
  views_count?: number | null;
}

/** Minúsculas sem acentos, para «golega» encontrar «Golegã» e «lezirias» «Lezírias». */
export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Contenção insensível a maiúsculas e a acentos. */
export function contem(texto: string, termo: string): boolean {
  return normalizar(texto).includes(normalizar(termo));
}

/**
 * Lista limpa de uma coluna `jsonb` que pode vir nula — ou vir como uma
 * **string** com JSON lá dentro, que é o que acontece a algumas linhas desta
 * base.
 *
 * A versão anterior devolvia `[]` para essas, e o defeito era calado: a
 * coudelaria continuava na lista mas o texto das especialidades e das
 * linhagens deixava de ser encontrável pela pesquisa, sem erro nenhum. Quem
 * escrevesse «Veiga» não achava a coudelaria da Veiga e não havia nada a que
 * culpar. `lerListaDeTexto` desembrulha a string antes de percorrer.
 */
function lista(v: unknown): string[] {
  return lerListaDeTexto(v);
}

/**
 * Aplica os filtros activos. Acumulam-se: região **e** actividade **e** texto.
 *
 * O filtro de fundo passou a ser a **actividade** e não o texto em bruto da
 * coluna: `temActividade` junta «Toureio» com «Tauromaquia» e «Equitação de
 * Trabalho» com «Working Equitation», que é o mesmo termo em duas línguas.
 *
 * A **pesquisa continua a varrer o texto em bruto**, e é de propósito: quem
 * escreve «enoturismo» quer encontrar quem o oferece, mesmo que essa palavra
 * já não seja uma pastilha. A taxonomia arruma o filtro; não apaga o dado.
 */
export function aplicarFiltros<T extends CoudelariaListavel>(
  coudelarias: T[],
  f: FiltrosDirectorio
): T[] {
  return coudelarias.filter((c) => {
    if (f.regiao && (c.regiao ?? "") !== f.regiao) return false;
    if (f.actividade && !temActividade(c.especialidades, f.actividade)) return false;

    if (f.search) {
      const pesquisavel = [
        c.nome,
        c.localizacao,
        c.regiao,
        ...lista(c.especialidades),
        ...lista(c.linhagens),
      ]
        .filter(Boolean)
        .join(" ");
      if (!contem(pesquisavel, f.search)) return false;
    }

    return true;
  });
}

/**
 * Ordena os resultados.
 *
 * `recomendadas` devolve a ordem com que os dados chegaram — que é a do
 * servidor: destaque, ordem de destaque, visitas, nome. As outras três
 * respondem a perguntas concretas («qual é a mais antiga?», «qual tem mais
 * cavalos?») e por isso mandam quem não tem o dado para o fim, em vez de o
 * tratar como zero e o pôr à frente de toda a gente.
 */
export function ordenar<T extends CoudelariaListavel>(coudelarias: T[], ordem: Ordenacao): T[] {
  if (ordem === "recomendadas") return coudelarias.slice();

  return [...coudelarias].sort((a, b) => {
    switch (ordem) {
      case "nome":
        return a.nome.localeCompare(b.nome, "pt");
      case "antiguidade":
        return (a.ano_fundacao ?? Infinity) - (b.ano_fundacao ?? Infinity);
      case "cavalos":
        return (b.num_cavalos ?? -Infinity) - (a.num_cavalos ?? -Infinity);
      default:
        return 0;
    }
  });
}

export { paginar };

/** Uma faceta de filtro com a contagem que a sustenta. */
export interface Faceta {
  valor: string;
  n: number;
}

/**
 * As regiões que **têm mesmo** coudelarias, da maior para a menor.
 *
 * Sai dos dados e não de uma lista escrita à mão: a lista estática tinha Porto,
 * Minho e Douro, que não davam resultado nenhum, e não tinha Beira Alta, que
 * deixava uma coudelaria fora do alcance do filtro.
 */
export function regioesDisponiveis(coudelarias: CoudelariaListavel[]): Faceta[] {
  return facetas(coudelarias.map((c) => (c.regiao ?? "").trim()));
}

/**
 * As actividades presentes, pela ordem canónica da taxonomia.
 *
 * Isto era `especialidadesDisponiveis` e devolvia o texto em bruto: **58
 * valores para 29 coudelarias, 43 deles a aparecer uma única vez**. Um filtro
 * em que três quartos das escolhas devolvem uma coudelaria não é um filtro, é
 * a lista das vinte e nove escrita de lado — e em telemóvel era uma parede de
 * pastilhas mais alta do que dois ecrãs.
 *
 * A ordem é a canónica e não a da contagem, ao contrário das regiões: sete
 * escolhas fixas que trocam de lugar entre visitas custam mais a reencontrar
 * do que a ordem que já se conhece.
 */
export function actividadesDisponiveis(coudelarias: CoudelariaListavel[]): Faceta[] {
  return contarActividades(coudelarias);
}

function facetas(valores: string[]): Faceta[] {
  const contagem = new Map<string, number>();
  for (const v of valores) {
    if (!v) continue;
    contagem.set(v, (contagem.get(v) ?? 0) + 1);
  }
  return [...contagem.entries()]
    .map(([valor, n]) => ({ valor, n }))
    .sort((a, b) => b.n - a.n || a.valor.localeCompare(b.valor, "pt"));
}

/**
 * Os números do painel do topo — todos contados a partir das linhas que a
 * página recebeu.
 *
 * O painel dizia «1000+ cavalos», escrito à mão, e «7 regiões», que era o
 * comprimento de uma lista estática. Um número inventado numa página pública
 * não é um pormenor de desenho: é dizer ao visitante uma coisa falsa. Cada
 * campo aqui devolve `null` quando os dados não o sustentam, e a página omite
 * o que for nulo em vez de encher o espaço.
 */
export interface EstatisticasDirectorio {
  coudelarias: number;
  regioes: number;
  maisAntiga: number | null;
}

export function estatisticas(coudelarias: CoudelariaListavel[]): EstatisticasDirectorio {
  const anos = coudelarias
    .map((c) => c.ano_fundacao)
    .filter((a): a is number => typeof a === "number" && Number.isFinite(a) && a > 0);

  return {
    coudelarias: coudelarias.length,
    regioes: regioesDisponiveis(coudelarias).length,
    maisAntiga: anos.length ? Math.min(...anos) : null,
  };
}
