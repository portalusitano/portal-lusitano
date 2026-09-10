/**
 * A ficha: a comparação entre o que o documento diz e o que o vendedor
 * escreveu.
 *
 * É essa comparação que é o trabalho de quem revê, e é sobre ela que este
 * ficheiro faz as suas afirmações — em particular sobre a honestidade das duas
 * colunas: de onde veio cada valor, e o que a ficha diz quando não veio de lado
 * nenhum.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFrom = vi.fn();
const mockVerifySession = vi.fn();

vi.mock("@/lib/supabase-admin", () => {
  const duplo = {
    from: (...args: unknown[]) => mockFrom(...args),
    storage: { from: () => ({ download: vi.fn() }) },
  };
  return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
});

vi.mock("@/lib/auth", () => ({
  verifySession: (...args: unknown[]) => mockVerifySession(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { GET as ficha } from "@/app/api/admin/documentos/[id]/route";

const ID = "11111111-2222-4333-8444-555555555555";
const params = Promise.resolve({ id: ID });

function cadeia(resultado: { data: unknown; error?: unknown }) {
  const c: Record<string, unknown> = {};
  const proprio = () => c;
  c.select = vi.fn(proprio);
  c.eq = vi.fn(proprio);
  c.neq = vi.fn(proprio);
  c.in = vi.fn(proprio);
  c.maybeSingle = vi.fn(() =>
    Promise.resolve({
      data: Array.isArray(resultado.data) ? (resultado.data[0] ?? null) : resultado.data,
      error: resultado.error ?? null,
    })
  );
  c.then = (ok: (v: unknown) => void, mal?: (e: unknown) => void) =>
    Promise.resolve({
      data: Array.isArray(resultado.data) ? resultado.data : [resultado.data],
      error: resultado.error ?? null,
    }).then(ok, mal);
  return c;
}

function documento(extra: Record<string, unknown> = {}) {
  return {
    id: ID,
    tipo: "livro_azul",
    estado: "por_verificar",
    criado_em: "2026-09-01T10:00:00Z",
    cavalo_id: null,
    referencia: "ref-a",
    caminho: "ref-a/livro_azul/x.pdf",
    nome_original: "livro.pdf",
    mime: "application/pdf",
    bytes: 2048,
    sha256: "f".repeat(64),
    conflitos: null,
    leitura: null,
    motivo_recusa: null,
    verificado_por: null,
    verificado_em: null,
    ...extra,
  };
}

/** A rota lê: o documento, o anúncio (se houver), os vizinhos, os nomes. */
function encadear(doc: unknown, anuncio: unknown = null, vizinhos: unknown[] = []) {
  mockFrom.mockReset();
  const sequencia = [cadeia({ data: doc })];
  if ((doc as Record<string, unknown>)?.cavalo_id) sequencia.push(cadeia({ data: anuncio }));
  sequencia.push(cadeia({ data: vizinhos }));
  sequencia.push(cadeia({ data: [] }));
  let i = 0;
  mockFrom.mockImplementation(() => sequencia[i++] ?? cadeia({ data: [] }));
}

const pedido = () => new NextRequest(`http://localhost:3000/api/admin/documentos/${ID}`);

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifySession.mockResolvedValue("admin@portal-lusitano.pt");
});

