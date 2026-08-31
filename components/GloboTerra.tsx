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
 *  1. A atmosfera, medida pela coluna de ar que cada raio atravessa. É uma
 *     casca só, e dela saem as três coisas que dão a fotografia: a faixa
 *     acesa rasante ao horizonte, o preto por cima dela, e a bruma que
 *     engrossa sobre o terreno até ao horizonte. Sem ela o planeta é um
 *     autocolante recortado.
 *  2. A mistura dia/noite ao longo do terminador, com as luzes das cidades
 *     a acenderem-se do lado escuro. É isto que se reconhece.
 *  3. A perspectiva aérea do lado da Terra: o terreno perde luz — e perde-a
 *     mais no azul — na travessia até à câmara. É a outra metade da 1, e
 *     sem ela só se soma azul por cima do castanho, o que dá roxo.
 *  4. As estrelas, quietas. A piscar seriam mais um ciclo infinito.
 *
 * Nota de cor, que é a que explica metade do resto: os três shaders desta
 * cena são escritos à mão, e um ShaderMaterial só recebe o tone mapping e a
 * codificação de saída se os pedir com os `#include` no fim do main(). Sem
 * eles a Terra sai em valores lineares directos para um ecrã sRGB — o
 * planeta a 5/255 em pleno dia — enquanto tudo o que é material de fábrica
 * sai certo. Quem escrever mais um shader aqui leva-os também.
 *
 * ── E o que faz com que isto não seja um ciclo infinito ────────────────────
 *
 * Depois de a câmara pousar, esta cena não muda: o Sol está fixo, as
 * estrelas estão quietas, os alfinetes não pulsam. Um `requestAnimationFrame`
 * a correr para sempre estava a mandar sessenta vezes por segundo o mesmo
 * quadro ao ecrã — a arder bateria a desenhar uma fotografia. Por isso o
 * quadro é **pedido**, não agendado: desenha-se durante a entrada, enquanto
 * se arrasta ou se roda a roda, quando chega uma textura, quando a caixa
 * muda de tamanho, quando um nome se acende debaixo do rato. Parado, o globo
 * custa zero.
 *
 * Pelo mesmo motivo o relógio pára com o separador escondido e com o globo
 * fora do ecrã — a mesma regra do `usePassoVivo`, e a entrada só arranca
 * quando o globo entra no ecrã, que é quando há alguém para a ver.
 */

const RAIO = 1;
/* Topo da atmosfera, em raios do planeta: 1,020 ≈ 130km, que é a altura a
   que a faixa acesa se vê nas fotografias de órbita. Serve as duas metades
   da perspectiva aérea — a luz que o ar dispersa (a casca) e a que o
   terreno perde a caminho da câmara (o shader da Terra) —, por isso vive
   aqui e não dentro de uma delas. */
const TOPO_AR = 1.02;
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
  varying vec3 vPosMundo;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 posMundo = modelMatrix * vec4(position, 1.0);
    vPosMundo = posMundo.xyz;
    vec4 posVista = modelViewMatrix * vec4(position, 1.0);
    vPosVista = posVista.xyz;
    gl_Position = projectionMatrix * posVista;
  }
`;

const FRAG_TERRA = /* glsl */ `
  uniform sampler2D mapaDia;
  uniform sampler2D mapaLuzes;
  uniform sampler2D mapaBrilho;
  uniform float extincao;
  uniform float raioTopo;
  uniform vec3 sol;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosVista;
  varying vec3 vPosMundo;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 dirSol = normalize((viewMatrix * vec4(sol, 0.0)).xyz);
    float luz = dot(n, dirSol);

    // O terminador não é uma linha: é uma faixa de algumas centenas de km.
    float dia = smoothstep(-0.18, 0.28, luz);

    vec3 corDia = texture2D(mapaDia, vUv).rgb;
    vec3 corLuzes = texture2D(mapaLuzes, vUv).rgb;
    float mar = texture2D(mapaBrilho, vUv).r;

    /* ── Quanto ar há entre isto e a câmara ──────────────────────────────
       A mesma conta de cordas da casca de atmosfera, mas do lado de cá:
       daqui saem tanto a extinção como a dose de tratamento de cor, que
       têm de andar juntas. */
    float distancia = length(vPosMundo - cameraPosition);
    vec3 dCam = (vPosMundo - cameraPosition) / max(distancia, 1e-5);
    float aCam = dot(cameraPosition, dCam);
    float p2 = max(dot(cameraPosition, cameraPosition) - aCam * aCam, 0.0);
    float rTopo = sqrt(max(raioTopo * raioTopo - p2, 0.0));
    float colunaAr = max(distancia - max(-aCam - rTopo, 0.0), 0.0);
    float longe = 1.0 - exp(-colunaAr * 4.0);

    /* ── A papa ──────────────────────────────────────────────────────────
       A textura tem 2048 pixéis para dar a volta ao planeta: desta altura
       são uns seis por grau. Não há nitidez para ir buscar, e filtro
       nenhum a inventa. O que se pode ir buscar é a cor.

       O que os mipmaps comem a um ângulo rasante não é só o detalhe — é a
       saturação. Cada texel do nível grosseiro é a média de mar, terra e
       sombra de serra, e a média de azul-escuro com ocre é malva, que não
       é a cor de nada. A primeira tentativa foi puxar a saturação de todo
       o planeta por igual: não resultou, e por uma razão que devia ter
       sido óbvia — o malva também é uma cor, e saturá-lo dá mais malva.

       O que resulta é dosear pela distância, que é onde está a diferença:
       o chão aqui debaixo, onde ainda há texels por pixel, ganha corpo;
       o chão junto ao horizonte, onde já não há, larga a saturação e
       entrega-se à bruma. Assim a papa deixa de fingir que é detalhe e
       passa a ler-se como o que é — longe. */
    float cinza = dot(corDia, vec3(0.2126, 0.7152, 0.0722));
    corDia = max(mix(vec3(cinza), corDia, mix(1.34, 0.72, longe)), 0.0);
    corDia = pow(corDia, vec3(mix(1.16, 1.0, longe))) * mix(1.12, 1.0, longe);

    // Lado iluminado, com o azul do mar a ganhar profundidade nos bordos.
    vec3 ladoDia = corDia * (0.35 + 0.75 * max(luz, 0.0));

    /* Lado escuro: quase preto, com as cidades acesas por cima. O tom
       quente é o do sódio das luzes públicas, que é o que se vê de facto.

       O mapa das luzes não vem com fundo preto: traz um azul-noite por
       baixo de tudo — no meio do Sara, onde não há uma única lâmpada,
       ainda mede sRGB(25,24,58). Multiplicado como estava, esse fundo
       acendia o lado da noite inteiro a violeta e roubava contraste às
       cidades, que é o único sítio onde este mapa tem informação. Por
       isso fica só a intensidade acima do piso, e a cor vem daqui. */
    float acesas = max(dot(corLuzes, vec3(0.2126, 0.7152, 0.0722)) - 0.013, 0.0);
    vec3 ladoNoite = corDia * 0.035 + vec3(1.25, 0.92, 0.5) * acesas * 2.6;

    vec3 cor = mix(ladoNoite, ladoDia, dia);

    // Um reflexo especular só no mar, e só onde o Sol bate de raspão.
    vec3 dirVista = normalize(-vPosVista);
    vec3 meio = normalize(dirSol + dirVista);
    float esp = pow(max(dot(n, meio), 0.0), 34.0) * mar * dia;
    cor += vec3(0.55, 0.68, 0.85) * esp * 0.55;

    /* ── A outra metade da perspectiva aérea ─────────────────────────────
       A casca de ar acrescenta a luz que o ar dispersa; falta tirar a que
       o terreno perdeu a caminho da câmara. Sem esta parte só se soma azul
       por cima do castanho, e o resultado é roxo em vez de longe.

       O coeficiente é maior no azul do que no vermelho, como manda
       Rayleigh: o que sobrevive à travessia aquece, e é esse contraste com
       o azul que se soma por cima que faz a distância.

       A coluna não conta toda por igual. Um raio rasante faz o percurso
       inteiro na camada de baixo, que é a densa; um raio a pique
       atravessa-a num instante. A espessura óptica cresce por isso mais
       depressa do que o comprimento, e é esse termo quadrático que trata
       do último defeito visível deste globo: nos últimos graus antes do
       horizonte já não há texels nenhuns, e uma costa da textura aparece
       como uma fieira de quadrados do nível grosseiro do mipmap. Assim
       dissolvem-se na bruma, que é onde deviam estar. */
    float profundidadeOptica = colunaAr * (1.0 + colunaAr * 9.0);
    cor *= exp(-profundidadeOptica * extincao * vec3(0.72, 1.0, 1.55));

    gl_FragColor = vec4(cor, 1.0);

    /* Um ShaderMaterial escrito à mão não recebe estas duas passagens de
       borla: o three só as injecta onde o shader as pede. Sem elas, o tone
       mapping e a exposição do renderizador não fazem nada aqui, e os
       valores lineares vão para o ecrã sem serem codificados em sRGB — o
       planeta saía a 5/255 no meio do dia, enquanto as linhas de costa e
       os alfinetes, que são materiais de fábrica, saíam com a cor certa.
       Era essa a razão de a Terra parecer apagada e de as linhas por cima
       dela parecerem coladas. */
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const FRAG_ATMOSFERA = /* glsl */ `
  uniform vec3 corDensa;
  uniform vec3 corRala;
  uniform float raioTopo;
  uniform float espessura;
  uniform float ganho;
  uniform float ganhoSobreTerra;
  uniform vec3 sol;
  varying vec3 vPosMundo;

  void main() {
    /* ── Quanto ar é que este raio atravessa? ────────────────────────────
       A versão anterior fazia um Fresnel contra o eixo da câmara
       — dot(normal, vec3(0,0,1)) — numa casca 22% maior que o planeta. Isso
       só funciona com a câmara ao largo, a olhar o planeta inteiro — que
       era o enquadramento antigo. Com a câmara a 0,05 raios de altura, ela
       fica *dentro* dessa casca: todos os raios saem por ela, o termo dá
       valores acima de 1 em quase todo o ecrã e a atmosfera passa a ser um
       nevoeiro branco de canto a canto. Era isso que se via.

       Aqui mede-se a coisa certa: o comprimento do troço do raio que passa
       dentro da atmosfera, entre a superfície (raio 1) e o topo. Sai de
       graça o que se queria:
        · a olhar para cima não há ar nenhum no caminho — preto, e as
          estrelas voltam a ver-se;
        · rasante ao horizonte a coluna é a mais longa de todas — é a faixa
          acesa que se vê das fotografias da estação espacial;
        · sobre o terreno o troço cresce com a distância — perspectiva
          aérea, que é o que faz uma textura de 2048 pixéis parecer chão
          longe em vez de chão desfocado.

       Como a conta é feita a partir da câmara e não da superfície da casca,
       continua certa se o utilizador afastar a roda do rato e sair da
       atmosfera. */
    vec3 d = normalize(vPosMundo - cameraPosition);
    float a = dot(cameraPosition, d);
    float p2 = max(dot(cameraPosition, cameraPosition) - a * a, 0.0);

    float discTopo = raioTopo * raioTopo - p2;
    if (discTopo <= 0.0) discard;
    float rTopo = sqrt(discTopo);
    float saidaTopo = -a + rTopo;
    if (saidaTopo <= 0.0) discard;

    float entrada = max(-a - rTopo, 0.0);
    float chao = -a - sqrt(max(1.0 - p2, 0.0));

    // A coluna que pára no solo, e a que atravessa o ar todo até ao espaço.
    float caminhoNoChao = max(min(chao, saidaTopo) - entrada, 0.0);
    float caminhoNoCeu = max(saidaTopo - entrada, 0.0);

    /* ── O degrau do horizonte ───────────────────────────────────────────
       O raio que ainda apanha o solo e o raio que já passa por cima dele
       vêem quantidades de ar muito diferentes — o dobro, aqui. Isso é
       verdade e é o que faz a linha acesa. O que não pode é ser um salto
       seco: a fronteira p²=1 é uma curva calculada no shader, e um degrau
       calculado no shader não apanha o anti-aliasing das arestas da
       geometria — o multisample só sabe suavizar silhuetas de polígonos.
       O resultado era um horizonte aos degraus, com escadas de dezenas de
       pixéis, que sobreviveu a subir a esfera para 512 segmentos e a casca
       para 384: nenhuma das duas era a causa.

       Um pixel de esbatimento, medido com a derivada de ecrã, resolve-o —
       e resolve-o a qualquer distância, que é mais do que uma constante
       fazia. Onde o raio se afasta do planeta não há solo à frente e a
       questão nem se põe. */
    float pixel = max(fwidth(p2), 1e-7);
    float noCeu = a < 0.0 ? smoothstep(-pixel, pixel, p2 - 1.0) : 1.0;

    float caminho = mix(caminhoNoChao, caminhoNoCeu, noCeu);

    // Beer: a coluna satura em vez de estourar, e o joelho do ACES a
    // seguir trata do resto.
    float densidade = 1.0 - exp(-espessura * caminho);

    /* Sobre o terreno o ar pesa menos do que a conta diz, e há uma razão:
       aqui só se soma a luz dispersa, não se tira a que o terreno perdeu
       pelo caminho. Sem essa subtracção, o mesmo ganho do céu punha
       Portugal debaixo de uma nuvem azul — foi o que aconteceu à primeira.
       O ganho mais baixo é o que faz as vezes da extinção que falta. */
    float forca = mix(ganhoSobreTerra, ganho, noCeu);

    /* A cor não é uma só: rasante ao horizonte o ar já dispersou tanto que
       lê branco-frio, e mais acima ainda é o azul de Rayleigh. Uma cor
       fixa dava ou um anel de neon ou um véu cinzento. */
    vec3 cor = mix(corRala, corDensa, smoothstep(0.18, 0.50, caminho));

    /* Só do lado por onde entra a luz. Mede-se no ponto do raio mais perto
       do planeta — é aí que está o ar que conta —, não na casca, que fica
       longe de mais para dizer se aquilo é dia ou noite. */
    vec3 pPerto = cameraPosition + d * max(-a, 0.0);
    float ladoDoSol = smoothstep(-0.35, 0.4, dot(normalize(pPerto), sol));

    gl_FragColor = vec4(cor * densidade * forca * (0.05 + 0.95 * ladoDoSol), 1.0);

    /* Pelas mesmas razões da Terra: um ShaderMaterial escrito à mão não
       recebe o tone mapping nem a codificação de saída sem os pedir. */
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* Os contornos vectoriais só têm posições — nem `uv` nem `normal` —, por
   isso não podem usar o VERT das esferas. */
const VERT_LINHA = /* glsl */ `
  varying vec3 vPosMundo;
  void main() {
    vec4 posMundo = modelMatrix * vec4(position, 1.0);
    vPosMundo = posMundo.xyz;
    gl_Position = projectionMatrix * viewMatrix * posMundo;
  }
