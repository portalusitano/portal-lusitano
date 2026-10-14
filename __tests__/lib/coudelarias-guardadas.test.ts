import { describe, expect, it } from "vitest";
import { LIMITE, alternar, estaGuardada, lerGuardadas } from "@/lib/coudelarias-guardadas";

describe("lerGuardadas", () => {
  it("lê o que lá está", () => {
    const bruto = JSON.stringify([{ slug: "alter-real", nome: "Alter Real", guardadaEm: 5 }]);
    expect(lerGuardadas(bruto)).toEqual([
      { slug: "alter-real", nome: "Alter Real", localizacao: undefined, guardadaEm: 5 },
    ]);
  });

  it("não rebenta com lixo na chave", () => {
    expect(lerGuardadas(null)).toEqual([]);
    expect(lerGuardadas("nao é json")).toEqual([]);
    expect(lerGuardadas('{"a":1}')).toEqual([]);
    expect(lerGuardadas("[1,2,null]")).toEqual([]);
    expect(lerGuardadas('[{"slug":"x"}]')).toEqual([]);
  });

  it("descarta repetidos", () => {
    const bruto = JSON.stringify([
      { slug: "x", nome: "X" },
      { slug: "x", nome: "X outra vez" },
    ]);
    expect(lerGuardadas(bruto)).toHaveLength(1);
  });
});

describe("alternar", () => {
  it("guarda à cabeça e desguarda", () => {
    const com = alternar([], { slug: "x", nome: "X" }, 100);
    expect(com).toEqual([{ slug: "x", nome: "X", guardadaEm: 100 }]);
    expect(estaGuardada(com, "x")).toBe(true);
    expect(alternar(com, { slug: "x", nome: "X" })).toEqual([]);
  });

  it("a mais recente fica em primeiro", () => {
    const lista = alternar(alternar([], { slug: "a", nome: "A" }, 1), { slug: "b", nome: "B" }, 2);
    expect(lista.map((g) => g.slug)).toEqual(["b", "a"]);
  });

  it("tem tecto", () => {
    let lista = [] as ReturnType<typeof alternar>;
    for (let i = 0; i < LIMITE + 10; i++) {
      lista = alternar(lista, { slug: `s${i}`, nome: `N${i}` }, i);
    }
    expect(lista).toHaveLength(LIMITE);
    expect(lista[0].slug).toBe(`s${LIMITE + 9}`);
  });
});
