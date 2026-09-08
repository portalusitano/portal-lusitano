"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { geoOrthographic, geoPath, geoGraticule10 } from "d3-geo";
import type { GeoPath, GeoPermissibleObjects, GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry, MultiLineString } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";
import { Minus, Plus } from "lucide-react";
import { resolverCoordenadas, type CoudelariaNoMapa } from "@/lib/coordenadas-coudelarias";

/*
 * O mapa das coudelarias — o do directório e o da ficha. Um só motor.
 *
 * Havia três motores de mapa neste site: o `<GloboTerra>` da `/mapa`, que o
 * CLAUDE.md documenta ao pormenor e declara como «o mapa da página /mapa, e
 * não há outro», e mais dois aqui — um globo de tiles do MapLibre sobre o
 * OpenFreeMap e um globo desenhado em canvas, com um despachante a tentar o
 * primeiro e a cair para o segundo.
 *
 * Medido no browser, com os tiles a responder, abrir o mapa do directório
 * custava **1 556 310 bytes** em 120 pedidos, 114 deles a um servidor lá
 * fora; a ficha, para mostrar **um** alfinete num painel de 220px, custava
 * 1 621 402. E o MapLibre registava um `touchstart` em `window` com
 * `passive: false` — precisamente o ouvinte que proíbe o browser de deslocar
 * a página no compositor, a mesma armadilha que fez o Lenis sair daqui,
 * agora vinda de dentro de uma dependência e a valer para a página toda, não
 * só para o mapa.
 *
 * Com o servidor de tiles inalcançável — rede fechada, bloqueio pelo
 * caminho, o «API KEY REQUIRED» que motivou este ecrã —, o caminho de
 * recurso disparava e custava **1 987 601 bytes**: o MapLibre inteiro
 * descarregado e deitado fora, mais oito segundos de vigia, e só então os
 * 195 178 bytes do segundo motor. O plano B saía mais caro do que os dois
 * planos A somados.
 *
 * Ficou este. Não depende de servidor nenhum, não abre worker, não pede
 * WebGL e não regista um único ouvinte não passivo. O que perdeu — ruas e
 * nomes de aldeia — nunca foi o que este painel mostra: mostra onde estão as
 * coudelarias. Para chegar lá, a ficha tem o «Como chegar», que abre a
 * aplicação de mapas do telefone com a rota feita; e quem quer o mapa a
 * sério tem o `/mapa` no botão ao lado.
 *
 * O que se corrigiu para isto poder ficar de pé:
 *
 *  - **O enquadramento sai dos dados.** Era um zoom fixo que punha Portugal
 *    a ocupar dois por cento do quadro e as vinte e nove numa mancha de dez
 *    pixéis — um globo bonito e um mapa inútil. Agora mede-se a caixa dos
 *    alfinetes e enquadra-se nela, sejam vinte e nove (o directório) ou um
 *    só (a ficha).
 *  - **Portugal a 1:10m.** A 1:110m tem 33 pontos: é um polígono, não um
 *    país. Enquadrado a preencher o painel lia-se como um erro de desenho.
 *  - **O laço de pintura deixou de refazer o que não muda** — ver `pintar`,
 *    `pintarCeu` e `GRELHA`.
 *
 * E o que se corrigiu depois, com os números ao lado — cada um tem a razão
 * escrita no sítio onde está:
 *
 *  - **Os nomes dos países nunca foram escritos na Geist.** O `ctx.font` levava
 *    um `var(--font-geist-sans)`, que o canvas não sabe ler e descarta em
 *    silêncio; ficava a fonte de origem, `10px sans-serif`. A variável nem
 *    existe — no `layout.tsx` chama-se `--font-geist`. Ver `letra`.
 *  - **Vinte dos vinte e nove alfinetes eram dourados.** Um acento em 69% dos
 *    pontos é a cor do mapa, não um acento; e o `<GloboTerra>` já tinha feito
 *    esta conta com os mesmos dados. Ver a secção «Coudelarias» do `pintar`.
 *  - **A legenda saía do painel, que corta.** 1 de 29 a 390×700 em repouso e
 *    9 de 27 depois de aproximar. Ver `encaixe`.
 *  - **Os botões de aproximar não eram os do outro globo** e não se apagavam
 *    ao fim do curso. Ver `curso` e `.globo-comando`.
 *  - **O texto alternativo mentia na ficha**: «Globo com 1 coudelarias. A
 *    mesma informação está na vista de lista» — e na ficha não há lista.
 *
 * E o que se tentou e não entrou, para não voltar a ser tentado às cegas: uma
 * regra a calar o nome do país quando um alfinete lhe caísse em cima. Medida,
 * não disparava uma única vez — ver o comentário nos «Nomes dos países».
 */

/* Um alfinete só — a ficha de uma coudelaria — não tem caixa. Dá-se-lhe esta
   vizinhança em graus, que é onde a localidade se lê com o país à volta. */
