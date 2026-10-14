import { describe, expect, it } from "vitest";

import {
  CAMPO_DA_PESQUISA,
  consultaAssistida,
  PAGINA_PUBLICA_DO_STUD_BOOK,
  RESPOSTAS_ASSISTIDAS,
  respostaAssistidaValida,
} from "@/lib/documentos/stud-book/assistida";
import { MOTIVOS_DE_INDISPONIVEL } from "@/lib/documentos/stud-book/contrato";
import { assentarResultado, linhaDaConsulta } from "@/lib/documentos/stud-book/registo";
import { chaveDoIdentificador } from "@/lib/documentos/indice-conhecido";

/**
 * A consulta assistida: o que uma pessoa viu no Livro Genealógico.
 *
 * Quatro promessas, e são as quatro contáveis:
 *
 * 1. **Não há aqui um `fetch`.** Quem abriu a página da APSL foi o browser de
 *    quem revê. Este módulo é uma função pura, e o teste conta as chamadas.
 * 2. **«Não consegui ver» nunca vira «não consta».** É a fronteira mais
 *    importante deste ficheiro: a primeira é uma coisa que nos aconteceu a nós,
 *    a segunda é uma afirmação sobre um cavalo.
 * 3. **Uma observação sem autor não se escreve.** A base recusa-a; aqui recusa-se
 *    antes, para que a rota possa dizer porquê.
 * 4. **A chave é a mesma que a consulta automática usaria.** Se não fosse, o
 *    registo não reconhecia a resposta de uma pessoa e a de um pedido nosso como
 *    sendo sobre o mesmo número — e voltava a perguntar à APSL o que já sabia.
 */

const POR = "revisor@portallusitano.pt";
const AGORA = Date.UTC(2026, 8, 6, 12, 0, 0);

