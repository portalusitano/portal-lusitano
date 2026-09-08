/**
 * A pesquisa do directório e a terra que o cartão escreve.
 *
 * Os casos não são inventados: são as vinte e nove coudelarias verdadeiras,
 * com as moradas tal como estão na base — incluindo as que são um endereço
 * completo com código postal e número de estrada, que eram as que partiam a
 * linha do cartão.
 */

import { describe, it, expect } from "vitest";
import {
  corresponde,
  estreitar,
  terraDe,
  terraRepeteRegiao,
  termosDe,
} from "@/components/directorio/procura";
import { FILTROS_VAZIOS } from "@/lib/directorio-filtros";

/** As moradas verdadeiras que davam problema, e a terra que cada uma esconde. */
const MORADAS: [string, string][] = [
  ["Alter do Chão", "Alter do Chão"],
  ["Torre, Comporta", "Comporta"],
  ["Samora Correia", "Samora Correia"],
  ["Monte Real / Carvide, Leiria", "Leiria"],
  ["Urra, Portalegre", "Portalegre"],
  ["Porto de Muge, Cartaxo, Santarém", "Santarém"],
  ["Monte Mayor, EN 114 Km 145.5, 7050-704 Montemor-o-Novo", "Montemor-o-Novo"],
  ["Quinta da Broa, Azinhaga", "Azinhaga"],
  ["Monte de Vila Formosa, Chança, 7440-201 Alter do Chão", "Alter do Chão"],
  ["Albernoa, 7800-601 Beja", "Beja"],
  ["Casalinho, Alpiarça", "Alpiarça"],
  [
    "Quinta da Portela, Cabeço da Rosa, EN 116, 2615-365 Alverca do Ribatejo",
    "Alverca do Ribatejo",
  ],
  ["Quinta da Lagoalva de Cima, 2090-222 Alpiarça", "Alpiarça"],
  ["Rua do Calvário n.º 1, 3440-126 Couto do Mosteiro", "Couto do Mosteiro"],
  ["Muge, Salvaterra de Magos", "Salvaterra de Magos"],
  ["Ferreira do Alentejo", "Ferreira do Alentejo"],
  ["Vila Verde de Ficalho", "Vila Verde de Ficalho"],
  ["Quinta do Pilar, PT 366, 2050-041 Aveiras de Baixo", "Aveiras de Baixo"],
  ["Herdade da Agolada de Baixo, 2100-047 Coruche", "Coruche"],
  ["N119 km 41.3, 2100 Coruche", "Coruche"],
  ["Almargem do Bispo, Sintra", "Sintra"],
  ["Vendas Novas", "Vendas Novas"],
  ["Vila Viçosa", "Vila Viçosa"],
  ["Azambuja", "Azambuja"],
  ["Santarém", "Santarém"],
  ["Arraiolos", "Arraiolos"],
];

describe("terraDe", () => {
  it.each(MORADAS)("«%s» → «%s»", (morada, terra) => {
    expect(terraDe(morada)).toBe(terra);
  });

  it("devolve vazio para uma morada que não existe", () => {
    expect(terraDe(null)).toBe("");
    expect(terraDe(undefined)).toBe("");
    expect(terraDe("   ")).toBe("");
  });

  it("nunca devolve só um código postal", () => {
    expect(terraDe("Rua Um, 7000-100")).toBe("Rua Um");
    expect(terraDe("Quinta X, EN 4, 2100")).toBe("EN 4");
  });

  it("devolve a morada como veio se não houver componente com letras", () => {
    expect(terraDe("2100-047")).toBe("2100-047");
  });

  /* A promessa que o cartão faz: a terra cabe numa linha estreita. Nenhuma das
     vinte e nove passa dos vinte e um caracteres depois de aparada — a mais
     comprida é «Vila Verde de Ficalho». Antes, a linha tinha até 79
     («Quinta da Portela, Cabeço da Rosa, EN 116, 2615-365 Alverca do
     Ribatejo, Lisboa»), e era por isso que a região se perdia. */
  it("aparadas, as terras verdadeiras cabem todas em 21 caracteres", () => {
    const maior = Math.max(...MORADAS.map(([m]) => terraDe(m).length));
    expect(maior).toBeLessThanOrEqual(21);
  });
});

describe("terraRepeteRegiao", () => {
  it("apanha a terra que é a própria região", () => {
    expect(terraRepeteRegiao("Lisboa", "Lisboa")).toBe(true);
    expect(terraRepeteRegiao("lisboa", "Lisboa")).toBe(true);
  });
  it("deixa passar a terra que só está na região", () => {
    expect(terraRepeteRegiao("Comporta", "Alentejo")).toBe(false);
    expect(terraRepeteRegiao("Ferreira do Alentejo", "Alentejo")).toBe(false);
  });
});

