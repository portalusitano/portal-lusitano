"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { resolverCoordenadas, type CoudelariaNoMapa } from "@/lib/coordenadas-coudelarias";

/*
 * A Terra vista do espaço, com as coudelarias acesas em Portugal.
 *
 * Não é um mapa: é a entrada. Um mapa de tiles serve para procurar uma
 * aldeia; isto serve para se perceber, num segundo, de onde é que este
 * portal fala. Quem quiser detalhe carrega em «Mapa» e vai ter aos tiles.
 *
 * As texturas são da NASA (Blue Marble e Black Marble), pelas cópias que o
 * three.js distribui nos seus exemplos. Estão em `public/globo/`, em WebP:
 * 411KB os três mapas, e só se carregam nesta página.
 *
 * O que faz a imagem, por ordem de importância:
 *  1. A mistura dia/noite ao longo do terminador, com as luzes das cidades
 *     a acenderem-se do lado escuro. É isto que se reconhece.
 *  2. O aro de atmosfera — um Fresnel numa esfera virada do avesso. Sem
 *     ele o planeta é um autocolante recortado.
 *  3. O halo largo por fora, mais ténue e mais aberto, que dá o ar de
 *     fotografia e não de render.
 *  4. As estrelas, quietas. A piscar seriam mais um ciclo infinito.
 */

const RAIO = 1;
/** Lat/lon → ponto na esfera. */
function naEsfera(lat: number, lon: number, raio: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -raio * Math.sin(phi) * Math.cos(theta),
    raio * Math.cos(phi),
    raio * Math.sin(phi) * Math.sin(theta)
  );
}

/* O Sol ao largo, a oeste da Península.
   Numa vista de órbita baixa sobre Portugal, o país tem de se ler: com o
   Sol do outro lado ficava tudo escuro e as etiquetas assentavam em cima
   de nada. Assim apanha luz rasante de fim de tarde — o terreno lê-se, as
   sombras dão relevo, e o terminador fica a leste com as luzes de Espanha
   e de França já acesas. */
const SOL = naEsfera(16, -26, 1).normalize();

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosVista;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 posVista = modelViewMatrix * vec4(position, 1.0);
    vPosVista = posVista.xyz;
    gl_Position = projectionMatrix * posVista;
  }
`;

const FRAG_TERRA = /* glsl */ `
  uniform sampler2D mapaDia;
  uniform sampler2D mapaLuzes;
  uniform sampler2D mapaBrilho;
  uniform vec3 sol;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosVista;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 dirSol = normalize((viewMatrix * vec4(sol, 0.0)).xyz);
    float luz = dot(n, dirSol);

    // O terminador não é uma linha: é uma faixa de algumas centenas de km.
    float dia = smoothstep(-0.18, 0.28, luz);

    vec3 corDia = texture2D(mapaDia, vUv).rgb;
    vec3 corLuzes = texture2D(mapaLuzes, vUv).rgb;
    float mar = texture2D(mapaBrilho, vUv).r;

    // Lado iluminado, com o azul do mar a ganhar profundidade nos bordos.
    vec3 ladoDia = corDia * (0.35 + 0.75 * max(luz, 0.0));

    // Lado escuro: quase preto, com as cidades acesas por cima. O tom
    // quente é o do sódio das luzes públicas, que é o que se vê de facto.
    vec3 ladoNoite = corDia * 0.035 + corLuzes * vec3(1.3, 0.98, 0.58) * 2.1;

    vec3 cor = mix(ladoNoite, ladoDia, dia);

    // Um reflexo especular só no mar, e só onde o Sol bate de raspão.
    vec3 dirVista = normalize(-vPosVista);
    vec3 meio = normalize(dirSol + dirVista);
    float esp = pow(max(dot(n, meio), 0.0), 34.0) * mar * dia;
    cor += vec3(0.55, 0.68, 0.85) * esp * 0.55;

    gl_FragColor = vec4(cor, 1.0);
  }
