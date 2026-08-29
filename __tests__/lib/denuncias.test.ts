import { describe, it, expect } from "vitest";
import { MOTIVOS_DENUNCIA, motivoValido, rotuloMotivo } from "@/lib/denuncias";

describe("motivoValido", () => {
  it("aceita todos os motivos oferecidos na interface", () => {
    for (const m of MOTIVOS_DENUNCIA) {
      expect(motivoValido(m.id)).toBe(true);
    }
  });

  it("recusa um motivo inventado, que a CHECK da tabela também recusaria", () => {
    expect(motivoValido("motivo-inventado")).toBe(false);
  });

  it("recusa o que não é texto", () => {
    expect(motivoValido(null)).toBe(false);
    expect(motivoValido(undefined)).toBe(false);
    expect(motivoValido(7)).toBe(false);
    expect(motivoValido({ id: "fraude" })).toBe(false);
  });

  it("é sensível a maiúsculas, tal como a CHECK", () => {
    expect(motivoValido("FRAUDE")).toBe(false);
  });
});

describe("rotuloMotivo", () => {
  it("traduz um motivo conhecido", () => {
    expect(rotuloMotivo("fraude")).toBe("Suspeita de fraude ou burla");
    expect(rotuloMotivo("ja_vendido")).toBe("O cavalo já foi vendido");
  });

  it("devolve o próprio valor quando o motivo é desconhecido, para a fila de moderação nunca ficar em branco", () => {
    expect(rotuloMotivo("motivo_futuro")).toBe("motivo_futuro");
  });
});
