/**
 * As duas metades do directório têm de falar a mesma língua.
 *
 * A página escreve sete pastilhas de actividade e, ao lado delas, uma caixa de
 * procura. **Escrever na caixa o que está escrito na pastilha dava zero.**
 * Medido sobre as vinte e nove coudelarias verdadeiras, com os sete rótulos
 * nas três línguas — vinte e uma pastilhas ao todo: **treze devolviam zero
 * resultados** e dezassete devolviam um número diferente do que a pastilha
 * promete. Em inglês falhavam seis das sete; em espanhol outras seis.
 *
 * A causa era de vocabulário: a pastilha filtra pela **actividade** — a
 * taxonomia de `lib/especialidades`, que junta «Toureio» com «Tauromaquia» e
 * «Equitação de Trabalho» com «Working Equitation» — e a procura varria só o
 * **texto em bruto** da base, que está todo em português e nunca diz «working
 * equitation».
 *
 * Estes testes fixam as duas invariantes que a correcção compra, e a terceira
 * que a mantém honesta:
 *
 *   1. escrever o rótulo de uma pastilha nunca dá zero;
 *   2. dá **pelo menos** o que a pastilha promete — a procura é mais larga do
 *      que o filtro, nunca mais estreita (é o filtro que arruma, não é a
 *      procura que apaga);
 *   3. as palavras escritas à mão em `PALAVRAS_DA_ACTIVIDADE` são as mesmas
 *      que os três dicionários escrevem nas pastilhas. Estão à mão porque
 *      importar os `locales/` para o pacote do cliente custava 366 KiB para ir
 *      buscar catorze palavras; é este teste que impede a deriva.
 */

import { describe, expect, it } from "vitest";
import {
  PALAVRAS_DA_ACTIVIDADE,
  corresponde,
  especialidadesDoCartao,
  linhagensDoCartao,
} from "@/components/directorio/procura";
import { ACTIVIDADES, actividadesDe, type Actividade } from "@/lib/especialidades";
import { normalizar } from "@/lib/directorio-filtros";
import pt from "@/locales/pt.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";

const DICIONARIOS = { pt, en, es } as const;
type Lingua = keyof typeof DICIONARIOS;
const LINGUAS = Object.keys(DICIONARIOS) as Lingua[];

const rotulo = (l: Lingua, a: Actividade): string =>
  (DICIONARIOS[l].directorio as unknown as Record<string, string>)[`activity_${a}`];

/**
 * O recorte que a pesquisa lê, com as especialidades tal como estão na base —
 * em português, sem uma única palavra em inglês ou em espanhol. São estas
 * quatro que davam zero a quem escrevesse o rótulo da pastilha.
 */
const CASOS = [
  {
    slug: "cl-lezirias",
    nome: "Coudelaria CL - Companhia das Lezírias",
    regiao: "Ribatejo",
    especialidades: ["Dressage", "Equitação de Trabalho", "Modelo e Andamentos", "Exportação"],
  },
  {
    slug: "veiga-teixeira",
    nome: "Coudelaria Veiga Teixeira",
    regiao: "Ribatejo",
    especialidades: [
      "Criação de Lusitanos",
      "Linhagem Veiga",
      "Tauromaquia",
      "Equitação Tradicional",
    ],
  },
  {
    slug: "monte-velho",
    nome: "Monte Velho Equo Resort",
    regiao: "Alentejo",
    especialidades: ["Dressage", "Trail Riding", "Turismo Equestre", "Formação"],
  },
  {
    slug: "santa-margarida",
    nome: "Coudelaria de Santa Margarida",
    regiao: "Alentejo",
    especialidades: ["Criação de Lusitanos", "Linhagem Xaquiro", "Reprodução Selectiva"],
    linhagens: ["Veiga", "Andrade"],
  },
];

