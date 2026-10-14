import { describe, expect, it } from "vitest";

import { LIMIAR_PHASH } from "@/lib/fotos/impressao";
import {
  anuncioEstaEmPe,
  fotografiasParecidas,
  parecidasComUmaFotografia,
  type AnuncioDaFotografia,
  type FotografiaParaSinais,
} from "@/lib/fotos/sinais";

/**
 * Os sinais das fotografias.
 *
 * O que estes testes protegem não é a aritmética — é a fronteira, tal como no
 * `__tests__/lib/documentos-sinais.test.ts`. Um sinal **conta factos** e nunca
 * decide nada, e as duas maneiras de atravessar a fronteira são simétricas e
 * igualmente caras: levantar a mão sobre um vendedor honesto (dois anúncios
 * anónimos tratados como «dois vendedores») e não a levantar sobre a mesma
 * fotografia em duas contas.
 *
 * Por isso cada regra tem aqui um caso que deve disparar e um caso vizinho,
 * quase igual, que **não** deve.
 */

/** Uma impressão a uma distância conhecida de outra, virando bits à mão. */
function impressaoA(distancia: number, base = "0000000000000000"): string {
  const bits = base.split("").map((c) => parseInt(c, 16));
  let porVirar = distancia;
  for (let i = 0; i < 16 && porVirar > 0; i++) {
    for (let b = 0; b < 4 && porVirar > 0; b++) {
      bits[i] ^= 1 << b;
      porVirar--;
    }
  }
  return bits.map((v) => v.toString(16)).join("");
}

const LONGE = "ffffffff00000000";
const OUTRO_LONGE = "00000000ffffffff";

function foto(
  cavaloId: string,
  url: string,
  phash: string,
  extra: Partial<FotografiaParaSinais> = {}
): FotografiaParaSinais {
  return {
    cavaloId,
    url,
    phash,
    phashCentro: phash,
    dhash: phash,
    dhashCentro: phash,
    largura: 1600,
    altura: 1200,
    ...extra,
  };
}

function anuncio(
  id: string,
  user_id: string | null,
  status: string | null = "active"
): AnuncioDaFotografia {
  return { id, user_id, status };
}

describe("a fotografia repetida em dois vendedores", () => {
  it("dispara quando as duas contas são conhecidas e diferentes", () => {
    const sinais = fotografiasParecidas(
      [foto("c1", "a.jpg", impressaoA(0)), foto("c2", "b.jpg", impressaoA(3))],
      [anuncio("c1", "v1"), anuncio("c2", "v2")]
    );
    expect(sinais).toHaveLength(1);
    expect(sinais[0].tipo).toBe("fotografia_parecida");
    expect(sinais[0].distanciaPhash).toBe(3);
    expect(sinais[0].vendedores).toEqual(["v1", "v2"]);
    expect(sinais[0].anunciosSemVendedor).toEqual([]);
    expect(sinais[0].fotografias.map((f) => f.cavaloId)).toEqual(["c1", "c2"]);
    expect(sinais[0].fotografias.map((f) => f.vendedor)).toEqual(["v1", "v2"]);
  });

  it("NÃO dispara quando é o mesmo vendedor a republicar", () => {
    // O caso vizinho: exactamente a mesma fotografia, exactamente a mesma
    // distância, e uma explicação inocente que é a regra e não a excepção.
    const sinais = fotografiasParecidas(
      [foto("c1", "a.jpg", impressaoA(0)), foto("c2", "b.jpg", impressaoA(3))],
      [anuncio("c1", "v1"), anuncio("c2", "v1")]
    );
    expect(sinais).toEqual([]);
  });

  it("NÃO trata dois anúncios sem conta como dois vendedores", () => {
    // A armadilha que este repositório já pisou uma vez. Sem esta regra todos
    // os anúncios anónimos se acusavam uns aos outros — e uma base nova é
    // quase toda anónima.
    const sinais = fotografiasParecidas(
      [foto("c1", "a.jpg", impressaoA(0)), foto("c2", "b.jpg", impressaoA(1))],
      [anuncio("c1", null), anuncio("c2", null)]
    );
    expect(sinais).toEqual([]);
  });

  it("NÃO trata um anónimo mais um conhecido como dois vendedores", () => {
    const sinais = fotografiasParecidas(
      [foto("c1", "a.jpg", impressaoA(0)), foto("c2", "b.jpg", impressaoA(1))],
      [anuncio("c1", "v1"), anuncio("c2", null)]
    );
    expect(sinais).toEqual([]);
  });

  it("com a opção desligada, mostra tudo e diz quem não tem conta", () => {
    const sinais = fotografiasParecidas(
      [foto("c1", "a.jpg", impressaoA(0)), foto("c2", "b.jpg", impressaoA(1))],
      [anuncio("c1", "v1"), anuncio("c2", null)],
      { soVendedoresDiferentes: false }
    );
    expect(sinais).toHaveLength(1);
    expect(sinais[0].vendedores).toEqual(["v1"]);
    // O anónimo aparece à parte, e não como um vendedor.
    expect(sinais[0].anunciosSemVendedor).toEqual(["c2"]);
  });
});

