import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { LADO_AVATAR } from "@/lib/perfil/contrato";
import pt from "@/locales/pt.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";

/**
 * ── O número que se promete tem de ser o número que se guarda ────────────
 *
 * As duas metades da fotografia de perfil escolheram lados diferentes, cada
 * uma com a sua razão escrita e nenhuma delas errada por si:
 *
 *   o navegador recorta e envia   `LADO_FINAL = 512`   (folga para ecrãs a 4×)
 *   o servidor guarda             `LADO_AVATAR = 256`  (medido: 17 KiB)
 *
 * O que não pode acontecer é o ecrã **dizer a quem envia** um número que não é
 * o que fica guardado — e dizia: «Guarda-se um quadrado de 512 pixéis», nas
 * três línguas. Uma frase dessas é uma promessa sobre a fotografia de outra
 * pessoa, e ninguém a pode verificar sem ir ao balde.
 *
 * Este teste não decide qual dos dois lados está certo: fixa que a frase e a
 * constante não se separam outra vez.
 */
describe("o lado prometido e o lado guardado", () => {
  const linhas = { pt: pt.perfil.formatos, en: en.perfil.formatos, es: es.perfil.formatos };

  for (const [lingua, frase] of Object.entries(linhas)) {
    it(`${lingua} promete o lado que o servidor guarda`, () => {
      const numeros = (frase.match(/\d+/g) ?? []).map(Number);
      expect(numeros, `"${frase}" não escreve número nenhum`).not.toHaveLength(0);
      expect(
        numeros,
        `"${frase}" não menciona ${LADO_AVATAR}, que é o que fica guardado`
      ).toContain(LADO_AVATAR);
    });
  }

  it("o comentário do módulo do servidor também fala do lado a sério", () => {
    const fonte = readFileSync(path.join(process.cwd(), "lib/perfil/fotografia.ts"), "utf8");
    expect(fonte).toContain(`${LADO_AVATAR}²`);
  });
});
