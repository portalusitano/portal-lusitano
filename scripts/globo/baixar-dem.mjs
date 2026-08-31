/* Descarrega os tiles de altimetria (Terrarium, AWS Terrain Tiles) que cobrem
   a janela ibérica. Guarda-os em bruto; a montagem é noutro passo. */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";

const execFileP = promisify(execFile);
const S = "/tmp/claude-0/-home-user-portal-lusitano/1a569864-0d71-5ca8-a39f-0ce2fe065479/scratchpad";
const DIR = `${S}/dem`;
fs.mkdirSync(DIR, { recursive: true });

export const JANELA = { lonMin: -13, lonMax: -2, latMin: 35, latMax: 45 };
const Z = 9;

const lon2x = (lon, z) => ((lon + 180) / 360) * 2 ** z;
const lat2y = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};

const x0 = Math.floor(lon2x(JANELA.lonMin, Z));
const x1 = Math.floor(lon2x(JANELA.lonMax, Z));
const y0 = Math.floor(lat2y(JANELA.latMax, Z));
const y1 = Math.floor(lat2y(JANELA.latMin, Z));

const lista = [];
for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) lista.push({ x, y });

console.log(`z${Z} x:${x0}..${x1} y:${y0}..${y1} = ${lista.length} tiles`);

let feitos = 0;
let falhas = 0;

async function um({ x, y }) {
  const dest = `${DIR}/${Z}_${x}_${y}.png`;
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
    feitos++;
    return;
  }
  const url = `https://elevation-tiles-prod.s3.amazonaws.com/terrarium/${Z}/${x}/${y}.png`;
  for (let tent = 0; tent < 4; tent++) {
    try {
      await execFileP("curl", ["-sS", "-f", "-o", dest, "--max-time", "90", url], { maxBuffer: 1 << 24 });
      if (fs.statSync(dest).size > 1000) {
        feitos++;
        if (feitos % 25 === 0) console.log(`  ${feitos}/${lista.length}`);
        return;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 800 * (tent + 1)));
    }
  }
  falhas++;
  console.log(`  FALHOU ${Z}/${x}/${y}`);
}

const CONC = 6;
let i = 0;
await Promise.all(
  Array.from({ length: CONC }, async () => {
    while (i < lista.length) {
      const t = lista[i++];
      await um(t);
    }
  })
);

console.log(`pronto: ${feitos} tiles, ${falhas} falhas`);
