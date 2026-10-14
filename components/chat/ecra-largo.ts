"use client";

import { useSyncExternalStore } from "react";

/**
 * O ecrã dá para os dois painéis lado a lado?
 *
 * A resposta é do CSS em quase tudo — a `.chat__pilha` vira grelha aos 1024px
 * sem uma linha de JavaScript. Mas duas coisas não se dizem em CSS: o `inert`
 * de quem está fora da pilha é um atributo, e o foco que vai com quem entra
 * não deve ir quando não há entrada nenhuma. Por isso a mesma medida é lida
 * aqui, uma vez, e partilhada.
 *
 * `useSyncExternalStore` e não um `useEffect` com estado: assim o servidor
 * responde «estreito» (que é a leitura conservadora — ninguém fica com um
 * painel `inert` a mais) e o cliente corrige na primeira pintura, sem o aviso
 * de hidratação que um `window.matchMedia` lido no corpo do componente daria.
 */
const CONSULTA = "(min-width: 1024px)";

function subscrever(aoMudar: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(CONSULTA);
  mq.addEventListener("change", aoMudar);
  return () => mq.removeEventListener("change", aoMudar);
}

export function useEcraLargo(): boolean {
  return useSyncExternalStore(
    subscrever,
    () => window.matchMedia(CONSULTA).matches,
    () => false
  );
}
