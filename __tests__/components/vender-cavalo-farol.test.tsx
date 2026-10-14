import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import Farol from "@/components/vender-cavalo/Farol";

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({ language: "pt", t: {} }),
}));

/**
 * O `IntersectionObserver` do jsdom não existe, e é ele que manda em tudo o
 * que este componente faz. Põe-se um no lugar que guarda os observadores e
 * deixa o teste disparar as entradas à mão — é a única maneira de exercitar
 * as regras sem um browser.
 */
type Observado = { alvo: Element; entrar: (dentro: boolean) => void };
let observados: Observado[] = [];

class ObservadorFalso {
  private aoMudar: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) {
    this.aoMudar = cb;
  }
  observe(alvo: Element) {
    observados.push({
      alvo,
      entrar: (dentro: boolean) =>
        this.aoMudar(
          [{ target: alvo, isIntersecting: dentro } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver
        ),
    });
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  root = null;
  rootMargin = "";
  thresholds = [];
}

const rascunhoVazio = { estado: "vazio" } as const;

/** A página, reduzida ao que o farol procura no DOM. */
function montarPagina(titulos: string[]) {
  document.body.innerHTML = `
    <div data-farol-topo=""></div>
    <form>
      ${titulos
        .map((t) => `<section class="seccao-campos"><h3 class="titulo-seccao">${t}</h3></section>`)
        .join("")}
    </form>`;
}

const farol = () => document.querySelector(".vc-farol") as HTMLElement;
const onde = () => document.querySelector(".vc-farol__onde")?.textContent?.trim();

/* O `vitest.setup.ts` já põe um `IntersectionObserver` de mentira em
   `window`, declarado `writable` mas não `configurable` — por isso troca-se
   por atribuição e não com `vi.stubGlobal`, que precisa de o redefinir. */
const original = window.IntersectionObserver;

beforeEach(() => {
  observados = [];
  window.IntersectionObserver = ObservadorFalso as unknown as typeof IntersectionObserver;
});
afterEach(() => {
  window.IntersectionObserver = original;
  document.body.innerHTML = "";
});

/** Faz entrar (ou sair) o alvo que corresponde ao selector. */
function disparar(selector: string, dentro: boolean) {
  act(() => {
    for (const o of observados) if (o.alvo.matches(selector)) o.entrar(dentro);
  });
}

describe("o farol só aparece onde tem alguma coisa a dizer", () => {
  it("está calado enquanto o indicador de passos está no ecrã", () => {
    // As duas superfícies dizem a mesma coisa, e a de cima di-la melhor. Ter
    // as duas ao mesmo tempo é tapar o formulário para repetir o que já se lê.
    montarPagina(["Como o contactam"]);
    render(<Farol faltam={7} rascunho={rascunhoVazio} passo={1} />);
    disparar("[data-farol-topo]", true);
    disparar("form", true);
    expect(farol().dataset.visivel).toBe("nao");
  });

  it("aparece quando o topo sai do ecrã e o formulário continua à vista", () => {
    montarPagina(["Como o contactam"]);
    render(<Farol faltam={7} rascunho={rascunhoVazio} passo={1} />);
    disparar("[data-farol-topo]", false);
    disparar("form", true);
    expect(farol().dataset.visivel).toBe("sim");
  });

  it("cala-se outra vez no rodapé, com o formulário já fora do ecrã", () => {
    // O defeito que esta condição paga: no rodapé o farol continuava a
    // anunciar «Identificação oficial · faltam 27» por cima de uma página
    // onde o formulário já tinha acabado. Uma barra que aponta para uma
    // secção que já passou é pior do que barra nenhuma.
    montarPagina(["Como o contactam"]);
    render(<Farol faltam={7} rascunho={rascunhoVazio} passo={1} />);
    disparar("[data-farol-topo]", false);
    disparar("form", true);
    expect(farol().dataset.visivel).toBe("sim");
    disparar("form", false);
    expect(farol().dataset.visivel).toBe("nao");
  });
});

describe("a secção que se anuncia é a que está debaixo dos olhos", () => {
  it("com duas à vista, ganha a que está mais acima", () => {
    // É a que se está a acabar. A de baixo ainda mal começou.
    montarPagina(["Como o contactam", "Facturação"]);
    const seccoes = [...document.querySelectorAll(".seccao-campos")] as HTMLElement[];
    // O jsdom dá `offsetTop` zero a tudo; escreve-se à mão a ordem da página.
    Object.defineProperty(seccoes[0], "offsetTop", { value: 100 });
    Object.defineProperty(seccoes[1], "offsetTop", { value: 900 });
    render(<Farol faltam={7} rascunho={rascunhoVazio} passo={1} />);
    disparar(".seccao-campos", true);
    expect(onde()).toBe("Como o contactam");
  });

  it("uma secção que sai do ecrã deixa de ser a que se anuncia", () => {
    montarPagina(["Como o contactam", "Facturação"]);
    const seccoes = [...document.querySelectorAll(".seccao-campos")] as HTMLElement[];
    Object.defineProperty(seccoes[0], "offsetTop", { value: 100 });
    Object.defineProperty(seccoes[1], "offsetTop", { value: 900 });
    render(<Farol faltam={7} rascunho={rascunhoVazio} passo={1} />);
    disparar(".seccao-campos", true);
    act(() => {
      for (const o of observados) if (o.alvo === seccoes[0]) o.entrar(false);
    });
    expect(onde()).toBe("Facturação");
  });
});

describe("uma leitura de um passo não vale para o passo seguinte", () => {
  it("mudar de passo apaga o nome da secção anterior", () => {
    // O passo 4 não tem secções nenhumas: sem esta regra, quem lá chegasse
    // via o farol a anunciar a última secção do passo 3. A alternativa era
    // limpar o estado dentro do efeito, que é uma cascata de renders — a
    // secção actual traz o passo consigo justamente para não ser preciso.
    montarPagina(["Descrição e vídeos"]);
    const { rerender } = render(<Farol faltam={3} rascunho={rascunhoVazio} passo={3} />);
    disparar(".seccao-campos", true);
    expect(onde()).toBe("Descrição e vídeos");

    document.querySelector("form")!.innerHTML = "";
    rerender(<Farol faltam={1} rascunho={rascunhoVazio} passo={4} />);
    expect(onde()).toBe("");
  });
});

describe("a conta é a mesma que trava o botão", () => {
  it("zero faltas dizem-se por palavras, e não com um zero", () => {
    montarPagina(["Como o contactam"]);
    render(<Farol faltam={0} rascunho={rascunhoVazio} passo={1} />);
    expect(screen.getByText("Passo completo")).toBeTruthy();
    expect(document.querySelector(".vc-farol__falta")?.getAttribute("data-zero")).toBe("sim");
  });

  it("uma falta é singular", () => {
    montarPagina(["Como o contactam"]);
    render(<Farol faltam={1} rascunho={rascunhoVazio} passo={1} />);
    expect(screen.getByText("Falta 1")).toBeTruthy();
  });

  it("mais do que uma é plural", () => {
    montarPagina(["Como o contactam"]);
    render(<Farol faltam={12} rascunho={rascunhoVazio} passo={1} />);
    expect(screen.getByText("Faltam 12")).toBeTruthy();
  });
});

describe("não fala por cima de quem escreve", () => {
  it("é invisível para quem ouve a página", () => {
    // Tudo o que aqui se escreve já é dito, e melhor, pelo indicador de
    // passos e pelo cabeçalho de cada secção. Anunciá-lo outra vez a cada
    // secção por que se passa seria interromper quem está a preencher.
    montarPagina(["Como o contactam"]);
    render(<Farol faltam={7} rascunho={rascunhoVazio} passo={1} />);
    expect(farol().getAttribute("aria-hidden")).toBe("true");
  });

  it("não apanha o ponteiro", () => {
    // É informação, não um alvo: assim nunca tapa nada com que se possa
    // querer mexer.
    montarPagina(["Como o contactam"]);
    render(<Farol faltam={7} rascunho={rascunhoVazio} passo={1} />);
    // A regra vive no CSS (`pointer-events: none`), que o jsdom não carrega;
    // o que aqui se fixa é que o elemento não tem nada que o torne um alvo.
    expect(farol().querySelector("button, a, input")).toBeNull();
  });
});
