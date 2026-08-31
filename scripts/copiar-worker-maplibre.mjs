/*
 * Põe o worker do MapLibre em `public/`.
 *
 * O MapLibre monta o URL do worker com `new URL("./maplibre-gl-worker.mjs",
 * import.meta.url)`. Empacotado pelo Turbopack, esse caminho aponta para o
 * lado do chunk — onde o ficheiro não existe. O pedido dá 404, o worker
 * nunca arranca, e como é ele que decifra os tiles, o mapa fica um
 * rectângulo preto sem um único erro visível na consola.
 *
 * A saída é servida de `/maplibre-gl-worker.mjs` e o componente aponta-lhe
 * o `setWorkerUrl`. Corre antes de cada build, para não ficar a divergir da
 * versão instalada.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("maplibre-gl/package.json")) + "/dist";
const destino = join(process.cwd(), "public");

mkdirSync(destino, { recursive: true });
for (const ficheiro of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(dist, ficheiro), join(destino, ficheiro));
  console.log("copiado", ficheiro);
}
