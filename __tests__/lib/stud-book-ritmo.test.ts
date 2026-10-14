import { describe, expect, it } from "vitest";

import {
  avaliarRitmo,
  deveConsultar,
  diaUtc,
  ESPERA_APOS_DESCONHECIDO_MS,
  ESPERA_ENTRE_TENTATIVAS_MS,
  ESPERA_MAXIMA_ENTRE_TENTATIVAS_MS,
  esperaDaTentativa,
  MAX_RESPOSTAS_DESCONHECIDO,
  MAX_TENTATIVAS,
  registarPedido,
  RITMO_VAZIO,
  type ConsultaAnterior,
} from "@/lib/documentos/stud-book/ritmo";

/**
 * O ritmo.
 *
 * A regra que estes testes protegem é a que distingue isto de um raspador:
 * **uma consulta por anúncio submetido, e nunca mais**. O resto — intervalo,
 * tecto diário — é a educação com que se trata o servidor de outra pessoa.
 *
 * E protegem a simétrica, que é tão importante como a primeira: um anúncio que
 * ficou por confirmar **volta** a ser tentado, senão «não bloquear ninguém»
 * transformava-se em «nunca mais verificar nada».
 */

const LIMITES = { intervaloMs: 5000, tectoDiario: 200 };
const T0 = Date.UTC(2026, 8, 4, 12, 0, 0);

describe("o intervalo entre pedidos", () => {
  it("o primeiro pedido sai já", () => {
    expect(avaliarRitmo(RITMO_VAZIO, T0, LIMITES)).toEqual({ decisao: "seguir" });
  });

  it("o segundo espera o que falta do intervalo", () => {
    const depois = registarPedido(RITMO_VAZIO, T0);
    expect(avaliarRitmo(depois, T0 + 1000, LIMITES)).toEqual({
      decisao: "esperar",
      esperaMs: 4000,
    });
  });

  it("passado o intervalo, segue", () => {
    const depois = registarPedido(RITMO_VAZIO, T0);
    expect(avaliarRitmo(depois, T0 + 5000, LIMITES)).toEqual({ decisao: "seguir" });
    expect(avaliarRitmo(depois, T0 + 9999, LIMITES)).toEqual({ decisao: "seguir" });
  });

  it("um relógio que ande para trás não vira uma espera de horas", () => {
    // Um acerto de NTP ou uma máquina suspensa. O lado prudente é tratar como
    // «acabou de sair um pedido», não como «passaram-se três dias».
    const depois = registarPedido(RITMO_VAZIO, T0);
    expect(avaliarRitmo(depois, T0 - 60_000, LIMITES)).toEqual({
      decisao: "esperar",
      esperaMs: 5000,
    });
  });

  it("não muta o estado que recebe", () => {
    const antes = { ...RITMO_VAZIO };
    registarPedido(antes, T0);
    expect(antes).toEqual(RITMO_VAZIO);
  });
});

describe("o tecto diário", () => {
  it("esgota-se e não se espera por ele", () => {
    let estado = RITMO_VAZIO;
    for (let i = 0; i < 3; i++) estado = registarPedido(estado, T0 + i * 10_000);
    expect(avaliarRitmo(estado, T0 + 100_000, { ...LIMITES, tectoDiario: 3 })).toEqual({
      decisao: "tecto_diario",
    });
  });

  it("um dia novo traz um tecto novo, e não arrasta o gasto de ontem", () => {
    let estado = RITMO_VAZIO;
    for (let i = 0; i < 3; i++) estado = registarPedido(estado, T0 + i * 10_000);
    const amanha = T0 + 24 * 60 * 60 * 1000;
    expect(avaliarRitmo(estado, amanha, { ...LIMITES, tectoDiario: 3 })).toEqual({
      decisao: "seguir",
    });
  });

  it("conta em UTC e não na hora local da máquina", () => {
    // Um tecto que se reinicia a meio da noite conforme o fuso do servidor é um
    // tecto que ninguém consegue explicar.
    expect(diaUtc(Date.UTC(2026, 8, 4, 23, 59, 59))).toBe("2026-09-04");
    expect(diaUtc(Date.UTC(2026, 8, 5, 0, 0, 0))).toBe("2026-09-05");
  });

  it("o tecto vem antes do intervalo — um resolve-se esperando, o outro não", () => {
    const estado = registarPedido(RITMO_VAZIO, T0);
    expect(avaliarRitmo(estado, T0 + 1, { intervaloMs: 5000, tectoDiario: 1 })).toEqual({
      decisao: "tecto_diario",
    });
  });
});

