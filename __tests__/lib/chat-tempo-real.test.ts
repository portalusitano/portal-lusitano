import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ligarAoChat,
  recuoNaTentativa,
  RECUO_MS,
  type CanalTempoReal,
  type ClienteTempoReal,
} from "@/lib/chat/tempo-real";

/**
 * O que estes testes afirmam é a política, não a biblioteca.
 *
 * O Realtime da Supabase não corre aqui — não há projecto alcançável a partir
 * deste ambiente — e por isso não se mede aqui a latência do serviço deles. O
 * que **se** mede é o nosso lado da promessa, que é onde estava o defeito:
 * quantos pedidos se fazem em repouso, o que acontece com o separador
 * escondido, e o que se faz quando o socket não abre.
 */

// ---------------------------------------------------------------------------
// Duplos
// ---------------------------------------------------------------------------

interface Registo {
  filtro: { event: string; table: string; filter?: string };
  cb: (p: { new?: Record<string, unknown> }) => void;
}

function criarCliente() {
  const canais: Array<{ nome: string; registos: Registo[]; removido: boolean }> = [];
  let anunciarEstado: ((estado: string) => void) | null = null;

  const cliente: ClienteTempoReal = {
    channel(nome: string) {
      const registos: Registo[] = [];
      const entrada = { nome, registos, removido: false };
      canais.push(entrada);

      const canal: CanalTempoReal = {
        on(_tipo, filtro, cb) {
          registos.push({ filtro, cb });
          return canal;
        },
        subscribe(aoMudarEstado) {
          anunciarEstado = (estado: string) => aoMudarEstado?.(estado);
          return canal;
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (entrada as any).canal = canal;
      return canal;
    },
    removeChannel(canal) {
      const entrada = canais.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c) => (c as any).canal === canal
      );
      if (entrada) entrada.removido = true;
    },
  };

  return {
    cliente,
    canais,
    ligar: () => anunciarEstado?.("SUBSCRIBED"),
    falhar: () => anunciarEstado?.("CHANNEL_ERROR"),
    emitir(evento: "INSERT" | "UPDATE", linha: Record<string, unknown>) {
      const vivo = canais.filter((c) => !c.removido);
      for (const c of vivo) {
        for (const r of c.registos) {
          if (r.filtro.event === evento) r.cb({ new: linha });
        }
      }
    },
  };
}

function montar(sobrepor: Partial<Parameters<typeof ligarAoChat>[0]> = {}) {
  const duplo = criarCliente();
  const chegadas: unknown[] = [];
  const estados: unknown[] = [];
  const reconciliacoes = { total: 0 };
  const agendados: Array<{ id: number; fn: () => void; ms: number }> = [];
  let proximoId = 1;
  let visivel = true;
  let avisarVisibilidade: (() => void) | null = null;

  const ligacao = ligarAoChat({
    utilizadorId: "11111111-1111-1111-1111-111111111111",
    cliente: async () => duplo.cliente,
    aoChegar: (m) => chegadas.push(m),
    aoMudarEstado: (m) => estados.push(m),
    aoReconciliar: () => {
      reconciliacoes.total += 1;
    },
    estaVisivel: () => visivel,
    ouvirVisibilidade: (aoMudar) => {
      avisarVisibilidade = aoMudar;
      return () => {
        avisarVisibilidade = null;
      };
    },
    agendar: (fn, ms) => {
      const id = proximoId++;
      agendados.push({ id, fn, ms });
      return id;
    },
    cancelar: (id) => {
      const i = agendados.findIndex((a) => a.id === id);
      if (i >= 0) agendados.splice(i, 1);
    },
    ...sobrepor,
  });

  return {
    ligacao,
    duplo,
    chegadas,
    estados,
    reconciliacoes,
    agendados,
    esconder() {
      visivel = false;
      avisarVisibilidade?.();
    },
    mostrar() {
      visivel = true;
      avisarVisibilidade?.();
    },
    /** Corre o temporizador pendente, como um relógio faria. */
    correrRelogio() {
      const pendentes = agendados.splice(0, agendados.length);
      for (const a of pendentes) a.fn();
    },
  };
}

