import { describe, expect, it, vi } from "vitest";

import {
  assentarResultado,
  consultaDaLinha,
  lerMemoriaDaChave,
  linhaDaConsulta,
  registarConsultaDoAnuncio,
  TABELA_CONSULTAS,
  type ClienteDoRegisto,
} from "@/lib/documentos/stud-book/registo";
import { VAR_ACTIVO, VAR_CONTACTO, VAR_URL } from "@/lib/documentos/stud-book/configuracao";
import {
  ESPERA_APOS_DESCONHECIDO_MS,
  MAX_TENTATIVAS,
  RITMO_VAZIO,
} from "@/lib/documentos/stud-book/ritmo";
import type { ConsultaGuardada } from "@/lib/documentos/stud-book/contrato";

import { PAGINA_SEM_RESULTADO, PAGINA_TABELA } from "./stud-book-fixtures";

/**
 * O registo: o que já perguntámos à APSL, e o que isso poupa.
 *
 * Três promessas, e são as três contáveis:
 *
 * 1. **Com o interruptor em baixo, zero pedidos.** É o estado de hoje, e o
 *    `stud-book-prova-desligado` já o guarda do lado da consulta. Aqui guarda-se
 *    do lado de cima: o caminho inteiro — ler o registo, decidir, escrever —
 *    corre na mesma e não toca no `fetch`.
 *
 * 2. **Uma consulta por cavalo, e o registo é por número e não por anúncio.**
 *    O mesmo cavalo republicado no ano seguinte é outro `cavalo_id` e o mesmo
 *    número. Se isto custasse um segundo pedido, «não se volta a perguntar»
 *    queria dizer «não se volta a perguntar dentro do mesmo anúncio», que é uma
 *    promessa muito mais pequena do que a que está escrita.
 *
 * 3. **Um `indisponivel` nunca vira um `desconhecido`.** Desistir de perguntar
 *    não é ter obtido uma resposta, e a linha que fica depois de esgotadas as
 *    tentativas tem de continuar a dizer «não conseguimos saber».
 */

const AMBIENTE_LIGADO = {
  [VAR_ACTIVO]: "1",
  [VAR_URL]: "https://www.cavalo-lusitano.com/pesquisa",
  [VAR_CONTACTO]: "documentos@portal-lusitano.pt",
};

const T0 = Date.UTC(2026, 8, 4, 12, 0, 0);
const CHAVE = "numero_registo:LUS201400421";
const PEDIDO = { numeroRegisto: "LUS-2014-00421", ueln: null, microchip: null };

function resposta(corpo: string) {
  return { ok: true, status: 200, text: () => Promise.resolve(corpo) } as unknown as Response;
}

/**
 * Uma base de brincar.
 *
 * Guarda linhas num array e sabe as três coisas que o módulo lhe pede: uma
 * linha por `cavalo_id`, a mais recente por `chave`, e escrever por cima.
 */
function base(linhas: Record<string, unknown>[] = []) {
  const guardadas = [...linhas];
  const tabelas: string[] = [];

  const cliente: ClienteDoRegisto = {
    from(tabela: string) {
      tabelas.push(tabela);
      return {
        select() {
          return {
            eq(coluna: string, valor: string) {
              const filtradas = guardadas.filter((l) => l[coluna] === valor);
              return {
                maybeSingle: () => Promise.resolve({ data: filtradas[0] ?? null, error: null }),
                order(porColuna: string, opcoes: { ascending: boolean }) {
                  const ordenadas = [...filtradas].sort((a, b) => {
                    const x = String(a[porColuna] ?? "");
                    const y = String(b[porColuna] ?? "");
                    return opcoes.ascending ? (x < y ? -1 : 1) : x < y ? 1 : -1;
                  });
                  return {
                    limit: (n: number) =>
                      Promise.resolve({ data: ordenadas.slice(0, n), error: null }),
                  };
                },
              };
            },
          };
        },
        upsert(linha: Record<string, unknown>) {
          const i = guardadas.findIndex((l) => l.cavalo_id === linha.cavalo_id);
          if (i >= 0) guardadas[i] = linha;
          else guardadas.push(linha);
          return Promise.resolve({ error: null });
        },
      };
    },
  };

  return { cliente, guardadas, tabelas };
}

/** Uma base que falha em tudo o que se lhe pede. */
function baseEmBaixo(): ClienteDoRegisto {
  const falha = Promise.resolve({ data: null, error: { message: "em baixo" } });
  return {
    from() {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => falha,
            order: () => ({ limit: () => falha }),
          }),
        }),
        upsert: () => Promise.resolve({ error: { message: "em baixo" } }),
      };
    },
  };
}

