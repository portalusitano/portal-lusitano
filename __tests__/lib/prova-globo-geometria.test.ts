/**
 * A conta que está por baixo do banco de provas do globo.
 *
 * O banco mede o globo a passear um ponteiro pela lona e a ver que nome é que
 * acende. Do mapa que sai daí tem de se recuperar **onde está cada alfinete**,
 * e é essa recuperação que estes testes fixam: constrói-se um mapa a partir de
 * posições conhecidas e verifica-se que as contas devolvem as posições de que
 * se partiu. Se isto se partir, os números do relatório passam a ser opinião —
 * e um instrumento com ruído desconhecido é pior do que nenhum.
 */

import { describe, expect, it } from "vitest";

import {
  aglomeracao,
  ajustarCirculo,
  centrosDoVarrimento,
  concordancia,
  distancia,
  estatistica,
  fraccaoDentro,
  pares,
  pontariaPorAlfinete,
  refinarCentros,
  sobreposicao,
  sobreposicoes,
} from "@/scripts/prova-globo/geometria.mjs";

type Ponto = { x: number; y: number };

const RAIO = 15;

/**
 * O mesmo teste de acerto que o componente faz: o alfinete mais próximo, se
 * estiver a menos do raio de toque. É a partir daqui que se fabrica um mapa
 * com resposta conhecida.
 */
function mapaDe(alfinetes: Ponto[], { nx = 60, ny = 60, passo = 1 } = {}) {
  const mapa = new Array(nx * ny).fill(-1);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      let melhor = -1;
      let menor = RAIO * RAIO;
      alfinetes.forEach((a, k) => {
        const d = (a.x - i * passo) ** 2 + (a.y - j * passo) ** 2;
        if (d < menor) {
          menor = d;
          melhor = k;
        }
      });
      mapa[j * nx + i] = melhor;
    }
  }
  return { mapa, nx, ny, passo, origem: { x: 0, y: 0 } };
}

