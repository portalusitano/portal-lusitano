import { describe, expect, it } from "vitest";

import {
  ANOS_LONGEVIDADE_INVULGAR,
  DIAS_DE_GEMEOS,
  DIAS_MINIMOS_ENTRE_PARTOS,
  MESES_IDADE_HABITUAL_DE_PROGENITOR,
  MESES_IDADE_MINIMA_DE_PROGENITOR,
  NIVEL_DA_NATUREZA,
  TIPOS_DE_ACHADO,
  abrandar,
  campoDoAchado,
  eAntepassadoDe,
  fraccaoDaAlturaAdulta,
  identidadeDe,
  papelDoCaminho,
  reunirCoerencia,
} from "@/lib/documentos/coerencia";
import type {
  AscendenteParaCoerencia,
  CavaloParaCoerencia,
  DocumentoParaCoerencia,
} from "@/lib/documentos/coerencia";

/**
 * A fronteira.
 *
 * O que estes testes protegem não é a aritmética das outras três suites — é a
 * promessa que este subsistema faz, e que é a mesma do `lib/documentos/sinais.ts`:
 * o que sai daqui são **factos**, nunca uma decisão sobre um anúncio. E há uma
 * promessa a mais, que é a razão de existir da `natureza`: **um improvável
 * nunca é um impedimento**.
 */

const HOJE = new Date("2026-09-04T12:00:00Z");

function cavalo(p: Partial<CavaloParaCoerencia> & { id: string }): CavaloParaCoerencia {
  return {
    data_nascimento: null,
    idade: null,
    sexo: null,
    altura: null,
    nome: null,
    nome_registo: null,
    registro_apsl: null,
    status: "active",
    ...p,
  };
}

function asc(
  p: Partial<AscendenteParaCoerencia> & { cavalo_id: string; caminho: string }
): AscendenteParaCoerencia {
  return { geracao: p.caminho.split(".").length, nome: null, registo: null, ...p };
}

function doc(p: Partial<DocumentoParaCoerencia> & { id: string }): DocumentoParaCoerencia {
  return { referencia: "ref-1", tipo: "livro_azul", estado: "por_verificar", leitura: null, ...p };
}

// ─── As garantias negativas ──────────────────────────────────────────────────

describe("o que este módulo se recusa a devolver", () => {
  const tudoAMal = {
    cavalos: [
      cavalo({
        id: "c1",
        data_nascimento: "2027-01-01",
        idade: 40,
        altura: 200,
        nome: "Zimbro",
        registro_apsl: "LUS-1",
      }),
      cavalo({ id: "c2", data_nascimento: "1990-01-01", registro_apsl: "LUS-2", sexo: "Égua" }),
    ],
    ascendentes: [
      asc({ cavalo_id: "c1", caminho: "pai", registo: "LUS-2", nome: "Bailarina" }),
      asc({ cavalo_id: "c1", caminho: "mae", registo: "LUS-2", nome: "Outra" }),
    ],
    documentos: [
      doc({ id: "d1", leitura: { microchip: "620015004471234" } }),
      doc({ id: "d2", tipo: "passaporte", leitura: { microchip: "620015004471299" } }),
    ],
    hoje: HOJE,
  };

  it("não devolve juízo nenhum — só factos", () => {
    const achados = reunirCoerencia(tudoAMal);
    expect(achados.length).toBeGreaterThan(0);
    const chaves = new Set(achados.flatMap((a) => Object.keys(a)));
    for (const proibida of [
      "gravidade",
      "risco",
      "score",
      "pontuacao",
      "accao",
      "decisao",
      "verificado",
      "recusar",
    ]) {
      expect(chaves.has(proibida)).toBe(false);
    }
  });

  it("só usa os tipos declarados, e nenhum outro", () => {
    for (const achado of reunirCoerencia(tudoAMal)) {
      expect(TIPOS_DE_ACHADO).toContain(achado.tipo);
      expect(["impossivel", "improvavel"]).toContain(achado.natureza);
    }
  });

  it("dá sempre a mesma saída pela mesma ordem, venham as linhas como vierem", () => {
    const avessas = {
      ...tudoAMal,
      cavalos: [...tudoAMal.cavalos].reverse(),
      ascendentes: [...tudoAMal.ascendentes].reverse(),
      documentos: [...tudoAMal.documentos].reverse(),
    };
    expect(reunirCoerencia(avessas)).toEqual(reunirCoerencia(tudoAMal));
  });

  it("não diz nada sobre uma base vazia", () => {
    expect(reunirCoerencia({})).toEqual([]);
  });
});

// ─── A regra que manda em todas ──────────────────────────────────────────────