/** Uma linha já guardada, como a base a devolve. */
function linha(p: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    cavalo_id: "cavalo-antigo",
    estado: "confirmado",
    motivo: null,
    identificador: "numero_registo",
    chave: CHAVE,
    registo: { nome: "MAESTOSO XV", dataNascimento: "2014-03-12" },
    tentativas: 0,
    consultado_em: new Date(T0).toISOString(),
    ...p,
  };
}

function opcoesLigadas(buscar: typeof fetch, supabase: ClienteDoRegisto, agora = T0) {
  return {
    supabase,
    ambiente: AMBIENTE_LIGADO,
    fetch: buscar,
    agora: () => agora,
    relogio: () => agora,
    dormir: () => Promise.resolve(),
    deposito: { estado: RITMO_VAZIO },
    registar: () => {},
  };
}

describe("com o interruptor em baixo", () => {
  it("o caminho inteiro corre e não sai um único pedido", async () => {
    const buscar = vi.fn();
    const { cliente, guardadas } = base();

    const resumo = await registarConsultaDoAnuncio(
      { cavaloId: "cavalo-1", pedido: PEDIDO },
      { supabase: cliente, ambiente: {}, fetch: buscar as unknown as typeof fetch }
    );

    expect(buscar).toHaveBeenCalledTimes(0);
    expect(resumo).toEqual({ accao: "desligado" });
    // E não se gasta uma escrita a dizer que não se sabe nada: a ausência de
    // linha já se lê como «por confirmar».
    expect(guardadas).toHaveLength(0);
  });

  it("o que já lá estava continua a servir — o registo funciona desligado", async () => {
    // É a promessa por escrito: com o interruptor em baixo, «o registo funciona
    // na mesma com o que já lá está».
    const buscar = vi.fn();
    const { cliente, guardadas } = base([linha()]);

    const resumo = await registarConsultaDoAnuncio(
      { cavaloId: "cavalo-novo", pedido: PEDIDO },
      { supabase: cliente, ambiente: {}, fetch: buscar as unknown as typeof fetch }
    );

    expect(buscar).toHaveBeenCalledTimes(0);
    // A política respondeu antes de o interruptor sequer ser consultado: um
    // confirmado não se volta a perguntar, ligado ou desligado.
    expect(resumo).toEqual({
      accao: "reaproveitada",
      estado: "confirmado",
      razao: "ja_respondida",
    });
    expect(guardadas.find((l) => l.cavalo_id === "cavalo-novo")).toMatchObject({
      estado: "confirmado",
      chave: CHAVE,
    });
  });

  it("uma resposta velha não se perde por o interruptor estar em baixo", async () => {
    // Aqui a política **manda** perguntar — é um `indisponivel` de há muito — e
    // quem diz que não é o interruptor. O que não pode acontecer é o anúncio
    // novo ficar sem nada quando já sabíamos alguma coisa deste número.
    const buscar = vi.fn();
    const { cliente, guardadas } = base([
      linha({ estado: "indisponivel", motivo: "sem_resposta", registo: null, tentativas: 1 }),
    ]);

    const resumo = await registarConsultaDoAnuncio(
      { cavaloId: "cavalo-novo", pedido: PEDIDO },
      {
        supabase: cliente,
        ambiente: {},
        fetch: buscar as unknown as typeof fetch,
        relogio: () => T0 + 10 ** 10,
      }
    );

    expect(buscar).toHaveBeenCalledTimes(0);
    // Sem `razao`: não houve política nenhuma a decidir a espera, houve um
    // sistema desligado.
    expect(resumo).toEqual({ accao: "reaproveitada", estado: "indisponivel" });
    expect(guardadas.find((l) => l.cavalo_id === "cavalo-novo")).toMatchObject({
      estado: "indisponivel",
      tentativas: 1,
    });
  });
});

