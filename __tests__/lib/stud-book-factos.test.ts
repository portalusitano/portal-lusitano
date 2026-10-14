import { describe, expect, it } from "vitest";

import {
  factosDoAnuncio,
  reunirFactosDoStudBook,
  type EntradaDoStudBook,
} from "@/lib/documentos/stud-book/factos";
import { temRegistoConfirmadoNoStudBook } from "@/lib/documentos/stud-book/contrato";

/**
 * Os factos que a consulta dá a quem revê.
 *
 * O que estes testes protegem não é a aritmética — é a fronteira, a mesma que o
 * `documentos-sinais.test.ts` protege do outro lado: **um facto conta, nunca
 * decide**. E protegem a regra que, de todas, é a que mais depressa se perde
 * quando alguém acrescentar um campo: uma ausência de resposta não é uma
 * acusação a um vendedor.
 */

const ANUNCIO = {
  nome: "Maestoso XV",
  dataNascimento: "2014-03-12",
  cor: "Ruço",
  numeroRegisto: "LUS-2014-00421",
};

const REGISTO = {
  nome: "MAESTOSO XV",
  dataNascimento: "2014-03-12",
  pelagem: "Ruço",
  numeroRegisto: "LUS-2014-00421",
};

function entrada(p: Partial<EntradaDoStudBook> & { cavaloId: string }): EntradaDoStudBook {
  return { anuncio: ANUNCIO, consulta: null, ...p };
}

describe("uma ausência de resposta nunca é uma acusação", () => {
  it("nunca consultado dá por confirmar, e mais nada", () => {
    expect(factosDoAnuncio(entrada({ cavaloId: "c1" }))).toEqual([
      { tipo: "consulta_por_confirmar", cavaloId: "c1", estado: "nunca_consultado", tentativas: 0 },
    ]);
  });

  it("o interruptor em baixo dá por confirmar — o site inteiro vive assim hoje", () => {
    const factos = factosDoAnuncio(
      entrada({ cavaloId: "c1", consulta: { estado: "desligado", tentativas: 0 } })
    );
    expect(factos).toEqual([
      { tipo: "consulta_por_confirmar", cavaloId: "c1", estado: "desligado", tentativas: 0 },
    ]);
  });

  it("a APSL em baixo dá por confirmar, com o motivo escrito", () => {
    for (const motivo of [
      "sem_resposta",
      "resposta_recusada",
      "formato_desconhecido",
      "tecto_diario",
      "sem_vez_a_tempo",
    ] as const) {
      const factos = factosDoAnuncio(
        entrada({
          cavaloId: "c1",
          consulta: { estado: "indisponivel", motivo, tentativas: 2 },
        })
      );
      expect(factos).toEqual([
        {
          tipo: "consulta_por_confirmar",
          cavaloId: "c1",
          estado: "indisponivel",
          motivo,
          tentativas: 2,
        },
      ]);
      // Nenhum destes é uma afirmação sobre o cavalo.
      expect(JSON.stringify(factos)).not.toContain("falso");
      expect(JSON.stringify(factos)).not.toContain("suspeito");
    }
  });
});

describe("um cavalo que a APSL não conhece não é um cavalo falso", () => {
  it("dá registo_desconhecido, com o identificador por que se perguntou", () => {
    // Um erro de escrita, um cavalo estrangeiro por inscrever, um número antigo
    // e uma falsificação produzem todos o mesmo silêncio, e nós não os sabemos
    // distinguir. O identificador está lá porque muda a leitura de quem revê.
    const factos = factosDoAnuncio(
      entrada({
        cavaloId: "c1",
        consulta: { estado: "desconhecido", identificador: "microchip", tentativas: 1 },
      })
    );
    expect(factos).toEqual([
      { tipo: "registo_desconhecido", cavaloId: "c1", identificador: "microchip" },
    ]);
  });
});

