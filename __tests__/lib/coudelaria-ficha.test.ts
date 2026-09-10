import { describe, expect, it } from "vitest";
import {
  contaInstagram,
  dadosEstruturados,
  descricaoFactual,
  distanciaKm,
  dominioLegivel,
  fichaTecnica,
  hrefDireccoes,
  hrefEmail,
  hrefTelefone,
  kmLegivel,
  lerListaDeTexto,
  lerTestemunhos,
  maisPerto,
  normalizarCoudelaria,
  painelValeAPena,
  paragrafos,
  resumoParaMeta,
  telefoneLegivel,
  temContacto,
  urlAbsoluto,
  urlRedeSocial,
  type CoudelariaFicha,
} from "@/lib/coudelaria-ficha";

const ROTULOS = {
  localizacao: "Localização",
  regiao: "Região",
  fundacao: "Fundação",
  cavalos: "Cavalos",
  linhagens: "Linhagens",
};

const FRASES = {
  coudelariaEm: "coudelaria em",
  fundadaEm: "fundada em",
  cavalos: "cavalos",
};

function coudelaria(extra: Partial<CoudelariaFicha> = {}): CoudelariaFicha {
  return {
    id: "id-1",
    nome: "Coudelaria de Alter Real",
    slug: "alter-real",
    localizacao: "Alter do Chão",
    regiao: "Alentejo",
    ...extra,
  };
}

describe("hrefTelefone", () => {
  it("tira espaços e parênteses — o `tel:` não os tolera", () => {
    expect(hrefTelefone("+351 245 000 000")).toBe("tel:+351245000000");
    expect(hrefTelefone("(+351) 912-345-678")).toBe("tel:+351912345678");
  });

  it("põe o indicativo num número nacional de nove dígitos", () => {
    expect(hrefTelefone("245 000 000")).toBe("tel:+351245000000");
  });

  it("aceita a forma com 00", () => {
    expect(hrefTelefone("00351245000000")).toBe("tel:+351245000000");
  });

  it("não inventa um número a partir de lixo", () => {
    expect(hrefTelefone("")).toBeNull();
    expect(hrefTelefone(null)).toBeNull();
    expect(hrefTelefone("a pedido")).toBeNull();
    expect(hrefTelefone("123")).toBeNull();
  });
});

describe("telefoneLegivel", () => {
  it("agrupa o número nacional em 3-3-3", () => {
    expect(telefoneLegivel("245000000")).toBe("+351 245 000 000");
    expect(telefoneLegivel("+351245000000")).toBe("+351 245 000 000");
  });

  it("deixa em paz o que não reconhece, em vez de agrupar mal", () => {
    expect(telefoneLegivel("+33 1 23 45 67 89")).toBe("+33 1 23 45 67 89");
    expect(telefoneLegivel("  245 000 000 / 912 000 000 ")).toBe("245 000 000 / 912 000 000");
  });
});

describe("hrefEmail", () => {
  it("aceita um email e recusa o resto", () => {
    expect(hrefEmail("geral@exemplo.pt")).toBe("mailto:geral@exemplo.pt");
    expect(hrefEmail("geral (arroba) exemplo")).toBeNull();
    expect(hrefEmail("")).toBeNull();
  });
});

describe("urlAbsoluto e dominioLegivel", () => {
  it("acrescenta o protocolo a um domínio escrito à mão", () => {
    expect(urlAbsoluto("exemplo.pt")).toBe("https://exemplo.pt/");
    expect(urlAbsoluto("www.exemplo.pt/coudelaria")).toBe("https://www.exemplo.pt/coudelaria");
  });

  it("recusa o que não é endereço — senão vira link relativo", () => {
    expect(urlAbsoluto("brevemente")).toBeNull();
    expect(urlAbsoluto("  ")).toBeNull();
    expect(urlAbsoluto(null)).toBeNull();
  });

  it("mostra o domínio sem o www", () => {
    expect(dominioLegivel("https://www.exemplo.pt/pagina")).toBe("exemplo.pt");
    expect(dominioLegivel("exemplo.pt")).toBe("exemplo.pt");
  });
});

