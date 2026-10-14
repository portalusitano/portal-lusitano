import { describe, it, expect } from "vitest";
import {
  MAX_MENSAGEM,
  nomeOutraParte,
  resumirMensagem,
  validarMensagem,
} from "@/lib/marketplace-chat";
import { MAX_NOME } from "@/lib/perfil/contrato";

describe("validarMensagem", () => {
  it("aceita e apara uma mensagem normal", () => {
    expect(validarMensagem("  Bom dia, ainda está disponível?  ")).toEqual({
      corpo: "Bom dia, ainda está disponível?",
    });
  });

  it("recusa uma mensagem vazia", () => {
    expect(validarMensagem("")).toEqual({ erro: "A mensagem não pode estar vazia" });
  });

  it("recusa uma mensagem só com espaços, que a base de dados também recusaria", () => {
    expect(validarMensagem("   \n\t  ")).toEqual({ erro: "A mensagem não pode estar vazia" });
  });

  it("recusa o que não é texto", () => {
    expect(validarMensagem(null)).toEqual({ erro: "Mensagem inválida" });
    expect(validarMensagem(42)).toEqual({ erro: "Mensagem inválida" });
    expect(validarMensagem({ corpo: "olá" })).toEqual({ erro: "Mensagem inválida" });
  });

  it("aceita exactamente no limite", () => {
    const resultado = validarMensagem("a".repeat(MAX_MENSAGEM));
    expect("corpo" in resultado).toBe(true);
  });

  it("recusa acima do limite", () => {
    const resultado = validarMensagem("a".repeat(MAX_MENSAGEM + 1));
    expect("erro" in resultado).toBe(true);
  });

  it("mede o limite depois de aparar, para espaços não gastarem a quota", () => {
    const resultado = validarMensagem(`  ${"a".repeat(MAX_MENSAGEM)}  `);
    expect("corpo" in resultado).toBe(true);
  });
});

describe("resumirMensagem", () => {
  it("devolve null quando não há mensagem", () => {
    expect(resumirMensagem(null)).toBeNull();
    expect(resumirMensagem(undefined)).toBeNull();
    expect(resumirMensagem("")).toBeNull();
  });

  it("deixa uma mensagem curta intacta", () => {
    expect(resumirMensagem("Ainda está disponível?")).toBe("Ainda está disponível?");
  });

  it("colapsa quebras de linha para a pré-visualização caber numa linha", () => {
    expect(resumirMensagem("Bom dia.\n\nTenho    interesse.")).toBe("Bom dia. Tenho interesse.");
  });

  it("trunca uma mensagem longa e assinala com reticências", () => {
    const resumo = resumirMensagem("palavra ".repeat(50));
    expect(resumo).not.toBeNull();
    expect(resumo!.endsWith("…")).toBe(true);
    expect(resumo!.length).toBeLessThanOrEqual(121);
  });

  it("não parte a meio de uma palavra quando há um espaço aproveitável", () => {
    const resumo = resumirMensagem("palavra ".repeat(50))!;
    expect(resumo.slice(0, -1).endsWith("palavra")).toBe(true);
  });

  it("trunca à força quando uma única palavra ocupa toda a pré-visualização", () => {
    const resumo = resumirMensagem("a".repeat(300))!;
    expect(resumo).toBe("a".repeat(120) + "…");
  });
});

describe("nomeOutraParte", () => {
  it("mostra o vendedor a quem está a comprar", () => {
    expect(nomeOutraParte("comprador", "João Comprador", "Coudelaria Veiga")).toBe(
      "Coudelaria Veiga"
    );
  });

  it("mostra o comprador a quem está a vender", () => {
    expect(nomeOutraParte("vendedor", "João Comprador", "Coudelaria Veiga")).toBe("João Comprador");
  });

  it("recorre a um rótulo neutro quando o nome falta", () => {
    expect(nomeOutraParte("comprador", null, null)).toBe("Vendedor");
    expect(nomeOutraParte("vendedor", null, null)).toBe("Comprador interessado");
  });

  it("trata um nome só com espaços como ausente", () => {
    expect(nomeOutraParte("vendedor", "   ", null)).toBe("Comprador interessado");
  });

  /**
   * ── O nome da outra parte não parte a linha nem a inverte ────────────────
   *
   * O `comprador_nome` é uma cópia do `user_metadata.full_name`, que é texto em
   * cru do formulário de registo, e o `vendedor_nome` vem do anúncio. Os dois
   * chegam à caixa de entrada de outra pessoa e ao corpo do email de aviso.
   *
   * O `limparNome` do `lib/perfil/contrato` já existia com esta razão escrita —
   * estava aplicado ao nome do perfil e a mais nada. O `escapeHtml` do email
   * não cobre isto: o U+202E não é HTML, é uma letra que manda no sentido da
   * linha.
   */
  it("tira o que parte uma linha ou inverte a leitura", () => {
    expect(nomeOutraParte("vendedor", "Ana\nSilva", null)).toBe("Ana Silva");
    expect(nomeOutraParte("comprador", null, "Coudelaria\r\nVeiga")).toBe("Coudelaria Veiga");

    // U+202E: a partir dali a linha lê-se ao contrário.
    expect(nomeOutraParte("vendedor", "Ana‮Silva", null)).toBe("Ana Silva");
    expect(nomeOutraParte("comprador", null, "‮Veiga")).toBe("Veiga");

    // E um nome que só tem caracteres de controlo é um nome ausente.
    expect(nomeOutraParte("vendedor", "‮‎\n\t", null)).toBe("Comprador interessado");
  });

  it("corta pelo mesmo tecto do nome do perfil", () => {
    /* Um segundo número aqui deixaria um nome passar num sítio e ser cortado no
       outro — é a razão escrita no `MAX_NOME`. */
    const longo = "Maria ".repeat(60);
    expect(nomeOutraParte("vendedor", longo, null).length).toBeLessThanOrEqual(MAX_NOME);
  });
});