// ---------------------------------------------------------------------------

describe("em repouso não se faz trabalho nenhum", () => {
  /**
   * O número que isto fixa é **zero**, e é a diferença face ao que aqui
   * estava: um `setInterval` de 60 segundos sem uma única condição, ou seja
   * 60 pedidos autenticados por hora numa página parada, e a correr também com
   * o separador escondido.
   */
  it("uma página ligada e parada não agenda nem pede nada", async () => {
    const t = montar();
    await vi.waitFor(() => expect(t.duplo.canais.length).toBe(1));
    t.duplo.ligar();

    // A reconciliação da ligação é uma, e é a que fecha a janela entre o
    // último pedido e a subscrição ficar de pé.
    expect(t.reconciliacoes.total).toBe(1);
    expect(t.agendados).toHaveLength(0);
  });

  it("com o separador escondido larga o socket e não agenda nada", async () => {
    const t = montar();
    await vi.waitFor(() => expect(t.duplo.canais.length).toBe(1));
    t.duplo.ligar();

    t.esconder();

    expect(t.ligacao.estado()).toBe("escondida");
    expect(t.duplo.canais.every((c) => c.removido)).toBe(true);
    expect(t.agendados).toHaveLength(0);
  });

  it("não abre socket nenhum numa página que nunca chega a estar visível", async () => {
    const t = montar({ estaVisivel: () => false });
    await Promise.resolve();
    expect(t.duplo.canais).toHaveLength(0);
    expect(t.ligacao.estado()).toBe("escondida");
  });
});

describe("o que chega, chega", () => {
  /**
   * Quem reconcilia depois de uma chegada é quem chamou — o contexto —, e não
   * este módulo: é lá que a rajada se junta num pedido só. Aqui fixa-se a
   * fronteira, para que ninguém acrescente um segundo pedido a este lado sem
   * dar por isso.
   */
  it("uma mensagem para mim avisa quem estiver a ouvir, e mais nada", async () => {
    const t = montar();
    await vi.waitFor(() => expect(t.duplo.canais.length).toBe(1));
    t.duplo.ligar();
    const antes = t.reconciliacoes.total;

    t.duplo.emitir("INSERT", {
      id: "cccccccc-0000-0000-0000-000000000001",
      conversa_id: "bbbbbbbb-0000-0000-0000-000000000001",
      remetente_id: "22222222-2222-2222-2222-222222222222",
      created_at: "2026-09-09T10:00:00Z",
    });

    expect(t.chegadas).toEqual([
      {
        id: "cccccccc-0000-0000-0000-000000000001",
        conversaId: "bbbbbbbb-0000-0000-0000-000000000001",
        remetenteId: "22222222-2222-2222-2222-222222222222",
        createdAt: "2026-09-09T10:00:00Z",
      },
    ]);
    expect(t.reconciliacoes.total).toBe(antes);
    expect(t.agendados).toHaveLength(0);
  });

  it("o estado das minhas mensagens vem por um segundo registo", async () => {
    const t = montar();
    await vi.waitFor(() => expect(t.duplo.canais.length).toBe(1));
    t.duplo.ligar();

    t.duplo.emitir("UPDATE", {
      id: "cccccccc-0000-0000-0000-000000000001",
      conversa_id: "bbbbbbbb-0000-0000-0000-000000000001",
    });

    expect(t.estados).toHaveLength(1);
  });

  /**
   * O filtro é economia e não segurança — quem decide é a RLS —, mas se ele
   * desaparecer o servidor passa a avaliar a política de toda a gente ligada
   * contra todas as mensagens do site. Fica fixado.
   */
  it("subscreve-se o que me é dirigido e o que eu escrevi, e não a tabela toda", async () => {
    const t = montar();
    await vi.waitFor(() => expect(t.duplo.canais.length).toBe(1));

    const filtros = t.duplo.canais[0].registos.map((r) => r.filtro);
    expect(filtros).toHaveLength(2);
    expect(filtros[0].filter).toBe("destinatario_id=eq.11111111-1111-1111-1111-111111111111");
    expect(filtros[1].filter).toBe("remetente_id=eq.11111111-1111-1111-1111-111111111111");
    expect(filtros.every((f) => f.table === "marketplace_mensagens")).toBe(true);
  });
});

