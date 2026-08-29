/**
 * Domain rules for marketplace listings owned by a seller.
 *
 * The `cavalos_venda` table is written by two very different paths — the Stripe
 * webhook (which inserts `nome`/`foto_principal`) and older seed scripts (which
 * used `nome_cavalo`/`image_url`) — so anything reading a row has to normalise
 * it first. See `normalizeListing` below.
 */

import { getListingTier } from "@/lib/listing-tiers";

/** Every status a listing row can hold in the database. */
export const LISTING_STATUS = {
  /** Paid, awaiting admin approval — not yet public. */
  PENDING: "pending",
  /** Approved and publicly visible. */
  ACTIVE: "active",
  /** Under negotiation, still visible. */
  RESERVADO: "reservado",
  /** Sold — kept for the seller's history, hidden from the marketplace. */
  VENDIDO: "vendido",
  /** Paused by the seller, hidden from the marketplace. */
  INATIVO: "inativo",
  /** Soft-deleted by the seller. */
  REMOVIDO: "removido",
} as const;

export type ListingStatus = (typeof LISTING_STATUS)[keyof typeof LISTING_STATUS];

/** Portuguese labels shown to the seller. */
export const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  pending: "Em aprovação",
  active: "Publicado",
  reservado: "Reservado",
  vendido: "Vendido",
  inativo: "Pausado",
  removido: "Removido",
};

/**
 * Statuses a seller may set directly, and which statuses they may set them from.
 *
 * `pending` is absent on purpose: an unapproved listing is the admin's to move.
 * `removido` is absent too — deletion goes through the DELETE route, not PATCH.
 */
export const SELLER_STATUS_TRANSITIONS: Record<string, ListingStatus[]> = {
  active: ["reservado", "vendido", "inativo"],
  reservado: ["active", "vendido", "inativo"],
  inativo: ["active"],
  vendido: ["active"],
};

/** Fields a seller is allowed to edit on their own listing. */
export const SELLER_EDITABLE_FIELDS = [
  "preco",
  "preco_negociavel",
  "preco_sob_consulta",
  "descricao",
  "localizacao",
  "regiao",
  "vendedor_nome",
  "vendedor_telefone",
  "vendedor_whatsapp",
  "video_url",
  "aceita_troca",
  "transporte_incluido",
] as const;

export type SellerEditableField = (typeof SELLER_EDITABLE_FIELDS)[number];

/** A listing row as the seller UI consumes it. */
export interface SellerListing {
  id: string;
  nome: string;
  slug: string | null;
  status: ListingStatus;
  statusLabel: string;
  preco: number | null;
  precoNegociavel: boolean;
  precoSobConsulta: boolean;
  fotoPrincipal: string | null;
  totalFotos: number;
  localizacao: string | null;
  regiao: string | null;
  descricao: string | null;
  sexo: string | null;
  idade: number | null;
  vendedorNome: string | null;
  vendedorTelefone: string | null;
  vendedorWhatsapp: string | null;
  videoUrl: string | null;
  aceitaTroca: boolean;
  transporteIncluido: boolean;
  views: number;
  tier: string;
  tierName: string;
  destaque: boolean;
  verificado: boolean;
  expiresAt: string | null;
  featuredUntil: string | null;
  /** True once `expiresAt` is in the past. Derived, never stored. */
  expirado: boolean;
  /** Whole days until expiry; negative once expired, null when no expiry is set. */
  diasRestantes: number | null;
  /** True when the listing is currently visible in the public marketplace. */
  publico: boolean;
  createdAt: string | null;
  vendidoAt: string | null;
}

/** A raw row straight out of Supabase, before normalisation. */
type RawListingRow = Record<string, unknown>;

function str(row: RawListingRow, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return null;
}