describe("voltar a perguntar, ou não", () => {
  function anterior(p: Partial<ConsultaAnterior> = {}): ConsultaAnterior {
    return {
      estado: "indisponivel",
      chave: "numero_registo:LUS201900421",
      consultadoEm: new Date(T0).toISOString(),
      tentativas: 1,
      ...p,
    };
  }

  it("nunca se perguntou — pergunta-se", () => {
    expect(deveConsultar(null, "numero_registo:X", T0)).toEqual({
      consultar: true,
      razao: "nunca_se_perguntou",
    });
  });

  it("sem identificador não se pergunta, e isso não é um problema do anúncio", () => {
    expect(deveConsultar(null, null, T0)).toEqual({
      consultar: false,
      razao: "sem_identificador",
    });
  });

  it("confirmado é para sempre — nunca mais se pergunta", () => {
    // É a regra central: uma consulta por cavalo, e nunca mais. Um anúncio
    // editado dez vezes não são dez pedidos ao servidor da APSL. E aqui não há
    // sequer prazo: a inscrição no Livro Genealógico é um facto de nascimento,
    // não um estado que caduque. Um cavalo que está no livro não sai de lá.
    for (const daquiA of [10 ** 9, 10 * ESPERA_APOS_DESCONHECIDO_MS]) {
      expect(
        deveConsultar(
          anterior({ estado: "confirmado" }),
          "numero_registo:LUS201900421",
          T0 + daquiA
        )
      ).toEqual({ consultar: false, razao: "ja_respondida" });
    }
  });

  it("desconhecido não se repete nos primeiros seis meses", () => {
    // A razão para repetir é uma inscrição que ainda não estava feita, e esse
    // ciclo é de meses. Repetir ao fim de onze dias é repetir pela mesma razão
    // por que a primeira falhou.
    const onzeDias = 10 ** 9;
    expect(
      deveConsultar(
        anterior({ estado: "desconhecido" }),
        "numero_registo:LUS201900421",
        T0 + onzeDias
      )
    ).toEqual({ consultar: false, razao: "desconhecido_recente" });
  });

  it("passados os seis meses, pergunta-se outra vez — um poldro pode ter sido inscrito", () => {
    expect(
      deveConsultar(
        anterior({ estado: "desconhecido" }),
        "numero_registo:LUS201900421",
        T0 + ESPERA_APOS_DESCONHECIDO_MS + 1000
      )
    ).toEqual({ consultar: true, razao: "pode_ter_sido_inscrito" });
  });

  it("mas só uma vez: à segunda resposta de «não conheço», fica-se por ela", () => {
    // Um ano volvido, duas respostas dizem que o número não está no livro. A
    // explicação provável já não é uma inscrição a caminho — é um número mal
    // copiado, e esse não se corrige com o tempo a passar. Continua a ser
    // `desconhecido`, que é um facto para quem revê e não uma acusação.
    expect(
      deveConsultar(
        anterior({ estado: "desconhecido", tentativas: MAX_RESPOSTAS_DESCONHECIDO }),
        "numero_registo:LUS201900421",
        T0 + 10 * ESPERA_APOS_DESCONHECIDO_MS
      )
    ).toEqual({ consultar: false, razao: "desconhecido_assente" });
  });

  it("sem data legível, um desconhecido fica-se pela resposta que tem", () => {
    // Ao contrário do `indisponivel`, aqui há uma resposta na mão, e o tempo
    // passado é a única razão para repetir. Sem data não há tempo passado a
    // invocar — e uma coluna de datas estragada não pode virar um pedido a mais
    // por cada anúncio que a APSL não conhece.
    expect(
      deveConsultar(
        anterior({ estado: "desconhecido", consultadoEm: "ontem" }),
        "numero_registo:LUS201900421",
        T0
      )
    ).toEqual({ consultar: false, razao: "desconhecido_recente" });
  });

  it("o vendedor mudou o número — é outra pergunta, e faz-se", () => {
    expect(deveConsultar(anterior({ estado: "confirmado" }), "numero_registo:OUTRO", T0)).toEqual({
      consultar: true,
      razao: "o_numero_mudou",
    });
  });

  it("ficou por saber e ainda é cedo — espera", () => {
    expect(deveConsultar(anterior(), "numero_registo:LUS201900421", T0 + 60_000)).toEqual({
      consultar: false,
      razao: "ainda_cedo",
    });
  });

  it("ficou por saber e já passou a espera — tenta outra vez", () => {
    expect(
      deveConsultar(
        anterior(),
        "numero_registo:LUS201900421",
        T0 + ESPERA_ENTRE_TENTATIVAS_MS + 1000
      )
    ).toEqual({ consultar: true, razao: "tentar_outra_vez" });
  });

  it("a espera dobra a cada tentativa, com tecto em dois dias", () => {
    // Falhar duas vezes seguidas já não parece um soluço; insistir ao mesmo
    // ritmo num servidor que continua a falhar é a maneira mais rápida de
    // deixar de ser bem-vindo.
    expect(esperaDaTentativa(1)).toBe(ESPERA_ENTRE_TENTATIVAS_MS);
    expect(esperaDaTentativa(2)).toBe(2 * ESPERA_ENTRE_TENTATIVAS_MS);
    expect(esperaDaTentativa(3)).toBe(4 * ESPERA_ENTRE_TENTATIVAS_MS);
    expect(esperaDaTentativa(4)).toBe(ESPERA_MAXIMA_ENTRE_TENTATIVAS_MS);
    expect(esperaDaTentativa(9)).toBe(ESPERA_MAXIMA_ENTRE_TENTATIVAS_MS);
    // Um valor que não se percebe não produz uma espera absurda.
    expect(esperaDaTentativa(0)).toBe(ESPERA_ENTRE_TENTATIVAS_MS);
    expect(esperaDaTentativa(Number.NaN)).toBe(ESPERA_ENTRE_TENTATIVAS_MS);
  });

  it("à terceira tentativa, seis horas já não chegam", () => {
    const passadas = { estado: "indisponivel", tentativas: 3 };
    expect(
      deveConsultar(
        anterior(passadas),
        "numero_registo:LUS201900421",
        T0 + ESPERA_ENTRE_TENTATIVAS_MS + 1000
      )
    ).toEqual({ consultar: false, razao: "ainda_cedo" });
    expect(
      deveConsultar(
        anterior(passadas),
        "numero_registo:LUS201900421",
        T0 + esperaDaTentativa(3) + 1000
      )
    ).toEqual({ consultar: true, razao: "tentar_outra_vez" });
  });

  it("passadas as tentativas todas, desiste — e desistir não é acusar", () => {
    // O anúncio fica «por confirmar» para sempre, exactamente como estava.
    // O que se perde é a consulta, não o vendedor.
    expect(
      deveConsultar(
        anterior({ tentativas: MAX_TENTATIVAS }),
        "numero_registo:LUS201900421",
        T0 + 10 ** 9
      )
    ).toEqual({ consultar: false, razao: "tentativas_esgotadas" });
  });

  it("o que ficou guardado como «desligado» não gastou pedido nenhum", () => {
    // No dia em que o interruptor subir, o primeiro anúncio que passar por
    // aqui é consultado — não fica à espera de uma espera que nunca correu.
    expect(
      deveConsultar(
        anterior({ estado: "desligado", chave: undefined, tentativas: 0 }),
        "numero_registo:LUS201900421",
        T0
      )
    ).toEqual({ consultar: true, razao: "nunca_se_perguntou" });
  });

  it("uma data ilegível não prende a consulta para sempre", () => {
    expect(
      deveConsultar(anterior({ consultadoEm: "ontem" }), "numero_registo:LUS201900421", T0)
    ).toEqual({ consultar: true, razao: "tentar_outra_vez" });
  });
});