const GRAUS_DE_UM_SO = 3.2;
/** Folga à volta dos alfinetes, em fracção do lado da caixa. */
const FOLGA = 1.45;
/** Quanto se pode aproximar e afastar, em múltiplos do enquadramento. */
const AFASTAR_MAX = 0.06;
const APROXIMAR_MAX = 6;

type Rotulo = { nome: string; lon: number; lat: number; dLon: number };
type Geo = {
  mundo: FeatureCollection<Geometry>;
  iberia: FeatureCollection<Geometry>;
  rotulos: Rotulo[];
};

type Props = {
  coudelarias: CoudelariaNoMapa[];
  flyTo?: [number, number] | null;
  onMarkerClick?: (c: CoudelariaNoMapa) => void;
};

type Alfinete = { coudelaria: CoudelariaNoMapa; lonLat: [number, number] };

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

/* Os meridianos e paralelos são sempre os mesmos — cerca de dez mil pontos
   que não mudam. `geoGraticule10()` monta-os de novo a cada chamada, e estava
   a ser chamado **dentro** do laço de pintura: uma alocação de dez mil pontos
   por quadro, a deitar fora no quadro seguinte. Aqui é uma constante. */
const GRELHA: MultiLineString = geoGraticule10();

/** Radianos por grau. */
const GRAU = Math.PI / 180;

/** Interpola dois ângulos pelo caminho curto, para o globo não dar a volta. */
function entreAngulos(de: number, para: number, t: number) {
  const d = ((para - de + 540) % 360) - 180;
  return de + d * t;
}

