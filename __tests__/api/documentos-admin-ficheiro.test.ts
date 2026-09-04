/**
 * A rota que serve o documento.
 *
 * É a rota mais perigosa das cinco: um passaporte equino traz o nome e a morada
 * do proprietário. Estes testes existem para que a forma de o servir não se
 * degrade sem alguém dar por isso — em especial que **nunca** se chame
 * `getPublicUrl`, e que nenhum endereço do balde saia daqui.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFrom = vi.fn();
const mockVerifySession = vi.fn();
const mockDownload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock("@/lib/supabase-admin", () => {
  const duplo = {
    from: (...args: unknown[]) => mockFrom(...args),
    storage: {
      from: (...args: unknown[]) => {
        mockStorageFrom(...args);
        return {
          download: (...a: unknown[]) => mockDownload(...a),
          getPublicUrl: (...a: unknown[]) => mockGetPublicUrl(...a),
          createSignedUrl: (...a: unknown[]) => mockCreateSignedUrl(...a),
        };
      },
    },
  };
  return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
});

vi.mock("@/lib/auth", () => ({
  verifySession: (...args: unknown[]) => mockVerifySession(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { GET as ficheiro } from "@/app/api/admin/documentos/[id]/ficheiro/route";
import { BALDE_DOCUMENTOS } from "@/lib/documentos/contrato";

const ID = "11111111-2222-4333-8444-555555555555";
const params = Promise.resolve({ id: ID });

function linha(extra: Record<string, unknown> = {}) {
  const cadeia: Record<string, unknown> = {};
  cadeia.select = vi.fn(() => cadeia);
  cadeia.eq = vi.fn(() => cadeia);
  cadeia.maybeSingle = vi.fn(() =>
    Promise.resolve({
      data: {
        caminho: "ref-a/passaporte/abc.pdf",
        mime: "application/pdf",
        nome_original: "passaporte.pdf",
        ...extra,
      },
      error: null,
    })
  );
  return cadeia;
}

function pedido() {
  return new NextRequest(`http://localhost:3000/api/admin/documentos/${ID}/ficheiro`);
}

/**
 * O que o `download` do Supabase devolve é um `Blob` do Node, que tem
 * `arrayBuffer()`. O `Blob` do jsdom — o ambiente destes testes — não tem, e é
 * por isso que o duplo é escrito à mão em vez de se usar um `new Blob(...)`:
 * um `Blob` de jsdom aqui não estaria a imitar o que a rota recebe em
 * produção, estaria a testar uma limitação do ambiente de teste.
 */
function blobDoNode(bytes: Uint8Array) {
  return {
    size: bytes.byteLength,
    arrayBuffer: () =>
      Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)),
  };
}

/** Os quatro primeiros bytes de um PDF: `%PDF`. */
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifySession.mockResolvedValue("admin@portal-lusitano.pt");
  mockDownload.mockResolvedValue({ data: blobDoNode(PDF), error: null });
});

describe("GET o ficheiro", () => {
  it("sem sessão não lê a linha nem toca no balde", async () => {
    mockVerifySession.mockResolvedValue(null);
    const resposta = await ficheiro(pedido(), { params });
    expect(resposta.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it("nunca chama getPublicUrl", async () => {
    mockFrom.mockReturnValue(linha());
    await ficheiro(pedido(), { params });
    // O balde é privado e tem de continuar a ser. Um endereço público sobre
    // ele seria um endereço adivinhável para um documento de identificação.
    expect(mockGetPublicUrl).not.toHaveBeenCalled();
  });

  it("serve os bytes do balde privado, não um endereço", async () => {
    mockFrom.mockReturnValue(linha());
    const resposta = await ficheiro(pedido(), { params });

    expect(resposta.status).toBe(200);
    expect(mockStorageFrom).toHaveBeenCalledWith(BALDE_DOCUMENTOS);
    expect(mockDownload).toHaveBeenCalledWith("ref-a/passaporte/abc.pdf");

    // O corpo são os bytes; nada no cabeçalho aponta para fora.
    const cabecalhos = [...resposta.headers.values()].join(" ");
    expect(cabecalhos).not.toContain("supabase");
    expect(cabecalhos).not.toContain("token=");
    expect(cabecalhos).not.toContain("ref-a/passaporte");
  });

  it("não deixa o documento ficar em cache nem viajar no Referer", async () => {
    mockFrom.mockReturnValue(linha());
    const resposta = await ficheiro(pedido(), { params });

    expect(resposta.headers.get("Cache-Control")).toContain("no-store");
    expect(resposta.headers.get("Cache-Control")).toContain("private");
    expect(resposta.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(resposta.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("o Content-Type sai da coluna, que foi lida nos bytes à entrada", async () => {
    mockFrom.mockReturnValue(linha({ mime: "image/png" }));
    const resposta = await ficheiro(pedido(), { params });
    expect(resposta.headers.get("Content-Type")).toBe("image/png");
  });

  it("um mime fora do contrato não é servido", async () => {
    // Se um dia alguém escrever outra coisa naquela coluna, o que sai daqui
    // não passa a ser servido com um tipo à escolha de quem lá escreveu.
    mockFrom.mockReturnValue(linha({ mime: "text/html" }));
    const resposta = await ficheiro(pedido(), { params });
    expect(resposta.status).toBe(500);
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it("um nome com quebras de linha não injecta cabeçalhos", async () => {
    mockFrom.mockReturnValue(
      linha({ nome_original: 'passa"porte\r\nSet-Cookie: a=b\r\n\r\n<script>.pdf' })
    );
    const resposta = await ficheiro(pedido(), { params });

    const disposition = resposta.headers.get("Content-Disposition") ?? "";
    expect(disposition).not.toContain("\n");
    expect(disposition).not.toContain("\r");
    expect(disposition).not.toContain('"passa"');
    expect(resposta.headers.get("Set-Cookie")).toBeNull();
  });

  it("um id que não é UUID não chega à base", async () => {
    const resposta = await ficheiro(pedido(), {
      params: Promise.resolve({ id: "../../outro" }),
    });
    expect(resposta.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("um documento inexistente dá 404 e não toca no balde", async () => {
    const cadeia: Record<string, unknown> = {};
    cadeia.select = vi.fn(() => cadeia);
    cadeia.eq = vi.fn(() => cadeia);
    cadeia.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    mockFrom.mockReturnValue(cadeia);

    const resposta = await ficheiro(pedido(), { params });
    expect(resposta.status).toBe(404);
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it("uma falha do balde não devolve um corpo vazio com 200", async () => {
    mockFrom.mockReturnValue(linha());
    mockDownload.mockResolvedValue({ data: null, error: { message: "não existe" } });

    const resposta = await ficheiro(pedido(), { params });
    expect(resposta.status).toBe(502);
  });
});
