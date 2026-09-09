import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";

/**
 * O distintivo de mensagens por ler, medido.
 *
 * O número que interessa é o de **pedidos numa página parada**. Antes era um
 * `setInterval` de 60 segundos sem uma única condição: dez minutos abertos, dez
 * pedidos autenticados, também com o separador escondido. Este ficheiro conta-os.
 */

// ---------------------------------------------------------------------------
// Duplos
// ---------------------------------------------------------------------------

const estado = vi.hoisted(() => ({
  utilizador: null as { id: string } | null,
  porLer: 0,
  pedidos: 0,
  registos: [] as Array<{ event: string; cb: (p: { new?: Record<string, unknown> }) => void }>,
  anunciarEstado: null as ((e: string) => void) | null,
  canaisVivos: 0,
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: estado.utilizador, session: null, isLoading: false, signOut: vi.fn() }),
}));

vi.mock("@/lib/supabase-browser", () => ({
  createSupabaseBrowserClient: () => ({
    channel() {
      estado.canaisVivos += 1;
      const canal = {
        on(
          _t: string,
          filtro: { event: string },
          cb: (p: { new?: Record<string, unknown> }) => void
        ) {
          estado.registos.push({ event: filtro.event, cb });
          return canal;
        },
        subscribe(aoMudar?: (e: string) => void) {
          estado.anunciarEstado = (e: string) => aoMudar?.(e);
          return canal;
        },
      };
      return canal;
    },
    removeChannel() {
      estado.canaisVivos -= 1;
    },
  }),
}));

import { MensagensProvider, useMensagensPorLer } from "@/context/MensagensContext";

function Distintivo() {
  const { porLer, recarregar } = useMensagensPorLer();
  return (
    <>
      <span data-testid="por-ler">{porLer}</span>
      <button data-testid="recarregar" onClick={recarregar}>
        recarregar
      </button>
    </>
  );
}

function montar() {
  return render(
    <MensagensProvider>
      <Distintivo />
    </MensagensProvider>
  );
}

beforeEach(() => {
  estado.utilizador = { id: "11111111-1111-1111-1111-111111111111" };
  estado.porLer = 3;
  estado.pedidos = 0;
  estado.registos = [];
  estado.anunciarEstado = null;
  estado.canaisVivos = 0;

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      estado.pedidos += 1;
      return {
        ok: true,
        json: async () => ({ porLer: estado.porLer, entregues: 0 }),
      } as Response;
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("o distintivo em repouso", () => {
  /**
   * Dez minutos com a página aberta e parada. Antes: dez pedidos. Agora: o de
   * arranque, e o que a subscrição faz ao ficar de pé para fechar a janela
   * entre os dois.
   */
  it("dez minutos parados não fazem uma sondagem", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    montar();

    await waitFor(() => expect(screen.getByTestId("por-ler").textContent).toBe("3"));
    await act(async () => {
      estado.anunciarEstado?.("SUBSCRIBED");
      await vi.advanceTimersByTimeAsync(400);
    });

    const depoisDeLigar = estado.pedidos;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    });

    expect(estado.pedidos).toBe(depoisDeLigar);
    expect(depoisDeLigar).toBeLessThanOrEqual(2);
  });

  it("sem sessão não abre canal nenhum nem pede nada", async () => {
    estado.utilizador = null;
    montar();

    await act(async () => {});

    expect(estado.pedidos).toBe(0);
    expect(estado.canaisVivos).toBe(0);
    expect(screen.getByTestId("por-ler").textContent).toBe("0");
  });
});

describe("uma mensagem que chega", () => {
  it("sobe o distintivo na hora, sem esperar pelo servidor", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    montar();
    await waitFor(() => expect(screen.getByTestId("por-ler").textContent).toBe("3"));

    const insert = estado.registos.find((r) => r.event === "INSERT")!;
    act(() => {
      insert.cb({
        new: {
          id: "cccccccc-0000-0000-0000-000000000001",
          conversa_id: "bbbbbbbb-0000-0000-0000-000000000001",
          remetente_id: "22222222-2222-2222-2222-222222222222",
          created_at: "2026-09-09T10:00:00Z",
        },
      });
    });

    // Sem um único pedido pelo meio.
    expect(screen.getByTestId("por-ler").textContent).toBe("4");
  });

  /**
   * Uma rajada é uma pergunta, não cinco. E a pergunta não é dispensável: é
   * ela que marca as mensagens como entregues do lado do servidor.
   */
  it("cinco de seguida dão uma reconciliação só", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    montar();
    await waitFor(() => expect(screen.getByTestId("por-ler").textContent).toBe("3"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    const antes = estado.pedidos;

    const insert = estado.registos.find((r) => r.event === "INSERT")!;
    estado.porLer = 8;

    act(() => {
      for (let i = 0; i < 5; i++) {
        insert.cb({
          new: {
            id: `cccccccc-0000-0000-0000-00000000000${i}`,
            conversa_id: "bbbbbbbb-0000-0000-0000-000000000001",
            remetente_id: "22222222-2222-2222-2222-222222222222",
            created_at: "2026-09-09T10:00:00Z",
          },
        });
      }
    });

    expect(screen.getByTestId("por-ler").textContent).toBe("8");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(estado.pedidos).toBe(antes + 1);
    // E o número da rajada corrige-se para o do servidor.
    await waitFor(() => expect(screen.getByTestId("por-ler").textContent).toBe("8"));
  });
});

describe("pedir a contagem à mão", () => {
  /**
   * O `recarregar` é o que a caixa de mensagens chama depois de abrir uma
   * conversa. Se ele passasse por um estado nas dependências do efeito, cada
   * abertura desfazia a ligação e montava outra — um socket deitado fora para
   * pedir um número.
   */
  it("não desfaz a ligação", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    montar();
    await waitFor(() => expect(estado.canaisVivos).toBe(1));

    const registosAntes = estado.registos.length;
    const pedidosAntes = estado.pedidos;

    await act(async () => {
      screen.getByTestId("recarregar").click();
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(estado.canaisVivos).toBe(1);
    expect(estado.registos.length).toBe(registosAntes);
    expect(estado.pedidos).toBe(pedidosAntes + 1);
  });
});

describe("desmontar larga o socket", () => {
  it("não fica canal aberto por um ecrã que já não existe", async () => {
    const { unmount } = montar();
    await waitFor(() => expect(estado.canaisVivos).toBe(1));

    unmount();

    await waitFor(() => expect(estado.canaisVivos).toBe(0));
  });
});
