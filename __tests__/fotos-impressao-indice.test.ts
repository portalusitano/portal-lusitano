import { describe, expect, it } from "vitest";

import { distanciaDeHamming } from "@/lib/fotos/impressao";
import {
  blocosDaImpressao,
  BLOCOS_POR_IMPRESSAO,
  chavesDeProcura,
  consultaDeCandidatas,
  DISTANCIA_GARANTIDA,
  IndiceDeBlocos,
  partilhamBloco,
} from "@/lib/fotos/indice";

import { aleatorio } from "./fotos-impressao-fixtures";

/**
 * Os blocos indexáveis.
 *
 * O que aqui se protege é uma promessa exacta e fácil de partir sem dar por
 * isso: **duas impressões a distância ≤ 3 partilham sempre pelo menos um dos
 * quatro blocos.** É o princípio dos pombais, portanto é uma verdade e não uma
 * estatística — mas basta um `slice` com o índice trocado para o código deixar
 * de a cumprir, e nada mais no sistema daria sinal disso: o índice devolveria
 * menos candidatas e as fotografias repetidas passavam a escapar em silêncio.
 *
 * Por isso a promessa é verificada por força bruta sobre milhares de pares
 * gerados, e não deduzida.
 */

/** Vira `quantos` bits escolhidos ao acaso numa impressão. */
function virarBits(impressao: string, quantos: number, rnd: () => number): string {
  const digitos = impressao.split("").map((c) => parseInt(c, 16));
  const posicoes = new Set<number>();
  while (posicoes.size < quantos) posicoes.add(Math.floor(rnd() * 64));
  for (const p of posicoes) digitos[p >> 2] ^= 1 << (3 - (p & 3));
  return digitos.map((v) => v.toString(16)).join("");
}

function impressaoAoAcaso(rnd: () => number): string {
  let s = "";
  for (let i = 0; i < 16; i++) s += Math.floor(rnd() * 16).toString(16);
  return s;
}

describe("a promessa dos blocos", () => {
  it("parte a impressão em quatro pedaços de 16 bits, sem perder nada", () => {
    const impressao = "0123456789abcdef";
    const blocos = blocosDaImpressao(impressao);
    expect(blocos).toEqual(["0123", "4567", "89ab", "cdef"]);
    expect(blocos).toHaveLength(BLOCOS_POR_IMPRESSAO);
    expect(blocos.join("")).toBe(impressao);
  });

  it("nenhum par até à distância garantida escapa — verificado por força bruta", () => {
    const rnd = aleatorio(20260904);
    let pares = 0;
    for (let i = 0; i < 4000; i++) {
      const a = impressaoAoAcaso(rnd);
      for (let d = 0; d <= DISTANCIA_GARANTIDA; d++) {
        const b = virarBits(a, d, rnd);
        expect(distanciaDeHamming(a, b)).toBe(d);
        // A promessa. Se isto falhar uma única vez, o índice perde pares.
        expect(partilhamBloco(a, b)).toBe(true);
        pares++;
      }
    }
    expect(pares).toBe(4000 * (DISTANCIA_GARANTIDA + 1));
  });

  it("acima da distância garantida deixa de ser garantia, e mede-se quanto apanha", () => {
    // Não se promete o que não se cumpre: entre 4 e 8 bits o índice apanha a
    // maior parte dos pares mas não todos, e é preciso que esteja escrito que
    // é assim de propósito.
    const rnd = aleatorio(42);
    const taxas: Record<number, number> = {};
    for (let d = DISTANCIA_GARANTIDA + 1; d <= 8; d++) {
      let apanhados = 0;
      const total = 3000;
      for (let i = 0; i < total; i++) {
        const a = impressaoAoAcaso(rnd);
        if (partilhamBloco(a, virarBits(a, d, rnd))) apanhados++;
      }
      taxas[d] = apanhados / total;
    }
    // A 4 bits ainda apanha a esmagadora maioria; a 8 já perde bastante.
    expect(taxas[4]).toBeGreaterThan(0.9);
    expect(taxas[8]).toBeGreaterThan(0.3);
    // E é monótona decrescente: quanto mais longe, menos apanha.
    for (let d = DISTANCIA_GARANTIDA + 2; d <= 8; d++) {
      expect(taxas[d]).toBeLessThanOrEqual(taxas[d - 1] + 0.02);
    }
  });

  it("duas impressões sem relação quase nunca partilham um bloco", () => {
    // É isto que faz o índice valer a pena: se partilhassem muitas vezes, cada
    // consulta devolvia meia tabela e o índice não filtrava nada. A
    // probabilidade teórica é 1 − (1 − 2⁻¹⁶)⁴ ≈ 0,006%.
    const rnd = aleatorio(7);
    let colisoes = 0;
    const total = 20000;
    for (let i = 0; i < total; i++) {
      if (partilhamBloco(impressaoAoAcaso(rnd), impressaoAoAcaso(rnd))) colisoes++;
    }
    expect(colisoes / total).toBeLessThan(0.01);
  });
});

