import { describe, it, expect } from "vitest";
import { preencher } from "@/lib/globo/frases";

describe("preencher — encher uma frase dos dicionários", () => {
  it("troca o marcador pelo valor", () => {
    expect(preencher("{n} coudelarias", { n: 4 })).toBe("4 coudelarias");
    expect(preencher("{n} studs", { n: 4 })).toBe("4 studs");
    expect(preencher("{n} yeguadas", { n: 4 })).toBe("4 yeguadas");
  });

  it("troca mais do que um, e o mesmo mais do que uma vez", () => {
    expect(preencher("{place}: {n} coudelarias", { place: "Alter do Chão", n: 2 })).toBe(
      "Alter do Chão: 2 coudelarias"
    );
    /* O parágrafo do leitor de ecrã diz o número duas vezes. */
    expect(preencher("Globo com {n}; as {n} por latitude", { n: 29 })).toBe(
      "Globo com 29; as 29 por latitude"
    );
  });

  /* Uma tradução não é obrigada a arrumar a frase como a portuguesa. Se lhe
     der jeito não usar um marcador, isso não pode partir o mapa. */
  it("um marcador que a frase não tem é ignorado sem barulho", () => {
    expect(preencher("Ver yeguada", { name: "Alter Real" })).toBe("Ver yeguada");
  });

  /* E o contrário fica à vista de propósito: uma chaveta no ecrã denuncia a
     chave que falta, uma frase truncada em silêncio não. */
  it("um marcador que ninguém encheu fica visível", () => {
    expect(preencher("Ver a ficha de {name}", {})).toBe("Ver a ficha de {name}");
  });

  it("não mexe no que não é marcador", () => {
    expect(preencher("100% · {n}", { n: 1 })).toBe("100% · 1");
    expect(preencher("$& e $1 não são especiais aqui", { n: 1 })).toBe(
      "$& e $1 não são especiais aqui"
    );
  });
});
