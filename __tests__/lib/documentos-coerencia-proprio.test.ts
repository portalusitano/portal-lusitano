import { describe, expect, it } from "vitest";

import { coerenciaDoCavalo, coerenciaDosCavalos } from "@/lib/documentos/coerencia/proprio";
import type { CavaloParaCoerencia } from "@/lib/documentos/coerencia/achados";

/**
 * O cavalo consigo próprio.
 *
 * Cada regra tem aqui um caso que dispara e um **caso vizinho, quase igual, que
 * não dispara**. É a única maneira de provar que a regra não é um alarme cego:
 * uma verificação que dispara sempre não distingue nada, e uma que nunca
 * dispara também não.
 *
 * E há um teste que vale por todos: **um cavalo sem data de nascimento não
 * produz achado nenhum**. Metade dos anúncios pode não a ter, e ausência nunca
 * é conflito.
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

const tipos = (c: CavaloParaCoerencia, contexto = {}) =>
  coerenciaDoCavalo(c, { hoje: HOJE, ...contexto }).map((a) => a.tipo);

describe("a ausência de data de nascimento", () => {
  it("não produz achado nenhum, mesmo com tudo o resto preenchido", () => {
    const semData = cavalo({
      id: "c1",
      data_nascimento: null,
      idade: 40,
      altura: 210,
      nome: "Zimbro",
    });
    expect(
      coerenciaDoCavalo(semData, {
        hoje: HOJE,
        historial: [
          { campo: "data_ultima_vacinacao", data: "1990-01-01" },
          { campo: "data_ultima_ferragem", data: "1991-01-01" },
        ],
      })
    ).toEqual([]);
  });

  it("também não produz nada quando a data está lá mas não é uma data", () => {
    expect(tipos(cavalo({ id: "c1", data_nascimento: "não sei", idade: 40 }))).toEqual([]);
  });
});

describe("nascimento no futuro", () => {
  it("dispara, e é impossível", () => {
    const achados = coerenciaDoCavalo(cavalo({ id: "c1", data_nascimento: "2027-01-01" }), {
      hoje: HOJE,
    });
    expect(achados).toHaveLength(1);
    expect(achados[0]).toMatchObject({
      tipo: "nascimento_no_futuro",
      natureza: "impossivel",
      cavalos: ["c1"],
      dataNascimento: "2027-01-01",
    });
  });

  it("não dispara três dias antes de hoje", () => {
    expect(tipos(cavalo({ id: "c1", data_nascimento: "2026-09-01" }))).toEqual([]);
  });
});

describe("nascimento depois de todo o historial", () => {
  const nascidoEm2020 = { id: "c1", data_nascimento: "2020-05-01" };

  it("dispara quando duas datas do historial ficam ambas para trás", () => {
    const achados = coerenciaDoCavalo(cavalo(nascidoEm2020), {
      hoje: HOJE,
      historial: [
        { campo: "data_ultima_vacinacao", data: "2019-01-10" },
        { campo: "data_ultima_ferragem", data: "2018-06-02" },
      ],
    });
    expect(achados.map((a) => a.tipo)).toEqual(["nascimento_depois_do_historial"]);
    expect(achados[0]).toMatchObject({ natureza: "impossivel" });
  });

  it("não dispara com uma data só — aí quem fala é a inspecção, no campo dessa data", () => {
    expect(
      tipos(cavalo(nascidoEm2020), {
        historial: [{ campo: "data_ultima_vacinacao", data: "2019-01-10" }],
      })
    ).toEqual([]);
  });

  it("não dispara quando uma das duas datas é posterior ao nascimento", () => {
    expect(
      tipos(cavalo(nascidoEm2020), {
        historial: [
          { campo: "data_ultima_vacinacao", data: "2019-01-10" },
          { campo: "data_ultima_ferragem", data: "2024-06-02" },
        ],
      })
    ).toEqual([]);
  });

  it("não repete a queixa quando o nascimento já foi apontado como estando no futuro", () => {
    expect(
      tipos(cavalo({ id: "c1", data_nascimento: "2027-01-01" }), {
        historial: [
          { campo: "data_ultima_vacinacao", data: "2026-01-10" },
          { campo: "data_ultima_ferragem", data: "2026-06-02" },
        ],
      })
    ).toEqual(["nascimento_no_futuro"]);
  });
});

describe("a idade guardada contra a data de nascimento", () => {
  it("dispara quando a idade guardada é maior do que a data permite", () => {
    // 2020-05-01 dá seis anos a 2026-09-04.
    const achados = coerenciaDoCavalo(
      cavalo({ id: "c1", data_nascimento: "2020-05-01", idade: 9 }),
      { hoje: HOJE }
    );
    expect(achados).toHaveLength(1);
    expect(achados[0]).toMatchObject({
      tipo: "idade_declarada_diverge",
      natureza: "improvavel",
      idadeDeclarada: 9,
      idadePelaData: 6,
      anosDeDiferenca: 3,
    });
  });

  it("não dispara por um ano de diferença — um aniversário passa entre uma coisa e outra", () => {
    expect(tipos(cavalo({ id: "c1", data_nascimento: "2020-05-01", idade: 7 }))).toEqual([]);
  });

  it("não dispara quando a idade guardada é menor: é o anúncio a envelhecer", () => {
    // A `idade` foi calculada no dia do pagamento e não voltou a ser tocada.
    // Um anúncio de três anos tem lá uma idade três anos abaixo, e isso é o
    // funcionamento normal — não uma contradição.
    expect(tipos(cavalo({ id: "c1", data_nascimento: "2020-05-01", idade: 3 }))).toEqual([]);
  });
});

describe("longevidade", () => {
  it("um cavalo de 32 anos é improvável, e nunca um impedimento", () => {
    const achados = coerenciaDoCavalo(cavalo({ id: "c1", data_nascimento: "1994-06-01" }), {
      hoje: HOJE,
    });
    expect(achados.map((a) => a.tipo)).toEqual(["longevidade_invulgar"]);
    expect(achados[0].natureza).toBe("improvavel");
    expect(achados.every((a) => a.natureza !== "impossivel")).toBe(true);
  });

  it("não dispara aos 28", () => {
    expect(tipos(cavalo({ id: "c1", data_nascimento: "1998-06-01" }))).toEqual([]);
  });
});

describe("a altura contra a curva de crescimento", () => {
  it("dispara num potro de seis meses com a altura de um adulto", () => {
    const achados = coerenciaDoCavalo(
      cavalo({ id: "c1", data_nascimento: "2026-03-01", altura: 160 }),
      { hoje: HOJE }
    );
    expect(achados.map((a) => a.tipo)).toEqual(["altura_para_a_idade"]);
    expect(achados[0]).toMatchObject({ natureza: "improvavel", alturaCm: 160 });
  });

  it("não dispara no mesmo potro com uma altura que a curva admite", () => {
    expect(tipos(cavalo({ id: "c1", data_nascimento: "2026-03-01", altura: 145 }))).toEqual([]);
  });

  it("não dispara num adulto: passados quatro anos não há nada a inferir", () => {
    expect(tipos(cavalo({ id: "c1", data_nascimento: "2016-03-01", altura: 172 }))).toEqual([]);
  });

  it("não dispara sem altura", () => {
    expect(tipos(cavalo({ id: "c1", data_nascimento: "2026-03-01", altura: null }))).toEqual([]);
  });
});

describe("coerenciaDosCavalos", () => {
  it("dá sempre a mesma saída pela mesma ordem, venham as linhas como vierem", () => {
    const linhas = [
      cavalo({ id: "c2", data_nascimento: "1994-06-01" }),
      cavalo({ id: "c1", data_nascimento: "2027-01-01" }),
    ];
    const direita = coerenciaDosCavalos(linhas, { hoje: HOJE });
    const avessas = coerenciaDosCavalos([...linhas].reverse(), { hoje: HOJE });
    expect(direita).toEqual(avessas);
    expect(direita.map((a) => a.cavalos[0])).toEqual(["c1", "c2"]);
  });
});