describe("contas de base", () => {
  it("mede distâncias", () => {
    expect(distancia({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("dá todos os pares, do mais próximo ao mais distante", () => {
    const p = pares([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(p).toHaveLength(3);
    expect(p.map((x: { d: number }) => x.d)).toEqual([1, 9, 10]);
  });

  it("resume uma lista", () => {
    const e = estatistica([1, 2, 3, 4, 100]);
    expect(e.n).toBe(5);
    expect(e.min).toBe(1);
    expect(e.max).toBe(100);
    expect(e.p50).toBe(3);
    expect(e.media).toBe(22);
  });

  it("devolve nada em vez de zero para uma lista vazia", () => {
    // Zero seria uma mentira: dizer que a menor distância é 0 quando não há
    // nenhuma faz o relatório inventar uma aglomeração que não existe.
    expect(estatistica([]).min).toBeNull();
  });

  it("conta os pares abaixo de cada limiar e o vizinho de cada um", () => {
    const a = aglomeracao(
      [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 40, y: 0 },
      ],
      [3, 12]
    );
    expect(a.contagem[3]).toBe(1);
    expect(a.contagem[12]).toBe(1);
    expect(a.vizinho).toEqual([2, 2, 38]);
  });
});

describe("rectângulos", () => {
  it("mede a área comum", () => {
    expect(sobreposicao({ x: 0, y: 0, l: 10, a: 10 }, { x: 5, y: 5, l: 10, a: 10 })).toBe(25);
    expect(sobreposicao({ x: 0, y: 0, l: 10, a: 10 }, { x: 20, y: 0, l: 10, a: 10 })).toBe(0);
  });

  it("ignora encostos de um pixel", () => {
    // Dois nomes que partilham uma linha por arredondamento não se estorvam;
    // contá-los enchia o relatório de ruído que esconde o que interessa.
    const quase = sobreposicoes([
      { x: 0, y: 0, l: 10, a: 10 },
      { x: 9.7, y: 0, l: 10, a: 10 },
    ]);
    expect(quase).toHaveLength(0);
  });

  it("mede quanto de um rectângulo cabe noutro", () => {
    expect(fraccaoDentro({ x: 0, y: 0, l: 10, a: 10 }, { x: 0, y: 0, l: 100, a: 100 })).toBe(1);
    expect(fraccaoDentro({ x: -5, y: 0, l: 10, a: 10 }, { x: 0, y: 0, l: 100, a: 100 })).toBe(0.5);
  });
});

describe("ajuste de círculo", () => {
  it("recupera o centro e o raio de uma coroa inteira", () => {
    const pontos = Array.from({ length: 24 }, (_, k) => ({
      x: 30 + RAIO * Math.cos((k / 24) * Math.PI * 2),
      y: 42 + RAIO * Math.sin((k / 24) * Math.PI * 2),
    }));
    const a = ajustarCirculo(pontos);
    expect(a).not.toBeNull();
    expect(a!.x).toBeCloseTo(30, 3);
    expect(a!.y).toBeCloseTo(42, 3);
    expect(a!.raio).toBeCloseTo(RAIO, 3);
  });

  it("recupera o centro de um arco curto quando o raio é dado", () => {
    // É este o caso que interessa: o alfinete com um vizinho encostado só tem
    // um bocado de arco livre, e sem o raio fixo o ajuste dispara.
    const pontos = Array.from({ length: 7 }, (_, k) => ({
      x: 30 + RAIO * Math.cos(0.3 + k * 0.08),
      y: 42 + RAIO * Math.sin(0.3 + k * 0.08),
    }));
    const solto = ajustarCirculo(pontos);
    const preso = ajustarCirculo(pontos, { raioFixo: RAIO });
    expect(preso!.x).toBeCloseTo(30, 2);
    expect(preso!.y).toBeCloseTo(42, 2);
    // O ajuste livre não tem como saber o raio a partir de um arco curto.
    expect(Math.hypot(solto!.x - 30, solto!.y - 42)).toBeGreaterThan(
      Math.hypot(preso!.x - 30, preso!.y - 42)
    );
  });

  it("não tenta ajustar com menos de três pontos", () => {
    expect(ajustarCirculo([{ x: 0, y: 0 }])).toBeNull();
  });
});

describe("recuperar alfinetes do mapa de acertos", () => {
  it("põe alfinetes isolados no sítio, e diz qual é o raio de toque", () => {
    const verdade = [
      { x: 15, y: 15 },
      { x: 45, y: 45 },
    ];
    const { centros, raioComum } = centrosDoVarrimento(mapaDe(verdade));
    expect(centros).toHaveLength(2);
    expect(raioComum).toBeCloseTo(RAIO, 0);
    for (const c of centros) {
      expect(c.preciso).toBe(true);
      expect(distancia(c, verdade[c.indice])).toBeLessThan(0.7);
    }
  });

  it("deixa quem está no meio de um aglomerado quase sem arco livre", () => {
    // Um alfinete cercado tem a área cortada de todos os lados: sobra-lhe uma
    // nesga de fronteira livre, e é por isso que o ajuste de círculo sozinho
    // não chega para o pôr no sítio.
    const verdade = [
      { x: 30, y: 30 },
      { x: 24, y: 30 },
      { x: 36, y: 30 },
      { x: 30, y: 24 },
      { x: 30, y: 36 },
    ];
    const { centros } = centrosDoVarrimento(mapaDe(verdade));
    const meio = centros.find((c) => c.indice === 0)!;
    const fora = centros.find((c) => c.indice === 1)!;
    expect(meio.fronteiraLivre).toBeLessThan(fora.fronteiraLivre / 2);
  });

  it("afina os aglomerados até o modelo explicar o mapa medido", () => {
    const verdade = [
      { x: 25, y: 30 },
      { x: 29.5, y: 31 },
      { x: 34, y: 30 },
      { x: 30, y: 26 },
    ];
    const varrimento = mapaDe(verdade);
    const { centros, raioComum } = centrosDoVarrimento(varrimento);
    const raio = raioComum ?? RAIO;
    const antes = concordancia(varrimento, centros, raio).fraccao;
    const afinados = refinarCentros(varrimento, centros, raio);
    const depois = concordancia(varrimento, afinados, raio).fraccao;

    expect(depois).toBeGreaterThanOrEqual(antes);
    expect(depois).toBeGreaterThan(0.99);
    for (const c of afinados) {
      expect(distancia(c, verdade[c.indice])).toBeLessThan(1.5);
    }
  });

  it("dá concordância total quando as posições são as verdadeiras", () => {
    const verdade = [
      { x: 15, y: 15 },
      { x: 45, y: 45 },
    ];
    const varrimento = mapaDe(verdade);
    const c = verdade.map((p, i) => ({ ...p, indice: i }));
    expect(concordancia(varrimento, c, RAIO).fraccao).toBe(1);
  });
});

describe("pontaria", () => {
  it("um alfinete sozinho acerta em todo o disco de toque", () => {
    const verdade = [{ x: 30, y: 30 }];
    const varrimento = mapaDe(verdade);
    const [p] = pontariaPorAlfinete(varrimento, [{ ...verdade[0], indice: 0 }], RAIO);
    expect(p.errado).toBe(0);
    expect(p.vazio).toBe(0);
    expect(p.fraccaoCerta).toBe(1);
  });

  it("um vizinho encostado rouba metade do disco", () => {
    const verdade = [
      { x: 30, y: 30 },
      { x: 32, y: 30 },
    ];
    const varrimento = mapaDe(verdade);
    const centros = verdade.map((p, i) => ({ ...p, indice: i }));
    const [a] = pontariaPorAlfinete(varrimento, centros, RAIO);
    expect(a.errado).toBeGreaterThan(0);
    // Com dois pontos a 2px, quem carrega no disco de um acerta no outro
    // quase metade das vezes — é este o número que o relatório mostra.
    expect(a.fraccaoErrada).toBeGreaterThan(0.35);
    expect(a.fraccaoErrada).toBeLessThan(0.65);
  });
});
