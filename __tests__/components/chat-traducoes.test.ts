import { describe, it, expect } from "vitest";
import pt from "@/locales/pt.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";

/**
 * O site tem selector de língua, e o `t` do `LanguageContext` é tipado a
 * partir do `pt.json` — as outras duas entram por um `as`, ou seja o
 * compilador não vê uma chave que falte lá. O que a vê é isto.
 *
 * Uma chave em falta não rebenta: escreve `undefined` no ecrã de quem está a
 * ler em inglês, e é a pior maneira de descobrir a falta.
 */
const LINGUAS = { en, es } as Record<string, { chat?: Record<string, unknown> }>;

describe("as palavras do chat nas três línguas", () => {
  it("o português tem todas as chaves que o código pede", () => {
    // Se alguma destas sair do ficheiro, o `tsc` apanha-a nos componentes;
    // este teste é a lista escrita, para se ver de relance o que existe.
    expect(Object.keys(pt.chat).length).toBeGreaterThanOrEqual(29);
  });

  for (const [nome, dicionario] of Object.entries(LINGUAS)) {
    it(`o ${nome} tem exactamente as mesmas chaves`, () => {
      expect(Object.keys(dicionario.chat ?? {}).sort()).toEqual(Object.keys(pt.chat).sort());
    });

    it(`e nenhuma delas ficou por traduzir`, () => {
      const porTraduzir = Object.entries(dicionario.chat ?? {}).filter(
        ([, v]) => typeof v !== "string" || v.trim().length === 0
      );
      expect(porTraduzir).toEqual([]);
    });
  }

  it("nenhuma frase do chat ficou igual em português e em inglês", () => {
    // Um descuido de copiar-colar deixa português dentro do dicionário inglês,
    // e isso não dá erro nenhum — só se vê no ecrã. As excepções legítimas
    // são as palavras que se escrevem igual nas duas línguas.
    const iguaisAceites = new Set(["vendido", "reservado"]);
    const iguais = Object.entries(pt.chat)
      .filter(([k, v]) => !iguaisAceites.has(k) && (en.chat as Record<string, string>)[k] === v)
      .map(([k]) => k);
    expect(iguais).toEqual([]);
  });
});
