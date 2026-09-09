/**
 * Qual é o lado do quadrado, e porquê esse.
 *
 * Mede-se antes de escolher: o que se quer saber é onde a curva do peso deixa
 * de pagar pixels e a partir de onde é que os pixels deixam de ser vistos.
 */
import sharp from "sharp";
import { readFileSync } from "node:fs";
import path from "node:path";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const original = readFileSync(path.join(AQUI, "telemovel-12mp.jpg"));

console.log("lado  qualidade  bytes   vs 4 MiB");
for (const lado of [64, 96, 128, 160, 192, 256, 320, 384, 512]) {
  for (const q of [80]) {
    const b = await sharp(original)
      .rotate()
      .resize(lado, lado, { fit: "cover", position: "attention" })
      .webp({ quality: q })
      .toBuffer();
    console.log(
      String(lado).padStart(4),
      String(q).padStart(9),
      String(b.length).padStart(7),
      (original.length / b.length).toFixed(0) + "x"
    );
  }
}

console.log("\nqualidade a 256:");
for (const q of [60, 70, 75, 80, 85, 90]) {
  const b = await sharp(original)
    .rotate()
    .resize(256, 256, { fit: "cover", position: "attention" })
    .webp({ quality: q })
    .toBuffer();
  console.log("  q" + q, b.length, "bytes");
}
