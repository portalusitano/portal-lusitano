import type { CategoriaDia } from "./agrupar";
import type { Translations } from "@/context/LanguageContext";

/**
 * As palavras e os números do chat, na língua da página.
 *
 * Vive à parte dos componentes porque o `agrupar` devolve categorias e datas e
 * nunca palavras — uma função pura que devolvesse «Ontem» seria uma função
 * pura em português. Este é o sítio onde as duas se encontram.
 */

/** A etiqueta do `Intl` para cada uma das três línguas do site. */
export function etiquetaIntl(lingua: string): string {
  return lingua === "en" ? "en-GB" : lingua === "es" ? "es-ES" : "pt-PT";
}

/** A hora de uma mensagem: só isso, porque o dia está no separador. */
export function horaDe(iso: string, lingua: string): string {
  return new Date(iso).toLocaleTimeString(etiquetaIntl(lingua), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * O que se escreve num separador de dia.
 *
 * «Hoje» e «Ontem» são palavras; do terceiro ao sexto dia é o nome do dia da
 * semana, que ainda distingue; a partir daí é a data, porque «segunda-feira»
 * deixa de ser uma resposta quando há duas ao alcance.
 */
export function rotuloDoDia(
  categoria: CategoriaDia,
  data: Date,
  lingua: string,
  t: Translations
): string {
  const cha = t.chat;
  if (categoria === "hoje") return cha.hoje;
  if (categoria === "ontem") return cha.ontem;
  const l = etiquetaIntl(lingua);
  if (categoria === "semana") return data.toLocaleDateString(l, { weekday: "long" });
  return data.toLocaleDateString(l, { day: "numeric", month: "long", year: "numeric" });
}

/**
 * A hora na caixa de entrada.
 *
 * Ali o dia não está escrito em lado nenhum, por isso a hora sozinha mentia:
 * «14:14» tanto podia ser de hoje como da semana passada. Hoje escreve-se a
 * hora, ontem escreve-se a palavra, e mais para trás a data curta.
 */
export function quandoNaLista(
  iso: string,
  lingua: string,
  t: Translations,
  agora = new Date()
): string {
  const d = new Date(iso);
  const mesmoDia =
    d.getFullYear() === agora.getFullYear() &&
    d.getMonth() === agora.getMonth() &&
    d.getDate() === agora.getDate();
  if (mesmoDia) return horaDe(iso, lingua);

  const ontem = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1);
  if (
    d.getFullYear() === ontem.getFullYear() &&
    d.getMonth() === ontem.getMonth() &&
    d.getDate() === ontem.getDate()
  ) {
    return t.chat.ontem;
  }

  return d.toLocaleDateString(etiquetaIntl(lingua), { day: "2-digit", month: "2-digit" });
}

/** O preço do anúncio, ou nada — um travessão a fingir um número não é um preço. */
export function precoDoAnuncio(preco: number | null, lingua: string): string | null {
  if (typeof preco !== "number" || !Number.isFinite(preco)) return null;
  return new Intl.NumberFormat(etiquetaIntl(lingua), {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(preco);
}
