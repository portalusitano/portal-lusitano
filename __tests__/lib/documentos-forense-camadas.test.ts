/**
 * Tinta opaca por cima de texto.
 *
 * Este é o exame que mais pode custar caro se se enganar, e por isso a maior
 * parte dos casos aqui são casos que **não** devem levantar a mão: o fundo de
 * uma tabela pintado antes do texto, a imagem digitalizada de um Livro Azul com
 * a camada de texto invisível do reconhecimento de caracteres por cima, o
 * rectângulo transparente, o rectângulo ao lado do campo em vez de por cima.
 * Cada um destes é um ficheiro honesto e comum, e cada um deles seria um
 * criador acusado de falsificação por um exame mal feito.
 */

import { describe, expect, it } from "vitest";

import { examinarCamadas } from "@/lib/documentos/forense/pdf-camadas";
import { PdfCru, vistaLatin1 } from "@/lib/documentos/forense/pdf-cru";

import { esqueleto, montarPdfComRemate, type ObjectoPdf } from "./documentos-forense-ficheiros";

function examinar(conteudo: string, extras: readonly ObjectoPdf[] = [], recursos = "") {
  const bytes = montarPdfComRemate([...esqueleto(conteudo, recursos), ...extras]);
  return examinarCamadas(new PdfCru(bytes, vistaLatin1(bytes)));
}

/** Um campo escrito a 100,700 — o sítio onde um microchip assentaria. */
const CAMPO = "BT /F1 10 Tf 100 700 Td (Microchip 620015004471234) Tj ET\n";

describe("o rectângulo branco por cima de um campo", () => {
  it("apanha-o quando a tinta vem depois do texto", () => {
    const achado = examinar(`${CAMPO}1 1 1 rg\n90 690 200 20 re\nf\n`);

    expect(achado?.pontosDeTextoCobertos).toBe(1);
    expect(achado?.paginas).toEqual([1]);
    expect(achado?.marcas[0]).toMatchObject({
      especie: "preenchimento",
      cor: "rgb 1 1 1",
      caixa: [90, 690, 290, 710],
    });
  });

  it("não o apanha quando a tinta vem antes — que é um fundo de tabela", () => {
    // A ordem é o que distingue tapar de compor. Um fundo pinta-se primeiro.
    expect(examinar(`1 1 1 rg\n90 690 200 20 re\nf\n${CAMPO}`)).toBeNull();
  });

  it("não o apanha quando o rectângulo está ao lado do campo", () => {
    expect(examinar(`${CAMPO}1 1 1 rg\n300 400 100 20 re\nf\n`)).toBeNull();
  });

  it("não o apanha quando o rectângulo só toca no canto do ponto de texto", () => {
    // Uma célula de tabela e o texto dela partilham o canto com frequência.
    expect(examinar(`${CAMPO}0.9 g\n100 700 50 20 re\nf\n`)).toBeNull();
  });

  it("lê a cor tal como o ficheiro a declara, sem lhe chamar branco", () => {
    const achado = examinar(`${CAMPO}0 0 0 0 k\n90 690 200 20 re\nf\n`);
    expect(achado?.marcas[0].cor).toBe("cmyk 0 0 0 0");
  });

  it("um espaço de cor que não se sabe ler não ganha uma cor inventada", () => {
    const achado = examinar(`${CAMPO}/Sep cs\n1 scn\n90 690 200 20 re\nf\n`);
    expect(achado?.marcas[0].cor).toBeUndefined();
  });
});

describe("os casos em que pintar por cima não é tapar", () => {
  it("um traçado usado só para recortar não é tinta", () => {
    // `W n` define uma zona de recorte; não põe um único pixel na página.
    expect(examinar(`${CAMPO}90 690 200 20 re\nW\nn\n`)).toBeNull();
  });

  it("uma linha desenhada por cima não tapa uma área", () => {
    expect(examinar(`${CAMPO}90 690 200 20 re\nS\n`)).toBeNull();
  });

  it("um rectângulo com opacidade zero não tapa nada", () => {
    const achado = examinar(
      `${CAMPO}/GS0 gs\n1 1 1 rg\n90 690 200 20 re\nf\n`,
      [{ numero: 20, dicionario: "<< /Type /ExtGState /ca 0 >>" }],
      "/ExtGState << /GS0 20 0 R >>"
    );
    expect(achado).toBeNull();
  });

  it("o `Q` devolve a matriz de antes, e uma marca deslocada não fica onde não esteve", () => {
    // Sem o `Q` a tratar da pilha, o `cm` do bloco continuaria a valer e a
    // marca aparecia 500 pontos ao lado do sítio onde foi mesmo pintada.
    const achado = examinar(
      `${CAMPO}q\n1 0 0 1 500 0 cm\n1 1 1 rg\n0 0 10 10 re\nf\nQ\n1 1 1 rg\n90 690 200 20 re\nf\n`
    );
    expect(achado?.marcas).toHaveLength(1);
    expect(achado?.marcas[0].caixa).toEqual([90, 690, 290, 710]);
  });
});

