import type { ChatMensagem } from "@/lib/marketplace-chat";

/**
 * O estado de entrega de uma mensagem, do ponto de vista de quem a escreveu.
 *
 * A camada de dados de hoje devolve `lida` e mais nada, e é dela que os quatro
 * estados saem — ver `estadoDaMensagem`. Ficam declarados os quatro porque é
 * essa a costura: quando a API ganhar um instante de entrega a sério, muda-se
 * a função e não o desenho.
 *
 * `"a-enviar"` e `"falhou"` só existem no ecrã: são o envio optimista, que
 * escreve a mensagem antes de o servidor responder.
 */
export type EstadoEntrega = "a-enviar" | "entregue" | "lida" | "falhou";

/**
 * Uma mensagem como o fio a mostra.
 *
 * É a `ChatMensagem` da API mais o que só o ecrã sabe: se ainda está a caminho,
 * e — para as que ainda não têm identificador do servidor — a chave local por
 * que se reconhece o eco quando ele chegar.
 */
export interface MensagemNoEcra extends ChatMensagem {
  /** Verdadeiro enquanto o servidor não confirmou. */
  aEnviar?: boolean;
  /** Verdadeiro quando o envio falhou e a mensagem ficou por entregar. */
  falhou?: boolean;
}

/** O prefixo dos identificadores que o ecrã inventa antes de o servidor falar. */
export const PREFIXO_LOCAL = "local-";

/** É uma mensagem que ainda só existe neste browser? */
export function eLocal(m: Pick<MensagemNoEcra, "id">): boolean {
  return m.id.startsWith(PREFIXO_LOCAL);
}

/**
 * O estado de entrega de uma mensagem.
 *
 * Só faz sentido nas minhas: numa mensagem da outra parte, «lida» diria se
 * *eu* a li, e isso já está dito pelo facto de estar no ecrã.
 */
export function estadoDaMensagem(m: MensagemNoEcra): EstadoEntrega | null {
  if (!m.minha) return null;
  if (m.falhou) return "falhou";
  if (m.aEnviar) return "a-enviar";
  return m.lida ? "lida" : "entregue";
}
