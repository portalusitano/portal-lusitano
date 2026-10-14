import { describe, expect, it } from "vitest";

import {
  antepassadoDeSiProprio,
  antepassadoMaisNovo,
  coerenciaDaAscendencia,
  identificacoesDivergentes,
  nomesRealmenteDistintos,
  papelContraditorio,
  partosDemasiadoJuntos,
  sexoContraPapel,
} from "@/lib/documentos/coerencia/ascendencia";
import type {
  AscendenteParaCoerencia,
  CavaloParaCoerencia,
} from "@/lib/documentos/coerencia/achados";

/**
 * A ascendência.
 *
 * É aqui que está o valor deste subsistema: um pedigree inventado quase nunca é
 * biologicamente coerente, e nenhuma destas perguntas precisa de sair da nossa
 * base para ser respondida.
 *
 * O que estes testes protegem é a fronteira, e ela tem dois lados igualmente
 * caros. Não apanhar um pai mais novo do que o filho é falhar aquilo para que
 * isto existe; apanhar um pai que não existe — porque dois cavalos se chamam
 * «Zimbro», ou porque o mesmo avô aparece dos dois lados, que é criação em
 * linha e é corrente na raça — é recusar um vendedor honesto, e esse é o erro
 * que custa mais.
 *
 * Por isso cada regra tem um caso que dispara e um vizinho, quase igual, que
 * não dispara.
 */

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
  return {
    geracao: p.caminho.split(".").length,
    nome: null,
    registo: null,
    ...p,
  };
}

// ─── 1. O antepassado mais novo do que o descendente ─────────────────────────

describe("um pai mais novo do que o filho", () => {
  const filho = cavalo({ id: "c1", data_nascimento: "2020-05-01" });
  const pai = (nascimento: string) =>
    cavalo({ id: "c2", data_nascimento: nascimento, registro_apsl: "LUS 1999 0007" });
  const arvore = [asc({ cavalo_id: "c1", caminho: "pai", registo: "LUS-1999-0007" })];

  it("é impossível quando o pai nasceu depois", () => {
    const achados = antepassadoMaisNovo([filho, pai("2021-06-01")], arvore);
    expect(achados).toHaveLength(1);
    expect(achados[0]).toMatchObject({
      tipo: "progenitor_mais_novo",
      natureza: "impossivel",
      cavaloId: "c1",
      cavaloDoProgenitor: "c2",
      caminho: "pai",
      geracoes: 1,
      cavalos: ["c1", "c2"],
    });
    expect(achados[0].mesesEntreOsNascimentos).toBeLessThan(0);
  });

  it("é improvável — e nunca impedimento — quando o pai tinha dois anos ao parto", () => {
    const achados = antepassadoMaisNovo([filho, pai("2018-01-01")], arvore);
    expect(achados.map((a) => a.natureza)).toEqual(["improvavel"]);
  });

  it("não dispara com um pai de dez anos mais velho", () => {
    expect(antepassadoMaisNovo([filho, pai("2010-01-01")], arvore)).toEqual([]);
  });

  it("não dispara quando o que liga os dois é só o nome", () => {
    // Nos nomes do livro de origem do Lusitano há homónimos com fartura, e dar
    // ao potro o nome do avô é costume. Uma acusação de pedigree inventado não
    // se funda numa homonímia.
    const homonimo = cavalo({ id: "c2", data_nascimento: "2021-06-01", nome: "Zimbro" });
    expect(
      antepassadoMaisNovo(
        [filho, homonimo],
        [asc({ cavalo_id: "c1", caminho: "pai", nome: "Zimbro" })]
      )
    ).toEqual([]);
  });

  it("não dispara sem data de nascimento de nenhum dos lados", () => {
    expect(antepassadoMaisNovo([cavalo({ id: "c1" }), pai("2021-06-01")], arvore)).toEqual([]);
    expect(
      antepassadoMaisNovo([filho, cavalo({ id: "c2", registro_apsl: "LUS 1999 0007" })], arvore)
    ).toEqual([]);
  });

  it("exige duas gerações de distância a um avô, e não uma", () => {
    const avo = [asc({ cavalo_id: "c1", caminho: "pai.pai", registo: "LUS-1999-0007" })];
    // 28 meses chegam para um pai e não chegam para um avô.
    expect(antepassadoMaisNovo([filho, pai("2018-01-01")], avo)[0]).toMatchObject({
      natureza: "impossivel",
      geracoes: 2,
      mesesMinimosExigidos: 44,
    });
    expect(antepassadoMaisNovo([filho, pai("2010-01-01")], avo)).toEqual([]);
  });
});