describe("uma consulta por cavalo, e nunca mais", () => {
  it("um número já confirmado noutro anúncio não custa um segundo pedido", async () => {
    // O mesmo cavalo, republicado. O registo é por **número**, e é isto que
    // separa um índice de um desperdício.
    const buscar = vi.fn();
    const { cliente, guardadas } = base([linha()]);

    const resumo = await registarConsultaDoAnuncio(
      { cavaloId: "cavalo-novo", pedido: PEDIDO },
      opcoesLigadas(buscar as unknown as typeof fetch, cliente, T0 + 10 ** 10)
    );

    expect(buscar).toHaveBeenCalledTimes(0);
    expect(resumo).toEqual({
      accao: "reaproveitada",
      estado: "confirmado",
      razao: "ja_respondida",
    });
    expect(guardadas).toHaveLength(2);
  });

  it("um número novo custa exactamente um pedido", async () => {
    const buscar = vi.fn().mockResolvedValue(resposta(PAGINA_TABELA));
    const { cliente, guardadas, tabelas } = base();

    const resumo = await registarConsultaDoAnuncio(
      { cavaloId: "cavalo-1", pedido: PEDIDO },
      opcoesLigadas(buscar as unknown as typeof fetch, cliente)
    );

    expect(buscar).toHaveBeenCalledTimes(1);
    expect(resumo).toEqual({
      accao: "consultada",
      estado: "confirmado",
      razao: "nunca_se_perguntou",
    });
    expect(guardadas).toHaveLength(1);
    expect(new Set(tabelas)).toEqual(new Set([TABELA_CONSULTAS]));
  });

  it("o que se guarda é a peneira do contrato, sem o criador", async () => {
    // A página inventada traz criador e proprietário. Nenhum dos dois pode
    // chegar à base: são dados de pessoas e não temos que ver com eles.
    const buscar = vi.fn().mockResolvedValue(resposta(PAGINA_TABELA));
    const { cliente, guardadas } = base();

    await registarConsultaDoAnuncio(
      { cavaloId: "cavalo-1", pedido: PEDIDO },
      opcoesLigadas(buscar as unknown as typeof fetch, cliente)
    );

    const registo = guardadas[0].registo as Record<string, unknown>;
    expect(Object.keys(registo).sort()).toEqual([
      "dataNascimento",
      "mae",
      "nome",
      "numeroRegisto",
      "pai",
      "pelagem",
    ]);
    expect(JSON.stringify(guardadas)).not.toContain("Ribeira");
    expect(JSON.stringify(guardadas)).not.toContain("Pereira");
  });

  it("o vendedor mudar o número é outra pergunta, e faz-se", async () => {
    const buscar = vi.fn().mockResolvedValue(resposta(PAGINA_TABELA));
    const { cliente } = base([linha()]);

    const resumo = await registarConsultaDoAnuncio(
      { cavaloId: "cavalo-2", pedido: { numeroRegisto: "LUS-2019-01188" } },
      opcoesLigadas(buscar as unknown as typeof fetch, cliente)
    );

    expect(buscar).toHaveBeenCalledTimes(1);
    expect(resumo).toMatchObject({ accao: "consultada" });
  });

  it("sem número por que perguntar, não há pergunta nem linha", async () => {
    const buscar = vi.fn();
    const { cliente, guardadas } = base();

    const resumo = await registarConsultaDoAnuncio(
      { cavaloId: "cavalo-3", pedido: { numeroRegisto: "  ", ueln: null, microchip: "-" } },
      opcoesLigadas(buscar as unknown as typeof fetch, cliente)
    );

    expect(buscar).toHaveBeenCalledTimes(0);
    expect(resumo).toEqual({ accao: "sem_identificador" });
    expect(guardadas).toHaveLength(0);
  });
});

describe("o desconhecido volta a perguntar-se, mas devagar", () => {
  it("nos primeiros seis meses, reaproveita-se a resposta", async () => {
    const buscar = vi.fn();
    const { cliente } = base([linha({ estado: "desconhecido", registo: null, tentativas: 1 })]);

    const resumo = await registarConsultaDoAnuncio(
      { cavaloId: "cavalo-4", pedido: PEDIDO },
      opcoesLigadas(buscar as unknown as typeof fetch, cliente, T0 + 30 * 24 * 3600 * 1000)
    );

    expect(buscar).toHaveBeenCalledTimes(0);
    expect(resumo).toEqual({
      accao: "reaproveitada",
      estado: "desconhecido",
      razao: "desconhecido_recente",
    });
  });

  it("passados os seis meses, pergunta-se — e a contagem sobe", async () => {
    const buscar = vi.fn().mockResolvedValue(resposta(PAGINA_SEM_RESULTADO));
    const { cliente, guardadas } = base([
      linha({ estado: "desconhecido", registo: null, tentativas: 1 }),
    ]);

    const resumo = await registarConsultaDoAnuncio(
      { cavaloId: "cavalo-5", pedido: PEDIDO },
      opcoesLigadas(
        buscar as unknown as typeof fetch,
        cliente,
        T0 + ESPERA_APOS_DESCONHECIDO_MS + 1000
      )
    );

    expect(buscar).toHaveBeenCalledTimes(1);
    expect(resumo).toMatchObject({ accao: "consultada", estado: "desconhecido" });
    expect(guardadas.find((l) => l.cavalo_id === "cavalo-5")).toMatchObject({ tentativas: 2 });
  });
});

