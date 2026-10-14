/**
 * Gera fotografias «de telemóvel» com EXIF GPS lá dentro, para medir.
 *
 * ── O que isto é, e o que não é ────────────────────────────────────────────
 *
 * **Os pixels são reais**: saem das fotografias que já estão em
 * `public/images/optimized`, que são fotografias de cavalos a sério tiradas
 * para este site. O que é fabricado é a **moldura** — a dimensão de 12 e 48
 * megapixels que um telemóvel de hoje entrega, a orientação de EXIF que faz um
 * retrato sair deitado, e as coordenadas de GPS, que são o motivo pelo qual
 * isto se mede.
 *
 * A distinção importa e o `CLAUDE.md` conta o que custou não a fazer. Um
 * gradiente com ruído tem cobertura perfeita e mente sobre o peso à saída: o
 * ruído fino desaparece ao encolher e o WebP comprime-o a quase nada. Uma
 * fotografia a sério tem pêlo, céu liso e arestas duras, que é o que decide o
 * número. **O que não se pode concluir daqui é como se comprime uma cara** —
 * ninguém aqui tem fotografias de perfil de pessoas verdadeiras, e um retrato
 * tem estatística própria (pele lisa, um plano só de foco). O número medido é
 * um tecto plausível, não a mediana do produto.
 */
import sharp from "sharp";
import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../..");

/** Alter do Chão, a coudelaria de Alter Real. A morada de casa de alguém. */
const GPS = {
  GPSLatitudeRef: "N",
  GPSLatitude: "39/1 12/1 3186/100",
  GPSLongitudeRef: "W",
  GPSLongitude: "7/1 40/1 2622/100",
  GPSAltitudeRef: "0",
  GPSAltitude: "2210/10",
};

const FONTE = path.join(RAIZ, "public/images/optimized/capa-1600w.jpg");

async function escrever(nome, L, A, orientacao) {
  // Amplia-se a fotografia real até à dimensão que o telemóvel entrega. Não
  // acrescenta detalhe — e não é para acrescentar: o que se está a medir é o
  // que a rota faz a um ficheiro grande, não a nitidez do original.
  let cano = sharp(readFileSync(FONTE))
    .resize(L, A, { fit: "cover" })
    .withExif({ IFD0: { Make: "Apple", Model: "iPhone 15 Pro", Software: "17.5.1" }, IFD2: GPS });

  // A orientação não passa pelo `withExif` (o sharp escreve a sua); é o
  // `withMetadata` que a põe, e é ela que faz um retrato sair deitado.
  if (orientacao) cano = cano.withMetadata({ orientation: orientacao });

  const buf = await cano.jpeg({ quality: 92 }).toBuffer();

  writeFileSync(path.join(AQUI, nome), buf);
  const m = await sharp(buf).metadata();
  console.log(
    `${nome}: ${(buf.length / 1048576).toFixed(2)} MiB (${buf.length} bytes), ` +
      `${m.width}x${m.height}, EXIF ${m.exif?.length ?? 0} bytes, orientação ${m.orientation ?? "-"}`
  );
}

// 12 MP, a fotografia principal de um telemóvel de gama alta.
await escrever("telemovel-12mp.jpg", 4032, 3024);
// 48 MP, o modo de máxima resolução que já vem ligado por omissão em muitos.
await escrever("telemovel-48mp.jpg", 8064, 6048);
// Um retrato com a orientação escrita no EXIF: sem `.rotate()` sai deitado.
await escrever("telemovel-rodado.jpg", 3024, 4032, 6);
