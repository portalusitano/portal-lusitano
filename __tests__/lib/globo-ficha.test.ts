import { describe, expect, it } from "vitest";

import {
  factosDaFicha,
  localidadeRepetida,
  resumoDaFicha,
  segundaLinha,
} from "@/lib/globo/ficha";

describe("localidadeRepetida — a segunda linha vale a linha que ocupa?", () => {
  it("não vale quando o nome já diz a terra", () => {
    expect(localidadeRepetida("Coudelaria do Cartaxo", "Cartaxo")).toBe(true);
    expect(localidadeRepetida("Coudelaria de Vila Viçosa", "2160-000 Vila Viçosa")).toBe(true);
    // Sem acentos e sem maiúsculas: é a mesma palavra.
    expect(localidadeRepetida("Herdade da Golega", "Golegã")).toBe(true);
  });

  it("vale quando o nome não a diz", () => {
    expect(localidadeRepetida("Casa Cadaval", "Muge, Salvaterra de Magos")).toBe(false);
    expect(localidadeRepetida("Herdade do Pinheiro", "Alcácer do Sal")).toBe(false);
  });

  it("compara palavras inteiras — «Beja» dentro de «Bejarano» não conta", () => {
    expect(localidadeRepetida("Coudelaria Bejarano", "Beja")).toBe(false);
  });

  it("sem localidade não há segunda linha para escrever", () => {
    expect(localidadeRepetida("Coudelaria X", "")).toBe(true);
    expect(segundaLinha("Coudelaria X", "")).toBe("");
  });

  it("a segunda linha é a terra encurtada quando fica", () => {
    expect(segundaLinha("Casa Cadaval", "Rua Grande n.º 4, 2135-318 Muge")).toBe("Muge");
  });
});

describe("factosDaFicha — nada se inventa", () => {
  it("sem cavalos não escreve um número nem um traço", () => {
    const f = factosDaFicha({ nome: "Casa Cadaval", localizacao: "Muge", regiao: "Ribatejo" });
    expect(f).toEqual(["Ribatejo"]);
    expect(f.join(" ")).not.toMatch(/[—-]|n\/d|cavalo/);
  });

  it("com cavalos, o número vem primeiro e no singular quando é um", () => {
    expect(
      factosDaFicha({ nome: "Casa Cadaval", localizacao: "Muge", regiao: "Ribatejo", num_cavalos: 42 })[0]
    ).toBe("42 cavalos");
    expect(
      factosDaFicha({ nome: "X", localizacao: "Muge", regiao: "Ribatejo", num_cavalos: 1 })[0]
    ).toBe("1 cavalo");
  });

  it("zero e valores absurdos não são um facto", () => {
    for (const n of [0, -3, Number.NaN]) {
      expect(
        factosDaFicha({ nome: "X", localizacao: "Muge", regiao: "Ribatejo", num_cavalos: n })
      ).toEqual(["Ribatejo"]);
    }
  });

  it("não repete a terra que a linha de cima já escreveu", () => {
    /* «Casa Cadaval / Muge» — a etiqueta escreve Muge na segunda linha, logo a
       ficha não o volta a dizer: fica só a região. As duas peças estão uma por
       cima da outra e dizer o mesmo duas vezes a dois tamanhos não é hierarquia,
       é ruído. */
    expect(factosDaFicha({ nome: "Casa Cadaval", localizacao: "Muge", regiao: "Ribatejo" })).toEqual(
      ["Ribatejo"]
    );
    /* «Coudelaria do Cartaxo» — o nome já diz Cartaxo, e por isso a etiqueta
       não escreve segunda linha nenhuma. Aqui a terra faz falta, e entra. */
    expect(
      factosDaFicha({ nome: "Coudelaria do Cartaxo", localizacao: "Cartaxo", regiao: "Ribatejo" })
    ).toEqual(["Cartaxo", "Ribatejo"]);
  });

  it("não escreve «Alentejo · Alentejo»", () => {
    /* A etiqueta já escreveu «Alentejo» na segunda linha e a região é a mesma
       palavra: não sobra facto nenhum, e a ficha fica com a fotografia e a
       descrição em vez de uma linha a repetir o que está por cima. */
    expect(factosDaFicha({ nome: "Herdade X", localizacao: "Alentejo", regiao: "Alentejo" })).toEqual(
      []
    );
    /* E com cavalos sobra o que interessa. */
    expect(
      factosDaFicha({ nome: "Herdade X", localizacao: "Alentejo", regiao: "Alentejo", num_cavalos: 9 })
    ).toEqual(["9 cavalos"]);
  });
});

describe("resumoDaFicha — corta onde uma frase acaba", () => {
  it("um texto curto passa inteiro e sem reticências", () => {
    expect(resumoDaFicha("Criação de Lusitanos em Muge.")).toBe("Criação de Lusitanos em Muge.");
  });

  it("corta no fim da última frase que cabe", () => {
    const texto =
      "Criação de Puro Sangue Lusitano em Muge. Linhagem trabalhada em morfologia e equitação de trabalho. Apresenta reprodutores nos concursos da raça todos os anos.";
    const r = resumoDaFicha(texto, 110);
    expect(r.endsWith(".")).toBe(true);
    expect(r).not.toContain("…");
    expect(texto.startsWith(r)).toBe(true);
    expect(r.length).toBeLessThanOrEqual(110);
  });

  it("sem uma frase que caiba, corta na palavra e assinala-o", () => {
    const r = resumoDaFicha(
      "Uma casa antiga de criação com uma história muito longa e sem pontuação nenhuma pelo meio",
      40
    );
    expect(r.endsWith("…")).toBe(true);
    expect(r).not.toMatch(/\s…$/);
  });

  it("descrição vazia ou ausente dá texto nenhum", () => {
    expect(resumoDaFicha("")).toBe("");
    expect(resumoDaFicha(null)).toBe("");
    expect(resumoDaFicha(undefined)).toBe("");
    expect(resumoDaFicha("   \n  ")).toBe("");
  });
});
