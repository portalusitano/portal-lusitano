import { describe, it, expect } from "vitest";
import { nomeCurto, sitioCurto } from "@/lib/nomes-globo";

describe("nomeCurto", () => {
  it("tira o «Coudelaria de» da frente", () => {
    expect(nomeCurto("Coudelaria de Alter Real")).toBe("Alter Real");
    expect(nomeCurto("Coudelaria Ortigão Costa")).toBe("Ortigão Costa");
    expect(nomeCurto("Coudelaria da Malhadinha")).toBe("Malhadinha");
    expect(nomeCurto("Coudelaria dos Cedros")).toBe("Cedros");
  });

  it("deixa em paz quem não começa por «Coudelaria»", () => {
    expect(nomeCurto("Morgado Lusitano")).toBe("Morgado Lusitano");
    expect(nomeCurto("Cavalos na Areia")).toBe("Cavalos na Areia");
  });

  it("nunca devolve vazio", () => {
    expect(nomeCurto("Coudelaria")).toBe("Coudelaria");
  });
});

describe("sitioCurto", () => {
  /* As vinte e nove localizações reais da base, tal como lá estão. Se alguma
     destas deixar de dar o concelho certo, a etiqueta volta a mostrar uma
     morada por baixo do nome — que foi o defeito que este código corrige. */
  const reais: [string, string][] = [
    ["Torre, Comporta", "Comporta"],
    ["Samora Correia", "Samora Correia"],
    ["Alter do Chão", "Alter do Chão"],
    ["Monte Real / Carvide, Leiria", "Leiria"],
    ["Urra, Portalegre", "Portalegre"],
    ["Alpiarça", "Alpiarça"],
    ["Porto de Muge, Cartaxo, Santarém", "Santarém"],
    ["Monte Mayor, EN 114 Km 145.5, 7050-704 Montemor-o-Novo", "Montemor-o-Novo"],
    ["Quinta da Broa, Azinhaga", "Azinhaga"],
    ["Azambuja", "Azambuja"],
    ["Vendas Novas", "Vendas Novas"],
    ["Almargem do Bispo, Sintra", "Sintra"],
    ["Monte de Vila Formosa, Chança, 7440-201 Alter do Chão", "Alter do Chão"],
    ["Vila Viçosa", "Vila Viçosa"],
    ["Albernoa, 7800-601 Beja", "Beja"],
    ["Casalinho, Alpiarça", "Alpiarça"],
    ["Arraiolos", "Arraiolos"],
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
    ["Santarém", "Santarém"],
    ["Herdade da Agolada de Baixo, 2100-047 Coruche", "Coruche"],
    ["N119 km 41.3, 2100 Coruche", "Coruche"],
  ];

  it.each(reais)("«%s» → «%s»", (dado, esperado) => {
    expect(sitioCurto(dado)).toBe(esperado);
  });

  it("aguenta o que não encaixa no molde", () => {
    expect(sitioCurto("")).toBe("");
    expect(sitioCurto("   ")).toBe("");
    expect(sitioCurto("Beja,")).toBe("Beja");
    expect(sitioCurto("2100-047")).toBe("2100-047");
  });
});

describe("nomeCurto com um segundo nome atrás do travessão", () => {
  it("fica com a marca, que é o lado que distingue", () => {
    expect(nomeCurto("Quinta Lusitânia - Couto do Mosteiro")).toBe("Quinta Lusitânia");
    expect(nomeCurto("Lusitanos d'Atela - Coudelaria Bessa de Carvalho")).toBe("Lusitanos d'Atela");
  });

  it("quando o primeiro lado é uma sigla, quem identifica é o outro", () => {
    expect(nomeCurto("Coudelaria CL - Companhia das Lezírias")).toBe("Companhia das Lezírias");
    expect(nomeCurto("Coudelaria SA — d'Andrade de Oliveira e Sousa")).toBe(
      "d'Andrade de Oliveira e Sousa"
    );
  });

  it("um hífen dentro de uma palavra não é um travessão", () => {
    expect(nomeCurto("Montemor-o-Novo")).toBe("Montemor-o-Novo");
    expect(nomeCurto("Coudelaria Vila Real-Douro")).toBe("Vila Real-Douro");
  });
});
