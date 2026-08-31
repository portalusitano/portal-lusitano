/* Monta os tiles Terrarium numa grelha de altitudes equirectangular e escreve
   um mapa de relevo para a janela ibérica.

   Porquê equirectangular: é a projecção em que a esfera do globo está
   texturada (uv.x = lon, uv.y = lat lineares). Os tiles vêm em Web Mercator,
   por isso há uma reprojecção pelo meio.

   O que sai:
     R = componente Este da normal do terreno   (nx, 0..255 = -1..1)
     G = componente Norte da normal do terreno  (ny, 0..255 = -1..1)
     B = altitude normalizada 0..ALT_MAX, e o zero serve de máscara de água.

   Guarda-se a normal e não um sombreado já feito: o Sol desta cena é um
   uniforme, e um sombreado cozido com outra direcção de luz brigava com o
   terminador. Com a normal, quem ilumina o relevo é o mesmo Sol que ilumina
   o resto do planeta.
*/
import sharp from "/home/user/portal-lusitano/node_modules/sharp/lib/index.js";
import fs from "node:fs";

const S = "/tmp/claude-0/-home-user-portal-lusitano/1a569864-0d71-5ca8-a39f-0ce2fe065479/scratchpad";
const DIR = `${S}/dem`;
const Z = 9;
const TILE = 256;

export const JANELA = { lonMin: -13, lonMax: -2, latMin: 35, latMax: 45 };
const LARG = Number(process.argv[2] || 2048);
const ALT = Number(process.argv[3] || 2048);
const ALT_MAX = 3500; // Mulhacén tem 3479 m; é o tecto da janela.
const RAIO_TERRA = 6371000;

const lon2x = (lon, z) => ((lon + 180) / 360) * 2 ** z;
const lat2y = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};

const x0 = Math.floor(lon2x(JANELA.lonMin, Z));
const x1 = Math.floor(lon2x(JANELA.lonMax, Z));
const y0 = Math.floor(lat2y(JANELA.latMax, Z));
const y1 = Math.floor(lat2y(JANELA.latMin, Z));
const nx = x1 - x0 + 1;
const ny = y1 - y0 + 1;

console.log(`mosaico ${nx}x${ny} tiles = ${nx * TILE}x${ny * TILE} px (mercator)`);

// ── 1. Mosaico de altitudes em Web Mercator ─────────────────────────────────
const MW = nx * TILE;
const MH = ny * TILE;
const alt = new Float32Array(MW * MH);

let lidos = 0;
for (let tx = x0; tx <= x1; tx++) {
  for (let ty = y0; ty <= y1; ty++) {
    const p = `${DIR}/${Z}_${tx}_${ty}.png`;
    if (!fs.existsSync(p)) continue;
    const { data, info } = await sharp(p).raw().toBuffer({ resolveWithObject: true });
    const c = info.channels;
    const ox = (tx - x0) * TILE;
    const oy = (ty - y0) * TILE;
    for (let j = 0; j < TILE; j++) {
      for (let i = 0; i < TILE; i++) {
        const k = (j * TILE + i) * c;
        const h = data[k] * 256 + data[k + 1] + data[k + 2] / 256 - 32768;
        alt[(oy + j) * MW + (ox + i)] = h;
      }
    }
    lidos++;
  }
}
console.log(`tiles lidos: ${lidos}`);

// ── 2. Reprojecção para equirectangular ─────────────────────────────────────
const eq = new Float32Array(LARG * ALT);
const mercX0 = x0 * TILE;
const mercY0 = y0 * TILE;

function amostra(fx, fy) {
  const ix = Math.max(0, Math.min(MW - 2, Math.floor(fx)));
  const iy = Math.max(0, Math.min(MH - 2, Math.floor(fy)));
  const dx = Math.max(0, Math.min(1, fx - ix));
  const dy = Math.max(0, Math.min(1, fy - iy));
  const a = alt[iy * MW + ix];
  const b = alt[iy * MW + ix + 1];
  const c = alt[(iy + 1) * MW + ix];
  const d = alt[(iy + 1) * MW + ix + 1];
  return a * (1 - dx) * (1 - dy) + b * dx * (1 - dy) + c * (1 - dx) * dy + d * dx * dy;
}

