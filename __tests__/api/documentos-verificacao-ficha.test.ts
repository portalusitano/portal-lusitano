/**
 * A recolha: o que a ficha vai buscar à base antes de reunir os cinco motores.
 *
 * O teste da ficha (`documentos-admin-ficha`) prova as duas colunas da
 * comparação, e o duplo que ele usa não conhece o `or` do PostgREST — a rota
 * apanha esse erro e continua a mostrar-se, que é o comportamento certo, mas
 * quer dizer que **a recolha não fica provada por lá**. Fica por aqui.
 *
 * O que se prova é a costura, não os motores: cada um deles tem os seus testes.
 * A pergunta a que este ficheiro responde é se as linhas certas chegam ao sítio
 * certo — e sobretudo se as contradições se calculam contra o anúncio de hoje
 * em vez de se lerem de uma coluna que foi escrita antes de o anúncio existir.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase-admin", () => {
  const duplo = {
    from: (...args: unknown[]) => mockFrom(...args),
    storage: { from: () => ({ download: vi.fn() }) },
  };
  return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
});

vi.mock("@/lib/auth", () => ({ verifySession: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { recolherVerificacao } from "@/app/api/admin/documentos/comum";
import { reunirForense } from "@/lib/documentos/forense";

import { esqueleto, montarPdfComRemate } from "../lib/documentos-forense-ficheiros";

const DOC = "11111111-2222-4333-8444-555555555555";
const REFERENCIA = "3f7c1e2a-0000-4000-8000-000000000001";
const SHA = "f".repeat(64);

/**
 * Um duplo que percebe `or`, `eq` e `limit` — os três que a recolha usa.
 *
 * Cada método devolve o próprio objecto e o objecto é «thenable», que é como o
 * supabase-js se comporta: a consulta resolve-se quando alguém lhe faz `await`,
 * seja qual for o número de filtros pelo caminho.
 */
function porTabela(dados: Record<string, unknown[]>) {
  mockFrom.mockReset();
  mockFrom.mockImplementation((tabela: string) => {
    const c: Record<string, unknown> = {};
    const proprio = () => c;
    c.select = vi.fn(proprio);
    c.eq = vi.fn(proprio);
    c.neq = vi.fn(proprio);
    c.in = vi.fn(proprio);
    c.or = vi.fn(proprio);
    c.limit = vi.fn(proprio);
    c.then = (ok: (v: unknown) => void, mal?: (e: unknown) => void) =>
      Promise.resolve({ data: dados[tabela] ?? [], error: null }).then(ok, mal);
    return c;
  });
}

/** Uma linha de `documentos_cavalo` como ela sai da base. */
function documento(extra: Record<string, unknown> = {}) {
  return {
    id: DOC,
    cavalo_id: null,
    referencia: REFERENCIA,
    tipo: "livro_azul",
    estado: "por_verificar",
    sha256: SHA,
    leitura: null,
    conflitos: null,
    forense: null,
    ...extra,
  };
}

const LEITURA_DO_PDF = {
  origem: "pdf",
  microchip: "620015004471234",
  numeroRegisto: "LUS201900421",
  nome: "MAESTOSO XV",
};

const ANUNCIO = {
  id: "cavalo-1",
  nome: "Maestoso",
  nome_registo: "MAESTOSO XV",
  registro_apsl: "LUS201900421",
  passaporte_equino: null,
  microchip: "620015004471234",
  status: "active",
  user_id: "vendedor-1",
  data_nascimento: null,
  idade: null,
  sexo: "Garanhão",
  altura: null,
};

beforeEach(() => mockFrom.mockReset());

// ─── As contradições ─────────────────────────────────────────────────────────

