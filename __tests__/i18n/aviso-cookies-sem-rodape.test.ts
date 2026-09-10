import { describe, it, expect } from "vitest";
import { eRotaSemRodape } from "@/lib/rotas-sem-rodape";
import pt from "@/locales/pt.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";

/**
 * ── Uma frase não pode apontar para uma coisa que aquela página não tem ──
 *
 * O aviso de cookies dizia «Pode mudar de ideias a qualquer momento **no
 * rodapé**». Era verdade em todas as páginas até o `/mapa` deixar de ter
 * rodapé — e é justamente no `/mapa` que muita gente vê o aviso pela primeira
 * vez, porque é uma das páginas por onde se entra no site.
 *
 * Mandar alguém a um sítio que não existe naquele ecrã é pior do que não dizer
 * onde é: quem procura o rodapé e não o encontra fica a achar que a definição
 * não existe. A frase passa a nomear **o que** se procura em vez de **onde** —
 * as definições de cookies —, o que é verdade em todas as páginas e continua a
 * dizer que a porta existe. A porta em si não se perdeu: está no rodapé de
 * todas as páginas que o têm, e o `abrirConsentimento` continua ligado a ela.
 *
 * Este teste existe para as duas coisas não se separarem outra vez: se um dia
 * outra página perder o rodapé, ou se a frase voltar a nomeá-lo, uma das duas
 * pontas parte aqui.
 */
describe("o aviso de cookies e as páginas sem rodapé", () => {
  const frases = {
    pt: pt.cookies.reopen_hint,
    en: en.cookies.reopen_hint,
    es: es.cookies.reopen_hint,
  };

  for (const [lingua, frase] of Object.entries(frases)) {
    it(`${lingua} não manda ninguém a um rodapé que pode não existir`, () => {
      expect(frase.toLowerCase()).not.toMatch(/rodapé|rodape|footer|pie de página|pie de pagina/);
    });

    it(`${lingua} continua a dizer que a definição existe`, () => {
      expect(frase.toLowerCase()).toMatch(/cookie/);
    });
  }

  // A razão da frase ter mudado: há páginas sem rodapé, e uma delas é de entrada.
  it("há mesmo páginas sem rodapé, e o /mapa é uma delas", () => {
    expect(eRotaSemRodape("/mapa")).toBe(true);
    expect(eRotaSemRodape("/directorio")).toBe(false);
  });
});
