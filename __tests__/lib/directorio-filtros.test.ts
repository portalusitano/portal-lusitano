import { describe, it, expect } from "vitest";
import {
  FILTROS_VAZIOS,
  ORDENACOES,
  POR_PAGINA,
  aplicarFiltros,
  contarFiltrosActivos,
  contem,
  escreverFiltros,
  actividadesDisponiveis,
  estatisticas,
  lerFiltros,
  normalizar,
  ordenar,
  paginar,
  regioesDisponiveis,
  temFiltrosActivos,
  type CoudelariaListavel,
} from "@/lib/directorio-filtros";

/** Substitui o `URLSearchParams` sem precisar do DOM. */
function params(obj: Record<string, string>) {
  return { get: (k: string) => (k in obj ? obj[k] : null) };
}

function coudelaria(p: Partial<CoudelariaListavel> = {}): CoudelariaListavel {
  return {
    slug: "x",
    nome: "Coudelaria X",
    localizacao: "Évora",
    regiao: "Alentejo",
    ano_fundacao: 1950,
    num_cavalos: 10,
    especialidades: ["Alta Escola"],
    linhagens: ["Veiga"],
    destaque: false,
    ...p,
  };
}

describe("lerFiltros", () => {
  it("devolve os valores por omissão para um URL vazio", () => {
    expect(lerFiltros(params({}))).toEqual(FILTROS_VAZIOS);
  });

  it("lê os filtros que estão no URL", () => {
    expect(
      lerFiltros(
        params({ search: "golega", regiao: "Ribatejo", actividade: "toureio", pagina: "2" })
      )
    ).toEqual({
      search: "golega",
      regiao: "Ribatejo",
      actividade: "toureio",
      ordenar: "recomendadas",
      pagina: 2,
    });
  });

  it("recusa uma actividade que não existe em vez de devolver um ecrã vazio", () => {
    expect(lerFiltros(params({ actividade: "vinicultura" })).actividade).toBe("");
    expect(lerFiltros(params({ actividade: "DRESSAGE" })).actividade).toBe("dressage");
  });

  it("um link antigo, com a especialidade em bruto, aterra na actividade dela", () => {
    // `?especialidade=Turismo Equestre` foi partilhado enquanto o filtro era o
    // texto da base. Passa pela taxonomia em vez de dar zero resultados.
    expect(lerFiltros(params({ especialidade: "Turismo Equestre" })).actividade).toBe("turismo");
    expect(lerFiltros(params({ especialidade: "Working Equitation" })).actividade).toBe("trabalho");
    // O que a taxonomia não conhece dá «sem filtro», que mostra as vinte e nove.
    expect(lerFiltros(params({ especialidade: "Produção de Feno" })).actividade).toBe("");
    // Havendo as duas, manda a nova.
    expect(
      lerFiltros(params({ actividade: "toureio", especialidade: "Turismo Equestre" })).actividade
    ).toBe("toureio");
  });

  it("ignora uma ordenação que não existe em vez de a passar adiante", () => {
    expect(lerFiltros(params({ ordenar: "preco_asc" })).ordenar).toBe("recomendadas");
    for (const o of ORDENACOES) {
      expect(lerFiltros(params({ ordenar: o })).ordenar).toBe(o);
    }
  });

  it("recusa páginas inválidas", () => {
    expect(lerFiltros(params({ pagina: "0" })).pagina).toBe(1);
    expect(lerFiltros(params({ pagina: "-3" })).pagina).toBe(1);
    expect(lerFiltros(params({ pagina: "abc" })).pagina).toBe(1);
    expect(lerFiltros(params({ pagina: "3.7" })).pagina).toBe(3);
  });

  it("trata 'todas' como ausência de filtro, que era o valor da versão anterior", () => {
    expect(lerFiltros(params({ regiao: "todas" })).regiao).toBe("");
    expect(lerFiltros(params({ actividade: "all" })).actividade).toBe("");
  });
});