describe("o que não conta como repetição", () => {
  it("duas fotografias do mesmo anúncio nunca são um sinal", () => {
    // Dez fotografias do mesmo cavalo na mesma sessão são parecidas por
    // construção.
    const sinais = fotografiasParecidas(
      [foto("c1", "a.jpg", impressaoA(0)), foto("c1", "b.jpg", impressaoA(1))],
      [anuncio("c1", "v1")],
      { soVendedoresDiferentes: false }
    );
    expect(sinais).toEqual([]);
  });

  it("duas fotografias diferentes não são um sinal", () => {
    const sinais = fotografiasParecidas(
      [foto("c1", "a.jpg", impressaoA(0)), foto("c2", "b.jpg", LONGE)],
      [anuncio("c1", "v1"), anuncio("c2", "v2")]
    );
    expect(sinais).toEqual([]);
  });

  it("um par exactamente no limiar entra, e um bit acima já não", () => {
    const dentro = fotografiasParecidas(
      [foto("c1", "a.jpg", impressaoA(0)), foto("c2", "b.jpg", impressaoA(LIMIAR_PHASH))],
      [anuncio("c1", "v1"), anuncio("c2", "v2")]
    );
    expect(dentro).toHaveLength(1);

    const fora = fotografiasParecidas(
      [foto("c1", "a.jpg", impressaoA(0)), foto("c2", "b.jpg", impressaoA(LIMIAR_PHASH + 1))],
      [anuncio("c1", "v1"), anuncio("c2", "v2")]
    );
    expect(fora).toEqual([]);
  });

  it("anúncios que não estão em pé ficam de fora por omissão", () => {
    // Um cavalo revendido partilha legitimamente as fotografias com o anúncio
    // de onde veio.
    const fotos = [foto("c1", "a.jpg", impressaoA(0)), foto("c2", "b.jpg", impressaoA(2))];
    expect(
      fotografiasParecidas(fotos, [anuncio("c1", "v1"), anuncio("c2", "v2", "vendido")])
    ).toEqual([]);
    expect(
      fotografiasParecidas(fotos, [anuncio("c1", "v1"), anuncio("c2", "v2", "reservado")])
    ).toHaveLength(1);
    expect(
      fotografiasParecidas(fotos, [anuncio("c1", "v1"), anuncio("c2", "v2", "vendido")], {
        soAnunciosEmPe: false,
      })
    ).toHaveLength(1);
  });

  it("uma fotografia de um anúncio desconhecido é deitada fora em silêncio", () => {
    // Sem a linha do anúncio não se sabe o vendedor nem o estado, e adivinhar
    // qualquer um dos dois era pior do que não dizer nada.
    const sinais = fotografiasParecidas(
      [foto("c1", "a.jpg", impressaoA(0)), foto("cX", "b.jpg", impressaoA(1))],
      [anuncio("c1", "v1")]
    );
    expect(sinais).toEqual([]);
  });

  it("uma impressão mal formada não entra e não rebenta a varredura", () => {
    const sinais = fotografiasParecidas(
      [
        foto("c1", "a.jpg", impressaoA(0)),
        foto("c2", "b.jpg", "nao-e-uma-impressao"),
        foto("c3", "c.jpg", impressaoA(2)),
      ],
      [anuncio("c1", "v1"), anuncio("c2", "v2"), anuncio("c3", "v3")]
    );
    expect(sinais).toHaveLength(1);
    expect(sinais[0].fotografias.map((f) => f.cavaloId)).toEqual(["c1", "c3"]);
  });
});

describe("o enquadramento diz de que lado está o recorte", () => {
  it("inverte-se quando as duas fotografias trocam de ordem na saída", () => {
    // `c2` inteira coincide com o centro de `c1`: `c2` parece um recorte de
    // `c1`. Como a saída escreve `c1` primeiro (ordem por id), o campo tem de
    // dizer `centro-inteira` e não `inteira-centro`.
    //
    // Os dois enquadramentos que não se devem alinhar levam valores
    // **diferentes** um do outro: com a mesma constante nos dois, o par
    // `centro-inteira` dava distância zero e ganhava por engano — o teste
    // passava a medir a constante em vez de medir o código.
    const c1 = foto("c1", "a.jpg", LONGE, { phashCentro: impressaoA(0) });
    const c2 = foto("c2", "b.jpg", impressaoA(2), { phashCentro: OUTRO_LONGE });
    const sinais = fotografiasParecidas([c2, c1], [anuncio("c1", "v1"), anuncio("c2", "v2")]);
    expect(sinais).toHaveLength(1);
    expect(sinais[0].fotografias.map((f) => f.cavaloId)).toEqual(["c1", "c2"]);
    expect(sinais[0].enquadramento).toBe("centro-inteira");
  });
});

