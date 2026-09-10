import { describe, it, expect } from "vitest";
import {
  normalizar,
  filtrarPorTexto,
  filtrar,
  contarPorRegiao,
  somarCavalos,
  contarRegioes,
  formatarNumero,
  partirTitulo,
  type CoudelariaFiltravel,
} from "@/lib/mapa-coudelarias";

/** Um recorte fiel das coudelarias reais: nomes, terras, regiões e efectivos. */
const amostra: CoudelariaFiltravel[] = [
  { nome: "Cavalos na Areia", localizacao: "Torre, Comporta", regiao: "Alentejo", num_cavalos: 40 },
  {
    nome: "Herdade da Malhadinha Nova",
    localizacao: "Beja",
    regiao: "Alentejo",
    num_cavalos: 118,
  },
  { nome: "Coudelaria de Alter Real", localizacao: "Alter do Chão", regiao: "Alentejo" },
  { nome: "Manuel Veiga", localizacao: "Azinhaga", regiao: "Ribatejo", num_cavalos: 92 },
  { nome: "Casa Cadaval", localizacao: "Salvaterra de Magos", regiao: "Ribatejo", num_cavalos: 66 },
  {
    nome: "Morgado Lusitano",
    localizacao: "Alverca do Ribatejo",
    regiao: "Lisboa",
    num_cavalos: 51,
  },
  { nome: "Quinta Lusitânia", localizacao: "Couto do Mosteiro", regiao: "Centro", num_cavalos: 25 },
  {
    nome: "Jupiter Classical Dressage",
    localizacao: "Viseu",
    regiao: "Beira Alta",
    num_cavalos: 12,
  },
];

describe("normalizar", () => {
  it("tira acentos e passa a minúsculas", () => {
    expect(normalizar("Quinta Lusitânia")).toBe("quinta lusitania");
    expect(normalizar("  Golegã  ")).toBe("golega");
    expect(normalizar("REGIÃO")).toBe("regiao");
  });
});

describe("filtrarPorTexto", () => {
  it("sem termo devolve tudo", () => {
    expect(filtrarPorTexto(amostra)).toHaveLength(amostra.length);
    expect(filtrarPorTexto(amostra, "   ")).toHaveLength(amostra.length);
  });

  it("encontra pelo nome, pela terra e pela região", () => {
    expect(filtrarPorTexto(amostra, "cadaval").map((c) => c.nome)).toEqual(["Casa Cadaval"]);
    expect(filtrarPorTexto(amostra, "Beja").map((c) => c.nome)).toEqual([
      "Herdade da Malhadinha Nova",
    ]);
    expect(filtrarPorTexto(amostra, "Ribatejo")).toHaveLength(3); // 2 do Ribatejo + Alverca do Ribatejo
  });

  it("ignora acentos nos dois sentidos", () => {
    // Escrito sem til, encontra o nome com til.
    expect(filtrarPorTexto(amostra, "lusitania").map((c) => c.nome)).toEqual(["Quinta Lusitânia"]);
    // Escrito com til, encontra na mesma.
    expect(filtrarPorTexto(amostra, "Lusitânia").map((c) => c.nome)).toEqual(["Quinta Lusitânia"]);
  });

  it("um termo sem correspondência devolve lista vazia, não a lista toda", () => {
    expect(filtrarPorTexto(amostra, "xpto")).toEqual([]);
  });

  it("não devolve o mesmo array, para o chamador não o poder mutar", () => {
    expect(filtrarPorTexto(amostra)).not.toBe(amostra);
  });
});

describe("filtrar", () => {
  it("sem filtros devolve tudo", () => {
    expect(filtrar(amostra)).toHaveLength(8);
  });

  it("cruza pesquisa e região em vez de as pôr a competir", () => {
    // «Alter» encontra a coudelaria de Alter Real (Alentejo).
    expect(filtrar(amostra, { procura: "Alter", regiao: "Alentejo" })).toHaveLength(1);
    // A mesma pesquisa noutra região não devolve nada — e isso é a resposta certa.
    expect(filtrar(amostra, { procura: "Alter", regiao: "Ribatejo" })).toEqual([]);
  });

  it("só região", () => {
    expect(filtrar(amostra, { regiao: "Alentejo" })).toHaveLength(3);
    expect(filtrar(amostra, { regiao: "Beira Alta" })).toHaveLength(1);
  });

  it("região inexistente devolve vazio", () => {
    expect(filtrar(amostra, { regiao: "Açores" })).toEqual([]);
  });
});

