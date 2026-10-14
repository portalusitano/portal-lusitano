import { describe, expect, it } from "vitest";
import {
  ACEITA,
  formatarBytes,
  LADO_MINIMO,
  MAX_BYTES,
  MAX_PIXEIS,
  TIPOS_ACEITES,
  validarDimensoes,
  validarFicheiro,
} from "@/components/perfil/ficheiro";

const f = (type: string, size: number, name = "foto") => ({ type, size, name });

describe("validarFicheiro", () => {
  it("aceita os formatos que um browser sabe desenhar num canvas", () => {
    for (const tipo of TIPOS_ACEITES) {
      expect(validarFicheiro(f(tipo, 1024)).ok).toBe(true);
    }
  });

  it("recusa o que não é imagem, pelo tipo e não pela extensão", () => {
    // Um PDF renomeado para `.jpg` tem `type: "application/pdf"`, e é o browser
    // quem sabe.
    const v = validarFicheiro(f("application/pdf", 1024, "retrato.jpg"));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.codigo).toBe("tipo");
  });

  it("recusa o HEIC com uma frase, e não com uma falha a meio do recorte", () => {
    const v = validarFicheiro(f("image/heic", 3_000_000, "IMG_0042.HEIC"));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.codigo).toBe("tipo");
  });

  it("recusa um ficheiro vazio", () => {
    const v = validarFicheiro(f("image/jpeg", 0));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.codigo).toBe("vazio");
  });

  it("recusa acima do tecto e diz o tamanho na frase", () => {
    const v = validarFicheiro(f("image/jpeg", MAX_BYTES + 1));
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.codigo).toBe("grande-demais");
      expect(v.detalhe).toMatch(/MB/);
    }
  });

  it("uma fotografia de telemóvel de 12MP passa à entrada", () => {
    // ~4 MB de JPEG. O que a pode travar é o tecto de pixéis, não o de bytes.
    expect(validarFicheiro(f("image/jpeg", 4_000_000)).ok).toBe(true);
  });

  it("o `accept` do input anuncia exactamente o que se aceita", () => {
    expect(ACEITA.split(",")).toEqual([...TIPOS_ACEITES]);
  });
});

describe("validarDimensoes", () => {
  it("12MP passa", () => {
    expect(validarDimensoes(4032, 3024).ok).toBe(true);
  });

  it("um panorama de 200MP não passa: descodificado seriam 800 MB", () => {
    const v = validarDimensoes(20000, 10000);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.codigo).toBe("pixeis-demais");
    expect(20000 * 10000).toBeGreaterThan(MAX_PIXEIS);
  });

  it("uma fotografia pequena de mais dá uma frase, não um retrato borratado", () => {
    const v = validarDimensoes(LADO_MINIMO - 1, 400);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.codigo).toBe("pequena-demais");
  });

  it("dimensões impossíveis dizem que a fotografia é ilegível", () => {
    for (const [w, h] of [
      [0, 0],
      [-1, 100],
      [Number.NaN, 100],
    ]) {
      const v = validarDimensoes(w, h);
      expect(v.ok).toBe(false);
      if (!v.ok) expect(v.codigo).toBe("ilegivel");
    }
  });
});

describe("formatarBytes", () => {
  it("escreve em português, com vírgula decimal", () => {
    expect(formatarBytes(900)).toBe("900 B");
    expect(formatarBytes(2048)).toBe("2 KB");
    expect(formatarBytes(5_100_000)).toBe("4,9 MB");
  });
});
