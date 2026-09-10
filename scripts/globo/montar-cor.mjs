/* Monta a JANELA DE COR da Península a partir do Natural Earth II.
 *
 * O `relevo.webp` resolveu a FORMA do terreno: veio de altimetria a sério e
 * deu à Península a estrutura que 19x30 texels não conseguem ter. Ficou por
 * resolver a COR, que continuava a sair dos mesmos 19x30 — e é por isso que o
 * Alentejo se lê como uma aguarela desfocada por baixo de um relevo nítido.
 *
 * ── O que se guarda, e porquê não é a cor ─────────────────────────────────
 *
 * Não se guarda a cor da Península. Guarda-se o **quociente entre a cor e a
 * sua própria média local** — um mapa de pormenor com média 1, que o shader
 * multiplica pelo que já lá está.
 *
 * A razão é a mesma pela qual o `relevo.webp` guarda o DESVIO da luz e não a
 * luz: assim não se mexe no que o mapa global já sabe. As frequências baixas
 * — a cor, o brilho, o verde do Minho contra o ocre do Alentejo — continuam a
 * vir do `dia.webp`, tal e qual como hoje. Só se acrescenta o que ele não
 * consegue carregar. Daqui saem três coisas de graça:
 *
 *   · não há costura nenhuma na borda da janela, porque na borda o quociente
 *     vai a 1 e o que fica é exactamente a imagem de hoje;
 *   · não há salto de paleta. O Natural Earth é tinta cartográfica pastel
 *     (média 206/209/178 sobre terra) e o Blue Marble é fotografia
 *     (82/80/75): enxertar um no outro dava um rectângulo pastel visível do
 *     espaço. Um quociente não tem paleta;
 *   · o ficheiro é quase neutro, e por isso comprime-se a muito menos bytes
 *     do que uma imagem de cor.
 *
 * ── Um canal, não três ────────────────────────────────────────────────────
 *
 * O quociente é de luminância e multiplica os três canais por igual: muda o
 * claro-escuro e não mexe no matiz. A cor de cada sítio continua a ser a que
 * o mapa global diz que é — o que se acrescenta é onde há mais e menos, que é
 * o que falta. Um mapa de três canais acrescentaria matiz inventado à escala
 * fina e, pior, teria de passar pela subamostragem de croma do WebP com
 * perdas, que é 4:2:0 — metade da resolução exactamente naquilo que se estava
 * a tentar ganhar.
 *
 * ── A fonte ───────────────────────────────────────────────────────────────
 *
 * Natural Earth II a 60 pontos por grau contra os 5,69 do mapa global: 10,5x
 * em linha, 111x em texels. A escolha entre as três fontes possíveis está
 * medida e escrita no `baixar-cor.mjs` — e a que tinha mais detalhe é a que
 * não se usou, porque o detalhe dela é grão de gravura e não geografia.
 *
 *   node scripts/globo/baixar-cor.mjs
 *   node scripts/globo/montar-cor.mjs
 */
import sharp from "/home/user/portal-lusitano/node_modules/sharp/lib/index.js";
import fs from "node:fs";
import path from "node:path";

const S =
  "/tmp/claude-0/-home-user-portal-lusitano/1a569864-0d71-5ca8-a39f-0ce2fe065479/scratchpad";
const TIF = `${S}/ne/NE2_HR_LC.tif`;
const DESTINO = path.resolve(process.argv[2] || "public/globo/cor.webp");

/** A mesma janela do relevo. Duas janelas diferentes para a mesma Península
 *  eram duas bordas para esbater e duas contas no shader. */
export const JANELA = { lonMin: -13, lonMax: -2, latMin: 35, latMax: 45 };

/** 60 pontos por grau: a resolução nativa da fonte. Reamostrar para cima era
 *  inventar; para baixo era deitar fora o que se veio buscar. */
const PPG = 60;
const LARG = Math.round((JANELA.lonMax - JANELA.lonMin) * PPG);
const ALT = Math.round((JANELA.latMax - JANELA.latMin) * PPG);

/** O raio do borrão que separa «o que o mapa global já sabe» de «o que falta».
 *
 *  Um texel do `dia.webp` mede 1/5,69 de grau, que nesta janela são 10,5
 *  pontos. Abaixo disso o mapa global não tem nada para dizer — a bilinear e
 *  os mipmaps já comeram tudo — e é essa a banda que este ficheiro carrega. */
const SIGMA = 10;

/** Onde o quociente se corta.
 *
 *  Medido sobre terra: p1 = 0,908, p50 = 0,998, p99 = 1,127. As caudas são
 *  compridas — neve, lagos, bordas de cidade — mas magras: só 0,85% dos pontos
 *  caem fora deste intervalo, e cortá-los dá um passo de quantização de 0,17%
 *  no quociente para os outros 99,15%, que é bem menos do que o erro do WebP.
 *  Um intervalo folgado só gastava níveis em cima de nada. */
const QMIN = 0.78;
const QMAX = 1.22;

if (!fs.existsSync(TIF)) {
  console.error(`falta ${TIF} — corre primeiro: node scripts/globo/baixar-cor.mjs`);
  process.exit(1);
}

