import { describe, it, expect } from "vitest";
import { CODIGOS_DE_PAIS, PAISES_FREQUENTES, paisesParaEscolha, nomeDoPais } from "@/lib/paises";

describe("os países", () => {
  it("são 251, e nenhum aparece duas vezes", () => {
    expect(CODIGOS_DE_PAIS.length).toBe(251);
    expect(new Set(CODIGOS_DE_PAIS).size).toBe(251);
  });

  it("não tem códigos extintos nem supranacionais", () => {
    // O ICU traduz cada extinto para o nome do sucessor, portanto deixá-los
    // entrar punha «Alemanha» duas vezes na lista — uma por DE e outra por DD.
    for (const morto of ["AN", "DD", "SU", "YU", "ZR", "NH", "UK", "DY", "EU", "UN", "ZZ"]) {
      expect(CODIGOS_DE_PAIS).not.toContain(morto);
    }
  });

  it("tem os que se podem confundir com um extinto", () => {
    // Ao tirar os extintos por nome repetido, o meu primeiro automatismo
    // apagou o VU — que é o Vanuatu a sério — em vez do NH, as Novas
    // Hébridas. Este caso existe para isso não voltar a passar.
    expect(CODIGOS_DE_PAIS).toContain("VU");
    expect(CODIGOS_DE_PAIS).toContain("GB");
    expect(CODIGOS_DE_PAIS).toContain("BJ");
  });

  it("nenhum nome se repete, em nenhuma das três línguas", () => {
    for (const lingua of ["pt-PT", "en", "es"]) {
      const { frequentes, restantes } = paisesParaEscolha(lingua);
      const nomes = [...frequentes, ...restantes].map((p) => p.nome);
      expect(new Set(nomes).size).toBe(nomes.length);
    }
  });

  it("os frequentes vêm primeiro e não se repetem lá abaixo", () => {
    const { frequentes, restantes } = paisesParaEscolha("pt-PT");
    expect(frequentes.map((p) => p.codigo)).toEqual([...PAISES_FREQUENTES]);
    expect(frequentes.length + restantes.length).toBe(CODIGOS_DE_PAIS.length);
    for (const f of PAISES_FREQUENTES) {
      expect(restantes.some((p) => p.codigo === f)).toBe(false);
    }
  });

  it("traduz para a língua de quem lê", () => {
    const em = (l: string, c: string) =>
      paisesParaEscolha(l)
        .frequentes.concat(paisesParaEscolha(l).restantes)
        .find((p) => p.codigo === c)?.nome;
    expect(em("pt-PT", "NL")).toBe("Países Baixos");
    expect(em("en", "NL")).toBe("Netherlands");
    expect(em("es", "NL")).toBe("Países Bajos");
  });

  it("ordena pelas regras da língua, e não por bytes", () => {
    // Em português o Á ordena com o A; um `sort()` cru mandava-o para o fim.
    const { restantes } = paisesParaEscolha("pt-PT");
    const nomes = restantes.map((p) => p.nome);
    const comColator = [...nomes].sort(new Intl.Collator("pt-PT").compare);
    expect(nomes).toEqual(comColator);
    // E a África do Sul não fica atrás do Zimbabué.
    const africa = nomes.findIndex((n) => n.startsWith("África"));
    const zimbabue = nomes.findIndex((n) => n.startsWith("Zimb"));
    expect(africa).toBeLessThan(zimbabue);
  });

  it("o nome de um país resiste a lixo", () => {
    expect(nomeDoPais("PT", "pt-PT")).toBe("Portugal");
    expect(nomeDoPais("", "pt-PT")).toBe("");
    expect(nomeDoPais("ZZZZ", "pt-PT")).toBe("ZZZZ");
  });
});
