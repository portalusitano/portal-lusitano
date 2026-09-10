import { describe, it, expect } from "vitest";
import { criarSlug } from "@/lib/slug";

/**
 * `coudelarias.slug` é `NOT NULL UNIQUE`, e o `POST` de administração não o
 * escrevia: nenhuma coudelaria chegou a ser criada por lá. O helper estava
 * escrito à mão dentro da rota de registo público e não tinha teste nenhum.
 */
describe("criarSlug", () => {
  it("tira os acentos em vez de os deitar fora com a letra", () => {
    expect(criarSlug("Coudelaria São João")).toBe("coudelaria-sao-joao");
    expect(criarSlug("Herdade da Malhadinha Nova")).toBe("herdade-da-malhadinha-nova");
    expect(criarSlug("Évora")).toBe("evora");
  });

  it("junta os separadores em vez de os repetir", () => {
    expect(criarSlug("Quinta  do   Cedro")).toBe("quinta-do-cedro");
    expect(criarSlug("Casa Cadaval — Muge")).toBe("casa-cadaval-muge");
    expect(criarSlug("A & B")).toBe("a-b");
  });

  it("não deixa hífens nas pontas", () => {
    expect(criarSlug("  Alter Real  ")).toBe("alter-real");
    expect(criarSlug("«Lusitanos»")).toBe("lusitanos");
  });

  it("guarda os algarismos, que fazem parte de nomes a sério", () => {
    expect(criarSlug("Coudelaria 1780")).toBe("coudelaria-1780");
  });

  it("um nome sem uma letra latina dá cadeia vazia, e não um hífen solto", () => {
    // Não é um caso a ignorar: `slug` é UNIQUE, e dois nomes destes colidiriam.
    // Quem chamar isto tem de tratar o vazio; o que não pode é receber "-".
    expect(criarSlug("!!!")).toBe("");
    expect(criarSlug("")).toBe("");
  });
});