`;

const FRAG_CONTORNOS = /* glsl */ `
  uniform vec3 cor;
  uniform float opacidade;
  uniform float extincao;
  uniform float raioTopo;
  varying vec3 vPosMundo;

  void main() {
    /* A linha também está debaixo do ar. Com uma opacidade fixa, a costa
       da Cantábria a trezentos quilómetros ficava tão acesa como a do
       Tejo aqui à frente — e passava a ser a coisa mais clara do quadro
       depois do horizonte. Lida assim, deixa de ser uma costa e passa a
       ser um traço por cima da fotografia. Some com a mesma coluna de ar
       que apaga o terreno por baixo dela. */
    float distancia = length(vPosMundo - cameraPosition);
    vec3 d = (vPosMundo - cameraPosition) / max(distancia, 1e-5);
    float aCam = dot(cameraPosition, d);
    float p2 = max(dot(cameraPosition, cameraPosition) - aCam * aCam, 0.0);
    float rTopo = sqrt(max(raioTopo * raioTopo - p2, 0.0));
    float colunaAr = max(distancia - max(-aCam - rTopo, 0.0), 0.0);

    gl_FragColor = vec4(cor, opacidade * exp(-colunaAr * extincao));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const VERT_ESTRELAS = /* glsl */ `
  attribute float tamanho;
  attribute float brilho;
  varying float vBrilho;
  void main() {
    vBrilho = brilho;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = tamanho;
  }
`;

const FRAG_ESTRELAS = /* glsl */ `
  varying float vBrilho;
  void main() {
    // Redonda, não quadrada: núcleo apertado e uma orla que se apaga.
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float a = 1.0 - smoothstep(0.28, 1.0, r);
    gl_FragColor = vec4(vec3(vBrilho * a), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* Entrada e saída suaves, mas sem o arranque preguiçoso do `easeInOutCubic`
   que aqui estava: aos 25% do tempo aquele já só tinha feito 6% do
   movimento, e a aproximação parecia começar tarde. Este faz 16%. */
const suave = (t: number) => t * t * (3 - 2 * t);

const grau = Math.PI / 180;
const EIXO_POLAR = new THREE.Vector3(0, 1, 0);

/* ── O enquadramento, em números ───────────────────────────────────────────
 *
 * A câmara está à altura h sobre um ponto do meridiano de Portugal e aponta
 * para a MIRA, um ponto de solo que fica sempre no centro do quadro. Com o
 * planeta de raio 1:
 *
 *   dip = arccos(1/(1+h))   o horizonte, abaixo da horizontal local
 *   δ0  = dip + β           o eixo da câmara, abaixo da mesma horizontal
 *   Δ   = δ0 − arccos((1+h)·cos δ0)     sub-ponto ↔ mira
 *   D   = sin Δ / cos δ0                câmara ↔ mira
 *
 * É β — e não a altura — que fixa a altura do horizonte no quadro: com lente
 * vertical de 42°, o horizonte cai a 50% − 50%·tan β / tan 21° do topo. Com
 * β = 14° dá 18%, e dá 18% a QUALQUER altura. Era isto que faltava. Dantes a
 * mira era um ponto fixo da esfera e a altura mudava sozinha ao rodar a
 * roda: a inclinação da câmara passava a depender do zoom, e no fim do
 * curso a câmara estava a olhar exactamente para o horizonte — meio quadro
 * de céu e as coudelarias todas espalmadas numa linha.
 *
 * Os números escolhidos põem o horizonte a 18% do topo, o norte de Portugal
 * a 34% e o cabo de Santa Maria a 92%: o país inteiro no quadro, com mar por
 * baixo. Com o que aqui estava — h = 0,05 e mira a 43°N — o sul do país caía
 * a 132%, isto é 32% de altura de quadro abaixo da borda: o Algarve estava
 * fora do enquadramento em todos os ecrãs. */
const MIRA = { lat: 39.8, lon: -8.0 };
const FOV = 42;
const BETA = 14 * grau;
/** ≈ 375 km. É a altura a que o país inteiro cabe no quadro. */
const ALTURA_REPOUSO = 0.0588;
/** ≈ 191 km: mais perto do que isto e a textura, que tem um texel por cada
    20 km, é só borrão — os contornos vectoriais não chegam para o sustentar. */
const ALTURA_MINIMA = 0.03;
/** ≈ 12 700 km: o disco do planeta subtende 39°, cabe nos 42° da lente. É
    também de onde parte a entrada, para que se possa sempre voltar à
    primeira imagem. A que lá estava partia de 4,6 raios, fora do limite de
    2,6 do zoom: a abertura era um sítio onde não se podia regressar. */
const ALTURA_MAXIMA = 2.0;
/** O país tem 218 km ao largo; abaixo desta largura de quadro deixa de caber
    com margem, e a resposta é subir. */
const LARGURA_MINIMA = 330 / 6371;
const DURACAO_ENTRADA = 2600;

/** Geometria do enquadramento para uma altura. */
function enquadrar(h: number) {
  const eixo = Math.acos(1 / (1 + h)) + BETA;
  const sep = eixo - Math.acos(Math.min(1, (1 + h) * Math.cos(eixo)));
  return { eixo, sep, distancia: Math.sin(sep) / Math.cos(eixo) };
}

/** A altura a que o país ainda cabe ao largo numa caixa desta proporção.
    `distancia` cresce com a altura, por isso chega bissectar. */
function alturaParaCaber(aspecto: number) {
  const precisa = LARGURA_MINIMA / 2 / (Math.tan((FOV / 2) * grau) * aspecto);
  if (enquadrar(ALTURA_MINIMA).distancia >= precisa) return ALTURA_MINIMA;
  let baixo = ALTURA_MINIMA;
  let cima = ALTURA_MAXIMA;
  for (let i = 0; i < 40; i++) {
    const meio = (baixo + cima) / 2;
    if (enquadrar(meio).distancia < precisa) baixo = meio;
    else cima = meio;
  }
  return cima;
}

/* «Coudelaria de Alter Real» → «Alter Real».
   Numa lista de coudelarias a palavra «Coudelaria» não distingue nenhuma das
   outras: dezasseis dos vinte e nove nomes começam por ela. Ocupa setenta
   pixéis de linha por etiqueta, que é precisamente o que falta para caber
   mais um nome no Ribatejo. O nome inteiro fica no `aria-label` e no `title`. */
function nomeCurto(nome: string) {
  return nome.replace(/^coudelaria\s+(?:d[eoa]s?\s+)?/i, "").trim() || nome;
}

type Ponto = { c: CoudelariaNoMapa; coords: [number, number] };

/** Estado visível do componente. */
type Estado = "a-carregar" | "pronto" | "sem-3d" | "perdido";

export default function GloboTerra({
  coudelarias,
  aoEscolher,
}: {
  coudelarias: CoudelariaNoMapa[];
  /** Chamado ao carregar no nome de uma coudelaria. */
  aoEscolher?: (c: CoudelariaNoMapa) => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<Estado>("a-carregar");

  const pontos = useMemo(
    () =>
      coudelarias
        .map((c) => ({ c, coords: resolverCoordenadas(c) }))
        .filter((x): x is Ponto => x.coords !== null),
    [coudelarias]
  );

  /* ── Coudelarias que caem no mesmo ponto ────────────────────────────────
     Não é uma aproximação por proximidade no écran: são coordenadas iguais.
     Dez das vinte e nove partilham cinco pontos — Samora Correia, Santarém,
     Azambuja, Comporta e Ferreira do Alentejo têm duas cada. Dois alfinetes
     em cima um do outro nunca se separam, por muito que a câmara se aproxime;
     prometer que o zoom os abre seria prometer o que a geometria não dá, e é
     por isso que o grupo abre por outra via — ao apontar ou ao receber o foco.
     Vizinhas mas distintas (a Golegã e a Azinhaga) ficam com etiqueta própria:
     fundi-las por estarem a doze pixéis inventava um sítio que não existe. */
  const grupos = useMemo(() => {
    const mapa = new Map<string, { coords: [number, number]; membros: CoudelariaNoMapa[] }>();
    for (const { c, coords } of pontos) {
      const chave = `${coords[0].toFixed(4)},${coords[1].toFixed(4)}`;
      const grupo = mapa.get(chave);
      if (grupo) grupo.membros.push(c);
      else mapa.set(chave, { coords, membros: [c] });
    }
    return [...mapa.values()];
  }, [pontos]);

  /* ── Só se reconstrói a cena quando os pontos mudam de facto ─────────────
     Quem nos chama passa `searchQuery ? filtradas : todas`: um array novo a
     cada tecla, quase sempre com o mesmo conteúdo. Como a cena inteira
     dependia da identidade desta lista, cada tecla deitava fora um contexto
     WebGL e abria outro — e o browser só deixa ter dezasseis abertos ao
     mesmo tempo. Medido: vinte teclas davam treze contextos e o aviso
     «Too many active WebGL contexts» na consola.

     Quem manda na montagem passa a ser a assinatura: uma cadeia com o que a
     cena precisa de saber. Array novo com o mesmo conteúdo dá a mesma
     assinatura, e o `useCallback` que monta a cena não se mexe. Sai dos
     pontos e não dos grupos porque é ela que os determina: os grupos são uma
     função pura desta lista. */
  const assinatura = useMemo(
    () =>
      pontos
        .map(
          ({ c, coords }) => `${c.id}|${c.nome}|${c.localizacao}|${c.destaque ? 1 : 0}|${coords}`
        )
        .join(";"),
    [pontos]
  );

  /* Os dois valores que a cena lê no momento em que monta, guardados fora do
     render. Os efeitos correm pela ordem em que estão escritos, por isso
     estes chegam sempre antes do efeito que monta a cena. */
  const gruposRef = useRef(grupos);
  const aoEscolherRef = useRef(aoEscolher);
  useEffect(() => {
    gruposRef.current = grupos;
    aoEscolherRef.current = aoEscolher;
  });

  const montar = useCallback(() => {
    const el = caixa.current;
    if (!el) return () => {};
    const grupos = gruposRef.current;

    const largura = el.clientWidth || 1;
    const altura = el.clientHeight || 1;

    /* ── Plano B ──────────────────────────────────────────────────────────
       Sem WebGL — browser antigo, GPU na lista negra, `--disable-gpu` — o
       construtor do three atira. Sem isto o erro subia pelo React e levava a
       página inteira à frente: o que o utilizador via era um rectângulo
       preto sem uma palavra. */
    let renderizador: THREE.WebGLRenderer;
    try {
      renderizador = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      /* Fora da linha do efeito: mudar de estado no meio dele encadeia
         renderizações e o linter, com razão, não deixa. */
      queueMicrotask(() => setEstado("sem-3d"));
      return () => {};
    }

    /* Em telemóvel o custo é o número de pixéis, e o número de pixéis é o
       quadrado disto. Medido em software: passar de 1 para 2 custou 2,7× o
       tempo por quadro, para 4× os pixéis. Num ecrã fino de telemóvel a
       diferença entre 1,5 e 2 não se vê; no orçamento vê-se. */
    const grosso = window.matchMedia("(pointer: coarse)").matches;
    const pontoDoEcra = Math.min(window.devicePixelRatio, grosso ? 1.5 : 2);
    renderizador.setPixelRatio(pontoDoEcra);
    renderizador.setSize(largura, altura);
    renderizador.toneMapping = THREE.ACESFilmicToneMapping;
    renderizador.toneMappingExposure = 1.05;
    const lona = renderizador.domElement;
    el.appendChild(lona);

    const cena = new THREE.Scene();
    /* 42° de abertura, não 30. A composição que se procura tem duas coisas
       ao mesmo tempo no quadro — o horizonte curvo em cima e a Península em
       baixo — e com uma lente longa não cabem as duas. O valor vive na
       constante `FOV` porque toda a geometria do enquadramento o lê. */
    const camara = new THREE.PerspectiveCamera(FOV, largura / altura, 0.005, 100);

    /* ── Estado do relógio e da interacção ────────────────────────────────
       Declarado aqui em cima porque quem o lê — o `revelar` das texturas, o
       `.then()` dos contornos, o observador, o próprio laço — pode chegar a
       qualquer altura. Um `let` lido antes da linha onde está escrito é um
       erro em tempo de execução, não um aviso. */
    let quadroPedido = 0;
    let desmontado = false;
    let contextoVivo = true;
    let noEcra = false;
    let escondido = document.hidden;
    let inicio = 0;
    let pausadoEm = 0;
    /* Medidas da caixa em cache: o `etiquetar` corre a cada quadro e lia
       `clientWidth`, que obriga o browser a recalcular a folha de estilos.
       Quem sabe que a caixa mudou é o `ResizeObserver`. */
    let larguraCaixa = largura;
    let alturaCaixa = altura;
    /** Ponteiros em baixo, por id. Um arrasta; dois fazem pinça. */
    const ponteiros = new Map<number, { x: number; y: number }>();
    let pinca = 0;
    let arrastou = false;
    let precisaMedir = true;

    const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Tudo o que se cria à mão fica listado, porque nada disto se apaga
       sozinho. Um `ShaderMaterial.dispose()` não descarta as texturas que
       tem nos uniformes — essas são nossas. */
    const texturas: THREE.Texture[] = [];
    const carregador = new THREE.TextureLoader();
    const textura = (caminho: string, srgb: boolean) => {
      /* Revelar também no erro. Se as três texturas falharem, a versão
         anterior deixava o globo a zero de opacidade para sempre: uma caixa
         preta muda. Mais vale o planeta sem mapa — atmosfera, estrelas,
         contornos e etiquetas continuam lá. */
      const t = carregador.load(caminho, revelar, undefined, revelar);
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = renderizador.capabilities.getMaxAnisotropy();
      texturas.push(t);
      return t;
    };

    // ── Terra ─────────────────────────────────────────────────────────────
    const terra = new THREE.Mesh(
      /* 220 paralelos e meridianos, não 128. De órbita baixa o que se vê da
         esfera é sobretudo a linha do horizonte, e é lá que a facetagem se
         nota: a 128 o horizonte é um polígono e vêem-se os cantos contra o
         céu. É uma esfera só — o custo não conta. */
      new THREE.SphereGeometry(RAIO, 220, 220),
      new THREE.ShaderMaterial({
        uniforms: {
          mapaDia: { value: textura("/globo/dia.webp", true) },
          mapaLuzes: { value: textura("/globo/luzes.webp", true) },
          mapaBrilho: { value: textura("/globo/brilho.webp", false) },
          raioTopo: { value: TOPO_AR },
          extincao: { value: 2.1 },
          sol: { value: SOL },
        },
        vertexShader: VERT,
        fragmentShader: FRAG_TERRA,
      })
    );
    cena.add(terra);

    // ── Atmosfera ─────────────────────────────────────────────────────────
    /* Uma casca só, e não duas.
       As duas de antes — uma larga e ténue, outra apertada e forte —
       existiam porque cada uma fazia um Fresnel com uma potência diferente,
       e um Fresnel só nunca dava ao mesmo tempo o véu e a linha do
       horizonte. Com o modelo de coluna de ar isso deixa de ser preciso: a
       mesma conta dá o véu (coluna curta, sobre o terreno) e a linha
       (coluna longa, rasante ao horizonte), porque a diferença entre as
       duas é geometria e não um expoente à escolha.

       Os 1,22 de antes eram 1400km de ar: com a câmara em órbita baixa,
       isso enche o ecrã todo de nevoeiro e o céu nunca chega a preto. */
    const ar = new THREE.Mesh(
      /* A esfera é maior do que a atmosfera que ela desenha — 1,08 contra
         1,020 — e é de propósito. Quem decide onde a atmosfera acaba é a
         conta do shader, que descarta o pixel quando o raio não apanha ar
         nenhum; e uma fronteira calculada é lisa em qualquer ecrã. Quando
         a esfera acabava exactamente no topo do ar, quem decidia era a
         geometria, e via-se: o remate do brilho contra o preto era uma
         linha quebrada, com os cantos dos polígonos todos à vista. Com a
         casca folgada, o número de segmentos deixa de importar. */
      new THREE.SphereGeometry(RAIO * 1.08, 96, 96),
      new THREE.ShaderMaterial({
        uniforms: {
          // Rasante: o ar já dispersou tudo e lê branco-frio — o mesmo azul
          // frio das hairlines do site, não um ciano de render.
          corDensa: { value: new THREE.Color(0.72, 0.85, 1.0) },
          // Coluna curta: o azul de Rayleigh, que é o que veste o terreno.
          corRala: { value: new THREE.Color(0.24, 0.46, 0.95) },
          raioTopo: { value: TOPO_AR },
          espessura: { value: 3.0 },
          ganho: { value: 0.34 },
          ganhoSobreTerra: { value: 0.26 },
          sol: { value: SOL },
        },
        vertexShader: VERT,
        fragmentShader: FRAG_ATMOSFERA,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        /* Sem teste de profundidade de propósito: é assim que o ar também
           cai sobre o terreno, que é metade do trabalho dele. Com o teste
           ligado, a casca fica sempre atrás do planeta e a perspectiva
           aérea nunca aparecia. Sendo aditivo, passar à frente não tapa
           nada — só acrescenta luz, que é o que o ar faz. */
        depthTest: false,
      })
    );
    ar.renderOrder = 10;
    cena.add(ar);

    /* ── Costas e fronteiras, em vectorial ────────────────────────────────
       A textura tem 2048 pontos para dar a volta ao planeta. Vista de uma
       órbita baixa, cada grau ocupa uns seis texels e a imagem vira papa —
       é o preço de olhar de perto para uma fotografia de longe.

       Por isso as linhas vêm de outro lado: os contornos de Portugal e
       vizinhos em vectorial, desenhados por cima da esfera. Ficam nítidos a
       qualquer altura, e é sobre eles que as etiquetas assentam. A textura
       fica a fazer o que sabe — a cor da terra, o mar, a atmosfera.

       Os 66 anéis vão todos numa `LineSegments` só. Um objecto por anel
       eram até 66 chamadas de desenho por quadro para 11 mil pontos que
       nunca mudam; num só são 11 mil pontos numa chamada. */
    const grupoContornos = new THREE.Group();
    const cancelarContornos = new AbortController();
    fetch("/globo/contornos.json", { signal: cancelarContornos.signal })
      .then((r) => r.json())
      .then((aneis: [number, number][][]) => {
        /* O `fetch` pode chegar depois de o componente sair do ecrã. Sem
           esta guarda ficavam aqui uma geometria e um material sem dono,
           criados já depois da limpeza e portanto nunca descartados. */
        if (desmontado) return;
        const vertices: number[] = [];
        for (const anel of aneis) {
          for (let i = 1; i < anel.length; i++) {
            const a = naEsfera(anel[i - 1][1], anel[i - 1][0], RAIO * 1.0012);
            const b = naEsfera(anel[i][1], anel[i][0], RAIO * 1.0012);
            vertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        grupoContornos.add(
          new THREE.LineSegments(
            geo,
            new THREE.ShaderMaterial({
              uniforms: {
                // A hairline fria do site — luz azulada sobre preto.
                cor: { value: new THREE.Color(0xd6ebfd) },
                opacidade: { value: 0.62 },
                raioTopo: { value: TOPO_AR },
                extincao: { value: 5.0 },
              },
              vertexShader: VERT_LINHA,
              fragmentShader: FRAG_CONTORNOS,
              transparent: true,
              depthWrite: false,
            })
          )
        );
        pedirQuadro();
      })
      .catch(() => {});

    /* ── Estrelas, quietas ───────────────────────────────────────────────
       Havia aqui um atributo `size` por estrela, calculado e guardado na
       geometria — e ignorado, porque o `PointsMaterial` não o lê: só olha
       para o `size` do material, que é um número só. Saíam mil e
       quatrocentas estrelas exactamente iguais. E como um `PointsMaterial`
       sem mapa desenha um quadrado cheio, cada uma era um quadradinho de
       aresta dura. Juntas liam-se como ruído de sensor, não como um céu.

       O material passa a ser próprio, para o atributo servir para alguma
       coisa: cada estrela tem o seu tamanho e o seu brilho, e ambos saem
       de `pow(aleatório, 3)` — muitas fracas, poucas fortes, que é a
       distribuição a que o olho chama céu. O ponto é redondo, desenhado
       com o `gl_PointCoord`: um núcleo apertado e uma orla curta.

       Tamanho em pixéis do ecrã e não atenuado pela distância: uma estrela
       está à mesma distância de tudo, e atenuar punha-as abaixo de um
       pixel, onde só cintilam por artefacto — que seria movimento a mais
       para uma coisa que aqui é fundo. */
    const nEstrelas = 4200;
    const posicoes = new Float32Array(nEstrelas * 3);
    const tamanhos = new Float32Array(nEstrelas);
    const brilhos = new Float32Array(nEstrelas);
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
      const magnitude = Math.pow(proximo(), 3);
      tamanhos[i] = (1.7 + magnitude * 2.6) * pontoDoEcra;
      brilhos[i] = 0.5 + magnitude * 2.1;
    }
    const geoEstrelas = new THREE.BufferGeometry();
    geoEstrelas.setAttribute("position", new THREE.BufferAttribute(posicoes, 3));
    geoEstrelas.setAttribute("tamanho", new THREE.BufferAttribute(tamanhos, 1));
    geoEstrelas.setAttribute("brilho", new THREE.BufferAttribute(brilhos, 1));
    const estrelas = new THREE.Points(
      geoEstrelas,
      new THREE.ShaderMaterial({
        vertexShader: VERT_ESTRELAS,
        fragmentShader: FRAG_ESTRELAS,
        blending: THREE.AdditiveBlending,
        transparent: true,
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
    /* Um núcleo apertado e uma queda curta. A queda anterior — meia opacidade
       ainda a 35% do raio — punha vinte e quatro manchas moles de catorze
       pixéis por cima de Portugal, e num sítio onde metade não tem nome ao
       lado a mancha é ruído, não é um alfinete. */
    gradiente.addColorStop(0, "rgba(255,255,255,1)");
    gradiente.addColorStop(0.22, "rgba(255,255,255,0.55)");
    gradiente.addColorStop(0.6, "rgba(255,255,255,0.1)");
    gradiente.addColorStop(1, "rgba(255,255,255,0)");
    ctx2d.fillStyle = gradiente;
    ctx2d.fillRect(0, 0, 64, 64);
    const texturaHalo = new THREE.CanvasTexture(pinta);
    texturaHalo.colorSpace = THREE.SRGBColorSpace;
    texturas.push(texturaHalo);

    const grupoAlfinetes = new THREE.Group();
    cena.add(grupoAlfinetes);
    /* À escala da órbita: a 0,17 de distância, um alfinete de raio 0,0008
       dá uns cinco pixéis. Com o raio da versão anterior era um selo. */
    const geoAlfinete = new THREE.SphereGeometry(0.0004, 12, 12);

    /* Um alfinete por ponto, não por coudelaria. Onde havia duas no mesmo
       sítio desenhavam-se duas esferas coincidentes e dois halos aditivos por
       cima um do outro: o ponto saía ao dobro do brilho dos vizinhos, e o que
       parecia uma coudelaria mais importante era só uma sobreposta.

       E uma malha instanciada em vez de uma esfera por ponto: a mesma
       geometria, a cor por instância, uma chamada de desenho em vez de vinte
       e quatro. O realce ao apontar continua a ser por índice — reescreve-se
       a matriz daquele alfinete — e por isso as duas coisas cabem juntas. */
    const HALO_BASE = 0.0013;
    const HALO_ACTIVO = 0.0024;

    const matAlfinete = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
    });
    const alfinetes = new THREE.InstancedMesh(geoAlfinete, matAlfinete, Math.max(grupos.length, 1));
    alfinetes.count = grupos.length;
    grupoAlfinetes.add(alfinetes);

    /* Quatro materiais chegam para os halos todos: branco e dourado, cada um
       apagado e aceso. Um material por sprite era um programa e um descarte
       por coudelaria, para duas cores; e como a opacidade vive no material,
       acender um halo com material partilhado acendia-os todos — por isso o
       aceso é um material à parte e o realce troca a referência. */
    const matHalo = (cor: number, opacidade: number) =>
      new THREE.SpriteMaterial({
        map: texturaHalo,
        color: cor,
        transparent: true,
        opacity: opacidade,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
    const haloBranco = matHalo(0xffffff, 0.6);
    const haloDourado = matHalo(0xc6a15b, 0.6);
    const haloBrancoAceso = matHalo(0xffffff, 1);
    const haloDouradoAceso = matHalo(0xc6a15b, 1);
    const materiaisHalo = [haloBranco, haloDourado, haloBrancoAceso, haloDouradoAceso];

    type Alfinete = {
      indice: number;
      posicao: THREE.Vector3;
      halo: THREE.Sprite;
      base: number;
      materiais: [THREE.SpriteMaterial, THREE.SpriteMaterial];
    };

    const molde = new THREE.Object3D();
    const corAlfinete = new THREE.Color();

    const fazerAlfinete = (
      indice: number,
      coords: [number, number],
      destaque: boolean,
      grupo: boolean
    ): Alfinete => {
      const posicao = naEsfera(coords[0], coords[1], RAIO * 1.004);
      molde.position.copy(posicao);
      molde.scale.setScalar(1);
      molde.updateMatrix();
      alfinetes.setMatrixAt(indice, molde.matrix);
      alfinetes.setColorAt(indice, corAlfinete.setHex(destaque ? 0xc6a15b : 0xffffff));

      // Um halo por baixo, para o ponto se ler contra as luzes das cidades.
      const materiais: [THREE.SpriteMaterial, THREE.SpriteMaterial] = destaque
        ? [haloDourado, haloDouradoAceso]
        : [haloBranco, haloBrancoAceso];
      const halo = new THREE.Sprite(materiais[0]);
      // Onde há mais do que uma, o halo abre-se: o ponto lê-se como pilha
      // antes de se chegar a ler o «2» na etiqueta.
      const base = grupo ? HALO_BASE * 1.5 : HALO_BASE;
      halo.scale.setScalar(base);
      halo.position.copy(posicao);
      grupoAlfinetes.add(halo);
      return { indice, posicao, halo, base, materiais };
    };

    /** Acender ou apagar um alfinete numa malha instanciada: reescreve-se a
        matriz daquele índice e marca-se o buffer. É o que substitui o
        `mesh.scale` de quando cada alfinete era um objecto seu. */
    const realcar = (a: Alfinete, ligado: boolean) => {
      molde.position.copy(a.posicao);
      molde.scale.setScalar(ligado ? 2.2 : 1);
      molde.updateMatrix();
      alfinetes.setMatrixAt(a.indice, molde.matrix);
      alfinetes.instanceMatrix.needsUpdate = true;
      a.halo.scale.setScalar(ligado ? HALO_ACTIVO : a.base);
      a.halo.material = a.materiais[ligado ? 1 : 0];
    };

    // ── A câmara: parte do planeta inteiro e fecha sobre Portugal, uma vez ─
    /* Não é o planeta ao centro: é a vista de quem está em órbita baixa a
       sul da Península e olha para norte, com o horizonte curvo em cima e o
       país em baixo. Toda a geometria está lá em cima, em `enquadrar`. */
    const miraDir = naEsfera(MIRA.lat, MIRA.lon, 1);
    /* Normal do plano do meridiano da mira. O eixo da câmara vive sempre
       dentro desse plano, e por isso este vector serve duas coisas: é o
       "direita" da câmara — o que mantém o horizonte direito a qualquer
       inclinação — e é o eixo em torno do qual o arrasto vertical roda o
       mundo. */
    const LESTE = new THREE.Vector3().crossVectors(miraDir, EIXO_POLAR).normalize();

    /* Uma variável de estado só: a altura. Posição, alvo e inclinação saem
       dela. Dantes eram quatro vectores a mexer-se uns contra os outros, e
       o zoom mudava a posição sem mudar o alvo — donde a inclinação ir
       parar ao horizonte no fim do curso. */
    let alturaRepouso = Math.max(ALTURA_REPOUSO, alturaParaCaber(largura / altura));
    let alturaVoo = parado ? alturaRepouso : ALTURA_MAXIMA;
    let zoomDoUtilizador = false;

    /* A órbita do utilizador roda o planeta, não a câmara. Rodar a câmara
       à volta de um ponto que já não é o centro dá enjoo. */
    const orbita = { theta: 0, phi: 0 };

    const posCam = new THREE.Vector3();
    const frente = new THREE.Vector3();
    const cima = new THREE.Vector3();

    const colocarCamara = () => {
      const { sep } = enquadrar(alturaVoo);
      /* O sub-ponto é a mira empurrada para sul pelo seu próprio meridiano.
         Muda com a altura; a mira não muda nunca — é o que faz o país ficar
         no centro do quadro em todo o curso do zoom. */
      posCam.copy(naEsfera(MIRA.lat - sep / grau, MIRA.lon, 1)).multiplyScalar(1 + alturaVoo);
      camara.position.copy(posCam);
      frente.copy(miraDir).sub(posCam).normalize();
      /* `up` perpendicular ao eixo e dentro do plano do meridiano: está
         definido em todas as inclinações, do rasante ao nadir. O `up` radial
         que aqui estava ficava paralelo ao eixo sempre que se olhava a
         direito para baixo — que era exactamente o primeiro quadro da
         entrada, onde o `lookAt` do three.js desistia e inventava uma
         inclinação de 48° que se desfazia no quadro seguinte. Medido. */
      cima.crossVectors(LESTE, frente).normalize();
      if (cima.y < 0) cima.negate();
      camara.up.copy(cima);
      camara.lookAt(miraDir);
    };

    /* ── As etiquetas ─────────────────────────────────────────────────────
       O nome de cada coudelaria em HTML por cima da cena, colocado a cada
       quadro a partir da posição projectada do alfinete. Em HTML e não em
       textura por três razões: fica nítido em qualquer ecrã, herda a
       tipografia do site, e pode receber o rato e o foco.

       Quatro regras fazem a diferença entre um mapa anotado e uma confusão:
       só se escreve o que está virado para nós; não se deixam duas
       sobreporem-se; quem não couber inteira encolhe para uma linha antes de
       desistir; e o que já se lia continua a ler-se — um nome que pisca ao
       arrastar o globo é pior do que um nome que nunca apareceu.

       Quem é o título e quem é o subtítulo: o **nome da coudelaria** em cima,
       a localidade por baixo. Estava ao contrário, e com os dados reais isso
       dava dois títulos «Ferreira do Alentejo» lado a lado, cada um com a sua
       coudelaria sussurrada por baixo em cinzento-escuro. Quem distingue duas
       coudelarias da mesma vila é o nome delas; o sítio já está dito pelo
       ponto onde a etiqueta assenta. */
    const camadaEtiquetas = document.createElement("div");
    camadaEtiquetas.className = "globo-etiquetas";
    camadaEtiquetas.setAttribute("role", "group");
    camadaEtiquetas.setAttribute("aria-label", "Coudelarias assinaladas no globo");
    el.appendChild(camadaEtiquetas);

    type Caixa = { x: number; y: number; l: number; a: number };
    type Medida = { l: number; a: number };
    type Etiqueta = {
      nó: HTMLElement;
      membros: CoudelariaNoMapa[];
      alfinete: Alfinete;
      destaque: boolean;
      /* Duas medidas em cache: a etiqueta inteira e a de uma linha só. Medir
         durante a colocação obrigava o browser a refazer o layout a meio do
         quadro, uma vez por etiqueta. */
      cheia: Medida;
      curta: Medida;
      abrir: (aberto: boolean) => void;
      colocada: boolean;
      /** Índice da hipótese de colocação usada da última vez, ou -1. */
      ultimo: number;
      activo: boolean;
      deFrente: number;
      z: number;
      ecraX: number;
      ecraY: number;
      noEcra: boolean;
      /* O que já lá está escrito, para não sujar o estilo a cada quadro. */
      anterior: {
        t: string;
        op: string;
        lado: string;
        vert: string;
        curto: boolean;
        morto: boolean;
      };
    };

    let sobAlfinete: Etiqueta | null = null;
    let sobEtiqueta: Etiqueta | null = null;
    let focada: Etiqueta | null = null;
    let fixa: Etiqueta | null = null;
    let activa: Etiqueta | null = null;

    const etiquetas: Etiqueta[] = grupos.map(({ coords, membros }, i) => {
      const principal = membros.find((m) => m.destaque) ?? membros[0];
      const destaque = membros.some((m) => m.destaque);
      const éGrupo = membros.length > 1;

      const nó = document.createElement("div");
      nó.className = "globo-etiqueta";
      if (destaque) nó.dataset.destaque = "";
      if (éGrupo) nó.dataset.grupo = "";
      /* Os nomes nascem pouco antes de a câmara pousar, escalonados 55ms por
         ponto até um tecto de 1100ms. O 1900 estava escrito à mão para uma
         entrada de 3000ms; agora sai da duração, para não voltar a ficar para
         trás quando ela mudar. O índice é o do ponto — não o da coudelaria —,
         que é o que faz a cascata contar o que se vê. */
      nó.style.setProperty(
        "--entrada",
        `${(parado ? 0 : DURACAO_ENTRADA - 700) + Math.min(i * 55, 1100)}ms`
      );
      /* Nasce inerte, que é o estado com que `anterior.morto` começa. Sem esta
         linha o par ficava a mentir um ao outro: a etiqueta que nunca chegou a
         ser colocada nunca passava pelo ramo que escreve o `inert`, porque o
         cache já dizia que estava escrito. Cinco nomes ficavam assim —
         invisíveis no écran e na mesma na ordem de tabulação. */
      nó.toggleAttribute("inert", true);

      const fio = document.createElement("span");
      fio.className = "globo-etiqueta__linha";
      nó.appendChild(fio);

      const caixa = document.createElement("span");
      caixa.className = "globo-etiqueta__caixa";
      nó.appendChild(caixa);

      /* Um botão a sério, e não uma `div` com `role="button"`: o Enter, o
         espaço, o foco e o contorno vêm do browser, e não há uma linha de
         JavaScript a imitar o que o elemento já sabe.
         Sem `aoEscolher` e sem nada para abrir, não é botão nenhum: um botão
         que não faz nada anuncia-se ao leitor de ecrã como accionável e é
         mais uma paragem de tabulação a não dar em lado nenhum. */
      const accionavel = éGrupo || !!aoEscolherRef.current;
      const cabeca = document.createElement(accionavel ? "button" : "span");
      if (cabeca instanceof HTMLButtonElement) cabeca.type = "button";
      cabeca.className = "globo-etiqueta__cabeca";
      caixa.appendChild(cabeca);

      const titulo = document.createElement("span");
      titulo.className = "globo-etiqueta__nome";
      const subtitulo = document.createElement("span");
      subtitulo.className = "globo-etiqueta__local";
      cabeca.append(titulo, subtitulo);

      let lista: HTMLUListElement | null = null;

      if (éGrupo) {
        /* Numa pilha quem identifica é o sítio: as duas coudelarias de
           Ferreira do Alentejo partilham tudo menos o nome, e é o nome que
           se abre a seguir. */
        titulo.textContent = principal.localizacao;
        const conta = document.createElement("span");
        conta.className = "globo-etiqueta__conta";
        conta.textContent = String(membros.length);
        titulo.appendChild(conta);
        subtitulo.textContent = membros.map((m) => nomeCurto(m.nome)).join(" · ");
        cabeca.setAttribute("aria-expanded", "false");
        cabeca.setAttribute(
          "aria-label",
          `${principal.localizacao}, ${membros.length} coudelarias`
        );

        lista = document.createElement("ul");
        lista.className = "globo-etiqueta__membros";
        lista.hidden = true;
        for (const m of membros) {
          const item = document.createElement("li");
          const botão = document.createElement("button");
          botão.type = "button";
          botão.className = "globo-etiqueta__membro";
          botão.textContent = nomeCurto(m.nome);
          botão.title = m.nome;
          botão.setAttribute("aria-label", `${m.nome}, ${m.localizacao}`);
          botão.addEventListener("click", (ev) => {
            ev.stopPropagation();
            if (arrastou) return;
            aoEscolherRef.current?.(m);
          });
          item.appendChild(botão);
          lista.appendChild(item);
        }
        caixa.appendChild(lista);
      } else {
        titulo.textContent = nomeCurto(principal.nome);
        subtitulo.textContent = principal.localizacao;
        cabeca.title = principal.nome;
        cabeca.setAttribute("aria-label", `${principal.nome}, ${principal.localizacao}`);
      }

      camadaEtiquetas.appendChild(nó);

      const et: Etiqueta = {
        nó,
        membros,
        alfinete: fazerAlfinete(i, coords, destaque, éGrupo),
        destaque,
        cheia: { l: 0, a: 0 },
        curta: { l: 0, a: 0 },
        abrir: (aberto: boolean) => {
          if (!lista || lista.hidden !== aberto) return;
          lista.hidden = !aberto;
          cabeca.setAttribute("aria-expanded", String(aberto));
          nó.toggleAttribute("data-aberto", aberto);
          precisaMedir = true;
        },
        colocada: false,
        ultimo: -1,
        activo: false,
        deFrente: 0,
        z: 0,
        ecraX: 0,
        ecraY: 0,
        noEcra: false,
        anterior: { t: "", op: "", lado: "", vert: "", curto: false, morto: true },
      };

      cabeca.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (arrastou) return;
        accionar(et);
      });

      return et;
    });

    alfinetes.instanceMatrix.needsUpdate = true;
    if (alfinetes.instanceColor) alfinetes.instanceColor.needsUpdate = true;

    const projeccao = new THREE.Vector3();
    const normalMundo = new THREE.Vector3();
    const paraCamara = new THREE.Vector3();
    const ecra = new THREE.Vector3();
    const colocadas: Caixa[] = [];
    const alfinetesEcra: Caixa[] = [];
    const ordem: Etiqueta[] = [];
    const sitios: number[] = [];

    /** Afastamento entre o alfinete e a etiqueta, e folga entre etiquetas. */
    const AFAST = 10;
    const FOLGA_X = 12;
    const FOLGA_Y = 6;
    /** Meio lado da caixa de um alfinete, para nenhum nome pousar sobre outro
        ponto — quem lê atribui o nome ao ponto que estiver por baixo dele. */
    const MEIO_ALFINETE = 6;

    const medirTodas = () => {
      for (const e of etiquetas) e.nó.toggleAttribute("data-curto", false);
      for (const e of etiquetas) {
        e.cheia.l = e.nó.offsetWidth;
        e.cheia.a = e.nó.offsetHeight;
      }
      for (const e of etiquetas) e.nó.toggleAttribute("data-curto", true);
      for (const e of etiquetas) {
        e.curta.l = e.nó.offsetWidth;
        e.curta.a = e.nó.offsetHeight;
      }
      for (const e of etiquetas) e.nó.toggleAttribute("data-curto", e.anterior.curto);
    };

    /* Seis sítios por etiqueta, por ordem de preferência: acima à direita —
       que é onde o olho a procura —, acima à esquerda, abaixo dos dois lados,
       e por fim ao lado à altura do ponto. Havia dois, e com dois perdiam-se
       dois terços dos nomes num país onde metade das coudelarias está no
       mesmo vale. */
    const hipoteses = [
      { lado: "direita", vert: "cima" },
      { lado: "esquerda", vert: "cima" },
      { lado: "direita", vert: "baixo" },
      { lado: "esquerda", vert: "baixo" },
      { lado: "direita", vert: "meio" },
      { lado: "esquerda", vert: "meio" },
    ] as const;

    const caixaDe = (x: number, y: number, m: Medida, h: (typeof hipoteses)[number]): Caixa => ({
      x: h.lado === "direita" ? x + AFAST : x - AFAST - m.l,
      y: h.vert === "cima" ? y - m.a - AFAST : h.vert === "baixo" ? y + AFAST : y - m.a / 2,
      l: m.l,
      a: m.a,
    });

    const bate = (c: Caixa) =>
      colocadas.some(
        (o) =>
          c.x < o.x + o.l + FOLGA_X &&
          c.x + c.l + FOLGA_X > o.x &&
          c.y < o.y + o.a + FOLGA_Y &&
          c.y + c.a + FOLGA_Y > o.y
      );

    const bateAlfinete = (c: Caixa) =>
      alfinetesEcra.some(
        (p) => c.x < p.x + p.l && c.x + c.l > p.x && c.y < p.y + p.a && c.y + c.a > p.y
      );

    /* Escrever no DOM só o que mudou. Pôr `style.opacity` com o mesmo valor a
       cada quadro reinicia a transição de 220ms sessenta vezes por segundo, e
       a etiqueta nunca chega ao fim do esbatimento. */
    const escrever = (
      e: Etiqueta,
      c: Caixa,
      lado: string,
      vert: string,
      curto: boolean,
      perto: number
    ) => {
      const ant = e.anterior;
      const t = `translate3d(${Math.round(c.x)}px, ${Math.round(c.y)}px, 0)`;
      if (t !== ant.t) {
        e.nó.style.transform = t;
        ant.t = t;
      }
      const op = perto.toFixed(2);
      if (op !== ant.op) {
        e.nó.style.opacity = op;
        ant.op = op;
      }
      if (lado !== ant.lado) {
        e.nó.dataset.lado = lado;
        ant.lado = lado;
      }
      if (vert !== ant.vert) {
        e.nó.dataset.vert = vert;
        ant.vert = vert;
      }
      if (curto !== ant.curto) {
        e.nó.toggleAttribute("data-curto", curto);
        ant.curto = curto;
      }
      /* `inert` em vez de `pointer-events`: tira a etiqueta do rato **e** da
         ordem de tabulação de uma vez. Sem isto, tabular pelo globo passava
         pelas vinte e nove — dezoito delas invisíveis, do outro lado do
         planeta ou vencidas na colisão, com o foco a parar em cima de nada. */
      const morto = perto <= 0.55;
      if (morto !== ant.morto) {
        e.nó.toggleAttribute("inert", morto);
        ant.morto = morto;
      }
    };

    const esconder = (e: Etiqueta) => {
      e.colocada = false;
      const ant = e.anterior;
      if (ant.op !== "0") {
        e.nó.style.opacity = "0";
        ant.op = "0";
      }
      if (!ant.morto) {
        e.nó.toggleAttribute("inert", true);
        ant.morto = true;
      }
    };

    const etiquetar = () => {
      // Da cache, não do DOM: ler `clientWidth` a cada quadro obriga o browser
      // a refazer o layout sessenta vezes por segundo para saber uma medida
      // que só o `ResizeObserver` pode ter mudado.
      const l = larguraCaixa;
      const a = alturaCaixa;
      colocadas.length = 0;
      alfinetesEcra.length = 0;

      for (const e of etiquetas) {
        projeccao.copy(e.alfinete.posicao).applyMatrix4(mundo.matrixWorld);
        normalMundo.copy(projeccao).normalize();
        paraCamara.copy(camara.position).sub(projeccao).normalize();
        e.deFrente = normalMundo.dot(paraCamara);
        ecra.copy(projeccao).project(camara);
        e.z = ecra.z;
        e.ecraX = (ecra.x * 0.5 + 0.5) * l;
        e.ecraY = (-ecra.y * 0.5 + 0.5) * a;
        e.noEcra =
          ecra.z < 1 &&
          e.deFrente >= 0.12 &&
          e.ecraX > -20 &&
          e.ecraX < l + 20 &&
          e.ecraY > -20 &&
          e.ecraY < a + 20;
        if (e.noEcra)
          alfinetesEcra.push({
            x: e.ecraX - MEIO_ALFINETE,
            y: e.ecraY - MEIO_ALFINETE,
            l: MEIO_ALFINETE * 2,
            a: MEIO_ALFINETE * 2,
          });
      }

      if (precisaMedir) {
        precisaMedir = false;
        medirTodas();
      }

      /* A ordem por que se escolhe lugar: primeiro a que está debaixo do rato
         ou com o foco — quem aponta tem de conseguir ler o que apontou —,
         depois as em destaque, depois, e é esta que conta, as que já estavam
         colocadas no quadro anterior. Sem essa histerese, arrastar o globo põe
         os nomes a trocarem de lugar uns com os outros e a leitura vira
         cintilação. Desempata a distância à câmara. */
      ordem.length = 0;
      for (const e of etiquetas) ordem.push(e);
      ordem.sort(
        (x, y) =>
          Number(y.activo) - Number(x.activo) ||
          Number(y.destaque) - Number(x.destaque) ||
          Number(y.colocada) - Number(x.colocada) ||
          x.z - y.z
      );

      for (const e of ordem) {
        if (!e.noEcra) {
          esconder(e);
          continue;
        }

        /* Duas formas por etiqueta: inteira, e de uma linha só. Antes de a
           esconder tenta-se sem a segunda linha — vale mais um nome sem a
           localidade do que um ponto sem nome nenhum. */
        /* O sítio do quadro anterior experimenta-se primeiro. Um nome que
           estava à direita e continua a caber à direita não se muda para a
           esquerda só porque a ordem por omissão o manda: saltar de lado
           lê-se tão mal como desaparecer, e a cadeira que ele larga põe a
           vizinha a saltar também. */
        sitios.length = 0;
        if (e.ultimo >= 0) sitios.push(e.ultimo);
        for (let k = 0; k < hipoteses.length; k++) if (k !== e.ultimo) sitios.push(k);

        let posta: Caixa | null = null;
        let lado = "direita";
        let vert = "cima";
        let curto = false;
        for (const medida of [e.cheia, e.curta]) {
          if (!medida.l) continue;
          for (const k of sitios) {
            const h = hipoteses[k];
            const c = caixaDe(e.ecraX, e.ecraY, medida, h);
            const cabe = c.x >= 2 && c.y >= 2 && c.x + c.l <= l - 2 && c.y + c.a <= a - 2;
            if (!cabe || bate(c) || bateAlfinete(c)) continue;
            posta = c;
            lado = h.lado;
            vert = h.vert;
            curto = medida === e.curta;
            e.ultimo = k;
            break;
          }
          if (posta) break;
        }

        if (!posta) {
          esconder(e);
          continue;
        }
        colocadas.push(posta);
        e.colocada = true;

        // Esbate-se junto ao horizonte, onde a superfície foge do olhar.
        /* Colocar onde as contas disseram, e não em cima do alfinete: era
           esta a razão de as etiquetas continuarem a sobrepor-se depois de
           eu ter posto um teste de colisão. O teste estava certo; o que
           estava errado era o sítio onde eu punha o elemento a seguir. */
        escrever(e, posta, lado, vert, curto, Math.min(1, (e.deFrente - 0.12) / 0.28));
      }
    };

    /* ── O alfinete e a etiqueta são a mesma coisa vista de dois sítios ────
       Apontar o ponto acende o nome, e apontar o nome acende o ponto. O teste
       faz-se em coordenadas de écran, com os números que a colocação já
       calculou; um raycaster contra esferas de 0,0004 de raio nunca acertava,
       porque geometricamente o alfinete é sub-pixel — o que se vê e o que se
       aponta é o halo, não a esfera. */
    const RAIO_TOQUE = 15;

    const alfineteEm = (px: number, py: number) => {
      let melhor: Etiqueta | null = null;
      let menor = RAIO_TOQUE * RAIO_TOQUE;
      for (const e of etiquetas) {
        if (!e.noEcra) continue;
        const dx = e.ecraX - px;
        const dy = e.ecraY - py;
        const d = dx * dx + dy * dy;
        if (d < menor) {
          menor = d;
          melhor = e;
        }
      }
      return melhor;
    };

    /** Onde está o ponteiro em coordenadas da caixa. */
    const noElemento = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const actualizarActivo = () => {
      const alvo = fixa ?? focada ?? sobEtiqueta ?? sobAlfinete;
      el.style.cursor = sobAlfinete ? "pointer" : "";
      if (alvo === activa) return;
      const antes = activa;
      activa = alvo;
      for (const e of [antes, alvo]) {
        if (!e) continue;
        const ligado = e === alvo;
        e.activo = ligado;
        e.nó.toggleAttribute("data-activo", ligado);
        realcar(e.alfinete, ligado);
        if (e.membros.length > 1) e.abrir(ligado);
        // O nome deixa de estar truncado e a caixa muda: remede-se.
        precisaMedir = true;
      }
      // O alfinete mudou de tamanho e a etiqueta de forma: é preciso um quadro.
      pedirQuadro();
    };

    /* Uma pilha não se abre por aproximação — dois pontos coincidentes nunca
       se separam. Abre-se por gesto: carregar nela mostra os nomes, carregar
       fora fecha-a. Nos nomes soltos, carregar é escolher. */
    function accionar(e: Etiqueta) {
      if (e.membros.length > 1) {
        fixa = fixa === e ? null : e;
        actualizarActivo();
      } else {
        aoEscolherRef.current?.(e.membros[0]);
      }
    }

    camadaEtiquetas.addEventListener("pointerover", (ev) => {
      const alvo = (ev.target as HTMLElement).closest(".globo-etiqueta");
      sobEtiqueta = etiquetas.find((e) => e.nó === alvo) ?? null;
      actualizarActivo();
    });
    camadaEtiquetas.addEventListener("pointerout", (ev) => {
      const para = ev.relatedTarget as Node | null;
      if (para && camadaEtiquetas.contains(para)) return;
      sobEtiqueta = null;
      actualizarActivo();
    });
    camadaEtiquetas.addEventListener("focusin", (ev) => {
      const alvo = (ev.target as HTMLElement).closest(".globo-etiqueta");
      focada = etiquetas.find((e) => e.nó === alvo) ?? null;
      actualizarActivo();
    });
    camadaEtiquetas.addEventListener("focusout", (ev) => {
      const para = ev.relatedTarget as Node | null;
      if (para && camadaEtiquetas.contains(para)) return;
      focada = null;
      actualizarActivo();
    });

    /* As larguras medidas antes de a Geist chegar são as da letra de recurso,
       e ficavam em cache para sempre: o teste de colisão passava o resto da
       sessão a comparar caixas que já não existiam. */
    document.fonts?.ready.then(() => {
      if (desmontado) return;
      precisaMedir = true;
      pedirQuadro();
    });

    const mundo = new THREE.Group();
    mundo.add(terra);
    mundo.add(grupoContornos);
    mundo.add(grupoAlfinetes);
    cena.add(mundo);

    /* ── O relógio ────────────────────────────────────────────────────────
       Um quadro é pedido; nunca agendado em cadeia. Só se pede quando há
       alguma coisa nova para ver, e só se serve quando há alguém a ver. */
    const duracao = parado ? 0 : DURACAO_ENTRADA;
    let aEntrar = !parado;

    const qGuinada = new THREE.Quaternion();
    const qInclinacao = new THREE.Quaternion();

    function podeDesenhar() {
      return noEcra && !escondido && contextoVivo && !desmontado;
    }

    function desenhar() {
      quadroPedido = 0;
      if (aEntrar) {
        // O relógio da entrada arranca no primeiro quadro que se vê, não no
        // momento em que o componente monta: fora do ecrã não há entrada.
        if (!inicio) inicio = performance.now();
        const t = Math.min(1, (performance.now() - inicio) / duracao);
        /* Interpola-se o LOGARITMO da altura. Em linha recta a aproximação
           arrasta-se enquanto está longe e precipita-se no fim, porque o que
           se vê muda com a escala e não com a distância; em logaritmo a
           escala muda à mesma taxa do princípio ao fim e lê-se como um
           movimento só. O alvo lê-se aqui, e não é fixado no arranque: se a
           caixa mudar de tamanho a meio, a entrada aponta ao sítio novo. */
        alturaVoo = Math.exp(
          Math.log(ALTURA_MAXIMA) + (Math.log(alturaRepouso) - Math.log(ALTURA_MAXIMA)) * suave(t)
        );
        if (t >= 1) aEntrar = false;
      }
      /* Guinada primeiro, no eixo do mundo; inclinação depois, no eixo leste
         da câmara. Assim o arrasto vertical move o chão a direito no ecrã —
         com `rotation.x`, que é o eixo X do mundo e aqui aponta para o lado,
         o arrasto vertical movia o chão na diagonal. */
      qGuinada.setFromAxisAngle(EIXO_POLAR, orbita.theta);
      qInclinacao.setFromAxisAngle(LESTE, orbita.phi);
      mundo.quaternion.copy(qInclinacao).multiply(qGuinada);
      colocarCamara();
      renderizador.render(cena, camara);
      etiquetar();
      // Só se encadeia enquanto alguma coisa se mexe.
      if (aEntrar || ponteiros.size > 0) pedirQuadro();
    }

    function pedirQuadro() {
      if (quadroPedido || !podeDesenhar()) return;
      quadroPedido = requestAnimationFrame(desenhar);
    }

    const parar = () => {
      if (quadroPedido) cancelAnimationFrame(quadroPedido);
      quadroPedido = 0;
      if (!pausadoEm) pausadoEm = performance.now();
    };
    const retomar = () => {
      // A entrada continua de onde ficou: o tempo parado não conta.
      if (pausadoEm && inicio) inicio += performance.now() - pausadoEm;
      pausadoEm = 0;
      pedirQuadro();
    };

    function revelar() {
      if (desmontado) return;
      setEstado((e) => (e === "a-carregar" ? "pronto" : e));
      pedirQuadro();
    }
    /* Rede de segurança: se nem o `load` nem o `error` chegarem — um proxy
       que engole o pedido, um browser que o deixa pendurado — o globo
       aparece na mesma passados quatro segundos. */
    const relogioRevelar = window.setTimeout(revelar, 4000);

    // ── Interacção ────────────────────────────────────────────────────────
    /* Quanto roda o mundo por pixel de arrasto. Sai da geometria, não de um
       número à sorte: um pixel de dedo é um pixel de chão, a qualquer altura
       e em qualquer caixa. Com o 0,004 rad/px fixo que aqui estava, 120px de
       arrasto rodavam o mundo 27° — umas oito larguras de quadro — e num
       telemóvel isso punha a câmara sobre o meio do Atlântico, de noite, sem
       nada no ecrã por onde se soubesse voltar. */
    const escala = () => {
      const { eixo, sep, distancia } = enquadrar(alturaVoo);
      const meiaAltura = Math.tan((FOV / 2) * grau);
      const l = larguraCaixa;
      const a = alturaCaixa;
      return {
        l,
        a,
        // A guinada corre paralelos: à latitude da mira um ponto anda cos(lat).
        theta: (2 * distancia * meiaAltura * camara.aspect) / (l * Math.cos(MIRA.lat * grau)),
        /* Na vertical o chão está deitado: da mira vê-se a câmara a (δ0 − Δ)
           acima do horizonte, e por isso um pixel vale 1/sin(δ0 − Δ) vezes
           mais chão do que valeria de frente. */
        phi: (2 * distancia * meiaAltura) / (a * Math.max(0.08, Math.sin(eixo - sep))),
      };
    };

    const mudarAltura = (factor: number) => {
      aEntrar = false;
      zoomDoUtilizador = true;
      alturaVoo = Math.min(ALTURA_MAXIMA, Math.max(ALTURA_MINIMA, alturaVoo * factor));
      pedirQuadro();
    };

    const entreDedos = () => {
      const [a, b] = [...ponteiros.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) || 1 : 0;
    };

    const aoDescer = (e: PointerEvent) => {
      aEntrar = false;
      arrastou = false;
      ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      pinca = entreDedos();
      /* Num ecrã táctil não há passeio do rato que acenda o alfinete antes do
         toque: quem escolhe o alvo é o próprio toque. */
      const p = noElemento(e);
      sobAlfinete = alfineteEm(p.x, p.y);
      actualizarActivo();
      el.setPointerCapture(e.pointerId);
      pedirQuadro();
    };

    const aoMover = (e: PointerEvent) => {
      const antes = ponteiros.get(e.pointerId);
      if (!antes) {
        // Sem botão em baixo é só passear: acende-se o ponto que está debaixo.
        const p = noElemento(e);
        sobAlfinete = alfineteEm(p.x, p.y);
        actualizarActivo();
        return;
      }
      const dx = e.clientX - antes.x;
      const dy = e.clientY - antes.y;
      antes.x = e.clientX;
      antes.y = e.clientY;
      // Três pixéis chegam para separar um clique de um arrasto; sem isto,
      // largar o rato depois de rodar o globo abria a coudelaria por baixo.
      if (Math.abs(dx) + Math.abs(dy) > 3) arrastou = true;

      if (ponteiros.size >= 2) {
        /* Dois dedos mudam a altura. Num telemóvel não há roda do rato, e
           sem isto não havia zoom nenhum — o globo era só arrastável. */
        const agora = entreDedos();
        if (pinca > 0 && agora > 0) mudarAltura(pinca / agora);
        pinca = agora;
        arrastou = true;
        return;
      }

      const s = escala();
      /* Limites: o centro do quadro passeia até 20% da largura e 12% da
         altura. Chega para espreitar Espanha ou o Atlântico e não chega para
         perder o país — que é a diferença entre olhar à volta e ficar
         perdido. Dantes a guinada não tinha limite nenhum. */
      const limiteTheta = 0.2 * s.l * s.theta;
      const limitePhi = 0.12 * s.a * s.phi;
      orbita.theta = Math.max(-limiteTheta, Math.min(limiteTheta, orbita.theta + dx * s.theta));
      orbita.phi = Math.max(-limitePhi, Math.min(limitePhi, orbita.phi - dy * s.phi));
      pedirQuadro();
    };

    const largar = (e: PointerEvent, clique: boolean) => {
      const tinha = ponteiros.delete(e.pointerId);
      pinca = entreDedos();
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (!tinha) return;
      const eraArrasto = arrastou;
      if (ponteiros.size === 0) arrastou = false;
      if (!clique || eraArrasto || e.target !== lona) return;
      // O alfinete vale um clique tanto quanto o nome: é ele o alvo que se vê.
      if (sobAlfinete) accionar(sobAlfinete);
      // Carregar no vazio fecha a pilha que estiver aberta.
      else if (fixa) {
        fixa = null;
        actualizarActivo();
      }
    };

    const aoLargar = (e: PointerEvent) => largar(e, true);
    const aoCancelar = (e: PointerEvent) => largar(e, false);
    const aoSair = (e: PointerEvent) => {
      // Sair da caixa nunca é um clique, e apaga o ponto que estava aceso.
      aoCancelar(e);
      sobAlfinete = null;
      actualizarActivo();
    };

    const aoRodar = (e: WheelEvent) => {
      e.preventDefault();
      /* Multiplicativo e proporcional ao deslocamento: um dente de roda
         (deltaY ≈ 120) muda a altura 14%, e um trackpad, que manda muitos
         eventos pequenos, anda à mesma velocidade em vez de disparar. */
      const passo = Math.max(-120, Math.min(120, e.deltaY)) / 120;
      mudarAltura(Math.exp(passo * 0.13));
    };

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !fixa) return;
      fixa = null;
      actualizarActivo();
    };

    el.addEventListener("pointerdown", aoDescer);
    el.addEventListener("pointermove", aoMover);
    el.addEventListener("pointerup", aoLargar);
    el.addEventListener("pointercancel", aoCancelar);
    el.addEventListener("pointerleave", aoSair);
    el.addEventListener("wheel", aoRodar, { passive: false });
    el.addEventListener("keydown", aoTeclar);

    /* ── Perda de contexto ────────────────────────────────────────────────
       Acontece em telemóveis com pouca memória, e acontecia sem ninguém
       dar por isso: o three deixa de desenhar e o `requestAnimationFrame`
       continuava a rodar a 60 por segundo em cima de uma tela morta —
       medido. Agora o relógio pára e diz-se o que se passou. O three já
       trata do `preventDefault` e de reconstruir o estado no `restored`;
       o que falta aqui é o relógio e a palavra ao utilizador. */
    const aoPerderContexto = () => {
      contextoVivo = false;
      parar();
      setEstado("perdido");
    };
    const aoReporContexto = () => {
      contextoVivo = true;
      setEstado((e) => (e === "perdido" ? "pronto" : e));
      retomar();
    };
    lona.addEventListener("webglcontextlost", aoPerderContexto);
    lona.addEventListener("webglcontextrestored", aoReporContexto);

    // ── Quando é que vale a pena desenhar ─────────────────────────────────
    const observadorVista = new IntersectionObserver(
      ([entrada]) => {
        noEcra = entrada.isIntersecting;
        if (noEcra) retomar();
        else parar();
      },
      { threshold: 0 }
    );
    observadorVista.observe(el);

    const aoMudarSeparador = () => {
      escondido = document.hidden;
      if (escondido) parar();
      else retomar();
    };
    document.addEventListener("visibilitychange", aoMudarSeparador);

    const observador = new ResizeObserver(() => {
      const l = el.clientWidth || 1;
      const a = el.clientHeight || 1;
      larguraCaixa = l;
      alturaCaixa = a;
      renderizador.setSize(l, a);
      camara.aspect = l / a;
      camara.updateProjectionMatrix();
      /* Numa caixa muito estreita o país deixa de caber ao largo, e a
         resposta é subir — não abrir a lente. Abrir a vertical para
         recuperar campo na horizontal mudava o horizonte de sítio ao rodar o
         telemóvel: a composição deixava de ser a mesma composição. Subir
         mantém a lente honesta e o horizonte a 18%. */
      alturaRepouso = Math.max(ALTURA_REPOUSO, alturaParaCaber(camara.aspect));
      if (!aEntrar && !zoomDoUtilizador) alturaVoo = alturaRepouso;
      // Numa coluna mais estreita as etiquetas encolhem: as medidas em cache
      // deixam de valer, e é delas que sai o teste de colisão.
      precisaMedir = true;
      pedirQuadro();
    });
    observador.observe(el);

    colocarCamara();

    return () => {
      desmontado = true;
      cancelarContornos.abort();
      window.clearTimeout(relogioRevelar);
      if (quadroPedido) cancelAnimationFrame(quadroPedido);
      observador.disconnect();
      observadorVista.disconnect();
      document.removeEventListener("visibilitychange", aoMudarSeparador);
      lona.removeEventListener("webglcontextlost", aoPerderContexto);
      lona.removeEventListener("webglcontextrestored", aoReporContexto);
      el.removeEventListener("pointerdown", aoDescer);
      el.removeEventListener("pointermove", aoMover);
      el.removeEventListener("pointerup", aoLargar);
      el.removeEventListener("pointercancel", aoCancelar);
      el.removeEventListener("pointerleave", aoSair);
      el.removeEventListener("wheel", aoRodar);
      el.removeEventListener("keydown", aoTeclar);
      /* Os ouvintes das etiquetas ficam nos nós que saem daqui com a camada:
         a árvore inteira fica sem referências e vai com o resto do fecho. */
      camadaEtiquetas.remove();

      cena.traverse((o) => {
        const obj = o as THREE.Mesh;
        /* A geometria de um `Sprite` não é nossa: o three tem uma só,
           partilhada por todos os sprites do processo. Descartá-la partia
           o sprite seguinte que alguém criasse na aplicação. */
        if (obj.geometry && !(o instanceof THREE.Sprite)) obj.geometry.dispose();
        const m = obj.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else if (m) m.dispose();
      });
      alfinetes.dispose();
      for (const m of materiaisHalo) m.dispose();
      /* Um `ShaderMaterial.dispose()` não toca nas texturas dos uniformes,
         e um `Sprite` não é `Mesh` nem `Points` — a limpeza antiga não lhes
         chegava. Medido: vinte teclas escritas na pesquisa levavam as
         texturas vivas de 8 a 101 e a memória de 8,9 para 18,5 MB. */
      for (const t of texturas) t.dispose();

      renderizador.dispose();
      /* `dispose()` larga o que o renderizador alocou, mas o contexto WebGL
         em si só se liberta com isto. Sem ele, vinte montagens enchiam a
         consola de «Too many active WebGL contexts. Oldest context will be
         lost» — que é o globo de outro separador a apagar-se sozinho. */
      renderizador.forceContextLoss();
      lona.remove();
    };
    /* A assinatura não se lê aqui dentro — os grupos vêm do `gruposRef`. Está
       nas dependências porque é ela, e não a identidade do array, que decide
       quando é que vale a pena deitar a cena fora e montar outra. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura]);

  useEffect(() => montar(), [montar]);

  const semImagem = estado === "sem-3d";

  return (
    <div className="relative h-full w-full">
      <div
        ref={caixa}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        style={{
          opacity: estado === "a-carregar" || semImagem ? 0 : 1,
          transition: "opacity 900ms var(--ease-out)",
        }}
      />
      {(semImagem || estado === "perdido") && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center">
          <p className="rotulo-forte">
            {semImagem ? "Vista 3D indisponível" : "Vista 3D suspensa"}
          </p>
          <p className="meta max-w-[36ch]">
            {semImagem
              ? `Este navegador não conseguiu abrir a cena 3D. As ${pontos.length} coudelarias estão todas na lista.`
              : "O navegador libertou a memória gráfica. A vista volta assim que ele a devolver."}
          </p>
        </div>
      )}
      {/* Só se pode tabular pelos nomes que estão à vista; os que estão do
          outro lado do planeta ficam `inert`. Quem não quiser rodar o globo
          para lá chegar tem a lista, e é preciso dizê-lo. */}
      <p className="sr-only">
        Globo com {pontos.length} coudelarias em Portugal, em {grupos.length} pontos. Percorre-se
        por tabulação, mas só os nomes visíveis de cada vez; a lista completa está na vista de
        lista.
      </p>
    </div>
  );
}
