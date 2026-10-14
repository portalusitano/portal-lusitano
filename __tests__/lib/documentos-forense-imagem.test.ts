/**
 * O que uma imagem carrega além dos pixéis.
 *
 * Metade destes testes é sobre o que o EXIF diz e a outra metade é sobre o que
 * acontece quando o EXIF **mente sobre si mesmo**. Um bloco EXIF é um formato
 * com ponteiros dentro de bytes que vêm de quem envia o documento: pode mandar
 * ler no byte quatro mil milhões, declarar dez mil entradas que não existem, ou
 * apontar para si próprio. Estes bytes chegam ao servidor, e o exame tem de os
 * atravessar sem ler fora do bloco e sem ficar preso.
 */

import { describe, expect, it } from "vitest";

import { reunirForense } from "@/lib/documentos/forense";
import { dataExifParaIso, lerExif } from "@/lib/documentos/forense/exif";
import { lerImagem } from "@/lib/documentos/forense/imagem";

import {
  montarJpeg,
  montarPng,
  montarTiff,
  montarWebp,
  tabelaDeQuantizacao,
} from "./documentos-forense-ficheiros";

const ETIQUETA = {
  make: 0x010f,
  model: 0x0110,
  software: 0x0131,
  dateTime: 0x0132,
  processing: 0x000b,
  dateTimeOriginal: 0x9003,
  largura: 0xa002,
  altura: 0xa003,
  notaDoFabricante: 0x927c,
  gpsLatRef: 0x0001,
  gpsLat: 0x0002,
  gpsLonRef: 0x0003,
  gpsLon: 0x0004,
  gpsAlt: 0x0006,
} as const;

const EXIF_DE_TELEMOVEL = montarTiff({
  ifd0: [
    { etiqueta: ETIQUETA.make, valor: { ascii: "Apple" } },
    { etiqueta: ETIQUETA.model, valor: { ascii: "iPhone 14 Pro" } },
    { etiqueta: ETIQUETA.dateTime, valor: { ascii: "2024:03:12 14:05:22" } },
  ],
  exif: [{ etiqueta: ETIQUETA.dateTimeOriginal, valor: { ascii: "2024:03:12 14:05:22" } }],
});

// ─── EXIF ────────────────────────────────────────────────────────────────────

describe("o EXIF", () => {
  it("lê o aparelho, o programa e as datas", () => {
    const leitura = lerExif(
      montarTiff({
        ifd0: [
          { etiqueta: ETIQUETA.make, valor: { ascii: "Canon" } },
          { etiqueta: ETIQUETA.software, valor: { ascii: "Adobe Photoshop 24.0 (Windows)" } },
          { etiqueta: ETIQUETA.dateTime, valor: { ascii: "2024:03:12 14:05:22" } },
        ],
      })
    );

    const porCampo = new Map(leitura?.campos.map((c) => [c.campo, c]));
    expect(porCampo.get("Make")?.valor).toBe("Canon");
    expect(porCampo.get("Software")?.valor).toBe("Adobe Photoshop 24.0 (Windows)");
    expect(porCampo.get("DateTime")?.iso).toBe("2024-03-12T14:05:22");
  });

  it("uma data do EXIF não ganha um fuso que ela não tem", () => {
    // Acrescentar um `Z` era afirmar que a fotografia foi tirada em Greenwich.
    expect(dataExifParaIso("2024:03:12 14:05:22")).toBe("2024-03-12T14:05:22");
    expect(dataExifParaIso("2024:03:12 14:05:22")).not.toContain("Z");
    expect(dataExifParaIso("ontem")).toBeNull();
    expect(dataExifParaIso("2024:13:45 99:05:22")).toBeNull();
  });

  it("lê as coordenadas com o sinal que a referência manda", () => {
    const leitura = lerExif(
      montarTiff({
        gps: [
          { etiqueta: ETIQUETA.gpsLatRef, valor: { ascii: "N" } },
          {
            etiqueta: ETIQUETA.gpsLat,
            valor: {
              rationals: [
                [38, 1],
                [43, 1],
                [0, 1],
              ],
            },
          },
          { etiqueta: ETIQUETA.gpsLonRef, valor: { ascii: "W" } },
          {
            etiqueta: ETIQUETA.gpsLon,
            valor: {
              rationals: [
                [9, 1],
                [8, 1],
                [0, 1],
              ],
            },
          },
          { etiqueta: ETIQUETA.gpsAlt, valor: { rationals: [[1200, 10]] } },
        ],
      })
    );

    expect(leitura?.coordenadas).toEqual({
      latitude: 38.716667,
      longitude: -9.133333,
      altitude: 120,
    });
  });

  it("um GPS que nunca fixou escreve zeros, e zeros não são um sítio", () => {
    const leitura = lerExif(
      montarTiff({
        gps: [
          { etiqueta: ETIQUETA.gpsLatRef, valor: { ascii: "N" } },
          {
            etiqueta: ETIQUETA.gpsLat,
            valor: {
              rationals: [
                [0, 1],
                [0, 1],
                [0, 1],
              ],
            },
          },
          { etiqueta: ETIQUETA.gpsLonRef, valor: { ascii: "E" } },
          {
            etiqueta: ETIQUETA.gpsLon,
            valor: {
              rationals: [
                [0, 1],
                [0, 1],
                [0, 1],
              ],
            },
          },
        ],
      })
    );
    expect(leitura?.coordenadas).toBeUndefined();
  });

  it("um denominador a zero não vira infinito", () => {
    const leitura = lerExif(
      montarTiff({
        gps: [
          { etiqueta: ETIQUETA.gpsLatRef, valor: { ascii: "N" } },
          {
            etiqueta: ETIQUETA.gpsLat,
            valor: {
              rationals: [
                [38, 0],
                [0, 1],
                [0, 1],
              ],
            },
          },
          { etiqueta: ETIQUETA.gpsLonRef, valor: { ascii: "E" } },
          {
            etiqueta: ETIQUETA.gpsLon,
            valor: {
              rationals: [
                [9, 1],
                [0, 1],
                [0, 1],
              ],
            },
          },
        ],
      })
    );
    expect(leitura?.coordenadas).toBeUndefined();
  });

  it("regista a nota do fabricante sem a abrir", () => {
    const leitura = lerExif(
      montarTiff({ ifd0: [{ etiqueta: ETIQUETA.notaDoFabricante, valor: { long: 1234 } }] })
    );
    expect(leitura?.temNotaDoFabricante).toBe(true);
    expect(leitura?.campos.some((c) => c.campo.includes("Maker"))).toBe(false);
  });
});

