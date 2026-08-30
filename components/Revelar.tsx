"use client";

import { useEffect, type ReactNode } from "react";

interface RevelarProps {
  children: ReactNode;
  /** Deslocamento vertical inicial, em pixels. */
  y?: number;
  /** Duração da transição, em milissegundos. */
  duracao?: number;
  /** Atraso, para escalonar blocos de uma grelha. */
  atraso?: number;
  className?: string;
}

/**
 * Envolve um bloco que deve aparecer ao entrar no ecrã.
 *
 * Só marca o elemento; quem o anima é o `ObservadorRevelar`, montado uma vez
 * para toda a aplicação — um observador partilhado em vez de um por bloco.
 */
export default function Revelar({
  children,
  y = 24,
  duracao = 500,
  atraso = 0,
  className,
}: RevelarProps) {
  return (
    <div
      data-revelar=""
      className={className}
      style={
        {
          "--ry": `${y}px`,
          "--rd": `${duracao}ms`,
          "--rdelay": `${atraso}ms`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

/**
 * Anima os blocos marcados com `data-revelar` quando entram no ecrã.
 *
 * Tem duas redes de segurança deliberadas, porque o pior resultado possível
 * não é uma animação falhada — é uma página em branco:
 *
 * 1. Uma varredura periódica revela o que já está visível, caso o observador
 *    não dispare (separador escondido, iframe, browser antigo).
 * 2. Ao fim de quatro segundos revela-se tudo, aconteça o que acontecer.
 */
export function ObservadorRevelar() {
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.classList.add("js");

    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const revelar = (el: Element) => el.classList.add("dentro");
    const todos = () => document.querySelectorAll("[data-revelar]").forEach(revelar);

    if (reduzido || !("IntersectionObserver" in window)) {
      todos();
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            observador.unobserve(entrada.target);
            revelar(entrada.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.04 }
    );

    // Blocos que aparecem depois (paginação, filtros) também entram.
    const ligar = () => {
      document
        .querySelectorAll("[data-revelar]:not(.dentro)")
        .forEach((el) => observador.observe(el));
    };
    ligar();

    const varrer = () => {
      const altura = window.innerHeight || 800;
      document.querySelectorAll("[data-revelar]:not(.dentro)").forEach((el) => {
        const caixa = el.getBoundingClientRect();
        if (caixa.top < altura * 0.96 && caixa.bottom > 0) revelar(el);
      });
      ligar();
    };

    const aoRolar = () => varrer();
    window.addEventListener("scroll", aoRolar, { passive: true });
    const inicial = window.setTimeout(varrer, 400);
    const rede = window.setTimeout(todos, 4000);

    return () => {
      window.removeEventListener("scroll", aoRolar);
      window.clearTimeout(inicial);
      window.clearTimeout(rede);
      observador.disconnect();
    };
  }, []);

  return null;
}