// ─── 2. Dois partos da mesma égua demasiado juntos ───────────────────────────

describe("uma égua com dois filhos demasiado juntos", () => {
  const filhos = (a: string, b: string) => [
    cavalo({ id: "c1", data_nascimento: a }),
    cavalo({ id: "c2", data_nascimento: b }),
  ];
  const mesmaMae = [
    asc({ cavalo_id: "c1", caminho: "mae", registo: "LUS-2005-0031" }),
    asc({ cavalo_id: "c2", caminho: "mae", registo: "LUS 2005 0031" }),
  ];

  it("dispara a noventa e um dias de distância", () => {
    const achados = partosDemasiadoJuntos(filhos("2020-01-01", "2020-04-01"), mesmaMae);
    expect(achados).toHaveLength(1);
    expect(achados[0]).toMatchObject({
      tipo: "partos_demasiado_juntos",
      natureza: "improvavel",
      dias: 91,
      cavalos: ["c1", "c2"],
    });
    expect(achados[0].mae.base).toBe("registo");
  });

  it("é sempre improvável, nunca impossível — a transferência de embriões existe", () => {
    const achados = partosDemasiadoJuntos(filhos("2020-01-01", "2020-01-20"), mesmaMae);
    expect(achados.every((a) => a.natureza === "improvavel")).toBe(true);
  });

  it("não dispara a um ano de distância", () => {
    expect(partosDemasiadoJuntos(filhos("2020-01-01", "2021-01-01"), mesmaMae)).toEqual([]);
  });

  it("não dispara em gémeos, que nascem no mesmo dia ou no seguinte", () => {
    expect(partosDemasiadoJuntos(filhos("2020-01-01", "2020-01-01"), mesmaMae)).toEqual([]);
    expect(partosDemasiadoJuntos(filhos("2020-01-01", "2020-01-02"), mesmaMae)).toEqual([]);
  });

  it("dispara também quando a mãe só está identificada pelo nome", () => {
    // Aqui o peso da prova está no intervalo entre as duas datas e não no nome:
    // duas éguas homónimas com filhos a noventa dias de distância é uma
    // coincidência sobre uma coincidência.
    const porNome = [
      asc({ cavalo_id: "c1", caminho: "mae", nome: "Bailarina" }),
      asc({ cavalo_id: "c2", caminho: "mae", nome: "BAILARINA" }),
    ];
    const achados = partosDemasiadoJuntos(filhos("2020-01-01", "2020-04-01"), porNome);
    expect(achados).toHaveLength(1);
    expect(achados[0].mae.base).toBe("nome");
  });

  it("não dispara sobre uma avó materna partilhada", () => {
    const avoMaterna = [
      asc({ cavalo_id: "c1", caminho: "mae.mae", registo: "LUS-2005-0031" }),
      asc({ cavalo_id: "c2", caminho: "mae.mae", registo: "LUS-2005-0031" }),
    ];
    expect(partosDemasiadoJuntos(filhos("2020-01-01", "2020-04-01"), avoMaterna)).toEqual([]);
  });

  it("não dispara quando um dos dois anúncios não tem data de nascimento", () => {
    const semData = [cavalo({ id: "c1", data_nascimento: "2020-01-01" }), cavalo({ id: "c2" })];
    expect(partosDemasiadoJuntos(semData, mesmaMae)).toEqual([]);
  });
});

