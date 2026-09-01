"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { nomeCurto, sitioCurto } from "@/lib/nomes-globo";
import * as THREE from "three";
import { resolverCoordenadas, type CoudelariaNoMapa } from "@/lib/coordenadas-coudelarias";
import { agrupar, kmPorPixel, raioEmDegraus } from "@/lib/agrupar-globo";

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

/** A janela do mapa de relevo, em graus. É a Península e o mar à volta.
 *
 *  Não é o planeta todo por duas razões. A primeira é o peso: a esta
 *  resolução — 163 pontos por grau de longitude, contra os 5,7 da textura do
 *  mundo — o planeta inteiro dava noventa e seis megabytes. A segunda é
 *  que não faria falta: a câmara olha sempre para aqui, e o que está a mais
 *  de mil quilómetros já não se lê como terreno, lê-se como bruma.
 *
 *  As bordas caem no mar ou bem longe da mira, e o peso esbate-se num grau
 *  antes de lá chegar. */
const JANELA_RELEVO = { lonMin: -13, lonMax: -2, latMin: 35, latMax: 45 };
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
  varying vec3 vEste;
  varying vec3 vNorte;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 posMundo = modelMatrix * vec4(position, 1.0);
    vPosMundo = posMundo.xyz;
    vec4 posVista = modelViewMatrix * vec4(position, 1.0);
    vPosVista = posVista.xyz;

    /* ── O norte e o este deste ponto, para o mapa de relevo ───────────────
       O relevo vem guardado como o declive do terreno em duas direcções —
       para nascente e para norte —, que é como se mede um declive num mapa.
       Para o iluminar com o Sol da cena é preciso saber para onde apontam
       essas duas direcções aqui, e é preciso sabê-lo no mesmo referencial
       em que está a normal, senão a serra fica com a luz do lado errado.

       Sai daqui e não do fragmento porque a matriz que leva uma normal ao
       referencial da câmara — a «normalMatrix» — o three.js só a declara no
       vértice. Como isto acompanha a «normal» pela mesma matriz, o globo
       pode rodar à vontade que a luz do relevo roda com ele. */
    vec3 cima = normalize(position);
    vec3 semNorte = vec3(0.0, 1.0, 0.0) - cima * cima.y;
    // Nos pólos o norte deixa de existir; o piso evita um NaN a alastrar.
    vec3 norte = semNorte / max(length(semNorte), 1e-4);
    vNorte = normalize(normalMatrix * norte);
    vEste = normalize(normalMatrix * cross(norte, cima));

    gl_Position = projectionMatrix * posVista;
  }
`;

const FRAG_TERRA = /* glsl */ `
  uniform sampler2D mapaDia;
  uniform sampler2D mapaLuzes;
  uniform sampler2D mapaBrilho;
  uniform sampler2D mapaRelevo;
  uniform vec4 janelaRelevo;
  uniform float relevoPronto;
  uniform float exageroRelevo;
  uniform float ganhoRelevo;
  uniform float extincao;
  uniform float raioTopo;
  uniform vec3 sol;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosVista;
  varying vec3 vPosMundo;
  varying vec3 vEste;
  varying vec3 vNorte;

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

    /* ── A cor ao longe ──────────────────────────────────────────────────
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

    /* ── O relevo, onde há relevo para mostrar ───────────────────────────
       A textura do planeta tem 2048 pixéis para dar a volta ao mundo: desta
       altura são seis por grau, e Portugal inteiro cabe em dezanove deles
       ao largo, esticados por duzentos e tal pixéis de ecrã. Nenhum filtro
       tira nitidez de onde ela não está, e uma textura de ruído por cima
       não é terreno — é ruído. O que falta não é contraste, é geografia.

       Por isso a geografia vem de facto: «relevo.webp» é o declive do
       terreno da Península, tirado de altimetria verdadeira (os tiles
       Terrarium da AWS, 234 m por amostra a esta latitude, reduzidos a
       meio quilómetro por ponto no que se entrega), guardado como as duas
       componentes da normal — para nascente e para norte — mais a
       altitude no azul. Não é um ornamento procedural: a Serra da Estrela
       está lá porque está lá, e o vale do Guadiana faz a curva que faz.

       Guarda-se a normal e não um sombreado pronto porque o Sol desta cena
       é um uniforme: assim é o mesmo Sol que ilumina a serra e o resto do
       planeta, e ao rodar o globo a luz do relevo roda com ele. Um
       sombreado cozido com outra luz brigava com o terminador.

       Só a Península: é o que se vê de perto, e é aí que a falta de nitidez
       se lê. Ao largo da janela o peso vai a zero num grau, que é dentro da
       bruma — não há costura para ver. */
    vec2 grauUv = vec2(vUv.x * 360.0 - 180.0, vUv.y * 180.0 - 90.0);
    vec2 uvRelevo = (grauUv - janelaRelevo.xz) / (janelaRelevo.yw - janelaRelevo.xz);
    vec2 daBorda = min(uvRelevo, 1.0 - uvRelevo);
    float pesoRelevo = smoothstep(0.0, 0.05, min(daBorda.x, daBorda.y)) * relevoPronto;

    /* A amostra vem de fora de qualquer «if», e de propósito.
       O nível de mipmap sai da derivada das coordenadas entre pixéis
       vizinhos, e dentro de um ramo que uns pixéis tomam e outros não essa
       derivada não está definida — a norma diz mesmo que o resultado é
       indeterminado. Na prática dava uma orla de um pixel com o nível
       errado a toda a volta da janela. O ramo poupava meia dúzia de contas
       fora da Península; não vale uma linha de lixo. */
    vec3 amostra = texture2D(mapaRelevo, clamp(uvRelevo, 0.0, 1.0)).rgb;

    /* O azul separa a terra da água: zero é mar, e a terra começa acima
       do intervalo vazio que se deixou na compressão. Sem este teste o
       relevo gravava a plataforma continental no mar, que é batimetria
       verdadeira e mesmo assim erro — de órbita não se vê o fundo. */
    float terra = smoothstep(0.03, 0.08, amostra.b);

    /* Da normal guardada tira-se o declive, exagera-se, e volta a fazer-se
       a normal. Exagerar a normal directamente encostava-a ao horizonte
       sem nunca lá chegar; exagerar o declive é o que a cartografia faz
       há um século, e é linear no que interessa. */
    vec2 nEN = amostra.rg * 2.0 - 1.0;
    float nCima = sqrt(max(1.0 - dot(nEN, nEN), 1e-4));
    vec2 declive = -nEN / nCima * exageroRelevo;
    vec3 nLocal = normalize(vec3(-declive, 1.0));
    vec3 nTerreno = normalize(vEste * nLocal.x + vNorte * nLocal.y + n * nLocal.z);

    /* Junto ao horizonte o relevo desaparece com o resto: lá a coluna de
       ar já come tudo, e um declive amostrado de raspão só daria cintilação. */
    float p = pesoRelevo * terra * (1.0 - 0.75 * longe);

    /* Guarda-se o DESVIO da luz, não a luz do terreno.
       Substituir uma pela outra escurecia o país: um terreno rugoso
       apanha, em média, menos luz do que a esfera lisa, e a média é o
       que menos interessa aqui — o que se quer ver é a diferença entre a
       encosta virada ao Sol e a que lhe volta as costas. Como o desvio
       tem média nula, o Alentejo fica com o brilho que tinha e ganha só
       o que lhe faltava, que era ter dois lados.

       O ganho existe porque o Sol desta cena está a 61° de altura sobre
       Portugal — escolhido para o país se ler, e não se mexe. A essa
       altura a luz cai quase a pique e o relevo verdadeiro rende cinco
       por cento de contraste: certo de mais para se ver. É a mesma
       licença que qualquer carta de relevo toma há um século. */
    float desvio = dot(nTerreno, dirSol) - luz;
    float relevoLuz = mix(1.0, clamp(1.0 + desvio * ganhoRelevo, 0.30, 1.95), p);

    /* De caminho, a costa: o mapa do mar também tem 2048 pixéis para dar
       a volta ao mundo, e por isso a sua orla escorre uns vinte
       quilómetros por terra dentro. Onde escorria, o reflexo do Sol
       acendia-se em cima do Sado e da foz do Tejo — uma mancha clara com
       a forma de nada. A altimetria sabe onde acaba a terra a meio
       quilómetro; é ela que fecha a torneira. */
    mar = min(mar, mix(1.0, 1.0 - terra, pesoRelevo));

    // Lado iluminado, com o azul do mar a ganhar profundidade nos bordos.
    vec3 ladoDia = corDia * (0.35 + 0.75 * max(luz, 0.0)) * relevoLuz;

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

/* ── Os alfinetes, medidos em pixéis de ecrã ───────────────────────────────
 *
 * Eram uma esfera de 0,0004 de raio mais um `Sprite` com um degradê por cima,
 * um par por coudelaria. Duas coisas estavam mal.
 *
 * A primeira: as duas medem-se em unidades do mundo, logo crescem no ecrã à
 * medida que a câmara desce. Com o curso de zoom que havia — 1,6× — mal se
 * notava; com 3,5× cada ponto vira uma bola branca que tapa o terreno e os
 * nomes. E não é só a altura: a câmara olha inclinada 14°, por isso o
 * primeiro plano está três vezes mais perto do que a mira e os pontos de
 * baixo saíam ao triplo do tamanho dos de cima — no mesmo quadro, para
 * coudelarias iguais. Um alfinete não é um objecto do mundo, é uma marca
 * sobre ele: tem o tamanho de um ícone, e um ícone tem o mesmo tamanho em
 * todo o lado.
 *
 * A segunda: um `Sprite` é um objecto e um objecto é uma chamada de desenho.
 * Vinte e nove alfinetes eram vinte e nove chamadas — mais do que a cena
 * inteira gastava em tudo o resto junto.
 *
 * A resposta é a mesma que as estrelas aqui ao lado já usam: uma nuvem de
 * pontos só, com o tamanho em pixéis no `gl_PointSize`. Uma chamada, tamanho
 * constante, e o núcleo e a orla desenhados no mesmo pixel — o degradê em
 * `canvas` que servia de textura ao halo deixa de ser preciso.
 */
const VERT_PONTOS = /* glsl */ `
  attribute float tamanho;
  attribute float nucleo;
  varying float vNucleo;
  void main() {
    vNucleo = nucleo;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = tamanho;
  }
`;