describe("as contradições calculam-se contra o anúncio de hoje", () => {
  it("um microchip que o anúncio desmente vira uma nota, com explicação inocente", async () => {
    const linha = documento({ cavalo_id: ANUNCIO.id, leitura: LEITURA_DO_PDF });
    porTabela({ documentos_cavalo: [linha], cavalos_venda: [], cavalos_venda_ascendentes: [] });

    const vista = await recolherVerificacao({
      documentoId: DOC,
      cavaloId: ANUNCIO.id,
      referencia: REFERENCIA,
      sha256: SHA,
      linha,
      anuncio: { ...ANUNCIO, microchip: "620015004479999" },
    });

    const nota = vista.notas.find((n) => n.chave === "conflito_com_o_formulario");
    expect(nota).toBeDefined();
    expect(nota!.observacao).toContain("620015004479999");
    expect(nota!.observacao).toContain("620015004471234");
    expect(nota!.explicacaoInocente.length).toBeGreaterThan(60);
  });

  it("um anúncio corrigido depois da subida deixa de ter contradição", async () => {
    // A razão de se recalcular em vez de se ler: a coluna foi escrita quando o
    // anúncio não existia, e ficaria a acusar o que entretanto foi emendado.
    const linha = documento({
      cavalo_id: ANUNCIO.id,
      leitura: LEITURA_DO_PDF,
      conflitos: [
        { campo: "microchip", noFormulario: "620015004479999", noDocumento: "620015004471234" },
      ],
    });
    porTabela({ documentos_cavalo: [linha], cavalos_venda: [], cavalos_venda_ascendentes: [] });

    const vista = await recolherVerificacao({
      documentoId: DOC,
      cavaloId: ANUNCIO.id,
      referencia: REFERENCIA,
      sha256: SHA,
      linha,
      anuncio: ANUNCIO,
    });

    expect(vista.notas.some((n) => n.chave === "conflito_com_o_formulario")).toBe(false);
  });

  it("sem anúncio usa-se o que ficou guardado, porque não há contra o que cruzar", async () => {
    const linha = documento({
      conflitos: [{ campo: "nome", noFormulario: "Maestoso", noDocumento: "Zimbro" }],
    });
    porTabela({ documentos_cavalo: [linha] });

    const vista = await recolherVerificacao({
      documentoId: DOC,
      cavaloId: null,
      referencia: REFERENCIA,
      sha256: SHA,
      linha,
      anuncio: undefined,
    });

    const nota = vista.notas.find((n) => n.chave === "conflito_com_o_formulario");
    expect(nota?.observacao).toContain("Zimbro");
  });
});

// ─── Os sinais entre anúncios ────────────────────────────────────────────────

describe("os sinais entre anúncios chegam à ficha", () => {
  it("o mesmo ficheiro noutro anúncio vira uma nota", async () => {
    const linha = documento({ cavalo_id: "cavalo-1" });
    porTabela({
      documentos_cavalo: [
        linha,
        {
          id: "outro",
          cavalo_id: "cavalo-2",
          referencia: "outra-ref",
          tipo: "livro_azul",
          estado: "por_verificar",
          sha256: SHA,
          leitura: null,
          conflitos: null,
        },
      ],
      cavalos_venda: [],
      cavalos_venda_ascendentes: [],
    });

    const vista = await recolherVerificacao({
      documentoId: DOC,
      cavaloId: "cavalo-1",
      referencia: REFERENCIA,
      sha256: SHA,
      linha,
      anuncio: ANUNCIO,
    });

    const nota = vista.notas.find((n) => n.chave === "documento_repetido");
    expect(nota).toBeDefined();
    expect(nota!.cavalos).toEqual(["cavalo-1", "cavalo-2"]);
    expect(nota!.explicacaoInocente.length).toBeGreaterThan(60);
  });

  it("o mesmo microchip em dois anúncios em pé vira uma nota", async () => {
    const linha = documento({ cavalo_id: ANUNCIO.id });
    porTabela({
      documentos_cavalo: [linha],
      cavalos_venda: [ANUNCIO, { ...ANUNCIO, id: "cavalo-2", user_id: "vendedor-2" }],
      cavalos_venda_ascendentes: [],
    });

    const vista = await recolherVerificacao({
      documentoId: DOC,
      cavaloId: ANUNCIO.id,
      referencia: REFERENCIA,
      sha256: SHA,
      linha,
      anuncio: ANUNCIO,
    });

    expect(vista.notas.some((n) => n.chave === "microchip_repetido")).toBe(true);
    expect(vista.notas.some((n) => n.chave === "registo_em_vendedores_diferentes")).toBe(true);
  });
});

// ─── A coerência ─────────────────────────────────────────────────────────────