const left = Math.round((JANELA.lonMin + 180) * PPG);
const top = Math.round((90 - JANELA.latMax) * PPG);
console.log(`janela ${LARG}x${ALT} a partir de (${left},${top}) do NE2 (21600x10800)`);

const { data: rgb } = await sharp(TIF, { limitInputPixels: false, unlimited: true })
  .extract({ left, top, width: LARG, height: ALT })
  .raw()
  .toBuffer({ resolveWithObject: true });

const N = LARG * ALT;

/* ── Onde a fonte tem dados ────────────────────────────────────────────────
   O Natural Earth II é cobertura do solo: o mar vem branco puro, sem dado
   nenhum. Se o borrão passasse por cima do branco, a média local de toda a
   faixa costeira era puxada para cima e o quociente saía abaixo de 1 —
   desenhava-se uma orla escura à volta de Portugal inteiro, que é um artefacto
   com a forma exacta de uma costa, ou seja, o pior tipo. Por isso o borrão é
   pesado pela máscara: `borrar(v·m)/borrar(m)`. */
const luz = new Float32Array(N);
const masc = new Float32Array(N);
let nTerra = 0;
for (let i = 0; i < N; i++) {
  const r = rgb[i * 3],
    g = rgb[i * 3 + 1],
    b = rgb[i * 3 + 2];
  const branco = r > 249 && g > 249 && b > 249;
  masc[i] = branco ? 0 : 1;
  if (!branco) nTerra++;
  // Luminância em valores lineares: é aí que a média local quer dizer alguma
  // coisa. Um quociente calculado sobre sRGB comprimido mente nas sombras.
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  luz[i] = branco ? 0 : 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
console.log(`terra: ${nTerra} de ${N} (${((100 * nTerra) / N).toFixed(1)}%)`);

/** Borrão gaussiano separável, com bordas replicadas. */
function borrar(v, w, h, sigma) {
  const raio = Math.ceil(sigma * 3);
  const nucleo = new Float32Array(raio * 2 + 1);
  let soma = 0;
  for (let i = -raio; i <= raio; i++) {
    const x = Math.exp(-(i * i) / (2 * sigma * sigma));
    nucleo[i + raio] = x;
    soma += x;
  }
  for (let i = 0; i < nucleo.length; i++) nucleo[i] /= soma;
  const a = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -raio; k <= raio; k++) {
        s += nucleo[k + raio] * v[y * w + Math.min(w - 1, Math.max(0, x + k))];
      }
      a[y * w + x] = s;
    }
  const b = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -raio; k <= raio; k++) {
        s += nucleo[k + raio] * a[Math.min(h - 1, Math.max(0, y + k)) * w + x];
      }
      b[y * w + x] = s;
    }
  return b;
}

const luzM = borrar(luz, LARG, ALT, SIGMA);
const mascM = borrar(masc, LARG, ALT, SIGMA);

const saida = Buffer.alloc(N);
let fora = 0;
const hist = [];
for (let i = 0; i < N; i++) {
  let q = 1;
  if (masc[i] > 0) {
    const media = mascM[i] > 1e-4 ? luzM[i] / mascM[i] : luz[i];
    q = media > 1e-6 ? luz[i] / media : 1;
    if (q < QMIN || q > QMAX) fora++;
    if ((i & 63) === 0) hist.push(q);
  }
  const t = (Math.min(QMAX, Math.max(QMIN, q)) - QMIN) / (QMAX - QMIN);
  saida[i] = Math.max(0, Math.min(255, Math.round(t * 255)));
}
hist.sort((a, b) => a - b);
const pc = (p) => hist[Math.min(hist.length - 1, Math.floor(p * hist.length))].toFixed(3);
console.log(
  `quociente sobre terra: p1 ${pc(0.01)}  p50 ${pc(0.5)}  p99 ${pc(0.99)}  ` +
    `fora do intervalo ${((100 * fora) / nTerra).toFixed(2)}%`
);

const img = sharp(saida, { raw: { width: LARG, height: ALT, channels: 1 } });
for (const [nome, opcoes] of [
  ["q80", { quality: 80, effort: 6 }],
  ["q88", { quality: 88, effort: 6 }],
  ["q94", { quality: 94, effort: 6 }],
  ["quase-sem-perdas", { nearLossless: true, quality: 60, effort: 6 }],
]) {
  const f = `${S}/cor-${nome}.webp`;
  await img.clone().webp(opcoes).toFile(f);
  console.log(nome.padEnd(18), (fs.statSync(f).size / 1024).toFixed(1), "KB");
}

/* O que se entrega. A qualidade sai da medida que está no relatório: abaixo
   de 88 o erro de quantização já se lê como blocos de 8x8 nas encostas, que é
   trocar aguarela desfocada por serrilha — não é melhorar. */
await img.clone().webp({ quality: 88, effort: 6 }).toFile(DESTINO);
console.log(`\n${DESTINO}: ${(fs.statSync(DESTINO).size / 1024).toFixed(1)} KB  (${LARG}x${ALT})`);
