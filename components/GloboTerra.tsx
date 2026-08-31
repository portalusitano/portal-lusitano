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
/* O Sol posto de modo a apanhar a Europa no fim da tarde: Portugal fica
   junto ao terminador, com as luzes de Espanha e França já acesas ao lado.
   É o enquadramento da fotografia que serviu de referência. */
const SOL = new THREE.Vector3(0.55, 0.32, 0.77).normalize();

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

const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export default function GloboTerra({
  coudelarias,
  aoAproximar,
}: {
  coudelarias: CoudelariaNoMapa[];
  /** Chamado quando o utilizador se aproxima ao ponto de querer detalhe. */
  aoAproximar?: () => void;
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

  const aoAproximarRef = useRef(aoAproximar);
  useEffect(() => {
    aoAproximarRef.current = aoAproximar;
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
    const camara = new THREE.PerspectiveCamera(30, largura / altura, 0.01, 100);

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
    const geoAlfinete = new THREE.SphereGeometry(0.0045, 12, 12);
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
          opacity: 0.75,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      brilho.scale.setScalar(0.035);
      brilho.position.copy(alfinete.position);
      grupoAlfinetes.add(brilho);
    }
    cena.add(grupoAlfinetes);

    // ── A câmara: parte de longe e fecha sobre Portugal, uma vez ──────────
    /* A câmara não aponta a Portugal: aponta a um ponto mais a sul, para
       Portugal ficar na metade de cima do quadro e sobrar o Sara em baixo —
       que é a composição da fotografia. Apontada ao país, o país fica no
       meio e o resto do planeta fica só a preencher. */
    const alvo = naEsfera(24, -9, 1).normalize();
    const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Com uma lente de 30° e um planeta de raio 1, a esfera ocupa a altura
       toda do quadro a 1/sin(15°) ≈ 3,86. A 4,6 ocupa uns 80% e sobra
       espaço para o halo e para as estrelas — que é o enquadramento da
       fotografia. Mais perto e vê-se oceano; mais longe e é uma bola. */
    const distanciaFinal = 4.6;
    const distanciaInicial = 11;
    let distancia = parado ? distanciaFinal : distanciaInicial;

    const cima = new THREE.Vector3(0, 1, 0);
    const lado = new THREE.Vector3().crossVectors(cima, alvo).normalize();
    // Chegada: quase de frente, com um grau de inclinação só.
    const direccaoFinal = alvo.clone().addScaledVector(cima, 0.06).normalize();
    // Partida: de lado, para a entrada ser uma aproximação e não um zoom.
    const direccaoInicial = alvo
      .clone()
      .addScaledVector(lado, -0.72)
      .addScaledVector(cima, 0.24)
      .normalize();

    const direccao = direccaoInicial.clone();
    const arrastoRot = { activo: false, x: 0, y: 0 };
    const orbita = { theta: 0, phi: 0 };

    const colocarCamara = () => {
      const d = direccao.clone();
      // A órbita do utilizador aplica-se por cima da direcção base.
      const eixoY = new THREE.Vector3(0, 1, 0);
      const eixoX = new THREE.Vector3().crossVectors(eixoY, d).normalize();
      d.applyAxisAngle(eixoY, orbita.theta);
      d.applyAxisAngle(eixoX, orbita.phi);
      camara.position.copy(d.multiplyScalar(distancia));
      camara.lookAt(0, 0, 0);
    };

    let quadro = 0;
    const inicio = performance.now();
    const duracao = parado ? 0 : 2800;
    let aEntrar = !parado;

    const desenhar = () => {
      if (aEntrar) {
        const t = Math.min(1, (performance.now() - inicio) / duracao);
        const e = suave(t);
        distancia = distanciaInicial + (distanciaFinal - distanciaInicial) * e;
        direccao.copy(direccaoInicial).lerp(direccaoFinal, e).normalize();
        if (t >= 1) aEntrar = false;
      }
      colocarCamara();
      renderizador.render(cena, camara);
      quadro = requestAnimationFrame(desenhar);
    };
    colocarCamara();
    quadro = requestAnimationFrame(desenhar);

    // ── Interacção ────────────────────────────────────────────────────────
    const aoDescer = (e: PointerEvent) => {
      aEntrar = false;
      arrastoRot.activo = true;
      arrastoRot.x = e.clientX;
      arrastoRot.y = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const aoMover = (e: PointerEvent) => {
      if (!arrastoRot.activo) return;
      orbita.theta -= (e.clientX - arrastoRot.x) * 0.005;
      orbita.phi = Math.max(-1.2, Math.min(1.2, orbita.phi + (e.clientY - arrastoRot.y) * 0.005));
      arrastoRot.x = e.clientX;
      arrastoRot.y = e.clientY;
    };
    const aoSubir = () => {
      arrastoRot.activo = false;
    };
    const aoRodar = (e: WheelEvent) => {
      aEntrar = false;
      e.preventDefault();
      distancia = Math.max(2.3, Math.min(16, distancia * (e.deltaY > 0 ? 1.08 : 0.92)));
      // Chegado a este ponto, quem está a olhar quer nomes de terras.
      if (distancia <= 2.45) aoAproximarRef.current?.();
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
