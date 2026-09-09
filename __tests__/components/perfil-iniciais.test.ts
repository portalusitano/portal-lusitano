import { describe, expect, it } from "vitest";
import { eRotuloSemNome, iniciaisDe } from "@/components/perfil/iniciais";
import { nomeOutraParte } from "@/lib/marketplace-chat";

/**
 * As iniciais que ficam no lugar de uma fotografia que não existe.
 *
 * Os nomes vêm do banco de ensaio do chat (`scratchpad/chat-ensaio`), que é
 * quem cobre a gama: «Ana», um nome de 96 caracteres, um nome nulo, e os
 * rótulos que a camada de dados inventa para quem não tem nome.
 */
describe("iniciaisDe", () => {
  it("um nome simples dá uma letra", () => {
    expect(iniciaisDe("Ana")).toBe("A");
  });

  it("nome e apelido dão duas", () => {
    expect(iniciaisDe("Beatriz Nunes")).toBe("BN");
    expect(iniciaisDe("Tomás Rebelo")).toBe("TR");
  });

  it("a segunda letra é a do último apelido, não a da segunda palavra", () => {
    // É assim que um nome se abrevia, e é o que distingue duas pessoas com o
    // mesmo primeiro nome.
    expect(iniciaisDe("Maria João Silva")).toBe("MS");
  });

  it("as partículas não dão inicial", () => {
    // Sem isto, «João … e Sousa …» abreviava com o «e».
    expect(iniciaisDe("João Maria de Bragança e Sousa Mendes de Vasconcelos Almeida")).toBe("JA");
    expect(iniciaisDe("Herdade dos Currais")).toBe("HC");
    expect(iniciaisDe("Quinta da Lezíria")).toBe("QL");
  });

  it("acentos são letras, e sobem para maiúscula", () => {
    expect(iniciaisDe("Ângela Óscar")).toBe("ÂÓ");
    expect(iniciaisDe("índia")).toBe("Í");
  });

  it("salta o que não é letra", () => {
    expect(iniciaisDe("🐴 Ana Silva")).toBe("AS");
    expect(iniciaisDe("  ana   silva  ")).toBe("AS");
  });

  it("nunca passa de duas letras, por muito comprido que o nome seja", () => {
    const longo = "Ana " + "Bragança ".repeat(20) + "Silva";
    expect(iniciaisDe(longo)).toHaveLength(2);
  });

  it("devolve null quando não há nome nenhum", () => {
    // `null` não é um erro: é a resposta honesta, e quem chama desenha o ícone
    // de pessoa em vez de inventar letras.
    expect(iniciaisDe(null)).toBeNull();
    expect(iniciaisDe(undefined)).toBeNull();
    expect(iniciaisDe("")).toBeNull();
    expect(iniciaisDe("   ")).toBeNull();
    expect(iniciaisDe("🐴 🌾")).toBeNull();
    expect(iniciaisDe("123 456")).toBeNull();
  });

  it("um nome feito só de partículas ainda dá uma letra", () => {
    // Melhor uma letra do que nenhuma: aqui há mesmo um nome, ainda que
    // estranho, e o `null` está reservado para quando não há.
    expect(iniciaisDe("de la")).toBe("DL");
  });
});

describe("eRotuloSemNome", () => {
  /* Os rótulos são **derivados** do `nomeOutraParte` e não copiados: se a
     camada de dados lhes mudar a frase, este teste e o componente acompanham-na
     sem ninguém se lembrar de vir cá. */
  const ROTULOS = new Set([
    nomeOutraParte("comprador", null, null),
    nomeOutraParte("vendedor", null, null),
  ]);

  it("os rótulos que a camada de dados inventa não são nomes", () => {
    expect(ROTULOS.size).toBe(2);
    for (const r of ROTULOS) expect(eRotuloSemNome(r, ROTULOS)).toBe(true);
  });

  it("e por isso não dão iniciais de sigla", () => {
    // «Comprador interessado» daria «CI», que se lê como a sigla de uma
    // empresa — e daria o **mesmo** disco às quatro conversas em que aparece.
    for (const r of ROTULOS) {
      expect(iniciaisDe(r)).not.toBeNull();
      expect(eRotuloSemNome(r, ROTULOS)).toBe(true);
    }
  });

  it("um nome a sério passa", () => {
    expect(eRotuloSemNome("Ana", ROTULOS)).toBe(false);
    expect(eRotuloSemNome("Beatriz Nunes", ROTULOS)).toBe(false);
  });

  it("ausência de nome conta como rótulo", () => {
    expect(eRotuloSemNome(null, ROTULOS)).toBe(true);
    expect(eRotuloSemNome("", ROTULOS)).toBe(true);
  });
});
