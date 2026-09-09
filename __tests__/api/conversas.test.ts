import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * O que estes testes medem, e não só afirmam:
 *
 * 1. **Quantas conversas uma conta abre de seguida.** O número antes era 29 em
 *    29 pedidos — a varredura do directório inteiro em três segundos. Está
 *    aqui a correr, não escrito num comentário.
 * 2. **Quantas linhas o fio traz.** Antes trazia tudo; agora traz uma página.
 * 3. **O que sai no JSON.** Nenhum telefone, email ou WhatsApp, mesmo com a
 *    linha do anúncio a trazê-los.
 */

// ---------------------------------------------------------------------------
// Duplos
// ---------------------------------------------------------------------------

const estado = vi.hoisted(() => {
  const ref: {
    utilizador: { id: string; email: string; user_metadata: Record<string, unknown> } | null;
    resultados: Array<{ data?: unknown; error?: unknown; count?: number | null }>;
    porTabela: Map<string, Array<{ data?: unknown; error?: unknown; count?: number | null }>>;
    chamadasFrom: string[];
    filtros: string[];
    limites: number[];
  } = {
    utilizador: null,
    resultados: [],
    porTabela: new Map(),
    chamadasFrom: [],
    filtros: [],
    limites: [],
  };
  return ref;
});

function criarCadeia(resultado: { data?: unknown; error?: unknown; count?: number | null }) {
  const cadeia: Record<string, unknown> = {};
  for (const metodo of [
    "select",
    "eq",
    "neq",
    "in",
    "is",
    "order",
    "single",
    "maybeSingle",
    "insert",
    "update",
    "delete",
  ]) {
    cadeia[metodo] = vi.fn(() => cadeia);
  }
  cadeia.or = vi.fn((filtro: string) => {
    estado.filtros.push(filtro);
    return cadeia;
  });
  cadeia.limit = vi.fn((n: number) => {
    estado.limites.push(n);
    return cadeia;
  });
  cadeia.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(resultado).then(resolve, reject);
  return cadeia;
}

vi.mock("@/lib/supabase-admin", () => {
  const duplo = {
    from: vi.fn((tabela: string) => {
      estado.chamadasFrom.push(tabela);
      const fila = estado.porTabela.get(tabela);
      if (fila && fila.length > 0) return criarCadeia(fila.shift()!);
      return criarCadeia(estado.resultados.shift() ?? { data: [], error: null });
    }),
  };
  return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
});

vi.mock("@/lib/seller-auth", () => ({
  getAuthenticatedUser: vi.fn(async () => estado.utilizador),
}));

vi.mock("@/lib/chat-notificacoes", () => ({
  devoNotificar: vi.fn(async () => false),
  notificarNovaMensagem: vi.fn(async () => {}),
}));

import { POST as abrirConversa } from "@/app/api/conversas/route";
import { GET as lerFio } from "@/app/api/conversas/[id]/route";
import { GET as contarPorLer } from "@/app/api/conversas/por-ler/route";
import {
  MENSAGENS_POR_PAGINA,
  MAX_CONVERSAS_NOVAS_POR_MINUTO,
  linhasAPedir,
} from "@/lib/marketplace-chat";

// ---------------------------------------------------------------------------
// Ajudantes
// ---------------------------------------------------------------------------

const EU = "11111111-1111-1111-1111-111111111111";
const OUTRO = "22222222-2222-2222-2222-222222222222";
const CONVERSA = "bbbbbbbb-0000-0000-0000-000000000001";

function autenticar(id = EU) {
  estado.utilizador = { id, email: "comprador@exemplo.pt", user_metadata: { full_name: "Maria" } };
}

function paraTabela(
  tabela: string,
  ...resultados: Array<{ data?: unknown; error?: unknown; count?: number | null }>
) {
  estado.porTabela.set(tabela, resultados);
}

const CAVALO_ATIVO = {
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  user_id: OUTRO,
  status: "active",
  nome: "Zagalo",
  foto_principal: "/z.webp",
  preco: 18500,
  vendedor_nome: "Coudelaria da Ribeira",
  // As três colunas que a tabela verdadeira tem e que nunca podem sair.
  vendedor_telefone: "+351 912 345 678",
  vendedor_email: "vendedor@exemplo.pt",
  vendedor_whatsapp: "+351912345678",
};

function pedidoAbrir(cavaloId: string) {
  return new NextRequest("http://localhost:3000/api/conversas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cavaloId, mensagem: "Bom dia, ainda está disponível?" }),
  });
}

function pedidoFio(query = "") {
  return new NextRequest(`http://localhost:3000/api/conversas/${CONVERSA}${query}`);
}

const params = Promise.resolve({ id: CONVERSA });

