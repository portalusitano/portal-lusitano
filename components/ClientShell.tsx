"use client";

import dynamic from "next/dynamic";

/**
 * O que corre no cliente em todas as páginas.
 *
 * Já não monta um motor de deslocamento. O site rolava com o Lenis, que
 * substituía o deslocamento nativo por uma interpolação em JavaScript. Medido
 * neste ambiente, o que isso custava era:
 *
 *  - um `requestAnimationFrame` em cadeia que nunca parava — 240 chamadas em
 *    4 segundos com a página completamente parada, em todas as páginas, com
 *    ou sem alguém a rolar;
 *  - três ouvintes em `window` registados com `passive: false` (`wheel`,
 *    `touchmove` e `scroll`), que é o que proíbe o browser de deslocar a
 *    página no compositor. Com eles, cada volta da roda e cada arrasto do
 *    dedo tem de esperar que a linha principal corra JavaScript antes de a
 *    página se mexer — é essa espera que se sente como «lag»;
 *  - a roda do rato disputada com o `<GloboTerra>` do `/mapa`, que também a
 *    escuta para aproximar.
 *
 * O que se ganhava era uma curva de desaceleração. O deslocamento nativo já
 * tem uma, é acelerada pelo compositor, respeita as definições do sistema
 * operativo e não custa nada. Para as âncoras internas, que era a outra coisa
 * que o Lenis fazia, chegam duas linhas de CSS: `scroll-behavior: smooth`
 * (que já cá estava, e que o Lenis anulava com um `!important`) e o
 * `scroll-padding-top` que afasta o destino da barra fixa.
 */

const RouteProgressBar = dynamic(() => import("@/components/RouteProgressBar"), { ssr: false });

export default function ClientShell() {
  return <RouteProgressBar />;
}
