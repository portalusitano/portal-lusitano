import { describe, expect, it } from "vitest";
import { montarFotos } from "@/lib/fotos-coudelarias";

/**
 * A escolha da capa é do `lib/directorio-capas` — a mesma que o cartão da
 * listagem faz, e testada lá. Aqui prova-se o que é da ficha: que a capa
 * escolhida é a mesma, e que a galeria não a repete nem inventa nada.
 */
describe("montarFotos", () => {
  it("usa a mesma capa que o cartão da listagem escolheria", () => {
    const fotos = montarFotos({
      slug: "monte-velho",
      ficheirosLocais: ["galeria-1.jpg", "capa.jpg"],
    });
    expect(fotos.capa).toBe("/images/coudelarias/monte-velho/capa.jpg");
    expect(fotos.galeria).toEqual(["/images/coudelarias/monte-velho/galeria-1.jpg"]);
  });

  it("sem capa, promove a primeira da galeria — e continua a ser foto dela", () => {
    const fotos = montarFotos({
      slug: "alter-real",
      ficheirosLocais: ["galeria-1.jpg", "galeria-2.jpg"],
    });
    expect(fotos.capa).toBe("/images/coudelarias/alter-real/galeria-1.jpg");
    expect(fotos.galeria).toEqual(["/images/coudelarias/alter-real/galeria-2.jpg"]);
  });

  it("sem fotografia nenhuma devolve nada — e nunca stock", () => {
    const fotos = montarFotos({ slug: "santa-margarida" });
    expect(fotos.capa).toBeNull();
    expect(fotos.galeria).toEqual([]);
  });

  it("o que está na base de dados manda sobre o que está no disco", () => {
    const fotos = montarFotos({
      slug: "x",
      capaDb: "https://cdn.exemplo/capa.jpg",
      galeriaDb: ["https://cdn.exemplo/1.jpg"],
      ficheirosLocais: ["capa.jpg", "galeria-1.jpg"],
    });
    expect(fotos.capa).toBe("https://cdn.exemplo/capa.jpg");
    expect(fotos.galeria[0]).toBe("https://cdn.exemplo/1.jpg");
    expect(fotos.galeria).toContain("/images/coudelarias/x/galeria-1.jpg");
  });

  it("a capa não se repete dentro da galeria", () => {
    const fotos = montarFotos({
      slug: "x",
      capaDb: "https://cdn.exemplo/capa.jpg",
      galeriaDb: ["https://cdn.exemplo/capa.jpg", "https://cdn.exemplo/2.jpg"],
    });
    expect(fotos.galeria).toEqual(["https://cdn.exemplo/2.jpg"]);
  });

  it("ordena galeria-2 antes de galeria-10", () => {
    const fotos = montarFotos({
      slug: "x",
      ficheirosLocais: ["galeria-10.jpg", "galeria-2.jpg", "capa.jpg", "galeria-1.jpg"],
    });
    expect(fotos.galeria).toEqual([
      "/images/coudelarias/x/galeria-1.jpg",
      "/images/coudelarias/x/galeria-2.jpg",
      "/images/coudelarias/x/galeria-10.jpg",
    ]);
  });

  it("ignora entradas vazias vindas da base de dados e ficheiros que não são imagens", () => {
    const fotos = montarFotos({
      slug: "x",
      capaDb: "  ",
      galeriaDb: ["", "  ", "/i/1.jpg"],
      ficheirosLocais: ["leia-me.txt"],
    });
    expect(fotos.capa).toBeNull();
    expect(fotos.galeria).toEqual(["/i/1.jpg"]);
  });
});
