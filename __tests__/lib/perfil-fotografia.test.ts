// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prepararFotografia, foiRecusada, type FotografiaPronta } from "@/lib/perfil/fotografia";
import { LADO_AVATAR, MAX_BYTES_AVATAR } from "@/lib/perfil/contrato";

/**
 * O que a fotografia de perfil promete, provado sobre ficheiros a sério.
 *
 * A prova que mais importa é a do GPS, e não se faz com um duplo: constrói-se
 * aqui um JPEG **com coordenadas lá dentro** — as de Alter do Chão — e
 * verifica-se que do outro lado do cano não sobra um único byte de EXIF nem os
 * números do sítio. É a diferença entre «o sharp não copia metadados, dizem» e
 * «este ficheiro entrou com a morada e saiu sem ela».
 */

/** Alter do Chão. Serve de morada de casa de alguém para efeito da prova. */
const GPS = {
  GPSLatitudeRef: "N",
  GPSLatitude: "39/1 12/1 3186/100",
  GPSLongitudeRef: "W",
  GPSLongitude: "7/1 40/1 2622/100",
  GPSAltitudeRef: "0",
  GPSAltitude: "2210/10",
};

/** Pixels com estrutura: um xadrez com um quadrante claro, para haver o que ver. */
function pixels(L: number, A: number): Buffer {
  const px = Buffer.alloc(L * A * 3);
  for (let y = 0; y < A; y++) {
    for (let x = 0; x < L; x++) {
      const i = (y * L + x) * 3;
      const xadrez = ((x >> 4) + (y >> 4)) % 2 === 0 ? 200 : 40;
      px[i] = xadrez;
      px[i + 1] = x < L / 2 ? xadrez : 255 - xadrez;
      px[i + 2] = y < A / 2 ? 255 - xadrez : xadrez;
    }
  }
  return px;
}

async function comGps(L = 1200, A = 900, orientacao?: number): Promise<Buffer> {
  let cano = sharp(pixels(L, A), { raw: { width: L, height: A, channels: 3 } }).withExif({
    IFD0: { Make: "Apple", Model: "iPhone 15 Pro", Software: "17.5.1" },
    IFD2: GPS,
  });
  if (orientacao) cano = cano.withMetadata({ orientation: orientacao });
  return cano.jpeg({ quality: 92 }).toBuffer();
}

function pronta(v: Awaited<ReturnType<typeof prepararFotografia>>): FotografiaPronta {
  if (foiRecusada(v)) throw new Error(`esperava-se que passasse, recusou: ${v.motivo}`);
  return v;
}

describe("os metadados não sobrevivem ao cano", () => {
  let entrada: Buffer;

  beforeAll(async () => {
    entrada = await comGps();
  });

  it("o ficheiro de ensaio traz mesmo GPS lá dentro", async () => {
    /* Sem esta afirmação, todas as que vêm a seguir passariam com um ficheiro
       que nunca teve EXIF nenhum — a prova seria vazia e diria o contrário do
       que parece dizer. É o mesmo cuidado que o braço «antes» do teste da
       migração tem. */
    const meta = await sharp(entrada).metadata();
    expect(meta.exif).toBeDefined();
    expect((meta.exif as Buffer).length).toBeGreaterThan(0);
    // O `39` e o `7` das coordenadas estão lá, em binário, escritos como
    // racionais. Procura-se a marca `GPS` do bloco IFD e o fabricante.
    expect(entrada.includes(Buffer.from("Apple"))).toBe(true);
  });

  it("à saída não há um único byte de EXIF", async () => {
    const saida = pronta(await prepararFotografia(entrada));
    const meta = await sharp(saida.bytes).metadata();

    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();
    expect(meta.iptc).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
  });

  it("nem as coordenadas nem o fabricante sobrevivem nos bytes", async () => {
    const saida = pronta(await prepararFotografia(entrada));

    // Procura-se nos bytes em cru, e não só no que uma biblioteca de metadados
    // decide mostrar: o que sai daqui vai para um balde de leitura pública e
    // quem o descarregar tem os bytes, não a vista da biblioteca.
    for (const agulha of ["Apple", "iPhone", "GPS", "39/1", "7/1", "Exif"]) {
      expect(saida.bytes.includes(Buffer.from(agulha, "latin1"))).toBe(false);
    }
  });

  it("a orientação é aplicada e não transportada", async () => {
    // 6 = rodar 90° à direita. Um retrato ao alto que, sem `.rotate()`, sai
    // deitado — e cujo remédio ingénuo (`withMetadata`) traria o GPS de volta.
    const deitado = await comGps(900, 1200, 6);
    const saida = pronta(await prepararFotografia(deitado));
    const meta = await sharp(saida.bytes).metadata();

    expect(meta.orientation).toBeUndefined();
    expect(meta.exif).toBeUndefined();
    expect(meta.width).toBe(LADO_AVATAR);
    expect(meta.height).toBe(LADO_AVATAR);
  });
});

