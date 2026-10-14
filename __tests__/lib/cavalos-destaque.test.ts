import { describe, it, expect } from "vitest";
import { lerCavalosDestaque } from "@/lib/cavalos-destaque";

describe("lerCavalosDestaque", () => {
  /* As formas que a base de produção tem mesmo: 15 linhas com array,
     11 com uma string de JSON, 3 com nulo. */
  it("aceita o array, que é a forma boa", () => {
    expect(lerCavalosDestaque([{ nome: "Firme", ano: 1961 }])).toEqual([
      { nome: "Firme", ano: 1961 },
    ]);
    expect(lerCavalosDestaque([])).toEqual([]);
  });

  it("desembrulha a string com JSON dentro — era isto que partia a construção", () => {
    const daBase = '[{"nome":"Firme","descricao":"Garanhão lendário da linhagem Andrade."}]';
    expect(lerCavalosDestaque(daBase)).toEqual([{ nome: "Firme" }]);
  });

  it("aceita a coudelaria cujas entradas são texto e não objectos", () => {
    const daBase = '["Júpiter - garanhão reprodutor","Madriles - garanhão reprodutor"]';
    expect(lerCavalosDestaque(daBase)).toEqual([
      { nome: "Júpiter - garanhão reprodutor" },
      { nome: "Madriles - garanhão reprodutor" },
    ]);
  });

  it("nulo e vazio dão lista vazia, não rebentam", () => {
    expect(lerCavalosDestaque(null)).toEqual([]);
    expect(lerCavalosDestaque(undefined)).toEqual([]);
    expect(lerCavalosDestaque("")).toEqual([]);
    expect(lerCavalosDestaque("   ")).toEqual([]);
    expect(lerCavalosDestaque("[]")).toEqual([]);
  });

  it("uma string que não é JSON é um nome, não um erro", () => {
    expect(lerCavalosDestaque("Xaquiro")).toEqual([{ nome: "Xaquiro" }]);
  });

  it("deita fora o que não tem nome — é o nome que encabeça o cartão e serve de chave", () => {
    expect(lerCavalosDestaque([{ ano: 1999 }, { nome: "  " }, null, 42])).toEqual([]);
    expect(lerCavalosDestaque([{ nome: "Perito" }, { ano: 2004 }])).toEqual([{ nome: "Perito" }]);
  });

  it("guarda os campos opcionais só quando valem alguma coisa", () => {
    expect(
      lerCavalosDestaque([
        { nome: "Soberano", ano: 1999, pelagem: "Ruça", preco: 45000, vendido: true },
      ])
    ).toEqual([{ nome: "Soberano", ano: 1999, pelagem: "Ruça", preco: 45000, vendido: true }]);
    // Zeros, vazios e falsos não entram: um preço de 0 € não é um preço.
    expect(
      lerCavalosDestaque([{ nome: "X", ano: 0, preco: 0, pelagem: "", vendido: false }])
    ).toEqual([{ nome: "X" }]);
  });

  it("aguenta formas que ninguém previu", () => {
    expect(lerCavalosDestaque({ nome: "não é uma lista" })).toEqual([]);
    expect(lerCavalosDestaque(123)).toEqual([]);
    expect(lerCavalosDestaque('{"nome":"objecto solto"}')).toEqual([]);
  });
});