function mensagensFalsas(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `cccccccc-0000-0000-0000-${String(i).padStart(12, "0")}`,
    corpo: `Mensagem ${i}`,
    remetente_id: i % 2 === 0 ? EU : OUTRO,
    lida_at: null,
    entregue_at: null,
    created_at: `2026-09-0${(i % 9) + 1}T10:00:00+00:00`,
  }));
}

beforeEach(() => {
  estado.utilizador = null;
  estado.resultados = [];
  estado.porTabela.clear();
  estado.chamadasFrom.length = 0;
  estado.filtros.length = 0;
  estado.limites.length = 0;
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Abuso
// ---------------------------------------------------------------------------

describe("uma conta nova não varre o directório", () => {
  /**
   * O cenário do relatório, à letra: vinte e nove pedidos seguidos, um por
   * vendedor. Cada um abre um anúncio diferente, portanto nenhum reaproveita
   * um fio existente — é a varredura, não uma conversa.
   *
   * Antes: 29 conversas abertas em 29 pedidos, e 29 emails.
   */
  it("vinte e nove pedidos seguidos abrem cinco conversas", async () => {
    autenticar(`ritmo-${Math.random()}`);

    let abertas = 0;
    let recusadas = 0;

    for (let i = 0; i < 29; i++) {
      const cavaloId = `aaaaaaaa-0000-0000-0000-${String(i).padStart(12, "0")}`;
      paraTabela("cavalos_venda", { data: { ...CAVALO_ATIVO, id: cavaloId }, error: null });
      paraTabela(
        "marketplace_conversas",
        // Não existe fio para este anúncio…
        { data: null, error: null },
        // …e a criação devolve um id novo.
        { data: { id: `${CONVERSA}-${i}` }, error: null }
      );
      paraTabela("marketplace_mensagens", { data: { id: "m1" }, error: null });

      const res = await abrirConversa(pedidoAbrir(cavaloId));
      if (res.status === 201) abertas += 1;
      if (res.status === 429) recusadas += 1;
    }

    expect(abertas).toBe(MAX_CONVERSAS_NOVAS_POR_MINUTO);
    expect(recusadas).toBe(29 - MAX_CONVERSAS_NOVAS_POR_MINUTO);
  });

  /**
   * O limite é sobre abrir fios, não sobre falar. Continuar uma conversa já
   * aberta passa pelo caminho que não conta para este limite — se um dia
   * contar, quem responde depressa a um vendedor leva com um 429.
   */
  it("continuar um fio já aberto não gasta o limite de conversas novas", async () => {
    autenticar(`ritmo-${Math.random()}`);

    let aceites = 0;
    for (let i = 0; i < 10; i++) {
      paraTabela("cavalos_venda", { data: CAVALO_ATIVO, error: null });
      paraTabela("marketplace_conversas", { data: { id: CONVERSA }, error: null });
      paraTabela("marketplace_mensagens", { data: { id: `m${i}` }, error: null });

      const res = await abrirConversa(pedidoAbrir(CAVALO_ATIVO.id));
      if (res.status === 201) aceites += 1;
    }

    expect(aceites).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Paginação
// ---------------------------------------------------------------------------

describe("o fio vem por páginas", () => {
  it("uma conversa de meses traz uma página, e diz que há mais", async () => {
    autenticar();
    paraTabela("marketplace_conversas", {
      data: {
        id: CONVERSA,
        cavalo_id: CAVALO_ATIVO.id,
        comprador_id: EU,
        vendedor_id: OUTRO,
        comprador_nome: "Maria",
        ultima_mensagem_at: "2026-09-09T10:00:00+00:00",
      },
      error: null,
    });
    // A base devolve `limite + 1` — é assim que a rota sabe que há mais.
    paraTabela("marketplace_mensagens", {
      data: mensagensFalsas(MENSAGENS_POR_PAGINA + 1),
      error: null,
    });
    paraTabela("cavalos_venda", { data: CAVALO_ATIVO, error: null });

    const res = await lerFio(pedidoFio(), { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.mensagens).toHaveLength(MENSAGENS_POR_PAGINA);
    expect(body.pagina.temMais).toBe(true);
    expect(typeof body.pagina.cursor).toBe("string");
    // Pedem-se mais do que se devolvem: uma a mais para saber que há mais, e
    // a margem de empate. Ver o `paginaDoFio`.
    expect(estado.limites).toContain(linhasAPedir(MENSAGENS_POR_PAGINA));
  });

  it("sem mais nada atrás, não há cursor para lado nenhum", async () => {
    autenticar();
    paraTabela("marketplace_conversas", {
      data: {
        id: CONVERSA,
        cavalo_id: CAVALO_ATIVO.id,
        comprador_id: EU,
        vendedor_id: OUTRO,
        ultima_mensagem_at: "2026-09-09T10:00:00+00:00",
      },
      error: null,
    });
    paraTabela("marketplace_mensagens", { data: mensagensFalsas(3), error: null });
    paraTabela("cavalos_venda", { data: CAVALO_ATIVO, error: null });

    const body = await (await lerFio(pedidoFio(), { params })).json();

    expect(body.pagina).toEqual({ temMais: false, cursor: null });
  });

  it("as mensagens saem por ordem de leitura, da mais antiga para a mais recente", async () => {
    autenticar();
    paraTabela("marketplace_conversas", {
      data: {
        id: CONVERSA,
        cavalo_id: CAVALO_ATIVO.id,
        comprador_id: EU,
        vendedor_id: OUTRO,
        ultima_mensagem_at: "2026-09-09T10:00:00+00:00",
      },
      error: null,
    });
    // A base devolve do mais recente para trás; a rota inverte.
    paraTabela("marketplace_mensagens", {
      data: [
        {
          id: "cccccccc-0000-0000-0000-000000000003",
          corpo: "terceira",
          remetente_id: EU,
          created_at: "2026-09-03T10:00:00+00:00",
        },
        {
          id: "cccccccc-0000-0000-0000-000000000002",
          corpo: "segunda",
          remetente_id: OUTRO,
          created_at: "2026-09-02T10:00:00+00:00",
        },
        {
          id: "cccccccc-0000-0000-0000-000000000001",
          corpo: "primeira",
          remetente_id: EU,
          created_at: "2026-09-01T10:00:00+00:00",
        },
      ],
      error: null,
    });
    paraTabela("cavalos_venda", { data: CAVALO_ATIVO, error: null });

    const body = await (await lerFio(pedidoFio(), { params })).json();

    expect(body.mensagens.map((m: { corpo: string }) => m.corpo)).toEqual([
      "primeira",
      "segunda",
      "terceira",
    ]);
  });

  it("um cursor fabricado à mão é recusado, não interpretado", async () => {
    autenticar();
    paraTabela("marketplace_conversas", {
      data: {
        id: CONVERSA,
        cavalo_id: CAVALO_ATIVO.id,
        comprador_id: EU,
        vendedor_id: OUTRO,
        ultima_mensagem_at: "2026-09-09T10:00:00+00:00",
      },
      error: null,
    });

    const res = await lerFio(pedidoFio("?antes=isto-nao-e-um-cursor"), { params });

    expect(res.status).toBe(400);
  });

  /**
   * Pedir as antigas não marca nada como lido: já foram lidas quando a
   * primeira página as trouxe. Sem esta distinção, rolar para trás numa
   * conversa era uma escrita por cada página.
   */
  it("só a primeira página marca como lida", async () => {
    autenticar();
    const conversa = {
      data: {
        id: CONVERSA,
        cavalo_id: CAVALO_ATIVO.id,
        comprador_id: EU,
        vendedor_id: OUTRO,
        ultima_mensagem_at: "2026-09-09T10:00:00+00:00",
      },
      error: null,
    };

    paraTabela("marketplace_conversas", conversa);
    paraTabela("marketplace_mensagens", { data: mensagensFalsas(3), error: null });
    paraTabela("cavalos_venda", { data: CAVALO_ATIVO, error: null });
    await lerFio(pedidoFio(), { params });
    const comPrimeiraPagina = estado.chamadasFrom.filter(
      (t) => t === "marketplace_mensagens"
    ).length;

    estado.chamadasFrom.length = 0;
    estado.porTabela.clear();
    const cursor = Buffer.from(
      "2026-09-01T10:00:00+00:00|cccccccc-0000-0000-0000-000000000001"
    ).toString("base64url");
    paraTabela("marketplace_conversas", conversa);
    paraTabela("marketplace_mensagens", { data: mensagensFalsas(3), error: null });
    paraTabela("cavalos_venda", { data: CAVALO_ATIVO, error: null });
    await lerFio(pedidoFio(`?antes=${cursor}`), { params });
    const comSegundaPagina = estado.chamadasFrom.filter(
      (t) => t === "marketplace_mensagens"
    ).length;

    // Uma leitura mais duas escritas contra uma leitura só.
    expect(comPrimeiraPagina).toBe(3);
    expect(comSegundaPagina).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Estados de entrega
// ---------------------------------------------------------------------------

describe("o estado do meio", () => {
  /**
   * «Entregue» quer dizer uma coisa só, e é a única que a base sabe provar: o
   * servidor **disse ao destinatário** que a mensagem existe. Este pedido é
   * exactamente esse momento — é o que o cliente faz quando o Realtime lhe
   * bate à porta —, e é por isso aqui que a marca se escreve.
   */
  it("contar as não lidas é o que marca como entregue", async () => {
    autenticar();
    paraTabela(
      "marketplace_mensagens",
      // A escrita da entrega devolve as que passaram a estar entregues…
      { data: [{ id: "m1" }, { id: "m2" }], error: null },
      // …e a contagem responde ao distintivo.
      { count: 4, error: null }
    );

    const body = await (await contarPorLer()).json();

    expect(body).toEqual({ porLer: 4, entregues: 2 });
  });

  /**
   * Uma pergunta só, e não duas. Antes eram: listar todas as conversas em que
   * participo e depois contar as mensagens dessas com um `IN (...)` — uma
   * lista de UUIDs por dentro do URL que crescia com a caixa de entrada.
   */
  it("a contagem não passa mais pela tabela das conversas", async () => {
    autenticar();
    paraTabela("marketplace_mensagens", { data: [], error: null }, { count: 0, error: null });

    await contarPorLer();

    expect(estado.chamadasFrom).not.toContain("marketplace_conversas");
  });

  /**
   * Encontrado a medir, não a pensar: contra o banco de ensaio a caixa de
   * entrada dizia 14 por ler e este pedido respondia 0, com as mesmas 14
   * linhas na base. A contagem exacta vem num cabeçalho, e um servidor que o
   * não mande devolve `count` a nulo — que um `?? 0` transforma em «não tem
   * mensagens». No ecrã isso é indistinguível da verdade.
   */
  it("um count que não veio não é um zero", async () => {
    autenticar();
    paraTabela(
      "marketplace_mensagens",
      { data: [], error: null }, // a marcação de entrega
      { count: null, error: null }, // o servidor não mandou a contagem
      { data: [{ id: "m1" }, { id: "m2" }, { id: "m3" }], error: null } // o recuo
    );

    const body = await (await contarPorLer()).json();

    expect(body.porLer).toBe(3);
  });

  it("um visitante anónimo tem zero, não um 401", async () => {
    const res = await contarPorLer();
    expect(res.status).toBe(200);
    expect((await res.json()).porLer).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// A promessa do produto
// ---------------------------------------------------------------------------

describe("a resposta não traz contactos de ninguém", () => {
  it("nem quando a linha do anúncio os traz todos", async () => {
    autenticar();
    paraTabela("marketplace_conversas", {
      data: {
        id: CONVERSA,
        cavalo_id: CAVALO_ATIVO.id,
        comprador_id: EU,
        vendedor_id: OUTRO,
        comprador_nome: "Maria",
        ultima_mensagem_at: "2026-09-09T10:00:00+00:00",
      },
      error: null,
    });
    paraTabela("marketplace_mensagens", { data: mensagensFalsas(2), error: null });
    paraTabela("cavalos_venda", { data: CAVALO_ATIVO, error: null });

    const res = await lerFio(pedidoFio(), { params });
    const cru = await res.text();

    for (const contacto of ["+351 912 345 678", "vendedor@exemplo.pt", "+351912345678"]) {
      expect(cru).not.toContain(contacto);
    }
    // Nem os identificadores das duas pessoas.
    expect(cru).not.toContain(EU);
    expect(cru).not.toContain(OUTRO);
  });

  /**
   * O `select` que vai à base não pede as colunas de contacto. Um teste sobre
   * a resposta apanharia o vazamento; este apanha a **intenção**, que é o que
   * muda primeiro quando alguém acrescenta um campo a um ecrã.
   */
  it("e nem sequer as pede à base", async () => {
    autenticar();
    paraTabela("marketplace_conversas", {
      data: {
        id: CONVERSA,
        cavalo_id: CAVALO_ATIVO.id,
        comprador_id: EU,
        vendedor_id: OUTRO,
        ultima_mensagem_at: "2026-09-09T10:00:00+00:00",
      },
      error: null,
    });
    paraTabela("marketplace_mensagens", { data: [], error: null });
    paraTabela("cavalos_venda", { data: CAVALO_ATIVO, error: null });

    await lerFio(pedidoFio(), { params });

    const { supabaseAdmin } = await import("@/lib/supabase-admin");
    const chamadas = (
      supabaseAdmin.from as unknown as {
        mock: { results: Array<{ value: Record<string, { mock: { calls: unknown[][] } }> }> };
      }
    ).mock.results;
    const selects = chamadas
      .flatMap((r) => r.value.select.mock.calls.flat())
      .filter((c) => typeof c === "string") as string[];

    expect(selects.length).toBeGreaterThan(0);
    for (const s of selects) {
      expect(s).not.toContain("telefone");
      expect(s).not.toContain("whatsapp");
      expect(s.includes("email")).toBe(false);
    }
  });
});