describe("as chaves de procura", () => {
  it("levam a posição, senão um bloco casava com o sítio errado", () => {
    const chaves = chavesDeProcura({
      phash: "aaaabbbbccccdddd",
      phashCentro: "aaaabbbbccccdddd",
    });
    expect(chaves).toEqual(["0:aaaa", "1:bbbb", "2:cccc", "3:dddd"]);
  });

  it("indexa os dois enquadramentos", () => {
    // Sem o centro indexado, o índice nunca juntava uma fotografia ao recorte
    // dela — que é exactamente o caso que o segundo enquadramento existe para
    // apanhar.
    const chaves = chavesDeProcura({
      phash: "0000000000000000",
      phashCentro: "1111111111111111",
    });
    expect(chaves).toContain("0:0000");
    expect(chaves).toContain("0:1111");
    expect(chaves).toHaveLength(8);
  });

  it("recusa uma impressão mal formada", () => {
    expect(() => blocosDaImpressao("nao")).toThrow();
    expect(() => blocosDaImpressao("AAAABBBBCCCCDDDD")).toThrow();
  });
});

describe("o índice em memória", () => {
  interface Entrada {
    id: string;
    phash: string;
    phashCentro: string;
  }

  it("devolve as candidatas certas e não a tabela toda", () => {
    const rnd = aleatorio(99);
    const entradas: Entrada[] = [];
    for (let i = 0; i < 2000; i++) {
      const phash = impressaoAoAcaso(rnd);
      entradas.push({ id: `f${i}`, phash, phashCentro: impressaoAoAcaso(rnd) });
    }
    // Uma vizinha plantada a distância 3 da primeira.
    const alvo = entradas[0];
    const vizinha: Entrada = {
      id: "vizinha",
      phash: virarBits(alvo.phash, 3, rnd),
      phashCentro: impressaoAoAcaso(rnd),
    };
    entradas.push(vizinha);

    const indice = new IndiceDeBlocos(entradas);
    const candidatas = indice.candidatas(alvo);

    expect(candidatas.map((c) => c.id)).toContain("vizinha");
    // E o índice filtra a sério: de 2001 entradas devolve um punhado.
    expect(candidatas.length).toBeLessThan(20);
  });

  it("uma entrada encontra-se sempre a si própria", () => {
    const entrada = { id: "a", phash: "0123456789abcdef", phashCentro: "fedcba9876543210" };
    const indice = new IndiceDeBlocos([entrada]);
    expect(indice.candidatas(entrada)).toEqual([entrada]);
  });

  it("uma entrada aparece uma vez só, mesmo partilhando vários blocos", () => {
    // Os dois enquadramentos iguais dão oito chaves que apontam para quatro
    // baldes; sem o `Set` a mesma entrada saía repetida.
    const entrada = { id: "a", phash: "1111111111111111", phashCentro: "1111111111111111" };
    const indice = new IndiceDeBlocos([entrada]);
    expect(indice.candidatas(entrada)).toHaveLength(1);
    expect(indice.quantosBaldes).toBe(4);
  });

  it("um índice vazio devolve lista vazia em vez de rebentar", () => {
    const indice = new IndiceDeBlocos<Entrada>();
    expect(
      indice.candidatas({ phash: "0000000000000000", phashCentro: "0000000000000000" })
    ).toEqual([]);
  });
});

describe("a consulta que a base faria", () => {
  it("procura pelos oito blocos e limita-se a anúncios em pé", () => {
    const { sql, parametros } = consultaDeCandidatas({
      phash: "0123456789abcdef",
      phashCentro: "fedcba9876543210",
    });
    expect(parametros).toHaveLength(8);
    expect(parametros).toContain("0:0123");
    expect(parametros).toContain("0:fedc");
    // Um anúncio vendido não entra na consulta: é a mesma regra do
    // `anuncioEstaEmPe`, aplicada onde custa menos — na base.
    expect(sql).toContain("c.status IN ('active', 'reservado')");
    expect(sql).toContain("f.blocos && ARRAY[$1, $2, $3, $4, $5, $6, $7, $8]::text[]");
    expect(sql).toContain("LIMIT 500");
  });

  it("os marcadores acompanham os parâmetros", () => {
    const { sql, parametros } = consultaDeCandidatas({
      phash: "aaaaaaaaaaaaaaaa",
      phashCentro: "aaaaaaaaaaaaaaaa",
    });
    // Os dois enquadramentos iguais dão quatro chaves distintas, e a consulta
    // tem de ter quatro marcadores — nem mais, nem menos.
    expect(parametros).toHaveLength(4);
    expect(sql).toContain("ARRAY[$1, $2, $3, $4]::text[]");
  });
});
