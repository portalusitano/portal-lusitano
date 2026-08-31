"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Map as MapaGL, Marker, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { resolverCoordenadas, type CoudelariaNoMapa } from "@/lib/coordenadas-coudelarias";

/*
 * Globo de verdade: projecção esférica do MapLibre sobre tiles do
 * OpenFreeMap, que são gratuitos e não pedem chave — foi a chave em falta
 * que punha «API KEY REQUIRED» carimbado por cima do país no mapa antigo.
 *
 * Duas coisas do exemplo de referência ficaram de fora de propósito:
 *
 *  - **Os pontos verdes a pulsar.** O site tem um verde só, e é o do estado
 *    «activo»; e a pulsação seria mais um ciclo infinito, que é coisa que
 *    se conta neste projecto. As coudelarias são brancas, e douradas só as
 *    que estão em destaque — vinte e tal alfinetes dourados seguidos
 *    deixavam de assinalar seja o que for.
 *  - **A rotação automática eterna.** O globo entra a voar até Portugal,
 *    uma vez, e depois fica quieto à espera de quem lhe pegue.
 *
 * O estilo vem claro e é repintado camada a camada para o preto e as
 * hairlines frias do site.
 */

const CENTRO_PT: [number, number] = [-8.2, 39.5];

/*
 * O worker é servido de `public/`, não do pacote.
 *
 * O MapLibre monta-lhe o URL com `new URL("./maplibre-gl-worker.mjs",
 * import.meta.url)`. Empacotado pelo Turbopack, esse caminho fica ao lado
 * do chunk — onde o ficheiro não existe. Dava 404, o worker nunca
 * arrancava, e como é ele que decifra os tiles, o mapa ficava um rectângulo
 * preto sem um único erro visível: a consola ficava limpa, o estilo dizia-se
 * carregado, as camadas estavam lá com as cores certas, e não se desenhava
 * nada. O ficheiro é posto em `public/` pelo `prebuild`.
 */
setWorkerUrl("/maplibre-gl-worker.mjs");
const ESTILO = "https://tiles.openfreemap.org/styles/positron";

type Props = {
  coudelarias: CoudelariaNoMapa[];
  flyTo?: [number, number] | null;
  onMarkerClick?: (c: CoudelariaNoMapa) => void;
  /** Chamado se o estilo não conseguir carregar — quem trata é o chamador. */
  aoFalhar?: () => void;
};

/*
 * Repinta o estilo claro do OpenFreeMap na paleta do portal.
 *
 * A primeira versão desta função pintava a terra a 4,5% de branco e as
 * fronteiras a 10% — sobre preto puro, isso é preto. O globo saía uma bola
 * escura com um aro de atmosfera e mais nada. As cores daqui são opacas de
 * propósito: a terra tem de se distinguir do mar a olho, e o mar do espaço.
 */
const PALETA = {
  espaco: "#05070c",
  mar: "#070b12",
  terra: "#151b26",
  terraAlta: "#1b2230",
  fronteira: "rgba(214,235,253,0.34)",
  traco: "rgba(214,235,253,0.10)",
};

function repintar(mapa: MapaGL) {
  const estilo = getComputedStyle(document.documentElement);
  const tenue = estilo.getPropertyValue("--foreground-muted").trim() || "#8a8a8a";

  for (const camada of mapa.getStyle().layers ?? []) {
    const id = camada.id;
    try {
      switch (camada.type) {
        case "background":
          mapa.setPaintProperty(id, "background-color", PALETA.espaco);
          break;
        case "fill":
          mapa.setPaintProperty(
            id,
            "fill-color",
            /water|ocean|sea|river|lake/i.test(id)
              ? PALETA.mar
              : /building|landuse|park|wood|forest/i.test(id)
                ? PALETA.terraAlta
                : PALETA.terra
          );
          mapa.setPaintProperty(id, "fill-opacity", 1);
          break;
        case "line":
          mapa.setPaintProperty(
            id,
            "line-color",
            /bound|admin|border/i.test(id) ? PALETA.fronteira : PALETA.traco
          );
          break;
        case "symbol":
          mapa.setPaintProperty(id, "text-color", tenue);
          mapa.setPaintProperty(id, "text-halo-color", PALETA.espaco);
          mapa.setPaintProperty(id, "text-halo-width", 1.2);
          break;
        default:
          break;
      }
    } catch {
      // Uma camada que não aceite a propriedade não estraga as outras.
    }
  }
}