describe("termosDe", () => {
  it("parte por espaços e ignora os que sobram", () => {
    expect(termosDe("  alter   real ")).toEqual(["alter", "real"]);
    expect(termosDe("")).toEqual([]);
    expect(termosDe("   ")).toEqual([]);
  });
});

// ─── A pesquisa ──────────────────────────────────────────────────────────────

const VEIGA = {
  slug: "manuel-veiga",
  nome: "Coudelaria Manuel Veiga",
  localizacao: "Quinta da Broa, Azinhaga",
  regiao: "Ribatejo",
  descricao: "Fundada em 1817 na Quinta da Broa.",
};
const BASTOS = {
  slug: "luis-bastos",
  nome: "Coudelaria Luís Bastos",
  localizacao: "Porto de Muge, Cartaxo, Santarém",
  regiao: "Ribatejo",
  descricao: "Fundada em 2006 com pura linhagem Veiga.",
};
const CEDROS = {
  slug: "quinta-dos-cedros",
  nome: "Coudelaria Quinta dos Cedros",
  localizacao: "Almargem do Bispo, Sintra",
  regiao: "Lisboa",
  descricao: "Centro de alta performance especializado em Dressage.",
};
const AREIA = {
  slug: "cavalos-na-areia",
  nome: "Cavalos na Areia",
  localizacao: "Torre, Comporta",
  regiao: "Alentejo",
  descricao: "Turismo equestre de referência na Comporta desde 2011.",
};
const TODAS = [VEIGA, BASTOS, CEDROS, AREIA];

describe("corresponde — a descrição entra na pesquisa", () => {
  it("acha a linhagem que só a descrição diz", () => {
    // «pura linhagem Veiga» — o nome não tem Veiga nenhum.
    expect(corresponde(BASTOS, "Veiga")).toBe(true);
  });

  it("acha a actividade que só a descrição diz", () => {
    expect(corresponde(CEDROS, "dressage")).toBe(true);
    expect(corresponde(AREIA, "turismo")).toBe(true);
  });

  it("acha o ano que só a descrição diz", () => {
    expect(corresponde(VEIGA, "1817")).toBe(true);
  });

  it("continua sem acentos e sem maiúsculas", () => {
    expect(corresponde(BASTOS, "LUIS")).toBe(true);
    expect(corresponde(BASTOS, "santarem")).toBe(true);
  });

  it("continua a achar por pedaço de palavra", () => {
    expect(corresponde(VEIGA, "veig")).toBe(true);
  });

  it("não inventa correspondências", () => {
    expect(corresponde(VEIGA, "zzzz")).toBe(false);
  });

  it("uma procura vazia deixa passar tudo", () => {
    expect(corresponde(VEIGA, "")).toBe(true);
    expect(corresponde(VEIGA, "   ")).toBe(true);
  });
});

describe("corresponde — dois termos em campos diferentes", () => {
  it("junta o nome com a região", () => {
    // Era 0: «Coudelaria» está no nome e «Ribatejo» na região, e a versão
    // anterior procurava a frase inteira contígua.
    expect(corresponde(VEIGA, "coudelaria ribatejo")).toBe(true);
  });

  it("junta a região com o que a descrição diz", () => {
    expect(corresponde(CEDROS, "lisboa dressage")).toBe(true);
    expect(corresponde(AREIA, "alentejo turismo")).toBe(true);
  });

  it("a ordem dos termos não conta", () => {
    expect(corresponde(CEDROS, "dressage lisboa")).toBe(true);
  });

  it("exige **todos** os termos, não algum", () => {
    expect(corresponde(VEIGA, "coudelaria alentejo")).toBe(false);
    expect(corresponde(CEDROS, "dressage alentejo")).toBe(false);
  });
});

describe("estreitar", () => {
  it("acumula região e texto", () => {
    const r = estreitar(TODAS, { ...FILTROS_VAZIOS, regiao: "Ribatejo", search: "veiga" });
    expect(r.map((c) => c.slug).sort()).toEqual(["luis-bastos", "manuel-veiga"]);
  });

  it("sem filtros devolve tudo, pela mesma ordem", () => {
    expect(estreitar(TODAS, FILTROS_VAZIOS)).toEqual(TODAS);
  });

  it("uma região sem ninguém devolve vazio", () => {
    expect(estreitar(TODAS, { ...FILTROS_VAZIOS, regiao: "Açores" })).toEqual([]);
  });

  it("o texto sozinho atravessa os campos todos", () => {
    expect(estreitar(TODAS, { ...FILTROS_VAZIOS, search: "dressage" }).map((c) => c.slug)).toEqual([
      "quinta-dos-cedros",
    ]);
  });
});