describe("GET a ficha", () => {
  it("devolve 401 sem sessão e não toca na base", async () => {
    mockVerifySession.mockResolvedValue(null);
    const resposta = await ficha(pedido(), { params });
    expect(resposta.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("não manda o caminho do balde nem o sha completo para o browser", async () => {
    encadear(documento());
    const corpo = await (await ficha(pedido(), { params })).json();

    const serializado = JSON.stringify(corpo);
    expect(serializado).not.toContain("ref-a/livro_azul");
    expect(serializado).not.toContain("f".repeat(64));
    // O curto chega para o identificar à vista.
    expect(corpo.documento.sha256Curto).toBe("f".repeat(12));
  });

  it("mostra os quatro campos mesmo quando não há nada para comparar", async () => {
    encadear(documento());
    const corpo = await (await ficha(pedido(), { params })).json();

    const campos = corpo.documento.campos;
    expect(campos.map((c: { campo: string }) => c.campo)).toEqual([
      "nome",
      "numero_registo",
      "ueln",
      "microchip",
    ]);
    // Sem anúncio e sem conflito, os dois lados estão vazios — e a origem
    // di-lo, em vez de o painel ter de adivinhar porque é que está vazio.
    expect(campos[0].noFormulario).toBeNull();
    expect(campos[0].origemDoFormulario).toBe("nenhuma");
    expect(campos[0].noDocumento).toBeNull();
    expect(campos[0].emConflito).toBe(false);
  });

  it("lê o lado do vendedor nas colunas certas do anúncio", async () => {
    encadear(documento({ cavalo_id: "cav-1" }), {
      id: "cav-1",
      nome: "Zíngaro",
      slug: "zingaro",
      status: "activo",
      nome_registo: "Zíngaro do Vale",
      registro_apsl: "APSL-1234",
      passaporte_equino: "620014000123456",
      microchip: "985112000111222",
      vendedor_nome: "M. Silva",
      vendedor_email: "m@exemplo.pt",
    });

    const corpo = await (await ficha(pedido(), { params })).json();
    const porCampo = Object.fromEntries(
      corpo.documento.campos.map((c: { campo: string }) => [c.campo, c])
    );

    // O `numero_registo` do formulário está gravado em `registro_apsl`, e o
    // UELN em `passaporte_equino`. Se o mapa se partir, é aqui que se vê.
    expect(porCampo.nome.noFormulario).toBe("Zíngaro do Vale");
    expect(porCampo.numero_registo.noFormulario).toBe("APSL-1234");
    expect(porCampo.ueln.noFormulario).toBe("620014000123456");
    expect(porCampo.microchip.noFormulario).toBe("985112000111222");
    expect(porCampo.nome.origemDoFormulario).toBe("anuncio");
    expect(corpo.documento.vendedorEmail).toBe("m@exemplo.pt");
  });

  it("sem anúncio, o lado do vendedor vem do conflito e diz que veio de lá", async () => {
    encadear(
      documento({
        conflitos: [{ campo: "microchip", noFormulario: "985...111", noDocumento: "985...999" }],
      })
    );

    const corpo = await (await ficha(pedido(), { params })).json();
    const microchip = corpo.documento.campos.find(
      (c: { campo: string }) => c.campo === "microchip"
    );

    expect(microchip.noFormulario).toBe("985...111");
    expect(microchip.origemDoFormulario).toBe("conflito");
    expect(microchip.noDocumento).toBe("985...999");
    expect(microchip.emConflito).toBe(true);
    expect(corpo.documento.cavaloId).toBeNull();
  });

  it("a leitura automática enche o lado do documento sem levantar a mão", async () => {
    encadear(
      documento({
        leitura: { origem: "pdf", ueln: "620014000123456", texto: "linha de texto" },
      })
    );

    const corpo = await (await ficha(pedido(), { params })).json();
    const ueln = corpo.documento.campos.find((c: { campo: string }) => c.campo === "ueln");

    // Ter lido um valor não é uma contradição: `emConflito` fica falso e a
    // ficha mostra os dois lados sem afirmar nada sobre eles.
    expect(ueln.noDocumento).toBe("620014000123456");
    expect(ueln.emConflito).toBe(false);
    expect(corpo.documento.origemDaLeitura).toBe("pdf");
  });

  it("uma leitura que não é objecto não deita a ficha abaixo", async () => {
    encadear(documento({ leitura: "isto devia ser um objecto" }));
    const resposta = await ficha(pedido(), { params });
    const corpo = await resposta.json();
    expect(resposta.status).toBe(200);
    expect(corpo.documento.origemDaLeitura).toBeNull();
    expect(corpo.documento.textoLido).toBeNull();
  });

  it("lista o mesmo ficheiro noutra submissão", async () => {
    encadear(documento(), null, [
      {
        id: "22222222-2222-4222-8222-222222222222",
        tipo: "livro_azul",
        estado: "verificado",
        criado_em: "2026-08-01T00:00:00Z",
        cavalo_id: null,
        referencia: "ref-outra",
      },
    ]);

    const corpo = await (await ficha(pedido(), { params })).json();
    expect(corpo.documento.duplicados).toHaveLength(1);
    expect(corpo.documento.duplicados[0].referencia).toBe("ref-outra");
  });

  it("não chama duplicado a um reenvio da mesma submissão", async () => {
    encadear(documento({ referencia: "ref-a" }), null, [
      {
        id: "22222222-2222-4222-8222-222222222222",
        tipo: "livro_azul",
        estado: "recusado",
        criado_em: "2026-08-01T00:00:00Z",
        cavalo_id: null,
        referencia: "ref-a",
      },
    ]);

    const corpo = await (await ficha(pedido(), { params })).json();
    expect(corpo.documento.duplicados).toHaveLength(0);
  });

  it("se a procura de duplicados falhar, a ficha falha alto", async () => {
    mockFrom.mockReset();
    const sequencia = [
      cadeia({ data: documento() }),
      cadeia({ data: [], error: { message: "x" } }),
    ];
    let i = 0;
    mockFrom.mockImplementation(() => sequencia[i++] ?? cadeia({ data: [] }));

    const resposta = await ficha(pedido(), { params });

    // Um aviso de fraude que se degrada em silêncio é pior do que não haver
    // aviso: a página continuaria a parecer completa e quem revê decidiria
    // sem o saber.
    expect(resposta.status).toBe(500);
    expect((await resposta.json()).erro).toContain("duplicados");
  });

  it("um documento inexistente dá 404", async () => {
    encadear(null);
    const resposta = await ficha(pedido(), { params });
    expect(resposta.status).toBe(404);
  });

  it("um id que não é UUID não chega à base", async () => {
    const resposta = await ficha(pedido(), { params: Promise.resolve({ id: "1 or 1=1" }) });
    expect(resposta.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
