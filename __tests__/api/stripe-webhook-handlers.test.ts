import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

/**
 * O que o handler do webhook do Stripe escreve na base de dados.
 *
 * Corre depois de o dinheiro entrar e é a única coisa entre o pagamento e o
 * anúncio publicado. Não tinha teste nenhum. Dois defeitos que estes testes
 * fixam:
 *
 * 1. `documentos_em_dia: formData.documentosEmDia || true` publicava sempre
 *    «documentos em dia», mesmo quando o vendedor respondeu que não.
 * 2. `registerPayment` devolvia a resposta do Supabase e o chamador só
 *    desembrulhava o `data`: uma escrita falhada em `payments` passava em
 *    silêncio — e é `payments.stripe_session_id` que a rota do webhook consulta
 *    para reconhecer entregas repetidas.
 */

type Linha = Record<string, unknown>;

const inseridos: Array<{ tabela: string; linha: Linha }> = [];
const submissoes = new Map<string, Linha>();
/** Tabelas cujo `insert` deve devolver erro, para simular uma escrita falhada. */
const insercoesQueFalham = new Set<string>();

function construirCliente() {
  const from = (tabela: string) => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: submissoes.get(tabela) ?? null, error: null }),
        maybeSingle: async () => ({ data: submissoes.get(tabela) ?? null, error: null }),
      }),
    }),
    insert: (linha: Linha) => {
      if (insercoesQueFalham.has(tabela)) {
        const falha = { data: null, error: { message: `insert em ${tabela} falhou` } };
        return { select: () => ({ single: async () => falha }) };
      }
      inseridos.push({ tabela, linha });
      return {
        select: () => ({
          single: async () => ({ data: { id: `${tabela}-1`, ...linha }, error: null }),
        }),
      };
    },
    update: () => ({ eq: async () => ({ data: null, error: null }) }),
  });
  return { from: vi.fn(from) };
}

const cliente = construirCliente();

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: cliente,
  supabase: cliente,
  supabasePublic: cliente,
}));

vi.mock("@/lib/resend", () => ({
  resend: { emails: { send: vi.fn().mockResolvedValue({ id: "email-1" }) } },
  getCavaloAnuncioConfirmEmail: () => "<p>ok</p>",
}));

function sessao(): Stripe.Checkout.Session {
  return {
    id: "cs_test_1",
    amount_total: 4900,
    currency: "eur",
    customer: "cus_1",
    payment_intent: "pi_1",
    customer_details: { email: "vendedor@exemplo.pt" },
  } as unknown as Stripe.Checkout.Session;
}

function submissaoCom(extra: Linha) {
  submissoes.set("contact_submissions", {
    id: "sub-1",
    form_data: {
      nomeCavalo: "Ulisses",
      preco: 12000,
      proprietarioNome: "Ana",
      proprietarioTelefone: "912345678",
      ...extra,
    },
  });
}

function linhaDe(tabela: string): Linha {
  const encontrada = inseridos.find((i) => i.tabela === tabela);
  if (!encontrada) throw new Error(`nada foi inserido em ${tabela}`);
  return encontrada.linha;
}

async function correr() {
  const { handleCavaloAnuncio } = await import("@/app/api/stripe/webhook/handlers/checkout-cavalo");
  return handleCavaloAnuncio(sessao(), {
    contact_submission_id: "sub-1",
    tier: "standard",
  } as Stripe.Metadata);
}

beforeEach(() => {
  inseridos.length = 0;
  submissoes.clear();
  insercoesQueFalham.clear();
});

describe("handleCavaloAnuncio", () => {
  it("guarda a resposta do vendedor sobre os documentos, e não um `true` fixo", async () => {
    submissaoCom({ documentosEmDia: false });
    await correr();
    expect(linhaDe("cavalos_venda").documentos_em_dia).toBe(false);
  });

  it("mantém o `true` quando o vendedor diz que estão em dia", async () => {
    submissaoCom({ documentosEmDia: true });
    await correr();
    expect(linhaDe("cavalos_venda").documentos_em_dia).toBe(true);
  });

  it("regista o pagamento com a sessão do Stripe", async () => {
    submissaoCom({ documentosEmDia: true });
    await correr();
    const pagamento = linhaDe("payments");
    expect(pagamento.stripe_session_id).toBe("cs_test_1");
    expect(pagamento.product_type).toBe("cavalo_anuncio");
  });
});

describe("registerPayment", () => {
  it("rebenta quando a linha de pagamento não é gravada", async () => {
    submissaoCom({ documentosEmDia: true });
    insercoesQueFalham.add("payments");

    // Sem isto a falha ficava engolida: o cavalo entrava, o pagamento não, e a
    // guarda de duplicados do webhook — que procura `stripe_session_id` em
    // `payments` — deixava de reconhecer a entrega repetida do mesmo evento,
    // inserindo um segundo cavalo pelo mesmo pagamento.
    await expect(correr()).rejects.toThrow(/register payment/i);
  });
});