describe("contaInstagram", () => {
  it("lê o nome venha ele como for", () => {
    expect(contaInstagram("@coudelaria")?.url).toBe("https://www.instagram.com/coudelaria");
    expect(contaInstagram("coudelaria")?.etiqueta).toBe("@coudelaria");
    expect(contaInstagram("https://instagram.com/coudelaria/")?.url).toBe(
      "https://www.instagram.com/coudelaria"
    );
  });

  it("nunca produz /@nome, que é um 404", () => {
    expect(contaInstagram("@nome")?.url).not.toContain("/@");
  });

  it("desiste do que não é um nome de conta", () => {
    expect(contaInstagram("ver no facebook")).toBeNull();
    expect(contaInstagram("")).toBeNull();
  });
});

describe("urlRedeSocial", () => {
  it("aceita URL inteiro ou só o nome da página", () => {
    expect(urlRedeSocial("https://facebook.com/pagina", "https://www.facebook.com")).toBe(
      "https://facebook.com/pagina"
    );
    expect(urlRedeSocial("pagina", "https://www.facebook.com")).toBe(
      "https://www.facebook.com/pagina"
    );
    expect(urlRedeSocial(null, "https://www.facebook.com")).toBeNull();
  });
});

describe("hrefDireccoes", () => {
  it("só existe havendo coordenadas", () => {
    expect(hrefDireccoes(39.19, -7.66)).toContain("destination=39.19,-7.66");
    expect(hrefDireccoes(undefined, -7.66)).toBeNull();
    expect(hrefDireccoes(Number.NaN, 1)).toBeNull();
  });
});

describe("temContacto", () => {
  it("é falso quando a ficha não tem por onde se lhe pegue", () => {
    expect(temContacto(coudelaria())).toBe(false);
  });

  it("basta um", () => {
    expect(temContacto(coudelaria({ email: "geral@exemplo.pt" }))).toBe(true);
    expect(temContacto(coudelaria({ instagram: "@coudelaria" }))).toBe(true);
  });
});

describe("resumoParaMeta", () => {
  it("corta na fronteira da palavra e marca o corte", () => {
    const texto = "Coudelaria dedicada à criação do Puro Sangue Lusitano desde mil novecentos";
    const saida = resumoParaMeta(texto, 40);
    expect(saida.length).toBeLessThanOrEqual(40);
    expect(saida.endsWith("…")).toBe(true);
    expect(saida).not.toContain("criaç…");
  });

  it("não mexe no que já cabe", () => {
    expect(resumoParaMeta("Curto e quanto basta.", 60)).toBe("Curto e quanto basta.");
  });

  it("normaliza espaços e aguenta o vazio", () => {
    expect(resumoParaMeta("  duas   linhas\n aqui ", 60)).toBe("duas linhas aqui");
    expect(resumoParaMeta(null)).toBe("");
  });
});

describe("descricaoFactual", () => {
  it("diz o sítio e mais nada que não esteja nos dados", () => {
    const saida = descricaoFactual(coudelaria(), FRASES);
    expect(saida).toBe("Coudelaria de Alter Real — coudelaria em Alter do Chão, Alentejo.");
  });

  it("acrescenta ano e número de cavalos quando existem", () => {
    const saida = descricaoFactual(coudelaria({ ano_fundacao: 1748, num_cavalos: 120 }), FRASES);
    expect(saida).toContain("fundada em 1748");
    expect(saida).toContain("120 cavalos");
  });

  it("não escreve adjectivos de venda", () => {
    const saida = descricaoFactual(coudelaria({ ano_fundacao: 1748 }), FRASES).toLowerCase();
    for (const palavra of ["excelência", "prestígio", "melhor", "verificada", "certificada"]) {
      expect(saida).not.toContain(palavra);
    }
  });
});