describe("voltar ao separador", () => {
  /**
   * O que se perdeu enquanto o separador esteve escondido não vem por evento
   * nenhum: o socket estava fechado. Por isso a reconciliação corre **antes**
   * de a subscrição voltar a estar de pé, e não depois.
   */
  it("reconcilia ao regressar, sem esperar pela subscrição", async () => {
    const t = montar();
    await vi.waitFor(() => expect(t.duplo.canais.length).toBe(1));
    t.duplo.ligar();
    t.esconder();

    const antes = t.reconciliacoes.total;
    t.mostrar();

    expect(t.reconciliacoes.total).toBe(antes + 1);
    await vi.waitFor(() => expect(t.duplo.canais.filter((c) => !c.removido).length).toBe(1));
  });
});

describe("a rede de recurso", () => {
  /**
   * Sem isto, quem estiver atrás de um intermediário que corte WebSockets fica
   * com um chat que nunca se actualiza e sem nada no ecrã a dizê-lo — que é
   * pior do que a espera de um minuto que havia antes.
   */
  it("o canal a falhar acende a sondagem, com recuo", async () => {
    const t = montar();
    await vi.waitFor(() => expect(t.duplo.canais.length).toBe(1));

    t.duplo.falhar();

    expect(t.ligacao.estado()).toBe("a-sondar");
    expect(t.agendados).toHaveLength(1);
    expect(t.agendados[0].ms).toBe(RECUO_MS[0]);
  });

  it("a sondagem também pára com o separador escondido", async () => {
    const t = montar();
    await vi.waitFor(() => expect(t.duplo.canais.length).toBe(1));
    t.duplo.falhar();
    expect(t.agendados).toHaveLength(1);

    t.esconder();

    expect(t.agendados).toHaveLength(0);
  });

  it("o recuo cresce e depois estabiliza", () => {
    expect(recuoNaTentativa(0)).toBe(5_000);
    expect(recuoNaTentativa(1)).toBe(15_000);
    expect(recuoNaTentativa(2)).toBe(30_000);
    expect(recuoNaTentativa(3)).toBe(60_000);
    expect(recuoNaTentativa(9)).toBe(60_000);
    expect(recuoNaTentativa(-1)).toBe(5_000);
  });

  it("sem cliente nenhum não fica calada — sonda", async () => {
    const t = montar({ cliente: async () => null });
    await vi.waitFor(() => expect(t.agendados.length).toBe(1));
    expect(t.ligacao.estado()).toBe("a-sondar");
  });
});

describe("parar larga tudo", () => {
  it("nem socket, nem temporizador, nem ouvinte", async () => {
    const t = montar();
    await vi.waitFor(() => expect(t.duplo.canais.length).toBe(1));
    t.duplo.falhar();
    expect(t.agendados).toHaveLength(1);

    t.ligacao.parar();

    expect(t.agendados).toHaveLength(0);
    expect(t.duplo.canais.every((c) => c.removido)).toBe(true);
    expect(t.ligacao.estado()).toBe("parada");
  });

  /**
   * A corrida que isto fixa: entre pedir o cliente (importação dinâmica) e
   * recebê-lo, o componente pode ter saído. Sem a verificação, ficava um
   * socket aberto por um ecrã que já não existe.
   */
  it("um cliente que chega depois de parar não abre nada", async () => {
    const duplo = criarCliente();
    let resolver: (c: ClienteTempoReal) => void = () => {};
    const promessa = new Promise<ClienteTempoReal>((r) => {
      resolver = r;
    });

    const t = montar({ cliente: () => promessa });
    t.ligacao.parar();
    resolver(duplo.cliente);
    await promessa;
    await Promise.resolve();

    expect(duplo.canais).toHaveLength(0);
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});