`;

const FRAG_ATMOSFERA = /* glsl */ `
  uniform vec3 cor;
  uniform float intensidade;
  uniform float potencia;
  uniform float base;
  uniform vec3 sol;
  varying vec3 vNormal;

  void main() {
    /* O brilho mede-se contra o eixo da câmara, não contra a superfície.
       A primeira versão fazia um Fresnel numa casca 1,4% maior que o
       planeta: saía um anel azul desenhado a régua, que é exactamente o
       que uma atmosfera não é. Assim, numa esfera bem maior, o valor cresce
       do centro para a borda e continua a esbater-se para fora dela. */
    float i = pow(max(base - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0), potencia);

    /* Só do lado por onde entra a luz: um aro igual à volta toda é auréola.
       A casca está virada do avesso, por isso as normais apontam para
       dentro — sem o sinal trocado, o brilho ia parar ao lado da noite,
       que foi exactamente o que aconteceu à primeira. */
    vec3 dirSol = normalize((viewMatrix * vec4(sol, 0.0)).xyz);
    float ladoDoSol = smoothstep(-0.6, 0.5, dot(normalize(-vNormal), dirSol));

    gl_FragColor = vec4(cor * i * intensidade * (0.14 + 0.86 * ladoDoSol), 1.0);
  }
`;

const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export default function GloboTerra({
  coudelarias,
  aoEscolher,
}: {
  coudelarias: CoudelariaNoMapa[];
  /** Chamado ao carregar no nome de uma coudelaria. */
  aoEscolher?: (c: CoudelariaNoMapa) => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const [pronto, setPronto] = useState(false);

  const pontos = useMemo(
    () =>
      coudelarias
        .map((c) => ({ c, coords: resolverCoordenadas(c) }))
        .filter((x): x is { c: CoudelariaNoMapa; coords: [number, number] } => x.coords !== null),
    [coudelarias]
  );

  const aoEscolherRef = useRef(aoEscolher);
  useEffect(() => {
    aoEscolherRef.current = aoEscolher;
  });

  const montar = useCallback(() => {
    const el = caixa.current;
    if (!el) return () => {};

    const largura = el.clientWidth || 1;
    const altura = el.clientHeight || 1;

    const renderizador = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderizador.setSize(largura, altura);
    renderizador.toneMapping = THREE.ACESFilmicToneMapping;
    renderizador.toneMappingExposure = 0.95;
    el.appendChild(renderizador.domElement);

    const cena = new THREE.Scene();
    /* Lente longa. É o que separa uma fotografia do espaço de um render de
       jogo: com 30° a curvatura lê-se sem a distorção de grande angular. */
    /* 42° de abertura, não 30. A composição que se procura tem duas coisas
       ao mesmo tempo no quadro — o horizonte curvo em cima e a Península em
       baixo — e com uma lente longa não cabem as duas. */
    const camara = new THREE.PerspectiveCamera(42, largura / altura, 0.005, 100);

    const carregador = new THREE.TextureLoader();
    const textura = (caminho: string, srgb: boolean) => {
      const t = carregador.load(caminho, () => setPronto(true));
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = renderizador.capabilities.getMaxAnisotropy();
      return t;
    };

    // ── Terra ─────────────────────────────────────────────────────────────
    const terra = new THREE.Mesh(
      new THREE.SphereGeometry(RAIO, 128, 128),
      new THREE.ShaderMaterial({
        uniforms: {
          mapaDia: { value: textura("/globo/dia.webp", true) },
          mapaLuzes: { value: textura("/globo/luzes.webp", true) },
          mapaBrilho: { value: textura("/globo/brilho.webp", false) },
          sol: { value: SOL },
        },
        vertexShader: VERT,
        fragmentShader: FRAG_TERRA,
      })
    );
    cena.add(terra);

    // ── Atmosfera ─────────────────────────────────────────────────────────
    /* Duas cascas: uma larga e ténue, que é o ar visto de longe, e uma
       apertada e forte, que é a linha acesa mesmo em cima do horizonte.
       Uma só nunca dá as duas coisas — ou fica um borrão ou fica um risco. */
    const casca = (
      raio: number,
      cor: number[],
      intensidade: number,
      potencia: number,
      base: number
    ) =>
      new THREE.Mesh(
        new THREE.SphereGeometry(RAIO * raio, 96, 96),
        new THREE.ShaderMaterial({
          uniforms: {
            cor: { value: new THREE.Color(cor[0], cor[1], cor[2]) },
            intensidade: { value: intensidade },
            potencia: { value: potencia },
            base: { value: base },
            sol: { value: SOL },
          },
          vertexShader: VERT,
          fragmentShader: FRAG_ATMOSFERA,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
        })
      );

    const halo = casca(1.22, [0.52, 0.7, 0.94], 0.13, 8.5, 0.9);
    const aro = casca(1.022, [0.86, 0.94, 1.0], 0.26, 16.0, 0.982);
    cena.add(halo);
    cena.add(aro);

    /* ── Costas e fronteiras, em vectorial ────────────────────────────────
       A textura tem 2048 pontos para dar a volta ao planeta. Vista de uma
       órbita baixa, cada grau ocupa uns seis texels e a imagem vira papa —
       é o preço de olhar de perto para uma fotografia de longe.

       Por isso as linhas vêm de outro lado: os contornos de Portugal e
       vizinhos em vectorial, desenhados por cima da esfera. Ficam nítidos a
       qualquer altura, e é sobre eles que as etiquetas assentam. A textura
       fica a fazer o que sabe — a cor da terra, o mar, a atmosfera. */
    const grupoContornos = new THREE.Group();
    fetch("/globo/contornos.json")
      .then((r) => r.json())
      .then((aneis: [number, number][][]) => {
        const material = new THREE.LineBasicMaterial({
          color: 0xd6ebfd,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
        });
        for (const anel of aneis) {
          const pontos = anel.map(([lon, lat]) => naEsfera(lat, lon, RAIO * 1.0012));
          const geo = new THREE.BufferGeometry().setFromPoints(pontos);
          grupoContornos.add(new THREE.Line(geo, material));
        }
      })
      .catch(() => {});

    // ── Estrelas, quietas ─────────────────────────────────────────────────
    const nEstrelas = 1400;
    const posicoes = new Float32Array(nEstrelas * 3);
    const tamanhos = new Float32Array(nEstrelas);
    let semente = 0x9e3779b9;
    const proximo = () => {
      semente = (semente * 1103515245 + 12345) & 0x7fffffff;
      return semente / 0x7fffffff;
    };
    for (let i = 0; i < nEstrelas; i++) {
      const v = naEsfera(
        Math.acos(2 * proximo() - 1) * (180 / Math.PI) - 90,
        proximo() * 360 - 180,
        30 + proximo() * 25
      );
      posicoes.set([v.x, v.y, v.z], i * 3);
      tamanhos[i] = 0.02 + proximo() * 0.05;
    }
    const geoEstrelas = new THREE.BufferGeometry();
    geoEstrelas.setAttribute("position", new THREE.BufferAttribute(posicoes, 3));
    geoEstrelas.setAttribute("size", new THREE.BufferAttribute(tamanhos, 1));
    const estrelas = new THREE.Points(
      geoEstrelas,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.06,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
    );
    cena.add(estrelas);

    // ── As coudelarias ────────────────────────────────────────────────────
    /* O halo de cada ponto precisa de uma textura. Um `Sprite` sem mapa
       desenha um quadrado branco cheio — era o que se via por cima de
       Portugal, um selo em vez de nove pontos. */
    const pinta = document.createElement("canvas");
    pinta.width = pinta.height = 64;
    const ctx2d = pinta.getContext("2d")!;
    const gradiente = ctx2d.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradiente.addColorStop(0, "rgba(255,255,255,1)");
    gradiente.addColorStop(0.35, "rgba(255,255,255,0.45)");
    gradiente.addColorStop(1, "rgba(255,255,255,0)");
    ctx2d.fillStyle = gradiente;
    ctx2d.fillRect(0, 0, 64, 64);
    const texturaHalo = new THREE.CanvasTexture(pinta);
    texturaHalo.colorSpace = THREE.SRGBColorSpace;

    const grupoAlfinetes = new THREE.Group();
    /* À escala da órbita: a 0,17 de distância, um alfinete de raio 0,0008
       dá uns cinco pixéis. Com o raio da versão anterior era um selo. */
    const geoAlfinete = new THREE.SphereGeometry(0.0004, 12, 12);
    for (const { c, coords } of pontos) {
      const destaque = c.destaque;
      const material = new THREE.MeshBasicMaterial({
        color: destaque ? 0xc6a15b : 0xffffff,
        transparent: true,
        opacity: 0.95,
      });
      const alfinete = new THREE.Mesh(geoAlfinete, material);
      alfinete.position.copy(naEsfera(coords[0], coords[1], RAIO * 1.004));
      grupoAlfinetes.add(alfinete);

      // Um halo por baixo, para o ponto se ler contra as luzes das cidades.
      const brilho = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texturaHalo,
          color: destaque ? 0xc6a15b : 0xffffff,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      brilho.scale.setScalar(0.0015);
      brilho.position.copy(alfinete.position);
      grupoAlfinetes.add(brilho);
    }
    cena.add(grupoAlfinetes);

    // ── A câmara: parte de longe e fecha sobre Portugal, uma vez ──────────
    /* ── O enquadramento ──────────────────────────────────────────────────
       Não é o planeta ao centro: é a vista de quem está em órbita baixa a
       sul da Península e olha para norte. A câmara pousa a 0,28 raios de
       altura sobre um ponto 18° a sul de Portugal e aponta a um ponto 10°
       a norte dele. Assim Portugal cai na metade de baixo do quadro e o
       horizonte, que dessa altura fica a arccos(1/1,28) ≈ 38°, entra em
       cima — que é a fotografia da referência.

       Antes a câmara estava a 4,6 raios com o planeta ao centro: bonito,
       mas as vinte e nove coudelarias cabiam todas num borrão de dez
       pixéis, e não era isso que se pedia. */
    const PORTUGAL = { lat: 39.5, lon: -8.2 };
    /* Órbita baixa: 0,09 raios ≈ 570km. Daqui o horizonte fica a
       arccos(1/1,09) ≈ 23°, e o país ocupa dois terços da altura do quadro
       — que é o que faz caber um nome ao lado de cada coudelaria. A 0,28
       cabia tudo no enquadramento e não se lia nada. */
    const ALTURA = 0.05;

    const solo = naEsfera(PORTUGAL.lat - 4.5, PORTUGAL.lon, 1);
    const olhar = naEsfera(PORTUGAL.lat + 3.5, PORTUGAL.lon, 1);
    const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const posFinal = solo.clone().multiplyScalar(1 + ALTURA);
    const alvoFinal = olhar.clone();

    // A entrada vem de longe, com o planeta inteiro no quadro.
    const posInicial = naEsfera(PORTUGAL.lat - 10, PORTUGAL.lon + 52, 1).multiplyScalar(4.6);
    const alvoInicial = new THREE.Vector3(0, 0, 0);

    const posCam = (parado ? posFinal : posInicial).clone();
    const alvoCam = (parado ? alvoFinal : alvoInicial).clone();

    /* A órbita do utilizador roda o planeta, não a câmara. Rodar a câmara
       à volta de um ponto que já não é o centro dá enjoo. */
    const orbita = { theta: 0, phi: 0 };

    const colocarCamara = () => {
      camara.position.copy(posCam);
      camara.up.copy(posCam).normalize();
      camara.lookAt(alvoCam);
    };

    /* ── As etiquetas ─────────────────────────────────────────────────────
       O nome de cada localidade em HTML por cima da cena, colocado a cada
       quadro a partir da posição projectada do alfinete. Em HTML e não em
       textura por três razões: fica nítido em qualquer ecrã, herda a
       tipografia do site, e pode receber o rato.

       Duas regras fazem a diferença entre um mapa anotado e uma confusão:
       só se escreve o que está virado para nós, e não se deixam duas
       etiquetas sobreporem-se — quem perde é a que estiver mais longe. */
    const camadaEtiquetas = document.createElement("div");
    camadaEtiquetas.className = "globo-etiquetas";
    el.appendChild(camadaEtiquetas);

    type Etiqueta = {
      nó: HTMLElement;
      posicao: THREE.Vector3;
      destaque: boolean;
      largura: number;
      altura: number;
    };

    const etiquetas: Etiqueta[] = pontos.map(({ c, coords }, i) => {
      const nó = document.createElement("div");
      nó.className = "globo-etiqueta";
      if (c.destaque) nó.dataset.destaque = "";
      nó.style.setProperty("--entrada", `${1900 + Math.min(i * 55, 1100)}ms`);
      nó.innerHTML =
        '<span class="globo-etiqueta__linha"></span>' +
        '<span class="globo-etiqueta__caixa">' +
        '<span class="globo-etiqueta__local"></span>' +
        '<span class="globo-etiqueta__nome"></span>' +
        "</span>";
      nó.querySelector(".globo-etiqueta__local")!.textContent = c.localizacao;
      nó.querySelector(".globo-etiqueta__nome")!.textContent = c.nome;
      if (aoEscolherRef.current) {
        nó.setAttribute("role", "button");
        nó.setAttribute("tabindex", "0");
        nó.setAttribute("aria-label", `${c.nome}, ${c.localizacao}`);
        const abrir = () => aoEscolherRef.current?.(c);
        nó.addEventListener("click", abrir);
        nó.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            abrir();
          }
        });
      }
      camadaEtiquetas.appendChild(nó);
      return {
        nó,
        posicao: naEsfera(coords[0], coords[1], RAIO * 1.004),
        destaque: c.destaque,
        largura: 0,
        altura: 0,
      };
    });

    const projeccao = new THREE.Vector3();
    const normalMundo = new THREE.Vector3();
    const paraCamara = new THREE.Vector3();
    const colocadas: { x: number; y: number; l: number; a: number }[] = [];

    const etiquetar = () => {
      const l = el.clientWidth;
      const a = el.clientHeight;
      colocadas.length = 0;

      // Primeiro as que estão em destaque, depois as mais perto de nós: são
      // essas que ficam quando duas se estorvam.
      const ordem = etiquetas
        .map((e, i) => {
          projeccao.copy(e.posicao).applyMatrix4(mundo.matrixWorld);
          normalMundo.copy(projeccao).normalize();
          paraCamara.copy(camara.position).sub(projeccao).normalize();
          const deFrente = normalMundo.dot(paraCamara);
          const ecra = projeccao.clone().project(camara);
          return { e, i, deFrente, ecra, z: ecra.z };
        })
        .sort((x, y) => (y.e.destaque ? 1 : 0) - (x.e.destaque ? 1 : 0) || x.z - y.z);

      for (const { e, deFrente, ecra } of ordem) {
        const x = (ecra.x * 0.5 + 0.5) * l;
        const y = (-ecra.y * 0.5 + 0.5) * a;
        const dentro = ecra.z < 1 && x > -40 && x < l + 40 && y > -20 && y < a + 20;

        if (!dentro || deFrente < 0.12) {
          e.nó.style.opacity = "0";
          continue;
        }

        if (!e.largura) {
          e.largura = e.nó.offsetWidth || 120;
          e.altura = e.nó.offsetHeight || 34;
        }

        /* Duas hipóteses de colocação por etiqueta: à direita do alfinete e,
           se aí bater noutra, à esquerda. Só com um lado perdiam-se metade
           dos nomes num país onde as coudelarias estão todas encostadas. */
        const bate = (c: { x: number; y: number; l: number; a: number }) =>
          colocadas.some(
            (o) =>
              c.x < o.x + o.l + 12 &&
              c.x + c.l + 12 > o.x &&
              c.y < o.y + o.a + 8 &&
              c.y + c.a + 8 > o.y
          );

        const direita = { x: x + 10, y: y - e.altura - 12, l: e.largura, a: e.altura };
        const esquerda = { x: x - 10 - e.largura, y: y - e.altura - 12, l: e.largura, a: e.altura };
        const escolhida = !bate(direita) ? direita : !bate(esquerda) ? esquerda : null;

        if (!escolhida) {
          e.nó.style.opacity = "0";
          e.nó.style.pointerEvents = "none";
          continue;
        }
        colocadas.push(escolhida);
        e.nó.dataset.lado = escolhida === esquerda ? "esquerda" : "direita";

        // Esbate-se junto ao horizonte, onde a superfície foge do olhar.
        /* Colocar onde as contas disseram, e não em cima do alfinete: era
           esta a razão de as etiquetas continuarem a sobrepor-se depois de
           eu ter posto um teste de colisão. O teste estava certo; o que
           estava errado era o sítio onde eu punha o elemento a seguir. */
        const perto = Math.min(1, (deFrente - 0.12) / 0.28);
        e.nó.style.transform = `translate3d(${Math.round(escolhida.x)}px, ${Math.round(escolhida.y)}px, 0)`;
        e.nó.style.opacity = String(perto);
        e.nó.style.pointerEvents = perto > 0.6 ? "auto" : "none";
      }
    };

    let quadro = 0;
    const inicio = performance.now();
    const duracao = parado ? 0 : 3000;
    let aEntrar = !parado;

    const mundo = new THREE.Group();
    mundo.add(terra);
    mundo.add(grupoContornos);
    mundo.add(grupoAlfinetes);
    cena.add(mundo);

    const desenhar = () => {
      if (aEntrar) {
        const t = Math.min(1, (performance.now() - inicio) / duracao);
        const e = suave(t);
        // A direcção interpola-se pelo arco, o raio pela recta: assim a
        // câmara descreve uma aproximação e não um corte em diagonal.
        const dir = posInicial
          .clone()
          .normalize()
          .lerp(posFinal.clone().normalize(), e)
          .normalize();
        const raio = posInicial.length() + (posFinal.length() - posInicial.length()) * e;
        posCam.copy(dir.multiplyScalar(raio));
        alvoCam.copy(alvoInicial).lerp(alvoFinal, e);
        if (t >= 1) aEntrar = false;
      }
      mundo.rotation.y = orbita.theta;
      mundo.rotation.x = orbita.phi;
      colocarCamara();
      renderizador.render(cena, camara);
      etiquetar();
      quadro = requestAnimationFrame(desenhar);
    };
    colocarCamara();
    quadro = requestAnimationFrame(desenhar);

    // ── Interacção ────────────────────────────────────────────────────────
    const arrastoRot = { activo: false, x: 0, y: 0 };

    const aoDescer = (e: PointerEvent) => {
      aEntrar = false;
      arrastoRot.activo = true;
      arrastoRot.x = e.clientX;
      arrastoRot.y = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const aoMover = (e: PointerEvent) => {
      if (!arrastoRot.activo) return;
      orbita.theta += (e.clientX - arrastoRot.x) * 0.004;
      orbita.phi = Math.max(-0.5, Math.min(0.5, orbita.phi + (e.clientY - arrastoRot.y) * 0.003));
      arrastoRot.x = e.clientX;
      arrastoRot.y = e.clientY;
    };
    const aoSubir = () => {
      arrastoRot.activo = false;
    };
    const aoRodar = (e: WheelEvent) => {
      aEntrar = false;
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.07 : 0.93;
      const novoRaio = Math.max(1.012, Math.min(2.6, posCam.length() * factor));
      posCam.normalize().multiplyScalar(novoRaio);
    };

    el.addEventListener("pointerdown", aoDescer);
    el.addEventListener("pointermove", aoMover);
    el.addEventListener("pointerup", aoSubir);
    el.addEventListener("pointerleave", aoSubir);
    el.addEventListener("wheel", aoRodar, { passive: false });

    const observador = new ResizeObserver(() => {
      const l = el.clientWidth || 1;
      const a = el.clientHeight || 1;
      renderizador.setSize(l, a);
      camara.aspect = l / a;
      camara.updateProjectionMatrix();
    });
    observador.observe(el);

    return () => {
      cancelAnimationFrame(quadro);
      observador.disconnect();
      el.removeEventListener("pointerdown", aoDescer);
      el.removeEventListener("pointermove", aoMover);
      el.removeEventListener("pointerup", aoSubir);
      el.removeEventListener("pointerleave", aoSubir);
      el.removeEventListener("wheel", aoRodar);
      camadaEtiquetas.remove();
      cena.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
          o.geometry.dispose();
          const m = o.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
      });
      renderizador.dispose();
      renderizador.domElement.remove();
    };
  }, [pontos]);

  useEffect(() => montar(), [montar]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={caixa}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        style={{ opacity: pronto ? 1 : 0, transition: "opacity 900ms var(--ease-out)" }}
      />
      <p className="sr-only">
        Globo com {pontos.length} coudelarias em Portugal. A mesma informação está na vista de
        lista.
      </p>
    </div>
  );
}
