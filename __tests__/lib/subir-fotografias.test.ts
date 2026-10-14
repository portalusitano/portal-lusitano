import { describe, it, expect, vi } from "vitest";
import {
  agruparEmVoltas,
  subirFotografias,
  SubidaFalhada,
  ORCAMENTO_POR_VOLTA,
  MAXIMO_POR_VOLTA,
} from "@/lib/subir-fotografias";

const MB = 1024 * 1024;
const pesos = (voltas: { size: number }[][]) => voltas.map((v) => v.map((f) => f.size / MB));

function fotografias(...tamanhos: number[]) {
  return tamanhos.map((mb, i) => ({ size: mb * MB, nome: `${i}` }));
}

describe("agruparEmVoltas", () => {
  it("junta o que cabe no orçamento", () => {
    // Três fotografias já encolhidas: uma volta só.
    expect(pesos(agruparEmVoltas(fotografias(0.7, 0.7, 0.7)))).toEqual([[0.7, 0.7, 0.7]]);
  });

  it("parte quando o peso passa o orçamento", () => {
    const voltas = agruparEmVoltas(fotografias(2, 2, 2));
    expect(voltas).toHaveLength(3);
    for (const v of voltas) {
      expect(v.reduce((s, f) => s + f.size, 0)).toBeLessThanOrEqual(ORCAMENTO_POR_VOLTA);
    }
  });

  it("o caso que motivou este módulo: dez fotografias encolhidas cabem em voltas", () => {
    // Medido num Chromium: uma fotografia de telemóvel encolhida dá ~692 KB.
    // Dez são 6,6 MB — passavam o tecto da plataforma numa volta só.
    const dez = fotografias(...Array(10).fill(0.675));
    const voltas = agruparEmVoltas(dez);

    expect(voltas.length).toBeGreaterThan(1);
    for (const v of voltas) {
      expect(v.reduce((s, f) => s + f.size, 0)).toBeLessThan(4.5 * MB);
    }
    expect(voltas.flat()).toHaveLength(10);
  });

  it("não passa do tecto de fotografias por volta, mesmo sendo todas pequenas", () => {
    const voltas = agruparEmVoltas(fotografias(...Array(12).fill(0.05)));
    for (const v of voltas) expect(v.length).toBeLessThanOrEqual(MAXIMO_POR_VOLTA);
    expect(voltas.flat()).toHaveLength(12);
  });

  it("uma fotografia maior do que o orçamento vai sozinha, e vai à mesma", () => {
    // Recusá-la aqui seria decidir por ela; o que se garante é que não leva
    // companhia e não afunda as outras com ela.
    const voltas = agruparEmVoltas(fotografias(0.5, 9, 0.5));
    expect(pesos(voltas)).toEqual([[0.5], [9], [0.5]]);
  });

  it("mantém a ordem, que é a ordem por que as fotografias vão aparecer", () => {
    const dez = fotografias(...Array(10).fill(1)).map((f, i) => ({ ...f, nome: `f${i}` }));
    expect(
      agruparEmVoltas(dez)
        .flat()
        .map((f) => f.nome)
    ).toEqual(dez.map((f) => f.nome));
  });

  it("nada dentro, nada fora", () => {
    expect(agruparEmVoltas([])).toEqual([]);
  });
});

describe("subirFotografias", () => {
  const comoFicheiros = (n: number, mb = 1) =>
    Array.from({ length: n }, (_, i) => {
      const f = new File([new Uint8Array(1)], `${i}.jpg`, { type: "image/jpeg" });
      Object.defineProperty(f, "size", { value: mb * MB });
      return f;
    });

  it("junta os URLs de todas as voltas, pela ordem certa", async () => {
    const subir = vi.fn(async (lote: File[]) => lote.map((f) => `https://x/${f.name}`));
    const r = await subirFotografias(comoFicheiros(6, 1.5), subir);

    expect(subir.mock.calls.length).toBeGreaterThan(1);
    expect(r.urls).toEqual([
      "https://x/0.jpg",
      "https://x/1.jpg",
      "https://x/2.jpg",
      "https://x/3.jpg",
      "https://x/4.jpg",
      "https://x/5.jpg",
    ]);
    expect(r.voltas).toBe(subir.mock.calls.length);
  });

  it("vai dizendo quantas já subiram", async () => {
    const passos: number[] = [];
    await subirFotografias(comoFicheiros(6, 1.5), async (l) => l.map((f) => f.name), {
      aoProgredir: (subidas) => passos.push(subidas),
    });
    expect(passos.at(-1)).toBe(6);
    expect(passos).toEqual([...passos].sort((a, b) => a - b));
  });

  it("uma falha não deita fora o que já tinha subido", async () => {
    // Sem isto, uma segunda tentativa subia tudo outra vez — e o vendedor
    // pagava a espera duas vezes, na rede fraca de uma cavalariça.
    let volta = 0;
    const erro = await subirFotografias(comoFicheiros(6, 1.5), async (lote) => {
      volta += 1;
      if (volta === 2) throw new Error("a rede caiu");
      return lote.map((f) => `https://x/${f.name}`);
    }).catch((e) => e);

    expect(erro).toBeInstanceOf(SubidaFalhada);
    expect((erro as SubidaFalhada).urlsJaSubidos.length).toBeGreaterThan(0);
    expect((erro as SubidaFalhada).message).toContain("a rede caiu");
  });

  it("as voltas são em fila, não ao mesmo tempo", async () => {
    // Em paralelo disputariam a mesma ligação estreita e acabariam todas mais
    // tarde; e uma falha a meio deixava sem se saber o que subiu.
    let aCorrer = 0;
    let maximoSimultaneo = 0;
    await subirFotografias(comoFicheiros(8, 1.5), async (lote) => {
      aCorrer += 1;
      maximoSimultaneo = Math.max(maximoSimultaneo, aCorrer);
      await new Promise((r) => setTimeout(r, 1));
      aCorrer -= 1;
      return lote.map((f) => f.name);
    });
    expect(maximoSimultaneo).toBe(1);
  });
});