function num(row: RawListingRow, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function bool(row: RawListingRow, key: string): boolean {
  return row[key] === true;
}

/** Counts photos across the two column shapes the table has accumulated. */
function countPhotos(row: RawListingRow): number {
  const photos = new Set<string>();
  const principal = str(row, "foto_principal", "image_url");
  if (principal) photos.add(principal);

  for (const key of ["fotos", "image_urls"]) {
    const value = row[key];
    const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
    for (const entry of list) {
      if (typeof entry !== "string") continue;
      const trimmed = entry.trim();
      if (trimmed) photos.add(trimmed);
    }
  }

  return photos.size;
}

/**
 * Whole days from now until `iso`, rounded up so that a listing expiring in a
 * few hours still reads as "1 dia" rather than "0 dias".
 */
export function daysUntil(iso: string | null, now: Date = new Date()): number | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - now.getTime()) / 86_400_000);
}

/** True when the listing's paid period has elapsed. */
export function isExpired(expiresAt: string | null, now: Date = new Date()): boolean {
  if (!expiresAt) return false;
  const target = new Date(expiresAt).getTime();
  if (Number.isNaN(target)) return false;
  return target < now.getTime();
}

/**
 * Whether a seller may move a listing from `from` to `to`.
 *
 * An expired listing can only move to a hidden state: bringing it back into the
 * marketplace requires a new paid period, so reactivation is refused here rather
 * than silently handing out free visibility.
 */
export function canSellerTransition(
  from: string,
  to: string,
  opts: { expirado?: boolean } = {}
): boolean {
  const allowed = SELLER_STATUS_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to as ListingStatus)) return false;
  if (opts.expirado && (to === LISTING_STATUS.ACTIVE || to === LISTING_STATUS.RESERVADO)) {
    return false;
  }
  return true;
}

/** Computes when a listing bought on `from` under `tierId` stops being visible. */
export function computeExpiry(tierId: string, from: Date = new Date()): Date | null {
  const tier = getListingTier(tierId);
  if (!tier) return null;
  return new Date(from.getTime() + tier.durationDays * 86_400_000);
}

/** Computes when the featured period ends, or null when the tier has none. */
export function computeFeaturedUntil(tierId: string, from: Date = new Date()): Date | null {
  const tier = getListingTier(tierId);
  if (!tier || tier.featuredDays <= 0) return null;
  return new Date(from.getTime() + tier.featuredDays * 86_400_000);
}

/** Turns a raw `cavalos_venda` row into the shape the seller UI expects. */
export function normalizeListing(row: RawListingRow, now: Date = new Date()): SellerListing {
  const status = (str(row, "status") || LISTING_STATUS.PENDING) as ListingStatus;
  const expiresAt = str(row, "listing_expires_at");
  const expirado = isExpired(expiresAt, now);
  const tier = str(row, "listing_tier") || "standard";

  return {
    id: String(row.id),
    nome: str(row, "nome", "nome_cavalo") || "Sem nome",
    slug: str(row, "slug"),
    status,
    statusLabel: LISTING_STATUS_LABEL[status] || status,
    preco: num(row, "preco"),
    precoNegociavel: bool(row, "preco_negociavel"),
    precoSobConsulta: bool(row, "preco_sob_consulta"),
    fotoPrincipal: str(row, "foto_principal", "image_url"),
    totalFotos: countPhotos(row),
    localizacao: str(row, "localizacao"),
    regiao: str(row, "regiao"),
    descricao: str(row, "descricao"),
    sexo: str(row, "sexo"),
    idade: num(row, "idade"),
    vendedorNome: str(row, "vendedor_nome"),
    vendedorTelefone: str(row, "vendedor_telefone"),
    vendedorWhatsapp: str(row, "vendedor_whatsapp"),
    videoUrl: str(row, "video_url"),
    aceitaTroca: bool(row, "aceita_troca"),
    transporteIncluido: bool(row, "transporte_incluido"),
    views: num(row, "views_count") ?? 0,
    tier,
    tierName: getListingTier(tier)?.name || tier,
    destaque: bool(row, "destaque"),
    verificado: bool(row, "verificado"),
    expiresAt,
    featuredUntil: str(row, "featured_until"),
    expirado,
    diasRestantes: daysUntil(expiresAt, now),
    publico: !expirado && (status === LISTING_STATUS.ACTIVE || status === LISTING_STATUS.RESERVADO),
    createdAt: str(row, "created_at"),
    vendidoAt: str(row, "vendido_at"),
  };
}
