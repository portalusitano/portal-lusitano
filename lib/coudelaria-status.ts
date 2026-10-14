/**
 * O vocabulário do estado de uma coudelaria — um só, e é o da base.
 *
 * A base declara `status DEFAULT 'pending'` com `'pending','active','inactive'`
 * (`supabase/coudelarias.sql`), a política RLS deixa passar `status = 'active'`
 * e mais nada, e oito leituras públicas (`/directorio`, `/mapa`,
 * `/api/coudelarias`) filtram por esse mesmo `'active'`. O painel de
 * administração falava um segundo vocabulário — `pendente`/`aprovado`/
 * `rejeitado` — e o `adminCoudelariaSchema` falava um terceiro —
 * `pendente`/`ativo`/`inativo`/`rejeitado`. Aprovar escrevia `'aprovado'`, que
 * a política RLS não deixa passar: a coudelaria aprovada desaparecia do
 * directório, do mapa e da pesquisa.
 *
 * Escolheu-se o da base porque é o que já está escrito nas 35 linhas em
 * produção (29 `active`, 6 `inactive`), o que a RLS exige e o que as oito
 * leituras já usam. Mudar a base para o vocabulário do painel obrigava a uma
 * migração de dados, a reescrever a política e a mexer nas oito leituras — e
 * ganhava-se nada.
 *
 * **Três estados e não quatro.** «Rejeitado» e «suspenso» desapareceram porque
 * a RLS só conhece dois mundos, `active` e tudo o resto: um quarto valor seria
 * uma distinção que a base nunca aplica e que página nenhuma lê. Rejeitar um
 * registo escreve `inactive`, que é exactamente o que rejeitar quer dizer —
 * não fica visível.
 */

export const COUDELARIA_STATUS = {
  /** Registada pelo público, à espera de revisão. Não é pública. */
  PENDING: "pending",
  /** Aprovada. É o único estado que a política RLS deixa passar. */
  ACTIVE: "active",
  /** Rejeitada ou despublicada. Não é pública. */
  INACTIVE: "inactive",
} as const;

export type CoudelariaStatus = (typeof COUDELARIA_STATUS)[keyof typeof COUDELARIA_STATUS];

export const COUDELARIA_STATUS_VALUES: readonly CoudelariaStatus[] = [
  COUDELARIA_STATUS.PENDING,
  COUDELARIA_STATUS.ACTIVE,
  COUDELARIA_STATUS.INACTIVE,
];

/** Etiquetas em português, para o painel. */
export const COUDELARIA_STATUS_LABEL: Record<CoudelariaStatus, string> = {
  pending: "Pendente",
  active: "Publicada",
  inactive: "Não publicada",
};

export function isCoudelariaStatus(valor: unknown): valor is CoudelariaStatus {
  return typeof valor === "string" && COUDELARIA_STATUS_VALUES.includes(valor as CoudelariaStatus);
}

/**
 * Etiqueta de um valor de estado vindo da base.
 *
 * A base é `VARCHAR` sem restrição, por isso pode lá estar um valor de fora do
 * vocabulário — escrito por código antigo. Mostra-se tal e qual em vez de o
 * calar: um estado desconhecido no painel é informação, não é um erro a
 * esconder.
 */
export function etiquetaDoEstado(status: string | null | undefined): string {
  if (!status) return "—";
  return isCoudelariaStatus(status) ? COUDELARIA_STATUS_LABEL[status] : status;
}

/**
 * As transições que o painel oferece, a partir de cada estado.
 *
 * Um registo novo entra em `pending` e tem duas saídas. Um já decidido tem
 * uma: publicar ou despublicar. Antes os botões só apareciam em `"pendente"`,
 * um valor que nenhuma das 35 linhas tem — nenhuma linha tinha botão nenhum.
 */
export const COUDELARIA_TRANSICOES: Record<CoudelariaStatus, CoudelariaStatus[]> = {
  pending: [COUDELARIA_STATUS.ACTIVE, COUDELARIA_STATUS.INACTIVE],
  active: [COUDELARIA_STATUS.INACTIVE],
  inactive: [COUDELARIA_STATUS.ACTIVE],
};

/** O que o botão diz, por destino. */
export const COUDELARIA_ACCAO_LABEL: Record<CoudelariaStatus, string> = {
  pending: "Repor como pendente",
  active: "Publicar",
  inactive: "Despublicar",
};

/**
 * As transições oferecidas a partir de um estado, incluindo um valor de fora
 * do vocabulário: nesse caso oferecem-se os dois estados decididos, senão uma
 * linha com lixo no `status` ficava sem maneira de ser arrumada.
 */
export function transicoesDe(status: string | null | undefined): CoudelariaStatus[] {
  if (isCoudelariaStatus(status)) return COUDELARIA_TRANSICOES[status];
  return [COUDELARIA_STATUS.ACTIVE, COUDELARIA_STATUS.INACTIVE];
}
