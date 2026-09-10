import { describe, it, expect } from "vitest";
import { distanciaEdicao, sugerirDominioEmail } from "@/lib/dominios-email";

describe("distância de edição", () => {
  it("a troca de duas letras vizinhas conta um passo, não dois", () => {
    // É a razão de ser da Damerau-Levenshtein aqui: `gmial` é `gmail` com duas
    // letras trocadas, que é o erro mais comum de quem escreve depressa. Com a
    // Levenshtein simples valeria 2 — o mesmo que uma palavra diferente.
    expect(distanciaEdicao("gmial", "gmail")).toBe(1);
    expect(distanciaEdicao("gmxil", "gmail")).toBe(1);
    expect(distanciaEdicao("gmxyl", "gmail")).toBe(2);
  });

  it("casos de fronteira", () => {
    expect(distanciaEdicao("", "")).toBe(0);
    expect(distanciaEdicao("", "abc")).toBe(3);
    expect(distanciaEdicao("abc", "")).toBe(3);
    expect(distanciaEdicao("abc", "abc")).toBe(0);
  });
});

describe("gralha no domínio do email", () => {
  it("apanha as gralhas clássicas", () => {
    expect(sugerirDominioEmail("maria@gmial.com")?.sugerido).toBe("gmail.com");
    expect(sugerirDominioEmail("maria@gmail.co")?.sugerido).toBe("gmail.com");
    expect(sugerirDominioEmail("maria@hotmial.com")?.sugerido).toBe("hotmail.com");
    expect(sugerirDominioEmail("maria@sapo.ot")?.sugerido).toBe("sapo.pt");
  });

  it("devolve o endereço já corrigido, que é o que o botão escreve", () => {
    expect(sugerirDominioEmail("maria.silva@gmial.com")?.emailCorrigido).toBe(
      "maria.silva@gmail.com"
    );
  });

  it("um domínio correcto não recebe sugestão nenhuma", () => {
    for (const email of [
      "maria@gmail.com",
      "maria@sapo.pt",
      "maria@outlook.com",
      "maria@icloud.com",
    ]) {
      expect(sugerirDominioEmail(email)).toBeNull();
    }
  });

  it("um domínio raro é legítimo e fica em paz", () => {
    // É a regra que manda: um domínio raro é de quem o tem, e sugerir-lhe
    // outra coisa é o computador a corrigir quem está certo.
    for (const email of [
      "maria@quinta-do-vale.pt",
      "geral@coudelariaalter.pt",
      "info@lusitano-horse.example",
    ]) {
      expect(sugerirDominioEmail(email)).toBeNull();
    }
  });

  it("as variantes regionais dos grandes não se corrigem", () => {
    // `hotmail.es` está a dois passos de `hotmail.com` e é perfeitamente real.
    for (const email of [
      "maria@hotmail.es",
      "maria@yahoo.co.uk",
      "maria@outlook.pt",
      "maria@live.com.pt",
    ]) {
      expect(sugerirDominioEmail(email)).toBeNull();
    }
  });

  it("nunca recusa — o resultado é sempre uma sugestão ou nada", () => {
    const s = sugerirDominioEmail("maria@gmial.com");
    expect(s).not.toBeNull();
    expect(s).toHaveProperty("sugerido");
    expect(s).toHaveProperty("emailCorrigido");
  });

  it("um endereço meio escrito não dá sugestão nem excepção", () => {
    for (const email of ["", "maria", "maria@", "@gmail.com", "maria@semponto"]) {
      expect(sugerirDominioEmail(email)).toBeNull();
    }
  });
});
