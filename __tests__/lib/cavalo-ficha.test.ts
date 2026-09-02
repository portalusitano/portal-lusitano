import { describe, it, expect } from "vitest";
import { normalizarLinhaDoCavalo, NOMES_DA_FICHA } from "@/lib/cavalo-ficha";

/**
 * A ficha do cavalo lia seis colunas com o nome errado, e três delas eram as do
 * contacto do vendedor. `select("*")` não dá erro por isso: a chave que não
 * existe lê-se como `undefined`, o `&&` do JSX apaga o bloco, e a página fica a
 * faltar um pedaço sem que nada se queixe.
 *
 * É o mesmo defeito do `formData.linhagem` contra `linhagemPrincipal`. Saía
 * mais caro: sem `contacto_nome`, `contacto_telefone` e `contacto_email` não se
 * desenhava o nome do vendedor, nem o botão de telefone, nem o de WhatsApp, e o
 * `mailto:` caía para o endereço genérico do site.
 */

/** Uma linha como a base a devolve hoje, com os nomes que ela tem. */
function linhaDaBase() {
  return {
    id: "abc",
    nome: "Ulisses",
    foto_principal: "https://exemplo.pt/ulisses.jpg",
    cor: "Ruço",
    nivel_treino: "Avançado",
    vendedor_nome: "Ana Martins",
    vendedor_email: "ana@exemplo.pt",
    vendedor_telefone: "912345678",
    preco: 12000,
  };
}

describe("normalizarLinhaDoCavalo", () => {
  it("traduz os seis nomes que a ficha lê", () => {
    const c = normalizarLinhaDoCavalo(linhaDaBase());
    expect(c.nome_cavalo).toBe("Ulisses");
    expect(c.image_url).toBe("https://exemplo.pt/ulisses.jpg");
    expect(c.pelagem).toBe("Ruço");
    expect(c.nivel).toBe("Avançado");
  });

  it("o contacto do vendedor deixa de desaparecer da ficha", () => {
    // O bloco que estava apagado em todos os anúncios: era `contacto_*` que a
    // página lia e `vendedor_*` que a base tem.
    const c = normalizarLinhaDoCavalo(linhaDaBase());
    expect(c.contacto_nome).toBe("Ana Martins");
    expect(c.contacto_email).toBe("ana@exemplo.pt");
    expect(c.contacto_telefone).toBe("912345678");
  });

  it("não tira nada do que já estava na linha", () => {
    const c = normalizarLinhaDoCavalo(linhaDaBase());
    expect(c.id).toBe("abc");
    expect(c.preco).toBe(12000);
    // Os nomes da base ficam, para quem os leia directamente.
    expect((c as Record<string, unknown>).vendedor_nome).toBe("Ana Martins");
  });

  it("o nome antigo ganha quando existe, para uma base futura o poder ter", () => {
    const c = normalizarLinhaDoCavalo({
      ...linhaDaBase(),
      contacto_nome: "Nome directo",
      nome_cavalo: "Nome directo do cavalo",
    });
    expect(c.contacto_nome).toBe("Nome directo");
    expect(c.nome_cavalo).toBe("Nome directo do cavalo");
  });

  it("uma string vazia não vale como resposta e cai para o nome seguinte", () => {
    const c = normalizarLinhaDoCavalo({ ...linhaDaBase(), contacto_nome: "", nome_cavalo: "  " });
    expect(c.contacto_nome).toBe("Ana Martins");
    expect(c.nome_cavalo).toBe("Ulisses");
  });

  it("sem nenhum dos dois nomes a chave fica `null` e o bloco não se desenha", () => {
    // Melhor um bloco que não aparece do que um bloco a dizer «undefined».
    const c = normalizarLinhaDoCavalo({ id: "abc" });
    for (const chave of Object.keys(NOMES_DA_FICHA)) {
      expect((c as Record<string, unknown>)[chave], chave).toBeNull();
    }
  });

  it("um número numa coluna de texto não se perde", () => {
    const c = normalizarLinhaDoCavalo({ vendedor_telefone: 912345678 });
    expect(c.contacto_telefone).toBe("912345678");
  });

  it("cada par tem o nome que a página lê à cabeça", () => {
    // A ordem é o contrato: primeiro o nome que `lib/database.types.ts` ainda
    // declara, depois o que a base tem hoje. Trocá-la mudava qual dos dois
    // ganha quando existem os dois.
    for (const [destino, nomes] of Object.entries(NOMES_DA_FICHA)) {
      expect(nomes[0], destino).toBe(destino);
      expect(nomes[1], destino).not.toBe(destino);
    }
  });
});
