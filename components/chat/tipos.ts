import type { ChatMensagem, EstadoMensagem } from "@/lib/marketplace-chat";

/**
 * O estado de entrega de uma mensagem, do ponto de vista de quem a escreveu.
 *
 * São os três que a base sabe **provar** — `enviada`, `entregue`, `lida`, cada
 * um com uma coluna por trás — mais os dois que só existem neste browser:
 * `"a-enviar"` e `"falhou"`, que são o envio optimista, escrito antes de o
 * servidor responder.
 *
 * ── A costura fechou-se, e trazia um defeito com ela ─────────────────────
 *
 * Isto declarava quatro estados e derivava-os de `m.lida`, com a nota de que
 * eram assim «até a API ganhar um instante de entrega a sério». Ganhou-o: a
 * `marketplace_mensagens` tem agora `entregue_at`, escrito quando o servidor
 * **disse ao destinatário** que a mensagem existe.
 *
 * Fechar a costura não foi só ligar um campo. A derivação antiga escrevia
 * «Entregue» a **tudo o que não estivesse lido** — ou seja, afirmava entrega
 * a partir da ausência de leitura, que não é a mesma coisa e que a base nunca
 * soube. Uma mensagem enviada para alguém que fechou o portátil aparecia como
 * entregue. É exactamente o que a nota do `estadoDaMensagem` da camada de
 * dados proíbe: não se mostra um estado que a base não sabe provar. Agora
 * quem responde é o servidor, e o quarto estado — «enviada» — é o que faltava
 * para a frase ser verdadeira.
 */
export type EstadoEntrega = EstadoMensagem | "a-enviar" | "falhou";

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
  /* Os dois que só o ecrã sabe vêm primeiro: enquanto a mensagem não chegou
     ao servidor, o `estado` que ela traz é o piso optimista e não uma
     resposta. */
  if (m.falhou) return "falhou";
  if (m.aEnviar) return "a-enviar";
  /* E daqui para baixo quem responde é a base, nunca uma inferência nossa. */
  return m.estado;
}
