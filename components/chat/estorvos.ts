"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Quantos pixéis é que há que deixar em baixo para não escrever por baixo de
 * quem está fixo no ecrã.
 *
 * ## O defeito, medido
 *
 * O `/mapa` já aprendeu isto e está escrito no `CLAUDE.md`: **a janela útil
 * não é a lona.** Aqui era pior, porque o que ficava debaixo do aviso de
 * cookies não era um nome que se pudesse omitir — era a caixa de escrever.
 * Medido a 390×700, primeira visita: o aviso ocupa de y=448 a y=688 e a coluna
 * do chat vai de 56 a 700, ou seja **252 pixéis tapados, e a caixa de escrever
 * lá dentro**. Um fio de conversa em que não se pode responder não é um fio de
 * conversa. Numa página que rola, quem chega ao aviso rola por baixo dele;
 * numa coluna de altura fixa não há por onde.
 *
 * ## Como se pergunta
 *
 * Pela mesma regra que o motor do globo cumpre, e pela mesma razão: **não se
 * pergunta ao código de fora quanto espaço ele ocupa, pergunta-se ao browser
 * quem está no caminho.** Quinze `elementFromPoint` numa banda ao longo da
 * aresta de baixo da caixa, a subir ao primeiro antepassado `fixed`. O chat
 * não conhece a classe da barra de cookies, nem do convite a instalar a
 * aplicação, nem do que vier a seguir.
 *
 * ## E não se pergunta a toda a hora
 *
 * Um elemento `fixed` não se mexe quando se rola — é a definição —, e esta
 * caixa também não, porque a página não rola por baixo dela. Sobram três
 * momentos em que a resposta pode mudar: a montagem, a janela mudar de
 * tamanho, e alguém aparecer ou desaparecer. Os três estorvos desta página são
 * **filhos directos do `<body>`** (medido: profundidade 2, os três), por isso
 * o terceiro é um `MutationObserver` sem `subtree` — que é o mais barato que
 * há e não acorda com o que se escreve dentro do fio.
 *
 * ## A regra da cortina
 *
 * Um estorvo que tape mais do que 40% da caixa não é uma barra, é uma cortina
 * — um menu de ecrã inteiro, uma janela modal —, e encolher a coluna para lhe
 * fugir não serve de nada. Descarta-se, que é o mesmo número e a mesma razão
 * que o `/mapa` usa. O aviso de cookies mede 240 numa caixa de 644: 37%, e por
 * isso conta.
 */

/** Acima disto é uma cortina, não uma barra. */
const CORTINA = 0.4;

/** Um estorvo mais fino do que isto não vale um reajuste de layout. */
const IRRELEVANTE = 8;

function primeiroFixo(no: Element | null): Element | null {
  for (let n: Element | null = no; n; n = n.parentElement) {
    const s = getComputedStyle(n);
    if (s.position === "fixed") return n;
  }
  return null;
}

/**
 * As alturas onde se pergunta, contadas para cima a partir da aresta de baixo.
 *
 * **Uma linha só não chega, e isso mediu-se.** A primeira versão perguntava só
 * em `bottom - 1`, e não encontrava nada: o aviso de cookies desta casa é
 * `bottom-3`, ou seja **flutua doze pixéis acima do fundo**, e a linha de
 * baixo passa-lhe por baixo. Medido nesse estado: a caixa de escrever ficava
 * tapada a 100% no telemóvel e a 64% no computador, com a reserva a zero. Uma
 * barra que flutua não se apanha pela aresta; apanha-se por uma banda.
 */
const ALTURAS = [1, 13, 25, 45, 73];

/**
 * E a caixa que se mede não é a que se encolhe.
 *
 * A medição corre sempre contra a janela (ver `medir`), por isso a reserva não
 * se pode alimentar a si própria — é essa a única invariante que aqui importa.
 */

/**
 * Mede a partir do fundo da **janela**, e não do fundo da caixa.
 *
 * **A primeira versão media a caixa, e isso é um ciclo.** Medido: encontrava
 * os 234 pixéis do aviso, encolhia a coluna para lhe fugir — e a coluna, mais
 * curta, deixava de ter o aviso debaixo da aresta de baixo, o que dava uma
 * medição nova de 18. Com 18 de reserva a aresta voltava para dentro do aviso
 * e a medição dava 234 outra vez. Visto no browser: `--chat-estorvo: 234px` no
 * primeiro instante e ausente um segundo depois, com a coluna de volta aos 644.
 *
 * A régua não pode ser a coisa que se está a mover. O fundo da janela não se
 * mexe, e a coluna sem reserva vai exactamente até lá — é `100dvh` menos o
 * cabeçalho —, por isso é essa a referência: a altura sem reserva é
 * `innerHeight - topo da caixa`, e a intrusão é `innerHeight - topo do
 * estorvo`. Nenhuma das duas muda quando a reserva muda, e por isso a conta
 * assenta à primeira.
 */
function medir(caixa: HTMLElement): number {
  const r = caixa.getBoundingClientRect();
  if (r.width < 1) return 0;

  const fundo = window.innerHeight;
  // A altura que a coluna teria sem reserva nenhuma — a régua estável.
  const alturaSemReserva = fundo - r.top;
  if (alturaSemReserva < 1) return 0;

  let maior = 0;

  for (const fraccao of [0.15, 0.5, 0.85]) {
    const x = Math.min(window.innerWidth - 1, Math.max(0, r.left + r.width * fraccao));
    for (const acima of ALTURAS) {
      const y = fundo - acima;
      if (y < r.top) break;

      const alvo = primeiroFixo(document.elementFromPoint(x, y));
      if (!alvo || caixa.contains(alvo)) continue;

      const e = alvo.getBoundingClientRect();
      if (e.height > alturaSemReserva * CORTINA) continue;
      maior = Math.max(maior, fundo - e.top);
    }
  }

  return maior > IRRELEVANTE ? Math.round(Math.min(maior, alturaSemReserva * CORTINA)) : 0;
}

export function useEstorvoDeBaixo(caixa: RefObject<HTMLElement | null>): number {
  const [reserva, setReserva] = useState(0);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;

    let agendado = 0;
    const pedir = () => {
      window.clearTimeout(agendado);
      // O atraso é o que deixa a barra acabar de entrar antes de a medirmos:
      // a meio da animação dela a altura ainda não é a final.
      agendado = window.setTimeout(() => setReserva(medir(el)), 200);
    };

    // A primeira medição também passa pelo temporizador, e não é só para
    // agradar à regra `react-hooks/set-state-in-effect`: no instante da
    // montagem a barra de cookies ainda está a entrar, e medi-la a meio da
    // animação dá uma altura que não é a dela. Nesses 200ms o que está no ecrã
    // é o esqueleto.
    pedir();
    window.addEventListener("resize", pedir, { passive: true });
    const observador = new MutationObserver(pedir);
    observador.observe(document.body, { childList: true });

    return () => {
      window.clearTimeout(agendado);
      window.removeEventListener("resize", pedir);
      observador.disconnect();
    };
  }, [caixa]);

  return reserva;
}