describe("paragrafos", () => {
  it("parte em linhas em branco e limpa o resto", () => {
    expect(paragrafos("um\n\ndois\n\n\ntrês")).toEqual(["um", "dois", "três"]);
    expect(paragrafos("")).toEqual([]);
    expect(paragrafos(null)).toEqual([]);
  });
});

describe("fichaTecnica", () => {
  it("só devolve as linhas que têm dados", () => {
    const linhas = fichaTecnica(coudelaria(), ROTULOS);
    expect(linhas.map((l) => l.chave)).toEqual(["localizacao", "regiao"]);
  });

  it("marca como numéricas as que alinham em coluna", () => {
    const linhas = fichaTecnica(coudelaria({ ano_fundacao: 1748, num_cavalos: 90 }), ROTULOS);
    expect(linhas.find((l) => l.chave === "fundacao")?.numerico).toBe(true);
    expect(linhas.find((l) => l.chave === "cavalos")?.numerico).toBe(true);
  });

  it("junta as listas com o separador do sistema", () => {
    const linhas = fichaTecnica(coudelaria({ linhagens: ["Veiga", "Andrade"] }), ROTULOS);
    expect(linhas.find((l) => l.chave === "linhagens")?.valor).toBe("Veiga · Andrade");
  });

  it("uma ficha vazia não dá painel nenhum", () => {
    const vazia: CoudelariaFicha = { id: "x", nome: "X", slug: "x" };
    expect(fichaTecnica(vazia, ROTULOS)).toEqual([]);
  });

  it("deixa fora o que já tem lugar próprio na página", () => {
    const linhas = fichaTecnica(
      coudelaria({ horario: "Seg–Sex", especialidades: ["Alta Escola"] }),
      ROTULOS
    );
    expect(linhas.map((l) => l.chave)).not.toContain("horario");
    expect(linhas.map((l) => l.chave)).not.toContain("especialidades");
  });
});

describe("painelValeAPena", () => {
  it("não desenha um painel que só repete o cabeçalho", () => {
    expect(painelValeAPena(fichaTecnica(coudelaria(), ROTULOS))).toBe(false);
  });

  it("desenha-o mal haja um dado novo", () => {
    expect(painelValeAPena(fichaTecnica(coudelaria({ ano_fundacao: 1748 }), ROTULOS))).toBe(true);
    expect(painelValeAPena(fichaTecnica(coudelaria({ linhagens: ["Veiga"] }), ROTULOS))).toBe(true);
  });
});

describe("dadosEstruturados", () => {
  const url = "https://portal-lusitano.pt/directorio/alter-real";

  it("aponta o @id e o url para a página, não para o nome nem para o site da coudelaria", () => {
    const esquema = dadosEstruturados(coudelaria({ website: "exemplo.pt" }), {
      urlPagina: url,
      descricao: "Coudelaria em Alter do Chão.",
    });
    expect(esquema["@id"]).toBe(url);
    expect(esquema.url).toBe(url);
    expect(esquema.sameAs).toContain("https://exemplo.pt/");
  });

  it("não inventa preços", () => {
    const esquema = dadosEstruturados(coudelaria(), { urlPagina: url, descricao: "x" });
    expect(esquema).not.toHaveProperty("priceRange");
  });

  it("só leva avaliação média havendo avaliações", () => {
    const sem = dadosEstruturados(coudelaria(), { urlPagina: url, descricao: "x" });
    expect(sem).not.toHaveProperty("aggregateRating");
    const com = dadosEstruturados(coudelaria(), {
      urlPagina: url,
      descricao: "x",
      avaliacao: { media: 4.5, total: 2 },
    });
    expect(com.aggregateRating).toMatchObject({ ratingValue: 4.5, reviewCount: 2 });
  });

  it("não escreve campos de contacto vazios", () => {
    const esquema = dadosEstruturados(coudelaria({ telefone: "nao tem" }), {
      urlPagina: url,
      descricao: "x",
    });
    expect(esquema).not.toHaveProperty("telephone");
    expect(esquema).not.toHaveProperty("email");
    expect(esquema).not.toHaveProperty("image");
  });

  it("leva a geolocalização quando há coordenadas", () => {
    const esquema = dadosEstruturados(
      coudelaria({ coordenadas_lat: 39.19, coordenadas_lng: -7.66 }),
      { urlPagina: url, descricao: "x" }
    );
    expect(esquema.geo).toMatchObject({ latitude: 39.19, longitude: -7.66 });
  });
});

