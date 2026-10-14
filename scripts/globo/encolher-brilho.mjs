/**
 * A máscara de mar do globo, ao tamanho de que precisa.
 *
 * O `brilho.webp` vinha a 2048×1024 como as outras texturas do planeta, mas
 * não é como as outras: as outras são **imagem** — a cor do dia, as luzes das
 * cidades — e esta é uma **máscara**. O shader lê-lhe um canal só, o `.r`, e
 * usa-o para uma coisa apenas:
 *
 *     float esp = pow(max(dot(n, meio), 0.0), 34.0) * mar * dia;
 *
 * Um lóbulo especular com expoente 34, ou seja largo e suave, e só onde o Sol
 * bate de raspão. Uma máscara que multiplica um lóbulo desses não precisa da
 * resolução de uma fotografia — precisa de saber onde acaba a terra, com uma
 * margem de erro da ordem do próprio lóbulo.
 *
 * O que custava: 2048×1024 em RGBA são **8 MiB de memória de vídeo** para
 * carregar um canal. A metade da resolução são 2 MiB, e o ficheiro cai de
 * 98,6 KiB para cerca de 51 KiB.
 *
 * Medido antes de decidir, comparando a versão reduzida contra a original
 * depois de voltar a subir ao tamanho antigo:
 *
 *   1024×512   erro médio 3,44/255, >16 em 5,25% dos texéis, VRAM 2,00 MiB
 *   512×256    erro médio 5,34/255, >16 em 8,19%,            VRAM 0,50 MiB
 *   256×128    erro médio 8,55/255, >16 em 12,45%,           VRAM 0,13 MiB
 *
 * O erro concentra-se todo na linha de costa, que é onde um degrau existe
 * para existir. Fica em **1024×512**: é o degrau onde a poupança é grande
 * (4×) e o erro ainda é uma fracção de um nível de cinzento em média. Os
 * degraus mais agressivos poupam mais memória do que este globo precisa e
 * começam a amolecer a costa de Portugal, que é justamente a parte do mapa
 * que se vê de perto.
 *
 * Corre-se à mão quando a máscara mudar:  node scripts/globo/encolher-brilho.mjs
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";

const ORIGEM = "public/globo/brilho.webp";
const LARGURA = 1024;
const ALTURA = 512;

const antes = readFileSync(ORIGEM);
const meta = await sharp(antes).metadata();
if (meta.width === LARGURA) {
  console.log(`já está a ${LARGURA}×${ALTURA} — nada a fazer.`);
  process.exit(0);
}

const depois = await sharp(antes)
  .resize(LARGURA, ALTURA, { kernel: "lanczos3" })
  .webp({ quality: 90 })
  .toBuffer();

writeFileSync(ORIGEM, depois);
console.log(
  `${meta.width}×${meta.height} → ${LARGURA}×${ALTURA};  ` +
    `${(antes.length / 1024).toFixed(1)} KiB → ${(depois.length / 1024).toFixed(1)} KiB;  ` +
    `VRAM ${((meta.width * meta.height * 4) / 1048576).toFixed(1)} MiB → ${((LARGURA * ALTURA * 4) / 1048576).toFixed(1)} MiB`
);
