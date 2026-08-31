"use client";

import { useEffect, useState } from "react";

/**
 * Cortina de entrada da página.
 *
 * Um pano da cor do fundo que sobe e descobre o site, 250ms. Serve para a
 * primeira coisa que se vê não ser a página a montar-se aos bocados.
 *
 * Duas decisões que valem a pena registar:
 *
 * 1. Quem a anima é o CSS, não o JS. O script só a retira do DOM quando a
 * animação acaba. Se o JS falhar ou nunca hidratar, a cortina já subiu à
 * mesma e o pior caso é um nó invisível a mais — nunca um rectângulo opaco
 * por cima do site.
 * 2. Corre uma vez por carregamento, não a cada navegação. Numa aplicação de
 * rota no cliente, um pano a passar entre páginas seria um véu preto de cada
 * vez que se carrega numa ligação; quem assinala essas é a barra de progresso.
 */
export default function Cortina() {
  const [visivel, setVisivel] = useState(true);

  useEffect(() => {
    // Rede de segurança: se o `animationend` não chegar (separador em segundo
    // plano, movimento reduzido a anular a animação), sai à mesma.
    const t = window.setTimeout(() => setVisivel(false), 600);
    return () => window.clearTimeout(t);
  }, []);

  if (!visivel) return null;

  return (
    <div
      className="cortina"
      aria-hidden="true"
      onAnimationEnd={() => setVisivel(false)}
      suppressHydrationWarning
    />
  );
}