/* ─── A fronteira ─────────────────────────────────────────────────────────────
 *
 * O defeito que matou a construção em produção não era da coluna
 * `cavalos_destaque`: era da forma. Todas as colunas de lista desta linha são
 * `jsonb` lidas com `.length ? … .map(…)`, e uma string tem `length`. Estes
 * testes são sobre a forma, e por isso valem para as oito colunas de uma vez.
 */
describe("lerListaDeTexto", () => {
  it("aceita o array, que é a forma boa", () => {
    expect(lerListaDeTexto(["Dressage", "Toureio"])).toEqual(["Dressage", "Toureio"]);
    expect(lerListaDeTexto([])).toEqual([]);
  });

  it("desembrulha a string com JSON dentro — a forma que partiu a construção", () => {
    expect(lerListaDeTexto('["Dressage","Alta Escola"]')).toEqual(["Dressage", "Alta Escola"]);
  });

  it("uma string que não é JSON é um elemento, não um erro", () => {
    expect(lerListaDeTexto("Dressage")).toEqual(["Dressage"]);
  });

  it("nulo, vazio e lixo dão lista vazia", () => {
    expect(lerListaDeTexto(null)).toEqual([]);
    expect(lerListaDeTexto(undefined)).toEqual([]);
    expect(lerListaDeTexto("")).toEqual([]);
    expect(lerListaDeTexto("   ")).toEqual([]);
    expect(lerListaDeTexto(42)).toEqual([]);
    expect(lerListaDeTexto({ a: 1 })).toEqual([]);
  });

  it("deita fora o que não é texto, o que é espaço e o que se repete", () => {
    expect(lerListaDeTexto([" Dressage ", "", 7, null, "Dressage", "Toureio"])).toEqual([
      "Dressage",
      "Toureio",
    ]);
  });
});

describe("lerTestemunhos", () => {
  it("aceita o array de objectos e a string com JSON dentro", () => {
    const um = [{ autor: "Ana", texto: "Óptimo", data: "2024" }];
    expect(lerTestemunhos(um)).toEqual(um);
    expect(lerTestemunhos(JSON.stringify(um))).toEqual(um);
  });

  it("sem autor ou sem texto não há citação", () => {
    expect(
      lerTestemunhos([{ autor: "Ana" }, { texto: "Óptimo" }, { autor: " ", texto: "x" }, null, 3])
    ).toEqual([]);
  });

  it("a data só entra quando existe", () => {
    expect(lerTestemunhos([{ autor: "Ana", texto: "Bom", data: "  " }])).toEqual([
      { autor: "Ana", texto: "Bom" },
    ]);
  });
});

describe("normalizarCoudelaria", () => {
  it("põe as oito colunas de lista na forma prometida, venham como vierem", () => {
    const normalizada = normalizarCoudelaria({
      id: "1",
      nome: "X",
      slug: "x",
      especialidades: '["Dressage"]',
      linhagens: "Veiga",
      premios: null,
      servicos: ["Desbaste"],
      tags: '"nao e um array"',
      galeria: '["/a.jpg"]',
      cavalos_destaque: '[{"nome":"Firme"}]',
      testemunhos: '[{"autor":"Ana","texto":"Bom"}]',
    });
    expect(normalizada.especialidades).toEqual(["Dressage"]);
    expect(normalizada.linhagens).toEqual(["Veiga"]);
    expect(normalizada.premios).toEqual([]);
    expect(normalizada.servicos).toEqual(["Desbaste"]);
    expect(normalizada.tags).toEqual([]);
    expect(normalizada.galeria).toEqual(["/a.jpg"]);
    expect(normalizada.cavalos_destaque).toEqual([{ nome: "Firme" }]);
    expect(normalizada.testemunhos).toEqual([{ autor: "Ana", texto: "Bom" }]);
  });

  it("depois dela, `.map` nunca rebenta em nenhuma das oito", () => {
    const nada = normalizarCoudelaria({ id: "1", nome: "X", slug: "x" });
    for (const lista of [
      nada.especialidades,
      nada.linhagens,
      nada.premios,
      nada.servicos,
      nada.tags,
      nada.galeria,
      nada.cavalos_destaque,
      nada.testemunhos,
    ]) {
      expect(Array.isArray(lista)).toBe(true);
    }
  });
});

