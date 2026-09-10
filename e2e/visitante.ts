import type { Page } from "@playwright/test";
import { CHAVE_CONSENTIMENTO, CHAVE_PREFERENCIAS } from "../lib/consentimento";

/**
 * Põe o browser no estado de quem já respondeu ao pedido de cookies.
 *
 * O pedido é um diálogo modal que tapa a página inteira até ser respondido —
 * é essa a razão de ser dele, e está escrita no `CookieConsent`. O efeito
 * colateral é que **todos** os percursos de teste passam a começar por trás
 * dele: cada `click()` num contexto novo do Playwright espera 30 segundos por
 * um elemento que está debaixo de `<div id="aviso-cookies">`, e falha a
 * dizer «intercepts pointer events». Não é intermitência — é o modal a fazer
 * o que lhe compete.
 *
 * Cada teste do Playwright corre num contexto limpo, logo sem isto cada teste
 * é um primeiro acesso. Mas o estado que interessa exercer nos percursos de
 * negócio — procurar, filtrar, publicar — é o de quem já respondeu, que é o
 * de praticamente todas as visitas depois da primeira. Semeia-se a resposta
 * antes da primeira pintura, em vez de a clicar: clicar acrescentaria a cada
 * teste uma corrida com o carregamento do próprio painel (é `ssr: false`), e
 * era essa corrida que tornava três casos ora vermelhos ora verdes.
 *
 * O primeiro acesso não fica por cobrir: tem um caso só dele, num contexto
 * que não passa por aqui.
 *
 * Recusa-se, não se aceita. O teste não tem nada que autorizar analítica em
 * nome de ninguém, e recusar é o estado que exercita mais código — é com ele
 * que os carregamentos condicionais ficam de fora.
 */
export async function jaRespondeuAosCookies(page: Page) {
  await page.addInitScript(
    ([chave, chavePreferencias]) => {
      try {
        localStorage.setItem(chave, "declined");
        localStorage.setItem(
          chavePreferencias,
          JSON.stringify({ essential: true, analytics: false, marketing: false })
        );
      } catch {
        // Sem armazenamento o pedido aparece à mesma e o teste falha a
        // dizê-lo, que é melhor do que passar por engano.
      }
    },
    [CHAVE_CONSENTIMENTO, CHAVE_PREFERENCIAS]
  );
}
