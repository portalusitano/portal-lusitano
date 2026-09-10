import { describe, expect, it } from "vitest";

import { cruzarComStudBook } from "@/lib/documentos/stud-book/cruzar";
import type { RegistoGuardado } from "@/lib/documentos/stud-book/contrato";

/**
 * O stud-book contra o anúncio.
 *
 * Estes testes são simétricos de propósito, como os do `sinais.ts`: cada campo
 * tem um caso que **deve** apontar uma divergência e um caso vizinho, quase
 * igual, que **não** deve. Os dois erros custam coisas diferentes e nenhum é
 * barato — deixar passar uma data falsificada custa um comprador enganado;
 * apontar uma divergência falsa manda um vendedor honesto para a fila e, aos
 * dez, ensina quem revê que estes avisos não valem nada.
 */

const REGISTO: RegistoGuardado = {
  nome: "MAESTOSO XV",
  dataNascimento: "2014-03-12",
  pelagem: "Ruço",
  numeroRegisto: "LUS-2014-00421",
  pai: "XAQUIRO",
  mae: "BENFAZEJA",
};

describe("o que não é divergência", () => {
  it("um anúncio que bate certo não produz nada", () => {
    expect(
      cruzarComStudBook(REGISTO, {
        nome: "Maestoso XV",
        dataNascimento: "2014-03-12",
        cor: "Ruço",
        numeroRegisto: "LUS 2014 00421",
        pai: "Xaquiro",
        mae: "Benfazeja",
      })
    ).toEqual([]);
  });

  it("faltar o campo de um dos lados não é ninguém a contradizer ninguém", () => {
    expect(cruzarComStudBook(REGISTO, {})).toEqual([]);
    expect(cruzarComStudBook({}, { nome: "Outro", cor: "Preto" })).toEqual([]);
    expect(cruzarComStudBook(REGISTO, { nome: "   ", cor: null })).toEqual([]);
  });

  it("acentos, maiúsculas e espaços a mais são a mesma coisa escrita à pressa", () => {
    expect(cruzarComStudBook(REGISTO, { nome: "maestoso  xv", cor: "ruco" })).toEqual([]);
  });

  it("o nome de registo serve tão bem como o nome — basta bater com um", () => {
    expect(cruzarComStudBook(REGISTO, { nome: "Tostão", nomeRegisto: "Maestoso XV" })).toEqual([]);
  });

  it("a forma curta de um nome não contradiz a longa", () => {
    // «Rubi» onde a APSL tem «Rubi da Broa» é como se fala, não uma mentira.
    expect(cruzarComStudBook({ pai: "RUBI DA BROA" }, { pai: "Rubi" })).toEqual([]);
    expect(cruzarComStudBook({ nome: "NILO" }, { nome: "Nilo do Vale" })).toEqual([]);
  });

  it("a pelagem dita com mais ou menos detalhe é a mesma pelagem", () => {
    expect(cruzarComStudBook({ pelagem: "Castanho escuro" }, { cor: "Castanho" })).toEqual([]);
    expect(cruzarComStudBook({ pelagem: "Ruço" }, { cor: "Ruço torcaz" })).toEqual([]);
  });

  it("uma data que não se percebe de um dos lados não contradiz nada", () => {
    expect(
      cruzarComStudBook({ dataNascimento: "2014-03-12" }, { dataNascimento: "primavera de 2014" })
    ).toEqual([]);
  });

  it("a data do Postgres com hora atrás é a mesma data", () => {
    expect(
      cruzarComStudBook(
        { dataNascimento: "2014-03-12" },
        { dataNascimento: "2014-03-12T00:00:00Z" }
      )
    ).toEqual([]);
  });
});

describe("o que é divergência", () => {
  it("uma data diferente", () => {
    expect(
      cruzarComStudBook(REGISTO, { nome: "Maestoso XV", dataNascimento: "2019-06-01" })
    ).toEqual([{ campo: "data_nascimento", noAnuncio: "2019-06-01", noStudBook: "2014-03-12" }]);
  });

  it("um nome que não se parece com nenhum dos dois do anúncio", () => {
    const divergencias = cruzarComStudBook(REGISTO, { nome: "Tostão", nomeRegisto: "Zamboni" });
    expect(divergencias).toEqual([
      { campo: "nome", noAnuncio: "Tostão", noStudBook: "MAESTOSO XV" },
    ]);
  });

  it("uma pelagem que não é a mesma nem uma versão dela", () => {
    expect(cruzarComStudBook({ pelagem: "Ruço" }, { cor: "Preto" })).toEqual([
      { campo: "pelagem", noAnuncio: "Preto", noStudBook: "Ruço" },
    ]);
  });

  it("pais diferentes", () => {
    expect(cruzarComStudBook(REGISTO, { pai: "Zamboni", mae: "Quinta" })).toEqual([
      { campo: "pai", noAnuncio: "Zamboni", noStudBook: "XAQUIRO" },
      { campo: "mae", noAnuncio: "Quinta", noStudBook: "BENFAZEJA" },
    ]);
  });

  it("um número de registo diferente — e aqui conter-se não vale", () => {
    // Num identificador, `123` caber dentro de `1234` não quer dizer nada:
    // são dois cavalos.
    expect(
      cruzarComStudBook({ numeroRegisto: "LUS-2014-004211" }, { numeroRegisto: "LUS-2014-00421" })
    ).toEqual([
      { campo: "numero_registo", noAnuncio: "LUS-2014-00421", noStudBook: "LUS-2014-004211" },
    ]);
  });

  it("os valores vão como estão escritos, não como foram normalizados", () => {
    // Quem revê tem de ver o que o vendedor escreveu e o que a APSL respondeu.
    const [divergencia] = cruzarComStudBook({ pelagem: "Ruço" }, { cor: "  preto  " });
    expect(divergencia.noAnuncio).toBe("preto");
    expect(divergencia.noStudBook).toBe("Ruço");
  });

  it("várias de uma vez, sem nenhuma nota nem ordem de gravidade", () => {
    const divergencias = cruzarComStudBook(REGISTO, {
      nome: "Tostão",
      dataNascimento: "2019-06-01",
      cor: "Preto",
      pai: "Zamboni",
    });
    expect(divergencias.map((d) => d.campo)).toEqual(["nome", "data_nascimento", "pelagem", "pai"]);
    for (const divergencia of divergencias) {
      expect(Object.keys(divergencia).sort()).toEqual(["campo", "noAnuncio", "noStudBook"]);
    }
  });
});