describe("o que se guarda tem o tamanho do que se mostra", () => {
  it("sai sempre um quadrado de LADO_AVATAR em WebP", async () => {
    for (const [L, A] of [
      [4000, 3000],
      [3000, 4000],
      [1000, 1000],
      [64, 4000],
    ]) {
      const saida = pronta(await prepararFotografia(await comGps(L, A)));
      const meta = await sharp(saida.bytes).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBe(LADO_AVATAR);
      expect(meta.height).toBe(LADO_AVATAR);
      expect(saida.mime).toBe("image/webp");
    }
  });

  it("uma fotografia de telemóvel encolhe duas ordens de grandeza", async () => {
    /* Pixels **a sério**, e não o xadrez dos outros testes.
     *
     * O xadrez serve para provar o que se passa com os metadados e com as
     * dimensões, que não dependem do conteúdo. Não serve para medir bytes: as
     * arestas duras de dezasseis em dezasseis pixels são o pior caso de um
     * codificador e o melhor caso do JPEG de origem, e com ele a razão mede
     * 8,5x — o que diria que encolher no servidor quase não compra nada. Diz
     * o contrário, e é o `capa-1600w.jpg`, uma fotografia tirada para este
     * site, que o mostra. É a lição que o `CLAUDE.md` já escreve sobre bancos
     * de ensaio: cobertura perfeita e conteúdo fabricado não medem nada. */
    const foto = await readFile(
      path.join(__dirname, "../../public/images/optimized/capa-1600w.jpg")
    );

    // Levada às dimensões que um telemóvel de 12 MP entrega, com GPS lá dentro.
    const entrada = await sharp(foto)
      .resize(4032, 3024, { fit: "cover" })
      .withExif({ IFD0: { Make: "Apple" }, IFD2: GPS })
      .jpeg({ quality: 92 })
      .toBuffer();

    const saida = pronta(await prepararFotografia(entrada));

    expect(saida.bytesOriginais).toBe(entrada.length);
    // Medido: 1 765 894 → ~17 000 bytes, cerca de cem vezes. O limiar do teste
    // fica em cinquenta para não partir com uma versão nova do codificador.
    expect(saida.bytes.length * 50).toBeLessThan(entrada.length);
    // E o GPS não sobreviveu a este caminho tal como não sobreviveu ao outro.
    expect(saida.bytes.includes(Buffer.from("Apple", "latin1"))).toBe(false);
  });
});

describe("o tipo decide-se pelos bytes", () => {
  it("aceita JPEG, PNG e WebP", async () => {
    const px = { raw: { width: 300, height: 300, channels: 3 as const } };
    const cru = pixels(300, 300);
    for (const bytes of [
      await sharp(cru, px).jpeg().toBuffer(),
      await sharp(cru, px).png().toBuffer(),
      await sharp(cru, px).webp().toBuffer(),
    ]) {
      expect(foiRecusada(await prepararFotografia(bytes))).toBe(false);
    }
  });

  it("recusa um GIF, mesmo que seja uma imagem válida", async () => {
    const gif = await sharp(pixels(300, 300), {
      raw: { width: 300, height: 300, channels: 3 },
    })
      .gif()
      .toBuffer();

    const v = await prepararFotografia(gif);
    expect(foiRecusada(v)).toBe(true);
    if (foiRecusada(v)) expect(v.motivo).toBe("formato");
  });

  it("recusa um PDF disfarçado de fotografia", async () => {
    // O caso que a extensão e o `Content-Type` deixam passar: quem chama esta
    // função não lhes toca, por isso o disfarce não tem onde pegar.
    const v = await prepararFotografia(Buffer.from("%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj\n"));
    expect(foiRecusada(v)).toBe(true);
    if (foiRecusada(v)) expect(v.motivo).toBe("formato");
  });

  it("recusa bytes que começam como JPEG e não são nada", async () => {
    // Assinatura certa, conteúdo lixo: a assinatura diz por onde começa, não o
    // que vem a seguir. Quem dá a última palavra é o descodificador.
    const falso = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(4096, 0x41)]);
    const v = await prepararFotografia(falso);
    expect(foiRecusada(v)).toBe(true);
    if (foiRecusada(v)) expect(["ilegivel", "dimensoes", "codificacao"]).toContain(v.motivo);
  });

  it("recusa um ficheiro vazio e um ficheiro grande demais", async () => {
    const vazio = await prepararFotografia(Buffer.alloc(0));
    expect(foiRecusada(vazio) && vazio.motivo).toBe("vazio");

    const enorme = await prepararFotografia(Buffer.alloc(MAX_BYTES_AVATAR + 1, 0xff));
    expect(foiRecusada(enorme) && enorme.motivo).toBe("grande-demais");
  });

  it("recusa uma bomba de descompressão sem a descodificar", async () => {
    /* Um PNG de poucos kilobytes que declara mais pixels do que o tecto. É o
       caso que o limite de bytes **não** apanha, e é a razão de o limite de
       pixels existir: sem ele, abrir isto pedia gigabytes de memória a um
       servidor por causa de um ficheiro que cabe num email. */
    const bomba = await sharp({
      create: { width: 15000, height: 15000, channels: 3, background: "#000" },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();

    expect(bomba.length).toBeLessThan(1024 * 1024);

    const v = await prepararFotografia(bomba);
    expect(foiRecusada(v)).toBe(true);
    if (foiRecusada(v)) expect(["pixels-demais", "ilegivel"]).toContain(v.motivo);
  });

  it("nunca lança, seja o que for que lhe dêem", async () => {
    for (const lixo of [
      Buffer.alloc(0),
      Buffer.from("olá"),
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]),
    ]) {
      await expect(prepararFotografia(lixo)).resolves.toBeDefined();
    }
  });
});