describe("a pastilha e a caixa de procura falam a mesma língua", () => {
  for (const lingua of LINGUAS) {
    for (const actividade of ACTIVIDADES) {
      it(`${lingua}: escrever «${rotulo(lingua, actividade)}» acha quem a pastilha conta`, () => {
        const daPastilha = CASOS.filter((c) =>
          actividadesDe(c.especialidades).includes(actividade)
        );
        // Sem ninguém nesta actividade não há nada a garantir neste recorte.
        if (daPastilha.length === 0) return;

        const daProcura = CASOS.filter((c) => corresponde(c, rotulo(lingua, actividade)));

        // 1. Nunca zero: era esta a falha, e é a pior que uma caixa pode ter.
        expect(daProcura.length).toBeGreaterThan(0);
        // 2. A procura é um superconjunto do filtro, nunca um subconjunto.
        for (const c of daPastilha) {
          expect(daProcura.map((x) => x.slug)).toContain(c.slug);
        }
      });
    }
  }

  it("as palavras escritas à mão são as que os três dicionários escrevem", () => {
    for (const actividade of ACTIVIDADES) {
      const palavras = normalizar(PALAVRAS_DA_ACTIVIDADE[actividade]);
      for (const lingua of LINGUAS) {
        expect(
          palavras,
          `${lingua}.directorio.activity_${actividade} não está em PALAVRAS_DA_ACTIVIDADE`
        ).toContain(normalizar(rotulo(lingua, actividade)));
      }
    }
  });

  it("não inventa correspondências: quem não faz turismo não é achado por «Tourism»", () => {
    const so = CASOS.find((c) => c.slug === "cl-lezirias")!;
    expect(actividadesDe(so.especialidades)).not.toContain("turismo");
    expect(corresponde(so, "Tourism")).toBe(false);
  });
});

describe("uma linhagem escrita na coluna das especialidades", () => {
  const AZINHAL = {
    especialidades: [
      "Linhagem Andrade",
      "Equitação de Trabalho",
      "Toureio",
      "Conservação Genética",
    ],
    linhagens: ["Andrade"],
  };
  const PASSANHA = {
    especialidades: ["Criação de Lusitanos", "Dressage", "Tauromaquia", "Linhagem Veiga e Andrade"],
    linhagens: ["Veiga", "Andrade", "Quina"],
  };
  const MARGARIDA = CASOS.find((c) => c.slug === "santa-margarida")!;

  it("sai da linha das especialidades", () => {
    expect(especialidadesDoCartao(AZINHAL.especialidades)).toEqual([
      "Equitação de Trabalho",
      "Toureio",
      "Conservação Genética",
    ]);
    expect(especialidadesDoCartao(MARGARIDA.especialidades)).toEqual([
      "Criação de Lusitanos",
      "Reprodução Selectiva",
    ]);
  });

  it("não se repete quando a coluna própria já a tem", () => {
    // Era este o cartão que dizia «Linhagem Andrade» numa linha e
    // «LINHAGENS · Andrade» duas linhas abaixo.
    expect(linhagensDoCartao(AZINHAL.especialidades, AZINHAL.linhagens)).toEqual(["Andrade"]);
    expect(linhagensDoCartao(PASSANHA.especialidades, PASSANHA.linhagens)).toEqual([
      "Veiga",
      "Andrade",
      "Quina",
    ]);
  });

  it("não se perde quando a coluna própria não a tem", () => {
    // «Linhagem Xaquiro» não está em «Veiga, Andrade» — apagá-la perdia o
    // único sítio do cartão onde esse nome aparecia.
    expect(linhagensDoCartao(MARGARIDA.especialidades, MARGARIDA.linhagens)).toEqual([
      "Veiga",
      "Andrade",
      "Xaquiro",
    ]);
  });

  it("aguenta as duas colunas nulas e a string com JSON lá dentro", () => {
    expect(especialidadesDoCartao(null)).toEqual([]);
    expect(linhagensDoCartao(null, null)).toEqual([]);
    expect(linhagensDoCartao('["Linhagem Quina"]', '["Veiga"]')).toEqual(["Veiga", "Quina"]);
  });

  it("uma especialidade que só por acaso começa por outra palavra fica", () => {
    expect(especialidadesDoCartao(["Linha de Sangue Antiga", "Dressage"])).toEqual([
      "Linha de Sangue Antiga",
      "Dressage",
    ]);
  });
});