describe("um improvável nunca é um impedimento", () => {
  it("a natureza improvável só pode dar aviso", () => {
    expect(NIVEL_DA_NATUREZA.improvavel).toBe("aviso");
    expect(NIVEL_DA_NATUREZA.impossivel).toBe("erro");
  });

  it("nenhum achado que dependa de outro anúncio chega ao formulário", () => {
    // O que estiver errado pode estar do outro lado, e quem está à frente do
    // ecrã não tem como o corrigir. É isto que impede um `impossivel` de
    // cruzamento de se tornar num `erro` que trava um passo.
    const cruzados = reunirCoerencia({
      cavalos: [
        cavalo({ id: "c1", data_nascimento: "2020-05-01" }),
        cavalo({
          id: "c2",
          data_nascimento: "2021-06-01",
          registro_apsl: "LUS-7",
          sexo: "Égua",
        }),
      ],
      ascendentes: [asc({ cavalo_id: "c1", caminho: "pai", registo: "LUS-7" })],
      hoje: HOJE,
    });
    expect(cruzados.length).toBeGreaterThan(0);
    for (const achado of cruzados) {
      expect(achado.cavalos.length).toBeGreaterThan(1);
      expect(campoDoAchado(achado)).toBeNull();
    }
  });

  it("um achado de uma submissão só aterra no campo dela", () => {
    const proprios = reunirCoerencia({
      cavalos: [cavalo({ id: "c1", data_nascimento: "2027-01-01", registro_apsl: "LUS-1" })],
      ascendentes: [asc({ cavalo_id: "c1", caminho: "mae.pai", registo: "LUS-1" })],
      hoje: HOJE,
    });
    const campos = proprios.map((a) => [a.tipo, campoDoAchado(a)]);
    expect(campos).toEqual([
      ["nascimento_no_futuro", "data_nascimento"],
      ["antepassado_de_si_proprio", "avo_materno_nome"],
    ]);
  });

  it("as contradições entre documentos não têm campo onde aterrar", () => {
    const achados = reunirCoerencia({
      documentos: [
        doc({ id: "d1", leitura: { microchip: "620015004471234" } }),
        doc({ id: "d2", tipo: "passaporte", leitura: { microchip: "620015004471299" } }),
      ],
    });
    expect(achados.map((a) => campoDoAchado(a))).toEqual([null]);
  });
});

// ─── Identidade ──────────────────────────────────────────────────────────────

describe("identidade", () => {
  it("o registo ganha ao nome quando os dois estão lá", () => {
    expect(identidadeDe({ nome: "Zimbro", registo: "LUS-2010-0002" })).toEqual({
      chave: "LUS20100002",
      base: "registo",
    });
  });

  it("uma linha sem nada não tem identidade nenhuma", () => {
    expect(identidadeDe({ nome: null, registo: null })).toBeNull();
    expect(identidadeDe({ nome: "  ", registo: "--" })).toBeNull();
  });

  it("um impossível fundado no nome desce a improvável, e um improvável fica-se", () => {
    expect(abrandar("impossivel", "registo")).toBe("impossivel");
    expect(abrandar("impossivel", "nome")).toBe("improvavel");
    expect(abrandar("improvavel", "registo")).toBe("improvavel");
  });
});

describe("posições na árvore", () => {
  it("quem manda no sexo é o último passo do caminho", () => {
    expect(papelDoCaminho("pai")).toBe("pai");
    expect(papelDoCaminho("pai.mae")).toBe("mae");
    expect(papelDoCaminho("exemplar")).toBeNull();
  });

  it("só é antepassado quem está na mesma linha", () => {
    expect(eAntepassadoDe("pai", "pai.pai")).toBe(true);
    expect(eAntepassadoDe("pai", "mae.pai")).toBe(false);
    expect(eAntepassadoDe("pai", "pai")).toBe(false);
  });
});

// ─── Os números ──────────────────────────────────────────────────────────────

describe("as constantes biológicas", () => {
  it("estão todas do lado generoso", () => {
    // Cada um destes é o limite que **não** apanha o caso verdadeiro raro. Se
    // algum vier a apertar, é aqui que o teste o denuncia.
    expect(DIAS_MINIMOS_ENTRE_PARTOS).toBe(325);
    expect(DIAS_DE_GEMEOS).toBe(1);
    expect(MESES_IDADE_MINIMA_DE_PROGENITOR).toBeLessThan(MESES_IDADE_HABITUAL_DE_PROGENITOR);
    expect(ANOS_LONGEVIDADE_INVULGAR).toBeGreaterThanOrEqual(30);
  });

  it("a curva de crescimento sobe sempre e fecha nos quatro anos", () => {
    let anterior = 0;
    for (let meses = 0; meses <= 60; meses++) {
      const fraccao = fraccaoDaAlturaAdulta(meses);
      expect(fraccao).toBeGreaterThanOrEqual(anterior);
      expect(fraccao).toBeLessThanOrEqual(1);
      anterior = fraccao;
    }
    expect(fraccaoDaAlturaAdulta(48)).toBe(1);
    expect(fraccaoDaAlturaAdulta(0)).toBeCloseTo(0.61, 5);
  });
});
