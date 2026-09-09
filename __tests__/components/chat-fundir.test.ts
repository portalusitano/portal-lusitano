import { describe, it, expect } from "vitest";
import { fundirMensagens, JANELA_ECO_MS } from "@/components/chat/fundir";
import { PREFIXO_LOCAL, estadoDaMensagem, type MensagemNoEcra } from "@/components/chat/tipos";
import type { ChatMensagem } from "@/lib/marketplace-chat";

/**
 * A fusão é a costura por onde o tempo real vai entrar, e é também o que faz o
 * envio optimista ser honesto: a mensagem aparece antes de o servidor
 * responder, e quando ele responde não fica escrita duas vezes.
 */

function servidor(id: string, iso: string, minha: boolean, corpo = "olá"): ChatMensagem {
  return { id, corpo, createdAt: iso, minha, lida: false };
}

function local(iso: string, corpo = "olá"): MensagemNoEcra {
  return {
    id: `${PREFIXO_LOCAL}1`,
    corpo,
    createdAt: iso,
    minha: true,
    lida: false,
    aEnviar: true,
  };
}

const T = "2026-09-09T10:00:00.000Z";

describe("juntar o que o servidor diz ao que está no ecrã", () => {
  it("não duplica uma mensagem que já lá estava", () => {
    const antes: MensagemNoEcra[] = [servidor("a", T, false)];
    const depois = fundirMensagens(antes, [servidor("a", T, false)]);
    expect(depois).toHaveLength(1);
  });

  it("acrescenta o que é novo, por ordem de instante", () => {
    const antes: MensagemNoEcra[] = [servidor("a", "2026-09-09T10:00:00Z", false)];
    const depois = fundirMensagens(antes, [
      servidor("c", "2026-09-09T10:02:00Z", true),
      servidor("b", "2026-09-09T10:01:00Z", false),
    ]);
    expect(depois.map((m) => m.id)).toEqual(["a", "b", "c"]);
  });

  it("uma lista vazia do servidor não mexe no ecrã", () => {
    const antes: MensagemNoEcra[] = [local(T)];
    expect(fundirMensagens(antes, [])).toBe(antes);
  });
});

describe("o eco da minha própria mensagem", () => {
  it("apaga a cópia local quando o servidor devolve a mesma frase", () => {
    const depois = fundirMensagens([local(T)], [servidor("s1", T, true, "olá")]);
    expect(depois).toHaveLength(1);
    expect(depois[0].id).toBe("s1");
  });

  it("dá-a por entregue — deixa de estar a caminho", () => {
    const depois = fundirMensagens([local(T)], [servidor("s1", T, true, "olá")]);
    expect(estadoDaMensagem(depois[0])).toBe("entregue");
  });

  it("reconhece o eco com o relógio desencontrado, dentro da janela", () => {
    const tarde = new Date(new Date(T).getTime() + JANELA_ECO_MS - 1000).toISOString();
    const depois = fundirMensagens([local(T)], [servidor("s1", tarde, true, "olá")]);
    expect(depois).toHaveLength(1);
  });

  it("mas não confunde duas frases iguais escritas com horas de diferença", () => {
    const muitoDepois = new Date(new Date(T).getTime() + JANELA_ECO_MS + 60_000).toISOString();
    const depois = fundirMensagens([local(T)], [servidor("s1", muitoDepois, true, "olá")]);
    expect(depois).toHaveLength(2);
  });

  it("não confunde a minha com uma da outra parte que diga o mesmo", () => {
    const depois = fundirMensagens([local(T)], [servidor("s1", T, false, "olá")]);
    expect(depois).toHaveLength(2);
  });
});

describe("uma mensagem que falhou", () => {
  const falhada: MensagemNoEcra = { ...local(T), aEnviar: false, falhou: true };

  it("fica no ecrã — não há eco nenhum a caminho dela", () => {
    const depois = fundirMensagens([falhada], [servidor("s9", T, true, "outra coisa")]);
    expect(depois.some((m) => m.falhou)).toBe(true);
  });

  it("e apaga-se se a mesma frase acabar por chegar do servidor — não fica a dizer que falhou o que passou", () => {
    // Acontece quando o pedido chegou lá e a resposta é que se perdeu.
    const depois = fundirMensagens(
      [{ ...falhada, falhou: false }],
      [servidor("s1", T, true, "olá")]
    );
    expect(depois).toHaveLength(1);
    expect(depois[0].id).toBe("s1");
  });

  it("diz-se «falhou» e não «a enviar»", () => {
    expect(estadoDaMensagem(falhada)).toBe("falhou");
  });
});

describe("o estado de entrega", () => {
  it("não existe nas mensagens da outra parte", () => {
    expect(estadoDaMensagem(servidor("a", T, false))).toBeNull();
  });

  it("distingue entregue de lida", () => {
    expect(estadoDaMensagem({ ...servidor("a", T, true), lida: false })).toBe("entregue");
    expect(estadoDaMensagem({ ...servidor("a", T, true), lida: true })).toBe("lida");
  });

  it("a caminho ganha a lida — uma que ainda não saiu não pode ter sido lida", () => {
    expect(estadoDaMensagem({ ...local(T), lida: true })).toBe("a-enviar");
  });
});
