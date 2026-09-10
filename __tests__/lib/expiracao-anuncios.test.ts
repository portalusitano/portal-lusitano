import { describe, it, expect } from "vitest";
import {
  LIMIARES_AVISO,
  JANELA_POS_EXPIRACAO,
  avisoDevido,
  descreverAviso,
  mesmoPrazo,
} from "@/lib/expiracao-anuncios";

const PRAZO = "2026-04-01T12:00:00.000Z";
const OUTRO_PRAZO = "2026-06-01T12:00:00.000Z";

function avisado(limiar: number | null, prazo: string | null = PRAZO) {
  return { limiar, prazo };
}

describe("mesmoPrazo", () => {
  it("reconhece o mesmo instante escrito de formas diferentes", () => {
    expect(mesmoPrazo("2026-04-01T12:00:00.000Z", "2026-04-01T12:00:00+00:00")).toBe(true);
    expect(mesmoPrazo("2026-04-01T12:00:00.000Z", "2026-04-01T13:00:00+01:00")).toBe(true);
  });

  it("distingue prazos diferentes", () => {
    expect(mesmoPrazo(PRAZO, OUTRO_PRAZO)).toBe(false);
  });

  it("nunca dá igualdade com prazos em falta ou ilegíveis", () => {
    expect(mesmoPrazo(null, null)).toBe(false);
    expect(mesmoPrazo(PRAZO, null)).toBe(false);
    expect(mesmoPrazo(PRAZO, "nao-e-uma-data")).toBe(false);
  });
});

describe("avisoDevido", () => {
  it("não avisa enquanto faltar mais do que o limiar mais folgado", () => {
    expect(avisoDevido(30, PRAZO)).toBeNull();
    expect(avisoDevido(8, PRAZO)).toBeNull();
  });

  it("avisa aos 7 dias", () => {
    expect(avisoDevido(7, PRAZO)).toBe(7);
  });

  it("mantém o aviso dos 7 dias enquanto não se chega ao seguinte", () => {
    expect(avisoDevido(5, PRAZO)).toBe(7);
    expect(avisoDevido(2, PRAZO)).toBe(7);
  });

  it("não repete um limiar já avisado no mesmo prazo", () => {
    expect(avisoDevido(5, PRAZO, avisado(7))).toBeNull();
    expect(avisoDevido(2, PRAZO, avisado(7))).toBeNull();
    expect(avisoDevido(7, PRAZO, avisado(7))).toBeNull();
  });

  it("avança para o aviso de véspera", () => {
    expect(avisoDevido(1, PRAZO, avisado(7))).toBe(1);
    expect(avisoDevido(1, PRAZO)).toBe(1);
  });

  it("avisa no próprio dia e logo a seguir à expiração", () => {
    expect(avisoDevido(0, PRAZO, avisado(1))).toBe(0);
    expect(avisoDevido(-1, PRAZO, avisado(1))).toBe(0);
  });

  it("cala-se depois de todos os limiares terem sido usados", () => {
    expect(avisoDevido(0, PRAZO, avisado(0))).toBeNull();
    expect(avisoDevido(-2, PRAZO, avisado(0))).toBeNull();
  });

  it("não desenterra anúncios expirados há muito", () => {
    expect(avisoDevido(-(JANELA_POS_EXPIRACAO + 1), PRAZO)).toBeNull();
    expect(avisoDevido(-365, PRAZO)).toBeNull();
  });

  it("ignora anúncios sem prazo", () => {
    expect(avisoDevido(null, null)).toBeNull();
    expect(avisoDevido(Number.NaN, PRAZO)).toBeNull();
  });

  it("recomeça o ciclo quando o anúncio é renovado", () => {
    // Avisado até ao fim do prazo antigo; o vendedor renova e o prazo muda.
    expect(avisoDevido(30, OUTRO_PRAZO, avisado(0))).toBeNull();
    expect(avisoDevido(7, OUTRO_PRAZO, avisado(0))).toBe(7);
    expect(avisoDevido(1, OUTRO_PRAZO, avisado(0))).toBe(1);
  });

  it("trata um limiar guardado corrompido como se não houvesse aviso", () => {
    expect(avisoDevido(7, PRAZO, avisado(Number.NaN))).toBe(7);
    expect(avisoDevido(7, PRAZO, avisado(7, null))).toBe(7);
  });
});

describe("descreverAviso", () => {
  it("tem um texto próprio para cada limiar", () => {
    const textos = LIMIARES_AVISO.map((l) => descreverAviso(l, "Imperador"));
    expect(new Set(textos.map((t) => t.assunto)).size).toBe(LIMIARES_AVISO.length);
    textos.forEach((t) => {
      expect(t.assunto).toContain("Imperador");
      expect(t.corpo).toContain("Imperador");
      expect(t.titulo.length).toBeGreaterThan(0);
    });
  });

  it("fala no singular quando falta um dia só", () => {
    expect(descreverAviso(1, "Imperador").assunto).toContain("Falta 1 dia");
  });

  it("diz que termina hoje no limiar zero", () => {
    expect(descreverAviso(0, "Imperador").titulo).toContain("hoje");
  });
});
