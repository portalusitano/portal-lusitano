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
 * As medidas dos cartões ficam em cache e só se recalculam quando a janela
 * mexe. Sem isso seriam seis leituras de layout a cada movimento do rato, e
 * o browser refazia as contas todas de cada vez.
 */
export default function GrelhaHolofote({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const grelha = useRef<HTMLDivElement>(null);
  const cartoes = useRef<{ el: HTMLElement; caixa: DOMRect }[]>([]);
  const quadro = useRef(0);
  const ponto = useRef({ x: 0, y: 0 });

  const medir = useCallback(() => {
    const el = grelha.current;
    if (!el) return;
    cartoes.current = [...el.querySelectorAll<HTMLElement>(".cartao-holofote")].map((c) => ({
      el: c,
      caixa: c.getBoundingClientRect(),
    }));
  }, []);

  useEffect(() => {
    const el = grelha.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return; // sem rato não há holofote

    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    window.addEventListener("scroll", medir, { passive: true });

    const pintar = () => {
      quadro.current = 0;
      for (const { el: cartao, caixa } of cartoes.current) {
        cartao.style.setProperty("--px", `${ponto.current.x - caixa.left}px`);
        cartao.style.setProperty("--py", `${ponto.current.y - caixa.top}px`);
      }
    };

    const aoMover = (e: PointerEvent) => {
      ponto.current = { x: e.clientX, y: e.clientY };
      if (!quadro.current) quadro.current = requestAnimationFrame(pintar);
    };

    el.addEventListener("pointermove", aoMover);
    return () => {
      el.removeEventListener("pointermove", aoMover);
      window.removeEventListener("scroll", medir);
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
