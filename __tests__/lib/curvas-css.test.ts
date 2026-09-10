import { describe, it, expect } from "vitest";
import { bezierCss, lerCurva, lerDuracao } from "@/lib/curvas-css";

describe("lerDuracao", () => {
  it("lê milissegundos", () => {
    expect(lerDuracao("320ms")).toBe(320);
  });

  it("lê segundos e converte", () => {
    expect(lerDuracao("0.5s")).toBe(500);
  });

  it("aceita o espaço que o `getPropertyValue` deixa à frente", () => {
    expect(lerDuracao(" 200ms ")).toBe(200);
  });

  it("recusa o que não é uma duração", () => {
    expect(lerDuracao("")).toBeNull();
    expect(lerDuracao("ease-out")).toBeNull();
    expect(lerDuracao("320")).toBeNull();
  });
});

describe("lerCurva", () => {
  it("lê os quatro números de um cubic-bezier", () => {
    const f = lerCurva("cubic-bezier(0, 0, 0.2, 1)");
    expect(f).not.toBeNull();
    expect(f!(0)).toBe(0);
    expect(f!(1)).toBe(1);
  });

  it("recusa palavras-chave e listas do tamanho errado", () => {
    expect(lerCurva("ease-out")).toBeNull();
    expect(lerCurva("cubic-bezier(0, 0, 0.2)")).toBeNull();
    expect(lerCurva("cubic-bezier(0, 0, x, 1)")).toBeNull();
  });
});

describe("bezierCss", () => {
  /* A linear é a que se pode verificar de cabeça: com os controlos em 1/3 e
     2/3 dos dois eixos, a curva é a diagonal. */
  const linear = bezierCss(1 / 3, 1 / 3, 2 / 3, 2 / 3);

  it("é a identidade quando os controlos estão na diagonal", () => {
    for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      expect(linear(t)).toBeCloseTo(t, 4);
    }
  });

  it("fixa os extremos", () => {
    expect(linear(0)).toBe(0);
    expect(linear(1)).toBe(1);
  });

  it("trata o que cai fora de 0..1 sem devolver disparates", () => {
    expect(linear(-1)).toBe(0);
    expect(linear(2)).toBe(1);
    expect(linear(NaN)).toBe(0);
  });

  it("nunca recua: o movimento não anda para trás", () => {
    const easeOut = bezierCss(0, 0, 0.2, 1);
    let anterior = -1;
    for (let i = 0; i <= 100; i++) {
      const y = easeOut(i / 100);
      expect(y).toBeGreaterThanOrEqual(anterior);
      anterior = y;
    }
  });

  /* O `--ease-out` do site é `cubic-bezier(0, 0, .2, 1)`: sai a direito e
     trava no fim. A metade do tempo já fez a maior parte do caminho — é essa
     a propriedade que faz a escolha parecer que responde de imediato, e é ela
     que se fixa aqui para não se perder numa afinação distraída. */
  it("o --ease-out do site já fez mais de três quartos a meio do tempo", () => {
    const easeOut = bezierCss(0, 0, 0.2, 1);
    expect(easeOut(0.5)).toBeGreaterThan(0.75);
    expect(easeOut(0.5)).toBeLessThan(0.95);
  });

  /* E o `--ease-in-out-cubic` arranca devagar, que é o que o distingue: é a
     curva de entrar num sítio, e um submenu que salta no primeiro quadro não
     se lê como entrada. Ao quarto do tempo ainda não fez um quinto. */
  it("o --ease-in-out-cubic arranca devagar e o --ease-out não", () => {
    const entrar = bezierCss(0.645, 0.045, 0.355, 1);
    const sair = bezierCss(0, 0, 0.2, 1);
    expect(entrar(0.25)).toBeLessThan(0.2);
    expect(sair(0.25)).toBeGreaterThan(0.4);
    expect(entrar(0.5)).toBeCloseTo(0.5, 1);
  });
});
