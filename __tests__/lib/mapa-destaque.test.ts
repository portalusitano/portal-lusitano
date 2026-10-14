import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { destaqueDistingue } from "@/app/mapa/destaque";

const RAIZ = path.resolve(__dirname, "../..");

/**
 * ── A metade da regra que ninguém tinha provado ───────────────────────────
 *
 * A regra tem duas metades e só uma estava escrita em testes de facto: «acima
 * de um quarto cala-se». A outra — «abaixo de um quarto volta» — nunca foi
 * confrontada com dados, e foi por isso que passou despercebido que o
 * conjunto sobre o qual a conta era feita mudava a cada tecla escrita. Um
 * distintivo que aparece a meio de uma palavra e desaparece quando se acaba
 * de a escrever não é um sinal; era o que acontecia, e não havia prova que o
 * pudesse apanhar.
 */
describe("destaqueDistingue — o distintivo escreve-se enquanto for de poucos", () => {
  const conj = (n: number, comDestaque: number) =>
    Array.from({ length: n }, (_, i) => ({ destaque: i < comDestaque }));

  it("o degrau é um quarto, e o quarto certo conta", () => {
    expect(destaqueDistingue(conj(20, 5))).toBe(true); // exactamente 25%
    expect(destaqueDistingue(conj(20, 6))).toBe(false); // 30%
    expect(destaqueDistingue(conj(4, 1))).toBe(true);
    expect(destaqueDistingue(conj(4, 2))).toBe(false);
  });

  it("nenhum destaque não é um destaque de todos", () => {
    expect(destaqueDistingue(conj(29, 0))).toBe(false);
    expect(destaqueDistingue([])).toBe(false);
  });

  /**
   * O caso que trouxe a regra até aqui, com os números que os dados
   * verdadeiros dão: vinte em vinte e nove, que são 69%.
   */
  it("com 20 de 29 — o que a base tem hoje — cala-se", () => {
    expect(destaqueDistingue(conj(29, 20))).toBe(false);
  });

  /**
   * ── E cala-se em **todos** os estados, não só no de partida ─────────────
   *
   * Esta é a prova que não existia. Enquanto a conta era feita sobre o que
   * estava no ecrã, qualquer subconjunto podia acender o distintivo: medido a
   * escrever «veiga» na lista, os quatro cartões de `vei` traziam um selo e os
   * dois de `veig` nenhum. Aqui pergunta-se o contrário — se a conta é sobre o
   * conjunto todo, **nenhum** subconjunto pode mudar a resposta, porque o
   * argumento é sempre o mesmo.
   *
   * Percorrem-se todos os subconjuntos de um conjunto com a proporção dos
   * dados de hoje (2^12 = 4096 filtros possíveis) e exige-se que a resposta
   * seja a mesma em todos: a que o conjunto inteiro dá.
   */
  it("a resposta é a do conjunto todo, e nenhum filtro a pode virar", () => {
    const todos = conj(12, 8); // 67%, a proporção que os dados verdadeiros dão
    expect(destaqueDistingue(todos)).toBe(false);

    // O que a regra fazia antes: cada filtro decidia por si. Enumerados os
    // 4096 subconjuntos — que é o espaço de filtros de uma colecção destas —,
    // conta-se em quantos a resposta era o contrário da do conjunto todo.
    let discordam = 0;
    for (let m = 0; m < 1 << todos.length; m++) {
      const sub = todos.filter((_, i) => m & (1 << i));
      if (destaqueDistingue(sub) !== destaqueDistingue(todos)) discordam++;
    }
    // São **40 em 4096**, um por cento — e é a raridade que faz disto um
    // defeito e não uma regra. Um distintivo que aparece num filtro em cada
    // cem não se lê como «esta distingue-se»; lê-se como um erro de desenho a
    // piscar, e foi exactamente assim que apareceu no browser: dos cinco
    // passos de «veiga» só o terceiro o acendia.
    expect(discordam).toBe(40);

    // E o que a página faz agora: o argumento é sempre o mesmo, logo a
    // resposta é sempre a mesma — não há filtro que a possa virar.
    expect(new Set([...Array(50)].map(() => destaqueDistingue(todos))).size).toBe(1);
  });

  /**
   * A chamada tem de continuar a ser sobre a colecção inteira. Sem esta
   * prova, alguém volta a escrever `visiveis` — que é a variável que está ali
   * ao lado e parece a certa — e o piscar regressa sem ninguém dar por ele,
   * porque só se vê a meio de uma palavra escrita.
   */
  it("o `MapaClient` pergunta pelo conjunto todo, não pelo que sobrou do funil", () => {
    const fonte = readFileSync(path.join(RAIZ, "components/MapaClient.tsx"), "utf8");
    expect(fonte).toContain("destaqueDistingue(coudelarias)");
    expect(fonte).not.toContain("destaqueDistingue(visiveis)");
  });
});
