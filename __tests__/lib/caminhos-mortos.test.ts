import { describe, it, expect } from "vitest";
import { apontaParaFicheiroQueTemos } from "@/lib/directorio-capas";
import { montarFotos } from "@/lib/fotos-coudelarias";

/**
 * O caso real que estes testes descrevem: a base guarda `imagem-NN.webp` e em
 * `public/images/coudelarias/` não existe um único `.webp` — 81 ficheiros,
 * todos `.jpg`. Eram 85 caminhos mortos em 166, espalhados por 20 coudelarias.
 */
describe("apontaParaFicheiroQueTemos", () => {
  const disco = ["capa.jpg", "galeria-1.jpg", "galeria-2.jpg"];

  it("aceita um caminho nosso cujo ficheiro está em disco", () => {
    expect(apontaParaFicheiroQueTemos("/images/coudelarias/x/galeria-2.jpg", "x", disco)).toBe(
      true
    );
  });

  it("recusa um caminho nosso cujo ficheiro não existe", () => {
    expect(apontaParaFicheiroQueTemos("/images/coudelarias/x/imagem-02.webp", "x", disco)).toBe(
      false
    );
  });

  it("não julga o que está fora da pasta desta coudelaria", () => {
    // Daqui não há como saber se um endereço externo responde. Quem o descobre
    // é a sonda do cliente, na galeria.
    expect(apontaParaFicheiroQueTemos("https://exemplo.pt/foto.jpg", "x", disco)).toBe(true);
    expect(apontaParaFicheiroQueTemos("/images/coudelarias/outra/capa.jpg", "x", disco)).toBe(true);
    expect(apontaParaFicheiroQueTemos("/uploads/x/capa.jpg", "x", disco)).toBe(true);
  });

  it("não declara morto o que não chegou a olhar: subpastas", () => {
    expect(apontaParaFicheiroQueTemos("/images/coudelarias/x/2024/a.jpg", "x", disco)).toBe(true);
  });

  it("lê nomes crus com espaços e acentos, como a base os guarda", () => {
    const comCaptura = ["Captura de ecrã 2026-02-23 215720.png"];
    expect(
      apontaParaFicheiroQueTemos(
        "/images/coudelarias/x/Captura de ecrã 2026-02-23 215720.png",
        "x",
        comCaptura
      )
    ).toBe(true);
    expect(
      apontaParaFicheiroQueTemos(
        "/images/coudelarias/x/Captura%20de%20ecr%C3%A3%202026-02-23%20215720.png",
        "x",
        comCaptura
      )
    ).toBe(true);
    // A pasta da Coudelaria Andrade está vazia: os três caminhos dela morrem.
    expect(
      apontaParaFicheiroQueTemos(
        "/images/coudelarias/x/Captura de ecrã 2026-02-23 215720.png",
        "x",
        []
      )
    ).toBe(false);
  });

  it("um `%` que não é escape não faz rebentar nada", () => {
    expect(apontaParaFicheiroQueTemos("/images/coudelarias/x/100%.jpg", "x", ["100%.jpg"])).toBe(
      true
    );
  });

  it("ignora o que vem depois de ? e de #", () => {
    expect(apontaParaFicheiroQueTemos("/images/coudelarias/x/capa.jpg?v=2", "x", disco)).toBe(true);
  });
});

describe("montarFotos com caminhos mortos na base", () => {
  it("a galeria da Manuel Veiga era seis mortas e zero vivas", () => {
    // Em disco só há `capa.jpg`; a base aponta seis `.webp` que não existem.
    // Como os caminhos da base entram primeiro, a capa saía por repetida e
    // sobrava uma galeria feita inteiramente de imagens mortas.
    const r = montarFotos({
      slug: "coudelaria-manuel-veiga",
      capaDb: "/images/coudelarias/coudelaria-manuel-veiga/capa.jpg",
      galeriaDb: [2, 3, 4, 5, 6, 7].map(
        (n) => `/images/coudelarias/coudelaria-manuel-veiga/imagem-0${n}.webp`
      ),
      ficheirosLocais: ["capa.jpg"],
    });
    expect(r.capa).toBe("/images/coudelarias/coudelaria-manuel-veiga/capa.jpg");
    expect(r.galeria).toEqual([]);
  });

  it("uma capa morta cede o lugar à fotografia que a casa tem mesmo", () => {
    const r = montarFotos({
      slug: "x",
      capaDb: "/images/coudelarias/x/imagem-01.webp",
      galeriaDb: [],
      ficheirosLocais: ["capa.jpg", "galeria-1.jpg"],
    });
    expect(r.capa).toBe("/images/coudelarias/x/capa.jpg");
  });

  it("com a pasta vazia e tudo morto na base, não sobra fotografia nenhuma", () => {
    // A Coudelaria Andrade. Melhor não haver fotografia do que haver um
    // rectângulo preto que promete uma.
    const r = montarFotos({
      slug: "coudelaria-andrade",
      capaDb: "/images/coudelarias/coudelaria-andrade/Captura de ecrã 2026-02-23 215720.png",
      galeriaDb: ["/images/coudelarias/coudelaria-andrade/Captura de ecrã 2026-02-23 215752.png"],
      ficheirosLocais: [],
    });
    expect(r.capa).toBeNull();
    expect(r.galeria).toEqual([]);
  });

  it("o que está vivo na base continua a mandar, e pela ordem da base", () => {
    const r = montarFotos({
      slug: "alter-real",
      capaDb: "/images/coudelarias/alter-real/galeria-1.jpg",
      galeriaDb: [
        "/images/coudelarias/alter-real/galeria-3.jpg",
        "/images/coudelarias/alter-real/galeria-2.jpg",
      ],
      ficheirosLocais: ["galeria-1.jpg", "galeria-2.jpg", "galeria-3.jpg"],
    });
    expect(r.galeria).toEqual([
      "/images/coudelarias/alter-real/galeria-3.jpg",
      "/images/coudelarias/alter-real/galeria-2.jpg",
    ]);
  });
});
