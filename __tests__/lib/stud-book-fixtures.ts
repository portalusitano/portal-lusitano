/**
 * ██ ATENÇÃO ██ ESTAS PÁGINAS SÃO INVENTADAS. ██
 *
 * Nenhuma delas veio da APSL. Nenhuma resposta real do stud-book foi vista por
 * quem escreveu isto — o ambiente onde nasceram não tem rede de saída, e o
 * registo dos pedidos todos a falharem está na secção 1 do
 * `docs/verificacao-documental.md`.
 *
 * O que aqui está é o que um formulário de ficha de cavalo **plausivelmente**
 * devolveria, escrito nos três desenhos que qualquer página destas usa: uma
 * tabela, uma lista de definições, e texto com dois pontos. Servem para provar
 * que o analisador aguenta variações de desenho — **não** provam que ele lê a
 * página da APSL, porque ninguém sabe como ela é.
 *
 * **Quando a primeira resposta real chegar, este ficheiro deita-se fora e
 * põem-se as páginas verdadeiras no lugar.** Ver a lista do que pedir ao dono
 * no relatório, e o cabeçalho do `lib/documentos/stud-book/analisador.ts`.
 */

/** Desenho em tabela, em português. O caso corrente que se supõe. */
export const PAGINA_TABELA = `<!doctype html>
<html lang="pt"><head><title>Stud-Book</title>
<style>.ficha { color: #000 }</style>
<script>var x = "Sem resultados";</script>
</head><body>
<h1>Ficha do Animal</h1>
<table class="ficha">
  <tr><th>Campo</th><th>Valor</th></tr>
  <tr><td>Nome</td><td>MAESTOSO XV</td></tr>
  <tr><td>N&ordm; de Registo</td><td>LUS-2014-00421</td></tr>
  <tr><td>Data de Nascimento</td><td>12-03-2014</td></tr>
  <tr><td>Pelagem</td><td>Ruço</td></tr>
  <tr><td>Criador</td><td>Coudelaria da Ribeira &amp; Filhos</td></tr>
  <tr><td>Pai</td><td>XAQUIRO</td></tr>
  <tr><td>M&atilde;e</td><td>BENFAZEJA</td></tr>
  <tr><td>Propriet&aacute;rio</td><td>Jo&atilde;o Pereira da Silva</td></tr>
</table>
</body></html>`;

/** Desenho em lista de definições, com os dois pontos no próprio rótulo. */
export const PAGINA_LISTA = `<!doctype html>
<html lang="pt"><body>
<dl>
  <dt>Nome do Cavalo:</dt><dd>Rubi da Broa</dd>
  <dt>Numero de Registo:</dt><dd>LUS-2019-01188</dd>
  <dt>Data de Nascimento:</dt><dd>2019/07/04</dd>
  <dt>Pelagem:</dt><dd>Castanho escuro</dd>
  <dt>Pai:</dt><dd>Zamboni</dd>
  <dt>Mae:</dt><dd>Quinta</dd>
</dl>
</body></html>`;

/** A mesma coisa em inglês — a página da APSL é bilingue. */
export const PAGINA_INGLESA = `<!doctype html>
<html lang="en"><body>
<div class="record">
  <p>Horse name: NILO</p>
  <p>Registration number: LUS-2011-00077</p>
  <p>Date of birth: 21/05/2011</p>
  <p>Coat colour: Bay</p>
  <p>Breeder: Coudelaria Nacional</p>
  <p>Sire: DUQUE</p>
  <p>Dam: ALCACHOFRA</p>
</div>
</body></html>`;

/** A página que diz, ela própria, que não encontrou nada. */
export const PAGINA_SEM_RESULTADO = `<!doctype html>
<html lang="pt"><body>
<h1>Pesquisa ao Stud-Book</h1>
<p class="aviso">Sem resultados para os crit&eacute;rios indicados.</p>
</body></html>`;

/** O mesmo, em inglês. */
export const PAGINA_SEM_RESULTADO_INGLES = `<!doctype html>
<html lang="en"><body><p>No records found.</p></body></html>`;

/**
 * Uma página que não é uma ficha nem diz que não encontrou nada.
 *
 * É o caso que mais importa de todos: uma manutenção, um portal de login, um
 * desenho novo do sítio. **Tem de dar `formato_desconhecido`** — nunca
 * `nao_encontrado`, que seria dizer que a APSL não conhece o cavalo por causa
 * de uma folha de estilo que mudou.
 */
export const PAGINA_IRRECONHECIVEL = `<!doctype html>
<html lang="pt"><body>
<h1>Manuten&ccedil;&atilde;o programada</h1>
<p>O servi&ccedil;o est&aacute; temporariamente indispon&iacute;vel. Volte mais tarde.</p>
</body></html>`;

/**
 * Ruído com um campo à mistura, e sem nome nem número.
 *
 * Uma pelagem sozinha não é um cavalo. Tem de dar `formato_desconhecido`.
 */
export const PAGINA_SO_COM_PELAGEM = `<!doctype html>
<html lang="pt"><body>
<p>Pelagem: Ruço</p>
<p>Consulte o regulamento do livro genealógico.</p>
</body></html>`;

/**
 * Uma página de manutenção cujo JavaScript, esse, fala em «Sem resultados».
 *
 * O analisador deita fora `<script>` e `<style>` antes de olhar para o texto.
 * Sem isso, uma variável dentro de um script decidia que a APSL não conhece o
 * cavalo — que é a acusação mais barata e mais errada que este sistema podia
 * produzir.
 */
export const PAGINA_SCRIPT_ENGANOSO = `<!doctype html>
<html lang="pt"><head>
<script>var mensagemVazia = "Sem resultados"; var outra = "No records found";</script>
<style>.aviso::after { content: "nada encontrado" }</style>
</head><body>
<h1>Manuten&ccedil;&atilde;o programada</h1>
</body></html>`;
