/**
 * Os defeitos que a auditoria de conteúdo encontrou uma vez, agora presos por
 * testes.
 *
 * Cada bloco cita o caso real que o motivou — está tudo em
 * `docs/auditoria-coudelarias.md` —, porque um teste que diz «devolve true»
 * sem dizer para quê é um teste que ninguém sabe se pode apagar.
 */
import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
  anoDeFundacaoSoNaProsa,
  auditar,
  codigoPostalNaLocalizacao,
  codigoPostalValido,
  colunasDeCoordenadasEmConflito,
  coordenadaDeCentroDePovoacao,
  distanciaKm,
  frasesPartilhadas,
  idadeRelativaSemAncora,
  imagemDeBancoDeImagens,
  imagensEmFalta,
  telefoneEspacoReservado,
  websiteDeTerceiros,
  type LinhaAuditavel,
} from "@/lib/auditoria-coudelarias";

const base = (extra: Partial<LinhaAuditavel> = {}): LinhaAuditavel => ({
  slug: "uma-casa",
  ...extra,
});

describe("codigoPostalValido", () => {
  it("aceita a forma portuguesa NNNN-NNN", () => {
    for (const cp of ["2100-047", "7440-201", "3440-126"]) {
      expect(codigoPostalValido(cp)).toBe(true);
    }
  });

  it("recusa o que não tem essa forma", () => {
    for (const cp of ["2100", "2100047", "21000-47", "abc-def", "", null, undefined]) {
      expect(codigoPostalValido(cp)).toBe(false);
    }
  });
});

describe("codigoPostalNaLocalizacao", () => {
  /* Oito das 35 linhas têm o código postal dentro da morada e a coluna vazia.
     Isto é o que permite movê-lo sem inventar: só se lê o que já lá está. */
  it("encontra o código postal escrito dentro da morada", () => {
    expect(codigoPostalNaLocalizacao("Herdade da Agolada de Baixo, 2100-047 Coruche")).toBe(
      "2100-047"
    );
    expect(
      codigoPostalNaLocalizacao("Monte Mayor, EN 114 Km 145.5, 7050-704 Montemor-o-Novo")
    ).toBe("7050-704");
  });

  it("devolve null quando não há nenhum", () => {
    expect(codigoPostalNaLocalizacao("Muge, Salvaterra de Magos")).toBeNull();
    expect(codigoPostalNaLocalizacao("N119 km 41.3, 2100 Coruche")).toBeNull();
    expect(codigoPostalNaLocalizacao(null)).toBeNull();
  });
});

describe("telefoneEspacoReservado", () => {
  /* «+351 243 558 XXX» esteve em produção na Coudelaria João Pedro Rodrigues. */
  it("apanha o espaço reservado com XXX", () => {
    expect(telefoneEspacoReservado("+351 243 558 XXX")).toBe(true);
    expect(telefoneEspacoReservado("+351 243 558 xxx")).toBe(true);
  });

  it("apanha o que não tem algarismos que cheguem", () => {
    expect(telefoneEspacoReservado("+351 91")).toBe(true);
    expect(telefoneEspacoReservado("a definir")).toBe(true);
  });

  it("deixa passar números a sério, com e sem espaços", () => {
    expect(telefoneEspacoReservado("+351 243 588 040")).toBe(false);
    expect(telefoneEspacoReservado("+351 249957154")).toBe(false);
    expect(telefoneEspacoReservado("+49 171 1234567")).toBe(false);
  });

  it("não se queixa de um campo vazio, que é honesto", () => {
    expect(telefoneEspacoReservado(null)).toBe(false);
    expect(telefoneEspacoReservado("")).toBe(false);
  });
});

describe("websiteDeTerceiros", () => {
  /* A Coudelaria Vila Viçosa tem por `website` a sua página num directório
     concorrente, não o sítio dela. */
  it("apanha a página num directório de terceiros", () => {
    expect(
      websiteDeTerceiros(
        "https://lusitanohorsefinder.com/breeder-site-coudelaria-vila-vicosa-homepage/"
      )
    ).toBe(true);
  });

  it("deixa passar o sítio da própria casa", () => {
    expect(websiteDeTerceiros("https://www.casacadaval.pt")).toBe(false);
    expect(websiteDeTerceiros("https://alterreal.pt")).toBe(false);
    expect(websiteDeTerceiros(null)).toBe(false);
  });
});

describe("imagemDeBancoDeImagens", () => {
  /* A Dressage Plus tinha por capa uma fotografia do Unsplash. */
  it("apanha a fotografia de stock", () => {
    expect(
      imagemDeBancoDeImagens("https://images.unsplash.com/photo-1534307671554-9a6d81f4d629?w=1200")
    ).toBe(true);
  });

  it("deixa passar as do repositório", () => {
    expect(imagemDeBancoDeImagens("/images/coudelarias/alter-real/galeria-1.jpg")).toBe(false);
  });
});

