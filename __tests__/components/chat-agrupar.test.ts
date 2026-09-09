import { describe, it, expect } from "vitest";
import {
  agruparFio,
  categoriaDoDia,
  diaLocal,
  JANELA_BLOCO_MS,
  type BlocoDeMensagens,
  type SeparadorDia,
} from "@/components/chat/agrupar";
import type { MensagemNoEcra } from "@/components/chat/tipos";

/**
 * O que estes testes protegem é a diferença entre um registo e uma conversa.
 *
 * Medido antes deste trabalho, no fio de vinte e quatro mensagens espalhadas
 * por nove dias: **zero separadores de dia** e vinte e quatro balões, cada um
 * com a sua hora repetida por baixo. Quem lê um fio assim não sabe se a última
 * resposta foi hoje de manhã ou na semana passada.
 */

function m(id: string, iso: string, minha: boolean, corpo = "x"): MensagemNoEcra {
  return { id, corpo, createdAt: iso, minha, lida: false };
}

describe("os separadores de dia", () => {
  it("abre o fio com um separador, mesmo com uma mensagem só", () => {
    const itens = agruparFio([m("a", "2026-09-09T10:00:00Z", false)]);
    expect(itens[0].tipo).toBe("dia");
    expect(itens).toHaveLength(2);
  });

  it("põe um separador em cada dia de calendário e não em cada mensagem", () => {
    const itens = agruparFio([
      m("a", "2026-09-07T10:00:00Z", false),
      m("b", "2026-09-07T11:00:00Z", false),
      m("c", "2026-09-08T09:00:00Z", true),
    ]);
    const dias = itens.filter((i): i is SeparadorDia => i.tipo === "dia");
    expect(dias.map((d) => d.chave)).toEqual(["2026-09-07", "2026-09-08"]);
  });

  it("usa o dia local, não o dia UTC — é o calendário de quem lê que conta", () => {
    // Duas datas que caem no mesmo dia local dão a mesma chave, seja qual for
    // o fuso da máquina que corre o teste.
    const a = new Date(2026, 8, 9, 0, 30);
    const b = new Date(2026, 8, 9, 23, 30);
    expect(diaLocal(a)).toBe(diaLocal(b));
  });
});

describe("a categoria do dia", () => {
  const agora = new Date(2026, 8, 9, 15, 0);

  it("hoje é hoje", () => {
    expect(categoriaDoDia(new Date(2026, 8, 9, 1, 0), agora)).toBe("hoje");
  });

  it("ontem é ontem, e não «há 14 horas»", () => {
    expect(categoriaDoDia(new Date(2026, 8, 8, 23, 0), agora)).toBe("ontem");
  });

  it("dentro da semana escreve-se o dia da semana", () => {
    expect(categoriaDoDia(new Date(2026, 8, 4, 12, 0), agora)).toBe("semana");
    expect(categoriaDoDia(new Date(2026, 8, 3, 12, 0), agora)).toBe("semana");
  });

  it("ao sétimo dia passa a data — «segunda-feira» já não distingue duas segundas", () => {
    expect(categoriaDoDia(new Date(2026, 8, 2, 12, 0), agora)).toBe("antigo");
  });

  it("uma data no futuro conta como hoje, e não como um dia negativo", () => {
    // Pode acontecer com relógios desencontrados entre o servidor e o browser.
    expect(categoriaDoDia(new Date(2026, 8, 10, 9, 0), agora)).toBe("hoje");
  });
});

describe("os blocos de mensagens seguidas", () => {
  it("junta duas frases seguidas da mesma pessoa num turno só", () => {
    const itens = agruparFio([
      m("a", "2026-09-09T10:00:00Z", false),
      m("b", "2026-09-09T10:01:00Z", false),
    ]);
    const blocos = itens.filter((i): i is BlocoDeMensagens => i.tipo === "bloco");
    expect(blocos).toHaveLength(1);
    expect(blocos[0].mensagens.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("parte o bloco quando muda quem fala", () => {
    const itens = agruparFio([
      m("a", "2026-09-09T10:00:00Z", false),
      m("b", "2026-09-09T10:00:30Z", true),
    ]);
    expect(itens.filter((i) => i.tipo === "bloco")).toHaveLength(2);
  });

  it("parte o bloco passada a janela — voltar ao teclado é um turno novo", () => {
    const base = new Date("2026-09-09T10:00:00Z").getTime();
    const itens = agruparFio([
      m("a", new Date(base).toISOString(), false),
      m("b", new Date(base + JANELA_BLOCO_MS + 1000).toISOString(), false),
    ]);
    expect(itens.filter((i) => i.tipo === "bloco")).toHaveLength(2);
  });

  it("não parte o bloco exactamente na janela", () => {
    const base = new Date("2026-09-09T10:00:00Z").getTime();
    const itens = agruparFio([
      m("a", new Date(base).toISOString(), false),
      m("b", new Date(base + JANELA_BLOCO_MS).toISOString(), false),
    ]);
    expect(itens.filter((i) => i.tipo === "bloco")).toHaveLength(1);
  });

  it("um dia novo parte sempre o bloco, ainda que sejam minutos", () => {
    // Cinco minutos a cavalo da meia-noite: sem esta regra o separador de dia
    // caía a meio de um bloco.
    const antes = new Date(2026, 8, 8, 23, 58);
    const depois = new Date(2026, 8, 9, 0, 1);
    const itens = agruparFio([
      m("a", antes.toISOString(), false),
      m("b", depois.toISOString(), false),
    ]);
    expect(itens.filter((i) => i.tipo === "bloco")).toHaveLength(2);
    expect(itens.filter((i) => i.tipo === "dia")).toHaveLength(2);
  });

  it("um fio vazio não inventa separadores", () => {
    expect(agruparFio([])).toEqual([]);
  });

  it("não perde nem duplica uma única mensagem", () => {
    const fio = Array.from({ length: 40 }, (_, i) =>
      m(`m${i}`, new Date(2026, 8, 1 + (i % 5), 10, i * 3).toISOString(), i % 3 === 0)
    ).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    const saidas = agruparFio(fio)
      .filter((i): i is BlocoDeMensagens => i.tipo === "bloco")
      .flatMap((b) => b.mensagens.map((x) => x.id));
    expect(saidas).toEqual(fio.map((x) => x.id));
  });
});