// ─── 3. Ser antepassado de si próprio ────────────────────────────────────────

describe("um cavalo que consta da sua própria ascendência", () => {
  it("é impossível quando o registo do exemplar aparece na árvore", () => {
    const achados = antepassadoDeSiProprio(
      [cavalo({ id: "c1", registro_apsl: "LUS-2018-0004" })],
      [asc({ cavalo_id: "c1", caminho: "pai", registo: "LUS 2018 0004" })]
    );
    expect(achados).toHaveLength(1);
    expect(achados[0]).toMatchObject({
      tipo: "antepassado_de_si_proprio",
      natureza: "impossivel",
      caminhos: ["exemplar", "pai"],
    });
  });

  it("desce a improvável quando o que liga as duas pontas é só o nome", () => {
    const achados = antepassadoDeSiProprio(
      [cavalo({ id: "c1", nome: "Zimbro" })],
      [asc({ cavalo_id: "c1", caminho: "pai", nome: "Zimbro" })]
    );
    expect(achados.map((a) => a.natureza)).toEqual(["improvavel"]);
  });

  it("é impossível quando o pai é o seu próprio pai", () => {
    const achados = antepassadoDeSiProprio(
      [cavalo({ id: "c1" })],
      [
        asc({ cavalo_id: "c1", caminho: "pai", registo: "LUS-2010-0002" }),
        asc({ cavalo_id: "c1", caminho: "pai.pai", registo: "LUS-2010-0002" }),
      ]
    );
    expect(achados).toHaveLength(1);
    expect(achados[0].caminhos).toEqual(["pai", "pai.pai"]);
  });

  it("não dispara sobre o mesmo avô dos dois lados — isso é criação em linha", () => {
    expect(
      antepassadoDeSiProprio(
        [cavalo({ id: "c1" })],
        [
          asc({ cavalo_id: "c1", caminho: "pai.pai", registo: "LUS-2010-0002" }),
          asc({ cavalo_id: "c1", caminho: "mae.pai", registo: "LUS-2010-0002" }),
        ]
      )
    ).toEqual([]);
  });

  it("não dispara quando o pai é também o avô materno — é consanguinidade, e é possível", () => {
    expect(
      antepassadoDeSiProprio(
        [cavalo({ id: "c1" })],
        [
          asc({ cavalo_id: "c1", caminho: "pai", registo: "LUS-2010-0002" }),
          asc({ cavalo_id: "c1", caminho: "mae.pai", registo: "LUS-2010-0002" }),
        ]
      )
    ).toEqual([]);
  });
});

// ─── 4. A mesma identidade em posição de pai e de mãe ────────────────────────

describe("a mesma identidade em posição de pai e de mãe", () => {
  it("é impossível dentro do mesmo anúncio", () => {
    const achados = papelContraditorio(
      [cavalo({ id: "c1" })],
      [
        asc({ cavalo_id: "c1", caminho: "pai", registo: "LUS-2010-0002" }),
        asc({ cavalo_id: "c1", caminho: "mae", registo: "LUS-2010-0002" }),
      ]
    );
    expect(achados).toHaveLength(1);
    expect(achados[0]).toMatchObject({ natureza: "impossivel", cavalos: ["c1"] });
  });

  it("é impossível entre dois anúncios", () => {
    const achados = papelContraditorio(
      [cavalo({ id: "c1" }), cavalo({ id: "c2" })],
      [
        asc({ cavalo_id: "c1", caminho: "pai", registo: "LUS-2010-0002" }),
        asc({ cavalo_id: "c2", caminho: "mae.mae", registo: "LUS-2010-0002" }),
      ]
    );
    expect(achados).toHaveLength(1);
    expect(achados[0].cavalos).toEqual(["c1", "c2"]);
  });

  it("não dispara quando as duas posições pedem o mesmo sexo", () => {
    expect(
      papelContraditorio(
        [cavalo({ id: "c1" }), cavalo({ id: "c2" })],
        [
          asc({ cavalo_id: "c1", caminho: "pai", registo: "LUS-2010-0002" }),
          asc({ cavalo_id: "c2", caminho: "pai.pai", registo: "LUS-2010-0002" }),
        ]
      )
    ).toEqual([]);
  });

  it("desce a improvável quando o que liga as duas posições é só o nome", () => {
    const achados = papelContraditorio(
      [cavalo({ id: "c1" })],
      [
        asc({ cavalo_id: "c1", caminho: "pai", nome: "Zimbro" }),
        asc({ cavalo_id: "c1", caminho: "mae", nome: "zimbro" }),
      ]
    );
    expect(achados.map((a) => a.natureza)).toEqual(["improvavel"]);
  });
});