describe("coordenadaDeCentroDePovoacao", () => {
  /* 39.1167 é 39° 07'. Nove das 29 coordenadas são conversões destas, ou seja
     o centro da povoação com ~900 m de incerteza. */
  it("apanha a conversão de graus e minutos", () => {
    expect(coordenadaDeCentroDePovoacao(39.1167, -8.6667)).toBe(true); // Casa Cadaval
    expect(coordenadaDeCentroDePovoacao(38.7167, -7.9833)).toBe(true); // Monte Velho
    expect(coordenadaDeCentroDePovoacao(38.6833, -8.4667)).toBe(true); // Quinta da Hermida
  });

  it("deixa passar uma coordenada lida de um aparelho", () => {
    expect(coordenadaDeCentroDePovoacao(39.102786, -8.859475)).toBe(false); // Henrique Abecasis
    expect(coordenadaDeCentroDePovoacao(38.1146, -8.2709)).toBe(false);
  });

  it("exige os dois eixos, porque um só acontece por acaso", () => {
    expect(coordenadaDeCentroDePovoacao(39.1167, -8.859475)).toBe(false);
  });

  it("não se pronuncia sobre o que não existe", () => {
    expect(coordenadaDeCentroDePovoacao(null, null)).toBe(false);
    expect(coordenadaDeCentroDePovoacao(39.1167, null)).toBe(false);
  });
});

describe("distanciaKm", () => {
  it("mede Lisboa a Santarém em cerca de 65 km", () => {
    const d = distanciaKm([38.7223, -9.1393], [39.2363, -8.687]);
    expect(d).toBeGreaterThan(60);
    expect(d).toBeLessThan(72);
  });

  it("dá zero para o mesmo ponto", () => {
    expect(distanciaKm([39.4013, -8.4874], [39.4013, -8.4874])).toBe(0);
  });
});

describe("colunasDeCoordenadasEmConflito", () => {
  /* A Coudelaria Pedro Passanha tem as duas colunas a 17,8 km uma da outra. */
  it("apanha as duas colunas a discordar", () => {
    const d = colunasDeCoordenadasEmConflito(
      base({
        coordenadas_lat: 38.117,
        coordenadas_lng: -8.067,
        latitude: 38.114609,
        longitude: -8.270913,
      })
    );
    expect(d).not.toBeNull();
    expect(d!).toBeGreaterThan(17);
    expect(d!).toBeLessThan(19);
  });

  it("cala-se quando as duas colunas dizem o mesmo", () => {
    expect(
      colunasDeCoordenadasEmConflito(
        base({
          coordenadas_lat: 39.1994,
          coordenadas_lng: -7.6614,
          latitude: 39.1994,
          longitude: -7.6614,
        })
      )
    ).toBeNull();
  });

  it("cala-se quando falta uma delas", () => {
    expect(
      colunasDeCoordenadasEmConflito(base({ coordenadas_lat: 39.1994, coordenadas_lng: -7.6614 }))
    ).toBeNull();
  });
});

describe("anoDeFundacaoSoNaProsa", () => {
  /* A Coudelaria Luís Bastos diz «fundada em 2006» na descrição e na história,
     e tem `ano_fundacao` a NULL — numa listagem que ordena por antiguidade. */
  it("apanha o ano que está no texto e não na coluna", () => {
    expect(
      anoDeFundacaoSoNaProsa(
        base({
          ano_fundacao: null,
          historia: "Coudelaria Luís Bastos fundada em 2006 por Luís Bastos, com 5 éguas.",
        })
      )
    ).toBe(2006);
  });

  it("cala-se quando a coluna está preenchida", () => {
    expect(
      anoDeFundacaoSoNaProsa(base({ ano_fundacao: 2006, historia: "fundada em 2006" }))
    ).toBeNull();
  });

  it("não confunde uma data histórica com o ano de fundação", () => {
    /* A Lagoalva conta que em 1193 D. Sancho I doou territórios à Ordem de
       Santiago. Apanhar esse ano seria pior do que não apanhar nenhum. */
    expect(
      anoDeFundacaoSoNaProsa(
        base({
          ano_fundacao: null,
          historia: "A sua história remonta ao séc. XII — em 1193, o rei D. Sancho I doou…",
        })
      )
    ).toBeNull();
  });
});

describe("idadeRelativaSemAncora", () => {
  /* «Há 25 anos no Alentejo» fica mais errado a cada ano que passa. */
  it("apanha a idade escrita por diferença", () => {
    expect(
      idadeRelativaSemAncora(base({ historia: "Há 25 anos no Alentejo que a Coudelaria cria…" }))
    ).toMatch(/25 anos/);
    expect(
      idadeRelativaSemAncora(base({ historia: "foi fundada há mais de 220 anos por Rafael…" }))
    ).toMatch(/220 anos/);
  });

  it("cala-se quando não há idade relativa nenhuma", () => {
    expect(idadeRelativaSemAncora(base({ historia: "Fundada em 1748 por D. João V." }))).toBeNull();
  });
});

