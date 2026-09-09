import type { MensagemNoEcra } from "./tipos";

/**
 * O que faz de uma lista de mensagens uma conversa.
 *
 * Uma lista de balões com a hora repetida em cada um é um registo, não uma
 * conversa. Duas regras chegam para a diferença, e as duas são de calendário e
 * de relógio — por isso vivem aqui, numa função pura, e não dentro do
 * componente:
 *
 * 1. **Um separador por dia.** Quem lê um fio quer saber quando é que a outra
 *    parte parou de responder, e isso não se lê de uma coluna de horas.
 * 2. **Mensagens seguidas da mesma pessoa juntam-se num bloco.** Três frases
 *    escritas de enfiada são um turno de fala, não três; e é o bloco que leva
 *    a hora e o estado de entrega, uma vez, em vez de cada linha.
 *
 * O corte do bloco é o tempo: passados cinco minutos, a pessoa voltou ao
 * teclado depois de ter feito outra coisa, e isso é um turno novo mesmo que
 * ninguém tenha respondido pelo meio.
 */

/** Passados estes minutos, a mensagem seguinte começa um bloco novo. */
export const JANELA_BLOCO_MS = 5 * 60_000;

/**
 * Como é que o separador de dia se escreve.
 *
 * A função devolve a categoria e a data, e nunca a palavra: quem escolhe as
 * palavras é o componente, que tem o `t` da língua. Uma função pura que
 * devolvesse «Ontem» seria uma função pura em português.
 */
export type CategoriaDia = "hoje" | "ontem" | "semana" | "antigo";

export interface SeparadorDia {
  tipo: "dia";
  /** `AAAA-MM-DD` no fuso de quem lê. Serve de `key` e de identidade. */
  chave: string;
  categoria: CategoriaDia;
  /** A data, para o componente a formatar na língua certa. */
  data: Date;
}

export interface BlocoDeMensagens {
  tipo: "bloco";
  chave: string;
  /** Verdadeiro quando o bloco é de quem está a ler. */
  minha: boolean;
  mensagens: MensagemNoEcra[];
}

export type ItemDoFio = SeparadorDia | BlocoDeMensagens;

/** `AAAA-MM-DD` no fuso local — dois instantes do mesmo dia dão a mesma chave. */
export function diaLocal(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/** Quantos dias de calendário separam duas datas, no fuso local. */
function diasEntre(mais: Date, menos: Date): number {
  const a = new Date(mais.getFullYear(), mais.getMonth(), mais.getDate()).getTime();
  const b = new Date(menos.getFullYear(), menos.getMonth(), menos.getDate()).getTime();
  return Math.round((a - b) / 86_400_000);
}

/**
 * A que categoria pertence um dia, visto de `agora`.
 *
 * A semana pára aos seis dias de propósito: ao sétimo, «segunda-feira» deixa de
 * ser uma resposta — há duas segundas ao alcance e nenhuma se distingue da
 * outra sem a data.
 */
export function categoriaDoDia(data: Date, agora: Date): CategoriaDia {
  const d = diasEntre(agora, data);
  if (d <= 0) return "hoje";
  if (d === 1) return "ontem";
  if (d <= 6) return "semana";
  return "antigo";
}

/**
 * Parte o fio em separadores de dia e blocos de mensagens seguidas.
 *
 * Recebe as mensagens já por ordem de chegada. Não ordena: a ordem é do
 * servidor e da fusão (`fundirMensagens`), e ordenar aqui esconderia um erro
 * lá em vez de o mostrar.
 */
export function agruparFio(mensagens: MensagemNoEcra[], agora: Date = new Date()): ItemDoFio[] {
  const itens: ItemDoFio[] = [];
  let diaCorrente: string | null = null;
  let bloco: BlocoDeMensagens | null = null;
  let anterior: Date | null = null;

  for (const m of mensagens) {
    const quando = new Date(m.createdAt);
    const dia = diaLocal(quando);

    if (dia !== diaCorrente) {
      itens.push({
        tipo: "dia",
        chave: dia,
        categoria: categoriaDoDia(quando, agora),
        data: quando,
      });
      diaCorrente = dia;
      // Um dia novo parte sempre o bloco: um turno de fala não atravessa a
      // meia-noite, e o separador ficaria a meio de um bloco.
      bloco = null;
    }

    const seguido =
      bloco !== null &&
      bloco.minha === m.minha &&
      anterior !== null &&
      quando.getTime() - anterior.getTime() <= JANELA_BLOCO_MS;

    if (seguido && bloco) {
      bloco.mensagens.push(m);
    } else {
      bloco = { tipo: "bloco", chave: m.id, minha: m.minha, mensagens: [m] };
      itens.push(bloco);
    }
    anterior = quando;
  }

  return itens;
}
