import { describe, it, expect } from "vitest";
import { deveEnviarComEnter } from "@/components/chat/tecla-enter";

/**
 * A lição que estes testes guardam já foi paga uma vez, no
 * `components/vender-cavalo/tecla-enter.ts`: **a regra tem de ser sobre o
 * foco**. Lá o que estava em risco era um pagamento que ninguém pediu; aqui é
 * uma mensagem enviada a alguém sem se querer, que também não se desfaz.
 */

const NA_CAIXA = { tecla: "Enter", nomeDoAlvo: "TEXTAREA" };

describe("na caixa de escrever, num computador", () => {
  it("Enter envia", () => {
    expect(deveEnviarComEnter(NA_CAIXA)).toBe(true);
  });

  it("Shift+Enter muda de linha", () => {
    expect(deveEnviarComEnter({ ...NA_CAIXA, shift: true })).toBe(false);
  });

  it("Alt+Enter muda de linha", () => {
    expect(deveEnviarComEnter({ ...NA_CAIXA, alt: true })).toBe(false);
  });

  it("qualquer outra tecla não envia", () => {
    expect(deveEnviarComEnter({ ...NA_CAIXA, tecla: "a" })).toBe(false);
    expect(deveEnviarComEnter({ ...NA_CAIXA, tecla: "NumpadEnter" })).toBe(false);
  });
});

describe("a regra do foco — a que já custou uma vez", () => {
  it("Enter num botão é carregar nele, e não enviar", () => {
    expect(deveEnviarComEnter({ tecla: "Enter", nomeDoAlvo: "BUTTON" })).toBe(false);
  });

  it("Enter numa ligação é segui-la", () => {
    expect(deveEnviarComEnter({ tecla: "Enter", nomeDoAlvo: "A" })).toBe(false);
  });

  it("Enter numa `<Seleccao>`, que guarda um `<select>` a sério lá dentro", () => {
    expect(deveEnviarComEnter({ tecla: "Enter", nomeDoAlvo: "select" })).toBe(false);
  });

  it("e nem o gesto explícito passa por cima do foco: Ctrl+Enter num botão não envia", () => {
    // Se passasse, quem tem o foco no botão de voltar e carrega em Ctrl+Enter
    // mandava uma mensagem a caminho de sair do fio.
    expect(deveEnviarComEnter({ tecla: "Enter", nomeDoAlvo: "BUTTON", ctrl: true })).toBe(false);
  });
});

describe("a escrever com um IME", () => {
  it("Enter confirma o candidato e não envia meia palavra", () => {
    expect(deveEnviarComEnter({ ...NA_CAIXA, aCompor: true })).toBe(false);
  });

  it("e nem com Ctrl, que a meio de uma composição continua a ser da composição", () => {
    expect(deveEnviarComEnter({ ...NA_CAIXA, aCompor: true, ctrl: true })).toBe(false);
  });
});

describe("num ecrã táctil", () => {
  it("Enter é um parágrafo, porque é para isso que serve a tecla de retorno de vidro", () => {
    expect(deveEnviarComEnter({ ...NA_CAIXA, tactil: true })).toBe(false);
  });

  it("mas Ctrl+Enter e ⌘+Enter enviam — quem tem teclado ligado pediu-o", () => {
    expect(deveEnviarComEnter({ ...NA_CAIXA, tactil: true, ctrl: true })).toBe(true);
    expect(deveEnviarComEnter({ ...NA_CAIXA, tactil: true, meta: true })).toBe(true);
  });

  it("Shift+Enter continua a não enviar, com ou sem toque", () => {
    expect(deveEnviarComEnter({ ...NA_CAIXA, tactil: true, shift: true })).toBe(false);
  });
});
