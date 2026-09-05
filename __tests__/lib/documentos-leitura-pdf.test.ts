/**
 * O que se consegue tirar de dentro de um PDF, e o que se recusa tirar.
 *
 * A metade que interessa mais é a segunda. Um leitor de PDF que devolva texto
 * mau é pior do que um que não devolva nada, porque texto mau produz
 * contradições falsas — e uma contradição falsa manda para a fila de revisão
 * um anúncio verdadeiro.
 */

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extrairTextoDePdf } from "@/lib/documentos/leitura/texto-pdf";
import {
  montarPdf,
  pdfComFonteComposta,
  pdfComObjectosComprimidos,
  pdfComTexto,
} from "./documentos-leitura-pdfs";

const EBOOK = "public/downloads/introducao-lusitano.pdf";

describe("um PDF com camada de texto", () => {
  it("lê as linhas de uma fonte simples", () => {
    const pdf = pdfComTexto([
      "LIVRO GENEALOGICO DO PURO SANGUE LUSITANO",
      "Nome do animal: MAESTOSO XV",
      "Microchip: 620015004471234",
    ]);

    const lido = extrairTextoDePdf(pdf);

    expect(lido.origem).toBe("pdf");
    expect(lido.texto).toContain("MAESTOSO XV");
    expect(lido.texto).toContain("620015004471234");
  });

  it("lê o mesmo quando o stream vem comprimido", () => {
    const linhas = ["Microchip: 620015004471234", "Nome do animal: MAESTOSO XV"];

    const cru = extrairTextoDePdf(pdfComTexto(linhas));
    const comprimido = extrairTextoDePdf(pdfComTexto(linhas, { comprimir: true }));

    expect(comprimido.origem).toBe("pdf");
    expect(comprimido.texto).toBe(cru.texto);
  });

  it("mantém as linhas separadas", () => {
    const lido = extrairTextoDePdf(
      pdfComTexto(["Microchip: 620015004471234", "Registo: 12345/PSL"])
    );

    // Sem isto, o número de uma linha colava-se ao da seguinte e nenhum dos
    // dois voltava a ter quinze algarismos.
    expect(lido.texto.split("\n").length).toBeGreaterThanOrEqual(2);
    expect(lido.texto).toMatch(/620015004471234\s/);
  });

  it("não parte um número que vem em pedaços dentro de um TJ", () => {
    // Um `TJ` é uma lista de pedaços com deslocamentos pelo meio. Os pequenos
    // são kerning e não separam nada; os grandes são espaços. Confundir os dois
    // parte `620015004471234` em três números que já não são um microchip.
    const pdf = montarPdf([
      { numero: 1, dicionario: "<< /Type /Catalog /Pages 2 0 R >>" },
      { numero: 2, dicionario: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
      {
        numero: 3,
        dicionario:
          "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
          "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
      },
      {
        numero: 4,
        dicionario: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      },
      {
        numero: 5,
        dicionario: "<< >>",
        stream:
          "BT\n/F1 12 Tf\n50 700 Td\n[(Microchip: ) -20 (620) -18 (015) -22 (004471234)] TJ\nET\n",
      },
    ]);

    expect(extrairTextoDePdf(pdf).texto).toContain("620015004471234");
  });

  it("lê uma fonte composta de dois bytes com ToUnicode", () => {
    const lido = extrairTextoDePdf(
      pdfComFonteComposta(["Microchip: 620015004471234", "Nome do animal: MAESTOSO XV"])
    );

    expect(lido.origem).toBe("pdf");
    expect(lido.texto).toContain("620015004471234");
    expect(lido.texto).toContain("MAESTOSO XV");
  });

  it("abre as páginas que vivem dentro de um ObjStm", () => {
    const lido = extrairTextoDePdf(pdfComObjectosComprimidos(["Microchip: 620015004471234"]));

    expect(lido.origem).toBe("pdf");
    expect(lido.texto).toContain("620015004471234");
  });
});

describe("um PDF de onde não se tira nada", () => {
  it("recusa uma fonte de dois bytes sem ToUnicode em vez de inventar", () => {
    // Este é o caso que dá o resultado perigoso se não for travado: os códigos
    // são índices de glifo, e lê-los como se fossem caracteres dá uma cadeia
    // de sinais que ainda por cima tem algarismos lá dentro.
    const lido = extrairTextoDePdf(
      pdfComFonteComposta(["Microchip: 620015004471234"], { comToUnicode: false })
    );

    expect(lido.origem).toBe("nenhuma");
    expect(lido.texto).toBe("");
  });

  it("recusa um documento cifrado", () => {
    const pdf = montarPdf([
      { numero: 1, dicionario: "<< /Type /Catalog /Pages 2 0 R /Encrypt 9 0 R >>" },
      { numero: 2, dicionario: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
      { numero: 3, dicionario: "<< /Type /Page /Parent 2 0 R /Contents 5 0 R >>" },
      { numero: 5, dicionario: "<< >>", stream: "BT (620015004471234) Tj ET" },
    ]);

    expect(extrairTextoDePdf(pdf).origem).toBe("nenhuma");
  });

  it("devolve nada para uma página sem texto nenhum", () => {
    const pdf = montarPdf([
      { numero: 1, dicionario: "<< /Type /Catalog /Pages 2 0 R >>" },
      { numero: 2, dicionario: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
      {
        numero: 3,
        dicionario: "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R >>",
      },
      // Uma página que só desenha um rectângulo: é o que uma digitalização
      // sem reconhecimento de texto parece por dentro.
      { numero: 5, dicionario: "<< >>", stream: "0 0 595 842 re f\n" },
    ]);

    expect(extrairTextoDePdf(pdf)).toEqual({ texto: "", origem: "nenhuma" });
  });

  it("recusa um filtro que não sabe desfazer", () => {
    const pdf = montarPdf([
      { numero: 1, dicionario: "<< /Type /Catalog /Pages 2 0 R >>" },
      { numero: 2, dicionario: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
      { numero: 3, dicionario: "<< /Type /Page /Parent 2 0 R /Contents 5 0 R >>" },
      { numero: 5, dicionario: "<< /Filter /LZWDecode >>", stream: "BT (12345) Tj ET" },
    ]);

    expect(extrairTextoDePdf(pdf).origem).toBe("nenhuma");
  });
});

describe("lixo à entrada", () => {
  it.each([
    ["nada", new Uint8Array(0)],
    ["bytes ao acaso", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff])],
    ["texto que não é um PDF", new Uint8Array(Buffer.from("Microchip: 620015004471234"))],
    ["só o cabeçalho", new Uint8Array(Buffer.from("%PDF-1.4\n%%EOF\n"))],
  ])("devolve nada para %s", (_, bytes) => {
    expect(extrairTextoDePdf(bytes)).toEqual({ texto: "", origem: "nenhuma" });
  });

  it("não estoira com um PDF cortado a meio", () => {
    const inteiro = pdfComTexto(["Microchip: 620015004471234"], { comprimir: true });
    const cortado = inteiro.subarray(0, Math.floor(inteiro.length * 0.6));

    // O que não pode acontecer é uma excepção a subir até quem guarda o
    // documento: um ficheiro estragado não impede o documento de ser guardado
    // e de ir para a fila de revisão.
    expect(() => extrairTextoDePdf(cortado)).not.toThrow();
  });

  it("não estoira com um ObjStm que mente nos seus próprios números", () => {
    const pdf = montarPdf([
      {
        numero: 8,
        dicionario: "<< /Type /ObjStm /N 999999 /First 4 >>",
        stream: "1 0 << >>",
        comprimir: true,
      },
    ]);

    expect(() => extrairTextoDePdf(pdf)).not.toThrow();
    expect(extrairTextoDePdf(pdf).origem).toBe("nenhuma");
  });
});

/**
 * O único PDF a sério que este repositório tem: produzido pelo motor do
 * Chrome, com fontes `Identity-H`, `ToUnicode`, formulários desenhados com
 * `Do` e um glifo por operação de posicionamento.
 *
 * Está guardado, e por isso o teste corre. Se um dia sair do repositório, o
 * teste desaparece com ele em vez de falhar — o ficheiro é um download
 * público e não uma amostra desta funcionalidade.
 */
describe.skipIf(!existsSync(EBOOK))("um PDF produzido por um programa a sério", () => {
  it("lê o texto e junta as palavras onde elas estão juntas", () => {
    const lido = extrairTextoDePdf(new Uint8Array(readFileSync(EBOOK)));

    expect(lido.origem).toBe("pdf");
    expect(lido.texto).toContain("Cavalo Lusitano");
    expect(lido.texto).toContain("raças equinas mais antigas");
  });
});
