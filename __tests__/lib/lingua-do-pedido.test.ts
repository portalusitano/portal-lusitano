import { describe, it, expect } from "vitest";
import { linguaDoPedido } from "@/lib/lingua-do-pedido";

describe("linguaDoPedido", () => {
  /* O caso que estava a partir o site: o browser de um português manda o
     inglês como recurso, e o código antigo — que procurava «en» em qualquer
     parte do cabeçalho — servia-lhe o site em inglês. */
  it("um browser português continua em português, mesmo com inglês na lista", () => {
    expect(linguaDoPedido("pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7")).toBe("pt");
    expect(linguaDoPedido("pt-BR,pt;q=0.9,en;q=0.8")).toBe("pt");
    expect(linguaDoPedido("pt")).toBe("pt");
  });

  it("respeita quem quer mesmo inglês ou espanhol", () => {
    expect(linguaDoPedido("en-US,en;q=0.9,pt;q=0.8")).toBe("en");
    expect(linguaDoPedido("es-ES,es;q=0.9,en;q=0.8")).toBe("es");
    expect(linguaDoPedido("en-GB")).toBe("en");
  });

  it("manda o peso, não a ordem", () => {
    // O inglês vem primeiro mas vale menos.
    expect(linguaDoPedido("en;q=0.3,pt;q=0.9")).toBe("pt");
    expect(linguaDoPedido("pt;q=0.2,es;q=0.8")).toBe("es");
  });

  it("empate resolve-se por quem vem primeiro", () => {
    expect(linguaDoPedido("es,en")).toBe("es");
    expect(linguaDoPedido("en,es")).toBe("en");
  });

  it("q=0 é uma recusa, não um empate fraco", () => {
    expect(linguaDoPedido("en;q=0,es;q=0.5")).toBe("es");
    expect(linguaDoPedido("en;q=0")).toBe("pt");
  });

  it("línguas que não servimos são ignoradas", () => {
    expect(linguaDoPedido("fr-FR,fr;q=0.9,de;q=0.8")).toBe("pt");
    expect(linguaDoPedido("fr;q=0.9,en;q=0.4")).toBe("en");
  });

  it("«qualquer uma» fica com a língua da casa", () => {
    expect(linguaDoPedido("*")).toBe("pt");
    expect(linguaDoPedido("fr,*;q=0.5")).toBe("pt");
  });

  it("aguenta o que não é um cabeçalho", () => {
    expect(linguaDoPedido("")).toBe("pt");
    expect(linguaDoPedido(null)).toBe("pt");
    expect(linguaDoPedido(undefined)).toBe("pt");
    expect(linguaDoPedido("lixo;;;q=abc")).toBe("pt");
  });
});
