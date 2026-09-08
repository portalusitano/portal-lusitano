import { describe, it, expect } from "vitest";
import { travarEnter } from "@/components/vender-cavalo/tecla-enter";

/**
 * O que estes testes protegem é um pagamento que ninguém pediu.
 *
 * Medido no banco de ensaio, contra a versão anterior: no passo 4, com a caixa
 * dos termos em foco, uma tecla Enter disparava um
 * `POST /api/vender-cavalo/upload` — a publicação a começar sem ninguém ter
 * carregado no botão. Com os cinco campos da factura nesse passo, o mesmo
 * acontecia ao carregar em Enter depois de escrever o NIF, que é o gesto mais
 * natural que há numa caixa de texto.
 */
const ULTIMO = 4;

describe("a tecla Enter no último passo", () => {
  it("é travada numa caixa de texto — escrever o NIF e carregar em Enter não paga", () => {
    expect(travarEnter("Enter", "INPUT", 4, ULTIMO)).toBe(true);
  });

  it("é travada numa caixa de selecção — foi assim que o defeito se mediu", () => {
    // O alvo é o mesmo `INPUT`; o que interessa é que nenhum caminho do
    // teclado chegue ao `onSubmit` sem passar pelo botão.
    expect(travarEnter("Enter", "input", 4, ULTIMO)).toBe(true);
  });

  it("é travada numa `<Seleccao>`, que guarda um `<select>` a sério lá dentro", () => {
    expect(travarEnter("Enter", "SELECT", 4, ULTIMO)).toBe(true);
  });

  it("passa num `<button>` — é assim que quem navega por teclado paga", () => {
    expect(travarEnter("Enter", "BUTTON", 4, ULTIMO)).toBe(false);
  });

  it("passa numa ligação — Enter numa `<a>` é segui-la", () => {
    expect(travarEnter("Enter", "A", 4, ULTIMO)).toBe(false);
  });

  it("passa num `<textarea>` — ali Enter é uma linha nova e nunca submeteu nada", () => {
    expect(travarEnter("Enter", "TEXTAREA", 4, ULTIMO)).toBe(false);
  });
});

describe("nos passos que não cobram, nada muda", () => {
  it("Enter continua a avançar o passo, que é a razão escrita no FormNavigation", () => {
    for (const passo of [1, 2, 3]) {
      expect(travarEnter("Enter", "INPUT", passo, ULTIMO)).toBe(false);
      expect(travarEnter("Enter", "SELECT", passo, ULTIMO)).toBe(false);
    }
  });
});

describe("nenhuma outra tecla é tocada", () => {
  it("o Espaço, o Tab e as setas passam sempre", () => {
    for (const tecla of [" ", "Tab", "ArrowDown", "Escape", "a"]) {
      expect(travarEnter(tecla, "INPUT", 4, ULTIMO)).toBe(false);
    }
  });
});
