/**
 * O tipo lido nos bytes.
 *
 * O que estes testes existem para impedir é uma coisa só: que alguém, um dia,
 * troque `tipoRealDosBytes` por uma leitura do `file.type` porque «dá o mesmo
 * na maior parte dos casos». Dá o mesmo em todos os casos honestos, e é
 * exactamente nos outros que interessa.
 */

import { describe, it, expect } from "vitest";
import {
  avaliarTipo,
  tipoRealDosBytes,
  BYTES_DE_ASSINATURA,
  FORMATOS_ACEITES,
} from "@/lib/documentos/tipo-real";

/** Bytes com a assinatura pedida à cabeça e enchimento a seguir. */
const comCabecalho = (cabecalho: number[], enchimento = 32) =>
  new Uint8Array([...cabecalho, ...new Array(enchimento).fill(0x41)]);

const PDF = comCabecalho([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
const JPEG = comCabecalho([0xff, 0xd8, 0xff, 0xe0]);
const PNG = comCabecalho([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// `RIFF`, quatro bytes de comprimento que não entram na decisão, `WEBP`, `VP8 `.
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
]);

describe("tipoRealDosBytes — os quatro que se aceitam", () => {
  it("reconhece o PDF pelo `%PDF-`", () => {
    expect(tipoRealDosBytes(PDF)).toBe("application/pdf");
  });

  it("reconhece o JPEG pelo SOI", () => {
    expect(tipoRealDosBytes(JPEG)).toBe("image/jpeg");
  });

  it("reconhece o PNG pelos oito bytes da assinatura", () => {
    expect(tipoRealDosBytes(PNG)).toBe("image/png");
  });

  it("reconhece o WebP por `RIFF` mais `WEBP`, ignorando o comprimento no meio", () => {
    expect(tipoRealDosBytes(WEBP)).toBe("image/webp");
    const outroComprimento = new Uint8Array(WEBP);
    outroComprimento.set([0xff, 0xff, 0x00, 0x00], 4);
    expect(tipoRealDosBytes(outroComprimento)).toBe("image/webp");
  });
});

describe("tipoRealDosBytes — o que recusa", () => {
  it("recusa um RIFF que não é WebP (um WAV, por exemplo)", () => {
    const wav = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
    ]);
    expect(tipoRealDosBytes(wav)).toBeNull();
  });

  it("recusa um PNG a que falta um byte da assinatura", () => {
    const quase = new Uint8Array(PNG);
    quase[7] = 0x00;
    expect(tipoRealDosBytes(quase)).toBeNull();
  });

  it("recusa texto, HTML e um executável", () => {
    const texto = new TextEncoder();
    expect(tipoRealDosBytes(texto.encode("O livro azul está na gaveta"))).toBeNull();
    expect(tipoRealDosBytes(texto.encode("<!doctype html><script>"))).toBeNull();
    expect(tipoRealDosBytes(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))).toBeNull();
  });

  it("recusa um ficheiro curto de mais para ter assinatura", () => {
    expect(tipoRealDosBytes(new Uint8Array([]))).toBeNull();
    expect(tipoRealDosBytes(new Uint8Array([0x25, 0x50]))).toBeNull();
    // `RIFF` sozinho não chega: o `WEBP` está no offset 8.
    expect(tipoRealDosBytes(new Uint8Array([0x52, 0x49, 0x46, 0x46]))).toBeNull();
  });

  it("recusa um `%PDF-` que não está no princípio do ficheiro", () => {
    // O caso concreto: um JPEG com `%PDF-` escrito num comentário EXIF. Alguns
    // leitores procuram o cabeçalho no primeiro kilobyte; aqui isso seria um
    // buraco, porque o comentário escreve-o quem quiser.
    const jpegComIsco = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10, 0x25, 0x50, 0x44, 0x46, 0x2d, 0x31,
    ]);
    expect(tipoRealDosBytes(jpegComIsco)).toBe("image/jpeg");

    const lixoAntesDoPdf = new Uint8Array([0x00, 0x00, 0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(tipoRealDosBytes(lixoAntesDoPdf)).toBeNull();
  });

  it("doze bytes chegam para decidir os quatro", () => {
    expect(BYTES_DE_ASSINATURA).toBe(12);
    for (const amostra of [PDF, JPEG, PNG, WEBP]) {
      expect(tipoRealDosBytes(amostra.slice(0, BYTES_DE_ASSINATURA))).not.toBeNull();
    }
  });
});

describe("avaliarTipo — o declarado nunca decide", () => {
  it("manda o real mesmo quando o cliente declara outro dos quatro", () => {
    const veredicto = avaliarTipo(PNG, "application/pdf");
    expect(veredicto.real).toBe("image/png");
    expect(veredicto.discordancia).toBe(true);
  });

  it("não há discordância quando os dois concordam", () => {
    expect(avaliarTipo(PDF, "application/pdf").discordancia).toBe(false);
  });

  it("não há discordância quando o declarado nem sequer é um dos quatro", () => {
    // `application/octet-stream` é o que um cliente manda quando não sabe. Não
    // são duas afirmações a discordar, é uma só — e chamar-lhe fraude seria
    // levantar a mão a quem não fez nada.
    const veredicto = avaliarTipo(PDF, "application/octet-stream");
    expect(veredicto.real).toBe("application/pdf");
    expect(veredicto.discordancia).toBe(false);
  });

  it("não há discordância quando o cliente não declara nada", () => {
    expect(avaliarTipo(PDF, "").discordancia).toBe(false);
    expect(avaliarTipo(PDF, null).discordancia).toBe(false);
    expect(avaliarTipo(PDF, undefined).discordancia).toBe(false);
  });

  it("o declarado é normalizado antes de se comparar", () => {
    expect(avaliarTipo(PDF, "APPLICATION/PDF; charset=binary").discordancia).toBe(false);
    expect(avaliarTipo(PDF, "  Image/PNG  ").discordancia).toBe(true);
  });

  it("um ficheiro que não é nenhum dos quatro não produz discordância nenhuma", () => {
    // Não é preciso: a recusa já acontece, e um aviso a mais no registo é ruído
    // sobre um caso que já foi tratado.
    const veredicto = avaliarTipo(new TextEncoder().encode("nada"), "application/pdf");
    expect(veredicto.real).toBeNull();
    expect(veredicto.discordancia).toBe(false);
  });
});

describe("a mensagem de recusa diz o que se aceita", () => {
  it("nomeia os quatro formatos", () => {
    for (const formato of ["PDF", "JPEG", "PNG", "WebP"]) {
      expect(FORMATOS_ACEITES).toContain(formato);
    }
  });
});
