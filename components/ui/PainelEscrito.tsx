"use client";

import { useEffect, useRef } from "react";

/**
 * Escreve o conteúdo de um painel letra a letra quando ele entra no ecrã.
 *
 * O texto vai no HTML do servidor como qualquer outro; este componente só
 * o esconde e o repõe. Se o JavaScript falhar, o painel fica legível — que
 * é a única razão para animar assim em vez de montar o texto a partir do
 * cliente.
 *
 * A escrita percorre os nós de texto pela ordem do documento e reparte a
 * duração total por todos os caracteres, para que painéis com mais linhas
 * não demorem proporcionalmente mais a compor-se.
 */
export default function PainelEscrito({
  children,
  atraso = 0,
  duracao = 1500,
}: {
  children: React.ReactNode;
  atraso?: number;
  duracao?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raiz = ref.current;
    if (!raiz) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Recolhe os nós de texto visíveis e guarda o conteúdo original.
    const nos: { no: Text; texto: string }[] = [];
    const caminhante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    for (let n = caminhante.nextNode(); n; n = caminhante.nextNode()) {
      const texto = n.nodeValue ?? "";
      if (texto.trim() === "") continue;
      nos.push({ no: n as Text, texto });
    }
    if (nos.length === 0) return;

    const total = nos.reduce((soma, { texto }) => soma + texto.length, 0);

    const repor = () => {
      for (const { no, texto } of nos) no.nodeValue = texto;
    };

    /** Mostra os primeiros `n` caracteres do painel, contados em conjunto. */
    const escrever = (n: number) => {
      let restam = n;
      for (const { no, texto } of nos) {
        if (restam >= texto.length) {
          if (no.nodeValue !== texto) no.nodeValue = texto;
          restam -= texto.length;
        } else {
          const parte = texto.slice(0, Math.max(0, restam));
          if (no.nodeValue !== parte) no.nodeValue = parte;
          restam = 0;
        }
      }
    };

    let quadro = 0;
    let temporizador = 0;
    let arrancou = false;

    const arrancar = () => {
      if (arrancou) return;
      arrancou = true;
      escrever(0);
      temporizador = window.setTimeout(() => {
        const inicio = performance.now();
        const passo = (agora: number) => {
          const parte = Math.min(1, (agora - inicio) / duracao);
          escrever(Math.ceil(parte * total));
          if (parte < 1) quadro = requestAnimationFrame(passo);
          else repor();
        };
        quadro = requestAnimationFrame(passo);
      }, atraso);
    };

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          observador.disconnect();
          arrancar();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0 }
    );
    observador.observe(raiz);

    return () => {
      observador.disconnect();
      cancelAnimationFrame(quadro);
      clearTimeout(temporizador);
      repor();
    };
  }, [atraso, duracao]);

  return (
    <div ref={ref} className="painel-escrito">
      {children}
    </div>
  );
}
