/**
 * Consentimento de cookies — chaves e sinal partilhados.
 *
 * Vive à parte do componente para que quem só quer reabrir o pedido (o
 * rodapé) não arraste o painel inteiro para o seu pacote.
 */

export const CHAVE_CONSENTIMENTO = "cookie-consent";
export const CHAVE_PREFERENCIAS = "cookie-preferences";

/**
 * A lei exige que retirar o consentimento seja tão fácil como dá-lo. Quem
 * já respondeu não volta a ver o painel sozinho, por isso tem de haver uma
 * porta: o rodapé dispara este sinal e o painel volta a abrir.
 */
export const EVENTO_ABRIR_CONSENTIMENTO = "portal-lusitano:consentimento";

export function abrirConsentimento() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_ABRIR_CONSENTIMENTO));
}
