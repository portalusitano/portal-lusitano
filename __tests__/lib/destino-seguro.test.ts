import { describe, it, expect } from "vitest";
import { destinoSeguro } from "@/lib/destino-seguro";

describe("destinoSeguro", () => {
  it("deixa passar um caminho deste site", () => {
    expect(destinoSeguro("/minha-conta")).toBe("/minha-conta");
    expect(destinoSeguro("/comprar?search=veiga")).toBe("/comprar?search=veiga");
    expect(destinoSeguro("/")).toBe("/");
  });

  it("recusa o protocolo-relativo, que é o redireccionamento aberto", () => {
    expect(destinoSeguro("//exemplo.com")).toBe("/");
    expect(destinoSeguro("///exemplo.com")).toBe("/");
  });

  it("recusa a contrabarra, que há browsers que normalizam para barra", () => {
    expect(destinoSeguro("/\\exemplo.com")).toBe("/");
  });

  it("recusa um URL absoluto", () => {
    expect(destinoSeguro("https://exemplo.com")).toBe("/");
    expect(destinoSeguro("javascript:alert(1)")).toBe("/");
  });

  it("recusa um caminho relativo, que não é deste site com certeza", () => {
    expect(destinoSeguro("exemplo.com")).toBe("/");
  });

  it("usa a omissão quando não vem nada", () => {
    expect(destinoSeguro(null)).toBe("/");
    expect(destinoSeguro("", "/entrar")).toBe("/entrar");
  });
});
