import { describe, it, expect } from "vitest";
import { anfitrioesPermitidos, origemPermitida } from "@/lib/origem-permitida";

const PERMITIDOS = anfitrioesPermitidos([
  "https://portal-lusitano.pt",
  "http://localhost:3000",
  undefined,
  null,
  "",
  "isto-nao-e-um-url",
]);

describe("anfitrioesPermitidos", () => {
  it("reduz URLs a anfitriões e deita fora o que não é URL", () => {
    expect(PERMITIDOS).toEqual(["portal-lusitano.pt", "localhost:3000"]);
  });

  it("não repete o mesmo anfitrião vindo de duas variáveis", () => {
    expect(
      anfitrioesPermitidos(["https://portal-lusitano.pt", "https://portal-lusitano.pt/vender"])
    ).toEqual(["portal-lusitano.pt"]);
  });
});

describe("origemPermitida", () => {
  it("aceita as origens do próprio site", () => {
    expect(origemPermitida("https://portal-lusitano.pt", PERMITIDOS)).toBe(true);
    expect(origemPermitida("http://localhost:3000", PERMITIDOS)).toBe(true);
  });

  /**
   * O defeito que isto fecha. A verificação era
   * `allowedOrigins.some((o) => origin.startsWith(o))`, e um prefixo de texto
   * não é um domínio: todos os domínios abaixo começam pelo domínio permitido
   * e nenhum deles é nosso. Qualquer um se regista sem pedir licença a
   * ninguém.
   */
  it.each([
    "https://portal-lusitano.pt.exemplo.com",
    "https://portal-lusitano.pt.evil.com",
    "https://portal-lusitano.ptx.io",
    "https://portal-lusitano.pt-falso.net",
    "http://localhost:3000.evil.com",
  ])("recusa %s, que o prefixo deixava passar", (origem) => {
    // A prova de que era mesmo um buraco: o teste antigo dava verdadeiro.
    expect(
      ["https://portal-lusitano.pt", "http://localhost:3000"].some((o) => origem.startsWith(o))
    ).toBe(true);

    expect(origemPermitida(origem, PERMITIDOS)).toBe(false);
  });

  it("recusa um sufixo que apenas termina no domínio permitido", () => {
    expect(origemPermitida("https://evil-portal-lusitano.pt", PERMITIDOS)).toBe(false);
  });

  it("recusa outra porta em localhost", () => {
    // `host` e não `hostname`, de propósito: em desenvolvimento a porta faz
    // parte da identidade da origem.
    expect(origemPermitida("http://localhost:9999", PERMITIDOS)).toBe(false);
  });

  it("recusa a ausência de Origin e lixo que não é URL", () => {
    expect(origemPermitida(null, PERMITIDOS)).toBe(false);
    expect(origemPermitida("", PERMITIDOS)).toBe(false);
    expect(origemPermitida("null", PERMITIDOS)).toBe(false);
    expect(origemPermitida("/vender-cavalo", PERMITIDOS)).toBe(false);
  });

  it("ignora maiúsculas no anfitrião, como o DNS", () => {
    expect(origemPermitida("https://Portal-Lusitano.PT", PERMITIDOS)).toBe(true);
  });
});