describe("escreverFiltros", () => {
  it("não escreve nada quando não há filtros", () => {
    expect(escreverFiltros(FILTROS_VAZIOS)).toBe("");
  });

  it("omite os valores por omissão e mantém o resto", () => {
    expect(
      escreverFiltros({ ...FILTROS_VAZIOS, regiao: "Alentejo", ordenar: "nome", pagina: 1 })
    ).toBe("regiao=Alentejo&ordenar=nome");
  });

  it("dá a volta completa: ler o que se escreveu devolve o mesmo estado", () => {
    const estado = {
      search: "veiga",
      regiao: "Ribatejo",
      actividade: "dressage",
      ordenar: "cavalos" as const,
      pagina: 3,
    };
    const url = new URLSearchParams(escreverFiltros(estado));
    expect(lerFiltros(url)).toEqual(estado);
  });
});

describe("temFiltrosActivos / contarFiltrosActivos", () => {
  it("a ordenação e a página não contam como filtro", () => {
    const f = { ...FILTROS_VAZIOS, ordenar: "nome" as const, pagina: 4 };
    expect(temFiltrosActivos(f)).toBe(false);
    expect(contarFiltrosActivos(f)).toBe(0);
  });

  it("conta os três que estreitam a lista", () => {
    const f = { ...FILTROS_VAZIOS, search: "a", regiao: "b", actividade: "c" };
    expect(temFiltrosActivos(f)).toBe(true);
    expect(contarFiltrosActivos(f)).toBe(3);
  });
});

describe("normalizar / contem", () => {
  it("tira acentos e maiúsculas", () => {
    expect(normalizar("Golegã")).toBe("golega");
    expect(normalizar("Companhia das Lezírias")).toBe("companhia das lezirias");
  });

  it("encontra com e sem acento, nos dois sentidos", () => {
    expect(contem("Companhia das Lezírias", "lezirias")).toBe(true);
    expect(contem("Companhia das Lezirias", "Lezírias")).toBe(true);
    expect(contem("Alter do Chão", "chao")).toBe(true);
    expect(contem("Alter do Chão", "porto")).toBe(false);
  });
});

