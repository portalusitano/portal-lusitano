"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Grelha com um holofote que segue o ponteiro.
 *
 * Cada cartão recebe a posição do rato em coordenadas suas (`--px`, `--py`),
 * e o CSS acende-lhe a hairline e um halo ténue por baixo do ponteiro. Como
 * os seis lêem a mesma luz, ela atravessa-os como se fossem uma só folha de
 * vidro — que é a ideia do sistema: luz fria sobre preto.
 *
 * As medidas dos cartões ficam em cache, e a cache está em **coordenadas do
 * documento**, não da janela. É essa a diferença que interessa: guardadas em
 * coordenadas da janela, as medidas ficavam erradas assim que a página se
 * deslocasse um pixel, e por isso havia um `window.addEventListener("scroll",
 * medir)` a refazê-las — sem estrangulamento nenhum, um `querySelectorAll`
 * mais seis `getBoundingClientRect` a cada evento de deslocamento. Era o
 * maior consumidor de leituras forçadas de layout de todo o site: das 1663
 * que a página inicial fazia em dois segundos de roda, a maior parte vinha
 * daqui — e uma leitura de layout a meio de um deslocamento obriga o browser
 * a refazer o layout antes de poder responder à roda.
 *
 * Em coordenadas do documento a medida não caduca ao rolar, porque o cartão
 * não se mexeu — mexeu-se a janela. O ponteiro dá a sua posição na mesma
 * régua (`pageX`/`pageY`), a subtracção é a mesma, e o ouvinte de
 * deslocamento deixa de ter razão para existir. Fica o `ResizeObserver`, que
 * é quem sabe quando os cartões mudam mesmo de sítio.
 */
export default function GrelhaHolofote({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const grelha = useRef<HTMLDivElement>(null);
  const cartoes = useRef<{ el: HTMLElement; x: number; y: number }[]>([]);
  const quadro = useRef(0);
  const ponto = useRef({ x: 0, y: 0 });

  const medir = useCallback(() => {
    const el = grelha.current;
    if (!el) return;
    const dx = window.scrollX;
    const dy = window.scrollY;
    cartoes.current = [...el.querySelectorAll<HTMLElement>(".cartao-holofote")].map((c) => {
      const caixa = c.getBoundingClientRect();
      return { el: c, x: caixa.left + dx, y: caixa.top + dy };
    });
  }, []);

  useEffect(() => {
    const el = grelha.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return; // sem rato não há holofote

    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);

    const pintar = () => {
      quadro.current = 0;
      for (const { el: cartao, x, y } of cartoes.current) {
        cartao.style.setProperty("--px", `${ponto.current.x - x}px`);
        cartao.style.setProperty("--py", `${ponto.current.y - y}px`);
      }
    };

    const aoMover = (e: PointerEvent) => {
      // `pageX`/`pageY` já vêm em coordenadas do documento, que é a régua em
      // que a cache está. Ler `scrollY` aqui seria voltar a tocar no layout a
      // cada movimento do rato.
      ponto.current = { x: e.pageX, y: e.pageY };
      if (!quadro.current) quadro.current = requestAnimationFrame(pintar);
    };

    el.addEventListener("pointermove", aoMover, { passive: true });
    return () => {
      el.removeEventListener("pointermove", aoMover);
      observador.disconnect();
      cancelAnimationFrame(quadro.current);
    };
  }, [medir]);

  return (
    <div ref={grelha} className={className}>
      {children}
    </div>
  );
}
