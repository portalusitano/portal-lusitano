/* Descarrega o raster de cobertura do solo que dá a COR da janela ibérica.
   A altimetria — que dá a FORMA — vem do `baixar-dem.mjs`, de outra fonte.

   Natural Earth II, «large size land cover», 21600x10800 em WGS84 puro
   (0,0166667° por pixel = 60 pontos por grau), domínio público. É o mesmo
   sistema de coordenadas em que a esfera do globo está texturada, por isso
   não há reprojecção nenhuma: recorta-se a janela e está.

   ── Porquê esta e não uma das outras três ──────────────────────────────────

   Foram medidas as três que a Natural Earth publica a esta resolução. O que
   se mediu foi a variância do laplaciano da janela ibérica em nativo contra a
   mesma janela passada pela resolução do mapa global (63x57) e reposta — ou
   seja, quanta estrutura é que a fonte tem que o `dia.webp` não consegue
   carregar:

     NE2_HR_LC   lap 22,9   via 63x57 1,13   =  20x
     NE1_HR_LC   lap 330,7  via 63x57 1,40   = 237x
     HYP_HR      lap 25,9   via 63x57 1,88   =  14x
     (o `dia.webp` de hoje, na mesma janela: 2,37)

   O NE1 ganhava por catorze vezes, e é o que **não** se usa. A alta frequência
   dele não é geografia, é grão de gravura, e mede-se que é:

     · a autocorrelação do resíduo ao primeiro pixel é nula ou negativa
       (−0,118 no Alentejo, −0,098 no interior do Sara, −0,089 na Amazónia).
       Estrutura geográfica a um pixel de distância é fortemente correlacionada;
       ruído aplicado pixel a pixel não é.
     · a amplitude quase não muda entre sítios geograficamente opostos: 5,05 na
       planície alentejana contra 3,14 no interior do Sara e 3,50 na Amazónia.
       Um mar de areia uniforme não tem o mesmo detalhe que os Pirenéus; papel
       pintado tem.

   O NE2 passa nos dois: autocorrelação positiva (0,11 a 0,43) e amplitude que
   distingue biomas (0,22 na Amazónia contra 1,56 no Sara). É estrutura.

   O HYP é tinta hipsométrica — cor por altitude. A altitude já cá está, a 163
   pontos por grau em vez de 60, e é o `relevo.webp` que a usa. Pintar por cima
   com um segundo mapa da mesma variável era contar a mesma coisa duas vezes,
   numa paleta que não é a de nenhum sítio visto do espaço. */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";

const execFileP = promisify(execFile);
const S =
  "/tmp/claude-0/-home-user-portal-lusitano/1a569864-0d71-5ca8-a39f-0ce2fe065479/scratchpad";
const DIR = `${S}/ne`;
fs.mkdirSync(DIR, { recursive: true });

const URL = "https://naturalearth.s3.amazonaws.com/10m_raster/NE2_HR_LC.zip";
const ZIP = `${DIR}/NE2_HR_LC.zip`;
const TIF = `${DIR}/NE2_HR_LC.tif`;

if (fs.existsSync(TIF) && fs.statSync(TIF).size > 6e8) {
  console.log("já cá está:", TIF);
} else {
  console.log("a descarregar", URL, "(≈125 MB)");
  await execFileP("curl", ["-sS", "-f", "-o", ZIP, "--max-time", "1800", URL], {
    maxBuffer: 1 << 24,
  });
  console.log("a extrair (≈700 MB descomprimido)");
  await execFileP("unzip", ["-o", "-j", ZIP, "NE2_HR_LC.tif", "-d", DIR]);
  fs.unlinkSync(ZIP);
  console.log("pronto:", TIF, (fs.statSync(TIF).size / 1e6).toFixed(0), "MB");
}