describe("aplicarFiltros", () => {
  const lista = [
    coudelaria({
      slug: "a",
      nome: "Coudelaria Alter Real",
      localizacao: "Alter do Chão",
      especialidades: ["Alta Escola", "Working Equitation"],
    }),
    coudelaria({
      slug: "b",
      nome: "Companhia das Lezírias",
      localizacao: "Samora Correia",
      regiao: "Ribatejo",
      especialidades: [
        "Alta Escola",
        "Reprodução Selectiva",
        "Equitação de Trabalho",
        "Enoturismo",
      ],
      linhagens: ["Andrade"],
    }),
    coudelaria({ slug: "c", nome: "Quinta da Hermida", regiao: "Centro", especialidades: [] }),
  ];

  it("sem filtros devolve tudo", () => {
    expect(aplicarFiltros(lista, FILTROS_VAZIOS)).toHaveLength(3);
  });

  it("filtra por região com correspondência exacta", () => {
    expect(
      aplicarFiltros(lista, { ...FILTROS_VAZIOS, regiao: "Ribatejo" }).map((c) => c.slug)
    ).toEqual(["b"]);
  });

  it("filtra pela actividade, e não pelo texto em bruto", () => {
    // A `b` tem «Reprodução Selectiva», que é criação; a `a` e a `c` não.
    expect(
      aplicarFiltros(lista, { ...FILTROS_VAZIOS, actividade: "criacao" }).map((c) => c.slug)
    ).toEqual(["b"]);
    // «Working Equitation» e «Equitação de Trabalho» caem na mesma pastilha.
    expect(
      aplicarFiltros(lista, { ...FILTROS_VAZIOS, actividade: "trabalho" }).map((c) => c.slug)
    ).toEqual(["a", "b"]);
  });

  it("a pesquisa continua a varrer o texto em bruto que já não é pastilha", () => {
    // «Enoturismo» deixou de ter filtro próprio; quem o escrever tem de o achar.
    expect(
      aplicarFiltros(lista, { ...FILTROS_VAZIOS, search: "enoturismo" }).map((c) => c.slug)
    ).toEqual(["b"]);
  });

  it("os filtros acumulam-se: região E actividade E texto", () => {
    expect(
      aplicarFiltros(lista, {
        ...FILTROS_VAZIOS,
        regiao: "Ribatejo",
        actividade: "dressage",
        search: "samora",
      }).map((c) => c.slug)
    ).toEqual(["b"]);

    // A mesma pesquisa noutra região não devolve nada — não há um filtro a anular o outro.
    expect(
      aplicarFiltros(lista, { ...FILTROS_VAZIOS, regiao: "Alentejo", search: "samora" })
    ).toHaveLength(0);
  });

  it("a pesquisa é insensível a acentos e a maiúsculas", () => {
    expect(
      aplicarFiltros(lista, { ...FILTROS_VAZIOS, search: "lezirias" }).map((c) => c.slug)
    ).toEqual(["b"]);
    expect(aplicarFiltros(lista, { ...FILTROS_VAZIOS, search: "CHAO" }).map((c) => c.slug)).toEqual(
      ["a"]
    );
  });

  it("a pesquisa também encontra por linhagem e por especialidade", () => {
    expect(
      aplicarFiltros(lista, { ...FILTROS_VAZIOS, search: "andrade" }).map((c) => c.slug)
    ).toEqual(["b"]);
    expect(
      aplicarFiltros(lista, { ...FILTROS_VAZIOS, search: "reproducao" }).map((c) => c.slug)
    ).toEqual(["b"]);
  });

  it("uma coluna jsonb guardada como string vale o que lá está", () => {
    /* As colunas são `jsonb` e há linhas nesta base que guardam uma **string**
       com JSON dentro. O defeito era calado: `Array.isArray` dizia que não,
       a lista saía vazia, e a coudelaria continuava no ecrã mas deixava de ser
       encontrável pelo texto das especialidades e das linhagens — sem erro
       nenhum, sem nada a que culpar. */
    const enrolada = [
      {
        slug: "s",
        nome: "Coudelaria Enrolada",
        regiao: "Alentejo",
        especialidades: '["Dressage","Enoturismo"]',
        linhagens: '["Veiga"]',
      },
    ];
    expect(aplicarFiltros(enrolada, { ...FILTROS_VAZIOS, search: "enoturismo" })).toHaveLength(1);
    expect(aplicarFiltros(enrolada, { ...FILTROS_VAZIOS, search: "veiga" })).toHaveLength(1);
    expect(aplicarFiltros(enrolada, { ...FILTROS_VAZIOS, actividade: "dressage" })).toHaveLength(1);
    expect(actividadesDisponiveis(enrolada)).toEqual([
      { valor: "dressage", n: 1 },
      { valor: "turismo", n: 1 },
    ]);
  });

  it("aguenta colunas nulas sem rebentar", () => {
    const magra = [
      { slug: "z", nome: "Sem nada", especialidades: null, linhagens: null, regiao: null },
    ];
    expect(aplicarFiltros(magra, { ...FILTROS_VAZIOS, search: "nada" })).toHaveLength(1);
    expect(aplicarFiltros(magra, { ...FILTROS_VAZIOS, regiao: "Alentejo" })).toHaveLength(0);
  });
});

describe("ordenar", () => {
  const lista = [
    coudelaria({ slug: "b", nome: "Beta", ano_fundacao: 1980, num_cavalos: 5 }),
    coudelaria({ slug: "a", nome: "Alfa", ano_fundacao: 1907, num_cavalos: 40 }),
    coudelaria({ slug: "c", nome: "Ómega", ano_fundacao: null, num_cavalos: null }),
  ];

  it("'recomendadas' preserva a ordem que veio do servidor", () => {
    expect(ordenar(lista, "recomendadas").map((c) => c.slug)).toEqual(["b", "a", "c"]);
  });

  it("não altera o array original", () => {
    ordenar(lista, "nome");
    expect(lista.map((c) => c.slug)).toEqual(["b", "a", "c"]);
  });

  it("por nome, com as regras do português", () => {
    expect(ordenar(lista, "nome").map((c) => c.nome)).toEqual(["Alfa", "Beta", "Ómega"]);
  });

  it("por antiguidade, e quem não tem ano vai para o fim", () => {
    expect(ordenar(lista, "antiguidade").map((c) => c.slug)).toEqual(["a", "b", "c"]);
  });

  it("por número de cavalos, e quem não declara vai para o fim", () => {
    expect(ordenar(lista, "cavalos").map((c) => c.slug)).toEqual(["a", "b", "c"]);
  });
});

