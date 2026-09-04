import { describe, expect, it } from "vitest";

import { contradicoesEntreDocumentos } from "@/lib/documentos/coerencia/documentos";
import type { DocumentoParaCoerencia } from "@/lib/documentos/coerencia/achados";

/**
 * Os documentos de uma submissão, uns contra os outros.
 *
 * O `cruzar.ts` já confronta cada documento com o formulário. O que falta — e é
 * o que aqui se prova — é que **basta o formulário estar de acordo com um
 * deles** para o outro passar sem nota nenhuma: se o passaporte diz um
 * microchip e o Livro Azul diz outro, nenhum dos dois cruzamentos com o
 * formulário levanta a mão.
 */

function doc(p: Partial<DocumentoParaCoerencia> & { id: string }): DocumentoParaCoerencia {
  return {
    referencia: "ref-1",
    tipo: "livro_azul",
    estado: "por_verificar",
    leitura: null,
    ...p,
  };
}

describe("o microchip do passaporte contra o do Livro Azul", () => {
  it("dispara, e é impossível", () => {
    const achados = contradicoesEntreDocumentos([
      doc({ id: "d1", tipo: "livro_azul", leitura: { microchip: "620015004471234" } }),
      doc({ id: "d2", tipo: "passaporte", leitura: { microchip: "620015004471235" } }),
    ]);
    expect(achados).toHaveLength(1);
    expect(achados[0]).toMatchObject({
      tipo: "contradicao_entre_documentos",
      natureza: "impossivel",
      campo: "microchip",
      referencia: "ref-1",
    });
    expect(achados[0].leituras.map((l) => l.documentoId)).toEqual(["d1", "d2"]);
  });

  it("não dispara sobre o mesmo número escrito de outra maneira", () => {
    expect(
      contradicoesEntreDocumentos([
        doc({ id: "d1", leitura: { microchip: "620 015 004471234" } }),
        doc({ id: "d2", tipo: "passaporte", leitura: { microchip: "620015004471234" } }),
      ])
    ).toEqual([]);
  });

  it("não dispara quando só um dos documentos trouxe o campo", () => {
    // O caso normal: uma fotografia de telemóvel a um passaporte pousado numa
    // mesa não dá campo nenhum, e isso não é um erro.
    expect(
      contradicoesEntreDocumentos([
        doc({ id: "d1", leitura: { microchip: "620015004471234" } }),
        doc({ id: "d2", tipo: "passaporte", leitura: {} }),
        doc({ id: "d3", tipo: "exame_vet", leitura: null }),
      ])
    ).toEqual([]);
  });

  it("não junta documentos de submissões diferentes", () => {
    expect(
      contradicoesEntreDocumentos([
        doc({ id: "d1", referencia: "ref-1", leitura: { microchip: "620015004471234" } }),
        doc({ id: "d2", referencia: "ref-2", leitura: { microchip: "620015004471235" } }),
      ])
    ).toEqual([]);
  });

  it("não dispara sobre um valor que não normaliza para nada", () => {
    expect(
      contradicoesEntreDocumentos([
        doc({ id: "d1", leitura: { microchip: "620015004471234" } }),
        doc({ id: "d2", tipo: "passaporte", leitura: { microchip: "--" } }),
      ])
    ).toEqual([]);
  });
});

describe("os outros campos", () => {
  it("o UELN compara-se sem os separadores com que vem impresso", () => {
    expect(
      contradicoesEntreDocumentos([
        doc({ id: "d1", leitura: { ueln: "620 015 004471234" } }),
        doc({ id: "d2", tipo: "passaporte", leitura: { ueln: "620-015-004471234" } }),
      ])
    ).toEqual([]);
    const achados = contradicoesEntreDocumentos([
      doc({ id: "d1", leitura: { ueln: "620 015 004471234" } }),
      doc({ id: "d2", tipo: "passaporte", leitura: { ueln: "620 015 004471299" } }),
    ]);
    expect(achados.map((a) => a.campo)).toEqual(["ueln"]);
  });

  it("o nome fica em improvável: sai de texto reconstruído a partir de posições num PDF", () => {
    const achados = contradicoesEntreDocumentos([
      doc({ id: "d1", leitura: { nome: "Maestoso XV" } }),
      doc({ id: "d2", tipo: "passaporte", leitura: { nome: "Novilheiro" } }),
    ]);
    expect(achados.map((a) => [a.campo, a.natureza])).toEqual([["nome", "improvavel"]]);
  });

  it("dá cada campo uma vez, pela ordem de leitura", () => {
    const linhas = [
      doc({
        id: "d1",
        leitura: { microchip: "620015004471234", ueln: "620015004471234", nome: "Duque" },
      }),
      doc({
        id: "d2",
        tipo: "passaporte",
        leitura: { microchip: "620015004471299", ueln: "620015004471299", nome: "Zimbro" },
      }),
    ];
    const direita = contradicoesEntreDocumentos(linhas);
    expect(direita.map((a) => a.campo)).toEqual(["microchip", "ueln", "nome"]);
    expect(contradicoesEntreDocumentos([...linhas].reverse())).toEqual(direita);
  });
});
