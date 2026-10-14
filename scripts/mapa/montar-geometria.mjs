/*
 * Monta a geometria do mapa das coudelarias: `public/mapa-directorio.json`.
 *
 * Um ficheiro, um pedido, e três coisas lá dentro:
 *
 *  - `mundo` — a topologia de países a 1:110m, **sem** Portugal nem Espanha.
 *    Serve de contexto: é o planeta em volta, e a esta distância 110m chega.
 *  - `iberia` — Portugal e Espanha a 1:10m. Portugal a 110m tem **33
 *    pontos**: um polígono, não um país. A 10m tem 1254, e a diferença
 *    vê-se — é este mapa que mostra onde estão as coudelarias, e a costa
 *    onde elas assentam tem de ser a costa. Os dois vêm da mesma resolução
 *    de propósito: partilham a fronteira, e por isso não há greta entre um
 *    e outro. É também por isso que saem da topologia de 110m — dois
 *    Portugais sobrepostos, um grosseiro e um fino, davam esporões.
 *  - `rotulos` — nome, centróide e largura em graus de cada país, contados
 *    aqui uma vez. O desenho corria `geoCentroid` e `geoPath.bounds` para os
 *    177 países **em cada quadro**, o que são duas passagens completas por
 *    10 587 pontos a 60 vezes por segundo para escrever meia dúzia de nomes.
 *    Um centróide não muda; é dado, e o sítio do dado é um ficheiro.
 *
 * As coordenadas vão arredondadas: 2 casas no mundo (0,01° ≈ 0,2 px à
 * distância de repouso deste mapa) e 3 na Ibéria (0,001° ≈ 0,06 px no zoom
 * máximo). Guardar mais casas é guardar ruído.
 *
 *   node scripts/mapa/montar-geometria.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";
import { feature } from "topojson-client";
import { geoCentroid, geoBounds } from "d3-geo";

const require = createRequire(import.meta.url);
const atlas = dirname(require.resolve("world-atlas/package.json"));
const destino = join(process.cwd(), "public", "mapa-directorio.json");

const IBERIA = new Set(["Portugal", "Spain"]);

const arredondar = (c, k) =>
  Array.isArray(c[0])
    ? c.map((x) => arredondar(x, k))
    : [Math.round(c[0] * k) / k, Math.round(c[1] * k) / k];

// ── O mundo em volta, a 110m, sem a Ibéria ────────────────────────────────
const t110 = JSON.parse(readFileSync(join(atlas, "countries-110m.json"), "utf8"));
const f110 = feature(t110, t110.objects.countries);

const mundo = {
  ...t110,
  objects: {
    countries: {
      ...t110.objects.countries,
      geometries: t110.objects.countries.geometries.filter((g) => !IBERIA.has(g.properties?.name)),
    },
  },
};

// ── Portugal e Espanha a 10m ──────────────────────────────────────────────
const t10 = JSON.parse(readFileSync(join(atlas, "countries-10m.json"), "utf8"));
const f10 = feature(t10, t10.objects.countries);
const iberia = {
  type: "FeatureCollection",
  features: f10.features
    .filter((f) => IBERIA.has(f.properties.name))
    .map((f) => ({
      type: "Feature",
      properties: { nome: f.properties.name },
      geometry: { type: f.geometry.type, coordinates: arredondar(f.geometry.coordinates, 1000) },
    })),
};

// ── Os nomes, com o centróide e a largura já contados ─────────────────────
const rotulos = f110.features
  .map((f) => {
    const [lon, lat] = geoCentroid(f);
    const [[oeste], [este]] = geoBounds(f);
    if (![lon, lat, oeste, este].every(Number.isFinite)) return null;
    return {
      nome: f.properties.name,
      lon: Math.round(lon * 100) / 100,
      lat: Math.round(lat * 100) / 100,
      // Largura em graus: é dela que sai a estimativa de quantos pixéis o
      // país ocupa, sem projectar a geometria toda outra vez.
      dLon: Math.round((este - oeste) * 10) / 10,
    };
  })
  .filter(Boolean);

const saida = { mundo, iberia, rotulos };
const texto = JSON.stringify(saida);
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, texto);

const pontos = (g) => {
  let n = 0;
  const conta = (c) => (Array.isArray(c[0]) ? c.forEach(conta) : n++);
  conta(g);
  return n;
};
const pt = iberia.features.find((f) => f.properties.nome === "Portugal");
console.log(
  `mapa-directorio.json: ${texto.length}b bruto / ${gzipSync(texto).length}b gz\n` +
    `  mundo: ${mundo.objects.countries.geometries.length} países a 110m\n` +
    `  ibéria: ${iberia.features.length} países a 10m, Portugal com ${pontos(pt.geometry.coordinates)} pontos\n` +
    `  rótulos: ${rotulos.length}`
);
