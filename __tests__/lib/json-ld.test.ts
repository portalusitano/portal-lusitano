import { describe, it, expect } from "vitest";
import { serializarJsonLd } from "@/lib/json-ld";

/**
 * O que estes testes guardam é uma fronteira, não uma função: o JSON-LD sai
 * daqui para dentro de um `<script type="application/ld+json">`, e os valores
 * que o compõem — nome de coudelaria, descrição de anúncio — são escritos por
 * quem se regista no site.
 */
describe("serializarJsonLd", () => {
  const CARGA = "</script><script>alert(1)</script>";

  it("não deixa passar `</script` quando o valor vem de quem publica", () => {
    const saida = serializarJsonLd({ "@type": "Organization", name: CARGA });

    // A prova é esta: o analisador de HTML do browser fecha o bloco na
    // primeira ocorrência de `</script`, sem olhar a aspas nem a JSON.
    expect(saida).not.toContain("</script");
    expect(saida).not.toContain("<");
  });

  it("é este o defeito que evita — o `JSON.stringify` cru deixa passar", () => {
    // Guarda contra a "correcção" mais provável: alguém voltar a pôr
    // `JSON.stringify` por achar que a função não faz nada de especial.
    expect(JSON.stringify({ name: CARGA })).toContain("</script>");
  });

  it("escapa `>` e `&` além de `<`", () => {
    const saida = serializarJsonLd({ a: "<", b: ">", c: "&" });
    expect(saida).toContain("\\u003c");
    expect(saida).toContain("\\u003e");
    expect(saida).toContain("\\u0026");
  });

  it("escapa os separadores U+2028 e U+2029, que partem um script ao meio", () => {
    const saida = serializarJsonLd({ a: String.fromCharCode(0x2028, 0x2029) });
    expect(saida).toContain("\\u2028");
    expect(saida).toContain("\\u2029");
    expect(saida).not.toContain(String.fromCharCode(0x2028));
    expect(saida).not.toContain(String.fromCharCode(0x2029));
  });

  it("não altera os dados: o que o Google lê é o que lá foi posto", () => {
    // Um escape de escape era pior do que o defeito — os dados estruturados
    // deixariam de descrever a página. `\uXXXX` dentro de uma string JSON é o
    // mesmo carácter, e é isso que este teste fixa.
    const dados = {
      "@context": "https://schema.org",
      name: CARGA,
      description: `Cavalo & companhia < > ${String.fromCharCode(0x2028)}fim`,
      preco: 4900,
      aninhado: { lista: ["<a>", "&amp;"] },
    };

    expect(JSON.parse(serializarJsonLd(dados))).toEqual(dados);
  });

  it("aguenta os tipos que o JSON.stringify já tratava", () => {
    expect(serializarJsonLd(null)).toBe("null");
    expect(serializarJsonLd(["a", 1, true])).toBe('["a",1,true]');
  });
});
