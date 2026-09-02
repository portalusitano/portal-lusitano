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
    // Como no cliente a sério: o construtor é «thenable», por isso um
    // `await ...insert(x)` sem `.select()` devolve `{ data, error }` — é assim
    // que a escrita da ascendência é feita, e sem isto um erro dela não se
    // conseguia simular.
    insert: (linha: Linha) => {
      if (insercoesQueFalham.has(tabela)) {
        const falha = { data: null, error: { message: `insert em ${tabela} falhou` } };
        return {
          select: () => ({ single: async () => falha }),
          then: (ok: (r: typeof falha) => unknown) => Promise.resolve(falha).then(ok),
        };
      }
      inseridos.push({ tabela, linha });
      const feito = { data: { id: `${tabela}-1`, ...linha }, error: null };
      return {
        select: () => ({ single: async () => feito }),
        then: (ok: (r: typeof feito) => unknown) => Promise.resolve(feito).then(ok),
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

/**
 * O formulário pede 99 campos e o anúncio guardava 19: as outras 80 respostas
 * paravam em `contact_submissions.form_data` e nunca chegavam a `cavalos_venda`.
 * Estes testes provam que agora chegam — e que chegam à coluna certa com a
 * forma certa, que é a metade que se parte em silêncio.
 *
 * A conversão em si está coberta campo a campo em
 * `__tests__/lib/anuncio-campos.test.ts`. O que se prova aqui é a ligação: que
 * o handler a chama, que o resultado entra no `insert`, e que não apaga nada do
 * que ele já escrevia.
 */
describe("handleCavaloAnuncio — os campos que ficavam pelo caminho", () => {
  /** O `form_data` de um vendedor que respondeu a tudo. */
  function respostaCompleta() {
    return {
      dataNascimento: "2018-04-12",
      racaConfirmada: "Lusitano",
      microchip: "620098100123456",
      peso: "512,5",
      nivelApsl: "Ouro",
      anosTreino: "7",
      usoAtual: ["Lazer", "Competição"],
      premios: "Campeão Nacional, 2023",
      videosUrl: "https://youtu.be/aaa",
      videosUrl2: "https://youtu.be/bbb",
      aceitaTroca: true,
      transporteIncluido: false,
      corOlhos: "Castanho",
      aptoCriancas: false,
      vacinacaoAtualizada: true,
      desparasitacaoAtualizada: false,
      exportacaoPossivel: true,
      precoCobricao: "800",
      tipoProprietario: "coudelaria",
      pai: "Rubi",
      paiRegisto: "PSL-1001",
      avoPaterno: "Zinque",
      avoPaternoRegisto: "PSL-2001",
      // Não devem chegar a uma tabela que qualquer pessoa lê.
      proprietarioNif: "123456789",
      proprietarioMorada: "Rua Direita 12, Golegã",
      nomeVeterinario: "Dr. Costa",
    };
  }

  it("escreve as colunas novas com o tipo da coluna", async () => {
    submissaoCom(respostaCompleta());
    await correr();
    const linha = linhaDe("cavalos_venda");
    expect(linha.data_nascimento).toBe("2018-04-12");
    expect(linha.raca).toBe("Lusitano");
    expect(linha.microchip).toBe("620098100123456");
    expect(linha.peso_kg).toBe(512.5);
    expect(linha.nivel_apsl).toBe("Ouro");
    expect(linha.anos_treino).toBe(7);
    expect(linha.uso_atual).toEqual(["Lazer", "Competição"]);
    expect(linha.premios).toEqual(["Campeão Nacional, 2023"]);
    expect(linha.vendedor_tipo).toBe("coudelaria");
  });

  it("guarda os dois vídeos, e não só o segundo", async () => {
    submissaoCom(respostaCompleta());
    await correr();
    const linha = linhaDe("cavalos_venda");
    expect(linha.video_url).toBe("https://youtu.be/aaa");
    expect(linha.video_url_2).toBe("https://youtu.be/bbb");
  });

  it("escreve nas duas colunas de condições que já existiam e nunca eram tocadas", async () => {
    submissaoCom(respostaCompleta());
    await correr();
    const linha = linhaDe("cavalos_venda");
    expect(linha.aceita_troca).toBe(true);
    expect(linha.transporte_incluido).toBe(false);
  });

  it("os blocos entram como objecto e não como string com JSON dentro", async () => {
    // O `jsonb` deste projecto já guardou strings duplamente codificadas por
    // causa de um `JSON.stringify` a mais, e isso parte leituras em silêncio.
    submissaoCom(respostaCompleta());
    await correr();
    const linha = linhaDe("cavalos_venda");
    for (const bloco of ["morfologia", "comportamento", "saude", "condicoes_venda"]) {
      expect(typeof linha[bloco], `${bloco} tem de ser objecto`).toBe("object");
      expect(linha[bloco]).not.toBeNull();
    }
    expect(linha.morfologia).toMatchObject({ cor_olhos: "Castanho" });
    expect(linha.condicoes_venda).toMatchObject({
      exportacao_possivel: true,
      preco_cobricao: 800,
    });
  });

  it("o `false` do vendedor chega como `false` e não como ausência", async () => {
    submissaoCom(respostaCompleta());
    await correr();
    const linha = linhaDe("cavalos_venda");
    const comportamento = linha.comportamento as Record<string, unknown>;
    const saude = linha.saude as Record<string, unknown>;
    expect(comportamento.apto_criancas).toBe(false);
    // As duas respostas que antes eram reduzidas a um E lógico em
    // `documentos_em_dia` e perdidas.
    expect(saude.vacinacao_atualizada).toBe(true);
    expect(saude.desparasitacao_atualizada).toBe(false);
  });

  it("não publica o NIF, a morada nem o nome do veterinário", async () => {
    // `cavalos_venda` é lida por qualquer pessoa quando `status = 'active'` e o
    // RLS do Postgres é por linha, não por coluna.
    submissaoCom(respostaCompleta());
    await correr();
    const serializada = JSON.stringify(linhaDe("cavalos_venda"));
    expect(serializada).not.toContain("123456789");
    expect(serializada).not.toContain("Rua Direita");
    expect(serializada).not.toContain("Dr. Costa");
  });

  it("continua a escrever o que já escrevia", async () => {
    // O espalhar dos campos novos vai por cima do objecto do `insert`: uma
    // chave repetida apagava em silêncio o que o handler tinha posto lá.
    submissaoCom({ ...respostaCompleta(), documentosEmDia: false });
    await correr();
    const linha = linhaDe("cavalos_venda");
    expect(linha.nome).toBe("Ulisses");
    expect(linha.preco).toBe(12000);
    expect(linha.vendedor_nome).toBe("Ana");
    expect(linha.vendedor_telefone).toBe("912345678");
    expect(linha.documentos_em_dia).toBe(false);
    expect(linha.status).toBe("pending");
    expect(linha.listing_tier).toBe("standard");
  });

  it("guarda a ascendência em linhas, com o caminho na árvore", async () => {
    submissaoCom(respostaCompleta());
    await correr();
    const linhas = linhaDe("cavalos_venda_ascendentes") as unknown as Array<
      Record<string, unknown>
    >;
    expect(linhas).toEqual([
      {
        cavalo_id: "cavalos_venda-1",
        caminho: "pai",
        geracao: 1,
        nome: "Rubi",
        registo: "PSL-1001",
      },
      {
        cavalo_id: "cavalos_venda-1",
        caminho: "pai.pai",
        geracao: 2,
        nome: "Zinque",
        registo: "PSL-2001",
      },
    ]);
  });

  it("sem ascendência preenchida não escreve linha nenhuma", async () => {
    submissaoCom({ documentosEmDia: true });
    await correr();
    expect(inseridos.some((i) => i.tabela === "cavalos_venda_ascendentes")).toBe(false);
  });

  it("uma ascendência que falhe não deita o webhook abaixo", async () => {
    // O anúncio já está inserido e o pagamento ainda não está registado. Como é
    // `payments.stripe_session_id` que a rota consulta para reconhecer uma
    // entrega repetida, um `throw` daqui faria o Stripe repetir e o anúncio
    // nascer duas vezes. Um pedigree por escrever é um defeito; um anúncio
    // duplicado numa conta paga é pior.
    submissaoCom(respostaCompleta());
    insercoesQueFalham.add("cavalos_venda_ascendentes");
    await expect(correr()).resolves.toBeUndefined();
    expect(linhaDe("payments").stripe_session_id).toBe("cs_test_1");
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