describe("consulta assistida — o que a pessoa respondeu", () => {
  it("não faz um único pedido de rede", async () => {
    const original = globalThis.fetch;
    let chamadas = 0;
    globalThis.fetch = (() => {
      chamadas += 1;
      throw new Error("a consulta assistida não fala com a APSL");
    }) as typeof fetch;

    try {
      for (const resposta of RESPOSTAS_ASSISTIDAS) {
        consultaAssistida({
          resposta,
          identificador: "numero_registo",
          valor: "12345",
          por: POR,
          agora: AGORA,
        });
      }
    } finally {
      globalThis.fetch = original;
    }

    expect(chamadas).toBe(0);
  });

  it("«consta» é confirmado, e nada mais", () => {
    const r = consultaAssistida({
      resposta: "consta",
      identificador: "numero_registo",
      valor: "12345",
      por: POR,
      agora: AGORA,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resultado.estado).toBe("confirmado");
    expect(r.resultado.motivo).toBeUndefined();
    // Sem nada copiado do ecrã não se inventa um registo vazio: um `registo: {}`
    // na linha lê-se como «a APSL respondeu e não disse nada».
    expect(r.resultado.registo).toBeUndefined();
    expect(r.resultado.origem).toBe("assistida");
    expect(r.resultado.por).toBe(POR);
  });

  it("«não consta» é desconhecido — e nunca indisponivel", () => {
    const r = consultaAssistida({
      resposta: "nao_consta",
      identificador: "ueln",
      valor: "620003199012345",
      por: POR,
      agora: AGORA,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resultado.estado).toBe("desconhecido");
    expect(r.resultado.motivo).toBeUndefined();
  });

  it("«não consegui ver» é indisponivel, e nunca desconhecido", () => {
    const r = consultaAssistida({
      resposta: "nao_consegui_ver",
      identificador: "microchip",
      valor: "985101045012345",
      por: POR,
      agora: AGORA,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resultado.estado).toBe("indisponivel");
    expect(r.resultado.motivo).toBe("nao_se_conseguiu_ver");
  });

  it("o motivo de «não consegui ver» é um dos motivos do contrato", () => {
    expect(MOTIVOS_DE_INDISPONIVEL).toContain("nao_se_conseguiu_ver");
  });

  it("nenhuma das três respostas escreve verificado, aprovado ou uma nota", () => {
    for (const resposta of RESPOSTAS_ASSISTIDAS) {
      const r = consultaAssistida({
        resposta,
        identificador: "numero_registo",
        valor: "12345",
        por: POR,
        agora: AGORA,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      const chaves = Object.keys(r.resultado);
      for (const proibida of ["verificado", "aprovado", "nota", "pontuacao", "valido", "bloquear"]) {
        expect(chaves).not.toContain(proibida);
      }
    }
  });
});

describe("consulta assistida — o autor e o número", () => {
  it("sem autor não se regista nada", () => {
    for (const por of ["", "   "]) {
      const r = consultaAssistida({
        resposta: "consta",
        identificador: "numero_registo",
        valor: "12345",
        por,
        agora: AGORA,
      });
      expect(r.ok).toBe(false);
      if (r.ok) continue;
      expect(r.recusa).toBe("sem_autor");
    }
  });

  it("o autor guarda-se sem espaços à volta", () => {
    const r = consultaAssistida({
      resposta: "consta",
      identificador: "numero_registo",
      valor: "12345",
      por: `  ${POR}  `,
      agora: AGORA,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resultado.por).toBe(POR);
  });

  it("sem número não se regista nada", () => {
    const r = consultaAssistida({
      resposta: "consta",
      identificador: "numero_registo",
      valor: "   ",
      por: POR,
      agora: AGORA,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.recusa).toBe("sem_identificador");
  });

  it("a chave é a mesma que a consulta automática usaria", () => {
    const r = consultaAssistida({
      resposta: "consta",
      identificador: "numero_registo",
      valor: "12345",
      por: POR,
      agora: AGORA,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resultado.chave).toBe(chaveDoIdentificador("numero_registo", "12345"));
  });
});

describe("consulta assistida — o que se copiou do ecrã", () => {
  it("o nome e a data entram, e a data fica normalizada", () => {
    const r = consultaAssistida({
      resposta: "consta",
      identificador: "numero_registo",
      valor: "12345",
      por: POR,
      agora: AGORA,
      visto: { nome: "  Zambujeiro  ", dataNascimento: "12/04/2019", pelagem: "Castanho" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resultado.registo).toEqual({
      nome: "Zambujeiro",
      dataNascimento: "2019-04-12",
      pelagem: "Castanho",
    });
  });

  it("uma data que não se lê deita-se fora em vez de ir para a base como texto", () => {
    const r = consultaAssistida({
      resposta: "consta",
      identificador: "numero_registo",
      valor: "12345",
      por: POR,
      agora: AGORA,
      visto: { nome: "Zambujeiro", dataNascimento: "primavera de 2019" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resultado.registo).toEqual({ nome: "Zambujeiro" });
  });

  it("três campos vazios não fazem um registo vazio", () => {
    const r = consultaAssistida({
      resposta: "consta",
      identificador: "numero_registo",
      valor: "12345",
      por: POR,
      agora: AGORA,
      visto: { nome: "  ", dataNascimento: null, pelagem: "" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resultado.registo).toBeUndefined();
  });

  it("o que se viu não escapa à peneira: o criador não passa", () => {
    const r = consultaAssistida({
      resposta: "consta",
      identificador: "numero_registo",
      valor: "12345",
      por: POR,
      agora: AGORA,
      // O tipo não o aceita; quem chamar a rota à mão pode tentar na mesma, e é
      // o `reduzirParaGuardar` que o deita fora — não uma regra escrita aqui.
      visto: { nome: "Zambujeiro", criador: "Coudelaria Alguém" } as never,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resultado.registo).toEqual({ nome: "Zambujeiro" });
  });
});

describe("consulta assistida — o que fica na linha", () => {
  it("a origem e o autor sobrevivem ao assentar e à linha", () => {
    const r = consultaAssistida({
      resposta: "consta",
      identificador: "numero_registo",
      valor: "12345",
      por: POR,
      agora: AGORA,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const consulta = assentarResultado(null, r.resultado);
    expect(consulta.origem).toBe("assistida");
    expect(consulta.por).toBe(POR);

    const linha = linhaDaConsulta("cav-1", consulta);
    expect(linha.origem).toBe("assistida");
    expect(linha.por).toBe(POR);
  });

  it("uma linha automática nunca leva autor", () => {
    const linha = linhaDaConsulta("cav-1", {
      estado: "confirmado",
      tentativas: 0,
      // Um `por` numa linha automática dizia que uma pessoa viu o que só um
      // pedido nosso viu. A base recusa-a; aqui apaga-se antes.
      por: POR,
      origem: "automatica",
    });
    expect(linha.origem).toBe("automatica");
    expect(linha.por).toBeNull();
  });

  it("uma linha sem origem lê-se como automática, que é o que as antigas são", () => {
    const linha = linhaDaConsulta("cav-1", { estado: "confirmado", tentativas: 0 });
    expect(linha.origem).toBe("automatica");
    expect(linha.por).toBeNull();
  });

  it("«não consegui ver» conta como uma tentativa, como um servidor que não responde", () => {
    const chave = chaveDoIdentificador("numero_registo", "12345");
    const r = consultaAssistida({
      resposta: "nao_consegui_ver",
      identificador: "numero_registo",
      valor: "12345",
      por: POR,
      agora: AGORA,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const consulta = assentarResultado(
      { estado: "indisponivel", chave: chave ?? undefined, tentativas: 2 },
      r.resultado
    );
    expect(consulta.tentativas).toBe(3);
  });

  it("«consta» não incrementa a contagem: depois dele não há pergunta a fazer", () => {
    const chave = chaveDoIdentificador("numero_registo", "12345");
    const r = consultaAssistida({
      resposta: "consta",
      identificador: "numero_registo",
      valor: "12345",
      por: POR,
      agora: AGORA,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const consulta = assentarResultado(
      { estado: "indisponivel", chave: chave ?? undefined, tentativas: 2 },
      r.resultado
    );
    expect(consulta.tentativas).toBe(2);
  });
});

describe("consulta assistida — a porta da APSL", () => {
  it("o endereço é https e é o da página pública documentada", () => {
    expect(PAGINA_PUBLICA_DO_STUD_BOOK.startsWith("https://")).toBe(true);
    expect(PAGINA_PUBLICA_DO_STUD_BOOK).toBe(
      "https://www.cavalo-lusitano.com/pt/stud-book/acesso-publico-ao-stud-book"
    );
  });

  it("o endereço não leva número nenhum: os parâmetros do motor nunca foram vistos", () => {
    const url = new URL(PAGINA_PUBLICA_DO_STUD_BOOK);
    expect([...url.searchParams.keys()]).toEqual([]);
    expect(PAGINA_PUBLICA_DO_STUD_BOOK).not.toContain("{");
  });

  it("o campo da pesquisa é um só para os três números", () => {
    expect(CAMPO_DA_PESQUISA).toBe("NIN / Chip / UELN");
  });

  it("só se reconhecem as três respostas", () => {
    for (const boa of RESPOSTAS_ASSISTIDAS) expect(respostaAssistidaValida(boa)).toBe(true);
    for (const ma of ["confirmado", "sim", "", null, undefined, 1, {}]) {
      expect(respostaAssistidaValida(ma)).toBe(false);
    }
  });
});
