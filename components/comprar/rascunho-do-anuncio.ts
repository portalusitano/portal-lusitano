/**
 * O primeiro recado, guardado enquanto se vai ao login e se volta.
 *
 * ── O defeito, medido ─────────────────────────────────────────────────────
 *
 * Guião do dono, reproduzido nas duas vistas com o site construído e servido:
 * abrir um anúncio **sem sessão**, abrir a caixa, escrever a mensagem toda,
 * carregar em enviar. Medido: **181 caracteres escritos**, atirado para
 * `/login?redirect=…`, **zero bytes guardados** em qualquer sítio deste
 * browser, e ao voltar ao anúncio a caixa tinha só os 66 caracteres do
 * modelo. O que se escreveu deixou de existir, e a página não tinha dito uma
 * palavra sobre ser preciso conta — medido também isso: nenhuma frase do
 * cartão o dizia.
 *
 * ── Porquê `sessionStorage`, e porquê por anúncio ─────────────────────────
 *
 * A razão está escrita no `components/chat/rascunhos.ts` e é a mesma: o
 * armazenamento do browser serve para conveniências de quem está a ver — um
 * rascunho por enviar —, e `session` e não `local` porque um recado por acabar
 * é da visita. Reencontrá-lo dentro do mesmo separador é ajudar; reencontrá-lo
 * daqui a três semanas é ressuscitar uma conversa que a pessoa já deu por
 * encerrada.
 *
 * E é **por anúncio**, pela mesma razão por que o rascunho do chat é da
 * conversa e não da caixa: uma variável só para todos os anúncios era o
 * rascunho a escorrer de um cavalo para o seguinte, pronto a ser enviado à
 * pessoa errada com um toque. Esse defeito já foi encontrado uma vez nesta
 * casa; não se volta a introduzir aqui.
 *
 * O `sessionStorage` sobrevive a uma navegação de página inteira dentro do
 * mesmo separador — que é exactamente o que a ida ao login é — e é isso que
 * faz disto a ferramenta certa e não um `useState`.
 */

const PREFIXO = "contactar-rascunho:";

export function chaveDoAnuncio(cavaloId: string): string {
  return PREFIXO + cavaloId;
}

export function lerRascunhoDoAnuncio(cavaloId: string): string {
  try {
    return sessionStorage.getItem(chaveDoAnuncio(cavaloId)) ?? "";
  } catch {
    /* Em janela privada, com os dados do sítio bloqueados, ou numa captura de
       miniatura, o próprio acesso rebenta. Sem armazenamento o rascunho vive
       só enquanto a página estiver aberta — que é o que acontecia antes disto
       existir, e não é pior do que isso. */
    return "";
  }
}

export function guardarRascunhoDoAnuncio(cavaloId: string, texto: string): void {
  try {
    if (texto.trim().length === 0) sessionStorage.removeItem(chaveDoAnuncio(cavaloId));
    else sessionStorage.setItem(chaveDoAnuncio(cavaloId), texto);
  } catch {
    /* ver acima */
  }
}

export function apagarRascunhoDoAnuncio(cavaloId: string): void {
  try {
    sessionStorage.removeItem(chaveDoAnuncio(cavaloId));
  } catch {
    /* ver acima */
  }
}

/**
 * Para onde mandar quem tem de entrar, e por onde o trazer de volta.
 *
 * ── Um segundo defeito, no mesmo caminho ──────────────────────────────────
 *
 * O código anterior escrevia `/login?redirect=…`. A página de login lê
 * **`returnUrl`** — `destinoSeguro(p.get("returnUrl"))`, com `"/"` por omissão
 * — e o `middleware` também escreve `returnUrl` quando protege o
 * `/minha-conta`. Medido: o endereço a que se chegava era mesmo
 * `/login?redirect=%2Fcomprar%2F…`, ou seja o parâmetro **que ninguém lê**.
 * Quem entrasse aterrava na página inicial, longe do anúncio e do recado que
 * tinha escrito.
 *
 * Um nome só, e é o que as duas outras metades do site já usam.
 */
export function caminhoDoLogin(caminhoActual: string): string {
  return `/login?returnUrl=${encodeURIComponent(caminhoActual)}`;
}
