/**
 * As palavras com que se diz ao vendedor em que ponto está o documento dele.
 *
 * Estes testes são a guarda contra a falha que motivou o trabalho todo: um
 * visto verde a afirmar uma verificação que ninguém tinha feito. A forma de
 * essa falha voltar não é alguém escrever `estado = "verificado"` — isso vê-se
 * — é alguém achar que «Em análise» soa melhor do que «Ainda não foi revisto»,
 * e mudar uma frase.
 *
 * Por isso o que se afirma aqui não é o texto exacto (esse pode melhorar) mas
 * o que ele **não pode** conter: uma verificação que não aconteceu, trabalho
 * que ninguém começou, e um prazo que ninguém cumpre.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase-admin", () => {
  const duplo = { from: vi.fn(), storage: { from: vi.fn() } };
  return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
});

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  PALAVRAS_DO_ESTADO,
  marcarSubstituidos,
  paraOVendedor,
  type DocumentoDoVendedor,
} from "@/lib/documentos-do-vendedor";
import { ESTADOS_DE_DOCUMENTO } from "@/lib/documentos/contrato";

const CAVALO = "aaaaaaaa-0000-4000-8000-000000000001";

function linha(extra: Record<string, unknown> = {}) {
  return {
    id: "11111111-2222-4333-8444-555555555555",
    cavalo_id: CAVALO,
    tipo: "livro_azul",
    estado: "por_verificar",
    motivo_recusa: null,
    nome_original: "livro azul.pdf",
    mime: "application/pdf",
    bytes: 2048,
    criado_em: "2026-09-01T10:00:00.000Z",
    verificado_em: null,
    ...extra,
  };
}

describe("as quatro frases", () => {
  it("tem uma frase para cada estado do contrato, e nenhuma a mais", () => {
    expect(Object.keys(PALAVRAS_DO_ESTADO).sort()).toEqual([...ESTADOS_DE_DOCUMENTO].sort());
  });

  it("só o verificado leva marca positiva", () => {
    const bons = ESTADOS_DE_DOCUMENTO.filter((e) => PALAVRAS_DO_ESTADO[e].tom === "bom");
    expect(bons).toEqual(["verificado"]);
  });

  it("o que chegou e ninguém viu é neutro, não bom", () => {
    expect(PALAVRAS_DO_ESTADO.por_verificar.tom).toBe("neutro");
    expect(PALAVRAS_DO_ESTADO.em_revisao.tom).toBe("neutro");
  });

  it("«recebido» não se diz «em análise»: ninguém lhe pegou", () => {
    const texto = (
      PALAVRAS_DO_ESTADO.por_verificar.titulo +
      " " +
      PALAVRAS_DO_ESTADO.por_verificar.explicacao
    ).toLowerCase();
    expect(texto).toContain("recebido");
    expect(texto).not.toContain("análise");
    expect(texto).not.toContain("analise");
    expect(texto).not.toContain("verificado");
    expect(texto).not.toContain("aprovado");
  });

  it("nenhuma frase promete um prazo", () => {
    // Não há fila com prazo e não há nada que a percorra sozinha. Um prazo
    // escrito aqui é um compromisso que ninguém está a cumprir.
    const proibidas = [
      /\d+\s*h/i,
      /hora/i,
      /\bdias?\b/i,
      /\búteis\b/i,
      /até\s+\d/i,
      /prazo/i,
      /brevemente/i,
      /em breve/i,
    ];
    for (const estado of ESTADOS_DE_DOCUMENTO) {
      const texto = `${PALAVRAS_DO_ESTADO[estado].titulo} ${PALAVRAS_DO_ESTADO[estado].explicacao}`;
      for (const padrao of proibidas) {
        expect(padrao.test(texto), `${estado}: «${texto}» contra ${padrao}`).toBe(false);
      }
    }
  });

  it("a recusa não explica sozinha: quem explica é o motivo escrito", () => {
    expect(PALAVRAS_DO_ESTADO.recusado.tom).toBe("mau");
    expect(PALAVRAS_DO_ESTADO.recusado.explicacao.toLowerCase()).toContain("enviar outro");
  });
});

describe("o que sai da linha para o vendedor", () => {
  it("não traz o caminho no balde, nem o sha, nem a leitura automática", () => {
    const d = paraOVendedor(
      linha({
        caminho: "ref/livro_azul/abc.pdf",
        sha256: "a".repeat(64),
        leitura: { texto: "coisas", origem: "pdf" },
        conflitos: [{ campo: "microchip", noFormulario: "1", noDocumento: "2" }],
        verificado_por: "revisor@portal-lusitano.pt",
      })
    );
    expect(d).not.toBeNull();
    const chaves = Object.keys(d!);
    for (const proibida of [
      "caminho",
      "sha256",
      "leitura",
      "conflitos",
      "verificado_por",
      "verificadoPor",
      "referencia",
    ]) {
      expect(chaves).not.toContain(proibida);
    }
  });

  it("o motivo da recusa só aparece quando o estado é recusado", () => {
    // Uma recusa que alguém reabriu deixa o motivo antigo na coluna; esse
    // motivo já não é verdade sobre o estado actual.
    const reaberto = paraOVendedor(
      linha({ estado: "em_revisao", motivo_recusa: "falta a página do meio" })
    );
    expect(reaberto?.motivoRecusa).toBeNull();

    const recusado = paraOVendedor(
      linha({ estado: "recusado", motivo_recusa: "falta a página do meio" })
    );
    expect(recusado?.motivoRecusa).toBe("falta a página do meio");
  });

  it("uma linha com um estado que este código não sabe ler é deitada fora, não adivinhada", () => {
    expect(paraOVendedor(linha({ estado: "quase_verificado" }))).toBeNull();
    expect(paraOVendedor(linha({ tipo: "certidao_de_nascimento" }))).toBeNull();
    expect(paraOVendedor(linha({ mime: "application/x-msdownload" }))).toBeNull();
  });

  it("uma linha sem anúncio não tem dono, e não sai", () => {
    expect(paraOVendedor(linha({ cavalo_id: null }))).toBeNull();
  });
});

describe("quem já foi substituído", () => {
  const base = (extra: Partial<DocumentoDoVendedor>): DocumentoDoVendedor => ({
    id: "x",
    anuncioId: CAVALO,
    tipo: "livro_azul",
    nomeDoTipo: "Livro Azul",
    estado: "recusado",
    criadoEm: "2026-09-01T10:00:00.000Z",
    decididoEm: null,
    motivoRecusa: "ilegível",
    nomeOriginal: "a.pdf",
    mime: "application/pdf",
    bytes: 10,
    substituido: false,
    ...extra,
  });

  it("marca as recusas antigas e deixa a mais recente por marcar", () => {
    const marcados = marcarSubstituidos([
      base({ id: "velho", criadoEm: "2026-09-01T10:00:00.000Z" }),
      base({ id: "novo", criadoEm: "2026-09-03T10:00:00.000Z", estado: "por_verificar" }),
    ]);
    expect(marcados.find((d) => d.id === "velho")?.substituido).toBe(true);
    expect(marcados.find((d) => d.id === "novo")?.substituido).toBe(false);
  });

  it("não confunde tipos diferentes nem anúncios diferentes", () => {
    const marcados = marcarSubstituidos([
      base({ id: "livro", tipo: "livro_azul", criadoEm: "2026-09-01T10:00:00.000Z" }),
      base({ id: "passe", tipo: "passaporte", criadoEm: "2026-09-05T10:00:00.000Z" }),
      base({
        id: "outro-anuncio",
        anuncioId: "bbbbbbbb-0000-4000-8000-000000000002",
        criadoEm: "2026-09-09T10:00:00.000Z",
      }),
    ]);
    expect(marcados.every((d) => d.substituido === false)).toBe(true);
  });

  it("a ordem é a das datas e não a da lista", () => {
    const marcados = marcarSubstituidos([
      base({ id: "novo", criadoEm: "2026-09-09T10:00:00.000Z" }),
      base({ id: "velho", criadoEm: "2026-09-01T10:00:00.000Z" }),
    ]);
    expect(marcados.find((d) => d.id === "velho")?.substituido).toBe(true);
    expect(marcados.find((d) => d.id === "novo")?.substituido).toBe(false);
  });
});
