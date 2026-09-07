import { describe, expect, it } from "vitest";

import {
  ANEL_MANCHA,
  FOLGA_MANCHA,
  type Caixa,
  type Janela,
  type Sobra,
  ajuntarSobras,
  colocarManchas,
} from "@/lib/globo/manchas";

const CHIP = { l: 22, a: 22 };
const JANELA: Janela = { x0: 2, y0: 2, x1: 1398, y1: 948 };

const sobra = (x: number, y: number, ...membros: string[]): Sobra<string> => ({
  ecraX: x,
  ecraY: y,
  membros,
});

const cruza = (a: Caixa, b: Caixa, folga: number) =>
  a.x < b.x + b.l + folga &&
  a.x + a.l + folga > b.x &&
  a.y < b.y + b.a + folga &&
  a.y + a.a + folga > b.y;

/** A caixa do algarismo de uma mancha colocada. */
const caixaDe = (m: { x: number; y: number }): Caixa => ({ x: m.x, y: m.y, l: CHIP.l, a: CHIP.a });

/**
 * O cerco: caixas de nome postas de propósito em cima dos vinte e cinco
 * sítios que o algarismo experimenta.
 *
 * É esta a situação que fazia desaparecer coudelarias — num quadro cheio, os
 * nomes que ganharam a colocação ocupam a vizinhança inteira do ajuntamento
 * mais apertado, que é justamente o que mais precisa de ser contado.
 */
function cercar(cx: number, cy: number): Caixa[] {
  return ANEL_MANCHA.map(([dx, dy]) => ({
    x: cx + dx - CHIP.l / 2 - 1,
    y: cy + dy - CHIP.a / 2 - 1,
    l: CHIP.l + 2,
    a: CHIP.a + 2,
  }));
}

describe("colocarManchas — a promessa de que ninguém fica sem conta", () => {
  it("sem sobras não faz manchas", () => {
    expect(colocarManchas([], { chip: CHIP, janela: JANELA, ocupadas: [] })).toEqual([]);
  });

  it("um ajuntamento livre pousa em cima do que conta", () => {
    const sobras = [sobra(700, 500, "a"), sobra(715, 508, "b"), sobra(690, 512, "c")];
    const [m] = colocarManchas(sobras, { chip: CHIP, janela: JANELA, ocupadas: [] });
    expect(m.membros.sort()).toEqual(["a", "b", "c"]);
    expect(m.adoptou).toBe(0);
    expect(m.afastada).toBe(false);
    // O centro do algarismo cai sobre o centro do ajuntamento.
    expect(Math.hypot(m.x + CHIP.l / 2 - 701.67, m.y + CHIP.a / 2 - 506.67)).toBeLessThan(2);
  });

  it("o cerco dos vinte e cinco sítios é alcançável — era aqui que se perdiam", () => {
    /* Prova que o ramo existe: com os vinte e cinco sítios ocupados não há
       posição nenhuma perto, e a versão que desistia deixava estes três sem
       nome e sem algarismo. */
    const perto = [sobra(700, 500, "a"), sobra(712, 506, "b"), sobra(694, 511, "c")];
    const cerco = cercar(701.33, 505.67);
    const longe = [sobra(300, 300, "x"), sobra(316, 306, "y")];

    const ocupadas = [...cerco];
    const manchas = colocarManchas([...perto, ...longe], {
      chip: CHIP,
      janela: JANELA,
      ocupadas,
    });

    const contadas = manchas.flatMap((m) => m.membros).sort();
    expect(contadas).toEqual(["a", "b", "c", "x", "y"]);
    // E foi por adopção que se salvaram, não por sorte.
    expect(manchas.some((m) => m.adoptou > 0)).toBe(true);
  });

  it("com o quadro cheio desde o primeiro, abre a procura à janela toda", () => {
    /* Não há nenhuma mancha colocada para adoptar seja quem for: o degrau 3
       tem de encontrar lugar longe, e ninguém se perde. */
    const perto = [sobra(700, 500, "a"), sobra(712, 506, "b")];
    const ocupadas = cercar(706, 503);
    const manchas = colocarManchas(perto, { chip: CHIP, janela: JANELA, ocupadas });
    expect(manchas.flatMap((m) => m.membros).sort()).toEqual(["a", "b"]);
    expect(manchas[0].afastada).toBe(true);
  });

  it("uma janela sem uma única posição livre não inventa: devolve o que pode", () => {
    /* O único caso em que fica gente por contar, e é honesto que fique: a
       alternativa seria escrever o algarismo por cima de um nome, e um nome
       apagado é pior do que uma conta por escrever. O quadro seguinte tenta
       de novo. */
    const janela: Janela = { x0: 0, y0: 0, x1: 40, y1: 40 };
    const ocupadas: Caixa[] = [{ x: -50, y: -50, l: 200, a: 200 }];
    const manchas = colocarManchas([sobra(20, 20, "a"), sobra(24, 22, "b")], {
      chip: CHIP,
      janela,
      ocupadas,
    });
    expect(manchas).toEqual([]);
  });
});

