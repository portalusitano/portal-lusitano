import { describe, it, expect } from "vitest";
import { actividadesDe, contarActividades, temActividade } from "@/lib/especialidades";

describe("actividadesDe", () => {
  it("junta o que é a mesma coisa com nomes diferentes", () => {
    // O mesmo termo em duas línguas dava duas pastilhas.
    expect(actividadesDe(["Equitação de Trabalho", "Working Equitation"])).toEqual(["trabalho"]);
    // Toureio e Tauromaquia eram 5 + 4 numa lista de 29.
    expect(actividadesDe(["Toureio", "Tauromaquia"])).toEqual(["toureio"]);
    // Três dressages e uma alta escola são um filtro só.
    expect(
      actividadesDe(["Dressage", "Dressage Clássico", "Dressage Barroco", "Alta Escola"])
    ).toEqual(["dressage"]);
    // Oito maneiras de dizer turismo.
    expect(
      actividadesDe(["Turismo Equestre", "Turismo Rural", "Férias a Cavalo", "Trail Riding"])
    ).toEqual(["turismo"]);
  });

  it("devolve sempre na ordem canónica, para a lista não dançar entre cartões", () => {
    expect(actividadesDe(["Exportação", "Dressage", "Criação de Lusitanos"])).toEqual([
      "criacao",
      "dressage",
      "venda",
    ]);
    expect(actividadesDe(["Criação de Lusitanos", "Dressage", "Exportação"])).toEqual([
      "criacao",
      "dressage",
      "venda",
    ]);
  });

  it("ignora maiúsculas e espaço a mais", () => {
    expect(actividadesDe(["  DRESSAGE  ", "toureio"])).toEqual(["dressage", "toureio"]);
  });

  it("deixa de fora o que não é uma actividade", () => {
    // Linhagens têm coluna própria; feno e ambiente não são o que se procura.
    expect(
      actividadesDe(["Linhagem Veiga", "Produção de Feno", "Responsabilidade Ambiental"])
    ).toEqual([]);
  });

  it("aguenta o que não é uma lista de texto", () => {
    expect(actividadesDe(null)).toEqual([]);
    expect(actividadesDe(undefined)).toEqual([]);
    expect(actividadesDe([])).toEqual([]);
    expect(actividadesDe(["", "   ", "Inexistente"])).toEqual([]);
    expect(actividadesDe([42 as unknown as string, "Dressage"])).toEqual(["dressage"]);
  });
});

describe("contarActividades", () => {
  /* Os dados reais: 58 valores distintos em 29 coudelarias, 43 deles com
     contagem 1. O filtro tem de sair disto com um punhado de escolhas em que
     cada uma valha a pena carregar. */
  const reais = [
    { especialidades: ["Turismo Equestre", "Passeios a Cavalo", "Aulas de Equitação"] },
    { especialidades: ["Dressage", "Equitação de Trabalho", "Modelo e Andamentos", "Exportação"] },
    { especialidades: ["Alta Escola", "Dressage Clássico", "Turismo Cultural"] },
    { especialidades: ["Criação de Lusitanos", "Linhagem Veiga", "Tauromaquia"] },
    { especialidades: ["Produção de Feno", "Responsabilidade Ambiental"] },
  ];

  it("conta cada coudelaria uma vez por actividade, por muitos sinónimos que ela traga", () => {
    // A segunda tem Dressage e Modelo e Andamentos — ambos «dressage» — e conta uma.
    const c = contarActividades(reais);
    // Linhas 2 e 3: a 2 traz «Dressage» e «Modelo e Andamentos» e conta uma.
    expect(c.find((x) => x.valor === "dressage")?.n).toBe(2);
    expect(c.find((x) => x.valor === "toureio")?.n).toBe(1);
  });

  it("não devolve actividades vazias — um filtro é uma promessa de que há algo do outro lado", () => {
    const c = contarActividades(reais);
    expect(c.every((x) => x.n > 0)).toBe(true);
    // A quinta não tem nenhuma actividade: não cria pastilha nenhuma.
    expect(contarActividades([reais[4]])).toEqual([]);
  });

  it("reduz mesmo a parede de pastilhas", () => {
    const distintasEmBruto = new Set(reais.flatMap((c) => c.especialidades)).size;
    expect(distintasEmBruto).toBe(15);
    expect(contarActividades(reais).length).toBe(7);
  });
});

describe("temActividade", () => {
  it("sem filtro, passa tudo", () => {
    expect(temActividade(["Dressage"], "")).toBe(true);
    expect(temActividade(null, "")).toBe(true);
  });

  it("filtra pela actividade e não pelo texto em bruto", () => {
    expect(temActividade(["Working Equitation"], "trabalho")).toBe(true);
    expect(temActividade(["Tauromaquia"], "toureio")).toBe(true);
    expect(temActividade(["Dressage"], "toureio")).toBe(false);
  });
});
