/**
 * O esqueleto da `/mapa`.
 *
 * Tem de ser a planta do que vem a seguir, senão a página salta no momento em
 * que o conteúdo entra — e a planta mudou: a `/mapa` deixou de ser um herói
 * com um cartão de comandos e uma grelha de doze colunas e passou a ser uma
 * lona da altura da janela com duas peças a flutuar por cima dela. O
 * esqueleto usa **as mesmas classes** da página (`.mapa-palco`, `.mapa-lona`,
 * `.mapa-barra`, `.mapa-pilula`, `.mapa-rodape`, `.mapa-regioes__gatilho`),
 * que é a única maneira de as duas geometrias não poderem divergir: não há
 * aqui um número que alguém tenha de se lembrar de acompanhar.
 *
 * Não abre um `<main>`: o `app/layout.tsx` já embrulha tudo num
 * `<main id="main-content">`, e um dentro do outro dava dois marcos
 * «principal» para quem salta para o conteúdo.
 *
 * O painel das regiões é desenhado fechado, porque é assim que a página
 * nasce.
 *
 * `animate-pulse` é a excepção aceite ao «três ciclos infinitos»: só existe
 * enquanto o conteúdo não chegou.
 *
 * ── O que este ficheiro **não** resolve, e fica medido ────────────────────
 * Sem JavaScript, isto não chega a ver-se. Medido no browser com o JavaScript
 * desligado: o que fica no ecrã é o `app/loading.tsx` da raiz — a roda a girar
 * e «A carregar...» — para sempre. Este esqueleto e a página verdadeira vão os
 * dois para um `<div hidden>` no fim do documento, à espera do `$RC(...)` do
 * React que os muda de sítio, e esse script nunca corre. Um `<noscript>`
 * escrito aqui ou no `MapaClient` ia parar ao mesmo sítio: foi tentado e
 * medido, e não aparecia. Quem pode dizer alguma coisa a quem não tem
 * JavaScript é o `app/loading.tsx`, que é de toda a gente e não deste mapa.
 */
export default function Loading() {
  return (
    <div data-carregando className="mapa-palco">
      {/* A lona ocupa a janela inteira: é a planta da página que vem a
          seguir, e é isso que impede o salto no instante em que ela chega. */}
      <div className="mapa-lona animate-pulse bg-[var(--background-elevated)]" />

      {/* A pílula de cima: os dois chips da vista, a hairline que os separa da
          pesquisa, e a pesquisa — com a mesma medida que a `.mapa-procura` lhe
          dá na página, para a caixa não mudar de largura no instante em que o
          conteúdo chega. */}
      <div className="mapa-barra">
        <div className="mapa-pilula animate-pulse">
          <div className="h-8 w-20 shrink-0 rounded-full bg-[var(--background-elevated)]" />
          <div className="h-8 w-20 shrink-0 rounded-full bg-[var(--background-elevated)]" />
          <div className="mapa-pilula__risco" />
          <div className="mapa-procura h-10 rounded-lg bg-[var(--background-elevated)]" />
        </div>
      </div>

      {/* E o gatilho das regiões, fechado — que é como a página nasce. */}
      <div className="mapa-rodape">
        <div className="mapa-regioes animate-pulse">
          <div className="mapa-regioes__gatilho h-[42px]" />
        </div>
      </div>
    </div>
  );
}
