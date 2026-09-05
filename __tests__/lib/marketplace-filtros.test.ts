import { describe, it, expect } from "vitest";
import {
  FILTROS_VAZIOS,
  POR_PAGINA,
  aplicarFiltros,
  contarFiltrosAtivos,
  disciplinasDe,
  escreverFiltros,
  lerFiltros,
  ordenar,
  paginar,
  temFiltrosAtivos,
  type AnuncioFiltravel,
} from "@/lib/marketplace-filtros";

/** Stands in for URLSearchParams without needing the DOM. */
function params(obj: Record<string, string>) {
  return { get: (k: string) => (k in obj ? obj[k] : null) };
}

function anuncio(over: Partial<AnuncioFiltravel> = {}): AnuncioFiltravel {
  return {
    nome_cavalo: "Imperador",
    localizacao: "Golegã",
    sexo: "macho",
    nivel: "avancado",
    idade: 7,
    preco: 20000,
    disciplinas: ["Dressage"],
    destaque: false,
    created_at: "2026-08-01T00:00:00Z",
    ...over,
  };
}

describe("lerFiltros", () => {
  it("devolve os valores por omissão para um URL sem parâmetros", () => {
    expect(lerFiltros(params({}))).toEqual(FILTROS_VAZIOS);
  });

  it("lê os atalhos que a homepage produz", () => {
    expect(lerFiltros(params({ disciplina: "Dressage" })).disciplina).toBe("Dressage");
    expect(lerFiltros(params({ precoMax: "10000" })).precoMax).toBe(10000);
    expect(lerFiltros(params({ sexo: "femea" })).sexo).toBe("femea");
    expect(lerFiltros(params({ idadeMax: "3" })).idadeMax).toBe(3);
  });

  it("trata 'todos'/'all' como ausência de filtro", () => {
    expect(lerFiltros(params({ sexo: "todos", regiao: "all" })).sexo).toBe("");
    expect(lerFiltros(params({ regiao: "all" })).regiao).toBe("");
  });

  it("troca um intervalo de preço invertido em vez de não devolver nada", () => {
    const f = lerFiltros(params({ precoMin: "50000", precoMax: "10000" }));
    expect(f.precoMin).toBe(10000);
    expect(f.precoMax).toBe(50000);
  });

  it("troca um intervalo de idade invertido", () => {
    const f = lerFiltros(params({ idadeMin: "15", idadeMax: "3" }));
    expect([f.idadeMin, f.idadeMax]).toEqual([3, 15]);
  });

  it("ignora valores fora de alcance de um URL adulterado", () => {
    expect(lerFiltros(params({ precoMin: "-5" })).precoMin).toBeNull();
    expect(lerFiltros(params({ idadeMax: "999" })).idadeMax).toBeNull();
    expect(lerFiltros(params({ precoMax: "abc" })).precoMax).toBeNull();
  });

  it("recusa uma ordenação desconhecida e usa a predefinida", () => {
    expect(lerFiltros(params({ ordenar: "aleatoria" })).ordenar).toBe("recentes");
    expect(lerFiltros(params({ ordenar: "preco_asc" })).ordenar).toBe("preco_asc");
  });

  it("nunca devolve uma página inferior a 1", () => {
    expect(lerFiltros(params({ pagina: "0" })).pagina).toBe(1);
    expect(lerFiltros(params({ pagina: "-3" })).pagina).toBe(1);
  });
});

describe("escreverFiltros", () => {
  it("não escreve nada quando não há filtros, para /comprar continuar limpo", () => {
    expect(escreverFiltros(FILTROS_VAZIOS)).toBe("");
  });

  it("omite a ordenação e a página predefinidas", () => {
    expect(escreverFiltros({ ...FILTROS_VAZIOS, ordenar: "recentes", pagina: 1 })).toBe("");
  });

  it("faz ida e volta sem perder informação", () => {
    const original = {
      ...FILTROS_VAZIOS,
      search: "veiga",
      sexo: "femea",
      disciplina: "Dressage",
      precoMin: 5000,
      precoMax: 20000,
      ordenar: "preco_asc" as const,
      pagina: 3,
    };
    const query = escreverFiltros(original);
    const p = new URLSearchParams(query);
    expect(lerFiltros({ get: (k) => p.get(k) })).toEqual(original);
  });

  it("distingue preço zero de preço ausente", () => {
    expect(escreverFiltros({ ...FILTROS_VAZIOS, precoMin: 0 })).toContain("precoMin=0");
  });
});

