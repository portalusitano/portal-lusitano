import { describe, it, expect } from "vitest";
import {
  lerMicrochip,
  normalizarMicrochip,
  origemMicrochip,
  DIGITOS_MICROCHIP,
} from "@/lib/microchip-iso";

/**
 * A ISO 11784 fixa quinze algarismos e diz que os três primeiros são o código
 * do país (ISO 3166-1) ou 900–999 do fabricante. É essa norma que estes casos
 * exercitam — não um palpite sobre o que um microchip «costuma» parecer.
 */
describe("microchip ISO 11784/11785", () => {
  it("um chip português de quinze algarismos passa, e diz de onde é", () => {
    const chip = lerMicrochip("620098100123456");
    expect(chip.valido).toBe(true);
    expect(chip.origem).toEqual({ tipo: "pais", codigo: 620, pais: "Portugal" });
  });

  it("a gama 900–999 é do fabricante, não de um país", () => {
    expect(lerMicrochip("941000012345678").origem).toEqual({ tipo: "fabricante", codigo: 941 });
  });

  it("um código de país que a tabela não conhece continua a ser válido", () => {
    // Não conhecer o código não o torna inválido — 442 é o Luxemburgo, e
    // recusá-lo seria recusar um cavalo verdadeiro por causa de uma tabela
    // curta. O que se sabe é que é um país; qual, não é preciso saber.
    const chip = lerMicrochip("442000012345678");
    expect(chip.valido).toBe(true);
    expect(chip.origem).toEqual({ tipo: "pais", codigo: 442, pais: null });
  });

  it("catorze algarismos dizem quantos faltam, e quinze e um dizem quantos sobram", () => {
    expect(lerMicrochip("62009810012345")).toMatchObject({
      valido: false,
      problema: "comprimento",
      diferencaDigitos: 1,
    });
    expect(lerMicrochip("6200981001234567")).toMatchObject({
      problema: "comprimento",
      diferencaDigitos: -1,
    });
  });

  it("espaços e traços são decoração de quem copia do Livro Azul", () => {
    expect(normalizarMicrochip("620 098 100 123 456")).toBe("620098100123456");
    expect(lerMicrochip("620-098-100-123-456").valido).toBe(true);
    expect(normalizarMicrochip("620098100123456")).toHaveLength(DIGITOS_MICROCHIP);
  });

  it("uma letra pelo meio é outro número, não um separador", () => {
    // O número do passaporte leva letras; o do microchip não leva nenhuma.
    expect(lerMicrochip("PT620098100123").problema).toBe("nao-numerico");
  });

  it("quinze algarismos iguais são uma tecla presa", () => {
    expect(lerMicrochip("111111111111111").problema).toBe("repetido");
  });

  it("não há código de país abaixo de 004, e por isso não há chip que comece assim", () => {
    expect(lerMicrochip("003098100123456").problema).toBe("prefixo-impossivel");
    // O 004 já é o Afeganistão: existe, e passa.
    expect(lerMicrochip("004098100123456").valido).toBe(true);
  });

  it("origemMicrochip separa a gama do fabricante da dos países", () => {
    expect(origemMicrochip(899).tipo).toBe("pais");
    expect(origemMicrochip(900).tipo).toBe("fabricante");
  });
});
