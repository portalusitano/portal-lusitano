/**
 * A fila e o duplicado.
 *
 * O teste que mais importa aqui é o do duplicado: o mesmo ficheiro em dois
 * anúncios é o sinal de fraude mais forte que este sistema tem, e um sinal
 * desses só vale se não estiver a gritar por tudo e por nada. Metade destes
 * testes é sobre quando ele **não** deve disparar.
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

import { GET as fila } from "@/app/api/admin/documentos/route";
import { mesmaSubmissao } from "@/app/api/admin/documentos/comum";

/**
 * Uma cadeia de leitura que responde ao `await` e a todos os encadeamentos do
 * PostgREST que a rota usa. `count` serve as contagens com `head: true`.
 */
function leitura(dados: unknown[], count = 0) {
  const cadeia: Record<string, unknown> = {};
  const proprio = () => cadeia;
  cadeia.select = vi.fn(proprio);
  cadeia.eq = vi.fn(proprio);
  cadeia.neq = vi.fn(proprio);
  cadeia.in = vi.fn(proprio);
  cadeia.order = vi.fn(proprio);
  cadeia.limit = vi.fn(proprio);
  cadeia.maybeSingle = vi.fn(() => Promise.resolve({ data: dados[0] ?? null, error: null }));
  cadeia.then = (ok: (v: unknown) => void, mal?: (e: unknown) => void) =>
    Promise.resolve({ data: dados, error: null, count }).then(ok, mal);
  return cadeia;
}

function documento(extra: Record<string, unknown> = {}) {
  return {
    id: "11111111-2222-4333-8444-555555555555",
    tipo: "livro_azul",
    estado: "por_verificar",
    criado_em: "2026-09-01T10:00:00Z",
    cavalo_id: null,
    referencia: "ref-a",
    nome_original: "livro.pdf",
    mime: "application/pdf",
    bytes: 1024,
    sha256: "a".repeat(64),
    conflitos: null,
    verificado_por: null,
    verificado_em: null,
    motivo_recusa: null,
    ...extra,
  };
}

function pedido(query = "") {
  return new NextRequest(`http://localhost:3000/api/admin/documentos${query}`);
}

/**
 * A rota faz, por esta ordem: a fila, os vizinhos por sha, os nomes dos
 * cavalos (só se houver algum), e quatro contagens. Este ajudante encadeia as
 * respostas por essa ordem.
 */
function encadear(filaDocs: unknown[], vizinhos: unknown[] = [], cavalos: unknown[] = []) {
  mockFrom.mockReset();
  mockFrom
    .mockReturnValueOnce(leitura(filaDocs))
    .mockReturnValueOnce(leitura(vizinhos))
    .mockReturnValueOnce(leitura(cavalos))
    .mockReturnValue(leitura([], 0));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifySession.mockResolvedValue("admin@portal-lusitano.pt");
});

