"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { CoudelariaNoMapa } from "@/lib/coordenadas-coudelarias";

/*
 * O mapa das coudelarias, com um plano B.
 *
 * O desenho principal é o globo de tiles (MapLibre sobre OpenFreeMap): dá
 * cidades, estradas e relevo à medida que se aproxima, que é o que faz de um
 * mapa um mapa. Mas depende de um servidor lá fora, e a razão pela qual se
 * mexeu neste ecrã foi precisamente um mapa que dependia de um servidor lá
 * fora e deixou de responder — «API KEY REQUIRED» carimbado por cima do país.
 *
 * Por isso, se o estilo não carregar, entra o globo desenhado em canvas, que
 * não depende de ninguém. Fica sempre um mapa; nunca um rectângulo vazio.
 */

const GloboTiles = dynamic(() => import("@/components/GloboTiles"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

const GloboCanvas = dynamic(() => import("@/components/GloboCanvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

export default function GloboMapa(props: {
  coudelarias: CoudelariaNoMapa[];
  flyTo?: [number, number] | null;
  onMarkerClick?: (c: CoudelariaNoMapa) => void;
}) {
  const [semTiles, setSemTiles] = useState(false);

  if (semTiles) return <GloboCanvas {...props} />;
  return <GloboTiles {...props} aoFalhar={() => setSemTiles(true)} />;
}
