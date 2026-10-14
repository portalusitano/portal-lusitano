import { describe, it, expect } from "vitest";
import {
  agrupar,
  distanciaKm,
  kmPorPixel,
  raioEmDegraus,
  type PontoNoChao,
} from "@/lib/agrupar-globo";

/** Coordenadas reais das coudelarias que dão problema no globo. */
type Coud = PontoNoChao & { nome: string };
const p = (nome: string, lat: number, lon: number): Coud => ({ nome, coords: [lat, lon] });

/* Os pares medidos: 1,17 km entre as duas de Vila Viçosa, 1,17 km entre as
   duas de Coruche, 1,38 km entre as duas de Alpiarça. */
const vilaVicosa = p("Vila Viçosa", 38.7833, -7.4167);
const jupiter = p("Jupiter", 38.775, -7.425);
const agolada = p("Coudelaria SA", 38.9583, -8.5333);
const veiga = p("Veiga Teixeira", 38.95, -8.525);
const jpr = p("João Pedro Rodrigues", 39.25, -8.5667);
const atela = p("Lusitanos d'Atela", 39.2377, -8.5648);
/* Longe de tudo: o Algarve e o Minho não se juntam a ninguém. */
const beja = p("Malhadinha", 37.9109, -7.8947);
const sintra = p("Quinta dos Cedros", 38.8563, -9.2819);

describe("distanciaKm", () => {
  it("dá zero para o mesmo ponto", () => {
    expect(distanciaKm([39, -8], [39, -8])).toBe(0);
  });

  it("mede um grau de latitude como 111 km", () => {
    expect(distanciaKm([39, -8], [40, -8])).toBeCloseTo(111.2, 0);
  });

  it("encolhe a longitude com o cosseno da latitude", () => {
    // A 39°N um grau de longitude vale cos(39°) ≈ 0,777 de um de latitude.
    const lon = distanciaKm([39, -8], [39, -7]);
    const lat = distanciaKm([39, -8], [40, -8]);
    expect(lon / lat).toBeCloseTo(Math.cos((39.0 * Math.PI) / 180), 2);
  });

  it("é simétrica", () => {
    expect(distanciaKm(vilaVicosa.coords, jupiter.coords)).toBeCloseTo(
      distanciaKm(jupiter.coords, vilaVicosa.coords),
      9
    );
  });

  it("confirma o par mais próximo dos dados reais", () => {
    expect(distanciaKm(vilaVicosa.coords, jupiter.coords)).toBeCloseTo(1.17, 1);
  });
});

describe("agrupar", () => {
  const todos = [vilaVicosa, jupiter, agolada, veiga, jpr, atela, beja, sintra];

  it("com raio zero devolve cada ponto por si", () => {
    const g = agrupar(todos, 0);
    expect(g).toHaveLength(todos.length);
    expect(g.every((x) => x.membros.length === 1)).toBe(true);
  });

  it("não perde nem repete ninguém, seja qual for o raio", () => {
    for (const raio of [0, 0.5, 1.2, 2, 5, 20, 200]) {
      const g = agrupar(todos, raio);
      const nomes = g.flatMap((x) => x.membros.map((m) => m.nome)).sort();
      expect(nomes).toEqual(todos.map((t) => t.nome).sort());
    }
  });

  it("junta os três pares próximos a 2 km e deixa os longínquos sozinhos", () => {
    const g = agrupar(todos, 2);
    expect(g).toHaveLength(5);
    const pares = g.filter((x) => x.membros.length === 2);
    expect(pares).toHaveLength(3);
    const sozinhos = g.filter((x) => x.membros.length === 1).map((x) => x.membros[0].nome);
    expect(sozinhos.sort()).toEqual(["Malhadinha", "Quinta dos Cedros"]);
  });

  it("a 1 km já não junta nada — o par mais próximo está a 1,17", () => {
    expect(agrupar(todos, 1)).toHaveLength(todos.length);
  });

  it("põe o ponto do grupo no meio dos membros", () => {
    const [grupo] = agrupar([vilaVicosa, jupiter], 2);
    expect(grupo.membros).toHaveLength(2);
    expect(grupo.coords[0]).toBeCloseTo((38.7833 + 38.775) / 2, 6);
    expect(grupo.coords[1]).toBeCloseTo((-7.4167 + -7.425) / 2, 6);
  });

  it("é estável: a ordem de entrada não muda o resultado", () => {
    const assinatura = (l: readonly Coud[]) =>
      agrupar(l, 12)
        .map((g) =>
          g.membros
            .map((m) => m.nome)
            .sort()
            .join("+")
        )
        .sort()
        .join(" | ");
    const baralhado = [...todos].reverse();
    expect(assinatura(baralhado)).toBe(assinatura(todos));
  });

  it("com um raio enorme fica um ponto só", () => {
    const g = agrupar(todos, 5000);
    expect(g).toHaveLength(1);
    expect(g[0].membros).toHaveLength(todos.length);
  });

  it("aguenta a lista vazia", () => {
    expect(agrupar([], 10)).toEqual([]);
  });

  it("desfaz-se por degraus à medida que o raio encolhe", () => {
    const contas = [40, 20, 10, 5, 2, 1].map((r) => agrupar(todos, r).length);
    // Nunca diminui: aproximar só pode separar.
    for (let i = 1; i < contas.length; i++) expect(contas[i]).toBeGreaterThanOrEqual(contas[i - 1]);
    expect(contas[contas.length - 1]).toBe(todos.length);
  });

  it("nenhum ajuntamento tem dois membros a mais de dois raios", () => {
    for (const raio of [2, 8, 25]) {
      for (const g of agrupar(todos, raio))
        for (const a of g.membros)
          for (const b of g.membros)
            expect(distanciaKm(a.coords, b.coords)).toBeLessThanOrEqual(2 * raio + 1e-9);
    }
  });
});

describe("kmPorPixel", () => {
  it("reproduz os 837 m por pixel do enquadramento de repouso", () => {
    // distancia = 0,11584 raios, lente de 42°, lona de 891×678.
    expect(kmPorPixel(0.11584, 42, 891 / 678, 891)).toBeCloseTo(0.837, 2);
  });

  it("encolhe proporcionalmente à distância", () => {
    const longe = kmPorPixel(0.12, 42, 1.3, 900);
    const perto = kmPorPixel(0.03, 42, 1.3, 900);
    expect(longe / perto).toBeCloseTo(4, 6);
  });

  it("não rebenta com uma lona de largura zero", () => {
    expect(Number.isFinite(kmPorPixel(0.1, 42, 1, 0))).toBe(true);
  });
});

describe("raioEmDegraus", () => {
  it("devolve zero para raio nulo ou negativo", () => {
    expect(raioEmDegraus(0)).toBe(0);
    expect(raioEmDegraus(-3)).toBe(0);
  });

  it("agarra-se ao mesmo degrau enquanto o raio varia pouco", () => {
    const a = raioEmDegraus(20);
    expect(raioEmDegraus(21)).toBe(a);
    expect(raioEmDegraus(19)).toBe(a);
  });

  it("muda de degrau quando o raio muda mais de 35%", () => {
    expect(raioEmDegraus(20 * 1.35 * 1.35)).not.toBe(raioEmDegraus(20));
  });

  it("é monótono", () => {
    let anterior = 0;
    for (let r = 1; r < 60; r += 0.5) {
      const v = raioEmDegraus(r);
      expect(v).toBeGreaterThanOrEqual(anterior);
      anterior = v;
    }
  });
});