// ─── Vizinhança ──────────────────────────────────────────────────────────────

describe("distanciaKm", () => {
  it("mede o que se sabe medir", () => {
    // Alter do Chão → Golegã: ~72 km em linha recta.
    const km = distanciaKm({ lat: 39.1994, lng: -7.6614 }, { lat: 39.4028, lng: -8.4839 });
    expect(km).toBeGreaterThan(65);
    expect(km).toBeLessThan(80);
  });

  it("o mesmo ponto dá zero e a ordem não conta", () => {
    const a = { lat: 38.7, lng: -9.1 };
    const b = { lat: 39.4, lng: -8.4 };
    expect(distanciaKm(a, a)).toBe(0);
    expect(distanciaKm(a, b)).toBeCloseTo(distanciaKm(b, a)!, 9);
  });

  it("sem coordenadas devolve nada, e não zero — zero seria dizer «aqui ao lado»", () => {
    expect(distanciaKm({ lat: 1, lng: 1 }, { lat: null, lng: 2 })).toBeNull();
    expect(distanciaKm({}, {})).toBeNull();
    expect(distanciaKm({ lat: NaN, lng: 1 }, { lat: 2, lng: 2 })).toBeNull();
  });
});

describe("maisPerto", () => {
  const lista = [
    { slug: "aqui", nome: "Aqui", coordenadas_lat: 39.0, coordenadas_lng: -8.0 },
    { slug: "perto", nome: "Perto", coordenadas_lat: 39.05, coordenadas_lng: -8.0 },
    { slug: "medio", nome: "Médio", coordenadas_lat: 39.5, coordenadas_lng: -8.0 },
    { slug: "longe", nome: "Longe", coordenadas_lat: 41.0, coordenadas_lng: -8.0 },
    { slug: "sem-sitio", nome: "Sem sítio" },
  ];
  const origem = { slug: "aqui", coordenadas_lat: 39.0, coordenadas_lng: -8.0 };

  it("ordena pela distância e não se devolve a si própria", () => {
    expect(maisPerto(origem, lista).map((c) => c.slug)).toEqual(["perto", "medio", "longe"]);
  });

  it("quem não tem coordenadas fica de fora — «—» seria uma linha a dizer que não sabe", () => {
    expect(maisPerto(origem, lista, 9).some((c) => c.slug === "sem-sitio")).toBe(false);
  });

  it("sem coordenadas na origem não há vizinhança nenhuma", () => {
    expect(maisPerto({ slug: "aqui" }, lista)).toEqual([]);
  });

  it("respeita o limite pedido", () => {
    expect(maisPerto(origem, lista, 1)).toHaveLength(1);
    expect(maisPerto(origem, lista, 0)).toHaveLength(0);
  });
});

describe("kmLegivel", () => {
  it("abaixo de dez leva uma casa: entre 1,2 e 8,7 há duas coudelarias diferentes", () => {
    expect(kmLegivel(1.24, "pt-PT")).toBe("1,2");
    expect(kmLegivel(8.71, "pt-PT")).toBe("8,7");
  });

  it("a partir de dez arredonda, que é a precisão que a linha recta tem", () => {
    expect(kmLegivel(42.4, "pt-PT")).toBe("42");
    expect(kmLegivel(120.6, "en-GB")).toBe("121");
  });
});
