/**
 * Search state for the marketplace listing page.
 *
 * The URL is the single source of truth. That is what makes a filtered search
 * shareable, bookmarkable, and survivable across the back button — the three
 * things a classifieds site is expected to do and that component state alone
 * cannot deliver.
 */

/** Listings per page. */
export const POR_PAGINA = 24;

export type Ordenacao = "recentes" | "preco_asc" | "preco_desc" | "idade_asc";

export const ORDENACOES: { id: Ordenacao; label: string }[] = [
  { id: "recentes", label: "Mais recentes" },
  { id: "preco_asc", label: "Preço: mais baixo" },
  { id: "preco_desc", label: "Preço: mais alto" },
  { id: "idade_asc", label: "Mais novos" },
];

export interface FiltrosMarketplace {
  search: string;
  sexo: string;
  regiao: string;
  disciplina: string;
  nivel: string;
  precoMin: number | null;
  precoMax: number | null;
  idadeMin: number | null;
  idadeMax: number | null;
  ordenar: Ordenacao;
  pagina: number;
}

export const FILTROS_VAZIOS: FiltrosMarketplace = {
  search: "",
  sexo: "",
  regiao: "",
  disciplina: "",
  nivel: "",
  precoMin: null,
  precoMax: null,
  idadeMin: null,
  idadeMax: null,
  ordenar: "recentes",
  pagina: 1,
};

/** Minimal read-only view of URLSearchParams, so this module stays testable. */
export interface LeitorParams {
  get(chave: string): string | null;
}