describe("a camada de texto de um digitalizador com reconhecimento de caracteres", () => {
  it("texto invisível tapado por uma imagem não levanta a mão", () => {
    // É a montagem de **todo** o Livro Azul passado num multifunções com OCR: o
    // texto lido vai no modo 3, que não pinta nada, e a digitalização por cima.
    const achado = examinar(
      "BT 3 Tr /F1 10 Tf 100 700 Td (Microchip 620015004471234) Tj ET\n" +
        "q 595 0 0 842 0 0 cm /Im0 Do Q\n",
      [{ numero: 21, dicionario: "<< /Type /XObject /Subtype /Image /Width 8 /Height 8 >>" }],
      "/XObject << /Im0 21 0 R >>"
    );
    expect(achado).toBeNull();
  });

  it("mas uma imagem por cima de texto visível é apanhada", () => {
    const achado = examinar(
      `${CAMPO}q 200 0 0 30 90 690 cm /Im0 Do Q\n`,
      [{ numero: 21, dicionario: "<< /Type /XObject /Subtype /Image /Width 8 /Height 8 >>" }],
      "/XObject << /Im0 21 0 R >>"
    );
    expect(achado?.marcas[0]).toMatchObject({ especie: "imagem", caixa: [90, 690, 290, 720] });
  });

  it("uma imagem embutida no próprio fluxo conta como imagem", () => {
    const achado = examinar(
      `${CAMPO}q 200 0 0 30 90 690 cm\nBI /W 2 /H 2 /CS /G /BPC 8 ID \x00\xff\x00\xff EI\nQ\n`
    );
    expect(achado?.marcas[0].especie).toBe("imagem");
  });
});

describe("o desenho que vem dentro de um formulário", () => {
  it("a ordem mantém-se entre o que está dentro e o que está fora", () => {
    const achado = examinar(
      `${CAMPO}q 1 0 0 1 0 0 cm /Fx0 Do Q\n`,
      [
        {
          numero: 22,
          dicionario:
            "<< /Type /XObject /Subtype /Form /BBox [0 0 595 842] /Matrix [1 0 0 1 0 0] >>",
          stream: "1 1 1 rg\n90 690 200 20 re\nf\n",
        },
      ],
      "/XObject << /Fx0 22 0 R >>"
    );
    expect(achado?.pontosDeTextoCobertos).toBe(1);
  });

  it("a matriz do formulário desloca a marca", () => {
    const achado = examinar(
      `${CAMPO}/Fx0 Do\n`,
      [
        {
          numero: 22,
          dicionario:
            "<< /Type /XObject /Subtype /Form /BBox [0 0 595 842] /Matrix [1 0 0 1 90 690] >>",
          stream: "1 1 1 rg\n0 0 200 20 re\nf\n",
        },
      ],
      "/XObject << /Fx0 22 0 R >>"
    );
    expect(achado?.marcas[0].caixa).toEqual([90, 690, 290, 710]);
  });

  it("um formulário que se desenhe a si mesmo não é um ciclo", () => {
    const achado = examinar(
      `${CAMPO}/Fx0 Do\n`,
      [
        {
          numero: 22,
          dicionario: "<< /Type /XObject /Subtype /Form /BBox [0 0 595 842] >>",
          stream: "/Fx0 Do\n1 1 1 rg\n90 690 200 20 re\nf\n",
        },
      ],
      "/XObject << /Fx0 22 0 R >>"
    );
    expect(achado?.pontosDeTextoCobertos).toBe(1);
  });
});

describe("o texto que o exame conta", () => {
  it("cada linha escrita com `Td` é um ponto de arranque próprio", () => {
    const achado = examinar(
      "BT /F1 10 Tf 100 700 Td (linha um) Tj 0 -20 Td (linha dois) Tj ET\n" +
        "1 1 1 rg\n90 660 200 60 re\nf\n"
    );
    expect(achado?.pontosDeTextoCobertos).toBe(2);
  });

  it("o `T*` desce uma entrelinha, como o `TL` mandou", () => {
    const achado = examinar(
      "BT /F1 10 Tf 20 TL 100 700 Td (linha um) Tj T* (linha dois) Tj ET\n" +
        "1 1 1 rg\n90 675 200 10 re\nf\n"
    );
    expect(achado?.pontosDeTextoCobertos).toBe(1);
  });

  it("uma string com um parêntesis escapado não parte o percurso do fluxo", () => {
    const achado = examinar(
      "BT /F1 10 Tf 100 700 Td (Nome \\(registado\\)) Tj ET\n1 1 1 rg\n90 690 200 20 re\nf\n"
    );
    expect(achado?.pontosDeTextoCobertos).toBe(1);
  });

  it("um fluxo comprimido lê-se como qualquer outro", () => {
    const bytes = montarPdfComRemate([
      { numero: 1, dicionario: "<< /Type /Catalog /Pages 2 0 R >>" },
      { numero: 2, dicionario: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
      {
        numero: 3,
        dicionario:
          "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R " +
          "/Resources << /Font << /F1 5 0 R >> >> >>",
      },
      {
        numero: 4,
        dicionario: "<< >>",
        stream: `${CAMPO}1 1 1 rg\n90 690 200 20 re\nf\n`,
        comprimir: true,
      },
      { numero: 5, dicionario: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" },
    ]);

    const achado = examinarCamadas(new PdfCru(bytes, vistaLatin1(bytes)));
    expect(achado?.pontosDeTextoCobertos).toBe(1);
  });
});

describe("o que o achado diz por palavras", () => {
  it("diz o que mediu e não diz o que quer dizer", () => {
    const achado = examinar(`${CAMPO}1 1 1 rg\n90 690 200 20 re\nf\n`);
    expect(achado?.observacao).toContain("1 ponto de arranque de texto visível ficou");
    expect(achado?.observacao).toContain("1 preenchimento opaco");
    expect(achado?.explicacaoInocente).toContain("Nem toda a tinta por cima de texto");
    // Nada aqui chama falsificação a coisa nenhuma.
    const texto = `${achado?.observacao} ${achado?.explicacaoInocente}`.toLowerCase();
    expect(texto).not.toMatch(/falsific|fraude|adulter|suspeit/);
  });
});