describe("frasesPartilhadas", () => {
  /* Medido nas 35: não há uma única frase repetida entre coudelarias. Este
     teste existe para que continue a ser verdade. */
  it("apanha um parágrafo copiado de uma casa para outra", () => {
    const frase = "Uma das mais prestigiadas coudelarias de Portugal, com uma tradição secular.";
    const achado = frasesPartilhadas([
      base({ slug: "casa-a", historia: frase }),
      base({ slug: "casa-b", descricao: frase }),
      base({ slug: "casa-c", historia: "Outra coisa completamente diferente e bem mais longa." }),
    ]);
    expect(achado).toHaveLength(1);
    expect(achado[0].slugs).toEqual(["casa-a", "casa-b"]);
  });

  it("não conta fragmentos curtos, que são vocabulário do domínio", () => {
    expect(
      frasesPartilhadas([
        base({ slug: "casa-a", historia: "Cria Puro Sangue Lusitano." }),
        base({ slug: "casa-b", historia: "Cria Puro Sangue Lusitano." }),
      ])
    ).toEqual([]);
  });
});

describe("imagensEmFalta", () => {
  /* 85 das 166 ligações da base apontavam para ficheiros inexistentes: a base
     guarda `imagem-NN.webp` e não há um único `.webp` em disco. */
  it("apanha os caminhos que não existem", () => {
    const emDisco = new Set(["/images/coudelarias/uma-casa/capa.jpg"]);
    const defeitos = imagensEmFalta(
      [
        base({
          foto_capa: "/images/coudelarias/uma-casa/capa.jpg",
          galeria: [
            "/images/coudelarias/uma-casa/imagem-02.webp",
            "/images/coudelarias/uma-casa/imagem-03.webp",
          ],
        }),
      ],
      (c) => emDisco.has(c)
    );
    expect(defeitos).toHaveLength(2);
    expect(defeitos.every((d) => d.campo === "galeria")).toBe(true);
  });

  it("deixa as de fora para a regra do banco de imagens", () => {
    expect(
      imagensEmFalta([base({ foto_capa: "https://images.unsplash.com/photo-1" })], () => false)
    ).toEqual([]);
  });
});

describe("auditar", () => {
  it("junta tudo numa lista só, com slug, campo e razão", () => {
    const defeitos = auditar([
      base({
        slug: "mal-tratada",
        localizacao: "Herdade Qualquer, 2100-047 Coruche",
        codigo_postal: null,
        telefone: "+351 243 558 XXX",
        website: "https://lusitanohorsefinder.com/breeder-site-x/",
        foto_capa: "https://images.unsplash.com/photo-1",
        coordenadas_lat: 39.1167,
        coordenadas_lng: -8.6667,
        latitude: 39.25,
        longitude: -8.6667,
        ano_fundacao: null,
        historia: "A coudelaria foi fundada em 1987 na Herdade das Coelheiras.",
      }),
    ]);
    const campos = defeitos.map((d) => `${d.campo}`).sort();
    expect(campos).toContain("telefone");
    expect(campos).toContain("website");
    expect(campos).toContain("foto_capa");
    expect(campos).toContain("codigo_postal");
    expect(campos).toContain("ano_fundacao");
    expect(defeitos.filter((d) => d.campo === "coordenadas")).toHaveLength(2);
    expect(defeitos.every((d) => d.slug && d.razao)).toBe(true);
  });

  it("não se queixa de uma linha sã", () => {
    expect(
      auditar([
        base({
          slug: "alter-real",
          localizacao: "Alter do Chão",
          telefone: "+351 245 610 060",
          website: "https://alterreal.pt",
          foto_capa: "/images/coudelarias/alter-real/galeria-1.jpg",
          coordenadas_lat: 39.1994,
          coordenadas_lng: -7.6614,
          latitude: 39.1994,
          longitude: -7.6614,
          ano_fundacao: 1748,
          historia: "Foi a vontade de um rei que fez nascer a Coudelaria de Alter.",
        }),
      ])
    ).toEqual([]);
  });
});

describe("o repositório em si", () => {
  /* A causa dos 85 caminhos mortos: a base guarda `imagem-NN.webp` e o
     repositório não tem um único `.webp`. Enquanto isso for verdade, qualquer
     galeria gravada com esses nomes nasce morta — e este teste é o que faz
     essa assimetria aparecer se alguém acrescentar os ficheiros e a assumir
     resolvida. */
  it("diz quantas fotografias existem mesmo, e com que extensões", () => {
    const raiz = join(process.cwd(), "public", "images", "coudelarias");
    const extensoes = new Set<string>();
    let total = 0;
    for (const pasta of readdirSync(raiz, { withFileTypes: true })) {
      if (!pasta.isDirectory()) continue;
      for (const f of readdirSync(join(raiz, pasta.name))) {
        total++;
        extensoes.add((f.match(/\.[^.]+$/)?.[0] ?? "").toLowerCase());
      }
    }
    expect(total).toBeGreaterThan(0);
    // Se isto passar a incluir `.webp`, a conversão aconteceu e o relatório
    // em docs/auditoria-coudelarias.md precisa de ser revisto.
    expect([...extensoes].sort()).toEqual([".jpg"]);
  });
});
