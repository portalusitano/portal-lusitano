import { describe, it, expect } from "vitest";
import {
  digitoControloNif,
  lerNif,
  lerTelefonePT,
  normalizarNif,
  normalizarTelefonePT,
  pareceTelefoneInternacional,
  tipoContribuinteNif,
} from "@/lib/identificacao-pt";

/**
 * Os NIF usados aqui não são de ninguém: são sequências construídas a partir
 * do próprio algoritmo, que é público. O que se exercita é o algoritmo.
 */
describe("NIF — módulo 11", () => {
  it("valida o dígito de controlo, e não só o comprimento", () => {
    expect(lerNif("123456789").valido).toBe(true);
    // Nove algarismos, dígito de controlo errado. Validar só o comprimento
    // deixava passar dez em cada onze gralhas; é este caso que o prova.
    expect(lerNif("123456788")).toMatchObject({ valido: false, problema: "controlo" });
  });

  it("o dígito de controlo é o que a Autoridade Tributária publica", () => {
    expect(digitoControloNif("12345678")).toBe(9);
    expect(digitoControloNif("50123456")).toBe(0);
    expect(digitoControloNif("99999999")).toBe(0);
  });

  it("oito ou dez algarismos são um comprimento errado, não um controlo errado", () => {
    expect(lerNif("12345678").problema).toBe("comprimento");
    expect(lerNif("1234567890").problema).toBe("comprimento");
  });

  it("pontos e espaços não fazem parte do número", () => {
    expect(normalizarNif("123 456 789")).toBe("123456789");
    expect(lerNif("123.456.789").valido).toBe(true);
  });

  it("nenhum NIF começa por zero, e o 4 só existe no par 45", () => {
    expect(lerNif("012345678").problema).toBe("prefixo");
    expect(lerNif("451234561").valido).toBe(true);
  });

  it("o primeiro algarismo diz que tipo de contribuinte é", () => {
    // É isto que permite perguntar a quem escolheu «Coudelaria» e escreveu o
    // NIF pessoal se é mesmo esse que quer na factura.
    expect(tipoContribuinteNif("123456789")).toBe("singular");
    expect(tipoContribuinteNif("451234561")).toBe("singular");
    expect(tipoContribuinteNif("501234560")).toBe("colectiva");
    expect(tipoContribuinteNif("601234561")).toBe("colectiva");
    expect(tipoContribuinteNif("701234563")).toBe("colectiva");
    expect(tipoContribuinteNif("999999990")).toBe("colectiva");
  });
});

describe("telefone português", () => {
  it("os quatro prefixos móveis atribuídos passam, os outros não", () => {
    for (const prefixo of ["91", "92", "93", "96"]) {
      expect(lerTelefonePT(`${prefixo}2345678`)).toMatchObject({ valido: true, especie: "movel" });
    }
    // O 94, o 95, o 97, o 98 e o 99 não são de ninguém.
    for (const prefixo of ["94", "95", "97", "98", "99"]) {
      expect(lerTelefonePT(`${prefixo}2345678`).valido).toBe(false);
    }
  });

  it("o fixo é nove algarismos a começar por 2", () => {
    expect(lerTelefonePT("212345678")).toMatchObject({ valido: true, especie: "fixo" });
    expect(lerTelefonePT("289123456")).toMatchObject({ valido: true, especie: "fixo" });
  });

  it("o nómada 30/31 é legítimo e não se recusa", () => {
    // Recusá-lo custaria um anúncio a quem usa voz sobre IP, e não impede
    // engano nenhum.
    expect(lerTelefonePT("301234567")).toMatchObject({ valido: true, especie: "nomada" });
  });

  it("o indicativo vem como vier, e a decoração não conta", () => {
    for (const escrito of [
      "+351 912 345 678",
      "00351912345678",
      "351912345678",
      "912-345-678",
      "(351) 912 345 678",
    ]) {
      expect(normalizarTelefonePT(escrito)).toBe("912345678");
    }
  });

  it("o formatado é o que se lê, não o que se guarda", () => {
    expect(lerTelefonePT("+351912345678").formatado).toBe("912 345 678");
  });

  it("oito algarismos não são um número português", () => {
    expect(lerTelefonePT("91234567").valido).toBe(false);
  });

  it("fora de Portugal só vale o mínimo que vale em todo o lado", () => {
    // A E.164 fixa o máximo em quinze algarismos; abaixo de sete não há
    // número em rede nenhuma. Mais do que isto seria aplicar a numeração
    // portuguesa a quem vive noutro país.
    expect(pareceTelefoneInternacional("+33 6 12 34 56 78")).toBe(true);
    expect(pareceTelefoneInternacional("+1 415 555 0132")).toBe(true);
    expect(pareceTelefoneInternacional("12345")).toBe(false);
    expect(pareceTelefoneInternacional("1234567890123456")).toBe(false);
  });
});
