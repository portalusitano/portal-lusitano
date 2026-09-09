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

/**
 * Os três estados que a base sabe **provar** sobre uma mensagem.
 *
 * Não há um quarto, e a ausência é deliberada. «A escrever…» não vive numa
 * tabela; «recebida no telemóvel» não vive em lado nenhum — a base não sabe o
 * que é um telemóvel. Cada um destes tem uma coluna por trás e um momento
 * exacto em que é escrita:
 *
 * - `enviada`  — a linha existe (`created_at`).
 * - `entregue` — o servidor **disse ao destinatário** que ela existe
 *                (`entregue_at`): a contagem de não lidas ou a caixa de
 *                entrada dele responderam com esta mensagem lá dentro.
 * - `lida`     — o destinatário abriu o fio (`lida_at`).
 *
 * A ordem é monótona por construção: `estadoDaMensagem` lê primeiro o `lida_at`
 * e só depois o `entregue_at`, portanto uma escrita falhada do estado do meio
 * nunca faz uma mensagem lida recuar a «enviada».
 */
export type EstadoMensagem = "enviada" | "entregue" | "lida";

export function estadoDaMensagem(
  lidaAt: string | null | undefined,
  entregueAt: string | null | undefined
): EstadoMensagem {
  if (lidaAt) return "lida";
  if (entregueAt) return "entregue";
  return "enviada";
}

