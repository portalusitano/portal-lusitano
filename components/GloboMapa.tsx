"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoOrthographic, geoPath, geoGraticule10, geoCentroid } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";
import { resolverCoordenadas, type CoudelariaNoMapa } from "@/lib/coordenadas-coudelarias";

/*
 * Globo em projecção ortográfica, desenhado em canvas.
 *
 * O que aqui estava era um Leaflet sobre tiles do Carto — e os tiles vinham
 * com «API KEY REQUIRED» carimbado por cima do país inteiro. Um globo
 * desenhado por nós não depende de fornecedor nenhum, não pede chave e fica
 * exactamente na paleta do site: preto, hairlines frias, o acento reservado
 * ao que é raro.
 *
 * Sem ciclos infinitos: a rotação inicial é um movimento só, que corre uma
 * vez e pára em Portugal. Depois disso o globo só se mexe quando se lhe
 * pega.
 */

const CENTRO_PT: [number, number] = [-8.2, 39.5];

/* O globo sangra para fora da caixa: coubesse ele inteiro lá dentro, ficava
   um globo bonito e um mapa inútil — as vinte e tal coudelarias caíam todas
   dentro do mesmo punhado de pixéis. A entrada aproxima-se até à Península,
   que é onde estão os alfinetes, e a roda do rato afasta outra vez até ao
   planeta inteiro para quem quiser. */
const ZOOM_PT = 3.6;

function medir(caixa: HTMLElement) {
  return Math.min(caixa.clientWidth, caixa.clientHeight) * 0.86;
}

type Props = {
  coudelarias: CoudelariaNoMapa[];
  flyTo?: [number, number] | null;
  onMarkerClick?: (c: CoudelariaNoMapa) => void;
};

type Alfinete = {
  coudelaria: CoudelariaNoMapa;
  lonLat: [number, number];
};

/** Ruído determinista: as estrelas têm de sair iguais em cada pintura. */
function estrelas(quantas: number) {
  const pontos: { x: number; y: number; r: number; a: number }[] = [];
  let semente = 0x2f6e2b1;
  const proximo = () => {
    semente = (semente * 1103515245 + 12345) & 0x7fffffff;
    return semente / 0x7fffffff;
  };
  for (let i = 0; i < quantas; i++) {
    pontos.push({
      x: proximo(),
      y: proximo(),
      r: 0.4 + proximo() * 1.1,
      a: 0.15 + proximo() * 0.5,
    });
  }
  return pontos;
}

const ESTRELAS = estrelas(260);

/** Interpola dois ângulos pelo caminho curto, para o globo não dar a volta. */
function entreAngulos(de: number, para: number, t: number) {
  const d = ((para - de + 540) % 360) - 180;
  return de + d * t;
}

