import { describe, it, expect } from "vitest";
import {
  alertaEmAtraso,
  aplicarCriterios,
  descreverAlerta,
  normalizarAlerta,
  normalizarCriterios,
  type CriteriosAlerta,
  type CriteriosQuery,
} from "@/lib/marketplace-alertas";

const VAZIOS: CriteriosAlerta = {
  sexo: null,
  regiao: null,
  precoMin: null,
  precoMax: null,
  idadeMin: null,
  idadeMax: null,
  disciplina: null,
  nivel: null,
  termo: null,
};

/**
 * Records the filters applied, so the query builder can be asserted on.
 *
 * Only the chaining methods are implemented — `aplicarCriterios` never awaits
 * the builder, so there is no `then` here to get wrong.
 */
function espia() {
  const chamadas: string[] = [];
  const q = {
    eq: (c: string, v: unknown) => (chamadas.push(`eq:${c}=${v}`), q),
    gte: (c: string, v: unknown) => (chamadas.push(`gte:${c}=${v}`), q),
    lte: (c: string, v: unknown) => (chamadas.push(`lte:${c}=${v}`), q),
    contains: (c: string, v: unknown) => (chamadas.push(`contains:${c}=${JSON.stringify(v)}`), q),
    or: (f: string) => (chamadas.push(`or:${f}`), q),
  };
  return { q: q as unknown as CriteriosQuery<unknown>, chamadas };
}

describe("normalizarCriterios", () => {
  it("trata 'todos'/'todas' como ausência de filtro, que é o que a interface envia", () => {
    const { criterios } = normalizarCriterios({ sexo: "todos", regiao: "Todas" });
    expect(criterios.sexo).toBeNull();
    expect(criterios.regiao).toBeNull();
  });

  it("recusa um intervalo de preço invertido em vez de o guardar a não corresponder a nada", () => {
    const { erros } = normalizarCriterios({ precoMin: 50000, precoMax: 10000 });
    expect(erros).toContain("O preço mínimo não pode ser superior ao máximo");
  });

  it("recusa um intervalo de idade invertido", () => {
    const { erros } = normalizarCriterios({ idadeMin: 15, idadeMax: 3 });
    expect(erros.length).toBe(1);
  });

  it("aceita um intervalo com apenas um extremo", () => {
    const { criterios, erros } = normalizarCriterios({ precoMax: 20000 });
    expect(erros).toEqual([]);
    expect(criterios.precoMax).toBe(20000);
    expect(criterios.precoMin).toBeNull();
  });

  it("descarta valores fora de alcance em vez de rejeitar a pesquisa toda", () => {
    const { criterios, erros } = normalizarCriterios({ idadeMin: 999, precoMin: -5 });
    expect(criterios.idadeMin).toBeNull();
    expect(criterios.precoMin).toBeNull();
    expect(erros).toEqual([]);
  });

  it("higieniza o termo livre, que acaba num filtro or do PostgREST", () => {
    const { criterios } = normalizarCriterios({ termo: "veiga.ilike.%hack%" });
    expect(criterios.termo).not.toContain("%");
    expect(criterios.termo).not.toContain(".");
  });
});

describe("aplicarCriterios", () => {
  it("não aplica filtro nenhum quando não há critérios", () => {
    const { q, chamadas } = espia();
    aplicarCriterios(q, VAZIOS);
    expect(chamadas).toEqual([]);
  });

  it("aplica cada critério à coluna certa", () => {
    const { q, chamadas } = espia();
    aplicarCriterios(q, {
      ...VAZIOS,
      sexo: "femea",
      regiao: "Ribatejo",
      precoMin: 5000,
      precoMax: 20000,
      idadeMin: 4,
      idadeMax: 10,
      nivel: "iniciado",
      disciplina: "Dressage",
    });

    expect(chamadas).toEqual([
      "eq:sexo=femea",
      "eq:regiao=Ribatejo",
      "gte:preco=5000",
      "lte:preco=20000",
      "gte:idade=4",
      "lte:idade=10",
      "eq:nivel_treino=iniciado",
      'contains:disciplinas=["Dressage"]',
    ]);
  });

  it("procura o termo no nome e na descrição", () => {
    const { q, chamadas } = espia();
    aplicarCriterios(q, { ...VAZIOS, termo: "veiga" });
    expect(chamadas).toEqual(["or:nome.ilike.%veiga%,descricao.ilike.%veiga%"]);
  });

  it("distingue preço zero de ausência de preço", () => {
    const { q, chamadas } = espia();
    aplicarCriterios(q, { ...VAZIOS, precoMin: 0 });
    expect(chamadas).toEqual(["gte:preco=0"]);
  });
});

describe("alertaEmAtraso", () => {
  const agora = new Date("2026-08-29T12:00:00Z");

  it("um alerta que nunca enviou está sempre em atraso", () => {
    expect(alertaEmAtraso("diaria", null, agora)).toBe(true);
  });

  it("um alerta diário enviado há uma hora não está em atraso", () => {
    expect(alertaEmAtraso("diaria", "2026-08-29T11:00:00Z", agora)).toBe(false);
  });

  it("um alerta diário enviado ontem está em atraso", () => {
    expect(alertaEmAtraso("diaria", "2026-08-28T11:00:00Z", agora)).toBe(true);
  });

  it("um alerta semanal enviado há três dias ainda não está em atraso", () => {
    expect(alertaEmAtraso("semanal", "2026-08-26T12:00:00Z", agora)).toBe(false);
  });

  it("um alerta semanal enviado há oito dias está em atraso", () => {
    expect(alertaEmAtraso("semanal", "2026-08-21T12:00:00Z", agora)).toBe(true);
  });

  it("uma data ilegível conta como em atraso, para o alerta não ficar mudo para sempre", () => {
    expect(alertaEmAtraso("diaria", "não-é-data", agora)).toBe(true);
  });
});

describe("descreverAlerta", () => {
  it("descreve uma pesquisa sem critérios", () => {
    expect(descreverAlerta(VAZIOS)).toBe("Todos os cavalos novos");
  });

  it("junta os critérios numa frase legível", () => {
    expect(descreverAlerta({ ...VAZIOS, sexo: "femea", regiao: "Ribatejo", precoMax: 20000 })).toBe(
      "femea, em Ribatejo, até 20000€"
    );
  });

  it("distingue intervalo fechado de extremo único", () => {
    expect(descreverAlerta({ ...VAZIOS, precoMin: 5000, precoMax: 20000 })).toContain(
      "entre 5000€ e 20000€"
    );
    expect(descreverAlerta({ ...VAZIOS, precoMin: 5000 })).toContain("a partir de 5000€");
  });
});

describe("normalizarAlerta", () => {
  it("usa a descrição como nome quando não há rótulo, para a lista não ficar em branco", () => {
    const alerta = normalizarAlerta({ id: "a1", sexo: "macho", nome: null });
    expect(alerta.nome).toBe("macho");
  });

  it("converte os numéricos que o Supabase devolve como texto", () => {
    const alerta = normalizarAlerta({ id: "a1", preco_max: "20000.00", idade_min: "4" });
    expect(alerta.precoMax).toBe(20000);
    expect(alerta.idadeMin).toBe(4);
  });

  it("assume activo e diário por omissão", () => {
    const alerta = normalizarAlerta({ id: "a1" });
    expect(alerta.ativo).toBe(true);
    expect(alerta.frequencia).toBe("diaria");
  });
});
