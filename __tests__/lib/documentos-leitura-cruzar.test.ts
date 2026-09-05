/**
 * O documento contra o formulário.
 *
 * O caso que interessa apanhar é um só: o formulário diz um microchip, o
 * passaporte anexado tem outro. Tudo o resto que aqui está serve para que esse
 * aviso continue a valer alguma coisa — isto é, para que não haja avisos onde
 * não há contradição.
 */

import { describe, expect, it } from "vitest";
import { cruzarComFormulario } from "@/lib/documentos/leitura/cruzar";

const MICROCHIP = "620015004471234";
const OUTRO = "985141000123456";

describe("uma contradição verdadeira", () => {
  it("aponta o microchip que não bate certo, com os dois valores lado a lado", () => {
    const conflitos = cruzarComFormulario({ microchip: OUTRO }, { microchip: MICROCHIP });

    expect(conflitos).toEqual([
      { campo: "microchip", noFormulario: MICROCHIP, noDocumento: OUTRO },
    ]);
  });

  it("aponta o UELN de outro cavalo", () => {
    const conflitos = cruzarComFormulario({ ueln: "724015004471234" }, { ueln: "620015004471234" });

    expect(conflitos).toHaveLength(1);
    expect(conflitos[0].campo).toBe("ueln");
  });

  it("aponta mais do que um campo quando mais do que um não bate", () => {
    const conflitos = cruzarComFormulario(
      { microchip: OUTRO, nome: "OUTRO CAVALO" },
      { microchip: MICROCHIP, nome: "Maestoso XV" }
    );

    expect(conflitos.map((c) => c.campo).sort()).toEqual(["microchip", "nome"]);
  });
});

describe("o mesmo valor escrito de outra maneira não é contradição", () => {
  it.each([
    ["separadores no documento", "620 015 004471234", MICROCHIP],
    ["separadores no formulário", MICROCHIP, "620.015.004471234"],
    ["pontos dos dois lados", "620.015.004471234", "620 015 004471234"],
  ])("microchip: %s", (_, noDocumento, noFormulario) => {
    expect(cruzarComFormulario({ microchip: noDocumento }, { microchip: noFormulario })).toEqual(
      []
    );
  });

  it.each([
    ["maiúsculas", "MAESTOSO XV", "Maestoso XV"],
    ["espaços a mais", "MAESTOSO  XV", "Maestoso XV"],
    ["acentos", "ÍNSUA DA BROA", "Insua da Broa"],
    ["um traço pelo meio", "MAESTOSO-XV", "Maestoso XV"],
  ])("nome: %s", (_, noDocumento, noFormulario) => {
    expect(cruzarComFormulario({ nome: noDocumento }, { nome: noFormulario })).toEqual([]);
  });

  it("aceita o nome de registo quando é esse que está no documento", () => {
    // O anúncio traz o nome por que o cavalo é conhecido; o papel traz o nome
    // registado. Bater com qualquer um dos dois é bater.
    const conflitos = cruzarComFormulario(
      { nome: "MAESTOSO XV" },
      { nome: "Maestoso", nomeRegisto: "Maestoso XV" }
    );

    expect(conflitos).toEqual([]);
  });
});

describe("uma ausência não é uma contradição", () => {
  it("o formulário não tem o campo", () => {
    expect(cruzarComFormulario({ microchip: MICROCHIP }, {})).toEqual([]);
  });

  it("o documento não tem o campo", () => {
    expect(cruzarComFormulario({}, { microchip: MICROCHIP })).toEqual([]);
  });

  it("nem um nem outro têm nada", () => {
    expect(cruzarComFormulario({}, {})).toEqual([]);
  });

  it.each([
    ["vazio", ""],
    ["espaços", "   "],
  ])("o campo do formulário está %s", (_, valor) => {
    expect(cruzarComFormulario({ microchip: MICROCHIP }, { microchip: valor })).toEqual([]);
  });

  it("o campo do formulário não é um número nenhum", () => {
    // «--» não é um microchip errado: é a ausência de microchip. O formulário
    // já tem quem lhe aponte isso, e chamar-lhe contradição seria dizer que o
    // documento desmente uma coisa que ninguém afirmou.
    expect(cruzarComFormulario({ microchip: MICROCHIP }, { microchip: "--" })).toEqual([]);
  });
});

describe("o que sai não recusa nada", () => {
  it("um conflito é só um par de valores e o nome do campo", () => {
    const [conflito] = cruzarComFormulario({ microchip: OUTRO }, { microchip: MICROCHIP });

    // Nada aqui diz «recusar», «inválido» ou «falso». A forma do que sai é a
    // garantia de que este módulo não decide nada sobre o anúncio.
    expect(Object.keys(conflito).sort()).toEqual(["campo", "noDocumento", "noFormulario"]);
  });
});
