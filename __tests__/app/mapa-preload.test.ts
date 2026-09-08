import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * O `app/mapa/layout.tsx` anuncia ao browser, no `<head>`, os ficheiros que o
 * `<GloboTerra>` vai buscar — e é isso que os tira da cauda da cascata (medido:
 * texturas prontas aos 382ms em vez de 2095ms a 1400×950).
 *
 * A lista está escrita nos dois sítios de propósito: o layout é servidor e o
 * globo é uma ilha de cliente carregada a pedido, e importar-lhe o módulo só
 * para ler cinco cadeias traria o three.js para o pedido do servidor. O preço
 * de a escrever duas vezes é que ela se pode calar sem dar sinal: um `preload`
 * de um ficheiro que ninguém pede não estoira nada, só desperdiça a
 * transferência; um ficheiro que o globo pede e não está anunciado volta a
 * esperar pela hidratação, e ninguém dá por isso a não ser medindo.
 *
 * Por isso este teste é a costura entre os dois: lê os dois ficheiros e exige
 * que o conjunto de caminhos `/globo/…` seja **o mesmo**. Lê o texto e não os
 * módulos porque o `GloboTerra` monta uma cena WebGL ao ser importado.
 */
const RAIZ = process.cwd();
const PAGINA = readFileSync(join(RAIZ, "app/mapa/page.tsx"), "utf8");
const GLOBO = readFileSync(join(RAIZ, "components/GloboTerra.tsx"), "utf8");

/** Só as cadeias entre aspas — assim os caminhos citados em comentários e em
    nomes de guiões (`scripts/globo/…`) ficam de fora. */
function caminhosDoGlobo(fonte: string): Set<string> {
  const achados = fonte.match(/"\/globo\/[^"]+"/g) ?? [];
  return new Set(achados.map((s) => s.slice(1, -1)));
}

describe("os ficheiros do globo anunciados no documento", () => {
  const anunciados = caminhosDoGlobo(PAGINA);
  const pedidos = caminhosDoGlobo(GLOBO);

  it("o layout anuncia alguma coisa", () => {
    expect(anunciados.size).toBeGreaterThan(0);
  });

  it("nenhum ficheiro que o globo pede fica por anunciar", () => {
    const emFalta = [...pedidos].filter((p) => !anunciados.has(p));
    expect(emFalta).toEqual([]);
  });

  it("nenhum ficheiro anunciado deixou de ser pedido", () => {
    const aMais = [...anunciados].filter((p) => !pedidos.has(p));
    expect(aMais).toEqual([]);
  });

  it("cada anúncio leva o `crossOrigin` que o THREE.TextureLoader usa", () => {
    /* O `THREE.Loader` põe `crossOrigin = "anonymous"` por omissão. Um
       `preload` sem ele não casa com a imagem que o loader cria, e o browser
       descarrega o ficheiro duas vezes — que é o contrário do que isto vem
       fazer. O mesmo vale para o `fetch()` dos contornos.

       Conta-se por chamadas ao `preload` e não por ficheiro: assim um
       ficheiro acrescentado à lista sem o `crossOrigin` faz o teste falhar em
       vez de passar por descuido. */
    const chamadas = PAGINA.match(/\bpreload\(/g) ?? [];
    const comCrossOrigin = PAGINA.match(/crossOrigin: "anonymous"/g) ?? [];
    expect(chamadas.length).toBeGreaterThan(0);
    expect(comCrossOrigin.length).toBe(chamadas.length);
  });
});
