/**
 * Reasons a visitor can report a marketplace listing.
 *
 * The ids are stored in `cavalos_venda_denuncias.motivo` and constrained by a
 * CHECK on that column, so this list and the migration must stay in step.
 */
export const MOTIVOS_DENUNCIA = [
  { id: "fraude", label: "Suspeita de fraude ou burla" },
  { id: "ja_vendido", label: "O cavalo já foi vendido" },
  { id: "dados_falsos", label: "Informação falsa ou enganosa" },
  { id: "conteudo_improprio", label: "Conteúdo impróprio" },
  { id: "duplicado", label: "Anúncio duplicado" },
  { id: "outro", label: "Outro motivo" },
] as const;

export type MotivoDenuncia = (typeof MOTIVOS_DENUNCIA)[number]["id"];

/** Maximum length of the free-text detail field. Mirrors the CHECK on the table. */
export const MAX_DETALHE = 2000;

const IDS = new Set<string>(MOTIVOS_DENUNCIA.map((m) => m.id));

export function motivoValido(valor: unknown): valor is MotivoDenuncia {
  return typeof valor === "string" && IDS.has(valor);
}

/** Human-readable label for a stored reason, for the moderation queue. */
export function rotuloMotivo(motivo: string): string {
  return MOTIVOS_DENUNCIA.find((m) => m.id === motivo)?.label || motivo;
}