const FRAG_PONTOS = /* glsl */ `
  varying float vNucleo;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    /* As mesmas paragens do degradê que aqui estava — núcleo cheio, queda
       curta a 22% do raio, cauda a apagar-se aos 60% — só que agora a
       fronteira do núcleo é uma fracção do raio e não um número fixo, para
       que o ponto aceso engorde o núcleo e não só a orla. */
    float centro = 1.0 - smoothstep(vNucleo * 0.72, vNucleo, r);
    float orla = 1.0 - smoothstep(0.12, 1.0, r);
    float a = clamp(centro + orla * orla * 0.55, 0.0, 1.0);
    if (a < 0.004) discard;
    gl_FragColor = vec4(vec3(a), 1.0);
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
/** ≈ 80 km, e o quadro passa de 746 km de largura para 213: **3,5× de
    ampliação**, contra os 1,6× que aqui estavam.

    O número que aqui estava (0,03) tinha por razão escrita que «a textura tem
    um texel por cada 20 km» — e essa razão caducou quando chegou o
    `relevo.webp`, que traz elevação a sério a 234 m por amostra. O limite
    novo foi medido, degrau a degrau, com o botão de aproximar e uma captura
    por degrau (11 degraus de 1,35×, do repouso até 27×):

      quadro 222 km (3,4×)  terreno lê-se: vales e serras, costa nítida
      quadro 172 km (4,3×)  o primeiro plano vira um xadrez visível

    O que quebra não é a fotografia do dia nem a resolução do relevo — a essa
    ampliação ainda vai um texel de relevo por pixel de ecrã. O que se vê são
    os **blocos de 8×8 da compressão com perdas** do `relevo.webp`, ampliados
    pelo primeiro plano, que numa câmara inclinada 14° está três vezes mais
    perto do que a mira. Por isso o tecto fica do lado de cá do degrau onde
    eles aparecem. Quem quiser mais fundo tem de reencodar a textura com
    menos perda — é lá que está o limite, não aqui. */
const ALTURA_MINIMA = 0.0125;
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

type Ponto = { c: CoudelariaNoMapa; coords: [number, number] };

/** Estado visível do componente. */
type Estado = "a-carregar" | "pronto" | "sem-3d" | "perdido";

/** O destino de uma coudelaria, por omissão: a ficha dela. */
const fichaPorOmissao = (c: CoudelariaNoMapa) =>
  c.slug ? `/directorio/${encodeURIComponent(c.slug)}` : null;

export default function GloboTerra({
  coudelarias,
  aoEscolher,
  hrefDe = fichaPorOmissao,
}: {
  coudelarias: CoudelariaNoMapa[];
  /** Chamado ao carregar num nome que não tem destino — ver `hrefDe`. */
  aoEscolher?: (c: CoudelariaNoMapa) => void;
  /** Para onde leva um nome. Devolver `null` desliga a ligação e devolve o
      clique ao `aoEscolher` — é assim que a página pede uma janela em vez de
      uma navegação, sem que o globo saiba o que é uma janela. */
  hrefDe?: (c: CoudelariaNoMapa) => string | null;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const encaminhador = useRouter();
  const [estado, setEstado] = useState<Estado>("a-carregar");

  const pontos = useMemo(
    () =>
      coudelarias
        .map((c) => ({ c, coords: resolverCoordenadas(c) }))
        .filter((x): x is Ponto => x.coords !== null),
    [coudelarias]
  );

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
     pontos e mais nada: os ajuntamentos são uma função pura desta lista e da
     altura a que a câmara está, e essa muda dentro da cena. */
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
  const pontosRef = useRef(pontos);
  const aoEscolherRef = useRef(aoEscolher);
  const hrefDeRef = useRef(hrefDe);
  const encaminhadorRef = useRef(encaminhador);
  useEffect(() => {
    pontosRef.current = pontos;
    aoEscolherRef.current = aoEscolher;
    hrefDeRef.current = hrefDe;
    encaminhadorRef.current = encaminhador;
  });

  const montar = useCallback(() => {
    const el = caixa.current;
    if (!el) return () => {};
    const pontos = pontosRef.current;
    /** Quantos alfinetes pode haver, no pior caso: um por coudelaria. */
    const TECTO = Math.max(1, pontos.length);

    /** O destino de uma coudelaria, ou `null` se quem nos usa não quiser um. */
    const hrefDe = (c: CoudelariaNoMapa) => hrefDeRef.current?.(c) ?? null;

    /* Ir para a coudelaria. O `href` já lá está para o browser fazer o que
       sabe — abrir noutro separador, copiar o endereço, botão do meio —, por
       isso só se intercepta o clique **simples e sem teclas**: esse vai pelo
       encaminhador do Next, que troca a página sem recarregar o site inteiro.
       Sem destino, quem decide é quem nos chamou. */
    const escolher = (c: CoudelariaNoMapa, ev?: MouseEvent) => {
      const destino = hrefDe(c);
      if (!destino) {
        aoEscolherRef.current?.(c);
        return;
      }
      if (!ev) {
        encaminhadorRef.current.push(destino);
        return;
      }
      if (ev.defaultPrevented) return;
      if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      ev.preventDefault();
      encaminhadorRef.current.push(destino);
    };

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
    /* ── A parte da lona que está mesmo à vista ───────────────────────────
       A lona ocupa a caixa toda, mas nem toda a caixa se vê: a barra de
       cookies está fixa ao fundo do ecrã e, num telemóvel, tapa 162 dos 518
       pixéis de altura do globo — quase um terço. Medido: dos cinco nomes
       que se liam, dois ficavam por baixo dela. O cabeçalho faz o mesmo em
       cima quando a página está rolada.

       O motor de etiquetas passa a colocar dentro desta janela e não dentro
       da lona. Os alfinetes ficam onde estão — um ponto tapado é um ponto
       tapado —, mas o nome sobe para cima do estorvo e o fio, que continua a
       apontar-lhe, atravessa-o: lê-se «há mais ali por baixo», que é
       verdade, em vez de não se ler nada. */
    let topoUtil = 0;
    let baseUtil = altura;
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

    /* O relevo carrega-se à parte das outras três porque tem de acender uma
       chave ao chegar — e porque, se não chegar, o globo fica exactamente
       como estava em vez de ficar com a Península afogada. */
    const mapaRelevo = carregador.load(
      "/globo/relevo.webp",
      () => {
        const m = terra.material as THREE.ShaderMaterial;
        m.uniforms.relevoPronto.value = 1;
        revelar();
      },
      undefined,
      revelar
    );
    mapaRelevo.colorSpace = THREE.NoColorSpace;
    mapaRelevo.anisotropy = renderizador.capabilities.getMaxAnisotropy();
    texturas.push(mapaRelevo);

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
          /* O relevo são declives, não cor: entra em valores lineares, que
             é como saiu. Passado por sRGB, a curva torcia-lhe as encostas. */
          mapaRelevo: { value: mapaRelevo },
          janelaRelevo: {
            value: new THREE.Vector4(
              JANELA_RELEVO.lonMin,
              JANELA_RELEVO.lonMax,
              JANELA_RELEVO.latMin,
              JANELA_RELEVO.latMax
            ),
          },
          /* Fica a zero até o ficheiro chegar. Uma textura por carregar é
             preta, e preta quer dizer «mar» no canal da altitude: sem esta
             chave a Península aparecia rasa até ao relevo aterrar. */
          relevoPronto: { value: 0 },
          /* Exagero vertical. Um relevo à escala verdadeira não se vê: a
             Estrela tem dois quilómetros de altura para duzentos de largura,
             e a olho isso é uma planície. Seis é o valor a que a serra se
             lê como serra sem que o Alentejo ganhe rugas que não tem. */
          exageroRelevo: { value: 6 },
          /* Quanto é que o desvio de luz do relevo pesa no que se vê. Vale
             o que vale porque foi medido no ecrã, não porque saia de uma
             conta: abaixo de 2 o Alentejo continua a ser uma mancha, acima
             de 4 as encostas ganham um contorno duro que se lê como filtro. */
          ganhoRelevo: { value: 3 },
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
    /* Uma nuvem de pontos só, medida em pixéis de ecrã. A razão está escrita
       por cima do `VERT_PONTOS`, lá em cima: um alfinete não é um objecto do
       mundo, é uma marca sobre ele — tem de ter o mesmo tamanho a qualquer
       altura e em qualquer sítio do quadro —, e vinte e nove `Sprite` eram
       vinte e nove chamadas de desenho.

       Um alfinete por ponto, não por coudelaria. Onde havia duas no mesmo
       sítio desenhavam-se dois halos aditivos por cima um do outro: o ponto
       saía ao dobro do brilho dos vizinhos, e o que parecia uma coudelaria
       mais importante era só uma sobreposta.

       Branco, e não dourado. Os alfinetes em destaque eram vinte e um dos
       vinte e nove: um acento em setenta e dois por cento dos pontos não
       assinala nada. Sobre a fotografia do planeta quem assinala é o
       contraste, e o que distingue um destaque passa a ser o tamanho. */
    const grupoAlfinetes = new THREE.Group();

    /** Diâmetro do halo, em pixéis de ecrã, e do núcleo lá dentro.
        São os mesmos que o par esfera+sprite dava no enquadramento de
        repouso — 10px de halo e 6 de núcleo —, agora fixos em vez de
        dependentes da distância. */
    const PONTO = 10;
    const PONTO_NUCLEO = 6;
    const PONTO_ACESO = 18;
    const NUCLEO_ACESO = 9;

    const posPontos = new Float32Array(TECTO * 3);
    const tamPontos = new Float32Array(TECTO);
    const nucPontos = new Float32Array(TECTO);
    const geoPontos = new THREE.BufferGeometry();
    geoPontos.setAttribute("position", new THREE.BufferAttribute(posPontos, 3));
    geoPontos.setAttribute("tamanho", new THREE.BufferAttribute(tamPontos, 1));
    geoPontos.setAttribute("nucleo", new THREE.BufferAttribute(nucPontos, 1));
    geoPontos.setDrawRange(0, 0);
    /* Sem esfera de contenção calculada a partir de um buffer meio vazio: os
       pontos por usar estão todos na origem, e uma esfera que os apanhasse
       punha o `frustum culling` a decidir mal. O que se desenha é sempre um
       punhado de pontos sobre a Península; não há nada a poupar em cortá-los. */
    geoPontos.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), RAIO * 1.1);

    const alfinetes = new THREE.Points(
      geoPontos,
      new THREE.ShaderMaterial({
        vertexShader: VERT_PONTOS,
        fragmentShader: FRAG_PONTOS,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      })
    );
    alfinetes.frustumCulled = false;
    grupoAlfinetes.add(alfinetes);

    type Alfinete = {
      indice: number;
      posicao: THREE.Vector3;
      /** Diâmetro em repouso, em pixéis. */
      base: number;
      /** Diâmetro do núcleo em repouso, em pixéis. */
      nucleo: number;
    };

    const alfinetesFeitos: Alfinete[] = [];

    const escreverPonto = (a: Alfinete, ligado: boolean) => {
      const d = ligado ? PONTO_ACESO : a.base;
      const n = ligado ? NUCLEO_ACESO : a.nucleo;
      tamPontos[a.indice] = d * pontoDoEcra;
      // O núcleo vai em fracção do raio, que é o que o shader sabe medir.
      nucPontos[a.indice] = Math.min(1, n / d);
    };

    const fazerAlfinete = (
      indice: number,
      coords: [number, number],
      destaque: boolean,
      grupo: boolean
    ): Alfinete => {
      const posicao = naEsfera(coords[0], coords[1], RAIO * 1.004);
      /* O tamanho é o que diz a hierarquia, agora que a cor não a diz: mais
         aberto num destaque, e mais aberto ainda onde há mais do que uma —
         o ponto lê-se como pilha antes de se chegar a ler o «2». */
      const base = grupo ? PONTO * 1.6 : destaque ? PONTO * 1.25 : PONTO;
      const nucleo = grupo ? PONTO_NUCLEO * 1.35 : PONTO_NUCLEO;
      const a: Alfinete = { indice, posicao, base, nucleo };
      posPontos[indice * 3] = posicao.x;
      posPontos[indice * 3 + 1] = posicao.y;
      posPontos[indice * 3 + 2] = posicao.z;
      escreverPonto(a, false);
      alfinetesFeitos.push(a);
      return a;
    };

    /** Marcar os três buffers como sujos. Uma vez por mudança, não por ponto. */
    const pontosMudaram = () => {
      geoPontos.attributes.position.needsUpdate = true;
      geoPontos.attributes.tamanho.needsUpdate = true;
      geoPontos.attributes.nucleo.needsUpdate = true;
    };

    /** Acender ou apagar um alfinete: reescreve-se o tamanho daquele índice. */
    const realcar = (a: Alfinete, ligado: boolean) => {
      escreverPonto(a, ligado);
      pontosMudaram();
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

    /* ── Voltar não é chegar ──────────────────────────────────────────────
     *
     * Ir a uma ficha e carregar em «voltar» refazia a aproximação inteira —
     * dois segundos e meio de viagem — e devolvia a órbita inicial, ainda que
     * a pessoa estivesse aproximada sobre o Ribatejo. O mesmo acontecia ao
     * escrever na pesquisa: mudar o conjunto de coudelarias remonta a cena, e
     * a cena arrancava sempre do espaço. Quem estava a trabalhar num sítio
     * era mandado de volta ao princípio a cada gesto.
     *
     * Guarda-se o enquadramento no `sessionStorage`: dura o separador, não
     * atravessa sessões nem se escreve em disco de ninguém. Quem volta dentro
     * de meia hora encontra o mapa onde o deixou; quem chega de novo vê a
     * entrada, que é a primeira imagem e continua a valer a pena.
     *
     * Só se guarda o que foi escolhido: se ninguém mexeu no zoom nem
     * arrastou, não há nada para repor e a entrada corre na mesma.
     */
    const CHAVE_VISTA = "globo-terra:vista";
    const VALIDADE_VISTA = 30 * 60 * 1000;

    const guardarVista = () => {
      if (!zoomDoUtilizador && !orbita.theta && !orbita.phi) return;
      try {
        sessionStorage.setItem(
          CHAVE_VISTA,
          JSON.stringify({ h: alturaVoo, t: orbita.theta, p: orbita.phi, q: Date.now() })
        );
      } catch {
        /* Sem armazenamento — janela privada, política do browser — o globo
           faz exactamente o que fazia antes. Não é um erro, é um extra. */
      }
    };

    const vistaGuardada = (() => {
      try {
        const cru = sessionStorage.getItem(CHAVE_VISTA);
        if (!cru) return null;
        const v = JSON.parse(cru) as { h: number; t: number; p: number; q: number };
        if (!v || Date.now() - v.q > VALIDADE_VISTA) return null;
        if (![v.h, v.t, v.p].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
        return v;
      } catch {
        return null;
      }
    })();

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
    /* As setas percorrem as vinte e nove, não só as que estão escritas. Está
       dito aqui e por extenso no parágrafo de leitura de ecrã. */
    camadaEtiquetas.setAttribute("aria-keyshortcuts", "ArrowDown ArrowUp Home End");
    el.appendChild(camadaEtiquetas);

    type Caixa = { x: number; y: number; l: number; a: number };
    type Medida = { l: number; a: number };
    type Etiqueta = {
      nó: HTMLElement;
      /** A cabeça accionável, que é quem recebe o foco. */
      cabeca: HTMLElement;
      /** Que elemento representa cada coudelaria deste ponto. É por aqui que
          as setas dão o foco à coudelaria certa dentro de um ajuntamento. */
      alvos: Map<string, HTMLElement>;
      /** Onde está no planeta. É por aqui que as setas ordenam e centram. */
      coords: [number, number];
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
        oculto: boolean;
        morto: boolean;
      };
    };

    let sobAlfinete: Etiqueta | null = null;
    let sobEtiqueta: Etiqueta | null = null;
    let focada: Etiqueta | null = null;
    let fixa: Etiqueta | null = null;
    let activa: Etiqueta | null = null;

    /** As etiquetas que existem neste momento. Muda a cada reagrupamento. */
    let etiquetas: Etiqueta[] = [];

    const criarEtiqueta = (
      coords: [number, number],
      membros: CoudelariaNoMapa[],
      i: number
    ): Etiqueta => {
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
         que é o que faz a cascata contar o que se vê.

         Com `i < 0` não há cascata nenhuma: é uma etiqueta que nasce a meio
         de um reagrupamento, e uma cascata de dois segundos a cada dente da
         roda seria o mapa a apagar-se e a voltar de cada vez que alguém se
         aproxima. */
      if (i < 0) {
        /* Sem animação de nascimento, e não só sem atraso.
           A `etiqueta-nascer` parte de `visibility: hidden` — tem de partir,
           senão o nome apanha o rato durante os dois segundos da entrada —, e
           **um elemento invisível não recebe foco**. Numa etiqueta que nasce
           de um reagrupamento isso custava o percurso pelas setas inteiro:
           medido, a primeira tecla depois de um grupo se abrir mandava o foco
           para o corpo da página e lá ficava. Aqui não há nascimento nenhum a
           anunciar — é o mesmo mapa com os pontos separados de outra
           maneira —, por isso a animação não corre e o nome está pronto a
           receber o foco no mesmo instante em que existe. */
        nó.style.animation = "none";
      } else {
        nó.style.setProperty(
          "--entrada",
          `${(parado ? 0 : DURACAO_ENTRADA - 700) + Math.min(i * 55, 1100)}ms`
        );
      }
      /* Nasce inerte **e oculta**, que é o estado com que o `anterior` começa.
         Sem estas duas linhas o par ficava a mentir um ao outro: a etiqueta
         que nunca chegou a ser colocada nunca passava pelo ramo que escreve
         os atributos, porque o cache já dizia que estavam escritos.

         O `inert` já cá estava. O `data-oculta` faltava, e custava caro: uma
         etiqueta que nunca foi colocada ficava sem o atributo e com o `inert`
         posto, ou seja **anunciava-se como legível e não recebia foco**.
         Medido de fora, com o globo aproximado até ao limite, onde a maioria
         não cabe: o primeiro `.globo-etiqueta:not([data-oculta])` do
         documento era uma dessas, dar-lhe o foco não fazia nada, e o percurso
         pelas setas nunca chegava a arrancar — vinte e sete passos, zero
         coudelarias. */
      nó.toggleAttribute("inert", true);
      nó.toggleAttribute("data-oculta", true);

      const fio = document.createElement("span");
      fio.className = "globo-etiqueta__linha";
      nó.appendChild(fio);

      const caixa = document.createElement("span");
      caixa.className = "globo-etiqueta__caixa";
      nó.appendChild(caixa);

      /* ── O elemento da cabeça diz o que o clique faz ────────────────────
         Um nome sozinho é uma **ligação** para a ficha da coudelaria, e não
         um botão: quem carrega num nome quer a coudelaria, e o que estava
         aqui levava-o a uma janela onde tinha de carregar outra vez em «ver
         página» — dois passos para um destino. Sendo um `<a href>` a sério,
         ganha-se de graça o que um botão nunca dá: o endereço na barra de
         estado, o botão do meio, o Ctrl+clique, o «abrir noutro separador» e
         o Enter. Quem navega dentro do site continua a ir pelo encaminhador
         do Next — o `href` é para o browser, o `push` é para a aplicação.

         Um ajuntamento é um **botão**: não há uma ficha para onde ir; o que
         o clique faz é mostrar quem ali está.

         E sem destino nem nada para abrir não é elemento accionável nenhum:
         um botão que não faz nada anuncia-se ao leitor de ecrã como
         accionável e é mais uma paragem de tabulação a não dar a lado
         nenhum. */
      const ficha = éGrupo ? null : hrefDe(principal);
      const cabeca = document.createElement(
        éGrupo || (!ficha && aoEscolherRef.current) ? "button" : ficha ? "a" : "span"
      );
      if (cabeca instanceof HTMLButtonElement) cabeca.type = "button";
      if (cabeca instanceof HTMLAnchorElement && ficha) cabeca.href = ficha;
      cabeca.className = "globo-etiqueta__cabeca";
      caixa.appendChild(cabeca);

      const titulo = document.createElement("span");
      titulo.className = "globo-etiqueta__nome";
      const subtitulo = document.createElement("span");
      subtitulo.className = "globo-etiqueta__local";
      cabeca.append(titulo, subtitulo);

      let lista: HTMLUListElement | null = null;
      const alvos = new Map<string, HTMLElement>();

      if (éGrupo) {
        /* ── Como se chama a um ponto que junta várias ───────────────────
           Quando as coudelarias do ajuntamento são todas da mesma terra, o
           título é a terra — «Vila Viçosa 2» é verdade, e é o que se lê no
           mapa. Quando não são, **não se inventa um sítio comum**: o título
           passa a ser a conta, e são os nomes, por baixo, que dizem quem
           ali está. Era esta a objecção que impedia o mapa de juntar pontos
           vizinhos, e é assim que ela deixa de se aplicar. */
        const terras = [...new Set(membros.map((m) => sitioCurto(m.localizacao)).filter(Boolean))];
        /* Uma terra só: o título é a terra e o algarismo diz quantas.
           Duas: dizem-se as duas, que continua a ser um sítio e não uma
           invenção. Três ou mais: já não há sítio comum nenhum para dizer, e
           o título passa a ser a conta — são os nomes, por baixo, que dizem
           quem ali está. Dizer «Ribatejo» a um ponto que junta cinco das doze
           do Ribatejo seria dizer uma coisa falsa em letra grande. */
        titulo.textContent =
          terras.length === 1
            ? terras[0]
            : terras.length === 2
              ? terras.join(" · ")
              : `${membros.length} coudelarias`;
        if (terras.length === 1) {
          const conta = document.createElement("span");
          conta.className = "globo-etiqueta__conta";
          conta.textContent = String(membros.length);
          titulo.appendChild(conta);
        }
        subtitulo.textContent = membros.map((m) => nomeCurto(m.nome)).join(" · ");
        cabeca.setAttribute("aria-expanded", "false");
        cabeca.setAttribute(
          "aria-label",
          terras.length
            ? `${terras.join(", ")}: ${membros.length} coudelarias`
            : `${membros.length} coudelarias aqui`
        );

        lista = document.createElement("ul");
        lista.className = "globo-etiqueta__membros";
        lista.hidden = true;
        for (const m of membros) {
          const item = document.createElement("li");
          const destino = hrefDe(m);
          const alvo = document.createElement(destino ? "a" : "button");
          if (alvo instanceof HTMLButtonElement) alvo.type = "button";
          if (alvo instanceof HTMLAnchorElement && destino) alvo.href = destino;
          alvo.className = "globo-etiqueta__membro";
          alvo.textContent = nomeCurto(m.nome);
          alvo.title = m.nome;
          alvo.setAttribute("aria-label", `${m.nome}, ${m.localizacao}`);
          alvo.addEventListener("click", (ev) => {
            ev.stopPropagation();
            if (arrastou) {
              ev.preventDefault();
              return;
            }
            escolher(m, ev as MouseEvent);
          });
          alvo.dataset.coudelaria = m.id;
          alvos.set(m.id, alvo);
          item.appendChild(alvo);
          lista.appendChild(item);
        }
        caixa.appendChild(lista);
      } else {
        titulo.textContent = nomeCurto(principal.nome);
        subtitulo.textContent = sitioCurto(principal.localizacao);
        cabeca.title = principal.nome;
        cabeca.setAttribute("aria-label", `${principal.nome}, ${principal.localizacao}`);
        cabeca.dataset.coudelaria = principal.id;
        alvos.set(principal.id, cabeca);
      }

      camadaEtiquetas.appendChild(nó);

      const et: Etiqueta = {
        nó,
        cabeca,
        alvos,
        coords,
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
        anterior: { t: "", op: "", lado: "", vert: "", curto: false, oculto: true, morto: true },
      };

      cabeca.addEventListener("click", (ev) => {
        if (arrastou) {
          /* Um arrasto que acabou em cima de um nome não é um clique nesse
             nome. Com a cabeça a ser um `<a>`, deixar passar significava
             navegar por engano no fim de cada rotação do globo. */
          ev.preventDefault();
          ev.stopPropagation();
          return;
        }
        ev.stopPropagation();
        accionar(et, ev as MouseEvent);
      });

      return et;
    };

    /* ── Os pontos juntam-se e desfazem-se com o zoom ─────────────────────
     *
     * Vinte e nove coudelarias, e metade delas no mesmo vale. No
     * enquadramento de repouso a lona vale 837 metros por pixel: há pares a
     * um pixel e meio um do outro. Desenhar dois alfinetes ali é desenhar um
     * borrão — não se vê que são dois, não se sabe quantos são, e apontar
     * acerta sempre no mesmo. Era esta a confusão.
     *
     * O que não se pode mostrar separado mostra-se junto e contado. O raio
     * do ajuntamento é **o dobro do raio de toque**, convertido de pixéis
     * para metros de chão pela altura a que a câmara está: assim dois
     * alfinetes distintos nunca partilham área de acerto, e quem aproxima vê
     * os grupos abrirem-se sozinhos. A conta está no `lib/agrupar-globo`,
     * com testes; aqui só se decide quando é que vale a pena refazê-la.
     *
     * Refaz-se por degraus de 35% — o mesmo degrau de um toque no botão de
     * aproximar — e não a cada dente da roda. Duas razões: reconstruir deita
     * fora a memória de onde cada nome estava, que é o que impede os nomes de
     * saltarem; e um grupo que se desfaz é um acontecimento, não um
     * escorregar contínuo. No curso inteiro do zoom dá meia dúzia de
     * reconstruções.
     */
    let raioAgrupamento = -1;
    let primeiraMontagem = true;

    function reagrupar(forcar = false) {
      /* Durante a entrada agrupa-se para o enquadramento onde a câmara vai
         pousar, e não para a altura do momento: a entrada é um movimento só,
         e refazer os grupos a meio dela seria vê-los mudar durante uma
         viagem que ninguém pediu. */
      const h = aEntrar ? alturaRepouso : alturaVoo;
      const km = kmPorPixel(enquadrar(h).distancia, FOV, camara.aspect, larguraCaixa);
      const raio = raioEmDegraus(km * SEPARACAO_MINIMA);
      if (!forcar && raio === raioAgrupamento) return;
      raioAgrupamento = raio;

      /* Sai tudo o que estava: os nós saem do DOM com os ouvintes dentro, e
         os halos saem da cena. A geometria e os materiais são partilhados —
         não há nada para descartar aqui. */
      for (const e of etiquetas) e.nó.remove();
      alfinetesFeitos.length = 0;
      sobAlfinete = null;
      sobEtiqueta = null;
      focada = null;
      fixa = null;
      activa = null;
      aberta = null;
      for (const m of manchas) esconderMancha(m);

      const ajuntamentos = agrupar(pontos, raio);
      etiquetas = ajuntamentos.map((g, i) =>
        criarEtiqueta(
          g.coords,
          g.membros.map((p) => p.c),
          /* A cascata de entrada só faz sentido quando há entrada: sem ela os
             nomes nasceriam com dois segundos de atraso escritos à mão e o
             mapa aparecia vazio — foi o que aconteceu ao voltar da lista para
             o globo, medido de fora: dezanove pontos e zero nomes. */
          primeiraMontagem && aEntrar ? i : -1
        )
      );
      primeiraMontagem = false;
      geoPontos.setDrawRange(0, etiquetas.length);
      pontosMudaram();

      precisaMedir = true;
    }

    const projeccao = new THREE.Vector3();
    const normalMundo = new THREE.Vector3();
    const paraCamara = new THREE.Vector3();
    const ecra = new THREE.Vector3();
    const colocadas: Caixa[] = [];
    const alfinetesEcra: Caixa[] = [];
    const ordem: Etiqueta[] = [];
    const sitios: number[] = [];
    /** As etiquetas que, neste quadro, não arranjaram lugar. */
    const sobras: Etiqueta[] = [];

    /** Afastamento entre o alfinete e a etiqueta, e folga entre etiquetas. */
    const AFAST = 10;
    const FOLGA_X = 12;
    const FOLGA_Y = 6;
    /** Meio lado da caixa de um alfinete, para nenhum nome pousar sobre outro
        ponto — quem lê atribui o nome ao ponto que estiver por baixo dele. */
    const MEIO_ALFINETE = 6;

    /* ── As manchas ───────────────────────────────────────────────────────
     *
     * Um nome que não cabe deixava um ponto anónimo. Em telemóvel eram
     * catorze dos dezanove pontos do quadro: uma nuvem de pintas sem uma
     * palavra, sem sinal de que ali havia coisa para ver e sem forma de
     * saber quantas. É o defeito que se corrige aqui.
     *
     * O que se faz: as sobras de cada quadro juntam-se por proximidade no
     * ECRÃ — não no terreno —, e cada ajuntamento ganha um algarismo por
     * cima. Diz quantas coudelarias ali estão. Apontá-lo abre a lista dos
     * nomes, e cada nome é um botão que leva à coudelaria, como qualquer
     * etiqueta.
     *
     * Três razões para ser assim e não de outra maneira:
     *
     * 1. **Só apanha sobras.** Corre depois da colocação e nunca lhe toca,
     *    por isso nenhum nome que já se lia deixa de se ler — os quinze do
     *    computador e os cinco do telemóvel ficam onde estavam. Um
     *    agrupamento feito ANTES da colocação seria mais arrumado e teria
     *    custado nomes; este só pode acrescentar.
     * 2. **Agrupa no ecrã, e por isso desfaz-se ao aproximar.** Aproximar
     *    afasta os pontos, mais nomes cabem, e o algarismo desce sozinho
     *    até desaparecer. Passa a haver uma recompensa visível para quem
     *    mexe na roda — que é o que faltava para o zoom se descobrir.
     * 3. **Não entra na tabulação** (`aria-hidden`, botões a `tabindex=-1`).
     *    Não é para poupar trabalho a ninguém: as mesmas coudelarias são
     *    todas alcançáveis pelas setas, numa ordem estável de norte para
     *    sul, e a lista completa está na vista de lista. Uma segunda rota,
     *    por bolhas que mudam de sítio e de conteúdo a cada arrasto, seria
     *    uma rota pior — não uma rota a mais.
     */
    type Mancha = {
      nó: HTMLElement;
      chip: HTMLButtonElement;
      painel: HTMLElement;
      titulo: HTMLElement;
      lista: HTMLUListElement;
      assinatura: string;
      quantos: number;
      usada: boolean;
      ecraX: number;
      ecraY: number;
      anterior: { t: string; op: string; aberta: boolean };
    };

    /** Raio de ajuntamento, em pixéis de ecrã. Constante e não uma fracção da
        lona: o que decide se dois nomes se estorvam é a distância em pixéis
        entre eles, e essa não muda por a janela ser maior. */
    const RAIO_MANCHA = 40;
    /** Uma sobra solitária ainda se cola à mancha mais próxima até aqui —
        melhor um algarismo que a inclui do que uma pinta anónima. */
    const RAIO_ADOPCAO = 104;
    let manchaAberta: Mancha | null = null;
    let manchaFixa: Mancha | null = null;
    let manchaSob: Mancha | null = null;
    /** Medida do algarismo fechado. É sempre a mesma; mede-se com as outras. */
    const chipMedida: Medida = { l: 22, a: 22 };

    const criarMancha = (): Mancha => {
      const nó = document.createElement("div");
      nó.className = "globo-mancha";
      /* Nasce oculta, como nasce a etiqueta e pela mesma razão: sem o
         atributo, uma mancha ainda por usar apresenta-se ao mundo como
         legível — está a zero de opacidade e sem conta nenhuma escrita — e
         quem for buscar a primeira `.globo-mancha:not([data-oculta])` do
         documento apanha essa. */
      nó.toggleAttribute("data-oculta", true);
      /* Escondida dos leitores de ecrã de propósito — ver a razão 3 acima.
         Os botões lá dentro levam `tabindex="-1"`, sem o que um
         `aria-hidden` com coisas focáveis lá dentro seria um erro a sério. */
      nó.setAttribute("aria-hidden", "true");

      const chip = document.createElement("button");
      chip.type = "button";
      chip.tabIndex = -1;
      chip.className = "globo-mancha__chip";
      nó.appendChild(chip);

      const painel = document.createElement("div");
      painel.className = "globo-mancha__painel";
      const titulo = document.createElement("p");
      titulo.className = "globo-mancha__titulo";
      const lista = document.createElement("ul");
      lista.className = "globo-mancha__membros";
      painel.append(titulo, lista);
      nó.appendChild(painel);

      camadaEtiquetas.appendChild(nó);

      const m: Mancha = {
        nó,
        chip,
        painel,
        titulo,
        lista,
        assinatura: "",
        quantos: 0,
        usada: false,
        ecraX: 0,
        ecraY: 0,
        anterior: { t: "", op: "0", aberta: false },
      };

      chip.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (arrastou) return;
        manchaFixa = manchaFixa === m ? null : m;
        actualizarMancha();
      });
      return m;
    };

    /* No pior caso cada ponto do quadro é uma mancha por si — ver a nota
       sobre as sobras solitárias mais abaixo. */
    const manchas: Mancha[] = Array.from({ length: TECTO }, criarMancha);

    const escreverMancha = (m: Mancha, membros: CoudelariaNoMapa[]) => {
      const assinatura = membros.map((c) => c.id).join(",");
      if (assinatura === m.assinatura) return;
      m.assinatura = assinatura;
      m.quantos = membros.length;
      if (manchaFixa === m) manchaFixa = null;

      m.chip.textContent = String(membros.length);
      m.nó.dataset.conta = String(membros.length);

      /* O cabeçalho diz a região quando as coudelarias todas da mancha são
         da mesma — que é o caso quase sempre, porque estão a poucos pixéis
         umas das outras. Quando não são, não se inventa um nome comum: diz
         só quantas são.

         Sem `title` no algarismo: apontá-lo já abre a lista, e uma dica do
         sistema por cima da lista que ela anuncia é a mesma coisa dita duas
         vezes, a segunda a tapar a primeira. */
      const regioes = new Set(membros.map((c) => c.regiao).filter(Boolean));
      const uma = regioes.size === 1 ? [...regioes][0] : "";
      const quantas = membros.length === 1 ? "1 coudelaria" : `${membros.length} coudelarias`;
      m.titulo.textContent = uma ? `${quantas} · ${uma}` : quantas;

      m.lista.replaceChildren();
      for (const c of membros) {
        const item = document.createElement("li");
        const destino = hrefDe(c);
        /* Ligação e não botão, pela mesma razão dos nomes: aqui carrega-se
           para ir à coudelaria, e um endereço a sério dá o botão do meio, o
           Ctrl+clique e a barra de estado sem uma linha de JavaScript. */
        const alvo = document.createElement(destino ? "a" : "button");
        if (alvo instanceof HTMLButtonElement) alvo.type = "button";
        if (alvo instanceof HTMLAnchorElement && destino) alvo.href = destino;
        alvo.tabIndex = -1;
        alvo.className = "globo-mancha__membro";
        alvo.title = c.nome;
        const nome = document.createElement("span");
        nome.className = "globo-mancha__nome";
        nome.textContent = nomeCurto(c.nome);
        const sitio = document.createElement("span");
        sitio.className = "globo-mancha__sitio";
        sitio.textContent = sitioCurto(c.localizacao);
        alvo.append(nome, sitio);
        alvo.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (arrastou) {
            ev.preventDefault();
            return;
          }
          escolher(c, ev as MouseEvent);
        });
        item.appendChild(alvo);
        m.lista.appendChild(item);
      }
    };

    /* O painel abre para o lado que tem sítio.
       A camada dos nomes é `overflow: hidden` — tem de ser, senão um nome
       junto à borda escorregava para fora da lona —, e por isso um painel que
       não caiba não fica pendurado por fora: fica cortado a meio de uma
       lista. Medido em telemóvel: aberto sobre o Ribatejo, viam-se cinco dos
       onze nomes e o resto estava do lado de fora da caixa.

       Duas correcções, ambas medidas no momento em que abre e não a cada
       quadro: para cima quando o algarismo está na metade de baixo, e um
       desvio horizontal que o encosta à borda em vez de o deixar sair. */
    /** Folga entre o painel e a borda da janela útil. */
    const MARGEM_PAINEL = 6;

    const ajustarPainel = (m: Mancha) => {
      m.painel.style.setProperty("--desvio", "0px");
      m.lista.style.maxHeight = "";
      const caixa = el.getBoundingClientRect();
      const chipR = m.chip.getBoundingClientRect();

      /* Para cima ou para baixo: quem decide é o lado que tem mais espaço, e
         não a metade da lona em que o algarismo caiu. Com onze nomes na
         lista, «está em baixo, logo abre para cima» ainda deixava o cabeçalho
         da lista fora da lona. */
      const acima = chipR.top - (caixa.top + topoUtil) - MARGEM_PAINEL;
      const abaixo = caixa.top + baseUtil - chipR.bottom - MARGEM_PAINEL;
      const paraCima = abaixo < acima;
      m.nó.toggleAttribute("data-cima", paraCima);

      /* A lista rola dentro do que sobrar. O resto do painel — cabeçalho,
         bordas, respiro — mede-se, não se adivinha. */
      const resto = m.painel.offsetHeight - m.lista.offsetHeight;
      const espaco = Math.max(acima, abaixo) - 26 - resto;
      m.lista.style.maxHeight = `${Math.round(Math.max(44, Math.min(232, espaco)))}px`;

      const r = m.painel.getBoundingClientRect();
      let dx = 0;
      if (r.left < caixa.left + MARGEM_PAINEL) dx = caixa.left + MARGEM_PAINEL - r.left;
      else if (r.right > caixa.right - MARGEM_PAINEL) dx = caixa.right - MARGEM_PAINEL - r.right;
      if (dx) m.painel.style.setProperty("--desvio", `${Math.round(dx)}px`);
    };

    const actualizarMancha = () => {
      const alvo = manchaFixa ?? manchaSob;
      if (alvo === manchaAberta) return;
      manchaAberta = alvo;
      for (const m of manchas) {
        const aberta = m === alvo;
        if (aberta === m.anterior.aberta) continue;
        m.anterior.aberta = aberta;
        m.nó.toggleAttribute("data-aberta", aberta);
        if (aberta) ajustarPainel(m);
      }
      pedirQuadro();
    };

    const esconderMancha = (m: Mancha) => {
      m.usada = false;
      if (m.anterior.op !== "0") {
        m.nó.style.opacity = "0";
        m.anterior.op = "0";
      }
      if (!m.nó.hasAttribute("data-oculta")) m.nó.toggleAttribute("data-oculta", true);
      if (manchaFixa === m) manchaFixa = null;
      if (manchaSob === m) manchaSob = null;
    };

    /** Onde a mancha tenta pousar, por ordem: em cima do ajuntamento e depois
        em anéis cada vez mais largos à volta. Só precisa de fugir às caixas de
        nome já colocadas — das pintas que ela própria representa não foge, que
        é o ponto.

        Três anéis e não um: com um só, treze das vinte e nove ficavam sem
        lugar num quadro cheio de nomes e voltavam a ser pontos calados —
        medido. Um algarismo a trinta pixéis do sítio ainda se lê como sendo
        daquele ajuntamento; não se ler de todo é que não. */
    const ANEL_MANCHA: readonly (readonly [number, number])[] = [
      [0, 0],
      ...[26, 46, 68].flatMap((r) =>
        [0, 45, 90, 135, 180, 225, 270, 315].map(
          (g) =>
            [
              Math.round(r * Math.cos((g * Math.PI) / 180)),
              Math.round(r * Math.sin((g * Math.PI) / 180)),
            ] as const
        )
      ),
    ];

    /* O algarismo é pequeno e não é texto: a folga com que se afasta de um
       nome não tem de ser a folga entre dois nomes. Com os doze pixéis do
       `FOLGA_X` não sobrava lugar nenhum num quadro cheio. */
    const FOLGA_MANCHA = 5;
    const bateMancha = (c: Caixa) =>
      colocadas.some(
        (o) =>
          c.x < o.x + o.l + FOLGA_MANCHA &&
          c.x + c.l + FOLGA_MANCHA > o.x &&
          c.y < o.y + o.a + FOLGA_MANCHA &&
          c.y + c.a + FOLGA_MANCHA > o.y
      );

    const agruparSobras = (l: number) => {
      for (const m of manchas) m.usada = false;
      const livres = sobras.filter((e) => e.noEcra);
      if (!livres.length) {
        for (const m of manchas) esconderMancha(m);
        return;
      }

      const r2 = RAIO_MANCHA * RAIO_MANCHA;
      const dist2 = (a: Etiqueta, b: Etiqueta) =>
        (a.ecraX - b.ecraX) ** 2 + (a.ecraY - b.ecraY) ** 2;
      const usados = new Set<Etiqueta>();
      const ajuntamentos: Etiqueta[][] = [];

      /* Guloso pelo mais povoado: em cada volta lidera quem tiver mais
         vizinhos ainda livres. Sai mais estável do que ir por ordem de
         índice — a mesma nuvem de pontos dá sempre o mesmo desenho, e é a
         estabilidade que impede o algarismo de saltitar ao arrastar. */
      for (;;) {
        let lider: Etiqueta | null = null;
        let melhor = 0;
        for (const e of livres) {
          if (usados.has(e)) continue;
          let n = 0;
          for (const o of livres) if (!usados.has(o) && dist2(e, o) <= r2) n++;
          if (n > melhor) {
            melhor = n;
            lider = e;
          }
        }
        if (!lider) break;
        const g = livres.filter((o) => !usados.has(o) && dist2(lider!, o) <= r2);
        for (const o of g) usados.add(o);
        ajuntamentos.push(g);
      }

      const cheios = ajuntamentos.filter((g) => g.length > 1);
      /* Solitárias: primeiro tentam colar-se à mancha mais próxima — a conta
         de uma zona vale mais do que duas contas ao lado uma da outra. Quem
         não tiver nenhuma por perto fica com mancha própria, de uma só.

         Um algarismo «1» parece pouco, e é de propósito que fica: continua a
         dizer «aqui está uma coudelaria» e continua a abrir-se no nome dela,
         que é tudo o que faltava ao ponto anónimo. Sem isto ficavam três
         pontos calados no computador e três no telemóvel — medido —, e a
         promessa de que nenhum ponto fica sem conta deixava de ser verdade. */
      const adopcao2 = RAIO_ADOPCAO * RAIO_ADOPCAO;
      for (const g of ajuntamentos) {
        if (g.length !== 1) continue;
        const [so] = g;
        let alvo: Etiqueta[] | null = null;
        let menor = adopcao2;
        for (const c of cheios) {
          const d = dist2(so, c[0]);
          if (d < menor) {
            menor = d;
            alvo = c;
          }
        }
        if (alvo) alvo.push(so);
        else cheios.push(g);
      }

      // A mais povoada escolhe lugar primeiro.
      cheios.sort((x, y) => y.length - x.length);

      let i = 0;
      for (const g of cheios) {
        if (i >= manchas.length) break;
        const m = manchas[i];
        let cx = 0;
        let cy = 0;
        for (const e of g) {
          cx += e.ecraX;
          cy += e.ecraY;
        }
        cx /= g.length;
        cy /= g.length;

        let posta: Caixa | null = null;
        for (const [dx, dy] of ANEL_MANCHA) {
          const c: Caixa = {
            x: cx + dx - chipMedida.l / 2,
            y: cy + dy - chipMedida.a / 2,
            l: chipMedida.l,
            a: chipMedida.a,
          };
          if (c.x < 2 || c.y < topoUtil + 2 || c.x + c.l > l - 2 || c.y + c.a > baseUtil - 2)
            continue;
          if (bateMancha(c)) continue;
          posta = c;
          break;
        }
        if (!posta) continue;

        escreverMancha(
          m,
          g.flatMap((e) => e.membros)
        );
        m.usada = true;
        m.ecraX = posta.x + posta.l / 2;
        m.ecraY = posta.y + posta.a / 2;
        /* Entra na lista das caixas ocupadas para que a mancha seguinte não
           lhe caia em cima — e para que, no quadro a seguir, nenhum nome
           pouse por cima dela. */
        colocadas.push(posta);

        const t = `translate3d(${Math.round(posta.x)}px, ${Math.round(posta.y)}px, 0)`;
        if (t !== m.anterior.t) {
          m.nó.style.transform = t;
          m.anterior.t = t;
        }
        if (m.anterior.op !== "1") {
          m.nó.style.opacity = "1";
          m.anterior.op = "1";
        }
        if (m.nó.hasAttribute("data-oculta")) m.nó.toggleAttribute("data-oculta", false);
        i++;
      }

      for (const m of manchas) if (!m.usada) esconderMancha(m);
    };

    const medirTodas = () => {
      if (manchas[0]) {
        chipMedida.l = manchas[0].chip.offsetWidth || chipMedida.l;
        chipMedida.a = manchas[0].chip.offsetHeight || chipMedida.a;
      }
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

    /* Oito sítios por etiqueta, por ordem de preferência: acima à direita —
       que é onde o olho a procura —, acima à esquerda, abaixo dos dois lados,
       e por fim ao lado à altura do ponto. Havia dois, e com dois perdiam-se
       dois terços dos nomes num país onde metade das coudelarias está no
       mesmo vale.

       As duas últimas — a caixa centrada por cima e por baixo do ponto — são
       as que faltavam para o telemóvel. As outras seis empurram a caixa toda
       para um lado do ponto, e por isso cada nome come a sua largura inteira
       de um dos lados; numa lona de 356px, com nomes de 150, dois pontos a
       trinta pixéis um do outro nunca cabiam ambos. Centrada, a caixa gasta
       metade para cada lado e usa a altura, que numa lona mais alta do que
       larga é o que sobra. Ficam no fim da lista de propósito: só se
       experimentam depois de as seis falharem, por isso nenhuma colocação
       que já existia muda de sítio — a contagem só pode subir. */
    const hipoteses = [
      { lado: "direita", vert: "cima" },
      { lado: "esquerda", vert: "cima" },
      { lado: "direita", vert: "baixo" },
      { lado: "esquerda", vert: "baixo" },
      { lado: "direita", vert: "meio" },
      { lado: "esquerda", vert: "meio" },
      { lado: "centro", vert: "cima" },
      { lado: "centro", vert: "baixo" },
    ] as const;

    const caixaDe = (x: number, y: number, m: Medida, h: (typeof hipoteses)[number]): Caixa => ({
      x: h.lado === "direita" ? x + AFAST : h.lado === "esquerda" ? x - AFAST - m.l : x - m.l / 2,
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
      const oculto = perto <= 0.55;
      if (oculto !== ant.oculto) {
        e.nó.toggleAttribute("data-oculta", oculto);
        ant.oculto = oculto;
      }
      /* `inert` em vez de `pointer-events`: tira a etiqueta do rato **e** da
         ordem de tabulação de uma vez. Sem isto, tabular pelo globo passava
         pelas vinte e nove — dezoito delas invisíveis, do outro lado do
         planeta ou vencidas na colisão, com o foco a parar em cima de nada.

         Excepção: a que tem o foco nunca fica inerte. Quem percorre o globo
         pelas setas larga uma etiqueta invisível durante o quadro em que a
         câmara ainda não a trouxe à vista, e torná-la inerte nesse quadro
         devolvia o foco ao corpo da página — o percurso acabava sozinho ao
         segundo passo. O rato não entra por aqui: quem lhe fecha a porta é o
         `data-oculta`, que é sobre estar invisível e não sobre ter o foco. */
      const morto = oculto && e !== focada;
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
      if (!ant.oculto) {
        e.nó.toggleAttribute("data-oculta", true);
        ant.oculto = true;
      }
      const morto = e !== focada;
      if (morto !== ant.morto) {
        e.nó.toggleAttribute("inert", morto);
        ant.morto = morto;
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
      sobras.length = 0;

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
        /* Duas voltas, e a segunda só para a etiqueta activa.
           Nenhum nome pousa em cima de outro ponto — quem lê atribui o nome
           ao ponto que estiver por baixo dele —, e essa regra fica de pé para
           as vinte e nove. Mas num vale com doze pontos a trinta pixéis uns
           dos outros ela deixa de haver sítio nenhum: no percurso pelas
           setas, catorze dos vinte e nove passos davam foco a um nome que
           continuava invisível — medido, passo a passo.
           Para a etiqueta que está debaixo do rato ou com o foco a regra
           cede, porque o que ela previne já não se aplica: essa etiqueta está
           acesa, tem o fio a apontar-lhe o ponto, e é a única no quadro nessa
           condição. Cede só à segunda volta, para continuar a preferir o
           lugar limpo sempre que exista um. */
        /* ── O alvo não foge ao ponteiro ──────────────────────────────────
           Uma etiqueta acesa muda de forma: o nome deixa de estar truncado e,
           num ajuntamento, abre-se a lista. Se a colocação a puder mandar
           para outro sítio por causa disso, o que se aponta sai de debaixo do
           dedo antes de se chegar a carregar. Medido de fora: dois de dez
           alvos escapavam-se, um deles 66 pixéis.

           A cura é ficar onde estava. Como cada hipótese ancora a caixa no
           alfinete pelo canto que lhe fica virado, crescer só a afasta do
           ponto — a caixa nova contém sempre a antiga, e o ponteiro continua
           lá dentro. Por isso basta manter a hipótese do quadro anterior e
           não voltar a perguntar se ela colide: a etiqueta acesa já é a
           primeira a escolher e já tinha licença para pousar sobre um
           alfinete. Só a borda da lona continua a mandar. */
        if (e.activo && e.colocada && e.ultimo >= 0) {
          const h = hipoteses[e.ultimo];
          /* Inteira se couber, de uma linha se não couber: o que não se faz é
             mudar de sítio. Junto à borda da lona a caixa maior pode não
             caber, e sem esta segunda tentativa a etiqueta ia à procura de
             outro lugar — que é exactamente o que se quer evitar. */
          for (const medida of [e.cheia, e.curta]) {
            if (!medida.l) continue;
            const c = caixaDe(e.ecraX, e.ecraY, medida, h);
            if (
              c.x >= 2 &&
              c.y >= topoUtil + 2 &&
              c.x + c.l <= l - 2 &&
              c.y + c.a <= baseUtil - 2
            ) {
              posta = c;
              lado = h.lado;
              vert = h.vert;
              curto = medida === e.curta;
              break;
            }
          }
        }

        for (const semAlfinetes of posta ? [] : e.activo ? [false, true] : [false]) {
          for (const medida of [e.cheia, e.curta]) {
            if (!medida.l) continue;
            for (const k of sitios) {
              const h = hipoteses[k];
              const c = caixaDe(e.ecraX, e.ecraY, medida, h);
              const cabe =
                c.x >= 2 && c.y >= topoUtil + 2 && c.x + c.l <= l - 2 && c.y + c.a <= baseUtil - 2;
              if (!cabe || bate(c) || (!semAlfinetes && bateAlfinete(c))) continue;
              posta = c;
              lado = h.lado;
              vert = h.vert;
              curto = medida === e.curta;
              e.ultimo = k;
              break;
            }
            if (posta) break;
          }
          if (posta) break;
        }

        if (!posta) {
          esconder(e);
          /* Não coube: passa às manchas, que a contam ainda que não a
             escrevam. Um ponto anónimo deixa de ser um ponto calado. */
          sobras.push(e);
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

      /* Por fim, o que ficou sem nome. Corre depois de tudo colocado, e é
         por isso que não pode tirar um nome a ninguém. */
      agruparSobras(l);
    };

    /* ── O alfinete e a etiqueta são a mesma coisa vista de dois sítios ────
       Apontar o ponto acende o nome, e apontar o nome acende o ponto. O teste
       faz-se em coordenadas de écran, com os números que a colocação já
       calculou; um raycaster contra esferas de 0,0004 de raio nunca acertava,
       porque geometricamente o alfinete é sub-pixel — o que se vê e o que se
       aponta é o halo, não a esfera.

       ── Quanto mede o alvo ──────────────────────────────────────────────
       Quinze pixéis de raio davam um alvo de trinta de lado, igual para o
       rato e para o dedo. Um dedo não acerta em trinta: a medida que as
       normas de acessibilidade pedem é 44, e é a mesma que este projecto já
       impõe a qualquer botão em telemóvel. Por isso o raio segue o ponteiro
       — 22 num ecrã de toque, 14 com rato, que é mais do que os 24px de lado
       que um alvo de rato precisa.

       Alargar o alvo só é seguro porque **nenhum outro alfinete lhe pode
       cair dentro**: o raio de agrupamento é o dobro deste, e portanto dois
       pontos que estivessem mais perto do que um alvo já são um ponto só. As
       duas medidas são a mesma decisão vista de dois lados. */
    const RAIO_TOQUE = grosso ? 22 : 14;

    /** Dois alvos nunca se sobrepõem, e é isso que fixa o raio dos grupos. */
    const SEPARACAO_MINIMA = 2 * RAIO_TOQUE;

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

    /* ── Acender é uma coisa; abrir é outra ───────────────────────────────
     *
     * Apontar acende: o alfinete engorda, o nome deixa de estar truncado, o
     * fio acende. Isso não desloca nada — a caixa cresce a partir do canto
     * que está virado para o alfinete, e portanto cresce **para longe** do
     * ponteiro.
     *
     * Abrir a lista de um ajuntamento é outra coisa, e essa **desloca**: são
     * mais cinco linhas de texto, e elas aparecem exactamente onde o dedo já
     * está. Medido de fora: quatro dos seis nomes de grupo punham uma
     * ligação por baixo do ponteiro só por serem apontados — um deles a 286
     * pixéis do sítio onde estava. Quem carregasse a seguir abria uma
     * coudelaria que não escolheu.
     *
     * Por isso a lista deixa de abrir ao passar por cima: abre ao carregar e
     * ao receber o foco, que são os dois gestos em que a pessoa já disse que
     * queria aquele ponto. O que se perde é uma pré-visualização; o que se
     * ganha é que carregar num sítio abre o que lá estava.
     */
    let aberta: Etiqueta | null = null;

    const actualizarActivo = () => {
      const alvo = fixa ?? focada ?? sobEtiqueta ?? sobAlfinete;
      el.style.cursor = sobAlfinete ? "pointer" : "";
      // Só um gesto deliberado abre a lista; passar por cima não é um.
      const paraAbrir = fixa ?? focada;
      let mudou = false;

      if (alvo !== activa) {
        const antes = activa;
        activa = alvo;
        for (const e of [antes, alvo]) {
          if (!e) continue;
          const ligado = e === alvo;
          e.activo = ligado;
          e.nó.toggleAttribute("data-activo", ligado);
          realcar(e.alfinete, ligado);
          // O nome deixa de estar truncado e a caixa muda: remede-se.
          precisaMedir = true;
        }
        mudou = true;
      }

      if (paraAbrir !== aberta) {
        const antes = aberta;
        aberta = paraAbrir;
        if (antes && antes.membros.length > 1) antes.abrir(false);
        if (paraAbrir && paraAbrir.membros.length > 1) paraAbrir.abrir(true);
        precisaMedir = true;
        mudou = true;
      }

      // O alfinete mudou de tamanho e a etiqueta de forma: é preciso um quadro.
      if (mudou) pedirQuadro();
    };

    /* ── Carregar num ponto ───────────────────────────────────────────────
       Um ponto com uma coudelaria só leva à ficha dela — um passo, não dois.
       Um ponto que junta várias abre-se e mostra quem lá está: nenhum zoom
       as separa a esta altura, e por isso a escolha tem de ser dita por
       palavras. Carregar fora fecha-a. */
    function accionar(e: Etiqueta, ev?: MouseEvent) {
      if (e.membros.length > 1) {
        fixa = fixa === e ? null : e;
        actualizarActivo();
      } else {
        escolher(e.membros[0], ev);
      }
    }

    camadaEtiquetas.addEventListener("pointerover", (ev) => {
      const alvo = (ev.target as HTMLElement).closest(".globo-etiqueta");
      sobEtiqueta = etiquetas.find((e) => e.nó === alvo) ?? null;
      actualizarActivo();
      const mancha = (ev.target as HTMLElement).closest(".globo-mancha");
      manchaSob = manchas.find((m) => m.nó === mancha) ?? null;
      actualizarMancha();
    });
    camadaEtiquetas.addEventListener("pointerout", (ev) => {
      const para = ev.relatedTarget as Node | null;
      if (para && camadaEtiquetas.contains(para)) return;
      sobEtiqueta = null;
      actualizarActivo();
      manchaSob = null;
      actualizarMancha();
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
    /* Quem volta ao mapa não faz a viagem outra vez: entra onde estava. */
    let aEntrar = !parado && !vistaGuardada;
    if (vistaGuardada) {
      alturaVoo = Math.min(ALTURA_MAXIMA, Math.max(ALTURA_MINIMA, vistaGuardada.h));
      orbita.theta = vistaGuardada.t;
      orbita.phi = vistaGuardada.p;
      zoomDoUtilizador = true;
    }

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
        if (t >= 1) {
          aEntrar = false;
          // Pousou: daqui para a frente é a altura verdadeira que manda.
          reagrupar();
        }
      }
      /* Guinada primeiro, no eixo do mundo; inclinação depois, no eixo leste
         da câmara. Assim o arrasto vertical move o chão a direito no ecrã —
         com `rotation.x`, que é o eixo X do mundo e aqui aponta para o lado,
         o arrasto vertical movia o chão na diagonal. */
      aplicarOrbita();
      colocarCamara();
      renderizador.render(cena, camara);
      etiquetar();
      actualizarComandos();
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

    /* ── Até onde se pode passear ─────────────────────────────────────────
     *
     * O limite que aqui estava era uma fracção do quadro: o centro andava até
     * 20% da largura e 12% da altura, o que numa vista de repouso chega para
     * espreitar Espanha e não chega para perder o país. Só que essa fracção
     * encolhe com o zoom — e com um curso de 3,5× isso queria dizer que, bem
     * aproximado, a vista ficava presa a trinta quilómetros da mira. Ir de
     * Sintra a Vila Viçosa sem afastar era impossível, e o zoom sobre o
     * cursor não teria para onde levar ninguém.
     *
     * O limite passa a sair **dos dados**: o ponto para onde se olha tem de
     * ficar dentro da caixa que contém as coudelarias, com uma folga. Não é
     * um número inventado — é a promessa de que não se sai de onde há coisas
     * para ver, e de que qualquer coudelaria se pode pôr ao centro. Fica a
     * união com o limite antigo, para que em repouso nunca se ande menos do
     * que se andava.
     *
     * As contas são directas porque a órbita é o que é: pôr a longitude L ao
     * centro é `theta = (MIRA.lon − L)·grau`, e a latitude o mesmo com o phi.
     */
    const FOLGA_CAIXA = 0.35;
    const caixaDados = pontos.length
      ? pontos.reduce(
          (c, p) => ({
            latMin: Math.min(c.latMin, p.coords[0]),
            latMax: Math.max(c.latMax, p.coords[0]),
            lonMin: Math.min(c.lonMin, p.coords[1]),
            lonMax: Math.max(c.lonMax, p.coords[1]),
          }),
          { latMin: 90, latMax: -90, lonMin: 180, lonMax: -180 }
        )
      : { latMin: MIRA.lat, latMax: MIRA.lat, lonMin: MIRA.lon, lonMax: MIRA.lon };

    const limites = () => {
      const s = escala();
      const lt = 0.2 * s.l * s.theta;
      const lp = 0.12 * s.a * s.phi;
      return {
        thetaMin: Math.min(-lt, (MIRA.lon - caixaDados.lonMax - FOLGA_CAIXA) * grau),
        thetaMax: Math.max(lt, (MIRA.lon - caixaDados.lonMin + FOLGA_CAIXA) * grau),
        phiMin: Math.min(-lp, (MIRA.lat - caixaDados.latMax - FOLGA_CAIXA) * grau),
        phiMax: Math.max(lp, (MIRA.lat - caixaDados.latMin + FOLGA_CAIXA) * grau),
      };
    };

    const prender = () => {
      const lim = limites();
      orbita.theta = Math.max(lim.thetaMin, Math.min(lim.thetaMax, orbita.theta));
      orbita.phi = Math.max(lim.phiMin, Math.min(lim.phiMax, orbita.phi));
    };

    /* Aplica a órbita ao mundo. Sai do `desenhar` para uma função sua porque
       o zoom sobre o cursor precisa de saber onde é que um ponto do chão vai
       parar no ecrã **antes** de haver um quadro. */
    const aplicarOrbita = () => {
      qGuinada.setFromAxisAngle(EIXO_POLAR, orbita.theta);
      qInclinacao.setFromAxisAngle(LESTE, orbita.phi);
      mundo.quaternion.copy(qInclinacao).multiply(qGuinada);
      mundo.updateMatrixWorld(true);
    };

    const vAux = new THREE.Vector3();
    const ndc = new THREE.Vector2();
    const raio = new THREE.Raycaster();
    /* A esfera do chão é a do alfinete e não a do planeta: assim o ponto que
       o cursor agarra é o mesmo plano em que os alfinetes vivem. */
    const esferaChao = new THREE.Sphere(new THREE.Vector3(0, 0, 0), RAIO * 1.004);

    /** O ponto do globo — em coordenadas do mundo que roda — debaixo deste
        pixel, ou `null` se ali só houver céu. */
    const chaoEm = (px: number, py: number) => {
      ndc.set((px / larguraCaixa) * 2 - 1, -(py / alturaCaixa) * 2 + 1);
      raio.setFromCamera(ndc, camara);
      if (!raio.ray.intersectSphere(esferaChao, vAux)) return null;
      return mundo.worldToLocal(vAux.clone());
    };

    const ecraDe = (local: THREE.Vector3) => {
      vAux.copy(local).applyMatrix4(mundo.matrixWorld).project(camara);
      return {
        x: (vAux.x * 0.5 + 0.5) * larguraCaixa,
        y: (-vAux.y * 0.5 + 0.5) * alturaCaixa,
      };
    };

    /** Um toque no botão vale cerca de dois dentes de roda. */
    const PASSO_ZOOM = 1.6;

    /**
     * Muda a altura, e — se lhe derem um pixel — deixa o chão desse pixel
     * onde estava.
     *
     * É o que qualquer mapa faz e o que este não fazia: a roda aproximava
     * sempre o centro do quadro, de modo que aproximar-se de um ajuntamento
     * do Ribatejo obrigava a aproximar e arrastar, aproximar e arrastar. Com
     * a âncora, aponta-se e roda-se.
     *
     * A correcção é iterativa e não fechada de propósito: a projecção de uma
     * esfera vista de perto e de esguelha não se inverte em duas linhas, mas
     * a `escala()` já dá a derivada — quantos radianos vale um pixel aqui —,
     * e com ela três passos de Newton chegam a menos de um pixel. Cada passo
     * custa duas matrizes e uma projecção; não corre por quadro, corre por
     * dente de roda.
     */
    const mudarAltura = (factor: number, px?: number, py?: number) => {
      aEntrar = false;
      zoomDoUtilizador = true;
      const antes = alturaVoo;
      const nova = Math.min(ALTURA_MAXIMA, Math.max(ALTURA_MINIMA, alturaVoo * factor));
      if (nova === antes) return;

      const ancora = px === undefined || py === undefined ? null : chaoEm(px, py);
      alturaVoo = nova;
      if (ancora) {
        for (let i = 0; i < 3; i++) {
          colocarCamara();
          aplicarOrbita();
          const onde = ecraDe(ancora);
          const s = escala();
          orbita.theta += (px! - onde.x) * s.theta;
          orbita.phi -= (py! - onde.y) * s.phi;
          prender();
        }
        aplicarOrbita();
      }
      colocarCamara();
      reagrupar();
      pedirQuadro();
    };

    const entreDedos = () => {
      const [a, b] = [...ponteiros.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) || 1 : 0;
    };

    /** O ponto entre os dois dedos, em coordenadas da caixa. */
    const centroDosDedos = () => {
      const [a, b] = [...ponteiros.values()];
      if (!a || !b) return null;
      const r = el.getBoundingClientRect();
      return { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top };
    };

    /* ── O que está por cima da lona não é a lona ─────────────────────────
     *
     * Um nome e um algarismo de mancha vivem numa camada HTML por cima da
     * cena, e os eventos deles borbulham até à caixa. Enquanto a caixa
     * tratasse qualquer `pointermove` como «passeio sobre o globo», apontar
     * um algarismo acendia o alfinete que estava por baixo dele — e uma
     * etiqueta acesa é a primeira a escolher lugar na recolocação, o que
     * empurrava o próprio algarismo para longe do dedo. Medido por um banco
     * de provas de fora: em telemóvel, carregar no «13» não fazia nada, e as
     * manchas guardavam vinte das vinte e nove coudelarias; em computador o
     * algarismo fugia 25 a 27 pixéis e o clique caía num nome ao lado.
     *
     * A regra é uma linha: **o que está na camada de cima não é a lona**.
     * Quem está lá já tem quem trate dele — o `pointerover` da camada dos
     * nomes —, e os comandos da vista também não são chão.
     *
     * É por exclusão e não por «tem de ser a lona» de propósito: um véu de
     * outro componente por cima do globo — o aviso de cookies, por exemplo —
     * recebe os eventos do rato em vez da lona, e exigir a lona deixava o
     * globo cego enquanto ele lá estivesse. O que interessa saber é uma coisa
     * só: se o ponteiro está em cima de uma etiqueta nossa. */
    const foraDaCamada = (e: PointerEvent) => {
      const alvo = e.target as Node | null;
      return !alvo || (!camadaEtiquetas.contains(alvo) && !comandos.contains(alvo));
    };

    /** Um gesto que só serviu para travar a entrada não é um clique. */
    let travouEntrada = false;

    const aoDescer = (e: PointerEvent) => {
      /* ── Carregar durante a viagem trava-a, e mais nada ─────────────────
         A entrada mexe a câmara durante dois segundos e meio. Fixar aqui o
         alfinete debaixo do dedo é fixar um alvo que já não estará ali
         quando ela pousar: numa de três corridas do banco de provas, um
         clique a meio da entrada abria uma coudelaria à sorte. Travar a
         viagem é o que a pessoa está a pedir; escolher por ela não é. */
      travouEntrada = aEntrar;
      aEntrar = false;
      arrastou = false;
      ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      pinca = entreDedos();
      /* Num ecrã táctil não há passeio do rato que acenda o alfinete antes do
         toque: quem escolhe o alvo é o próprio toque. */
      if (foraDaCamada(e) && !travouEntrada) {
        const p = noElemento(e);
        sobAlfinete = alfineteEm(p.x, p.y);
        actualizarActivo();
      }
      pedirQuadro();
    };

    const aoMover = (e: PointerEvent) => {
      const antes = ponteiros.get(e.pointerId);
      if (!antes) {
        // Sem botão em baixo é só passear: acende-se o ponto que está debaixo.
        if (!foraDaCamada(e)) return;
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
      if (Math.abs(dx) + Math.abs(dy) > 3) {
        arrastou = true;
        /* ── O ponteiro só se agarra depois de o gesto ser um arrasto ──────
           Agarrá-lo logo no `pointerdown`, que era o que aqui estava, custava
           **todos os cliques do globo no computador**. Com o ponteiro
           capturado pela caixa, o browser passa a entregar-lhe o `pointerup`
           e o `click` — e o alvo desses eventos deixa de ser o que está
           debaixo do rato. Medido, com um espião nos três eventos:

             pointerdown → globo-etiqueta__nome
             pointerup   → (a caixa)
             click       → (a caixa)

           O `click` do nome nunca chegava ao nome, e o `largar`, que exige
           `e.target === lona` para tratar um clique no alfinete, também nunca
           passava desse teste. Resultado: `aoEscolher` estava morto com rato
           — nem o nome nem o ponto abriam a ficha da coudelaria. Só o toque
           funcionava, porque aí o alvo do clique se resolve de outra maneira.

           A captura serve para o arrasto continuar quando o rato sai da
           caixa, e para isso basta agarrá-lo quando o arrasto começa. Um
           clique, que por definição não passa dos três pixéis, nunca a
           chega a pedir — e chega ao elemento certo. */
        if (!el.hasPointerCapture(e.pointerId)) el.setPointerCapture(e.pointerId);
      }

      if (ponteiros.size >= 2) {
        /* Dois dedos mudam a altura, e a pinça abre a partir do ponto que
           está entre eles — que é o sítio para onde a mão está a apontar.
           Num telemóvel não há roda do rato, e sem isto não havia zoom
           nenhum: o globo era só arrastável. */
        const agora = entreDedos();
        if (pinca > 0 && agora > 0) {
          const meio = centroDosDedos();
          mudarAltura(pinca / agora, meio?.x, meio?.y);
        }
        pinca = agora;
        arrastou = true;
        return;
      }

      const s = escala();
      orbita.theta += dx * s.theta;
      orbita.phi -= dy * s.phi;
      prender();
      pedirQuadro();
    };

    const largar = (e: PointerEvent, clique: boolean) => {
      const tinha = ponteiros.delete(e.pointerId);
      pinca = entreDedos();
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (!tinha) return;
      const eraArrasto = arrastou;
      if (ponteiros.size === 0) arrastou = false;
      const soTravou = travouEntrada;
      if (ponteiros.size === 0) travouEntrada = false;
      if (!clique || eraArrasto || soTravou || e.target !== lona) return;
      // O alfinete vale um clique tanto quanto o nome: é ele o alvo que se vê.
      if (sobAlfinete) accionar(sobAlfinete);
      // Carregar no vazio fecha a pilha ou a mancha que estiver aberta.
      else {
        if (fixa) {
          fixa = null;
          actualizarActivo();
        }
        if (manchaFixa) {
          manchaFixa = null;
          actualizarMancha();
        }
        /* ── Duas batidas no vazio aproximam ───────────────────────────────
           É o gesto que qualquer mapa tem e este não tinha, e é o único zoom
           que existe num telemóvel sem ser a pinça — que precisa de duas mãos
           ou de dois dedos a acertar ao mesmo tempo. Duas batidas precisam de
           uma. Vai buscar o mesmo passo do botão, e ancora no sítio onde se
           bateu, não no centro.

           Só no vazio: em cima de um alfinete a primeira batida já abriu ou
           já navegou, e aproximar por cima disso seria responder duas coisas
           à mesma pergunta. */
        const agora = performance.now();
        const p = noElemento(e);
        const perto = Math.hypot(p.x - ultimoToque.x, p.y - ultimoToque.y) < 26;
        if (agora - ultimoToque.t < 320 && perto) {
          ultimoToque.t = 0;
          mudarAltura(1 / PASSO_ZOOM, p.x, p.y);
        } else {
          ultimoToque.t = agora;
          ultimoToque.x = p.x;
          ultimoToque.y = p.y;
        }
      }
    };
    /** A última batida no vazio, para saber se a próxima é a segunda. */
    const ultimoToque = { t: 0, x: 0, y: 0 };

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
         (deltaY ≈ 120) muda a altura 22%, e um trackpad, que manda muitos
         eventos pequenos, anda à mesma velocidade em vez de disparar.

         Eram 13% quando o curso inteiro do zoom valia 1,6×: cinco dentes
         chegavam ao fundo. Com 3,5× de curso os mesmos 13% pediam dez dentes
         para o mesmo caminho, e um mapa em que é preciso rodar dez vezes para
         ver alguma coisa lê-se como um mapa que não responde. Com 22% são
         seis dentes, que é o que se faz com um gesto do dedo.

         O `clientX/Y` é a âncora: aproxima-se para onde o cursor aponta, e
         não para o meio do ecrã. */
      const passo = Math.max(-120, Math.min(120, e.deltaY)) / 120;
      const r = el.getBoundingClientRect();
      mudarAltura(Math.exp(passo * 0.22), e.clientX - r.left, e.clientY - r.top);
    };

    /** Volta ao enquadramento com que o globo pousou. */
    const reporVista = () => {
      aEntrar = false;
      zoomDoUtilizador = false;
      alturaVoo = alturaRepouso;
      orbita.theta = 0;
      orbita.phi = 0;
      colocarCamara();
      reagrupar();
      pedirQuadro();
    };

    /* ── Percurso pelas coudelarias com as setas ──────────────────────────
     *
     * A tabulação passa só pelos nomes que se lêem — e está certo: um foco em
     * cima de nada não é um caminho, é uma armadilha. Mas isso deixava as
     * outras catorze sem caminho nenhum a partir do globo, que é o defeito
     * a sério. Aqui está o caminho: as setas percorrem as vinte e nove por
     * ordem de latitude, de norte para sul, e cada passo traz a coudelaria à
     * vista antes de lhe dar o foco.
     *
     * Norte→sul e não a ordem da base de dados porque a ordem tem de se
     * poder prever olhando para o mapa: quem vê o ponteiro a descer o país
     * sabe onde vai dar a seta seguinte.
     *
     * Não é preciso mexer a câmara em quase nenhum passo. Uma etiqueta com o
     * foco está `activa`, e uma etiqueta activa é a primeira a escolher
     * lugar — por isso o nome aparece por si, mesmo que a colisão o tivesse
     * calado. Só quando o ponto está mesmo fora do quadro é que a vista se
     * repõe e se centra o que os limites da órbita deixarem.
     *
     * O salto é seco, sem animação, e de propósito: quem navega por teclado
     * quer o passo seguinte, não uma viagem de trezentos milissegundos por
     * cada uma de vinte e nove. */
    /* O percurso é pelas **coudelarias**, não pelos pontos do ecrã. Era pelos
       pontos, e com os ajuntamentos isso passou a querer dizer que uma seta
       podia saltar cinco coudelarias de uma vez. Pior: mover a câmara pode
       refazer os ajuntamentos, e a etiqueta que ia receber o foco deixava de
       existir — medido de fora, o foco saía do globo em todos os passos. A
       lista das vinte e nove nunca muda; as etiquetas mudam. Percorre-se a
       que não muda, e procura-se a etiqueta **depois** de a câmara pousar. */
    const percurso = [...pontos].sort(
      (x, y) => y.coords[0] - x.coords[0] || x.coords[1] - y.coords[1]
    );
    let indiceTour = -1;

    const centrarEm = (coords: [number, number]) => {
      alturaVoo = alturaRepouso;
      zoomDoUtilizador = false;
      /* A guinada corre paralelos e não mexe na latitude; a inclinação corre
         o meridiano da mira, onde a guinada acabou de pôr o ponto. Por isso
         as duas contas são independentes e directas. Agora que o limite da
         órbita sai da caixa dos dados, o ponto fica mesmo ao centro em vez de
         entrar de raspão pela borda — que é o que o percurso pelas setas
         precisava e não tinha. */
      orbita.theta = (MIRA.lon - coords[1]) * grau;
      orbita.phi = (MIRA.lat - coords[0]) * grau;
      prender();
      colocarCamara();
      reagrupar();
    };

    const irPara = (i: number) => {
      if (!percurso.length) return;
      indiceTour = ((i % percurso.length) + percurso.length) % percurso.length;
      const alvo = percurso[indiceTour];
      aEntrar = false;
      centrarEm(alvo.coords);

      const e = etiquetas.find((x) => x.membros.some((m) => m.id === alvo.c.id));
      if (!e) return;
      /* Nunca se dá o foco a um elemento inerte — não iria lá parar. Tira-se
         a inércia agora e o quadro a seguir escreve-a no sítio. */
      if (e.anterior.morto) {
        e.nó.toggleAttribute("inert", false);
        e.anterior.morto = false;
      }
      /* Num ponto que junta várias, o foco vai ao nome desta e não à cabeça
         do grupo: senão as setas passavam pelo grupo uma vez e as outras
         quatro coudelarias ficavam sem caminho. Abrir a lista primeiro, que
         um elemento escondido não recebe foco. */
      if (e.membros.length > 1) {
        fixa = e;
        actualizarActivo();
      }
      (e.alvos.get(alvo.c.id) ?? e.cabeca).focus();
      pedirQuadro();
    };

    /** Onde é que a coudelaria com este id está, no percurso. */
    const passoDe = (id: string) => percurso.findIndex((p) => p.c.id === id);

    /* O ouvinte fica na caixa e não na camada dos nomes: assim as setas
       funcionam a partir de **qualquer** paragem dentro do globo — de um nome,
       mas também dos botões de aproximar. Estava na camada, e por isso quem
       chegasse ao globo pela tabulação e parasse num botão não tinha maneira
       nenhuma de arrancar o percurso: medido em telemóvel, onde a tabulação
       parava nos dois comandos e em nenhum nome. */
    const aoNavegar = (ev: KeyboardEvent) => {
      let passo = 0;
      if (ev.key === "ArrowDown" || ev.key === "ArrowRight") passo = 1;
      else if (ev.key === "ArrowUp" || ev.key === "ArrowLeft") passo = -1;
      else if (ev.key === "Home") {
        ev.preventDefault();
        irPara(0);
        return;
      } else if (ev.key === "End") {
        ev.preventDefault();
        irPara(percurso.length - 1);
        return;
      }
      if (!passo) return;
      // Sem isto as setas rolavam a página por baixo do globo ao mesmo tempo.
      ev.preventDefault();
      /* De onde se parte: do que está debaixo do foco, se for uma coudelaria
         conhecida; senão do último passo dado. */
      const foco = (ev.target as HTMLElement | null)?.dataset?.coudelaria;
      const actual = foco ? passoDe(foco) : indiceTour;
      irPara(actual < 0 ? (passo > 0 ? 0 : percurso.length - 1) : actual + passo);
    };
    el.addEventListener("keydown", aoNavegar);

    const aoTeclar = (e: KeyboardEvent) => {
      /* As mesmas teclas de qualquer mapa. Chegam aqui por borbulhamento, a
         partir de um nome ou de um botão com o foco — a caixa não entra na
         tabulação, porque uma paragem que não diz o que faz não é um caminho. */
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        mudarAltura(1 / PASSO_ZOOM);
        return;
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        mudarAltura(PASSO_ZOOM);
        return;
      }
      if (e.key === "0") {
        e.preventDefault();
        reporVista();
        return;
      }
      if (e.key !== "Escape") return;
      if (manchaFixa) {
        manchaFixa = null;
        actualizarMancha();
      }
      if (!fixa) return;
      fixa = null;
      actualizarActivo();
    };

    /* ── Os comandos ──────────────────────────────────────────────────────
     *
     * Aproximar era possível — com a roda do rato ou com dois dedos —, mas
     * não estava escrito em lado nenhum do quadro, e é aproximar que faz os
     * nomes aparecerem: é a acção mais útil do ecrã e era a mais escondida.
     * Uma legenda a dizer «aproxime-se» não é a mesma coisa que um botão:
     * a legenda tem de se ler e de se acreditar, o botão carrega-se.
     *
     * São três e não uma barra de zoom com cursor: num globo de que se pode
     * sair pelo lado, repor o enquadramento vale tanto como aproximar, e um
     * cursor de zoom seria mais uma peça a desenhar por cima da fotografia.
     * Apagam-se ao fim do curso — é a maneira honesta de dizer que a
     * aproximação tem limite, sem escrever nenhum número.
     *
     * Ficam antes da camada de nomes na árvore de propósito: quem chega por
     * tabulação encontra primeiro três acções com nome e depois os nomes, e
     * não quinze nomes antes de saber que a vista se mexe. */
    const comandos = document.createElement("div");
    comandos.className = "globo-comandos";
    comandos.setAttribute("role", "group");
    comandos.setAttribute("aria-label", "Vista do globo");

    const SVG_NS = "http://www.w3.org/2000/svg";
    const desenho = (...ds: string[]) => {
      const svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("viewBox", "0 0 16 16");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      for (const d of ds) {
        const p = document.createElementNS(SVG_NS, "path");
        p.setAttribute("d", d);
        svg.appendChild(p);
      }
      return svg;
    };

    const fazerComando = (rotulo: string, svg: SVGElement, accao: () => void) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "globo-comando";
      b.setAttribute("aria-label", rotulo);
      b.title = rotulo;
      b.appendChild(svg);
      /* O `pointerdown` não pode chegar à caixa: chegava, e carregar no
         botão punha a caixa a capturar o ponteiro e a tratar o gesto como um
         arrasto do globo. */
      b.addEventListener("pointerdown", (ev) => ev.stopPropagation());
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        accao();
      });
      comandos.appendChild(b);
      return b;
    };

    const btAproximar = fazerComando("Aproximar", desenho("M8 3.2v9.6", "M3.2 8h9.6"), () =>
      mudarAltura(1 / PASSO_ZOOM)
    );
    const btAfastar = fazerComando("Afastar", desenho("M3.2 8h9.6"), () => mudarAltura(PASSO_ZOOM));
    const btRepor = fazerComando(
      "Repor a vista",
      desenho(
        "M8 2.2v3",
        "M8 10.8v3",
        "M2.2 8h3",
        "M10.8 8h3",
        "M8 5.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8"
      ),
      reporVista
    );

    el.insertBefore(comandos, camadaEtiquetas);

    /* Escrito uma vez por mudança e não uma vez por quadro: pôr o mesmo
       `disabled` sessenta vezes por segundo é trabalho de layout a troco de
       nada. */
    const estadoComandos = { perto: false, longe: false, posto: false };
    const actualizarComandos = () => {
      const perto = alturaVoo <= ALTURA_MINIMA * 1.001;
      const longe = alturaVoo >= ALTURA_MAXIMA * 0.999;
      const posto =
        Math.abs(Math.log(alturaVoo / alturaRepouso)) < 0.01 &&
        Math.abs(orbita.theta) < 1e-4 &&
        Math.abs(orbita.phi) < 1e-4;
      if (perto !== estadoComandos.perto) {
        btAproximar.disabled = perto;
        estadoComandos.perto = perto;
      }
      if (longe !== estadoComandos.longe) {
        btAfastar.disabled = longe;
        estadoComandos.longe = longe;
      }
      if (posto !== estadoComandos.posto) {
        btRepor.disabled = posto;
        estadoComandos.posto = posto;
      }
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

    /* ── Quem está por cima da lona ───────────────────────────────────────
       Não se pergunta ao código de fora quanto espaço ocupa — pergunta-se ao
       browser quem está no caminho. Três sondagens na borda de baixo e três
       na de cima com `elementFromPoint`: o que vier de volta e não for nosso
       é um estorvo, e sobe-se até ao primeiro antepassado `fixed` ou
       `sticky` para lhe saber a altura toda.

       Assim a barra de cookies, a navegação de fundo do telemóvel e o
       cabeçalho ao rolar entram na conta sem que o globo tenha de saber que
       existem — nem de conhecer os nomes das classes de outros componentes,
       que mudam sem aviso. `elementFromPoint` já ignora o que tem
       `pointer-events: none`, por isso uma legenda decorativa não conta como
       estorvo.

       É caro (obriga o browser a refazer o layout), por isso não corre por
       quadro: corre quando a caixa muda de tamanho, quando a página rola —
       uma vez por quadro, no máximo — e três vezes depois de montar, que é
       para apanhar a barra de cookies, que entra com atraso e com animação. */
    const COLUNAS_SONDA = [0.16, 0.5, 0.84];
    /* Fundos, em pixéis a contar da borda. Não chega sondar a borda: a barra
       de cookies é `bottom: 12px`, isto é flutua doze pixéis acima do fundo
       do ecrã, e uma sondagem só na última linha da lona passava-lhe por
       baixo e dava «não há estorvo nenhum» — que foi exactamente o que
       aconteceu à primeira tentativa. Sonda-se uma faixa, e o que conta é o
       ponto mais fundo a que um estorvo chega. */
    const FUNDOS_SONDA = [2, 18, 42, 78, 130, 200];
    let estorvoPedido = 0;

    /** O rectângulo do estorvo fixo que está neste ponto, se algum houver. */
    const fixoEm = (x: number, y: number) => {
      const alvo = document.elementFromPoint(x, y);
      if (!alvo || el.contains(alvo)) return null;
      let n: HTMLElement | null = alvo as HTMLElement;
      while (n && n !== document.body) {
        const pos = getComputedStyle(n).position;
        if (pos === "fixed" || pos === "sticky") return n.getBoundingClientRect();
        n = n.parentElement;
      }
      return null;
    };

    const medirEstorvos = () => {
      estorvoPedido = 0;
      if (desmontado || !noEcra || escondido) return;
      const c = el.getBoundingClientRect();
      if (c.width < 1 || c.height < 1) return;
      /* ── Uma cortina não é uma barra ─────────────────────────────────
         Um estorvo que come mais de 40% da lona já não é uma barra fixa a
         que os nomes possam fugir: é uma modal ou uma cortina por cima de
         tudo. Isto já cá estava escrito, mas a conclusão era a errada — o
         código **encostava a faixa ao tecto de 40%** em vez de a ignorar, e
         com um estorvo em cima e outro em baixo sobravam 20% de lona útil.

         Medido de fora, depois de o aviso de cookies ter passado a um
         diálogo com véu `fixed inset-0`: na primeira visita, sete nomes em
         vez de catorze no computador e três em vez de nove no telemóvel. É
         exactamente o primeiro quadro que alguém vê do site.

         Quem cobre tudo não deixa sítio nenhum para onde fugir, e nesse caso
         escrever os nomes onde eles devem estar é melhor do que os apagar:
         quando a cortina sair — e vai sair — estão no sítio, e enquanto lá
         está não se vê nada de qualquer maneira. Passa a ser descartado. */
      const tecto = c.height * 0.4;
      let alturaDoTopo = c.top;
      let fundoDaBase = c.bottom;
      const maisFundo = FUNDOS_SONDA[FUNDOS_SONDA.length - 1];
      for (const f of COLUNAS_SONDA) {
        const x = c.left + c.width * f;
        let chegaCima = false;
        let chegaBaixo = false;
        for (const d of FUNDOS_SONDA) {
          if (d > tecto) break;
          /* Uma sondagem custa uma consulta de layout ao browser. Assim que
             um estorvo desta coluna já se estende para além da sondagem mais
             funda, nenhuma sondagem seguinte lhe pode acrescentar nada — e
             deixa-se de perguntar. Medido: no telemóvel, com a barra de
             cookies, passa de trinta e seis consultas para seis. */
          if (!chegaCima) {
            const emCima = fixoEm(x, c.top + d);
            if (emCima) {
              alturaDoTopo = Math.max(alturaDoTopo, emCima.bottom);
              chegaCima = emCima.bottom - c.top >= maisFundo;
            }
          }
          if (!chegaBaixo) {
            const emBaixo = fixoEm(x, c.bottom - d);
            if (emBaixo) {
              fundoDaBase = Math.min(fundoDaBase, emBaixo.top);
              chegaBaixo = c.bottom - emBaixo.top >= maisFundo;
            }
          }
          if (chegaCima && chegaBaixo) break;
        }
      }
      const entraEmCima = Math.max(0, alturaDoTopo - c.top);
      const entraEmBaixo = Math.max(0, c.bottom - fundoDaBase);
      const topo = entraEmCima > tecto ? 0 : entraEmCima;
      const base = alturaCaixa - (entraEmBaixo > tecto ? 0 : entraEmBaixo);
      if (Math.abs(topo - topoUtil) < 2 && Math.abs(base - baseUtil) < 2) return;
      topoUtil = topo;
      baseUtil = base;
      /* Os comandos descem o mesmo que os nomes. Estavam no canto de cima e
         iam parar por baixo do cabeçalho com a página a meio do rolo. */
      comandos.style.setProperty("--recuo", `${Math.round(topo)}px`);
      pedirQuadro();
    };

    const pedirEstorvos = () => {
      if (estorvoPedido || desmontado) return;
      estorvoPedido = requestAnimationFrame(medirEstorvos);
    };

    /* ── Quando é que se volta a medir ────────────────────────────────────
       Um estorvo aparece de duas maneiras, e cada uma tem o seu sinal.

       Aparece **por si**, com atraso: a barra de cookies só entra dois
       segundos depois de a página carregar, e entra a deslizar. Medir a meio
       do deslize dá a barra onde ela ainda não está — e foi isso que
       aconteceu à primeira: a faixa saía curta e dois nomes ficavam por
       baixo dela na mesma. Quem avisa que acabou de entrar é o
       `animationend`, e é a ele que se ouve.

       Ou aparece e desaparece **por acção de alguém**: quem aceita os
       cookies faz a barra sair, e nesse instante há mais lona outra vez. Um
       `click` em qualquer sítio da página chega para o saber, e mede-se duas
       vezes — agora e um terço de segundo depois, que é o tempo de o React
       desmontar o que quer que tenha saído.

       Nenhum destes é um relógio a bater para sempre. Em repouso, sem
       ninguém a mexer em nada, não corre nada disto — que é a regra da casa
       para esta cena. */
    const talvezEstorvo = (ev: Event) => {
      const alvo = ev.target as HTMLElement | null;
      if (!alvo || typeof alvo.getBoundingClientRect !== "function") return;
      if (el.contains(alvo)) return;
      const pos = getComputedStyle(alvo).position;
      if (pos !== "fixed" && pos !== "sticky") return;
      pedirEstorvos();
    };

    let relogioClique = 0;
    const aoClicarAlgures = () => {
      pedirEstorvos();
      window.clearTimeout(relogioClique);
      relogioClique = window.setTimeout(pedirEstorvos, 320);
    };

    window.addEventListener("scroll", pedirEstorvos, { passive: true });
    document.addEventListener("animationend", talvezEstorvo, true);
    document.addEventListener("transitionend", talvezEstorvo, true);
    document.addEventListener("click", aoClicarAlgures, true);
    const relogiosEstorvo = [0, 700, 2600].map((t) => window.setTimeout(pedirEstorvos, t));

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
      /* A caixa mudou de tamanho, logo mudou quantos metros vale um pixel — e
         é dos metros por pixel que sai o raio dos ajuntamentos. Rodar o
         telemóvel tem de refazer as contas, não só o tamanho da lona. */
      prender();
      colocarCamara();
      reagrupar();
      // Numa coluna mais estreita as etiquetas encolhem: as medidas em cache
      // deixam de valer, e é delas que sai o teste de colisão.
      precisaMedir = true;
      /* A janela útil sai da posição da lona no ecrã, que acabou de mudar.
         Enquanto não se remede, vale a lona inteira — nunca menos, para que
         uma medida por fazer não apague nomes. */
      baseUtil = Math.min(baseUtil, a);
      pedirEstorvos();
      pedirQuadro();
    });
    observador.observe(el);

    /* A vista reposta pode vir de uma caixa de outro tamanho: os limites
       saem da caixa dos dados e da proporção da lona, e é aqui que se
       verificam pela primeira vez. */
    prender();
    colocarCamara();
    reagrupar(true);

    /* O `pagehide` apanha o que o desmonte não apanha: fechar o separador,
       seguir uma ligação para fora do site, o browser a arrumar a página. */
    window.addEventListener("pagehide", guardarVista);

    return () => {
      desmontado = true;
      guardarVista();
      window.removeEventListener("pagehide", guardarVista);
      cancelarContornos.abort();
      window.clearTimeout(relogioRevelar);
      for (const r of relogiosEstorvo) window.clearTimeout(r);
      window.clearTimeout(relogioClique);
      window.removeEventListener("scroll", pedirEstorvos);
      document.removeEventListener("animationend", talvezEstorvo, true);
      document.removeEventListener("transitionend", talvezEstorvo, true);
      document.removeEventListener("click", aoClicarAlgures, true);
      if (estorvoPedido) cancelAnimationFrame(estorvoPedido);
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
      el.removeEventListener("keydown", aoNavegar);
      /* Os ouvintes das etiquetas ficam nos nós que saem daqui com a camada:
         a árvore inteira fica sem referências e vai com o resto do fecho. */
      camadaEtiquetas.remove();
      comandos.remove();

      cena.traverse((o) => {
        const obj = o as THREE.Mesh;
        if (obj.geometry) obj.geometry.dispose();
        const m = obj.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else if (m) m.dispose();
      });
      /* Um `ShaderMaterial.dispose()` não toca nas texturas dos uniformes —
         a limpeza antiga não lhes chegava. Medido: vinte teclas escritas na
         pesquisa levavam as texturas vivas de 8 a 101 e a memória de 8,9
         para 18,5 MB. */
      for (const t of texturas) t.dispose();

      renderizador.dispose();
      /* `dispose()` larga o que o renderizador alocou, mas o contexto WebGL
         em si só se liberta com isto. Sem ele, vinte montagens enchiam a
         consola de «Too many active WebGL contexts. Oldest context will be
         lost» — que é o globo de outro separador a apagar-se sozinho. */
      renderizador.forceContextLoss();
      lona.remove();
    };
    /* A assinatura não se lê aqui dentro — os pontos vêm do `pontosRef`. Está
       nas dependências porque é ela, e não a identidade do array, que decide
       quando é que vale a pena deitar a cena fora e montar outra. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura]);

  useEffect(() => montar(), [montar]);

  const semImagem = estado === "sem-3d";

  return (
    /* ── A roda é do globo ────────────────────────────────────────────────
       Medido enquanto o site rolava com um motor de deslocamento por
       JavaScript (o Lenis, com `smoothWheel`): seis dentes de roda sobre a
       lona aproximavam **e** rolavam a página 445 pixéis — quem se tentava
       aproximar via o globo fugir-lhe para cima do ecrã. O `preventDefault()`
       daqui não chegava, porque quem tratava o evento era o ouvinte do outro
       lado, e a ordem de registo não é nossa.

       Esse motor entretanto saiu do site, e o `preventDefault()` passou a
       bastar. O atributo fica na mesma: é uma palavra, é o contrato público
       de uma família inteira de bibliotecas de deslocamento, e diz o que
       aqui é verdade — **a roda em cima do globo não rola a página**. Se
       algum dia voltar a entrar uma, o globo já está defendido, e sem
       precisar de saber que ela existe. Fica na caixa de fora e não na lona,
       para valer também para a camada dos nomes e para os comandos. */
    <div className="relative h-full w-full" data-lenis-prevent>
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
      {/* A tabulação passa só pelos nomes que estão à vista — um foco em cima
          de nada não é um caminho. O caminho para as outras são as setas, que
          percorrem as {pontos.length} por ordem de latitude e trazem cada uma
          à vista antes de lhe dar o foco. Tem de estar escrito: um atalho que
          ninguém sabe que existe é um atalho que não existe. */}
      <p className="sr-only">
        Globo com {pontos.length} coudelarias em Portugal. As que estão demasiado perto umas das
        outras para se apontarem em separado aparecem num ponto só, com a conta; aproximar
        separa-as. A tabulação passa pelos nomes visíveis de cada vez, e um nome leva à ficha da
        coudelaria. Com o foco em qualquer ponto do globo, as setas para cima e para baixo percorrem
        as {pontos.length} coudelarias de norte para sul, trazendo cada uma ao centro; Início e Fim
        saltam para a primeira e para a última. Mais e menos aproximam e afastam, zero repõe a
        vista. A lista completa está na vista de lista.
      </p>
    </div>
  );
}