function num(valor: string | null, min: number, max: number): number | null {
  if (valor === null || valor.trim() === "") return null;
  const n = Number(valor);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

function texto(valor: string | null, max = 100): string {
  if (!valor) return "";
  const limpo = valor.trim();
  // "todos"/"todas" is what the old select-based UI used for "no preference".
  if (limpo === "todos" || limpo === "todas" || limpo === "all") return "";
  return limpo.slice(0, max);
}

/**
 * Reads the search state out of the URL.
 *
 * Every value is validated: a hand-edited or stale URL yields the default rather
 * than a filter that silently matches nothing.
 */
export function lerFiltros(params: LeitorParams): FiltrosMarketplace {
  const ordenarBruto = params.get("ordenar");
  const ordenar = ORDENACOES.some((o) => o.id === ordenarBruto)
    ? (ordenarBruto as Ordenacao)
    : "recentes";

  let precoMin = num(params.get("precoMin"), 0, 100_000_000);
  let precoMax = num(params.get("precoMax"), 0, 100_000_000);
  // An inverted range would match nothing at all; swapping is what the person
  // meant, and is kinder than showing an empty page.
  if (precoMin !== null && precoMax !== null && precoMin > precoMax) {
    [precoMin, precoMax] = [precoMax, precoMin];
  }

  let idadeMin = num(params.get("idadeMin"), 0, 60);
  let idadeMax = num(params.get("idadeMax"), 0, 60);
  if (idadeMin !== null && idadeMax !== null && idadeMin > idadeMax) {
    [idadeMin, idadeMax] = [idadeMax, idadeMin];
  }

  return {
    search: texto(params.get("search")),
    sexo: texto(params.get("sexo"), 20).toLowerCase(),
    regiao: texto(params.get("regiao")),
    disciplina: texto(params.get("disciplina"), 60),
    nivel: texto(params.get("nivel"), 60),
    precoMin,
    precoMax,
    idadeMin,
    idadeMax,
    ordenar,
    pagina: Math.max(1, num(params.get("pagina"), 1, 10_000) ?? 1),
  };
}

/**
 * Serialises the search state back into a query string.
 *
 * Defaults are omitted so the URL stays short and a plain `/comprar` is
 * recognisably "no filters" rather than a wall of empty parameters.
 */
export function escreverFiltros(f: FiltrosMarketplace): string {
  const p = new URLSearchParams();

  if (f.search) p.set("search", f.search);
  if (f.sexo) p.set("sexo", f.sexo);
  if (f.regiao) p.set("regiao", f.regiao);
  if (f.disciplina) p.set("disciplina", f.disciplina);
  if (f.nivel) p.set("nivel", f.nivel);
  if (f.precoMin !== null) p.set("precoMin", String(f.precoMin));
  if (f.precoMax !== null) p.set("precoMax", String(f.precoMax));
  if (f.idadeMin !== null) p.set("idadeMin", String(f.idadeMin));
  if (f.idadeMax !== null) p.set("idadeMax", String(f.idadeMax));
  if (f.ordenar !== "recentes") p.set("ordenar", f.ordenar);
  if (f.pagina > 1) p.set("pagina", String(f.pagina));

  return p.toString();
}

/** True when anything narrows the result set (ordering and page do not). */
export function temFiltrosAtivos(f: FiltrosMarketplace): boolean {
  return Boolean(
    f.search ||
    f.sexo ||
    f.regiao ||
    f.disciplina ||
    f.nivel ||
    f.precoMin !== null ||
    f.precoMax !== null ||
    f.idadeMin !== null ||
    f.idadeMax !== null
  );
}

/** How many filters are narrowing the search, for the mobile filter badge. */
export function contarFiltrosAtivos(f: FiltrosMarketplace): number {
  let n = 0;
  if (f.search) n++;
  if (f.sexo) n++;
  if (f.regiao) n++;
  if (f.disciplina) n++;
  if (f.nivel) n++;
  if (f.precoMin !== null || f.precoMax !== null) n++;
  if (f.idadeMin !== null || f.idadeMax !== null) n++;
  return n;
}

/** The listing fields the filters read. Structural, so callers can pass their own row type. */
export interface AnuncioFiltravel {
  nome_cavalo?: string | null;
  localizacao?: string | null;
  sexo?: string | null;
  nivel?: string | null;
  idade?: number | null;
  preco?: number | null;
  disciplinas?: string[] | string | null;
  destaque?: boolean | null;
  created_at?: string | null;
}

/** Normalises the disciplines column, which is an array in some rows and a string in others. */
export function disciplinasDe(a: AnuncioFiltravel): string[] {
  if (!a.disciplinas) return [];
  if (Array.isArray(a.disciplinas)) return a.disciplinas;
  if (typeof a.disciplinas === "string") {
    return a.disciplinas
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
  }
  return [];
}

/** Case- and accent-insensitive containment, so "golega" finds "Golegã". */
function contem(texto: string, termo: string): boolean {
  const limpar = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  return limpar(texto).includes(limpar(termo));
}

/** Applies every active filter. Inactive filters are skipped, never guessed at. */
export function aplicarFiltros<T extends AnuncioFiltravel>(
  anuncios: T[],
  f: FiltrosMarketplace
): T[] {
  return anuncios.filter((a) => {
    if (f.search) {
      const pesquisavel = [a.nome_cavalo, a.localizacao, a.nivel, ...disciplinasDe(a)]
        .filter(Boolean)
        .join(" ");
      if (!contem(pesquisavel, f.search)) return false;
    }

    if (f.sexo && (a.sexo || "").toLowerCase().trim() !== f.sexo) return false;
    if (f.regiao && a.localizacao !== f.regiao) return false;
    if (f.nivel && a.nivel !== f.nivel) return false;
    if (f.disciplina && !disciplinasDe(a).includes(f.disciplina)) return false;

    // A listing with no price is "sob consulta": it cannot satisfy a price
    // filter, so a buyer who set one should not be shown it.
    if (f.precoMin !== null || f.precoMax !== null) {
      if (typeof a.preco !== "number") return false;
      if (f.precoMin !== null && a.preco < f.precoMin) return false;
      if (f.precoMax !== null && a.preco > f.precoMax) return false;
    }

    if (f.idadeMin !== null || f.idadeMax !== null) {
      if (typeof a.idade !== "number") return false;
      if (f.idadeMin !== null && a.idade < f.idadeMin) return false;
      if (f.idadeMax !== null && a.idade > f.idadeMax) return false;
    }

    return true;
  });
}

/**
 * Orders the results, featured listings first.
 *
 * Featured is what the seller paid for, so it outranks the chosen ordering —
 * but only among results that already matched, never by injecting listings the
 * buyer filtered out.
 */
export function ordenar<T extends AnuncioFiltravel>(anuncios: T[], ordem: Ordenacao): T[] {
  return [...anuncios].sort((a, b) => {
    if (a.destaque && !b.destaque) return -1;
    if (!a.destaque && b.destaque) return 1;

    switch (ordem) {
      case "preco_asc":
        return (a.preco ?? Infinity) - (b.preco ?? Infinity);
      case "preco_desc":
        return (b.preco ?? -Infinity) - (a.preco ?? -Infinity);
      case "idade_asc":
        return (a.idade ?? Infinity) - (b.idade ?? Infinity);
      case "recentes":
      default: {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      }
    }
  });
}

/** Slices one page out of the results and reports how many pages there are. */
export function paginar<T>(
  itens: T[],
  pagina: number,
  porPagina: number = POR_PAGINA
): { itens: T[]; pagina: number; totalPaginas: number; total: number } {
  const total = itens.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  // Clamped so a stale ?pagina=9 after narrowing the filters shows the last page
  // instead of an empty one.
  const atual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (atual - 1) * porPagina;

  return { itens: itens.slice(inicio, inicio + porPagina), pagina: atual, totalPaginas, total };
}
