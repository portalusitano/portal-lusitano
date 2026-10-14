/**
 * ── Duas páginas, dois nomes para a mesma pergunta ────────────────────────
 *
 * O `/mapa` lê a pesquisa em `?q=` e o `/directorio` lê-a em `?search=`. As
 * duas páginas mostram as **mesmas vinte e nove coudelarias** e ligam uma para
 * a outra; um link copiado de uma e colado na outra perdia o filtro — e
 * perdia-o **em silêncio**, que é o pior dos dois. Medido: `/mapa?search=alter`
 * devolvia as 29 e ainda apagava o parâmetro do endereço ao reescrevê-lo, por
 * isso nem ficava rasto do que se tinha pedido.
 *
 * O nome canónico é o **`q`**: é o que o `/mapa` já escreve na barra de
 * endereço, logo é o que está nos links que as pessoas já partilharam, e é o
 * nome curto que toda a gente usa. Renomear qualquer um dos lados partia
 * endereços que já existem; aceitar o nome do outro como sinónimo não parte
 * nada e custa uma linha.
 *
 * O que **não** muda é o que se escreve: continua a sair `?q=`. Um sinónimo é
 * uma porta de entrada, não uma segunda grafia — se as duas se escrevessem, a
 * mesma pesquisa passava a ter dois endereços e a partilha ficava na mesma.
 *
 * A região já se chama `regiao` nas duas e já funciona nas duas; não se lhe
 * toca.
 */
export function comSinonimos(
  params: Record<string, string | string[] | undefined>
): Record<string, string | string[] | undefined> {
  const q = params.q;
  const temQ = Array.isArray(q) ? q.length > 0 : typeof q === "string" && q !== "";
  if (temQ || params.search === undefined) return params;
  return { ...params, q: params.search };
}
