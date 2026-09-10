/**
 * Saved marketplace searches and the email alerts they drive.
 *
 * The same criteria object is used in three places — the create form, the
 * preview count, and the cron that sends the emails — so the matching rules live
 * here rather than being written three times with three sets of bugs.
 */

import { sanitizeSearchInput } from "@/lib/sanitize";

/** How many saved searches one account may keep. */
export const MAX_ALERTAS_POR_UTILIZADOR = 10;

export const FREQUENCIAS = [
  { id: "diaria", label: "Diário", horas: 24 },
  { id: "semanal", label: "Semanal", horas: 24 * 7 },
] as const;

export type Frequencia = (typeof FREQUENCIAS)[number]["id"];

export interface CriteriosAlerta {
  sexo: string | null;
  regiao: string | null;
  precoMin: number | null;
  precoMax: number | null;
  idadeMin: number | null;
  idadeMax: number | null;
  disciplina: string | null;
  nivel: string | null;
  termo: string | null;
}

export interface Alerta extends CriteriosAlerta {
  id: string;
  nome: string;
  frequencia: Frequencia;
  ativo: boolean;
  ultimoEnvioAt: string | null;
  createdAt: string;
}

const CRITERIOS_VAZIOS: CriteriosAlerta = {
  sexo: null,
  regiao: null,
  precoMin: null,
  precoMax: null,
  idadeMin: null,
  idadeMax: null,
  disciplina: null,
  nivel: null,
  termo: null,
};

function texto(valor: unknown, max = 100): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  // "todos"/"todas" are what the filter UI sends for "no preference".
  if (!limpo || limpo === "todos" || limpo === "todas" || limpo === "Todas") return null;
  return limpo.slice(0, max);
}

function numero(valor: unknown, min: number, max: number): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

/**
 * Normalises criteria coming from a request body.
 *
 * Returns the criteria plus any problems worth telling the user about. Invalid
 * individual values are dropped rather than rejected — a stray filter should not
 * stop someone saving a search — but an inverted range is reported, because it
 * would silently match nothing.
 */
export function normalizarCriterios(body: Record<string, unknown>): {
  criterios: CriteriosAlerta;
  erros: string[];
} {
  const erros: string[] = [];

  const criterios: CriteriosAlerta = {
    ...CRITERIOS_VAZIOS,
    sexo: texto(body.sexo, 20),
    regiao: texto(body.regiao),
    precoMin: numero(body.precoMin, 0, 100_000_000),
    precoMax: numero(body.precoMax, 0, 100_000_000),
    idadeMin: numero(body.idadeMin, 0, 60),
    idadeMax: numero(body.idadeMax, 0, 60),
    disciplina: texto(body.disciplina, 60),
    nivel: texto(body.nivel, 60),
    // Sanitised because it ends up in a PostgREST `or` filter string.
    termo: body.termo ? sanitizeSearchInput(String(body.termo)) || null : null,
  };

  if (
    criterios.precoMin !== null &&
    criterios.precoMax !== null &&
    criterios.precoMin > criterios.precoMax
  ) {
    erros.push("O preço mínimo não pode ser superior ao máximo");
  }

  if (
    criterios.idadeMin !== null &&
    criterios.idadeMax !== null &&
    criterios.idadeMin > criterios.idadeMax
  ) {
    erros.push("A idade mínima não pode ser superior à máxima");
  }

  return { criterios, erros };
}

/**
 * Minimal shape of the Supabase query builder this module needs.
 *
 * Deliberately structural and generic only over the awaited result: making the
 * helper generic over Supabase's own builder type makes the compiler give up
 * with "type instantiation is excessively deep", because those types recurse
 * through every column of every table.
 */
export interface CriteriosQuery<R> extends PromiseLike<R> {
  eq(column: string, value: unknown): CriteriosQuery<R>;
  gte(column: string, value: unknown): CriteriosQuery<R>;
  lte(column: string, value: unknown): CriteriosQuery<R>;
  contains(column: string, value: unknown): CriteriosQuery<R>;
  or(filter: string): CriteriosQuery<R>;
}

/**
 * Applies saved criteria to a `cavalos_venda` query.
 *
 * Null criteria are skipped, so an alert with no criteria matches every new
 * listing — deliberate, and reasonable in a market this small.
 */
