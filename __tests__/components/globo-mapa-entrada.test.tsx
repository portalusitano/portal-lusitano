/**
 * A entrada do `<GloboMapa>` corre **uma vez**.
 *
 * O componente tem uma `assinatura` — o enquadramento reduzido a texto — cuja
 * única razão de existir é essa, e está escrita lá: o directório passa
 * `coudelarias={resultados.filter(...)}`, que é um array novo a cada filtro, a
 * cada ordenação e a cada página, quase sempre com o mesmo enquadramento.
 *
 * A guarda não valia. O efeito da entrada dependia também de `pintar`, e
 * `pintar` muda de identidade sempre que a lista muda de identidade: o globo
 * voltava a partir de 48° a oeste e refazia o voo de 1400ms a meio de uma
 * lista que a pessoa estava a percorrer.
 *
 * Mede-se pelo relógio, que é o que o voo consome: um `requestAnimationFrame`
 * encadeado durante 1400ms. O relógio é servido à mão — um quadro de 16ms de
 * cada vez — porque é o encadeamento que distingue os dois casos: um voo novo
 * pede oitenta e tal quadros seguidos, um repintar pede um. Contar pedidos sem
 * servir nenhum dava um em ambos os casos e não media nada.
 *
 * Sem canvas — o jsdom não tem contexto 2D — o `pintar` sai à entrada; o voo é
 * anterior a ele e encadeia na mesma, que é o que aqui se conta.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import GloboMapa from "@/components/GloboMapa";
import type { CoudelariaNoMapa } from "@/lib/coordenadas-coudelarias";

const coudelaria = (id: string, lat: number, lng: number): CoudelariaNoMapa => ({
  id,
  nome: `Coudelaria ${id}`,
  slug: `coudelaria-${id}`,
  descricao: "",
  localizacao: "Golegã",
  regiao: "Ribatejo",
  is_pro: false,
  destaque: false,
  coordenadas_lat: lat,
  coordenadas_lng: lng,
});

/** As duas das pontas fixam a caixa; as do meio podem ir e vir sem a mexer. */
const PONTAS = [coudelaria("norte", 41.15, -8.62), coudelaria("sul", 37.6, -7.66)];
const MEIO = [coudelaria("meio-a", 39.4, -8.48), coudelaria("meio-b", 38.57, -7.9)];

describe("GloboMapa — a entrada corre uma vez", () => {
  let pedidos = 0;
  let fila: FrameRequestCallback[] = [];
  let agora = 0;
  let rafOriginal: typeof globalThis.requestAnimationFrame;
  let cafOriginal: typeof globalThis.cancelAnimationFrame;

  /** Serve até `n` quadros de 16ms. Devolve quantos serviu. */
  const correr = async (n: number) => {
    let servidos = 0;
    for (let i = 0; i < n && fila.length; i++) {
      const lote = fila;
      fila = [];
      agora += 16;
      await act(async () => {
        for (const cb of lote) cb(agora);
      });
      servidos += lote.length;
    }
    return servidos;
  };

  beforeEach(() => {
    pedidos = 0;
    fila = [];
    agora = 0;
    rafOriginal = globalThis.requestAnimationFrame;
    cafOriginal = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      pedidos++;
      fila.push(cb);
      return pedidos;
    }) as typeof globalThis.requestAnimationFrame;
    globalThis.cancelAnimationFrame = (() => {}) as typeof globalThis.cancelAnimationFrame;
    vi.spyOn(performance, "now").mockImplementation(() => agora);
    /* A geometria tem de chegar: sem ela o efeito da entrada sai à primeira
       linha e o teste não exercitava nada. O mínimo que o `topojson-client`
       aceita chega — o que se mede é o relógio, não o desenho. */
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            mundo: {
              type: "Topology",
              objects: { countries: { type: "GeometryCollection", geometries: [] } },
              arcs: [],
            },
            iberia: { type: "FeatureCollection", features: [] },
            rotulos: [],
          }),
        }) as unknown as Promise<Response>
    );
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = rafOriginal;
    globalThis.cancelAnimationFrame = cafOriginal;
    vi.restoreAllMocks();
  });

  it("uma lista nova com o mesmo enquadramento não relança o voo de 1400ms", async () => {
    const { rerender } = render(<GloboMapa coudelarias={[...PONTAS, ...MEIO]} />);
    await act(async () => {});
    // O voo de entrada: corre uma vez, e é ele que fixa a escala de referência.
    const quadrosDaEntrada = await correr(400);
    expect(quadrosDaEntrada).toBeGreaterThan(20);

    // Array novo, conteúdo diferente, MESMAS pontas: o enquadramento não muda.
    pedidos = 0;
    await act(async () => {
      rerender(<GloboMapa coudelarias={[...PONTAS, MEIO[0]]} />);
    });
    const quadrosDoFiltro = await correr(400);

    pedidos = 0;
    await act(async () => {
      rerender(<GloboMapa coudelarias={[...PONTAS]} />);
    });
    const quadrosDoSegundoFiltro = await correr(400);

    /* Filtrar pede um repintar, não um voo. A fronteira é larga de propósito:
       o que se proíbe é a ordem de grandeza do voo (dezenas de quadros
       encadeados), não um quadro a mais ou a menos. */
    expect(quadrosDoFiltro).toBeLessThan(5);
    expect(quadrosDoSegundoFiltro).toBeLessThan(5);
    expect(quadrosDoFiltro).toBeLessThan(quadrosDaEntrada / 4);
  });
});
