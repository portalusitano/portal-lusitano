/**
 * "Vistos recentemente" — histórico local dos anúncios que o visitante abriu.
 *
 * Vive apenas no browser (localStorage): num classificados a maioria das
 * visitas não tem sessão iniciada, e este histórico não vale o custo de
 * privacidade de o guardar no servidor.
 */

export const MAX_VISTOS = 12;

const CHAVE = "cavalos_vistos_recentemente";

export interface CavaloVisto {
  id: string;
  nome: string;
  preco?: number | null;
  imagem?: string | null;
  localizacao?: string | null;
  /** Epoch em milissegundos da última visita. */
  visto_em: number;
}

function registoValido(valor: unknown): valor is CavaloVisto {
  if (typeof valor !== "object" || valor === null) return false;
  const r = valor as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    r.id.length > 0 &&
    typeof r.nome === "string" &&
    typeof r.visto_em === "number" &&
    Number.isFinite(r.visto_em)
  );
}

/** Descarta entradas corrompidas e ordena da mais recente para a mais antiga. */
export function normalizarVistos(valor: unknown): CavaloVisto[] {
  if (!Array.isArray(valor)) return [];
  const vistos = valor.filter(registoValido);
  const porId = new Map<string, CavaloVisto>();
  for (const visto of vistos) {
    const anterior = porId.get(visto.id);
    if (!anterior || anterior.visto_em < visto.visto_em) porId.set(visto.id, visto);
  }
  return [...porId.values()].sort((a, b) => b.visto_em - a.visto_em).slice(0, MAX_VISTOS);
}

/**
 * Coloca o anúncio à cabeça da lista, substituindo a visita anterior ao mesmo
 * anúncio em vez de a duplicar.
 */
export function registarVisto(
  actuais: CavaloVisto[],
  cavalo: Omit<CavaloVisto, "visto_em">,
  agora: number = Date.now()
): CavaloVisto[] {
  const resto = actuais.filter((v) => v.id !== cavalo.id);
  return [{ ...cavalo, visto_em: agora }, ...resto].slice(0, MAX_VISTOS);
}

/** Remove o anúncio que está a ser visto — mostrá-lo a si próprio não ajuda. */
export function excepto(vistos: CavaloVisto[], id: string | undefined): CavaloVisto[] {
  if (!id) return vistos;
  return vistos.filter((v) => v.id !== id);
}

export function lerVistos(): CavaloVisto[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return [];
    return normalizarVistos(JSON.parse(bruto));
  } catch {
    return [];
  }
}

export function guardarVistos(vistos: CavaloVisto[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(vistos.slice(0, MAX_VISTOS)));
  } catch {
    // localStorage cheio ou bloqueado — o histórico é acessório, segue sem ele.
  }
}

export function limparVistos(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    // idem
  }
}
