/**
 * Coudelarias guardadas por quem visita.
 *
 * A ficha do anúncio guarda cavalos num contexto React montado na aplicação
 * inteira (`HorseFavoritesContext`). Para as coudelarias não há contexto
 * nenhum, e montar um obrigaria a mexer na casca da aplicação — que não é
 * desta área. Fica então guardado no `localStorage` do browser, com a lógica
 * toda aqui, pura e testada; o componente só lê e escreve.
 */

export interface CoudelariaGuardada {
  slug: string;
  nome: string;
  localizacao?: string;
  /** Milissegundos desde a época, para ordenar da mais recente para trás. */
  guardadaEm: number;
}

export const CHAVE_GUARDADAS = "coudelarias-guardadas";

/** No máximo isto; a lista é uma memória, não um arquivo. */
export const LIMITE = 60;

/**
 * Lê o que está guardado. Aceita lixo sem rebentar: a chave pode ter sido
 * escrita por uma versão anterior, ou à mão pela consola.
 */
export function lerGuardadas(bruto: string | null | undefined): CoudelariaGuardada[] {
  if (!bruto) return [];
  let dados: unknown;
  try {
    dados = JSON.parse(bruto);
  } catch {
    return [];
  }
  if (!Array.isArray(dados)) return [];
  const saida: CoudelariaGuardada[] = [];
  for (const item of dados) {
    if (!item || typeof item !== "object") continue;
    const registo = item as Record<string, unknown>;
    if (typeof registo.slug !== "string" || !registo.slug) continue;
    if (typeof registo.nome !== "string" || !registo.nome) continue;
    if (saida.some((g) => g.slug === registo.slug)) continue;
    saida.push({
      slug: registo.slug,
      nome: registo.nome,
      localizacao: typeof registo.localizacao === "string" ? registo.localizacao : undefined,
      guardadaEm: typeof registo.guardadaEm === "number" ? registo.guardadaEm : 0,
    });
  }
  return saida.slice(0, LIMITE);
}

export function estaGuardada(lista: CoudelariaGuardada[], slug: string): boolean {
  return lista.some((g) => g.slug === slug);
}

/** Guarda ou desguarda; a mais recente fica à cabeça. */
export function alternar(
  lista: CoudelariaGuardada[],
  item: Omit<CoudelariaGuardada, "guardadaEm">,
  agora = Date.now()
): CoudelariaGuardada[] {
  if (estaGuardada(lista, item.slug)) return lista.filter((g) => g.slug !== item.slug);
  return [{ ...item, guardadaEm: agora }, ...lista].slice(0, LIMITE);
}