describe("contarPorRegiao", () => {
  it("conta o universo todo e ordena da maior para a menor", () => {
    const contas = contarPorRegiao(amostra);
    expect(contas.map((c) => [c.regiao, c.total])).toEqual([
      ["Alentejo", 3],
      ["Ribatejo", 2],
      ["Beira Alta", 1],
      ["Centro", 1],
      ["Lisboa", 1],
    ]);
  });

  it("as contagens seguem a pesquisa — era este o defeito", () => {
    const visiveis = filtrarPorTexto(amostra, "xpto");
    const contas = contarPorRegiao(amostra, visiveis);
    // Todas as regiões continuam listadas...
    expect(contas).toHaveLength(5);
    // ...mas nenhuma promete coudelarias que a pesquisa já apagou.
    expect(contas.every((c) => c.total === 0)).toBe(true);
  });

  it("uma pesquisa parcial deixa só a região que ainda tem alguma", () => {
    const visiveis = filtrarPorTexto(amostra, "Beja");
    const contas = contarPorRegiao(amostra, visiveis);
    expect(contas[0]).toEqual({ regiao: "Alentejo", total: 1 });
    expect(contas.filter((c) => c.total > 0)).toHaveLength(1);
  });

  it("em empate ordena alfabeticamente, para a lista não dançar", () => {
    const contas = contarPorRegiao(amostra).filter((c) => c.total === 1);
    expect(contas.map((c) => c.regiao)).toEqual(["Beira Alta", "Centro", "Lisboa"]);
  });

  it("ignora regiões vazias", () => {
    const contas = contarPorRegiao([...amostra, { nome: "X", localizacao: "Y", regiao: "" }]);
    expect(contas.map((c) => c.regiao)).not.toContain("");
  });
});

describe("somarCavalos", () => {
  it("soma os efectivos declarados", () => {
    expect(somarCavalos(amostra)).toBe(40 + 118 + 92 + 66 + 51 + 25 + 12);
  });

  it("uma coudelaria sem efectivo declarado não estraga a soma", () => {
    // «Coudelaria de Alter Real» não tem num_cavalos na amostra.
    expect(somarCavalos([{ nome: "A", localizacao: "B", regiao: "C" }])).toBe(0);
  });

  it("não é a contagem de coudelarias — o defeito que corrige", () => {
    expect(somarCavalos(amostra)).not.toBe(amostra.length);
  });
});

describe("contarRegioes", () => {
  it("conta regiões distintas", () => {
    expect(contarRegioes(amostra)).toBe(5);
  });

  it("não conta a região vazia", () => {
    expect(contarRegioes([{ nome: "A", localizacao: "B", regiao: "" }])).toBe(0);
  });
});

describe("formatarNumero", () => {
  it("agrupa segundo a convenção de cada língua, não segundo um ponto à mão", () => {
    // Em português e espanhol um número de quatro dígitos NÃO leva separador
    // (CLDR, minimumGroupingDigits: 2); em inglês leva. Escrever «2.746» à mão
    // estaria errado em duas das três línguas — é por isso que quem decide é o
    // `Intl` e não uma expressão regular.
    expect(formatarNumero(2746, "pt")).toBe("2746");
    expect(formatarNumero(2746, "es")).toBe("2746");
    expect(formatarNumero(2746, "en")).toBe("2,746");
  });

  it("a partir de cinco dígitos agrupa nas três", () => {
    expect(formatarNumero(12345, "en")).toBe("12,345");
    expect(formatarNumero(12345, "pt")).not.toBe("12345");
    expect(formatarNumero(12345, "es")).not.toBe("12345");
  });

  it("números pequenos ficam como estão", () => {
    expect(formatarNumero(29, "pt")).toBe("29");
    expect(formatarNumero(0, "pt")).toBe("0");
  });

  it("língua desconhecida cai em pt", () => {
    expect(formatarNumero(12345, "fr")).toBe(formatarNumero(12345, "pt"));
  });
});

describe("partirTitulo", () => {
  it("acende a palavra do dicionário", () => {
    expect(partirTitulo("Descubra Portugal", "Portugal")).toEqual({
      antes: "Descubra ",
      meio: "Portugal",
      depois: "",
    });
    expect(partirTitulo("Discover Portugal today", "Portugal")).toEqual({
      antes: "Discover ",
      meio: "Portugal",
      depois: " today",
    });
  });

  it("palavra ausente do título devolve o título inteiro, não um pedaço", () => {
    // Era isto que o `split("Portugal")` escrito à mão não sabia fazer: numa
    // língua sem a palavra, o segundo pedaço saía `undefined`.
    expect(partirTitulo("Entdecke das Land", "Portugal")).toEqual({
      antes: "Entdecke das Land",
      meio: "",
      depois: "",
    });
  });

  it("destaque vazio não parte nada", () => {
    expect(partirTitulo("Descubra Portugal", "")).toEqual({
      antes: "Descubra Portugal",
      meio: "",
      depois: "",
    });
  });

  it("junta-se outra vez ao título original", () => {
    for (const [titulo, d] of [
      ["Descubra Portugal", "Portugal"],
      ["Discover Portugal", "Portugal"],
      ["Sem realce nenhum", "Portugal"],
    ] as const) {
      const { antes, meio, depois } = partirTitulo(titulo, d);
      expect(antes + meio + depois).toBe(titulo);
    }
  });
});
