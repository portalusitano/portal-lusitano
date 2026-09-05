import { describe, it, expect, beforeEach } from "vitest";
import {
  MAX_VISTOS,
  normalizarVistos,
  registarVisto,
  excepto,
  lerVistos,
  guardarVistos,
  limparVistos,
  type CavaloVisto,
} from "@/lib/vistos-recentemente";

function visto(id: string, visto_em: number): CavaloVisto {
  return { id, nome: `Cavalo ${id}`, visto_em };
}

describe("normalizarVistos", () => {
  it("devolve lista vazia para valores que não são array", () => {
    expect(normalizarVistos(null)).toEqual([]);
    expect(normalizarVistos("[]")).toEqual([]);
    expect(normalizarVistos({ id: "a" })).toEqual([]);
  });

  it("descarta registos corrompidos sem deitar o resto fora", () => {
    const resultado = normalizarVistos([
      visto("a", 3),
      { id: "b" },
      { nome: "sem id", visto_em: 1 },
      { id: "c", nome: "c", visto_em: Number.NaN },
      visto("d", 1),
    ]);
    expect(resultado.map((v) => v.id)).toEqual(["a", "d"]);
  });

  it("ordena da visita mais recente para a mais antiga", () => {
    const resultado = normalizarVistos([visto("a", 1), visto("b", 5), visto("c", 3)]);
    expect(resultado.map((v) => v.id)).toEqual(["b", "c", "a"]);
  });

  it("colapsa duplicados guardando a visita mais recente", () => {
    const resultado = normalizarVistos([visto("a", 1), visto("a", 9)]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].visto_em).toBe(9);
  });

  it("nunca devolve mais do que o máximo", () => {
    const muitos = Array.from({ length: MAX_VISTOS + 8 }, (_, i) => visto(`id-${i}`, i));
    expect(normalizarVistos(muitos)).toHaveLength(MAX_VISTOS);
  });
});

describe("registarVisto", () => {
  it("põe o anúncio à cabeça da lista", () => {
    const lista = registarVisto([visto("a", 1)], { id: "b", nome: "B" }, 10);
    expect(lista.map((v) => v.id)).toEqual(["b", "a"]);
    expect(lista[0].visto_em).toBe(10);
  });

  it("promove sem duplicar quando o anúncio já tinha sido visto", () => {
    const lista = registarVisto([visto("a", 1), visto("b", 2)], { id: "a", nome: "A" }, 10);
    expect(lista.map((v) => v.id)).toEqual(["a", "b"]);
    expect(lista).toHaveLength(2);
  });

  it("trunca no máximo, deitando fora a visita mais antiga", () => {
    const cheia = Array.from({ length: MAX_VISTOS }, (_, i) => visto(`id-${i}`, MAX_VISTOS - i));
    const lista = registarVisto(cheia, { id: "novo", nome: "Novo" }, 999);
    expect(lista).toHaveLength(MAX_VISTOS);
    expect(lista[0].id).toBe("novo");
    expect(lista.some((v) => v.id === `id-${MAX_VISTOS - 1}`)).toBe(false);
  });
});

describe("excepto", () => {
  it("remove o anúncio indicado", () => {
    expect(excepto([visto("a", 1), visto("b", 2)], "a").map((v) => v.id)).toEqual(["b"]);
  });

  it("devolve tudo quando não há id", () => {
    expect(excepto([visto("a", 1)], undefined)).toHaveLength(1);
  });
});

describe("persistência", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("guarda e volta a ler", () => {
    guardarVistos([visto("a", 5), visto("b", 1)]);
    expect(lerVistos().map((v) => v.id)).toEqual(["a", "b"]);
  });

  it("devolve lista vazia quando não há nada guardado", () => {
    expect(lerVistos()).toEqual([]);
  });

  it("não rebenta com JSON inválido", () => {
    window.localStorage.setItem("cavalos_vistos_recentemente", "{nao-e-json");
    expect(lerVistos()).toEqual([]);
  });

  it("limpa o histórico", () => {
    guardarVistos([visto("a", 1)]);
    limparVistos();
    expect(lerVistos()).toEqual([]);
  });
});