describe("temFiltrosAtivos / contarFiltrosAtivos", () => {
  it("ordenar e paginar não contam como filtro", () => {
    const f = { ...FILTROS_VAZIOS, ordenar: "preco_asc" as const, pagina: 4 };
    expect(temFiltrosAtivos(f)).toBe(false);
    expect(contarFiltrosAtivos(f)).toBe(0);
  });

  it("conta um intervalo como um só filtro", () => {
    expect(contarFiltrosAtivos({ ...FILTROS_VAZIOS, precoMin: 1000, precoMax: 5000 })).toBe(1);
  });
});

describe("disciplinasDe", () => {
  it("aceita as duas formas em que a coluna está gravada", () => {
    expect(disciplinasDe({ disciplinas: ["Dressage", "Lazer"] })).toEqual(["Dressage", "Lazer"]);
    expect(disciplinasDe({ disciplinas: "Dressage, Lazer" })).toEqual(["Dressage", "Lazer"]);
  });

  it("desembrulha a coluna jsonb codificada duas vezes", () => {
    // A forma que fazia a grelha oferecer uma pastilha `["Dressage"]` ao lado
    // da pastilha `Dressage`, com o anúncio dela inalcançável pela outra.
    expect(disciplinasDe({ disciplinas: '["Dressage"]' })).toEqual(["Dressage"]);
    expect(disciplinasDe({ disciplinas: '["Dressage", "Toureio"]' })).toEqual([
      "Dressage",
      "Toureio",
    ]);
  });

  it("não repete a mesma disciplina", () => {
    expect(disciplinasDe({ disciplinas: ["Lazer", "Lazer"] })).toEqual(["Lazer"]);
  });

  it("devolve lista vazia quando não há disciplinas", () => {
    expect(disciplinasDe({ disciplinas: null })).toEqual([]);
    expect(disciplinasDe({ disciplinas: "" })).toEqual([]);
    expect(disciplinasDe({ disciplinas: "   " })).toEqual([]);
  });
});

describe("aplicarFiltros", () => {
  it("devolve tudo quando não há filtros", () => {
    const lista = [anuncio(), anuncio({ sexo: "femea" })];
    expect(aplicarFiltros(lista, FILTROS_VAZIOS)).toHaveLength(2);
  });

  it("pesquisa ignorando acentos, para 'golega' encontrar 'Golegã'", () => {
    const r = aplicarFiltros([anuncio()], { ...FILTROS_VAZIOS, search: "golega" });
    expect(r).toHaveLength(1);
  });

  it("pesquisa ignorando maiúsculas", () => {
    expect(aplicarFiltros([anuncio()], { ...FILTROS_VAZIOS, search: "IMPERADOR" })).toHaveLength(1);
  });

  it("exclui um cavalo sob consulta quando o comprador definiu um preço", () => {
    const semPreco = anuncio({ preco: null });
    expect(aplicarFiltros([semPreco], { ...FILTROS_VAZIOS, precoMax: 30000 })).toHaveLength(0);
    // Sem filtro de preço, continua a aparecer.
    expect(aplicarFiltros([semPreco], FILTROS_VAZIOS)).toHaveLength(1);
  });

  it("aplica os limites de preço de forma inclusiva", () => {
    const a = anuncio({ preco: 20000 });
    expect(aplicarFiltros([a], { ...FILTROS_VAZIOS, precoMin: 20000 })).toHaveLength(1);
    expect(aplicarFiltros([a], { ...FILTROS_VAZIOS, precoMax: 20000 })).toHaveLength(1);
    expect(aplicarFiltros([a], { ...FILTROS_VAZIOS, precoMin: 20001 })).toHaveLength(0);
  });

  it("filtra por disciplina em ambas as formas da coluna", () => {
    const arr = anuncio({ disciplinas: ["Dressage"] });
    const str = anuncio({ disciplinas: "Trabalho, Lazer" });
    const f = { ...FILTROS_VAZIOS, disciplina: "Lazer" };
    expect(aplicarFiltros([arr, str], f)).toHaveLength(1);
  });

  it("combina filtros por conjunção", () => {
    const lista = [
      anuncio({ sexo: "femea", preco: 5000 }),
      anuncio({ sexo: "femea", preco: 90000 }),
    ];
    const r = aplicarFiltros(lista, { ...FILTROS_VAZIOS, sexo: "femea", precoMax: 10000 });
    expect(r).toHaveLength(1);
  });
});

