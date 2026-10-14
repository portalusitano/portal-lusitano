import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

/**
 * A galeria da ficha, no caso que hoje é o provável e não o raro: cerca de
 * metade das ligações de fotografia das coudelarias responde 404.
 *
 * O que se prova aqui é a única coisa que uma galeria não pode fazer nunca:
 * **mentir sobre quantas fotografias há para ver**. Um contador que promete
 * onze e mostra cinco é pior do que não haver contador, e um título
 * «Fotografias» por cima de nada é pior do que não haver secção.
 *
 * Corre em jsdom, onde não há rede nem imagens: quem dispara o `load` e o
 * `error` é o próprio teste, que é exactamente o que o browser faria.
 */

vi.mock("@/context/LanguageContext", async () => {
  const pt = (await import("@/locales/pt.json")).default;
  return { useLanguage: () => ({ language: "pt", t: pt }) };
});

/* O `next/image` em jsdom seria um `<img>` com o optimizador pelo meio. Aqui
   basta um `<img>` a sério: o que importa é que os `onLoad` e `onError`
   cheguem ao componente, e é isso que o teste dispara à mão. */
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    onLoad,
    onError,
  }: {
    src: string;
    alt: string;
    onLoad?: () => void;
    onError?: () => void;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-src={src} onLoad={onLoad} onError={onError} />
  ),
}));

/* O `<Revelar>` marca o bloco para o observador partilhado animar. Em jsdom
   não há observador nenhum; o que interessa é o que está lá dentro. */
vi.mock("@/components/Revelar", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import Galeria from "@/components/directorio/ficha/Galeria";
import pt from "@/locales/pt.json";

const f = pt.directorio.ficha;
const TITULO = <h2 id="t-fotografias">{f.fotografias}</h2>;

const seis = ["/a.jpg", "/b.jpg", "/c.jpg", "/d.jpg", "/e.jpg", "/f.jpg"];

/**
 * O `vitest.setup.ts` já põe um `IntersectionObserver` de mentira, mas esse
 * nunca dispara — e é ele que manda pedir as miniaturas, que são a sonda que
 * descobre as ligações mortas. Aqui usa-se um que intersecta logo: o que se
 * está a provar é a conta, não a preguiça. Substitui-se por atribuição e não
 * com `vi.stubGlobal` porque a propriedade do `setup` é `writable` mas não
 * `configurable`.
 */
function observadorQueDispara() {
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
    constructor(private cb: (e: { isIntersecting: boolean }[]) => void) {
      queueMicrotask(() => this.cb([{ isIntersecting: true }]));
    }
    observe() {}
    disconnect() {}
    unobserve() {}
  };
}

/** Monta a galeria e deixa o observador dizer que ela está no ecrã. */
async function montar(fotos: string[], nome = "Coudelaria X") {
  const r = render(<Galeria fotos={fotos} nome={nome} titulo={TITULO} />);
  await act(async () => {});
  return r;
}

/** Todas as imagens que apontam para este `src`, principal e miniatura. */
const imagensDe = (src: string) =>
  Array.from(document.querySelectorAll<HTMLImageElement>(`img[data-src="${src}"]`));

/** Diz ao componente que estas fotografias não existem. */
const matar = async (...srcs: string[]) => {
  await act(async () => {
    for (const src of srcs) for (const img of imagensDe(src)) fireEvent.error(img);
  });
};

/** Diz ao componente que estas fotografias chegaram. */
const viver = async (...srcs: string[]) => {
  await act(async () => {
    for (const src of srcs) for (const img of imagensDe(src)) fireEvent.load(img);
  });
};

const conta = () => document.querySelector(".galeria-conta")?.textContent?.trim() ?? null;
const miniaturas = () => screen.queryAllByRole("button", { name: /^Ver fotografia/ });