export interface ChatMensagem {
  id: string;
  corpo: string;
  createdAt: string;
  /** True when the authenticated user wrote it. */
  minha: boolean;
  lida: boolean;
  /**
   * O estado só faz sentido para quem escreveu: mostrar «entregue» a quem
   * recebeu é dizer-lhe uma coisa que ele já sabe por estar a lê-la. Quem
   * recebe leva sempre "lida" — abrir o fio é o que a marca.
   */
  estado: EstadoMensagem;
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

// ===========================================================================
// Paginação do fio
// ===========================================================================

/**
 * Quantas mensagens traz uma página.
 *
 * Medido sobre um fio de 800 mensagens no PostgreSQL local: o fio inteiro são
 * **199 092 bytes** de corpos e 800 linhas; trinta são **7 719** e cinco
 * blocos de índice. Uma conversa de meses pagava isso a **cada abertura**, e a
 * maior parte dessas linhas nunca chega a ser rolada.
 *
 * Trinta e não dez porque uma página tem de encher mais do que um ecrã: se a
 * primeira coisa que alguém faz ao abrir é pedir a segunda página, a paginação
 * comprou uma ida ao servidor em vez de a poupar.
 */
export const MENSAGENS_POR_PAGINA = 30;

/** Tecto do que o cliente pode pedir de uma vez. */
export const MAX_MENSAGENS_POR_PAGINA = 100;

export interface CursorFio {
  /** O `created_at` **tal como a base o escreveu**. Ver a nota abaixo. */
  createdAt: string;
  id: string;
}

/**
 * O cursor viaja opaco.
 *
 * Duas razões, e nenhuma é enfeite. A primeira: uma chave composta escrita em
 * claro no URL convida a ser fabricada à mão, e o que se passa a receber
 * deixa de ser um cursor nosso e passa a ser um filtro de quem chamar. A
 * segunda é mais concreta — o `created_at` do Postgres tem **microssegundos**
 * e o `Date` do JavaScript só tem milissegundos. Um cursor que passe por um
 * `new Date(...)` perde três casas decimais e a página seguinte salta ou
 * repete a linha que estiver nesse microssegundo. Guardado como texto e
 * devolvido como texto, isso não pode acontecer.
 */
export function codificarCursor(cursor: CursorFio): string {
  return Buffer.from(`${cursor.createdAt}|${cursor.id}`, "utf8").toString("base64url");
}

export function descodificarCursor(bruto: string | null | undefined): CursorFio | null {
  if (!bruto) return null;

  let texto: string;
  try {
    texto = Buffer.from(bruto, "base64url").toString("utf8");
  } catch {
    return null;
  }

  // O corpo do cursor é `<timestamp>|<uuid>`. O separador é o **último** `|`
  // para que um timestamp com um `|` lá dentro — que esta base nunca escreve,
  // mas isto é uma entrada de fora — não parta a leitura em silêncio.
  const corte = texto.lastIndexOf("|");
  if (corte <= 0) return null;

  const createdAt = texto.slice(0, corte);
  const id = texto.slice(corte + 1);

  if (!createdAt || !id) return null;
  // Um id que não seja UUID nunca sai desta base; recusa-se aqui em vez de ir
  // parar a um filtro do PostgREST.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  if (Number.isNaN(Date.parse(createdAt))) return null;

  return { createdAt, id };
}

/** Lê o `limite` que o cliente pediu, com tecto e com omissão. */
export function limiteDaPagina(bruto: string | null | undefined): number {
  if (!bruto) return MENSAGENS_POR_PAGINA;
  const n = Number.parseInt(bruto, 10);
  if (!Number.isFinite(n) || n <= 0) return MENSAGENS_POR_PAGINA;
  return Math.min(n, MAX_MENSAGENS_POR_PAGINA);
}

/**
 * Quantas linhas de folga se pedem para lá da página, por causa dos empates.
 *
 * O corte é `created_at <= cursor` — inclusivo — e as linhas do instante do
 * cursor que já foram entregues são deitadas fora **aqui**, com o `id` a
 * desempatar. Essa folga é o número de mensagens que podem partilhar o mesmo
 * microssegundo sem que a página venha curta; cinco é generoso para uma
 * gravação que precisa de um pedido HTTP por mensagem.
 */
export const MARGEM_EMPATE = 5;

/** Quantas linhas pedir à base para devolver uma página de `limite`. */
export function linhasAPedir(limite: number): number {
  return limite + 1 + MARGEM_EMPATE;
}

/**
 * Recorta a página a partir do que a base devolveu, do mais recente para trás.
 *
 * ── Porque é que o corte é aqui e não num filtro composto ───────────────────
 *
 * A primeira versão mandava a chave composta para o servidor, na sintaxe do
 * PostgREST: `or=(created_at.lt.X,and(created_at.eq.X,id.lt.Y))`. É sintaxe
 * legítima, e mesmo assim foi a decisão errada — aquela linha tem de atravessar
 * três gramáticas (o construtor do cliente, o URL, e o analisador do servidor),
 * e **não há maneira de a provar sem ter os três**.
 *
 * Medido: ponta a ponta contra o banco de ensaio, percorrer um fio de 400
 * mensagens por cursor devolvia **413 linhas para 400 distintas** — a linha da
 * fronteira repetida em 13 das 14 páginas, sem um único erro pelo caminho. A
 * causa era a leitura que o servidor fazia do grupo aninhado, e o que interessa
 * não é de quem era a culpa: é que a formulação **não se podia provar aqui**, e
 * uma que se prova custa o mesmo.
 *
 * O que vai para o servidor passa a ser uma desigualdade só (`created_at <=
 * cursor`), que qualquer PostgREST lê da mesma maneira, e o desempate pelo
 * `id` — a parte que tem a subtileza — fica nesta função, que é pura e tem
 * testes.
 *
 * O `temMais` nunca subestima: se o servidor devolveu tudo o que se lhe pediu,
 * assume-se que há mais. Na pior das hipóteses isso custa um pedido que
 * devolve zero linhas; a alternativa seria perder o resto da conversa.
 */
export function paginaDoFio<T extends { id: string; created_at: string }>(
  linhas: T[],
  limite: number,
  pedido: number,
  cursor: CursorFio | null
): { pagina: T[]; temMais: boolean } {
  let restantes = linhas;

  if (cursor) {
    /* Vêm ordenadas do mais recente para o mais antigo, por isso o que já foi
       entregue está todo à cabeça: o próprio cursor e as suas empatadas com um
       `id` maior ou igual. */
    let i = 0;
    while (
      i < restantes.length &&
      (restantes[i].created_at > cursor.createdAt ||
        (restantes[i].created_at === cursor.createdAt && restantes[i].id >= cursor.id))
    ) {
      i += 1;
    }
    restantes = restantes.slice(i);
  }

  return {
    pagina: restantes.slice(0, limite),
    temMais: restantes.length > limite || linhas.length >= pedido,
  };
}

// ===========================================================================
// Limites de ritmo
// ===========================================================================

/**
 * Quantas conversas **novas** uma conta pode abrir por minuto.
 *
 * O que isto impede está dito com números: sem limite nenhum, uma conta criada
 * de fresco abria conversa com os vinte e nove vendedores em três segundos, e
 * os vinte e nove recebiam um email de aviso. Cinco por minuto deixa passar
 * quem anda mesmo a comprar — que abre uma, lê a resposta, abre outra — e
 * transforma a varredura de vinte e nove num trabalho de seis minutos com a
 * conta à vista.
 */
export const MAX_CONVERSAS_NOVAS_POR_MINUTO = 5;

/**
 * Quantas respostas por minuto dentro de conversas já abertas.
 *
 * Vinte é mais alto de propósito: responder depressa num fio já aberto é o
 * comportamento que esta funcionalidade existe para ter. O que se trava aqui é
 * o guião, não a conversa.
 */
export const MAX_MENSAGENS_POR_MINUTO = 20;