describe("ordenar", () => {
  it("põe os destaques à frente, seja qual for a ordenação", () => {
    const normal = anuncio({ nome_cavalo: "Normal", preco: 1000 });
    const pago = anuncio({ nome_cavalo: "Pago", preco: 90000, destaque: true });
    expect(ordenar([normal, pago], "preco_asc")[0].nome_cavalo).toBe("Pago");
  });

  it("ordena por preço crescente e decrescente", () => {
    const barato = anuncio({ preco: 1000 });
    const caro = anuncio({ preco: 90000 });
    expect(ordenar([caro, barato], "preco_asc")[0].preco).toBe(1000);
    expect(ordenar([barato, caro], "preco_desc")[0].preco).toBe(90000);
  });

  it("empurra os cavalos sem preço para o fim da ordenação por preço crescente", () => {
    const semPreco = anuncio({ preco: null, nome_cavalo: "Sob consulta" });
    const comPreco = anuncio({ preco: 5000, nome_cavalo: "Com preço" });
    expect(ordenar([semPreco, comPreco], "preco_asc")[0].nome_cavalo).toBe("Com preço");
  });

  it("ordena por data para 'recentes'", () => {
    const velho = anuncio({ created_at: "2020-01-01T00:00:00Z", nome_cavalo: "Velho" });
    const novo = anuncio({ created_at: "2026-08-20T00:00:00Z", nome_cavalo: "Novo" });
    expect(ordenar([velho, novo], "recentes")[0].nome_cavalo).toBe("Novo");
  });

  it("ordena por idade nos dois sentidos", () => {
    const poldro = anuncio({ idade: 3, nome_cavalo: "Poldro" });
    const feito = anuncio({ idade: 15, nome_cavalo: "Feito" });
    expect(ordenar([feito, poldro], "idade_asc")[0].nome_cavalo).toBe("Poldro");
    expect(ordenar([poldro, feito], "idade_desc")[0].nome_cavalo).toBe("Feito");
  });

  it("empurra quem não declara idade para o fim das duas ordenações por idade", () => {
    const semIdade = anuncio({ idade: null, nome_cavalo: "Sem idade" });
    const comIdade = anuncio({ idade: 8, nome_cavalo: "Com idade" });
    expect(ordenar([semIdade, comIdade], "idade_asc")[1].nome_cavalo).toBe("Sem idade");
    expect(ordenar([semIdade, comIdade], "idade_desc")[1].nome_cavalo).toBe("Sem idade");
  });

  it("não altera a lista original", () => {
    const lista = [anuncio({ preco: 9 }), anuncio({ preco: 1 })];
    ordenar(lista, "preco_asc");
    expect(lista[0].preco).toBe(9);
  });
});

describe("paginar", () => {
  const muitos = Array.from({ length: 50 }, (_, i) => ({ i }));

  it("corta a primeira página", () => {
    const r = paginar(muitos, 1, 10);
    expect(r.itens).toHaveLength(10);
    expect(r.itens[0]).toEqual({ i: 0 });
    expect(r.totalPaginas).toBe(5);
    expect(r.total).toBe(50);
  });

  it("corta uma página do meio", () => {
    expect(paginar(muitos, 3, 10).itens[0]).toEqual({ i: 20 });
  });

  it("limita uma página fora de alcance à última, em vez de mostrar vazio", () => {
    const r = paginar(muitos, 99, 10);
    expect(r.pagina).toBe(5);
    expect(r.itens).toHaveLength(10);
  });

  it("devolve uma página válida para uma lista vazia", () => {
    const r = paginar([], 1, 10);
    expect(r.totalPaginas).toBe(1);
    expect(r.itens).toEqual([]);
  });

  it("usa o tamanho de página predefinido", () => {
    expect(
      paginar(
        Array.from({ length: 100 }, (_, i) => i),
        1
      ).itens
    ).toHaveLength(POR_PAGINA);
  });
});
