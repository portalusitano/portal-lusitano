import { describe, expect, it } from "vitest";

import {
  factosDaFicha,
  linhasDoGrupo,
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
      factosDaFicha({
        nome: "Casa Cadaval",
        localizacao: "Muge",
        regiao: "Ribatejo",
        num_cavalos: 42,
      })[0]
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
    expect(
      factosDaFicha({ nome: "Casa Cadaval", localizacao: "Muge", regiao: "Ribatejo" })
    ).toEqual(["Ribatejo"]);
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
    expect(
      factosDaFicha({ nome: "Herdade X", localizacao: "Alentejo", regiao: "Alentejo" })
    ).toEqual([]);
    /* E com cavalos sobra o que interessa. */
    expect(
      factosDaFicha({
        nome: "Herdade X",
        localizacao: "Alentejo",
        regiao: "Alentejo",
        num_cavalos: 9,
      })
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

/* O molde da conta entra por argumento, e o teste passa-o à mão de propósito:
   a língua é uma decisão de quem chama, e um valor por omissão escondido aqui
   dentro voltaria a pôr português no meio de um `/en/mapa`. */
const CONTA_PT = "{n} coudelarias";

describe("linhasDoGrupo — um ponto que junta várias diz quem lá está", () => {
  /* Os quatro ajuntamentos que o mapa faz com os dados verdadeiros. Estão
     aqui pelos nomes que têm, e não por nomes inventados: era com estes que
     o defeito se via. */
  const ALTER = [
    {
      nome: "Coudelaria Torres Vaz Freire",
      localizacao: "Monte de Vila Formosa, Chança, 7440-201 Alter do Chão",
    },
    { nome: "Coudelaria de Alter Real", localizacao: "Alter do Chão" },
  ];
  const VILA_VICOSA = [
    { nome: "Coudelaria Vila Viçosa", localizacao: "Vila Viçosa" },
    { nome: "Jupiter Classical Dressage", localizacao: "Vila Viçosa" },
  ];
  const AZINHAGA = [
    { nome: "Coudelaria Manuel Veiga", localizacao: "Quinta da Broa, Azinhaga" },
    {
      nome: "Quinta da Lagoalva de Cima",
      localizacao: "Quinta da Lagoalva de Cima, 2090-222 Alpiarça",
    },
    { nome: "Coudelaria João Pedro Rodrigues", localizacao: "Alpiarça" },
    {
      nome: "Lusitanos d'Atela - Coudelaria Bessa de Carvalho",
      localizacao: "Casalinho, Alpiarça",
    },
  ];

  it("duas: uma por linha, e sem algarismo nenhum", () => {
    expect(linhasDoGrupo(ALTER, CONTA_PT)).toEqual({
      nomes: ["Torres Vaz Freire", "Alter Real"],
      conta: "",
      sitio: "Alter do Chão",
    });
  });

  it("duas na mesma terra: o título deixa de repetir a terra", () => {
    /* Era «Vila Viçosa» em cima e «Vila Viçosa · Jupiter Classical Dress…»
       por baixo — a mesma palavra em dois papéis, com a resposta cortada.
       E a terra também não volta em baixo: um dos dois nomes já a diz. */
    expect(linhasDoGrupo(VILA_VICOSA, CONTA_PT)).toEqual({
      nomes: ["Vila Viçosa", "Jupiter Classical Dressage"],
      conta: "",
      sitio: "",
    });
  });

  it("a terra fica quando nenhum dos dois nomes a diz", () => {
    expect(
      linhasDoGrupo(
        [
          { nome: "Coudelaria João Lynce", localizacao: "Santarém" },
          { nome: "Casa Cadaval", localizacao: "Muge, Salvaterra de Magos" },
        ],
        CONTA_PT
      ).sitio
    ).toBe("Santarém · Salvaterra de Magos");
  });

  it("três ou mais: a conta é o título e a terra desce", () => {
    expect(linhasDoGrupo(AZINHAGA, CONTA_PT)).toEqual({
      nomes: [],
      conta: "4 coudelarias",
      sitio: "Azinhaga · Alpiarça",
    });
  });

  it("não inventa um sítio comum quando há três terras", () => {
    const r = linhasDoGrupo(
      [
        { nome: "A", localizacao: "Évora" },
        { nome: "B", localizacao: "Beja" },
        { nome: "C", localizacao: "Elvas" },
      ],
      CONTA_PT
    );
    expect(r.sitio).toBe("");
    expect(r.conta).toBe("3 coudelarias");
  });

  it("nenhum membro se perde: ou vai num nome, ou vai na conta", () => {
    for (const membros of [ALTER, VILA_VICOSA, AZINHAGA]) {
      const r = linhasDoGrupo(membros, CONTA_PT);
      const ditos = r.nomes.length || Number(r.conta.split(" ")[0]);
      expect(ditos).toBe(membros.length);
    }
  });
});
