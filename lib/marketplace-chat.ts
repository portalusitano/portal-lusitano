/**
 * Domain rules for buyer/seller conversations on a marketplace listing.
 *
 * A conversation always belongs to exactly one listing and one buyer. The seller
 * is whoever owns the listing (`cavalos_venda.user_id`), so a listing that was
 * never claimed by an account cannot be messaged — the page falls back to the
 * phone and email the seller published.
 */

/** Maximum characters in a single message. Mirrors the CHECK on the table. */
export const MAX_MENSAGEM = 4000;

/** How much of the last message the inbox preview shows. */
const PREVIEW_LENGTH = 120;

export interface ChatMensagem {
  id: string;
  corpo: string;
  createdAt: string;
  /** True when the authenticated user wrote it. */
  minha: boolean;
  lida: boolean;
}

export interface ChatConversa {
  id: string;
  cavaloId: string;
  /** "comprador" when the authenticated user is buying, "vendedor" when selling. */
  papel: "comprador" | "vendedor";
  /** Display name of the other person. */
  outraParte: string;
  cavaloNome: string;
  cavaloFoto: string | null;
  cavaloPreco: number | null;
  /** Truncated body of the most recent message, for the inbox list. */
  ultimaMensagem: string | null;
  ultimaMensagemAt: string;
  /** Messages sent by the other person that this user has not opened yet. */
  porLer: number;
  arquivada: boolean;
}

/**
 * Validates a message body.
 *
 * Returns the trimmed text, or an error describing why it was refused. Empty and
 * whitespace-only bodies are refused here and again by the table's CHECK.
 */
export function validarMensagem(input: unknown): { corpo: string } | { erro: string } {
  if (typeof input !== "string") {
    return { erro: "Mensagem inválida" };
  }

  const corpo = input.trim();

  if (corpo.length === 0) {
    return { erro: "A mensagem não pode estar vazia" };
  }

  if (corpo.length > MAX_MENSAGEM) {
    return { erro: `A mensagem não pode exceder ${MAX_MENSAGEM} caracteres` };
  }

  return { corpo };
}

/** Shortens a message body for the inbox preview, on a word boundary when it can. */
export function resumirMensagem(corpo: string | null | undefined): string | null {
  if (!corpo) return null;

  const limpo = corpo.replace(/\s+/g, " ").trim();
  if (limpo.length <= PREVIEW_LENGTH) return limpo;

  const cortado = limpo.slice(0, PREVIEW_LENGTH);
  const ultimoEspaco = cortado.lastIndexOf(" ");
  // Only break on a word if that does not throw away most of the preview.
  const base = ultimoEspaco > PREVIEW_LENGTH * 0.6 ? cortado.slice(0, ultimoEspaco) : cortado;

  return `${base}…`;
}

/**
 * Name to show for the counterpart in a conversation.
 *
 * Falls back through the denormalised buyer name, the listing's seller name, and
 * finally a neutral label — never an email address, which would leak a contact
 * the person did not choose to publish.
 */
export function nomeOutraParte(
  papel: "comprador" | "vendedor",
  compradorNome: string | null | undefined,
  vendedorNome: string | null | undefined
): string {
  if (papel === "comprador") {
    // The user is buying, so the counterpart is the seller.
    return vendedorNome?.trim() || "Vendedor";
  }
  return compradorNome?.trim() || "Comprador interessado";
}