describe("o EXIF que mente sobre si mesmo", () => {
  it("um bloco que não é TIFF devolve nada", () => {
    expect(lerExif(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toBeNull();
    expect(lerExif(new Uint8Array(0))).toBeNull();
  });

  it("uma lista que aponta para fora do bloco não faz ler fora dele", () => {
    const bloco = montarTiff({ ifd0: [{ etiqueta: ETIQUETA.make, valor: { ascii: "Canon" } }] });
    // O deslocamento de IFD0 passa a apontar muito para lá do fim.
    new DataView(bloco.buffer).setUint32(4, 0xfffffff0, true);
    expect(() => lerExif(bloco)).not.toThrow();
    expect(lerExif(bloco)).toBeNull();
  });

  it("uma cadeia de listas que aponta para si mesma não fica presa", () => {
    const bloco = montarTiff({
      ifd0: [{ etiqueta: ETIQUETA.make, valor: { ascii: "Canon aaaaaaaaaaaa" } }],
    });
    const vista = new DataView(bloco.buffer);
    // A lista seguinte de IFD0 é o próprio IFD0.
    vista.setUint32(8 + 2 + 12, 8, true);
    expect(lerExif(bloco)?.campos[0].valor).toBe("Canon aaaaaaaaaaaa");
  });

  it("uma entrada que declare mil milhões de valores é ignorada, não alocada", () => {
    const bloco = montarTiff({
      ifd0: [{ etiqueta: ETIQUETA.make, valor: { ascii: "Canon aaaaaaaaaaaa" } }],
    });
    const vista = new DataView(bloco.buffer);
    // A contagem da primeira entrada passa a ser absurda.
    vista.setUint32(8 + 2 + 4, 0xfffffff0, true);
    expect(() => lerExif(bloco)).not.toThrow();
    expect(lerExif(bloco)).toBeNull();
  });

  it("um bloco cortado a meio não rebenta", () => {
    const bloco = montarTiff({ ifd0: [{ etiqueta: ETIQUETA.make, valor: { ascii: "Canon" } }] });
    for (let corte = 1; corte < bloco.length; corte += 1) {
      expect(() => lerExif(bloco.subarray(0, corte))).not.toThrow();
    }
  });
});

// ─── JPEG ────────────────────────────────────────────────────────────────────

describe("a estrutura de um JPEG", () => {
  it("percorre os segmentos e conta o que lá está", () => {
    const bytes = montarJpeg({
      exif: EXIF_DE_TELEMOVEL,
      comentario: "CREATOR: gd-jpeg v1.0",
      tabelas: [tabelaDeQuantizacao(16), tabelaDeQuantizacao(17)],
    });

    const leitura = lerImagem(bytes, "image/jpeg");
    expect(leitura?.jpeg?.tabelasDeQuantizacao).toBe(2);
    expect(leitura?.jpeg?.varrimentos).toBe(1);
    expect(leitura?.jpeg?.progressivo).toBe(false);
    expect(leitura?.medidas).toEqual([1200, 900]);
    expect(leitura?.campos.some((c) => c.valor === "CREATOR: gd-jpeg v1.0")).toBe(true);
    expect(leitura?.exif?.campos.some((c) => c.valor === "iPhone 14 Pro")).toBe(true);
  });

  it("os dados comprimidos com preenchimento e reinícios não desalinham o percurso", () => {
    // Um `FF 00` no meio dos dados é um `FF` a valer, e um `FF D0` é um
    // reinício. Quem os tratasse como marcadores parava aqui.
    const leitura = lerImagem(montarJpeg({}), "image/jpeg");
    expect(leitura?.jpeg?.bytesDepoisDoFim).toBe(0);
  });

  it("conta os bytes que sobram depois do marcador de fim", () => {
    const bytes = montarJpeg({ depoisDoFim: new Uint8Array([1, 2, 3, 4, 5, 6, 7]) });
    expect(lerImagem(bytes, "image/jpeg")?.jpeg?.bytesDepoisDoFim).toBe(7);
  });

  it("reconhece um JPEG progressivo", () => {
    expect(lerImagem(montarJpeg({ progressivo: true }), "image/jpeg")?.jpeg?.progressivo).toBe(
      true
    );
  });

  it("a impressão das tabelas é a mesma para as mesmas tabelas e outra para outras", () => {
    const impressao = (tabelas: Uint8Array[]) => {
      const achados = reunirForense(montarJpeg({ tabelas }), "image/jpeg");
      const jpeg = achados.find((a) => a.tipo === "jpeg_estrutura");
      return jpeg && "impressaoDasTabelas" in jpeg ? jpeg.impressaoDasTabelas : "";
    };

    expect(impressao([tabelaDeQuantizacao(16)])).toBe(impressao([tabelaDeQuantizacao(16)]));
    expect(impressao([tabelaDeQuantizacao(16)])).not.toBe(impressao([tabelaDeQuantizacao(32)]));
  });

  it("um JPEG cortado em qualquer sítio não rebenta", () => {
    const bytes = montarJpeg({ exif: EXIF_DE_TELEMOVEL, comentario: "x" });
    for (let corte = 2; corte < bytes.length; corte += 7) {
      expect(() => lerImagem(bytes.subarray(0, corte), "image/jpeg")).not.toThrow();
    }
  });
});

// ─── PNG e WebP ──────────────────────────────────────────────────────────────

describe("PNG e WebP", () => {
  it("lê os blocos de texto de um PNG e as medidas do IHDR", () => {
    const bytes = montarPng({
      largura: 1024,
      altura: 768,
      texto: [
        ["Software", "GIMP 2.10"],
        ["Comment", "digitalizado na coudelaria"],
        ["Xpto", "campo que não interessa"],
      ],
    });

    const leitura = lerImagem(bytes, "image/png");
    expect(leitura?.medidas).toEqual([1024, 768]);
    const valores = leitura?.campos.map((c) => c.valor) ?? [];
    expect(valores).toContain("GIMP 2.10");
    expect(valores).not.toContain("campo que não interessa");
  });

  it("lê o EXIF de um PNG pelo bloco eXIf", () => {
    const bytes = montarPng({ exif: EXIF_DE_TELEMOVEL });
    expect(lerImagem(bytes, "image/png")?.exif?.campos.some((c) => c.valor === "Apple")).toBe(true);
  });

  it("lê o EXIF de um WebP e as medidas do VP8X", () => {
    const bytes = montarWebp({ largura: 640, altura: 480, exif: EXIF_DE_TELEMOVEL });
    const leitura = lerImagem(bytes, "image/webp");
    expect(leitura?.medidas).toEqual([640, 480]);
    expect(leitura?.exif?.campos.some((c) => c.valor === "iPhone 14 Pro")).toBe(true);
  });

  it("um PNG e um WebP cortados a meio não rebentam", () => {
    for (const [bytes, mime] of [
      [montarPng({ texto: [["Software", "GIMP"]] }), "image/png"],
      [montarWebp({ exif: EXIF_DE_TELEMOVEL }), "image/webp"],
    ] as const) {
      for (let corte = 1; corte < bytes.length; corte += 3) {
        expect(() => lerImagem(bytes.subarray(0, corte), mime)).not.toThrow();
      }
    }
  });
});

// ─── Os achados que saem daqui ───────────────────────────────────────────────

describe("os achados de uma imagem", () => {
  it("as coordenadas saem como dado pessoal, e a explicação di-lo", () => {
    const bytes = montarJpeg({
      exif: montarTiff({
        gps: [
          { etiqueta: ETIQUETA.gpsLatRef, valor: { ascii: "N" } },
          {
            etiqueta: ETIQUETA.gpsLat,
            valor: {
              rationals: [
                [38, 1],
                [43, 1],
                [0, 1],
              ],
            },
          },
          { etiqueta: ETIQUETA.gpsLonRef, valor: { ascii: "W" } },
          {
            etiqueta: ETIQUETA.gpsLon,
            valor: {
              rationals: [
                [9, 1],
                [8, 1],
                [0, 1],
              ],
            },
          },
        ],
      }),
    });

    const achado = reunirForense(bytes, "image/jpeg").find((a) => a.tipo === "imagem_coordenadas");
    expect(achado).toMatchObject({ latitude: 38.716667, longitude: -9.133333 });
    expect(achado?.explicacaoInocente).toContain("dado pessoal");
    expect(achado?.explicacaoInocente).toContain("não é um sinal de falsidade");
  });

  it("uma imagem redimensionada depois de captada aparece pela subtracção", () => {
    const bytes = montarJpeg({
      largura: 1200,
      altura: 900,
      exif: montarTiff({
        exif: [
          { etiqueta: ETIQUETA.largura, valor: { long: 4032 } },
          { etiqueta: ETIQUETA.altura, valor: { long: 3024 } },
        ],
      }),
    });

    const achado = reunirForense(bytes, "image/jpeg").find(
      (a) => a.tipo === "imagem_medidas_diferentes_das_do_exif"
    );
    expect(achado).toMatchObject({ noExif: [4032, 3024], noFicheiro: [1200, 900] });
  });

  it("uma fotografia ao alto não conta como redimensionada", () => {
    // O par compara-se sem ordem: vários programas gravam a largura e a altura
    // já trocadas quando a etiqueta de orientação diz que a imagem roda.
    const bytes = montarJpeg({
      largura: 900,
      altura: 1200,
      exif: montarTiff({
        exif: [
          { etiqueta: ETIQUETA.largura, valor: { long: 1200 } },
          { etiqueta: ETIQUETA.altura, valor: { long: 900 } },
        ],
      }),
    });

    expect(
      reunirForense(bytes, "image/jpeg").some(
        (a) => a.tipo === "imagem_medidas_diferentes_das_do_exif"
      )
    ).toBe(false);
  });

  it("uma imagem sem metadados nenhuns diz que não foi examinada, não que está limpa", () => {
    const bytes = montarJpeg({});
    const achados = reunirForense(bytes, "image/jpeg");
    // Há estrutura de JPEG para relatar, logo o exame aconteceu.
    expect(achados.some((a) => a.tipo === "jpeg_estrutura")).toBe(true);

    const [semNada] = reunirForense(new Uint8Array([1, 2, 3]), "image/png");
    expect(semNada).toMatchObject({ tipo: "nao_examinado", porque: "nao_parece_o_formato" });
    expect(semNada.explicacaoInocente).toContain("Não ter vestígios não é");
  });

  it("as famílias das ferramentas de uma imagem seguem a mesma tabela do PDF", () => {
    const bytes = montarJpeg({
      exif: montarTiff({
        ifd0: [
          { etiqueta: ETIQUETA.software, valor: { ascii: "Adobe Photoshop 24.0" } },
          { etiqueta: ETIQUETA.model, valor: { ascii: "iPhone 14 Pro" } },
        ],
      }),
    });

    const achado = reunirForense(bytes, "image/jpeg").find((a) => a.tipo === "imagem_metadados");
    const familias = new Map(
      achado && "ferramentas" in achado ? achado.ferramentas.map((f) => [f.campo, f.familia]) : []
    );
    expect(familias.get("Software")).toBe("editor_de_imagem");
    expect(familias.get("Model")).toBe("camara_ou_telemovel");
  });
});