describe("um indisponível nunca vira um desconhecido", () => {
  it("esgotadas as tentativas, a linha continua a dizer «não conseguimos saber»", async () => {
    const buscar = vi.fn();
    const { cliente, guardadas } = base([
      linha({
        estado: "indisponivel",
        motivo: "sem_resposta",
        registo: null,
        tentativas: MAX_TENTATIVAS,
      }),
    ]);

    const resumo = await registarConsultaDoAnuncio(
      { cavaloId: "cavalo-6", pedido: PEDIDO },
      opcoesLigadas(buscar as unknown as typeof fetch, cliente, T0 + 10 ** 10)
    );

    expect(buscar).toHaveBeenCalledTimes(0);
    expect(resumo).toEqual({
      accao: "reaproveitada",
      estado: "indisponivel",
      razao: "tentativas_esgotadas",
    });
    // Desistir não é acusar: o que se escreve continua a ser `indisponivel`.
    expect(guardadas.find((l) => l.cavalo_id === "cavalo-6")).toMatchObject({
      estado: "indisponivel",
      motivo: "sem_resposta",
    });
  });

  it("uma resposta que não chega guarda-se como indisponível e conta uma tentativa", async () => {
    const buscar = vi.fn().mockRejectedValue(new Error("rede em baixo"));
    const { cliente, guardadas } = base();

    const resumo = await registarConsultaDoAnuncio(
      { cavaloId: "cavalo-7", pedido: PEDIDO },
      opcoesLigadas(buscar as unknown as typeof fetch, cliente)
    );

    expect(resumo).toMatchObject({ accao: "consultada", estado: "indisponivel" });
    expect(guardadas[0]).toMatchObject({
      estado: "indisponivel",
      motivo: "sem_resposta",
      tentativas: 1,
    });
  });
});

describe("nada disto rebenta a submissão de um anúncio", () => {
  it("com a base em baixo, devolve na mesma e não lança", async () => {
    // Corre no fim do webhook do Stripe. Uma excepção a partir daí faz o Stripe
    // repetir a entrega e o anúncio nascer duas vezes.
    const buscar = vi.fn().mockResolvedValue(resposta(PAGINA_TABELA));
    await expect(
      registarConsultaDoAnuncio(
        { cavaloId: "cavalo-8", pedido: PEDIDO },
        opcoesLigadas(buscar as unknown as typeof fetch, baseEmBaixo())
      )
    ).resolves.toMatchObject({ accao: "consultada" });
  });

  it("uma linha estragada lê-se como quem nunca perguntou", async () => {
    const { cliente } = base([{ cavalo_id: "x", chave: CHAVE }]);
    await expect(lerMemoriaDaChave(CHAVE, cliente)).resolves.toBeNull();
  });
});

describe("a contagem das tentativas", () => {
  const anterior: ConsultaGuardada = {
    estado: "indisponivel",
    chave: CHAVE,
    tentativas: 2,
    consultadoEm: new Date(T0).toISOString(),
  };

  it("sobe com um desconhecido e com um indisponível", () => {
    for (const estado of ["desconhecido", "indisponivel"] as const) {
      expect(assentarResultado(anterior, { estado, chave: CHAVE }).tentativas).toBe(3);
    }
  });

  it("não sobe com um confirmado, e também não se apaga", () => {
    // Depois de um confirmado não há mais pergunta a fazer; apagar a contagem
    // era fingir que as falhas anteriores não existiram.
    expect(assentarResultado(anterior, { estado: "confirmado", chave: CHAVE }).tentativas).toBe(2);
  });

  it("recomeça do zero quando a pergunta é outra", () => {
    // O número corrigido pelo vendedor não herda as falhas do número errado.
    expect(
      assentarResultado(anterior, { estado: "indisponivel", chave: "microchip:620098100123456" })
        .tentativas
    ).toBe(1);
  });
});

describe("a linha e o valor", () => {
  it("o que se escreve lê-se de volta igual", () => {
    const consulta: ConsultaGuardada = {
      estado: "confirmado",
      identificador: "numero_registo",
      chave: CHAVE,
      registo: { nome: "MAESTOSO XV" },
      tentativas: 1,
      consultadoEm: new Date(T0).toISOString(),
    };
    expect(consultaDaLinha(linhaDaConsulta("cavalo-9", consulta))).toEqual(consulta);
  });

  it("os campos ausentes vão a nulo, e não omitidos", () => {
    // Uma consulta nova sobre um anúncio que já tinha uma não pode deixar atrás
    // o motivo da anterior: uma linha meio velha e meio nova é a única coisa
    // aqui que consegue mentir.
    const escrita = linhaDaConsulta("cavalo-10", { estado: "desconhecido", tentativas: 1 });
    expect(escrita.motivo).toBeNull();
    expect(escrita.registo).toBeNull();
    expect(escrita.identificador).toBeNull();
  });

  it("uma linha sem estado não é uma resposta", () => {
    expect(consultaDaLinha({ cavalo_id: "x" })).toBeNull();
    expect(consultaDaLinha(null)).toBeNull();
    expect(consultaDaLinha("uma string")).toBeNull();
  });
});
