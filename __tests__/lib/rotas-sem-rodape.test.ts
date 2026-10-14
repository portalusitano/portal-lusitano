import { describe, it, expect } from "vitest";
import { eRotaSemRodape } from "@/lib/rotas-sem-rodape";

describe("eRotaSemRodape", () => {
  it("tira o rodapé do mapa, nas três línguas", () => {
    for (const c of ["/mapa", "/en/mapa", "/es/mapa"]) {
      expect(eRotaSemRodape(c), c).toBe(true);
    }
  });

  it("continua a tirá-lo das páginas de entrada", () => {
    for (const c of ["/login", "/registar", "/recuperar-senha", "/en/login"]) {
      expect(eRotaSemRodape(c), c).toBe(true);
    }
  });

  // O rodapé é o índice do site: tirá-lo de uma página a mais é tirar a
  // única porta para as devoluções, a privacidade e o Livro de Reclamações.
  it("não o tira de mais lado nenhum", () => {
    for (const c of [
      "/",
      "/mapas",
      "/mapa-do-site",
      "/directorio",
      "/directorio/alter-real",
      "/comprar",
      "/vender-cavalo",
      "/minha-conta/mensagens",
      "/en",
      "/es/directorio",
    ]) {
      expect(eRotaSemRodape(c), c).toBe(false);
    }
  });

  it("aguenta um caminho nulo", () => {
    expect(eRotaSemRodape(null)).toBe(false);
  });
});