// ─── 5. O sexo do antepassado contra a posição ───────────────────────────────

describe("o sexo do antepassado contra a posição", () => {
  const arvore = [asc({ cavalo_id: "c1", caminho: "pai", registo: "LUS-2010-0002" })];

  it("é impossível uma égua na posição de pai", () => {
    const achados = sexoContraPapel(
      [cavalo({ id: "c1" }), cavalo({ id: "c2", registro_apsl: "LUS 2010 0002", sexo: "Égua" })],
      arvore
    );
    expect(achados).toHaveLength(1);
    expect(achados[0]).toMatchObject({
      natureza: "impossivel",
      papel: "pai",
      sexo: "Égua",
      cavaloDoAntepassado: "c2",
    });
  });

  it("não dispara com um castrado na posição de pai — gerou antes de o ser", () => {
    expect(
      sexoContraPapel(
        [
          cavalo({ id: "c1" }),
          cavalo({ id: "c2", registro_apsl: "LUS 2010 0002", sexo: "Castrado" }),
        ],
        arvore
      )
    ).toEqual([]);
  });

  it("não dispara quando não se sabe o sexo", () => {
    expect(
      sexoContraPapel(
        [cavalo({ id: "c1" }), cavalo({ id: "c2", registro_apsl: "LUS 2010 0002", sexo: null })],
        arvore
      )
    ).toEqual([]);
  });

  it("é impossível um garanhão na posição de mãe", () => {
    const achados = sexoContraPapel(
      [
        cavalo({ id: "c1" }),
        cavalo({ id: "c2", registro_apsl: "LUS 2010 0002", sexo: "Garanhão" }),
      ],
      [asc({ cavalo_id: "c1", caminho: "mae", registo: "LUS-2010-0002" })]
    );
    expect(achados.map((a) => a.papel)).toEqual(["mae"]);
  });
});

// ─── 6. Identificações divergentes ───────────────────────────────────────────

describe("nomesRealmenteDistintos", () => {
  it("junta o nome com e sem a coudelaria", () => {
    expect(nomesRealmenteDistintos(["ZIMBRO", "ZIMBRODOVALE"])).toEqual(["ZIMBRO"]);
  });

  it("mantém dois nomes que nada têm um do outro", () => {
    expect(nomesRealmenteDistintos(["ZIMBRO", "NOVILHEIRO"])).toEqual(["NOVILHEIRO", "ZIMBRO"]);
  });
});

describe("o mesmo registo com dois nomes", () => {
  it("dispara, e fica em improvável — os dois lados são texto escrito à mão", () => {
    const achados = identificacoesDivergentes(
      [cavalo({ id: "c1" }), cavalo({ id: "c2" })],
      [
        asc({ cavalo_id: "c1", caminho: "pai", registo: "LUS-5", nome: "Zimbro" }),
        asc({ cavalo_id: "c2", caminho: "pai", registo: "LUS 5", nome: "Novilheiro" }),
      ]
    );
    expect(achados.map((a) => a.tipo)).toEqual(["registo_com_dois_nomes"]);
    expect(achados[0]).toMatchObject({
      natureza: "improvavel",
      registo: "LUS5",
      cavalos: ["c1", "c2"],
    });
  });

  it("não dispara sobre o mesmo nome com e sem a coudelaria atrás", () => {
    expect(
      identificacoesDivergentes(
        [cavalo({ id: "c1" }), cavalo({ id: "c2" })],
        [
          asc({ cavalo_id: "c1", caminho: "pai", registo: "LUS-5", nome: "Zimbro" }),
          asc({ cavalo_id: "c2", caminho: "pai", registo: "LUS-5", nome: "Zimbro do Vale" }),
        ]
      )
    ).toEqual([]);
  });
});

