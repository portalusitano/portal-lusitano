import { describe, it, expect } from "vitest";
import {
  CAPAS_CANDIDATAS,
  capaDoCartao,
  escolherCapa,
  iniciaisDe,
  mapaDeCapas,
} from "@/lib/directorio-capas";

describe("escolherCapa", () => {
  it("prefere o webp ao jpg quando existem os dois", () => {
    expect(escolherCapa("alter-real", ["capa.jpg", "capa.webp"])).toBe(
      "/images/coudelarias/alter-real/capa.webp"
    );
  });

  it("aceita o jpg quando não há webp — que é o caso de todo o repositório", () => {
    expect(escolherCapa("veiga-teixeira", ["capa.jpg"])).toBe(
      "/images/coudelarias/veiga-teixeira/capa.jpg"
    );
  });

  it("usa a primeira da galeria quando não há capa: é uma fotografia da coudelaria", () => {
    expect(escolherCapa("alter-real", ["galeria-1.jpg", "galeria-2.jpg"])).toBe(
      "/images/coudelarias/alter-real/galeria-1.jpg"
    );
  });

  it("prefere sempre a capa à galeria", () => {
    expect(escolherCapa("x", ["galeria-1.jpg", "capa.jpg"])).toBe("/images/coudelarias/x/capa.jpg");
  });

  it("devolve nulo em vez de inventar uma fotografia de stock", () => {
    expect(escolherCapa("santa-margarida", [])).toBeNull();
    expect(escolherCapa("santa-margarida", ["galeria-2.jpg", "logo.png"])).toBeNull();
  });

  it("a ordem de preferência é a declarada", () => {
    expect([...CAPAS_CANDIDATAS]).toEqual([
      "capa.webp",
      "capa.jpg",
      "capa.jpeg",
      "capa.png",
      "galeria-1.webp",
      "galeria-1.jpg",
    ]);
  });
});

describe("mapaDeCapas", () => {
  it("só inclui quem tem mesmo fotografia", () => {
    expect(
      mapaDeCapas({
        "com-capa": ["capa.jpg"],
        "so-galeria": ["galeria-1.jpg"],
        vazia: [],
        "sem-nada": ["contactos.txt"],
      })
    ).toEqual({
      "com-capa": "/images/coudelarias/com-capa/capa.jpg",
      "so-galeria": "/images/coudelarias/so-galeria/galeria-1.jpg",
    });
  });

  it("um mapa vazio é um resultado válido, não um erro", () => {
    expect(mapaDeCapas({})).toEqual({});
  });
});

describe("capaDoCartao", () => {
  const disco = { "alter-real": "/images/coudelarias/alter-real/capa.jpg" };

  it("a fotografia carregada pela coudelaria manda", () => {
    expect(capaDoCartao("https://cdn/foto.jpg", "alter-real", disco)).toBe("https://cdn/foto.jpg");
  });

  it("sem fotografia na base de dados, usa a que está em disco", () => {
    expect(capaDoCartao(null, "alter-real", disco)).toBe("/images/coudelarias/alter-real/capa.jpg");
    expect(capaDoCartao("   ", "alter-real", disco)).toBe(
      "/images/coudelarias/alter-real/capa.jpg"
    );
  });

  it("sem nenhuma das duas devolve nulo — o cartão desenha a chapa", () => {
    expect(capaDoCartao(undefined, "santa-margarida", disco)).toBeNull();
  });
});

describe("iniciaisDe", () => {
  it("salta 'Coudelaria', que está em quase todos os nomes e não distingue nada", () => {
    expect(iniciaisDe("Coudelaria Manuel Veiga")).toBe("MV");
    expect(iniciaisDe("Coudelaria de Alter Real")).toBe("AR");
  });

  it("salta as palavras de ligação", () => {
    expect(iniciaisDe("Companhia das Lezírias")).toBe("CL");
    expect(iniciaisDe("Quinta da Hermida")).toBe("QH");
  });

  it("aguenta pontuação e separadores", () => {
    expect(iniciaisDe("Coudelaria CL - Companhia das Lezírias")).toBe("CL");
    expect(iniciaisDe("Torres Vaz Freire")).toBe("TV");
  });

  it("com uma palavra só devolve uma letra", () => {
    expect(iniciaisDe("Lusitanus")).toBe("L");
  });

  it("um nome só de palavras vazias ainda dá alguma coisa", () => {
    expect(iniciaisDe("Coudelaria")).toBe("C");
  });

  it("não rebenta com um nome vazio", () => {
    expect(iniciaisDe("")).toBe("");
    expect(iniciaisDe("   ")).toBe("");
  });
});
