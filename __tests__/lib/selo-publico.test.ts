// @vitest-environment node
//
// Node, e não jsdom, e isso é parte do que se está a testar: o módulo tem uma
// guarda que rebenta se houver `window`, porque importa a chave de serviço.
// A primeira versão deste ficheiro correu em jsdom e a guarda disparou — foi
// assim que se confirmou que ela não é decoração.
import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * A ponte entre uma tabela que nega tudo e uma página que qualquer pessoa abre.
 *
 * `documentos_cavalo` tem a RLS ligada e zero políticas de propósito. Ligá-la a
 * uma ficha pública é o momento exacto em que se pode abrir um buraco sem dar
 * por ela, e é por isso que estes testes olham menos para «devolve `true` no
 * caso certo» e mais para **o que sai** e **o que acontece quando falha**.
 */

const from = vi.fn();
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => from(...args),
  },
}));

const erros: unknown[][] = [];
vi.mock("@/lib/logger", () => ({
  logger: {
    error: (...args: unknown[]) => erros.push(args),
    warn: () => {},
    info: () => {},
    debug: () => {},
  },
}));

const { seloDizAlgumaCoisa, seloPublicoDoAnuncio, seloVazio } =
  await import("@/lib/documentos/selo-publico");

/** O construtor das duas respostas que o módulo pede, na ordem em que as pede. */
function base({
  documentos = { data: [] as unknown, error: null as unknown },
  consulta = { data: null as unknown, error: null as unknown },
}: {
  documentos?: { data: unknown; error: unknown };
  consulta?: { data: unknown; error: unknown };
} = {}) {
  from.mockImplementation((tabela: string) => {
    if (tabela === "documentos_cavalo") {
      return { select: () => ({ eq: () => Promise.resolve(documentos) }) };
    }
    return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(consulta) }) }) };
  });
}

beforeEach(() => {
  from.mockReset();
  erros.length = 0;
});

describe("seloPublicoDoAnuncio — o que atravessa a ponte", () => {
  it("devolve dois booleanos e mais nada", async () => {
    /* Esta é a asserção que este ficheiro existe para fazer. No dia em que
       alguém acrescentar a data, o motivo, o autor ou o número de registo ao
       valor devolvido, este teste reprova — e é essa a intenção. Um `true` não
       pode dizer que documento foi visto, nem quando, nem por quem. */
    base({
      documentos: {
        data: [
          {
            tipo: "livro_azul",
            estado: "verificado",
            verificado_por: "alguem@portal-lusitano.pt",
            criado_em: "2026-01-01",
          },
        ],
        error: null,
      },
      consulta: {
        data: { estado: "confirmado", chave: "12345", registo: { nome: "X" } },
        error: null,
      },
    });

    const selo = await seloPublicoDoAnuncio("cavalo-1");

    expect(Object.keys(selo).sort()).toEqual([
      "documentacaoVerificada",
      "registoConfirmadoNoStudBook",
    ]);
    expect(Object.values(selo).every((v) => typeof v === "boolean")).toBe(true);
    expect(JSON.stringify(selo)).not.toContain("alguem@portal-lusitano.pt");
    expect(JSON.stringify(selo)).not.toContain("12345");
  });

  it("pede só as colunas de que os predicados precisam", async () => {
    /* Uma coluna que não se pede é uma coluna que não pode escapar por engano
       para o lado do browser. */
    const colunas: string[] = [];
    from.mockImplementation((tabela: string) => ({
      select: (c: string) => {
        colunas.push(`${tabela}: ${c}`);
        return tabela === "documentos_cavalo"
          ? { eq: () => Promise.resolve({ data: [], error: null }) }
          : { eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) };
      },
    }));

    await seloPublicoDoAnuncio("cavalo-1");

    expect(colunas).toEqual(["documentos_cavalo: tipo, estado", "consultas_stud_book: estado"]);
  });

  it("só o livro azul VERIFICADO conta", async () => {
    for (const documento of [
      { tipo: "livro_azul", estado: "pendente" },
      { tipo: "livro_azul", estado: "recusado" },
      { tipo: "livro_azul", estado: "em_revisao" },
      { tipo: "outro", estado: "verificado" },
    ]) {
      base({ documentos: { data: [documento], error: null } });
      const selo = await seloPublicoDoAnuncio("cavalo-1");
      expect(selo.documentacaoVerificada, JSON.stringify(documento)).toBe(false);
    }

    base({ documentos: { data: [{ tipo: "livro_azul", estado: "verificado" }], error: null } });
    expect((await seloPublicoDoAnuncio("cavalo-1")).documentacaoVerificada).toBe(true);
  });

  it("só «confirmado» conta no stud book", async () => {
    for (const estado of ["desconhecido", "indisponivel", "desligado", "sem_identificador"]) {
      base({ consulta: { data: { estado }, error: null } });
      expect((await seloPublicoDoAnuncio("c")).registoConfirmadoNoStudBook, estado).toBe(false);
    }
    base({ consulta: { data: { estado: "confirmado" }, error: null } });
    expect((await seloPublicoDoAnuncio("c")).registoConfirmadoNoStudBook).toBe(true);
  });
});

describe("quando a base não responde", () => {
  it("cala-se em vez de rebentar a ficha", async () => {
    /* Uma ficha de anúncio que rebenta porque a tabela dos documentos não
       respondeu é uma ficha que deixa de vender um cavalo por causa de um
       selo. A falha lê-se como «não temos a dizer». */
    base({
      documentos: { data: null, error: { message: "boom" } },
      consulta: { data: null, error: { message: "boom" } },
    });
    await expect(seloPublicoDoAnuncio("c")).resolves.toEqual(seloVazio());
  });

  it("cala-se também quando a chamada lança", async () => {
    from.mockImplementation(() => {
      throw new Error("sem rede");
    });
    await expect(seloPublicoDoAnuncio("c")).resolves.toEqual(seloVazio());
  });

  it("mas escreve no registo — a página não distingue, quem mantém tem de distinguir", async () => {
    base({ documentos: { data: null, error: { message: "boom" } } });
    await seloPublicoDoAnuncio("c");
    expect(erros.length).toBeGreaterThan(0);
  });

  it("uma falha de um lado não apaga o facto do outro", async () => {
    base({
      documentos: { data: null, error: { message: "boom" } },
      consulta: { data: { estado: "confirmado" }, error: null },
    });
    const selo = await seloPublicoDoAnuncio("c");
    expect(selo.documentacaoVerificada).toBe(false);
    expect(selo.registoConfirmadoNoStudBook).toBe(true);
  });

  it("sem id não se pergunta nada à base", async () => {
    base();
    await expect(seloPublicoDoAnuncio("")).resolves.toEqual(seloVazio());
    expect(from).not.toHaveBeenCalled();
  });
});

describe("seloDizAlgumaCoisa", () => {
  it("um selo que não afirma nada não vale a linha que ocupa", () => {
    expect(seloDizAlgumaCoisa(seloVazio())).toBe(false);
    expect(
      seloDizAlgumaCoisa({ documentacaoVerificada: true, registoConfirmadoNoStudBook: false })
    ).toBe(true);
    expect(
      seloDizAlgumaCoisa({ documentacaoVerificada: false, registoConfirmadoNoStudBook: true })
    ).toBe(true);
  });

  it("o `seloVazio` devolve um objecto novo de cada vez", () => {
    /* Se fosse partilhado, uma escrita numa ficha atravessava para outra. */
    const a = seloVazio();
    a.documentacaoVerificada = true;
    expect(seloVazio().documentacaoVerificada).toBe(false);
  });
});