describe("paginar", () => {
  const lista = Array.from({ length: 29 }, (_, i) => coudelaria({ slug: String(i) }));

  it("corta pelo tamanho de página do directório", () => {
    const p = paginar(lista, 1, POR_PAGINA);
    expect(POR_PAGINA).toBe(24);
    expect(p.itens).toHaveLength(24);
    expect(p.totalPaginas).toBe(2);
    expect(p.total).toBe(29);
  });

  it("uma página fora do intervalo devolve a última, não um ecrã vazio", () => {
    expect(paginar(lista, 9, POR_PAGINA).pagina).toBe(2);
  });
});

describe("facetas", () => {
  const lista = [
    coudelaria({ regiao: "Alentejo", especialidades: ["Alta Escola"] }),
    coudelaria({ regiao: "Alentejo", especialidades: ["Alta Escola", "Reprodução Selectiva"] }),
    coudelaria({ regiao: "Ribatejo", especialidades: ["Alta Escola"] }),
    coudelaria({ regiao: "Beira Alta", especialidades: [] }),
  ];

  it("as regiões saem dos dados, da mais frequente para a menos", () => {
    expect(regioesDisponiveis(lista)).toEqual([
      { valor: "Alentejo", n: 2 },
      { valor: "Beira Alta", n: 1 },
      { valor: "Ribatejo", n: 1 },
    ]);
  });

  it("não inventa regiões sem coudelarias nem esquece as que existem", () => {
    const valores = regioesDisponiveis(lista).map((r) => r.valor);
    expect(valores).not.toContain("Porto");
    expect(valores).toContain("Beira Alta");
  });

  it("as actividades vêm pela ordem canónica, com a contagem, e sem as vazias", () => {
    // As três «Alta Escola» são uma actividade só, `dressage`; a «Reprodução
    // Selectiva» é `criacao`. Onde havia duas pastilhas de texto em bruto
    // passa a haver duas actividades — e nos dados a sério, 58 passam a 7.
    expect(actividadesDisponiveis(lista)).toEqual([
      { valor: "criacao", n: 1 },
      { valor: "dressage", n: 3 },
    ]);
  });

  it("ignora valores vazios ou nulos", () => {
    expect(
      regioesDisponiveis([coudelaria({ regiao: "  " }), coudelaria({ regiao: null })])
    ).toEqual([]);
  });
});

describe("estatisticas", () => {
  it("conta o que está lá, sem '+' pendurado nem números escritos à mão", () => {
    const lista = [
      coudelaria({ regiao: "Alentejo", ano_fundacao: 1907 }),
      coudelaria({ regiao: "Alentejo", ano_fundacao: 1950 }),
      coudelaria({ regiao: "Ribatejo", ano_fundacao: 2001 }),
    ];
    expect(estatisticas(lista)).toEqual({ coudelarias: 3, regioes: 2, maisAntiga: 1907 });
  });

  it("a mais antiga é nula quando nenhuma linha tem ano — a página omite o número", () => {
    expect(estatisticas([coudelaria({ ano_fundacao: null })]).maisAntiga).toBeNull();
  });

  it("ignora anos impossíveis em vez de os mostrar", () => {
    expect(
      estatisticas([coudelaria({ ano_fundacao: 0 }), coudelaria({ ano_fundacao: 1899 })])
    ).toMatchObject({ maisAntiga: 1899 });
  });

  it("uma lista vazia dá zeros, não um painel com valores inventados", () => {
    expect(estatisticas([])).toEqual({ coudelarias: 0, regioes: 0, maisAntiga: null });
  });
});