describe("o mesmo nome com dois registos", () => {
  it("dispara", () => {
    const achados = identificacoesDivergentes(
      [cavalo({ id: "c1" }), cavalo({ id: "c2" })],
      [
        asc({ cavalo_id: "c1", caminho: "pai", registo: "LUS-5", nome: "Zimbro" }),
        asc({ cavalo_id: "c2", caminho: "pai", registo: "LUS-9", nome: "Zimbro" }),
      ]
    );
    expect(achados.map((a) => a.tipo)).toEqual(["nome_com_dois_registos"]);
    expect(achados[0]).toMatchObject({ natureza: "improvavel", nome: "ZIMBRO" });
  });

  it("não dispara quando um dos dois não traz registo nenhum", () => {
    // Uma linha só com nome não contradiz um registo: não diz nada sobre ele.
    expect(
      identificacoesDivergentes(
        [cavalo({ id: "c1" }), cavalo({ id: "c2" })],
        [
          asc({ cavalo_id: "c1", caminho: "pai", registo: "LUS-5", nome: "Zimbro" }),
          asc({ cavalo_id: "c2", caminho: "pai", nome: "Zimbro" }),
        ]
      )
    ).toEqual([]);
  });
});

// ─── A saída inteira ─────────────────────────────────────────────────────────

describe("coerenciaDaAscendencia", () => {
  it("não diz nada sobre uma árvore que fecha", () => {
    const cavalos = [
      cavalo({
        id: "c1",
        nome: "Duque",
        registro_apsl: "LUS-2018-0004",
        data_nascimento: "2018-04-02",
      }),
      cavalo({
        id: "c2",
        nome: "Zimbro",
        registro_apsl: "LUS-2008-0002",
        data_nascimento: "2008-03-11",
        sexo: "Garanhão",
      }),
    ];
    const ascendentes = [
      asc({ cavalo_id: "c1", caminho: "pai", registo: "LUS-2008-0002", nome: "Zimbro" }),
      asc({ cavalo_id: "c1", caminho: "mae", registo: "LUS-2009-0044", nome: "Bailarina" }),
      asc({ cavalo_id: "c1", caminho: "pai.pai", registo: "LUS-1998-0007", nome: "Novilheiro" }),
      asc({ cavalo_id: "c1", caminho: "mae.pai", registo: "LUS-1998-0007", nome: "Novilheiro" }),
    ];
    expect(coerenciaDaAscendencia(cavalos, ascendentes)).toEqual([]);
  });

  it("dá sempre a mesma saída pela mesma ordem, venham as linhas como vierem", () => {
    const cavalos = [
      cavalo({ id: "c1", data_nascimento: "2020-01-01" }),
      cavalo({ id: "c2", data_nascimento: "2020-04-01" }),
      cavalo({ id: "c3", registro_apsl: "LUS-2010-0002", sexo: "Égua" }),
    ];
    const ascendentes = [
      asc({ cavalo_id: "c1", caminho: "mae", registo: "LUS-2005-0031" }),
      asc({ cavalo_id: "c2", caminho: "mae", registo: "LUS-2005-0031" }),
      asc({ cavalo_id: "c1", caminho: "pai", registo: "LUS-2010-0002" }),
    ];
    const direita = coerenciaDaAscendencia(cavalos, ascendentes);
    const avessas = coerenciaDaAscendencia([...cavalos].reverse(), [...ascendentes].reverse());
    expect(direita).toEqual(avessas);
    expect(direita.map((a) => a.tipo)).toEqual(["partos_demasiado_juntos", "sexo_contra_papel"]);
  });
});
