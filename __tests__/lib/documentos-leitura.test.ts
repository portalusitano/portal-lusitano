/**
 * De um ficheiro a um conflito, sem paragens.
 *
 * É este o percurso que o site vai fazer quando alguém anexar um passaporte:
 * os bytes entram, e do outro lado sai o que se leu e o que não bate certo com
 * o que o vendedor escreveu.
 */

import { describe, expect, it } from "vitest";
import { LEITURA_VAZIA, lerDocumento, lerECruzar } from "@/lib/documentos/leitura";
import { pdfComFonteComposta, pdfComTexto } from "./documentos-leitura-pdfs";

const MICROCHIP = "620015004471234";
const OUTRO_MICROCHIP = "985141000123456";

/** Um passaporte equino como um multifunções o entrega: PDF com camada de texto. */
function passaporte(microchip: string, nome = "MAESTOSO XV"): Uint8Array {
  return pdfComTexto(
    [
      "PASSAPORTE EQUINO - REPUBLICA PORTUGUESA",
      "Livro Genealogico do Cavalo Puro Sangue Lusitano",
      `Nome do animal: ${nome}`,
      `Transponder: ${microchip}`,
      "Data de nascimento: 12 03 2018",
    ],
    { comprimir: true }
  );
}

describe("o caso que interessa apanhar", () => {
  it("o passaporte tem um microchip e o formulário tem outro", () => {
    const { leitura, conflitos } = lerECruzar(passaporte(OUTRO_MICROCHIP), "application/pdf", {
      microchip: MICROCHIP,
      nome: "Maestoso XV",
    });

    expect(leitura.origem).toBe("pdf");
    expect(leitura.microchip).toBe(OUTRO_MICROCHIP);
    expect(conflitos).toEqual([
      { campo: "microchip", noFormulario: MICROCHIP, noDocumento: OUTRO_MICROCHIP },
    ]);
  });

  it("o mesmo microchip escrito de outra maneira não levanta nada", () => {
    const { leitura, conflitos } = lerECruzar(passaporte("620 015 004471234"), "application/pdf", {
      microchip: MICROCHIP,
      nome: "Maestoso XV",
    });

    expect(leitura.microchip).toBe(MICROCHIP);
    expect(conflitos).toEqual([]);
  });

  it("guarda o texto para quem revê poder procurar sem abrir o PDF", () => {
    const { leitura } = lerECruzar(passaporte(MICROCHIP), "application/pdf", {});

    expect(leitura.texto).toContain("PASSAPORTE EQUINO");
    expect(leitura.texto).toContain(MICROCHIP);
  });
});

describe("o que não se leu não contradiz nada", () => {
  it("uma imagem não é lida — e não há OCR nenhum a fingir que é", () => {
    // A decisão está escrita no `index.ts`: uma fotografia de telemóvel a um
    // passaporte pousado numa mesa dá texto mau, e texto mau produz
    // contradições falsas.
    for (const mime of ["image/jpeg", "image/png", "image/webp"] as const) {
      expect(lerDocumento(new Uint8Array([0xff, 0xd8, 0xff]), mime)).toEqual(LEITURA_VAZIA);
    }
  });

  it("um PDF de onde não se tirou texto não produz conflitos", () => {
    const semToUnicode = pdfComFonteComposta([`Transponder: ${OUTRO_MICROCHIP}`], {
      comToUnicode: false,
    });

    const { leitura, conflitos } = lerECruzar(semToUnicode, "application/pdf", {
      microchip: MICROCHIP,
    });

    // O número **está** lá dentro do ficheiro, e é outro. Mas não se conseguiu
    // lê-lo com honestidade, e por isso não se acusa ninguém: o documento vai
    // para a fila como qualquer outro e uma pessoa olha para ele.
    expect(leitura).toEqual(LEITURA_VAZIA);
    expect(conflitos).toEqual([]);
  });

  it("lixo à entrada não estoira nem inventa", () => {
    for (const bytes of [
      new Uint8Array(0),
      new Uint8Array([1, 2, 3, 4, 5]),
      new Uint8Array(Buffer.from("%PDF-1.4 e mais nada")),
    ]) {
      const { leitura, conflitos } = lerECruzar(bytes, "application/pdf", {
        microchip: MICROCHIP,
        nome: "Maestoso XV",
      });
      expect(leitura).toEqual(LEITURA_VAZIA);
      expect(conflitos).toEqual([]);
    }
  });

  it("um formulário sem dados nenhuns não produz conflitos", () => {
    const { conflitos } = lerECruzar(passaporte(OUTRO_MICROCHIP), "application/pdf", {});
    expect(conflitos).toEqual([]);
  });
});

describe("um documento com o microchip e o UELN, que são os dois quinze algarismos", () => {
  const livroAzul = pdfComTexto([
    "LIVRO GENEALOGICO DO PURO SANGUE LUSITANO",
    "Nome do animal: MAESTOSO XV",
    "UELN: 620 015 004471234",
    "Microchip: 985 141 000123456",
  ]);

  it("põe cada número no seu campo", () => {
    const { leitura } = lerECruzar(livroAzul, "application/pdf", {});

    expect(leitura.ueln).toBe(MICROCHIP);
    expect(leitura.microchip).toBe(OUTRO_MICROCHIP);
  });

  it("não levanta conflito quando o formulário tem os dois certos", () => {
    const { conflitos } = lerECruzar(livroAzul, "application/pdf", {
      ueln: "620015004471234",
      microchip: "985141000123456",
      nome: "Maestoso XV",
    });

    expect(conflitos).toEqual([]);
  });

  it("levanta conflito quando o vendedor troca os dois de sítio", () => {
    const { conflitos } = lerECruzar(livroAzul, "application/pdf", {
      ueln: "985141000123456",
      microchip: "620015004471234",
    });

    expect(conflitos.map((c) => c.campo).sort()).toEqual(["microchip", "ueln"]);
  });
});