describe("GET a fila", () => {
  it("devolve 401 sem sessão e não toca na base", async () => {
    mockVerifySession.mockResolvedValue(null);
    const resposta = await fila(pedido());
    expect(resposta.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("não manda o caminho do balde para o browser", async () => {
    encadear([documento({ caminho: "ref-a/livro_azul/x.pdf" })]);
    const corpo = await (await fila(pedido())).json();

    const serializado = JSON.stringify(corpo);
    expect(serializado).not.toContain("caminho");
    expect(serializado).not.toContain("ref-a/livro_azul");
    // O SHA completo também não: identifica o ficheiro sem servir para nada
    // deste lado.
    expect(serializado).not.toContain("a".repeat(64));
  });

  it("quem tem conflitos sobe à frente de quem chegou primeiro", async () => {
    encadear([
      documento({ id: "11111111-1111-4111-8111-111111111111", criado_em: "2026-09-01T00:00:00Z" }),
      documento({
        id: "22222222-2222-4222-8222-222222222222",
        referencia: "ref-b",
        sha256: "b".repeat(64),
        criado_em: "2026-09-02T00:00:00Z",
        conflitos: [{ campo: "microchip", noFormulario: "985...1", noDocumento: "985...9" }],
      }),
    ]);

    const corpo = await (await fila(pedido())).json();
    expect(corpo.documentos[0].id).toBe("22222222-2222-4222-8222-222222222222");
    expect(corpo.documentos[0].conflitos).toHaveLength(1);
  });

  it("um duplicado passa à frente de um conflito", async () => {
    const sha = "c".repeat(64);
    encadear(
      [
        documento({
          id: "11111111-1111-4111-8111-111111111111",
          conflitos: [{ campo: "nome", noFormulario: "A", noDocumento: "B" }],
        }),
        documento({ id: "22222222-2222-4222-8222-222222222222", referencia: "ref-b", sha256: sha }),
      ],
      [
        {
          id: "99999999-9999-4999-8999-999999999999",
          sha256: sha,
          cavalo_id: null,
          referencia: "ref-z",
        },
      ]
    );

    const corpo = await (await fila(pedido())).json();
    expect(corpo.documentos[0].id).toBe("22222222-2222-4222-8222-222222222222");
    expect(corpo.documentos[0].duplicadoNoutras).toBe(1);
  });

  it("conta submissões e não linhas — o mesmo ficheiro duas vezes no mesmo anúncio é um só", async () => {
    const sha = "d".repeat(64);
    encadear(
      [documento({ sha256: sha })],
      [
        // Duas linhas, mas ambas do mesmo anúncio alheio: um aviso, não dois.
        {
          id: "aaaaaaa1-1111-4111-8111-111111111111",
          sha256: sha,
          cavalo_id: "cav-x",
          referencia: "ref-x",
        },
        {
          id: "aaaaaaa2-2222-4222-8222-222222222222",
          sha256: sha,
          cavalo_id: "cav-x",
          referencia: "ref-y",
        },
      ]
    );

    const corpo = await (await fila(pedido())).json();
    expect(corpo.documentos[0].duplicadoNoutras).toBe(1);
  });

  it("um reenvio para a mesma submissão não é um duplicado suspeito", async () => {
    const sha = "e".repeat(64);
    encadear(
      [documento({ sha256: sha, referencia: "ref-a" })],
      [
        // A mesma referência: é o vendedor a reenviar o mesmo documento, que é
        // legítimo e está escrito na migração.
        {
          id: "bbbbbbb1-1111-4111-8111-111111111111",
          sha256: sha,
          cavalo_id: null,
          referencia: "ref-a",
        },
      ]
    );

    const corpo = await (await fila(pedido())).json();
    expect(corpo.documentos[0].duplicadoNoutras).toBe(0);
  });

  it("conflitos malformados na coluna jsonb não deitam a fila abaixo", async () => {
    encadear([
      documento({
        conflitos: [
          null,
          "texto solto",
          { campo: "campo_que_nao_existe", noFormulario: "a", noDocumento: "b" },
          { campo: "ueln", noFormulario: "X", noDocumento: "Y" },
        ],
      }),
    ]);

    const resposta = await fila(pedido());
    const corpo = await resposta.json();
    expect(resposta.status).toBe(200);
    expect(corpo.documentos[0].conflitos).toEqual([
      { campo: "ueln", noFormulario: "X", noDocumento: "Y" },
    ]);
  });

  it("um estado inventado no query cai na fila por omissão, não num erro", async () => {
    encadear([documento()]);
    const resposta = await fila(pedido("?estado=inventado"));
    expect(resposta.status).toBe(200);
  });
});

describe("mesmaSubmissao", () => {
  it("a mesma referência é a mesma submissão", () => {
    expect(
      mesmaSubmissao({ cavalo_id: null, referencia: "r" }, { cavalo_id: "c", referencia: "r" })
    ).toBe(true);
  });

  it("o mesmo cavalo é a mesma submissão", () => {
    expect(
      mesmaSubmissao({ cavalo_id: "c", referencia: "r1" }, { cavalo_id: "c", referencia: "r2" })
    ).toBe(true);
  });

  it("dois nulos não fazem uma coincidência", () => {
    // Se `cavalo_id` nulo casasse com `cavalo_id` nulo, todos os documentos
    // anteriores ao pagamento seriam a mesma submissão e o aviso nunca
    // dispararia onde mais interessa: antes de o anúncio existir.
    expect(
      mesmaSubmissao({ cavalo_id: null, referencia: "r1" }, { cavalo_id: null, referencia: "r2" })
    ).toBe(false);
  });

  it("referências vazias não casam", () => {
    expect(
      mesmaSubmissao({ cavalo_id: null, referencia: "" }, { cavalo_id: null, referencia: "" })
    ).toBe(false);
  });
});