describe("a saída é estável e não é um juízo", () => {
  const fotos = [
    foto("c3", "z.jpg", impressaoA(6)),
    foto("c1", "a.jpg", impressaoA(0)),
    foto("c2", "b.jpg", impressaoA(2)),
  ];
  const anuncios = [anuncio("c1", "v1"), anuncio("c2", "v2"), anuncio("c3", "v3")];

  it("a mesma entrada por outra ordem dá exactamente a mesma saída", () => {
    // Um painel cuja lista muda de ordem entre dois carregamentos faz quem
    // revê perder o sítio onde ia.
    expect(fotografiasParecidas([...fotos].reverse(), [...anuncios].reverse())).toEqual(
      fotografiasParecidas(fotos, anuncios)
    );
  });

  it("os mais próximos vêm primeiro", () => {
    const sinais = fotografiasParecidas(fotos, anuncios);
    const distancias = sinais.map((s) => s.distanciaPhash);
    expect([...distancias].sort((a, b) => a - b)).toEqual(distancias);
  });

  it("não devolve juízo nenhum — só factos", () => {
    // A garantia que este módulo dá é negativa e é preciso escrevê-la: nada do
    // que sai daqui pode ser lido como uma decisão sobre um anúncio. É a mesma
    // lista proibida do `__tests__/lib/documentos-sinais.test.ts`, mais as
    // palavras que só um sinal sobre fotografias seria tentado a escrever.
    const sinais = fotografiasParecidas(fotos, anuncios);
    expect(sinais.length).toBeGreaterThan(0);
    const chaves = new Set(sinais.flatMap((s) => Object.keys(s)));
    for (const proibida of [
      "gravidade",
      "risco",
      "score",
      "pontuacao",
      "accao",
      "decisao",
      "confianca",
      "percentagem",
      "semelhanca",
      "roubada",
      "copia",
      "fraude",
      "suspeita",
    ]) {
      expect(chaves.has(proibida)).toBe(false);
    }
    // E o mesmo no texto de tudo o que sai, não só nas chaves de topo.
    const texto = JSON.stringify(sinais).toLowerCase();
    for (const palavra of ["roubad", "fraude", "suspeit", "copiad", "%"]) {
      expect(texto).not.toContain(palavra);
    }
  });

  it("cada distância é um inteiro entre 0 e 64, e não uma nota", () => {
    for (const s of fotografiasParecidas(fotos, anuncios)) {
      expect(Number.isInteger(s.distanciaPhash)).toBe(true);
      expect(s.distanciaPhash).toBeGreaterThanOrEqual(0);
      expect(s.distanciaPhash).toBeLessThanOrEqual(64);
      expect(Number.isInteger(s.distanciaDhash)).toBe(true);
    }
  });
});

describe("uma fotografia nova contra as que já lá estão", () => {
  it("devolve só os pares que envolvem a nova", () => {
    const nova = foto("cN", "nova.jpg", impressaoA(0));
    const existentes = [
      foto("c1", "a.jpg", impressaoA(2)),
      foto("c2", "b.jpg", impressaoA(3)),
      foto("c3", "c.jpg", LONGE),
    ];
    const sinais = parecidasComUmaFotografia(nova, existentes, [
      anuncio("cN", "vN"),
      anuncio("c1", "v1"),
      anuncio("c2", "v2"),
      anuncio("c3", "v3"),
    ]);
    expect(sinais).toHaveLength(2);
    for (const s of sinais) {
      expect(s.fotografias.some((f) => f.cavaloId === "cN")).toBe(true);
    }
  });

  it("não se compara consigo própria", () => {
    const nova = foto("cN", "nova.jpg", impressaoA(0));
    expect(parecidasComUmaFotografia(nova, [nova], [anuncio("cN", "vN")])).toEqual([]);
  });
});

describe("os estados que contam", () => {
  it("são os mesmos do lib/documentos/sinais.ts", () => {
    expect(anuncioEstaEmPe({ status: "active" })).toBe(true);
    expect(anuncioEstaEmPe({ status: "reservado" })).toBe(true);
    expect(anuncioEstaEmPe({ status: "vendido" })).toBe(false);
    expect(anuncioEstaEmPe({ status: null })).toBe(false);
  });
});