export default function GloboMapa({ coudelarias, flyTo, onMarkerClick }: Props) {
  const lona = useRef<HTMLCanvasElement>(null);
  const envolve = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [sobre, setSobre] = useState<{ x: number; y: number; nome: string; local: string } | null>(
    null
  );

  // Rotação, escala e alvo vivem em refs: mudam a 60 fps e não devem
  // provocar renderizações do React.
  const rotacao = useRef<[number, number]>([8.2, -39.5]);
  const raioBase = useRef(0);
  const zoom = useRef(1);
  const zoomInicial = useRef(1);
  const escala = useRef(0);
  const aAnimar = useRef(false);
  const alfinetesVisiveis = useRef<{ x: number; y: number; alfinete: Alfinete }[]>([]);
  const quadro = useRef(0);
  const sobreAgora = useRef<string | null>(null);

  /* As cores são tokens do `globals.css` e não mudam enquanto a página vive.
     Liam-se com um `getComputedStyle` mais quatro `getPropertyValue` **por
     quadro** — pedir ao browser o estilo calculado a 60 Hz, dentro do laço de
     desenho. Aqui leem-se uma vez, quando o componente monta. */
  const cores = useRef({ forte: "#fff", tenue: "#8a8a8a", fundo: "#000" });

  /* O tipo de letra dos nomes dos países.

     Estava escrito `"500 11px var(--font-geist-sans), system-ui, sans-serif"`,
     e o canvas **não sabe o que é um `var()`**: a gramática do `ctx.font` é a
     do `font` do CSS depois de as variáveis estarem resolvidas, e uma
     atribuição que não faz o parse é descartada em silêncio — o contexto fica
     com a que tinha. Medido no browser: pedida aquela cadeia, o `ctx.font`
     respondia `"10px sans-serif"`, que é o valor de origem de um canvas
     acabado de criar. Os nomes dos países deste mapa nunca foram escritos na
     Geist nem a 11px; eram a fonte de omissão do browser a 10px. «Portugal»
     media 37,2px em vez de 45,6px.

     A variável nem existia, ainda por cima: no `layout.tsx` chama-se
     `--font-geist`. Em vez de a copiar — um nome de variável copiado é um
     nome que ninguém actualiza — lê-se a família **já resolvida** do próprio
     `body`, que é a mesma cadeia que o resto do site usa. Uma leitura, à
     montagem. */
  const letra = useRef("11px system-ui, sans-serif");

  /* A lona das estrelas: pintada uma vez por tamanho e copiada com um
     `drawImage`. Eram 260 `arc()` com `fill()` a cada quadro para desenhar um
     céu que nunca muda. */
  const ceu = useRef<HTMLCanvasElement | null>(null);
  const ceuTamanho = useRef("");

  /* A projecção e o caminho montam-se uma vez, não a cada quadro. Um
     `geoOrthographic()` novo por quadro é uma dúzia de fechos a construir e a
     deitar fora sessenta vezes por segundo; o que muda de facto entre quadros
     são três números — escala, centro e rotação —, e esses escrevem-se na
     mesma projecção. O contexto do canvas é o mesmo objecto em cada
     `getContext`, por isso o caminho também se aproveita. */
  const projeccaoRef = useRef<GeoProjection | null>(null);
  const caminhoRef = useRef<GeoPath<unknown, GeoPermissibleObjects> | null>(null);

  /* A caixa do elemento em coordenadas da janela. Era lida com um
     `getBoundingClientRect` **a cada `pointermove`**: uma leitura forçada de
     layout por cada pixel percorrido com o rato em cima. Fica em cache, e só
     se remede depois de alguma coisa a poder ter mudado. */
  const caixa = useRef<DOMRect | null>(null);
  const caixaSuja = useRef(true);

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

  /* O enquadramento sai dos alfinetes: o centro da caixa deles e quantos
     graus é preciso caber. */
  const enquadramento = useMemo(() => {
    if (alfinetes.length === 0) return { centro: [-8.2, 39.5] as [number, number], graus: 6 };
    let oeste = 180;
    let este = -180;
    let sul = 90;
    let norte = -90;
    for (const a of alfinetes) {
      oeste = Math.min(oeste, a.lonLat[0]);
      este = Math.max(este, a.lonLat[0]);
      sul = Math.min(sul, a.lonLat[1]);
      norte = Math.max(norte, a.lonLat[1]);
    }
    const centro: [number, number] = [(oeste + este) / 2, (sul + norte) / 2];
    /* Um grau de longitude a 39° de latitude vale 0,78 de um grau de
       latitude. Sem o cosseno, um conjunto largo e baixo enquadrava-se de
       mais e os alfinetes das pontas saíam do painel. */
    const largura = (este - oeste) * Math.cos(centro[1] * GRAU);
    return { centro, graus: Math.max(GRAUS_DE_UM_SO, largura, norte - sul) };
  }, [alfinetes]);

  /* A assinatura é o que faz a entrada correr **uma vez**. O enquadramento é
     um objecto novo a cada renderização do pai — e a ficha passa
     `coudelarias={[{…}]}` escrito à mão —, por isso um efeito que dependesse
     dele voltava a disparar o voo de entrada a cada renderização. Depende
     desta cadeia, que só muda quando os alfinetes mudam mesmo. */
  const assinatura = useMemo(
    () =>
      `${enquadramento.centro[0].toFixed(4)},${enquadramento.centro[1].toFixed(4)},${enquadramento.graus.toFixed(4)}`,
    [enquadramento]
  );
  const enquadramentoRef = useRef(enquadramento);
  useEffect(() => {
    enquadramentoRef.current = enquadramento;
  });

  useEffect(() => {
    let vivo = true;
    fetch("/mapa-directorio.json")
      .then((r) => r.json())
      .then((dados: { mundo: Topology; iberia: Geo["iberia"]; rotulos: Rotulo[] }) => {
        if (!vivo) return;
        const colecao = dados.mundo.objects.countries as GeometryCollection;
        setGeo({
          mundo: feature(dados.mundo, colecao) as FeatureCollection<Geometry>,
          iberia: dados.iberia,
          rotulos: dados.rotulos,
        });
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    const estilo = getComputedStyle(document.documentElement);
    const cor = (nome: string, omissao: string) => estilo.getPropertyValue(nome).trim() || omissao;
    cores.current = {
      forte: cor("--foreground-strong", "#fff"),
      tenue: cor("--foreground-muted", "#8a8a8a"),
      fundo: cor("--background", "#000"),
    };

    /* A família sai do `body` já resolvida — é a cadeia que o site inteiro
       usa, com a Geist à frente. Peso 400: a regra da casa é que 400 chega
       para quase tudo, e um nome de país sussurrado a cinzento é justamente
       o sítio onde não se pede peso. */
    const familia = getComputedStyle(document.body).fontFamily;
    if (familia) letra.current = `400 11px ${familia}`;
  }, []);

  /** O céu, pintado uma vez por tamanho. */
  const pintarCeu = useCallback((largura: number, altura: number, dpr: number) => {
    const chave = `${largura}x${altura}x${dpr}`;
    if (ceuTamanho.current === chave && ceu.current) return ceu.current;
    const el = ceu.current ?? document.createElement("canvas");
    el.width = Math.max(1, Math.round(largura * dpr));
    el.height = Math.max(1, Math.round(altura * dpr));
    const ctx = el.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = cores.current.forte;
    for (const e of ESTRELAS) {
      ctx.globalAlpha = e.a;
      ctx.beginPath();
      ctx.arc(e.x * largura, e.y * altura, e.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ceu.current = el;
    ceuTamanho.current = chave;
    return el;
  }, []);

  const pintar = useCallback(() => {
    const el = lona.current;
    const envolvente = envolve.current;
    if (!el || !envolvente) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const largura = envolvente.clientWidth;
    const altura = envolvente.clientHeight;
    const largPx = Math.round(largura * dpr);
    const altPx = Math.round(altura * dpr);
    if (el.width !== largPx || el.height !== altPx) {
      el.width = largPx;
      el.height = altPx;
    }

    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, largura, altura);

    const cx = largura / 2;
    const cy = altura / 2;
    const raio = escala.current;
    const { forte, tenue, fundo } = cores.current;

    // ── Céu ──────────────────────────────────────────────────────────────
    const estrelado = pintarCeu(largura, altura, dpr);
    if (estrelado) ctx.drawImage(estrelado, 0, 0, largura, altura);

    if (!geo || raio <= 0) return;

    if (!projeccaoRef.current || !caminhoRef.current) {
      projeccaoRef.current = geoOrthographic().clipAngle(90);
      caminhoRef.current = geoPath(projeccaoRef.current, ctx);
    }
    const projeccao = projeccaoRef.current;
    const caminho = caminhoRef.current;
    projeccao.scale(raio).translate([cx, cy]).rotate([rotacao.current[0], rotacao.current[1]]);

    /* O `clipAngle(90)` corta os **caminhos**, não os pontos: `projeccao([lon,
       lat])` devolve coordenadas mesmo para quem está do outro lado do
       planeta, espelhado por cima do nosso lado. Foi assim que a Nova
       Zelândia apareceu escrita a sul do Algarve. Quem decide é a conta que
       o corte faria: o cosseno da distância angular ao centro da vista. */
    const lonCentro = -rotacao.current[0] * GRAU;
    const latCentro = -rotacao.current[1] * GRAU;
    const senoCentro = Math.sin(latCentro);
    const cosCentro = Math.cos(latCentro);
    const daNossaBanda = (lon: number, lat: number) => {
      const fi = lat * GRAU;
      return (
        senoCentro * Math.sin(fi) + cosCentro * Math.cos(fi) * Math.cos(lon * GRAU - lonCentro) > 0
      );
    };

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
    ctx.fillStyle = fundo;
    ctx.fill();
    ctx.fillStyle = "rgba(214,235,253,0.035)";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(214,235,253,0.14)";
    ctx.stroke();

    // ── Meridianos e paralelos ───────────────────────────────────────────
    ctx.beginPath();
    caminho(GRELHA);
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = "rgba(214,235,253,0.05)";
    ctx.stroke();

    // ── Terra ────────────────────────────────────────────────────────────
    /* O mundo a 110m dá o contexto e a Ibéria vem a 10m por cima. Não se
       sobrepõem: Portugal e Espanha saem da malha grosseira ao montar o
       ficheiro, senão ficavam dois países no mesmo sítio e o grosseiro
       espreitava por fora do fino com esporões de dois pixéis. */
    ctx.lineWidth = 0.7;
    ctx.fillStyle = "rgba(255,255,255,0.075)";
    ctx.strokeStyle = "rgba(214,235,253,0.26)";
    ctx.beginPath();
    caminho(geo.mundo);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    caminho(geo.iberia);
    ctx.fill();
    ctx.stroke();

    // ── Nomes dos países que couberem ────────────────────────────────────
    /* Os centróides vêm contados do ficheiro. Aqui corriam `geoCentroid` e
       `geoPath.bounds` para os 177 países **a cada quadro**: duas passagens
       completas por dez mil pontos, além da do desenho, para escrever meia
       dúzia de nomes. Quantos pixéis o país ocupa estima-se da largura em
       graus — que também vem do ficheiro — encolhida pelo cosseno da
       latitude, que é o que a projecção lhe faz.

       Chegou a haver aqui uma regra a calar o nome do país quando um alfinete
       lhe caísse em cima, escrita a pensar na ficha — onde o centróide de
       Portugal e a coudelaria enquadrada ficam por força perto. Mediu-se, e a
       regra **nunca disparava**: para a Alter Real, que é o caso apertado, o
       nome fica 18,4px acima e 13,6px ao lado do ponto, ou seja ao lado e não
       por cima. Uma guarda que não se prova é código morto com um limiar
       inventado lá dentro, e saiu. Fica escrito para o próximo não a
       reescrever sem medir primeiro. */
    ctx.font = letra.current;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = tenue;
    for (const r of geo.rotulos) {
      const largo = r.dLon * GRAU * raio * Math.cos(r.lat * GRAU);
      if (largo < 34) continue;
      if (!daNossaBanda(r.lon, r.lat)) continue;
      const p = projeccao([r.lon, r.lat]);
      if (!p) continue;
      const dist = Math.hypot(p[0] - cx, p[1] - cy);
      ctx.globalAlpha = 0.8 * Math.max(0, 1 - (dist / raio) ** 3);
      ctx.fillText(r.nome, p[0], p[1]);
    }
    ctx.globalAlpha = 1;

    // ── Coudelarias ──────────────────────────────────────────────────────
    /* Branco em todos os casos, e o dourado em nenhum.

       O comentário que aqui estava dizia «dourado só para as que estão em
       destaque» e justificava-se com «vinte e nove alfinetes dourados
       seguidos deixavam de assinalar seja o que for» — mas ninguém contou os
       que a base traz. Medido nas vinte e nove verdadeiras: **vinte têm
       `destaque`**, ou seja sessenta e nove por cento do mapa era dourado. Um
       acento em dois terços dos pontos não é um acento; é a cor do mapa, e a
       regra da casa é explícita — «num distintivo que aparece em quase todos
       os cartões de uma grelha usa-se o branco».

       O `<GloboTerra>` já tinha chegado aqui, com estes mesmos dados e com
       esta mesma conta escrita no ficheiro dele: «os alfinetes em destaque
       eram vinte e um dos vinte e nove: um acento em setenta e dois por cento
       dos pontos não assinala nada». Duas leituras da mesma tabela não podem
       dar duas respostas — quem for do directório para o `/mapa` veria dois
       mapas do mesmo país a dizer coisas diferentes sobre as mesmas
       coudelarias.

       O destaque fica onde ele o pôs: no **tamanho** do ponto, que é a
       hierarquia mais fraca de propósito. Sobre preto quem assinala é o
       contraste. */
    const visiveis: { x: number; y: number; alfinete: Alfinete }[] = [];
    for (const alfinete of alfinetes) {
      // Pela mesma razão dos nomes: um alfinete do outro lado do planeta
      // ainda tem coordenadas, e apareceria espelhado sobre este lado.
      if (!daNossaBanda(alfinete.lonLat[0], alfinete.lonLat[1])) continue;
      const p = projeccao(alfinete.lonLat);
      if (!p) continue;
      const r = alfinete.coudelaria.destaque ? 4 : 3.2;

      // O halo que já cá estava para quem não tinha destaque, agora para
      // todos: dá presença ao ponto sobre o cinzento da terra.
      ctx.beginPath();
      ctx.arc(p[0], p[1], r * 2.6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
      ctx.fillStyle = forte;
      ctx.fill();

      visiveis.push({ x: p[0], y: p[1], alfinete });
    }
    alfinetesVisiveis.current = visiveis;
  }, [geo, alfinetes, pintarCeu]);

  const pedirPintura = useCallback(() => {
    if (aAnimar.current) return; // a entrada (ou um voo) está a pintar sozinha
    cancelAnimationFrame(quadro.current);
    quadro.current = requestAnimationFrame(pintar);
  }, [pintar]);

  /** Roda o globo até um ponto, num movimento só. */
  const irPara = useCallback(
    (lonLat: [number, number]) => {
      const destino: [number, number] = [-lonLat[0], -lonLat[1]];
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
    [pintar]
  );

  /* O laço de pintura visto por referência.
     A `assinatura` existe para a entrada correr **uma vez** — está escrito
     aqui em cima —, e não corria: o efeito da entrada dependia também de
     `pintar`, e `pintar` muda de identidade sempre que `alfinetes` muda, que
     é sempre que quem nos chama passa um array novo. No directório isso é a
     cada filtro, a cada ordenação e a cada página: o globo voltava a partir
     de 48° a oeste e refazia o voo de 1400ms, a meio de uma lista que a
     pessoa estava a percorrer — e a entrada, que só se lê como entrada
     porque acontece uma vez, passava a acontecer a cada gesto.

     A cura é a mesma que o `irPara` aqui em baixo já usa: o efeito lê a
     função pela referência e deixa de a ter nas dependências. Quem manda na
     entrada volta a ser só a geometria e o enquadramento. */
  const pintarRef = useRef(pintar);
  const pedirPinturaRef = useRef(pedirPintura);
  useEffect(() => {
    pintarRef.current = pintar;
    pedirPinturaRef.current = pedirPintura;
  });

  /* Uma fonte que o documento ainda não desenhou não está disponível para o
     canvas — e o canvas, ao contrário do texto em HTML, **não repinta sozinho
     quando ela chega**: fica com a substituta para sempre, porque este mapa
     desenha uma vez e depois só a pedido.

     O `check` primeiro, e não só o `load`: quando a Geist já está no
     documento — que é o caso normal, porque a página inteira está escrita
     nela antes de alguém abrir o mapa — não há nada a esperar nem nada a
     repintar. Só quando falta é que se pede, e aí é **uma** repintura, não um
     ciclo: a promessa resolve uma vez. */
  useEffect(() => {
    const fontes = document.fonts;
    if (!fontes || fontes.check(letra.current)) return;
    let vivo = true;
    fontes
      .load(letra.current, "Portugal")
      .then(() => {
        if (vivo) pedirPinturaRef.current();
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  // Entrada: o globo fecha-se sobre os alfinetes, uma vez.
  useEffect(() => {
    if (!geo) return;
    const envolvente = envolve.current;
    if (!envolvente) return;
    const { centro, graus } = enquadramentoRef.current;
    raioBase.current = Math.min(envolvente.clientWidth, envolvente.clientHeight) * 0.86;

    /* Quantas vezes o raio da caixa cabe no globo para os graus pedidos: o
       arco de `graus` a preencher o lado curto da caixa, com folga. */
    const arco = Math.max(0.5, graus * FOLGA) * GRAU;
    const zoomFinal = 1 / (0.86 * arco);
    zoomInicial.current = zoomFinal;
    zoom.current = zoomFinal;

    const destino: [number, number] = [-centro[0], -centro[1]];
    /* O enquadramento fica escrito **já**, e não só no primeiro quadro da
       animação. A escala só era posta lá dentro, e na ficha o `flyTo` chega
       primeiro: cancelava a entrada antes de ela correr um quadro, a escala
       ficava a zero e o painel mostrava as estrelas e mais nada. O que a
       entrada anima é o caminho até aqui — se a interromperem, o destino já
       está posto. */
    escala.current = raioBase.current * zoomFinal;
    const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (parado) {
      rotacao.current = destino;
      pedirPinturaRef.current();
      return;
    }

    /* Entra a rodar de oeste e a fechar sobre os alfinetes, uma vez. Sem
       ciclo: o site conta os que tem, e cada um custa uma razão escrita. */
    const partida: [number, number] = [destino[0] + 48, destino[1] - 12];
    rotacao.current = partida;
    const inicio = performance.now();
    const duracao = 1400;
    aAnimar.current = true;
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      const e = 1 - Math.pow(1 - t, 3);
      // Começa com o planeta todo à vista e fecha sobre o que interessa.
      escala.current = raioBase.current * (1 + (zoomFinal - 1) * e);
      rotacao.current = [
        entreAngulos(partida[0], destino[0], e),
        entreAngulos(partida[1], destino[1], e),
      ];
      pintarRef.current();
      if (t < 1) quadro.current = requestAnimationFrame(passo);
      else aAnimar.current = false;
    };
    cancelAnimationFrame(quadro.current);
    quadro.current = requestAnimationFrame(passo);
    return () => {
      cancelAnimationFrame(quadro.current);
      aAnimar.current = false;
    };
    /* `assinatura` é o enquadramento reduzido a texto — ver acima porquê —, e
       `pintar`/`pedirPintura` saíram daqui de propósito: eram eles que faziam
       a entrada repetir-se a cada filtro do directório. */
  }, [geo, assinatura]);

  /* Tirar `pintar` das dependências da entrada tirou de lá, de caminho, a
     única coisa que repintava quando os alfinetes mudavam sem o
     enquadramento mudar — filtrar uma lista de vinte e nove para quinze
     costuma deixar a caixa deles onde estava. Repintar é o que essa mudança
     pede; repetir o voo de 1400ms não é. */
  useEffect(() => {
    pedirPintura();
  }, [pintar, pedirPintura]);

  useEffect(() => {
    const envolvente = envolve.current;
    if (!envolvente) return;
    const observador = new ResizeObserver(() => {
      raioBase.current = Math.min(envolvente.clientWidth, envolvente.clientHeight) * 0.86;
      caixaSuja.current = true;
      /* Sem a condição do `escala > 0` de propósito: um painel que monta com
         a caixa a zero — escondido, ainda por medir — ficava preso a uma
         escala de zero, que é o mesmo que ficar sem globo. */
      if (!aAnimar.current) escala.current = raioBase.current * zoom.current;
      pedirPintura();
    });
    observador.observe(envolvente);
    return () => observador.disconnect();
  }, [pedirPintura]);

  /* A caixa muda de sítio quando a página desliza. O ouvinte é passivo e não
     lê layout nenhum — só marca a medida como velha; quem a remede é o
     próximo evento do ponteiro, se houver. Medir a cada deslocamento era o
     que punha milhares de leituras forçadas de layout noutras páginas. */
  useEffect(() => {
    const envelhecer = () => {
      caixaSuja.current = true;
    };
    window.addEventListener("scroll", envelhecer, { passive: true });
    window.addEventListener("resize", envelhecer, { passive: true });
    return () => {
      window.removeEventListener("scroll", envelhecer);
      window.removeEventListener("resize", envelhecer);
    };
  }, []);

  /* O voo depende das coordenadas, não da identidade da função nem do array.
     A ficha passa `flyTo={[lat, lng]}` escrito no JSX — um array novo a cada
     renderização —, e `irPara` muda de identidade sempre que a geometria
     chega. Com os dois nas dependências, o voo repetia-se por tudo e por
     nada. */
  const irParaRef = useRef(irPara);
  useEffect(() => {
    irParaRef.current = irPara;
  });
  const lat = flyTo?.[0];
  const lon = flyTo?.[1];
  useEffect(() => {
    if (typeof lat === "number" && typeof lon === "number") irParaRef.current([lon, lat]);
  }, [lat, lon]);

  // ── Arrastar para rodar ────────────────────────────────────────────────
  const arrasto = useRef<{ x: number; y: number; rot: [number, number] } | null>(null);
  const arrastou = useRef(false);

  const medirCaixa = () => {
    if (caixaSuja.current || !caixa.current) {
      const envolvente = envolve.current;
      if (!envolvente) return null;
      caixa.current = envolvente.getBoundingClientRect();
      caixaSuja.current = false;
    }
    return caixa.current;
  };

  const aoDescer = (e: React.PointerEvent) => {
    arrasto.current = { x: e.clientX, y: e.clientY, rot: [...rotacao.current] };
    arrastou.current = false;
  };

  /* O passar do rato e o clique têm de concordar. Escolhiam de maneira
     diferente — o clique ficava-se pelo primeiro alfinete a menos de 12px e
     o rato pelo mais próximo —, e com coudelarias vizinhas a legenda dizia
     uma e o clique abria outra. */
  const alfineteEm = (x: number, y: number) => {
    let perto: { d: number; item: (typeof alfinetesVisiveis.current)[number] } | null = null;
    for (const item of alfinetesVisiveis.current) {
      const d = Math.hypot(item.x - x, item.y - y);
      if (d < 14 && (!perto || d < perto.d)) perto = { d, item };
    }
    return perto?.item ?? null;
  };

  const aoMover = (e: React.PointerEvent) => {
    const r = medirCaixa();
    if (!r) return;

    if (arrasto.current) {
      const dxCru = e.clientX - arrasto.current.x;
      const dyCru = e.clientY - arrasto.current.y;
      /* O ponteiro só se agarra a partir dos três pixéis: com
         `setPointerCapture` logo no `pointerdown`, o browser entrega o
         `click` à lona e carregar num alfinete deixa de abrir nada. Um
         clique nunca chega a pedir a captura. */
      if (!arrastou.current && Math.abs(dxCru) + Math.abs(dyCru) > 3) {
        arrastou.current = true;
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      }
      if (!arrastou.current) return;
      const k = 0.28 * (250 / Math.max(60, escala.current));
      rotacao.current = [
        arrasto.current.rot[0] + dxCru * k,
        Math.max(-80, Math.min(80, arrasto.current.rot[1] - dyCru * k)),
      ];
      if (sobreAgora.current) {
        sobreAgora.current = null;
        setSobre(null);
      }
      pedirPintura();
      return;
    }

    const item = alfineteEm(e.clientX - r.left, e.clientY - r.top);
    /* Só se troca o estado do React quando muda o alfinete debaixo do rato.
       Antes era uma renderização por cada pixel percorrido com o rato. */
    const chave = item ? item.alfinete.coudelaria.id : null;
    if (chave === sobreAgora.current) return;
    sobreAgora.current = chave;
    setSobre(
      item
        ? {
            x: item.x,
            y: item.y,
            nome: item.alfinete.coudelaria.nome,
            local: item.alfinete.coudelaria.localizacao,
          }
        : null
    );
  };

  /* A legenda tem de caber no painel.

     Estava colada ao alfinete e mais nada: `left: x` com `-translate-x-1/2` e
     `top: y - 10` com `-translate-y-full`. O painel corta (`overflow-hidden`),
     por isso um alfinete perto de uma borda dava meia legenda — e é sempre a
     metade de fora que leva o nome, porque o texto está centrado.

     Medido a passar o rato por todos os alfinetes: a 1400×950 em repouso
     saíam **0 de 29** (foi por isso que ninguém deu por ela), mas a 390×700
     saía **1 de 29** logo em repouso, e depois de carregar três vezes no `+`
     — que é o gesto para que os dois botões existem — saíam **9 de 27** no
     telemóvel e **1 de 24** no computador. O pior caso ia 107,7px para fora
     da borda esquerda: a legenda ficava reduzida a um canto de caixa.

     A correcção é medir a caixa depois de ela existir e empurrá-la para
     dentro; se não couber por cima do alfinete, passa para baixo. Uma leitura
     de layout por **mudança de alfinete**, e não por movimento do rato — quem
     manda aqui é o `setSobre`, que já só dispara quando muda o alfinete
     debaixo do rato. */
  const legenda = useRef<HTMLDivElement>(null);
  const [encaixe, setEncaixe] = useState({ dx: 0, abaixo: false });
  useLayoutEffect(() => {
    if (!sobre) return;
    const el = legenda.current;
    const envolvente = envolve.current;
    if (!el || !envolvente) return;
    const larg = el.offsetWidth;
    const alt = el.offsetHeight;
    const L = envolvente.clientWidth;
    const A = envolvente.clientHeight;
    const MARGEM = 6;

    let dx = 0;
    const esquerda = sobre.x - larg / 2;
    const direita = sobre.x + larg / 2;
    if (esquerda < MARGEM) dx = MARGEM - esquerda;
    else if (direita > L - MARGEM) dx = L - MARGEM - direita;

    // Por omissão fica por cima, que é onde o olho a procura. Só desce quando
    // por cima não há altura — e aí só desce se em baixo houver.
    const abaixo = sobre.y - 10 - alt < MARGEM && sobre.y + 10 + alt <= A - MARGEM;

    setEncaixe((antes) =>
      antes.dx === dx && antes.abaixo === abaixo ? antes : { dx, abaixo }
    );
  }, [sobre]);

  const aoSubir = () => {
    arrasto.current = null;
  };

  const aoClicar = (e: React.MouseEvent) => {
    if (!onMarkerClick || arrastou.current) return;
    const r = medirCaixa();
    if (!r) return;
    const item = alfineteEm(e.clientX - r.left, e.clientY - r.top);
    if (item) onMarkerClick(item.alfinete.coudelaria);
  };

  /* A roda não é do mapa.
     Aproximar com a roda obriga a um ouvinte de `wheel` não passivo, e um
     ouvinte desses proíbe o browser de deslocar a página no compositor
     enquanto o rato estiver por cima. Num painel de 420px no meio de um
     directório que se percorre a rolar, é trocar o deslocamento de toda a
     gente por um gesto de quem quer aproximar — e antes disto a roda fazia as
     duas coisas ao mesmo tempo, porque o `onWheel` do React é passivo: a
     página descia e o globo aproximava-se sem ninguém pedir. Com os dois
     botões, o mapa não regista um único ouvinte não passivo, e quem quer
     aproximar tem por onde — inclusive no telemóvel, onde roda não há. */
  /* O fim do curso diz-se apagando o botão, que é como o outro globo já o
     diz. Antes os dois botões continuavam acesos depois de o zoom bater no
     limite: carregar dez vezes no `+` dava dez vezes nada, sem nada no ecrã a
     explicar porquê. */
  const [curso, setCurso] = useState({ podeAproximar: true, podeAfastar: true });
  const aproximar = useCallback(
    (factor: number) => {
      const min = zoomInicial.current * AFASTAR_MAX;
      const max = zoomInicial.current * APROXIMAR_MAX;
      const novo = Math.max(min, Math.min(max, zoom.current * factor));
      zoom.current = novo;
      escala.current = raioBase.current * novo;
      setCurso({ podeAproximar: novo < max - 1e-9, podeAfastar: novo > min + 1e-9 });
      pedirPintura();
    },
    [pedirPintura]
  );

  return (
    <div ref={envolve} className="relative h-full w-full touch-pan-y select-none">
      <div
        className="absolute inset-0"
        onPointerDown={aoDescer}
        onPointerMove={aoMover}
        onPointerUp={aoSubir}
        onPointerCancel={aoSubir}
        onPointerLeave={() => {
          aoSubir();
          sobreAgora.current = null;
          setSobre(null);
        }}
        onClick={aoClicar}
        style={{ cursor: sobre ? "pointer" : "grab" }}
      >
        <canvas ref={lona} className="block h-full w-full" aria-hidden="true" />
      </div>

      {/* Os mesmos botões do `/mapa`, e não uns parecidos: `.globo-comando` é
          a receita que já existe para «aproximar e afastar um globo neste
          site» — quadrado de cantos redondos, vidro sobre o fundo do cartão,
          44px em telemóvel e apagado ao fim do curso. Eram aqui cápsulas
          redondas de 44px com `btn-subtil`, sempre acesas: dois mapas do mesmo
          país com dois cromados diferentes. A classe é lida, não reescrita. */}
      <div className="absolute bottom-2 right-2 z-10 grid gap-1.5">
        <button
          type="button"
          onClick={() => aproximar(1.35)}
          disabled={!curso.podeAproximar}
          aria-label="Aproximar"
          className="globo-comando"
        >
          <Plus size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => aproximar(1 / 1.35)}
          disabled={!curso.podeAfastar}
          aria-label="Afastar"
          className="globo-comando"
        >
          <Minus size={16} aria-hidden="true" />
        </button>
      </div>

      {sobre && (
        <div
          ref={legenda}
          className="mapinha-legenda pointer-events-none absolute z-10 rounded-lg border px-2.5 py-1.5"
          style={{
            left: sobre.x + encaixe.dx,
            top: encaixe.abaixo ? sobre.y + 10 : sobre.y - 10,
            transform: `translateX(-50%) translateY(${encaixe.abaixo ? "0" : "-100%"})`,
            borderColor: "var(--border-soft)",
            background: "var(--background-elevated)",
          }}
        >
          <span className="mapinha-legenda__nome">{sobre.nome}</span>
          <span className="mapinha-legenda__local">{sobre.local}</span>
        </div>
      )}

      {/* O canvas é uma imagem, e o que ela diz tem de ser dito por escrito.
          O que aqui estava dizia sempre a mesma frase — «Globo com N
          coudelarias. A mesma informação está na vista de lista.» —, e na
          ficha essa frase era falsa duas vezes: dava «Globo com 1
          coudelarias», e mandava para uma lista que na ficha não existe. Este
          painel faz dois trabalhos e por isso tem duas frases. */}
      <p className="sr-only">
        {alfinetes.length === 1 && alfinetes[0]
          ? `Mapa com a localização de ${alfinetes[0].coudelaria.nome}${
              alfinetes[0].coudelaria.localizacao ? `, ${alfinetes[0].coudelaria.localizacao}` : ""
            }.`
          : `Mapa com ${alfinetes.length} coudelarias. A mesma informação está na vista de lista.`}
      </p>
    </div>
  );
}
