"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Contador que avança de tempos a tempos — o motor dos painéis vivos da
 * página inicial.
 *
 * Só corre quando há razão para correr: pára com o separador escondido, pára
 * com o elemento fora do ecrã e nem sequer arranca com `prefers-reduced-motion`.
 * Um relógio a girar numa página que ninguém está a ver é bateria gasta a
 * troco de nada.
 */
export function usePassoVivo(intervalo: number, activo = true) {
  const [passo, setPasso] = useState(0);
  const alvo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activo) return;
    const el = alvo.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let relogio = 0;
    let aVista = false;

    const parar = () => {
      clearInterval(relogio);
      relogio = 0;
    };
    const arrancar = () => {
      if (relogio || !aVista || document.hidden) return;
      relogio = window.setInterval(() => setPasso((p) => p + 1), intervalo);
    };

    const observador = new IntersectionObserver(
      ([entrada]) => {
        aVista = entrada.isIntersecting;
        if (aVista) arrancar();
        else parar();
      },
      { threshold: 0 }
    );
    observador.observe(el);

    const aoMudarSeparador = () => (document.hidden ? parar() : arrancar());
    document.addEventListener("visibilitychange", aoMudarSeparador);

    return () => {
      observador.disconnect();
      document.removeEventListener("visibilitychange", aoMudarSeparador);
      parar();
    };
  }, [intervalo, activo]);

  return { passo, alvo };
}