describe("a coerência da árvore chega à ficha", () => {
  it("um antepassado que consta de si próprio vira uma nota", async () => {
    const linha = documento({ cavalo_id: ANUNCIO.id });
    porTabela({
      documentos_cavalo: [linha],
      cavalos_venda: [ANUNCIO],
      cavalos_venda_ascendentes: [
        { cavalo_id: ANUNCIO.id, caminho: "pai", geracao: 1, nome: "MAESTOSO XV", registo: null },
      ],
    });

    const vista = await recolherVerificacao({
      documentoId: DOC,
      cavaloId: ANUNCIO.id,
      referencia: REFERENCIA,
      sha256: SHA,
      linha,
      anuncio: ANUNCIO,
    });

    const nota = vista.notas.find((n) => n.chave === "antepassado_de_si_proprio");
    expect(nota).toBeDefined();
    expect(nota!.explicacaoInocente).toMatch(/consanguinidade/i);
  });
});

// ─── O exame do ficheiro ─────────────────────────────────────────────────────

describe("o exame guardado na coluna chega à ficha", () => {
  const PDF = montarPdfComRemate(
    [...esqueleto("BT ET\n"), { numero: 8, dicionario: "<< /Producer (Xerox WorkCentre) >>" }],
    { trailer: "<< /Root 1 0 R /Info 8 0 R >>" }
  );

  it("os achados viram notas e a análise diz que correu", async () => {
    const linha = documento({
      forense: JSON.parse(
        JSON.stringify({
          correu: true,
          em: "2026-09-04T10:00:00.000Z",
          achados: reunirForense(PDF, "application/pdf"),
        })
      ),
    });
    porTabela({ documentos_cavalo: [linha] });

    const vista = await recolherVerificacao({
      documentoId: DOC,
      cavaloId: null,
      referencia: REFERENCIA,
      sha256: SHA,
      linha,
      anuncio: undefined,
    });

    expect(vista.analise).toBe("correu");
    expect(vista.analisadoEm).toBe("2026-09-04T10:00:00.000Z");
    expect(vista.notas.some((n) => n.origem === "ficheiro")).toBe(true);
  });

  it("uma coluna nula diz «por correr», que não é «não há nada»", async () => {
    const linha = documento();
    porTabela({ documentos_cavalo: [linha] });

    const vista = await recolherVerificacao({
      documentoId: DOC,
      cavaloId: null,
      referencia: REFERENCIA,
      sha256: SHA,
      linha,
      anuncio: undefined,
    });

    expect(vista.analise).toBe("por_correr");
    expect(vista.notas.filter((n) => n.origem === "ficheiro")).toEqual([]);
  });

  it("o raro vem antes do comum, mesmo vindo de motores diferentes", async () => {
    const linha = documento({
      cavalo_id: "cavalo-1",
      forense: JSON.parse(
        JSON.stringify({
          correu: true,
          em: "2026-09-04T10:00:00.000Z",
          achados: reunirForense(PDF, "application/pdf"),
        })
      ),
    });
    porTabela({
      documentos_cavalo: [
        linha,
        {
          id: "outro",
          cavalo_id: "cavalo-2",
          referencia: "outra-ref",
          tipo: "livro_azul",
          estado: "por_verificar",
          sha256: SHA,
          leitura: null,
          conflitos: null,
        },
      ],
      cavalos_venda: [],
      cavalos_venda_ascendentes: [],
    });

    const vista = await recolherVerificacao({
      documentoId: DOC,
      cavaloId: "cavalo-1",
      referencia: REFERENCIA,
      sha256: SHA,
      linha,
      anuncio: ANUNCIO,
    });

    const chaves = vista.notas.map((n) => n.chave);
    expect(chaves.indexOf("documento_repetido")).toBeLessThan(chaves.indexOf("pdf_metadados"));
  });
});

// ─── A fronteira ─────────────────────────────────────────────────────────────

describe("a recolha não decide nada", () => {
  it("nenhuma nota traz estado, e a vista não promove o documento", async () => {
    const linha = documento({ cavalo_id: ANUNCIO.id, leitura: LEITURA_DO_PDF });
    porTabela({
      documentos_cavalo: [linha],
      cavalos_venda: [ANUNCIO],
      cavalos_venda_ascendentes: [],
    });

    const vista = await recolherVerificacao({
      documentoId: DOC,
      cavaloId: ANUNCIO.id,
      referencia: REFERENCIA,
      sha256: SHA,
      linha,
      anuncio: { ...ANUNCIO, microchip: "620015004479999" },
    });

    expect(vista).not.toHaveProperty("estado");
    for (const nota of vista.notas) {
      expect(nota).not.toHaveProperty("estado");
      expect(nota).not.toHaveProperty("gravidade");
      expect(nota.explicacaoInocente.trim().length).toBeGreaterThan(60);
    }
  });
});
