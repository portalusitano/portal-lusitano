import { eRotaDeEntrada } from "@/lib/rotas-de-entrada";

/**
 * Páginas onde o rodapé do site não entra.
 *
 * São duas famílias, e a razão é a mesma dita de duas maneiras: **a página é
 * o ecrã**, e o rodapé é uma segunda página colada por baixo.
 *
 * ── As páginas de entrada ────────────────────────────────────────────────
 * Já corriam sem barra e sem rodapé, e a razão está no `rotas-de-entrada`:
 * são um ecrã só, com a marca ao centro.
 *
 * ── O `/mapa` ────────────────────────────────────────────────────────────
 * O palco do globo é `100dvh` — a página **é** o mapa. O que estava por
 * baixo era o rodapé e mais nada: 380px por rolar a 1400×950 e 720px a
 * 390×700, tudo ele. Ou seja, a única coisa que aquela página tinha para
 * oferecer a quem rolasse era o índice do site, por baixo de um mapa que
 * ocupa o ecrã inteiro.
 *
 * E não é só uma questão de gosto: **enquanto houvesse página por baixo, a
 * roda não era do globo.** O `GloboTerra` cede a roda à página quando a lona
 * cobre o ecrã e ainda há documento para descer — `prende = cobreOEcra &&
 * scrollHeight - innerHeight > 24` —, e essa cedência existe para quem chega
 * e rola para ler o que está por baixo. Sem nada por baixo, a condição é
 * falsa por construção: a roda passa a ser do globo ao primeiro dente, o
 * `touch-action` volta ao `touch-none` por omissão e o dedo arrasta o
 * planeta em vez de deslocar a página. Não se mexeu numa linha do motor —
 * quem já decidia isto era ele, a partir da altura do documento.
 *
 * O que o rodapé leva consigo é alcançável de todas as outras páginas do
 * site, esta incluída pela barra de cima: a ligação «Ver lista» leva ao
 * `/directorio`, que tem rodapé como qualquer outra.
 */
export function eRotaSemRodape(caminho: string | null): boolean {
  if (!caminho) return false;
  if (eRotaDeEntrada(caminho)) return true;
  const semIdioma = caminho.replace(/^\/(en|es)(?=\/|$)/, "") || "/";
  return semIdioma === "/mapa";
}
