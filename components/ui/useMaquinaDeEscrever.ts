"use client";

import { useEffect, useState } from "react";

interface Opcoes {
  /** Milissegundos por letra a escrever. */
  aEscrever?: number;
  /** Milissegundos por letra a apagar — apagar é sempre mais rápido. */
  aApagar?: number;
  /** Quanto tempo a frase fica parada depois de escrita. */
  pausa?: number;
  /** Suspende a animação (campo focado, ou já com texto escrito). */
  parado?: boolean;
}

/**
 * Escreve e apaga uma lista de frases, em ciclo.
 *
 * Devolve `null` até estar montado no cliente, para quem chama poder mostrar a
 * frase completa no servidor: um `placeholder` diferente entre servidor e
 * cliente é um erro de hidratação, e um campo de pesquisa vazio antes de o JS
 * arrancar não diz a ninguém o que se pode procurar ali.
 *
 * Pára com `prefers-reduced-motion`, e pára também mal alguém escreva ou
 * ponha o cursor no campo — um texto a mexer por baixo do que se está a
 * escrever é ruído, não é adorno.
 */
export function useMaquinaDeEscrever(
  frases: string[],
  { aEscrever = 55, aApagar = 28, pausa = 1700, parado = false }: Opcoes = {}
): string | null {
  const [texto, setTexto] = useState<string | null>(null);
  const [indice, setIndice] = useState(0);
  const [aApagarAgora, setAApagarAgora] = useState(false);

  useEffect(() => {
    if (parado || frases.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const alvo = frases[indice % frases.length];
    const actual = texto ?? "";

    // Cada passo é agendado, nenhum é aplicado no corpo do efeito. Mudar
    // estado aqui directamente encadeia renders — o React avisa disso, e com
    // razão: o passo seguinte da animação não tem de acontecer no mesmo
    // fotograma que o anterior.
    const passo = () => {
      if (!aApagarAgora && actual === alvo) return setAApagarAgora(true);
      if (aApagarAgora && actual === "") {
        setAApagarAgora(false);
        return setIndice((i) => (i + 1) % frases.length);
      }
      setTexto(aApagarAgora ? actual.slice(0, -1) : alvo.slice(0, actual.length + 1));
    };

    const espera =
      !aApagarAgora && actual === alvo
        ? pausa
        : aApagarAgora && actual === ""
          ? 320
          : aApagarAgora
            ? aApagar
            : aEscrever;

    const t = window.setTimeout(passo, espera);
    return () => window.clearTimeout(t);
  }, [texto, indice, aApagarAgora, frases, aEscrever, aApagar, pausa, parado]);

  return parado ? null : texto;
}