describe("galeria da coudelaria — ligações mortas", () => {
  beforeEach(observadorQueDispara);

  it("não mostra contador nenhum enquanto houver fotografias por responder", async () => {
    await montar(seis);
    await viver("/a.jpg", "/b.jpg");
    // Faltam quatro. Um «1 / 6» agora seria uma promessa que pode não se
    // cumprir; melhor não dizer nada.
    expect(conta()).toBeNull();
  });

  it("conta só as que existem", async () => {
    await montar(seis);
    await matar("/b.jpg", "/d.jpg", "/f.jpg");
    await viver("/a.jpg", "/c.jpg", "/e.jpg");
    expect(conta()).toBe("1 / 3");
    expect(miniaturas()).toHaveLength(3);
  });

  it("a fotografia morta sai da fita e deixa de ser navegável", async () => {
    await montar(seis);
    await matar("/b.jpg", "/d.jpg", "/f.jpg");
    await viver("/a.jpg", "/c.jpg", "/e.jpg");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: f.foto_seguinte }));
    });
    expect(conta()).toBe("2 / 3");
    // A segunda das que existem é a `/c.jpg`, não a `/b.jpg`.
    expect(imagensDe("/c.jpg").length).toBeGreaterThan(0);
    expect(imagensDe("/b.jpg")).toHaveLength(0);
  });

  it("morrendo a que está à vista, mostra-se a seguinte que existe", async () => {
    await montar(seis);
    // A primeira é a que se está a ver, e é a que falha.
    await matar("/a.jpg");
    await viver("/b.jpg", "/c.jpg", "/d.jpg", "/e.jpg", "/f.jpg");
    expect(conta()).toBe("1 / 5");
    // O `alt` da fotografia à vista diz a posição no que resta.
    expect(screen.getByAltText(f.foto_de.replace("{n}", "1").replace("{total}", "5"))).toBeTruthy();
    expect(imagensDe("/a.jpg")).toHaveLength(0);
  });

  it("morrendo todas, desaparece a secção inteira e não fica um título sozinho", async () => {
    await montar(seis);
    expect(screen.queryByText(f.fotografias)).toBeTruthy();
    await matar(...seis);
    expect(screen.queryByText(f.fotografias)).toBeNull();
    expect(document.querySelector(".galeria-pilha")).toBeNull();
  });
});

describe("galeria da coudelaria — o que se lê e se ouve", () => {
  beforeEach(observadorQueDispara);

  it("o nome da coudelaria diz-se uma vez, no grupo, e não em cada `alt`", async () => {
    await montar(seis);
    expect(
      screen.getByRole("group", { name: f.fotografias_de.replace("{nome}", "Coudelaria X") })
    ).toBeTruthy();
    for (const img of Array.from(document.querySelectorAll("img"))) {
      expect(img.alt).not.toContain("Coudelaria X");
    }
  });

  it("com uma só fotografia não há setas, nem contador, nem fita", async () => {
    await montar(["/so-esta.jpg"]);
    await viver("/so-esta.jpg");
    expect(screen.queryByRole("button", { name: f.foto_seguinte })).toBeNull();
    expect(conta()).toBeNull();
    expect(miniaturas()).toHaveLength(0);
    // Mas continua a poder ver-se em ecrã inteiro.
    expect(screen.getByRole("button", { name: f.ampliar })).toBeTruthy();
  });

  it("sem fotografia nenhuma não se desenha nada", async () => {
    const { container } = await montar([]);
    expect(container.textContent).toBe("");
  });

  it("as setas dão a volta nos dois sentidos", async () => {
    await montar(["/a.jpg", "/b.jpg", "/c.jpg"]);
    await viver("/a.jpg", "/b.jpg", "/c.jpg");
    expect(conta()).toBe("1 / 3");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: f.foto_anterior }));
    });
    expect(conta()).toBe("3 / 3");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: f.foto_seguinte }));
    });
    expect(conta()).toBe("1 / 3");
  });

  it("a linha que o leitor de ecrã ouve diz a frase inteira, não «um barra três»", async () => {
    await montar(["/a.jpg", "/b.jpg", "/c.jpg"]);
    await viver("/a.jpg", "/b.jpg", "/c.jpg");
    const vivo = document.querySelector('[aria-live="polite"]');
    expect(vivo?.textContent).toBe(f.foto_de.replace("{n}", "1").replace("{total}", "3"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: f.foto_seguinte }));
    });
    expect(vivo?.textContent).toBe(f.foto_de.replace("{n}", "2").replace("{total}", "3"));
    // E o contador visível fica escondido do leitor: «1 / 3» lê-se mal.
    expect(document.querySelector(".galeria-conta")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("o visor de ecrã inteiro abre, e o Escape fecha-o", async () => {
    await montar(["/a.jpg", "/b.jpg"]);
    await viver("/a.jpg", "/b.jpg");
    const ampliar = screen.getByRole("button", { name: f.ampliar });
    await act(async () => {
      fireEvent.click(ampliar);
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(document.body.style.overflow).toBe("hidden");

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    // A página volta a poder rolar.
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