describe("quando a APSL confirma", () => {
  it("sem divergências, dá um facto só", () => {
    const factos = factosDoAnuncio(
      entrada({
        cavaloId: "c1",
        consulta: {
          estado: "confirmado",
          identificador: "numero_registo",
          registo: REGISTO,
          tentativas: 1,
        },
      })
    );
    expect(factos).toEqual([
      {
        tipo: "registo_confirmado",
        cavaloId: "c1",
        identificador: "numero_registo",
        registo: REGISTO,
      },
    ]);
  });

  it("com divergências, dá dois — são duas coisas diferentes", () => {
    const factos = factosDoAnuncio(
      entrada({
        cavaloId: "c1",
        anuncio: { ...ANUNCIO, dataNascimento: "2019-06-01" },
        consulta: {
          estado: "confirmado",
          identificador: "numero_registo",
          registo: REGISTO,
          tentativas: 1,
        },
      })
    );

    expect(factos.map((f) => f.tipo)).toEqual([
      "registo_confirmado",
      "divergencia_com_o_stud_book",
    ]);
    expect(factos[1]).toEqual({
      tipo: "divergencia_com_o_stud_book",
      cavaloId: "c1",
      identificador: "numero_registo",
      divergencias: [
        { campo: "data_nascimento", noAnuncio: "2019-06-01", noStudBook: "2014-03-12" },
      ],
    });
  });

  it("um confirmado sem identificador guardado é uma linha estragada, não um confirmado", () => {
    const factos = factosDoAnuncio(
      entrada({
        cavaloId: "c1",
        consulta: { estado: "confirmado", registo: REGISTO, tentativas: 1 },
      })
    );
    expect(factos[0].tipo).toBe("consulta_por_confirmar");
  });
});

describe("a pergunta que o público faz", () => {
  it("só o confirmado conta, e não há função nenhuma para o inverso", () => {
    expect(temRegistoConfirmadoNoStudBook({ estado: "confirmado" })).toBe(true);
    for (const estado of [
      "desconhecido",
      "indisponivel",
      "desligado",
      "sem_identificador",
    ] as const) {
      expect(temRegistoConfirmadoNoStudBook({ estado })).toBe(false);
    }
    expect(temRegistoConfirmadoNoStudBook(null)).toBe(false);
    expect(temRegistoConfirmadoNoStudBook(undefined)).toBe(false);
  });
});

describe("a saída inteira", () => {
  const ENTRADAS: EntradaDoStudBook[] = [
    entrada({
      cavaloId: "c3",
      consulta: { estado: "indisponivel", motivo: "sem_resposta", tentativas: 1 },
    }),
    entrada({
      cavaloId: "c1",
      anuncio: { ...ANUNCIO, cor: "Preto" },
      consulta: {
        estado: "confirmado",
        identificador: "numero_registo",
        registo: REGISTO,
        tentativas: 1,
      },
    }),
    entrada({
      cavaloId: "c2",
      consulta: { estado: "desconhecido", identificador: "ueln", tentativas: 1 },
    }),
  ];

  it("a mesma entrada por outra ordem dá a mesma saída", () => {
    // Um painel que muda de ordem entre dois carregamentos faz quem revê perder
    // o sítio onde ia.
    expect(reunirFactosDoStudBook([...ENTRADAS].reverse())).toEqual(
      reunirFactosDoStudBook(ENTRADAS)
    );
  });

  it("ordena pelo trabalho que dá a quem revê, não por gravidade", () => {
    expect(reunirFactosDoStudBook(ENTRADAS).map((f) => f.tipo)).toEqual([
      "divergencia_com_o_stud_book",
      "registo_desconhecido",
      "consulta_por_confirmar",
      "registo_confirmado",
    ]);
  });

  it("não devolve juízo nenhum — só factos", () => {
    // A garantia que este módulo dá é negativa e é preciso escrevê-la: nada do
    // que sai daqui pode ser lido como uma decisão sobre um anúncio. É a mesma
    // lista proibida do `documentos-sinais.test.ts`.
    const factos = reunirFactosDoStudBook(ENTRADAS);
    const chaves = new Set(factos.flatMap((f) => Object.keys(f)));

    for (const proibida of [
      "gravidade",
      "risco",
      "score",
      "pontuacao",
      "accao",
      "decisao",
      "bloquear",
      "valido",
      "suspeito",
    ]) {
      expect(chaves.has(proibida)).toBe(false);
    }
  });

  it("um cavalo sem consulta nenhuma não desaparece da lista", () => {
    // Ficar de fora seria a maneira silenciosa de um anúncio nunca ser revisto.
    const factos = reunirFactosDoStudBook([entrada({ cavaloId: "c9" })]);
    expect(factos).toHaveLength(1);
    expect(factos[0]).toMatchObject({ cavaloId: "c9", tipo: "consulta_por_confirmar" });
  });
});