for (let j = 0; j < ALT; j++) {
  // j = 0 no topo → latMax
  const lat = JANELA.latMax - ((j + 0.5) / ALT) * (JANELA.latMax - JANELA.latMin);
  const fy = lat2y(lat, Z) * TILE - mercY0;
  for (let i = 0; i < LARG; i++) {
    const lon = JANELA.lonMin + ((i + 0.5) / LARG) * (JANELA.lonMax - JANELA.lonMin);
    const fx = lon2x(lon, Z) * TILE - mercX0;
    eq[j * LARG + i] = amostra(fx, fy);
  }
}

// ── 3. Normais do terreno, no referencial (Este, Norte, Cima) ───────────────
/* O passo em metros não é o mesmo nos dois eixos nem constante em latitude:
   um grau de longitude encolhe com o cosseno da latitude. Sem isso o relevo
   sairia esticado no sentido Este-Oeste, e a 40°N o erro é de 30%. */
const dLat = ((JANELA.latMax - JANELA.latMin) / ALT) * (Math.PI / 180);
const passoNorte = RAIO_TERRA * dLat;
const dLon = ((JANELA.lonMax - JANELA.lonMin) / LARG) * (Math.PI / 180);

const saida = Buffer.alloc(LARG * ALT * 3);
let maxDecl = 0;

for (let j = 0; j < ALT; j++) {
  const lat = JANELA.latMax - ((j + 0.5) / ALT) * (JANELA.latMax - JANELA.latMin);
  const passoEste = RAIO_TERRA * dLon * Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i < LARG; i++) {
    const iE = Math.min(LARG - 1, i + 1);
    const iO = Math.max(0, i - 1);
    const jN = Math.max(0, j - 1);
    const jS = Math.min(ALT - 1, j + 1);
    const dhE = (eq[j * LARG + iE] - eq[j * LARG + iO]) / ((iE - iO) * passoEste);
    // j cresce para sul, por isso o gradiente para norte troca de sinal.
    const dhN = (eq[jN * LARG + i] - eq[jS * LARG + i]) / ((jS - jN) * passoNorte);
    const h = eq[j * LARG + i];

    let vx = -dhE;
    let vy = -dhN;
    const inv = 1 / Math.sqrt(vx * vx + vy * vy + 1);
    vx *= inv;
    vy *= inv;
    maxDecl = Math.max(maxDecl, Math.hypot(dhE, dhN));

    const k = (j * LARG + i) * 3;
    saida[k] = Math.max(0, Math.min(255, Math.round((vx * 0.5 + 0.5) * 255)));
    saida[k + 1] = Math.max(0, Math.min(255, Math.round((vy * 0.5 + 0.5) * 255)));
    /* Azul: zero é água, e a terra começa em 16.
       O intervalo vazio entre 0 e 16 existe por causa da compressão com
       perdas — sem ele, a costa (terra a 0 m) ficava com o mesmo valor que
       o mar, e o teste de água não tinha por onde os separar. */
    saida[k + 2] = h <= 0 ? 0 : Math.max(24, Math.min(255, Math.round(24 + (Math.min(h, ALT_MAX) / ALT_MAX) * 231)));
  }
}

console.log("declive máximo (m/m):", maxDecl.toFixed(3));

const img = sharp(saida, { raw: { width: LARG, height: ALT, channels: 3 } });
await img.clone().webp({ quality: 82, effort: 6 }).toFile(`${S}/relevo-q82.webp`);
await img.clone().webp({ quality: 92, effort: 6 }).toFile(`${S}/relevo-q92.webp`);
await img.clone().webp({ quality: 85, effort: 6 }).toFile(`${S}/relevo-q85.webp`);
await img.clone().webp({ quality: 78, effort: 6 }).toFile(`${S}/relevo-q78.webp`);
await img.clone().webp({ lossless: true, effort: 6 }).toFile(`${S}/relevo-sem-perdas.webp`);
await img.clone().png().toFile(`${S}/relevo.png`);

for (const f of ["relevo-q92", "relevo-q85", "relevo-q78", "relevo-sem-perdas"]) {
  console.log(f.padEnd(20), (fs.statSync(`${S}/${f}.webp`).size / 1024).toFixed(1), "KB");
}