export function aplicarCriterios<R>(
  query: CriteriosQuery<R>,
  c: CriteriosAlerta
): CriteriosQuery<R> {
  let q = query;

  if (c.sexo) q = q.eq("sexo", c.sexo);
  if (c.regiao) q = q.eq("regiao", c.regiao);
  if (c.precoMin !== null) q = q.gte("preco", c.precoMin);
  if (c.precoMax !== null) q = q.lte("preco", c.precoMax);
  if (c.idadeMin !== null) q = q.gte("idade", c.idadeMin);
  if (c.idadeMax !== null) q = q.lte("idade", c.idadeMax);
  if (c.nivel) q = q.eq("nivel_treino", c.nivel);
  if (c.disciplina) q = q.contains("disciplinas", [c.disciplina]);
  if (c.termo) q = q.or(`nome.ilike.%${c.termo}%,descricao.ilike.%${c.termo}%`);

  return q;
}

/**
 * One-line description of a saved search, for the alert list and the email.
 *
 * Without this the user sees a row of raw filter values and cannot tell two
 * saved searches apart.
 */
export function descreverAlerta(c: CriteriosAlerta): string {
  const partes: string[] = [];

  if (c.sexo) partes.push(c.sexo);
  if (c.nivel) partes.push(c.nivel);
  if (c.disciplina) partes.push(c.disciplina);
  if (c.regiao) partes.push(`em ${c.regiao}`);

  if (c.precoMin !== null && c.precoMax !== null) {
    partes.push(`entre ${c.precoMin}€ e ${c.precoMax}€`);
  } else if (c.precoMax !== null) {
    partes.push(`até ${c.precoMax}€`);
  } else if (c.precoMin !== null) {
    partes.push(`a partir de ${c.precoMin}€`);
  }

  if (c.idadeMin !== null && c.idadeMax !== null) {
    partes.push(`${c.idadeMin}-${c.idadeMax} anos`);
  } else if (c.idadeMax !== null) {
    partes.push(`até ${c.idadeMax} anos`);
  } else if (c.idadeMin !== null) {
    partes.push(`a partir de ${c.idadeMin} anos`);
  }

  if (c.termo) partes.push(`"${c.termo}"`);

  return partes.length > 0 ? partes.join(", ") : "Todos os cavalos novos";
}

/** Whether an alert is due, given its frequency and last send. */
export function alertaEmAtraso(
  frequencia: string,
  ultimoEnvioAt: string | null,
  agora: Date = new Date()
): boolean {
  const definicao = FREQUENCIAS.find((f) => f.id === frequencia) || FREQUENCIAS[0];

  // Never sent: due as soon as there is anything to report.
  if (!ultimoEnvioAt) return true;

  const ultimo = new Date(ultimoEnvioAt).getTime();
  if (Number.isNaN(ultimo)) return true;

  return agora.getTime() - ultimo >= definicao.horas * 3_600_000;
}

/**
 * Coerces a stored numeric column, which Supabase returns as a string for
 * NUMERIC types.
 *
 * Absent and unparseable values both become null rather than NaN: a NaN reaches
 * `descreverAlerta` and renders as "entre NaN€ e NaN€" in the user's alert list.
 */
function numeroGuardado(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** Converts a stored row into the shape the UI and the cron consume. */
export function normalizarAlerta(row: Record<string, unknown>): Alerta {
  const criterios: CriteriosAlerta = {
    sexo: (row.sexo as string) ?? null,
    regiao: (row.regiao as string) ?? null,
    precoMin: numeroGuardado(row.preco_min),
    precoMax: numeroGuardado(row.preco_max),
    idadeMin: numeroGuardado(row.idade_min),
    idadeMax: numeroGuardado(row.idade_max),
    disciplina: (row.disciplina as string) ?? null,
    nivel: (row.nivel as string) ?? null,
    termo: (row.termo as string) ?? null,
  };

  return {
    id: String(row.id),
    nome: (row.nome as string) || descreverAlerta(criterios),
    frequencia: (row.frequencia as Frequencia) || "diaria",
    ativo: row.ativo !== false,
    ultimoEnvioAt: (row.ultimo_envio_at as string) ?? null,
    createdAt: (row.created_at as string) ?? "",
    ...criterios,
  };
}