export default function GloboMapa({ coudelarias, flyTo, onMarkerClick }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const envolve = useRef<HTMLDivElement>(null);
  const [mundo, setMundo] = useState<FeatureCollection<Geometry, { name: string }> | null>(null);
  const [sobre, setSobre] = useState<{ x: number; y: number; nome: string; local: string } | null>(
    null
  );

  // Rotação, escala e alvo vivem em refs: mudam a 60 fps e não devem
  // provocar renderizações do React.
  const rotacao = useRef<[number, number]>([-CENTRO_PT[0], -CENTRO_PT[1]]);
  /* O raio é a medida da caixa vezes o zoom do utilizador. Guardá-lo assim
     — em vez de um número só — é o que permite ao redimensionamento da
     janela mexer na escala sem interromper a animação de entrada. */
  const raioBase = useRef(0);
  const zoom = useRef(ZOOM_PT);
  const escala = useRef(0);
  const aAnimar = useRef(false);
  const alfinetesVisiveis = useRef<{ x: number; y: number; alfinete: Alfinete }[]>([]);
  const quadro = useRef(0);

  const alfinetes = useMemo<Alfinete[]>(() => {
    const saida: Alfinete[] = [];
    for (const c of coudelarias) {
      const coords = resolverCoordenadas(c);
      if (!coords) continue;
      // O d3 fala em [lon, lat]; a lista está em [lat, lon].
      saida.push({ coudelaria: c, lonLat: [coords[1], coords[0]] });
    }
    return saida;
  }, [coudelarias]);

  useEffect(() => {
    let vivo = true;
    fetch("/mundo-110m.json")
      .then((r) => r.json())
      .then((topo: Topology) => {
        if (!vivo) return;
        const colecao = topo.objects.countries as GeometryCollection<{ name: string }>;
        setMundo(feature(topo, colecao) as FeatureCollection<Geometry, { name: string }>);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const pintar = useCallback(() => {
    const el = canvas.current;
    const caixa = envolve.current;
    if (!el || !caixa) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const largura = caixa.clientWidth;
    const altura = caixa.clientHeight;
    if (el.width !== largura * dpr || el.height !== altura * dpr) {
      el.width = largura * dpr;
      el.height = altura * dpr;
    }

    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, largura, altura);

    const cx = largura / 2;
    const cy = altura / 2;
    const raio = escala.current;

    const estilo = getComputedStyle(document.documentElement);
    const cor = (nome: string, omissao: string) => estilo.getPropertyValue(nome).trim() || omissao;
    const forte = cor("--foreground-strong", "#fff");
    const tenue = cor("--foreground-muted", "#8a8a8a");
    const ouro = cor("--gold", "#c6a15b");

    // ── Céu ──────────────────────────────────────────────────────────────
    for (const e of ESTRELAS) {
      ctx.globalAlpha = e.a;
      ctx.fillStyle = forte;
      ctx.beginPath();
      ctx.arc(e.x * largura, e.y * altura, e.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (!mundo || raio <= 0) return;

    const projeccao = geoOrthographic()
      .scale(raio)
      .translate([cx, cy])
      .rotate([rotacao.current[0], rotacao.current[1]])
      .clipAngle(90);
    const caminho = geoPath(projeccao, ctx);

    // ── Halo em volta do globo ───────────────────────────────────────────
    const halo = ctx.createRadialGradient(cx, cy, raio * 0.92, cx, cy, raio * 1.16);
    halo.addColorStop(0, "rgba(255,255,255,0.10)");
    halo.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, raio * 1.16, 0, Math.PI * 2);
    ctx.fill();

    // ── Oceano ───────────────────────────────────────────────────────────
    /* Duas demãos: primeiro o preto do fundo, opaco, senão as estrelas do céu
       viam-se através do planeta; só depois o tom frio por cima. */
    ctx.beginPath();
    caminho({ type: "Sphere" });
    ctx.fillStyle = cor("--background", "#000");
    ctx.fill();
    ctx.fillStyle = "rgba(214,235,253,0.035)";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(214,235,253,0.14)";
    ctx.stroke();

    // ── Meridianos e paralelos ───────────────────────────────────────────
    ctx.beginPath();
    caminho(geoGraticule10());
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = "rgba(214,235,253,0.05)";
    ctx.stroke();

    // ── Terra ────────────────────────────────────────────────────────────
    ctx.beginPath();
    caminho(mundo);
    ctx.fillStyle = "rgba(255,255,255,0.075)";
    ctx.fill();
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = "rgba(214,235,253,0.26)";
    ctx.stroke();

    // ── Nomes dos países que couberem ────────────────────────────────────
    ctx.font = "500 11px var(--font-geist-sans), system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const pais of mundo.features) {
      const centro = geoCentroid(pais);
      const p = projeccao(centro);
      if (!p) continue;
      // Não escrever o que está do outro lado do globo.
      const limites = caminho.bounds(pais);
      const largo = limites[1][0] - limites[0][0];
      if (!Number.isFinite(largo) || largo < 34) continue;
      const dist = Math.hypot(p[0] - cx, p[1] - cy);
      ctx.globalAlpha = 0.8 * Math.max(0, 1 - (dist / raio) ** 3);
      ctx.fillStyle = tenue;
      ctx.fillText(pais.properties.name, p[0], p[1]);
    }
    ctx.globalAlpha = 1;

    // ── Coudelarias ──────────────────────────────────────────────────────
    /* Branco para todas, dourado só para as que estão em destaque. Vinte e
       nove alfinetes dourados seguidos deixavam de assinalar seja o que for. */
    const visiveis: { x: number; y: number; alfinete: Alfinete }[] = [];
    for (const alfinete of alfinetes) {
      const p = projeccao(alfinete.lonLat);
      if (!p) continue;
      const destaque = alfinete.coudelaria.destaque;
      const r = destaque ? 4.5 : 3.2;

      ctx.beginPath();
      ctx.arc(p[0], p[1], r * 2.6, 0, Math.PI * 2);
      ctx.fillStyle = destaque ? `${ouro}22` : "rgba(255,255,255,0.10)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
      ctx.fillStyle = destaque ? ouro : forte;
      ctx.fill();

      visiveis.push({ x: p[0], y: p[1], alfinete });
    }
    alfinetesVisiveis.current = visiveis;
  }, [mundo, alfinetes]);

  const pedirPintura = useCallback(() => {
    if (aAnimar.current) return; // a entrada (ou um voo) está a pintar sozinha
    cancelAnimationFrame(quadro.current);
    quadro.current = requestAnimationFrame(pintar);
  }, [pintar]);

  /** Roda o globo até um ponto, num movimento só. */
  const irPara = useCallback(
    (lonLat: [number, number], instantaneo = false) => {
      const destino: [number, number] = [-lonLat[0], -lonLat[1]];
      if (instantaneo) {
        rotacao.current = destino;
        pedirPintura();
        return;
      }
      const partida: [number, number] = [...rotacao.current];
      const inicio = performance.now();
      const duracao = 900;
      aAnimar.current = true;
      const passo = (agora: number) => {
        const t = Math.min(1, (agora - inicio) / duracao);
        const e = 1 - Math.pow(1 - t, 3);
        rotacao.current = [
          entreAngulos(partida[0], destino[0], e),
          entreAngulos(partida[1], destino[1], e),
        ];
        pintar();
        if (t < 1) quadro.current = requestAnimationFrame(passo);
        else aAnimar.current = false;
      };
      cancelAnimationFrame(quadro.current);
      quadro.current = requestAnimationFrame(passo);
    },
    [pintar, pedirPintura]
  );

  // Entrada: o globo cresce e roda até Portugal, uma vez.
  useEffect(() => {
    if (!mundo) return;
    const caixa = envolve.current;
    if (!caixa) return;
    raioBase.current = medir(caixa);
    const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const destino: [number, number] = [-CENTRO_PT[0], -CENTRO_PT[1]];

    if (parado) {
      escala.current = raioBase.current * ZOOM_PT;
      rotacao.current = destino;
      pedirPintura();
      return;
    }

    /* Entra a rodar de oeste até Portugal, uma vez. Sem ciclo: o site tem
       dois e um terceiro precisaria de razão escrita. */
    const partida: [number, number] = [destino[0] + 62, destino[1] - 14];
    rotacao.current = partida;
    const inicio = performance.now();
    const duracao = 1400;
    aAnimar.current = true;
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      const e = 1 - Math.pow(1 - t, 3);
      // Começa com o planeta todo à vista e fecha sobre a Península.
      escala.current = raioBase.current * (1 + (ZOOM_PT - 1) * e);
      rotacao.current = [
        entreAngulos(partida[0], destino[0], e),
        entreAngulos(partida[1], destino[1], e),
      ];
      pintar();
      if (t < 1) quadro.current = requestAnimationFrame(passo);
      else aAnimar.current = false;
    };
    cancelAnimationFrame(quadro.current);
    quadro.current = requestAnimationFrame(passo);
    return () => {
      cancelAnimationFrame(quadro.current);
      aAnimar.current = false;
    };
  }, [mundo, pintar, pedirPintura]);

  useEffect(() => {
    const caixa = envolve.current;
    if (!caixa) return;
    const observador = new ResizeObserver(() => {
      raioBase.current = medir(caixa);
      if (!aAnimar.current && escala.current > 0) {
        escala.current = raioBase.current * zoom.current;
      }
      pedirPintura();
    });
    observador.observe(caixa);
    return () => observador.disconnect();
  }, [pedirPintura]);

  useEffect(() => {
    if (flyTo) irPara([flyTo[1], flyTo[0]]);
  }, [flyTo, irPara]);

  // ── Arrastar para rodar ────────────────────────────────────────────────
  const arrasto = useRef<{ x: number; y: number; rot: [number, number] } | null>(null);

  const aoDescer = (e: React.PointerEvent) => {
    arrasto.current = { x: e.clientX, y: e.clientY, rot: [...rotacao.current] };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  /* O passar do rato e o clique têm de concordar. Escolhiam de maneira
     diferente — o clique ficava-se pelo primeiro alfinete a menos de 12px e
     o rato pelo mais próximo —, e com coudelarias vizinhas a legenda dizia
     uma e o clique abria outra. */
  const alfineteEm = (x: number, y: number) => {
    let perto: { d: number; item: (typeof alfinetesVisiveis.current)[number] } | null = null;
    for (const item of alfinetesVisiveis.current) {
      const d = Math.hypot(item.x - x, item.y - y);
      if (d < 12 && (!perto || d < perto.d)) perto = { d, item };
    }
    return perto?.item ?? null;
  };

  const aoMover = (e: React.PointerEvent) => {
    const caixa = envolve.current;
    if (!caixa) return;
    const r = caixa.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    if (arrasto.current) {
      const k = 0.28 * (250 / Math.max(60, escala.current));
      const dx = (e.clientX - arrasto.current.x) * k;
      const dy = (e.clientY - arrasto.current.y) * k;
      rotacao.current = [
        arrasto.current.rot[0] + dx,
        Math.max(-80, Math.min(80, arrasto.current.rot[1] - dy)),
      ];
      setSobre(null);
      pedirPintura();
      return;
    }

    const item = alfineteEm(x, y);
    if (item) {
      setSobre({
        x: item.x,
        y: item.y,
        nome: item.alfinete.coudelaria.nome,
        local: item.alfinete.coudelaria.localizacao,
      });
    } else if (sobre) {
      setSobre(null);
    }
  };

  const aoSubir = () => {
    arrasto.current = null;
  };

  const aoClicar = (e: React.MouseEvent) => {
    const caixa = envolve.current;
    if (!caixa || !onMarkerClick) return;
    const r = caixa.getBoundingClientRect();
    const item = alfineteEm(e.clientX - r.left, e.clientY - r.top);
    if (item) onMarkerClick(item.alfinete.coudelaria);
  };

  const aoRodar = (e: React.WheelEvent) => {
    zoom.current = Math.max(0.9, Math.min(9, zoom.current * (e.deltaY > 0 ? 0.9 : 1.1)));
    escala.current = raioBase.current * zoom.current;
    pedirPintura();
  };

  return (
    <div
      ref={envolve}
      className="relative h-full w-full touch-none select-none"
      onPointerDown={aoDescer}
      onPointerMove={aoMover}
      onPointerUp={aoSubir}
      onPointerLeave={() => {
        aoSubir();
        setSobre(null);
      }}
      onClick={aoClicar}
      onWheel={aoRodar}
      style={{ cursor: sobre ? "pointer" : "grab" }}
    >
      <canvas ref={canvas} className="block h-full w-full" aria-hidden="true" />

      {sobre && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border px-2.5 py-1.5"
          style={{
            left: sobre.x,
            top: sobre.y - 10,
            borderColor: "var(--border-soft)",
            background: "var(--background-elevated)",
          }}
        >
          <p className="whitespace-nowrap text-[11px] font-medium text-[var(--foreground-strong)]">
            {sobre.nome}
          </p>
          <p className="whitespace-nowrap text-[10px] text-[var(--foreground-muted)]">
            {sobre.local}
          </p>
        </div>
      )}

      {/* O canvas é uma imagem; quem usa teclado ou leitor de ecrã navega
          pela lista, que tem exactamente as mesmas coudelarias. */}
      <p className="sr-only">
        Globo com {alfinetes.length} coudelarias. A mesma informação está na vista de lista.
      </p>
    </div>
  );
}
