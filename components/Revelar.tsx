"use client";

import { useEffect, type ReactNode } from "react";

/** De onde entra o bloco. A distância é sempre a mesma; muda só o eixo. */
export type Direccao = "up" | "down" | "left" | "right";

interface RevelarProps {
  children: ReactNode;
  /** De onde entra. Por omissão sobe. */
  direccao?: Direccao;
  /** Deslocamento inicial, em pixels. Por omissão 2rem. */
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
/**
 * Atraso de um item numa grelha, com tecto.
 *
 * Numa página de resultados com 24 anúncios, 100ms por cartão punha o último
 * a entrar 2,4 segundos depois do primeiro — a grelha ficava a montar-se à
 * frente de quem já estava a ler. Ao fim de cinco passos o atraso pára.
 */
export function atrasoEmGrelha(indice: number, passo = 100, maximo = 5): number {
  return Math.min(indice, maximo) * passo;
}

export default function Revelar({
  children,
  direccao = "up",
  y = 32,
  duracao = 1000,
  atraso = 0,
  className,
}: RevelarProps) {
  // O eixo é escolhido aqui e não na folha de estilo: o `--ry` em linha
  // ganharia sempre ao que a regra de direcção pusesse.
  const eixo: Record<string, string> =
    direccao === "left"
      ? { "--rx": `${y}px`, "--ry": "0px" }
      : direccao === "right"
        ? { "--rx": `${-y}px`, "--ry": "0px" }
        : { "--ry": `${direccao === "down" ? -y : y}px` };

  return (
    <div
      data-revelar={direccao === "up" ? "" : direccao}
      className={className}
      // O observador acrescenta `dentro` a este elemento, e pode fazê-lo
      // antes de a hidratação terminar. Sem isto, cada bloco com entrada
      // gerava um aviso de hidratação em todas as páginas.
      suppressHydrationWarning
      style={
        {
          ...eixo,
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
 * não dispare (separador escondido, iframe, browser antigo).
 * 2. Ao fim de quatro segundos revela-se tudo, aconteça o que acontecer.
 */
export function ObservadorRevelar() {
  useEffect(() => {
    // Normalmente já lá está, posta pelo script inline antes da primeira
    // pintura; aqui é só rede de segurança para quem chegue por outro caminho.
    document.documentElement.classList.add("js");

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
      // A margem de -10% é a do kit: o bloco só entra quando já passou bem a
      // borda, e não no instante em que assoma.
      //
      // O `threshold` fica em 0 e não nos 0.15 do kit, de propósito. Exigir
      // 15% do elemento visível é uma armadilha para secções altas: mil
      // pixels de ecrã não são 15% de trinta mil, e uma página de termos
      // nunca lá chegaria — ficava invisível até a rede de segurança a
      // apanhar segundos depois. A margem já dá o mesmo atraso de entrada,
      // sem depender do tamanho do bloco.
      { rootMargin: "0px 0px -10% 0px", threshold: 0 }
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
        if (caixa.top < altura * 0.9 && caixa.bottom > 0) revelar(el);
      });
      ligar();
    };

    const aoRolar = () => varrer();
    window.addEventListener("scroll", aoRolar, { passive: true });
    const primeiroFotograma = requestAnimationFrame(varrer);
    const inicial = window.setTimeout(varrer, 400);
    const rede = window.setTimeout(todos, 4000);

    return () => {
      window.removeEventListener("scroll", aoRolar);
      cancelAnimationFrame(primeiroFotograma);
      window.clearTimeout(inicial);
      window.clearTimeout(rede);
      observador.disconnect();
    };
  }, []);

  return null;
}
