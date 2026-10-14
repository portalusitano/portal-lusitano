import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * A varredura dos avisos de recusa que não saíram.
 *
 * Três promessas, e são as três contáveis:
 *
 * 1. **Não avisa quem já foi avisado.** A fila é filtrada por
 *    `aviso_recusa_em is null`, e é isso que impede um vendedor de receber o
 *    mesmo «o seu Livro Azul foi recusado» todas as manhãs.
 * 2. **Desiste ao fim de cinco tentativas.** Sem tecto, uma recusa que nunca
 *    pode ser avisada — o anúncio não nasceu, não há endereço — volta todos os
 *    dias para sempre, e por ser das mais antigas come o orçamento da passagem
 *    antes de ele chegar a uma recusa nova.
 * 3. **Uma linha que rebenta não leva as outras atrás.**
 */

const avisar = vi.fn();
const consulta = {
  select: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
  lt: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
};
let resposta: { data: unknown; error: unknown } = { data: [], error: null };

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: () => {
      const encadeia = new Proxy(consulta, {
        get(alvo, chave) {
          if (chave === "then") return undefined;
          const espia = alvo[chave as keyof typeof alvo];
          return (...args: unknown[]) => {
            espia(...args);
            return chave === "limit" ? Promise.resolve(resposta) : encadeia;
          };
        },
      });
      return encadeia;
    },
  },
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/cron-autorizado", () => ({ cronAutorizado: () => ({ ok: true }) }));
vi.mock("@/lib/aviso-documento-recusado", () => ({
  avisarDocumentoRecusado: (id: string) => avisar(id),
}));

import { GET } from "@/app/api/cron/avisos-de-recusa/route";

const pedido = () => new Request("http://localhost/api/cron/avisos-de-recusa") as never;

beforeEach(() => {
  vi.clearAllMocks();
  resposta = { data: [], error: null };
});

describe("a fila que se lê", () => {
  it("só olha para recusas por avisar que ainda não esgotaram as tentativas", async () => {
    await GET(pedido());

    expect(consulta.eq).toHaveBeenCalledWith("estado", "recusado");
    // Sem isto, um vendedor recebia o mesmo aviso todas as manhãs.
    expect(consulta.is).toHaveBeenCalledWith("aviso_recusa_em", null);
    expect(consulta.lt).toHaveBeenCalledWith("aviso_recusa_tentativas", 5);
  });

  it("põe quem nunca falhou à frente de quem já falhou", async () => {
    await GET(pedido());

    // A ordem importa: por tentativas primeiro. Ao contrário, as linhas
    // impossíveis de avisar — que são as mais antigas — ficavam à cabeça da
    // fila e comiam o tecto antes de ele chegar a uma recusa nova.
    expect(consulta.order.mock.calls[0]).toEqual(["aviso_recusa_tentativas", { ascending: true }]);
    expect(consulta.order.mock.calls[1]).toEqual(["criado_em", { ascending: true }]);
  });

  it("tem tecto por passagem", async () => {
    await GET(pedido());
    expect(consulta.limit).toHaveBeenCalledWith(50);
  });
});

describe("o que a passagem faz", () => {
  it("conta os que saíram e agrupa por razão os que não", async () => {
    resposta = { data: [{ id: "a" }, { id: "b" }, { id: "c" }], error: null };
    avisar
      .mockResolvedValueOnce({ enviado: true })
      .mockResolvedValueOnce({ enviado: false, razao: "sem-endereco" })
      .mockResolvedValueOnce({ enviado: false, razao: "sem-endereco" });

    const corpo = await (await GET(pedido())).json();

    expect(corpo).toEqual({ naFila: 3, enviados: 1, porRazao: { "sem-endereco": 2 } });
  });

  it("uma linha que rebenta não leva as outras atrás", async () => {
    resposta = { data: [{ id: "a" }, { id: "b" }], error: null };
    avisar.mockRejectedValueOnce(new Error("o mundo ardeu")).mockResolvedValueOnce({
      enviado: true,
    });

    const corpo = await (await GET(pedido())).json();

    expect(corpo.enviados).toBe(1);
    expect(corpo.porRazao.excepcao).toBe(1);
    expect(avisar).toHaveBeenCalledTimes(2);
  });

  it("uma fila vazia é um dia bom, e não um erro", async () => {
    const r = await GET(pedido());
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ naFila: 0, enviados: 0, porRazao: {} });
    expect(avisar).not.toHaveBeenCalled();
  });

  it("uma leitura falhada responde 500 em vez de fingir uma passagem limpa", async () => {
    resposta = { data: null, error: { message: "a base não respondeu" } };
    const r = await GET(pedido());
    expect(r.status).toBe(500);
    expect(avisar).not.toHaveBeenCalled();
  });
});