describe("colocarManchas — invariantes, em quadros ao acaso", () => {
  /** Gerador com semente: a mesma corrida dá sempre os mesmos quadros. */
  const semente = (s: number) => () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };

  it("nenhuma coudelaria fica sem conta e nenhum algarismo toca noutra caixa", () => {
    const aleatorio = semente(20260907);
    let comAdopcao = 0;

    for (let volta = 0; volta < 600; volta++) {
      /* Um quadro com a forma do problema a sério, e não com nomes atirados
         ao acaso pela lona.
         Nomes espalhados por igual quase nunca cercam nada: o que cerca é a
         geografia. Metade das coudelarias está no mesmo vale, cada nome que
         ganhou a colocação assenta encostado ao alfinete dele, e por isso os
         nomes colocados formam uma coroa à volta do próprio vale de onde as
         sobras são. É esse aperto — e não a densidade média da lona — que
         esgota os vinte e cinco sítios. */
      const cx = 260 + aleatorio() * 800;
      const cy = 160 + aleatorio() * 520;
      const ocupadas: Caixa[] = [];
      const noVale = 9 + Math.floor(aleatorio() * 5);
      for (let i = 0; i < noVale; i++) {
        const g = (2 * Math.PI * i) / noVale + aleatorio() * 0.4;
        const r = 30 + aleatorio() * 70;
        const largura = 120 + aleatorio() * 60;
        ocupadas.push({
          x: cx + r * Math.cos(g) - (aleatorio() < 0.5 ? largura : 0),
          y: cy + r * Math.sin(g) - 14,
          l: largura,
          a: 28 + aleatorio() * 8,
        });
      }
      for (let i = 0; i < 6; i++) {
        ocupadas.push({
          x: 2 + aleatorio() * (JANELA.x1 - 180),
          y: 2 + aleatorio() * (JANELA.y1 - 40),
          l: 120 + aleatorio() * 60,
          a: 28 + aleatorio() * 8,
        });
      }
      const sobras: Sobra<string>[] = [];
      const quantas = 2 + Math.floor(aleatorio() * 9);
      for (let i = 0; i < quantas; i++) {
        sobras.push(sobra(cx + (aleatorio() - 0.5) * 70, cy + (aleatorio() - 0.5) * 60, `c${i}`));
      }

      const antesDoPasso = ocupadas.length;
      const manchas = colocarManchas(sobras, { chip: CHIP, janela: JANELA, ocupadas });

      // 1. Ninguém se perde e ninguém é contado duas vezes.
      const contadas = manchas.flatMap((m) => m.membros).sort();
      expect(contadas).toEqual(sobras.flatMap((s) => [...s.membros]).sort());

      // 2. Nenhum algarismo toca num nome nem noutro algarismo.
      const chips = manchas.map(caixaDe);
      for (let i = 0; i < chips.length; i++) {
        for (let j = 0; j < antesDoPasso; j++) {
          expect(cruza(chips[i], ocupadas[j], FOLGA_MANCHA)).toBe(false);
        }
        for (let j = i + 1; j < chips.length; j++) {
          expect(cruza(chips[i], chips[j], FOLGA_MANCHA)).toBe(false);
        }
        // 3. E nenhum sai da janela útil.
        expect(chips[i].x).toBeGreaterThanOrEqual(JANELA.x0);
        expect(chips[i].y).toBeGreaterThanOrEqual(JANELA.y0);
        expect(chips[i].x + chips[i].l).toBeLessThanOrEqual(JANELA.x1);
        expect(chips[i].y + chips[i].a).toBeLessThanOrEqual(JANELA.y1);
      }

      // 4. As manchas colocadas ficam na lista de ocupadas, para o quadro
      //    seguinte não escrever um nome por cima de um algarismo.
      expect(ocupadas.length).toBe(antesDoPasso + manchas.length);

      if (manchas.some((m) => m.adoptou > 0)) comAdopcao++;
    }

    /* O ramo da adopção não é decoração: nestes quadros dispara mesmo. Se um
       dia deixar de disparar, o teste passa a estar a medir outra coisa. */
    expect(comAdopcao).toBeGreaterThan(0);
  });

  it("a decisão é determinista — o mesmo quadro dá o mesmo desenho", () => {
    const sobras = [
      sobra(700, 500, "a"),
      sobra(712, 506, "b"),
      sobra(694, 511, "c"),
      sobra(300, 300, "x"),
    ];
    const um = colocarManchas(sobras, { chip: CHIP, janela: JANELA, ocupadas: [] });
    const dois = colocarManchas(sobras, { chip: CHIP, janela: JANELA, ocupadas: [] });
    expect(dois).toEqual(um);
  });
});

describe("ajuntarSobras", () => {
  it("junta o que está a menos de um raio e separa o resto", () => {
    const grupos = ajuntarSobras([
      sobra(100, 100, "a"),
      sobra(120, 110, "b"),
      sobra(400, 400, "c"),
    ]);
    expect(grupos.map((g) => g.length).sort()).toEqual([1, 2]);
  });

  it("lidera quem tem mais vizinhos, e por isso não depende da ordem de entrada", () => {
    const pontos = [
      sobra(500, 500, "solto"),
      sobra(100, 100, "a"),
      sobra(110, 105, "b"),
      sobra(120, 110, "c"),
    ];
    const directo = ajuntarSobras(pontos).map((g) => g.length);
    const invertido = ajuntarSobras([...pontos].reverse()).map((g) => g.length);
    expect(directo.sort()).toEqual(invertido.sort());
  });
});