export default function GloboTiles({ coudelarias, flyTo, onMarkerClick, aoFalhar }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaGL | null>(null);
  const marcas = useRef<Marker[]>([]);
  /* Os callbacks vivem em refs para o mapa não ter de se remontar quando o
     pai volta a renderizar. Escritos num efeito, não no corpo — mexer numa
     ref durante a renderização é coisa que o React não garante. */
  const aoClicar = useRef(onMarkerClick);
  const aoFalharRef = useRef(aoFalhar);
  useEffect(() => {
    aoClicar.current = onMarkerClick;
    aoFalharRef.current = aoFalhar;
  });

  const pontos = useMemo(
    () =>
      coudelarias
        .map((c) => ({ c, coords: resolverCoordenadas(c) }))
        .filter((x): x is { c: CoudelariaNoMapa; coords: [number, number] } => x.coords !== null),
    [coudelarias]
  );

  // ── O mapa: monta-se uma vez ───────────────────────────────────────────
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;

    const m = new MapaGL({
      container: el,
      style: ESTILO,
      /* Já enquadrado em Portugal. Antes começava no meio do Atlântico a
         zoom 1,1 e contava com a animação para lá chegar — e quando alguma
         coisa a interrompia, o que ficava no ecrã era o planeta inteiro com
         as vinte e nove coudelarias sobrepostas num ponto. */
      center: CENTRO_PT,
      zoom: 3.4,
      attributionControl: { compact: true },
    });
    mapa.current = m;

    const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    m.on("style.load", () => {
      m.setProjection({ type: "globe" });
      m.setSky({
        "sky-color": token(),
        "sky-horizon-blend": 0.55,
        "horizon-color": "#101a2b",
        "horizon-fog-blend": 0.6,
        "fog-color": "#05070c",
        "fog-ground-blend": 0.4,
        "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.85, 5, 0.2, 7, 0],
      });
      repintar(m);

      /* Fecha sobre a Península, uma vez. A referência rodava para sempre;
         um ciclo infinito a mais não se paga com «fica giro». */
      m.easeTo({ center: CENTRO_PT, zoom: 5.4, duration: parado ? 0 : 1800, essential: true });
    });

    m.on("error", (e: { error?: { message?: string } }) => {
      // Sem estilo não há mapa nenhum — quem chama que trate de mostrar outra coisa.
      if (!m.isStyleLoaded()) aoFalharRef.current?.();
      if (process.env.NODE_ENV !== "production") console.warn("globo:", e.error?.message);
    });

    /* Um estilo que carrega mas cujos tiles nunca chegam dá exactamente o
       mesmo que não ter mapa: uma bola preta. Passados oito segundos sem
       nada desenhado, entrega-se o ecrã ao globo de recurso. */
    const vigia = window.setTimeout(() => {
      if (!m.areTilesLoaded()) aoFalharRef.current?.();
    }, 8000);

    return () => {
      clearTimeout(vigia);
      for (const marca of marcas.current) marca.remove();
      marcas.current = [];
      m.remove();
      mapa.current = null;
    };
  }, []);

  // ── Os alfinetes ───────────────────────────────────────────────────────
  const desenharMarcas = useCallback(() => {
    const m = mapa.current;
    if (!m) return;
    for (const marca of marcas.current) marca.remove();

    marcas.current = pontos.map(({ c, coords }) => {
      const el = document.createElement("div");
      el.className = "alfinete";
      if (c.destaque) el.dataset.destaque = "";
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-label", `${c.nome}, ${c.localizacao}`);

      const rotulo = document.createElement("span");
      rotulo.className = "alfinete__rotulo";
      rotulo.innerHTML = `<strong></strong><em></em>`;
      rotulo.querySelector("strong")!.textContent = c.nome;
      rotulo.querySelector("em")!.textContent = c.localizacao;
      el.appendChild(rotulo);

      const abrir = () => aoClicar.current?.(c);
      el.addEventListener("click", abrir);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          abrir();
        }
      });

      // [lat, lon] cá dentro; o MapLibre quer [lon, lat].
      return new Marker({ element: el }).setLngLat([coords[1], coords[0]]).addTo(m);
    });
  }, [pontos]);

  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    if (m.isStyleLoaded()) desenharMarcas();
    else m.once("style.load", desenharMarcas);
  }, [desenharMarcas]);

  useEffect(() => {
    if (!flyTo || !mapa.current) return;
    mapa.current.flyTo({ center: [flyTo[1], flyTo[0]], zoom: 8.5, duration: 1400 });
  }, [flyTo]);

  return <div ref={caixa} className="globo-tiles h-full w-full" />;
}

/** O preto do fundo, lido do sistema em vez de escrito à mão. */
function token() {
  return (
    getComputedStyle(document.documentElement).getPropertyValue("--background").trim() || "#000"
  );
}
