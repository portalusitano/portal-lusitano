"use client";

import { useEffect, useState } from "react";

/** O mote, em grupos. Cada grupo entra de uma distância diferente. */
const MOTE = ["O mercado", "do", "Lusitano."];

/**
 * Cortina de entrada da página.
 *
 * Tem duas formas. Na primeira vez de cada sessão segura o ecrã dois
 * segundos e escreve o mote; nas vezes seguintes é só o pano a subir em
 * 250ms. A diferença é deliberada: um mote de dois segundos é uma boa
 * primeira impressão e um mau imposto, e num classificados quem está a ver
 * anúncios abre páginas dezenas de vezes por sessão.
 *
 * Quem escolhe entre as duas é o script inline do `layout`, que põe `intro`
 * no `<html>` antes da primeira pintura. Aqui não há estado nenhum sobre
 * isso, e a marcação é a mesma no servidor e no cliente — decidir em React
 * obrigava o servidor a adivinhar se era a primeira visita da sessão, e
 * adivinhar mal é um erro de hidratação em todas as páginas.
 *
 * Duas outras decisões que valem a pena registar:
 *
 * 1. Quem anima é o CSS, sempre, incluindo a saída. O JS só retira o nó do
 * DOM quando a animação acaba. Se o script falhar ou nunca hidratar, o pano
 * sobe à mesma — um preloader que precise de script para sair é um ecrã
 * preto permanente no dia em que o script falha.
 * 2. Corre uma vez por carregamento, não a cada navegação. Entre rotas quem
 * assinala é a barra de progresso.
 */
export default function Cortina() {
  const [visivel, setVisivel] = useState(true);

  useEffect(() => {
    // Rede de segurança: se o `animationend` não chegar — separador em
    // segundo plano, movimento reduzido a anular a animação — sai à mesma.
    // A espera acompanha a forma que o pano tomou.
    const comMote = document.documentElement.classList.contains("intro");
    const t = window.setTimeout(() => setVisivel(false), comMote ? 2800 : 600);
    return () => window.clearTimeout(t);
  }, []);

  if (!visivel) return null;

  return (
    <div
      className="cortina"
      aria-hidden="true"
      onAnimationEnd={(e) => {
        // Só a animação do próprio pano decide a saída; as das palavras
        // borbulham até aqui e acabam antes dele.
        if (e.target === e.currentTarget) setVisivel(false);
      }}
      suppressHydrationWarning
    >
      <p className="intro__mote">
        {MOTE.map((grupo) => (
          <span key={grupo}>{grupo}</span>
        ))}
      </p>
    </div>
  );
}
