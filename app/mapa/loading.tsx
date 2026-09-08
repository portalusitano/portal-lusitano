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
 * ── E as mesmas classes não chegavam ──────────────────────────────────────
 * A frase acima estava escrita e não era verdade, e a lição é que uma planta
 * só se sabe certa medindo-a. Medido — o servidor a segurar a resposta da
 * base, o esqueleto no ecrã, as caixas das mesmas peças comparadas com as da
 * página que vem a seguir, em pt-PT, depois de a animação de entrada assentar
 * (a `mapa-nascer` desloca a barra 12px e o rodapé 12px, e medir antes disso é
 * medir a animação e não a geometria):
 *
 *              antes                        depois
 *   1400×950   caixa de pesquisa 0 → 240    240 = 240
 *              pílula 195 → 414             435 vs 428
 *              rodapé 42 → 79 de altura     79 = 79
 *   390×700    caixa de pesquisa 0 → 176    173 vs 176
 *              pílula 195 → 350             366 vs 364
 *              rodapé 42 → 86 de altura     86 = 86
 *
 * Três causas, e nenhuma delas se via só de ler o ficheiro. A classe de uma
 * caixa não dá a largura de um `<input>` — quem a dá é o tamanho intrínseco do
 * elemento. A regra sem camada dos 44px de alvo de toque só pega em `<button>`
 * — logo um `<div>` com a mesma classe media 32 onde o verdadeiro media 44. E
 * uma linha que o esqueleto não desenha é uma linha que empurra tudo o resto
 * quando chega, porque o `.mapa-rodape` está preso em baixo e cresce para
 * cima. A resposta às três é a mesma: desenhar **os mesmos elementos**, e não
 * só as mesmas classes.
 *
 * O que sobra são 7px de pílula no computador e 2 no telemóvel — os chips têm
 * a largura da palavra que lá vai («Mapa» 79px, «Lista» 75px, medidos), e um
 * ficheiro de servidor não tem o dicionário; o `w-20` são 80. A pílula é
 * centrada, por isso 7px de largura a mais são 4px de deslocamento em cada
 * peça. Zero na vertical.
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
          pesquisa, e a pesquisa.

          A caixa da pesquisa é um `<input>` desligado com as classes do
          verdadeiro, e não um `<div>` com a classe da caixa. A diferença não é
          de estilo: quem dá a largura àquela caixa é o **tamanho intrínseco do
          `<input>`** (vinte caracteres, mais a folga que o `pl-10 pr-9` lhe
          põe), e não o `flex: 0 1 15rem` do `.mapa-procura` — a pílula
          encolhe-se ao conteúdo, e um `<div>` vazio lá dentro deixa-a
          colapsar. Medido a 1400×950 com um `<div>`: **0px de caixa de
          pesquisa contra 240 na página**, e com isso a pílula inteira ia a 195
          em vez de 414 — os dois chips da vista a 110px à direita de onde iam
          ficar, a saltar para a esquerda no instante em que o conteúdo chega.
          É o mesmo defeito que o CSS da `.mapa-barra` descreve como
          inaceitável, visto do outro lado: um comando que foge do dedo.
          Com um `.campo` vazio lá dentro em vez do `<div>` melhorava para 98 e
          continuava errado — a largura nunca veio da classe.

          `disabled`, `aria-hidden` e `tabIndex={-1}`: um esqueleto não é um
          comando. Não recebe foco, não é anunciado e não se pode escrever nele
          o que a página ainda não sabe procurar. */}
      <div className="mapa-barra">
        <div className="mapa-pilula animate-pulse">
          {/* Os chips são `<button>` desligados pela mesma razão que o gatilho
              das regiões lá em baixo: a regra sem camada dos 44px de alvo de
              toque só pega em botões, e os verdadeiros medem 30px de altura no
              computador e 44 no telemóvel. Com `<div>` mediam 32 nos dois, e a
              pílula inteira nascia 4px mais baixa do que ia ficar.
              O `&nbsp;` a transparente dá a linha de texto que decide os 30. */}
          <button type="button" disabled aria-hidden="true" tabIndex={-1} className="chip w-20">
            <span className="w-full rounded bg-[var(--background-elevated)] text-transparent">
              &nbsp;
            </span>
          </button>
          <button type="button" disabled aria-hidden="true" tabIndex={-1} className="chip w-20">
            <span className="w-full rounded bg-[var(--background-elevated)] text-transparent">
              &nbsp;
            </span>
          </button>
          <div className="mapa-pilula__risco" />
          <div className="mapa-procura">
            <input
              type="search"
              disabled
              aria-hidden="true"
              tabIndex={-1}
              className="campo h-10 pl-10 pr-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* O gatilho das regiões, fechado — que é como a página nasce — e a
          frase que lhe fica por baixo.

          As duas linhas, e não só a de cima: o `.mapa-rodape` está preso em
          baixo e cresce para cima, por isso uma linha a menos aqui é o
          gatilho inteiro a saltar quando a outra aparece. Medido: **42px de
          rodapé no esqueleto contra 79 na página**, ou seja o botão das
          regiões a subir 37px no instante em que o conteúdo chega.

          O gatilho é um `<button>` desligado e não um `<div>`, e isso não é
          cosmética: a regra sem camada `button:not([role="switch"])
          { min-height: 44px }` do `globals.css` só pega em botões, logo um
          `<div>` com a mesma classe media 42 onde o verdadeiro media 44. O
          `h-[42px]` que aqui estava era essa diferença escrita à mão — e
          escrita errada. `disabled` mais `aria-hidden` porque um esqueleto não
          é um comando: não recebe foco nem é anunciado. */}
      <div className="mapa-rodape">
        <div className="mapa-regioes animate-pulse">
          <button
            type="button"
            disabled
            aria-hidden="true"
            tabIndex={-1}
            className="mapa-regioes__gatilho"
          >
            {/* Cada barra é o **mesmo tipo de linha** da que vai ocupar aquele
                sítio — `.titulo-seccao` para o nome da região, `.meta` para a
                contagem —, com um espaço em branco lá dentro e a cor a
                transparente. É a folha que lhes dá a altura, e por isso o
                botão fica com a altura que vai ter, sem um `h-[…]` escrito à
                mão que alguém tenha de acompanhar quando a folha mudar. */}
            <span className="h-[15px] w-[15px] shrink-0 rounded bg-[var(--background-elevated)]" />
            <span className="titulo-seccao min-w-0 flex-1 rounded bg-[var(--background-elevated)] text-transparent">
              &nbsp;
            </span>
            <span className="meta w-6 rounded bg-[var(--background-elevated)] text-transparent">
              &nbsp;
            </span>
          </button>
        </div>
        {/* Duas linhas, porque duas é o que a frase ocupa: medido em pt-PT,
            34px de altura nas duas vistas. São dois blocos de `.meta`, logo
            quem lhes dá a altura é a folha. */}
        <p className="meta mapa-dica animate-pulse w-full">
          <span className="block rounded bg-[var(--background-elevated)] text-transparent">
            &nbsp;
          </span>
          <span className="mx-auto block w-2/3 rounded bg-[var(--background-elevated)] text-transparent">
            &nbsp;
          </span>
        </p>
      </div>
    </div>
  );
}
