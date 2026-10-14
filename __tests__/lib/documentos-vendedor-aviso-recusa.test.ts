/**
 * O aviso de que um documento foi recusado.
 *
 * Antes disto não havia nada: o motivo ficava gravado na base e o vendedor
 * ficava à espera para sempre. Recusar em silêncio é pior do que não rever —
 * quem não sabe que foi recusado não corrige, e o anúncio morre sem ninguém
 * lhe dizer porquê.
 *
 * O que estes testes guardam:
 *
 * 1. **O motivo vai no corpo, tal como foi escrito.** É a única coisa que diz
 *    ao vendedor o que reenviar; resumi-lo é tirar-lho.
 * 2. **Não sai um aviso sobre um documento que não está recusado**, nem sobre
 *    uma recusa sem motivo.
 * 3. **Nenhum prazo.** Não há fila com prazo nem nada que a percorra sozinha.
 * 4. O texto do motivo entra em HTML e por isso vai escapado.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.RESEND_API_KEY = "re_teste";
process.env.NEXT_PUBLIC_APP_URL = "https://portal-lusitano.pt";
// O rodapé do modelo da casa assina o link de cancelar subscrição; sem este
// segredo o modelo lança ao ser composto.
process.env.ADMIN_SECRET = process.env.ADMIN_SECRET || "segredo-de-teste";

const estado = vi.hoisted(() => ({
  documento: null as Record<string, unknown> | null,
  anuncio: null as Record<string, unknown> | null,
  erroDocumento: null as { message: string } | null,
  falharEnvio: false,
  enviados: [] as Array<Record<string, unknown>>,
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (mensagem: Record<string, unknown>) => {
        if (estado.falharEnvio) throw new Error("serviço em baixo");
        estado.enviados.push(mensagem);
        return { data: { id: "email-1" } };
      },
    };
  },
}));

vi.mock("@/lib/supabase-admin", () => {
  const cadeia = (tabela: string) => {
    const alvo: Record<string, unknown> = {
      maybeSingle: async () =>
        tabela === "documentos_cavalo"
          ? { data: estado.documento, error: estado.erroDocumento }
          : { data: estado.anuncio, error: null },
    };
    for (const m of ["select", "eq", "in", "order", "update"]) alvo[m] = () => alvo;
    return alvo;
  };
  const duplo = { from: (tabela: string) => cadeia(tabela), storage: { from: vi.fn() } };
  return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
});

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { avisarDocumentoRecusado } from "@/lib/aviso-documento-recusado";

const ID = "11111111-2222-4333-8444-555555555555";
const CAVALO = "aaaaaaaa-0000-4000-8000-000000000001";
const MOTIVO = "A digitalização corta a página do meio. Falta o número de registo.";

const corpo = () => String(estado.enviados[0]?.html ?? "");

beforeEach(() => {
  estado.documento = {
    id: ID,
    cavalo_id: CAVALO,
    tipo: "livro_azul",
    estado: "recusado",
    motivo_recusa: MOTIVO,
  };
  estado.anuncio = { id: CAVALO, nome: "Ícaro", vendedor_email: "vendedor@exemplo.pt" };
  estado.erroDocumento = null;
  estado.falharEnvio = false;
  estado.enviados = [];
});

describe("quando sai", () => {
  it("envia para o endereço do anúncio, com o cavalo e o documento no assunto", async () => {
    const r = await avisarDocumentoRecusado(ID);
    expect(r).toEqual({ enviado: true });
    expect(estado.enviados).toHaveLength(1);
    expect(estado.enviados[0].to).toEqual(["vendedor@exemplo.pt"]);
    expect(String(estado.enviados[0].subject)).toContain("Livro Azul");
    expect(String(estado.enviados[0].subject)).toContain("Ícaro");
  });

  it("o motivo vai no corpo tal como foi escrito", async () => {
    await avisarDocumentoRecusado(ID);
    expect(corpo()).toContain(MOTIVO);
  });

  it("as quebras de linha do motivo sobrevivem", async () => {
    estado.documento = { ...estado.documento!, motivo_recusa: "Primeira linha.\nSegunda linha." };
    await avisarDocumentoRecusado(ID);
    expect(corpo()).toContain("Primeira linha.<br>Segunda linha.");
  });

  it("um motivo com HTML lá dentro é texto, não marcação", async () => {
    estado.documento = {
      ...estado.documento!,
      motivo_recusa: '<img src=x onerror="alert(1)">',
    };
    await avisarDocumentoRecusado(ID);
    expect(corpo()).not.toContain("<img");
    expect(corpo()).toContain("&lt;img");
  });

  it("aponta o caminho para enviar outro ficheiro", async () => {
    await avisarDocumentoRecusado(ID);
    expect(corpo()).toContain("/minha-conta/documentos");
  });

  it("não promete prazo nenhum", async () => {
    await avisarDocumentoRecusado(ID);
    const texto = corpo() + String(estado.enviados[0].subject);
    for (const padrao of [/24\s*h/i, /\bhoras\b/i, /dias úteis/i, /em breve/i, /brevemente/i]) {
      expect(padrao.test(texto), `«${padrao}» no aviso`).toBe(false);
    }
  });

  it("não diz que o documento foi aprovado nem verificado", async () => {
    await avisarDocumentoRecusado(ID);
    const texto = corpo().toLowerCase();
    expect(texto).not.toContain("aprovado");
    expect(texto).not.toContain("verificámos");
  });
});

describe("quando não sai, e porquê", () => {
  it("não existe documento nenhum", async () => {
    estado.documento = null;
    expect(await avisarDocumentoRecusado(ID)).toEqual({
      enviado: false,
      razao: "sem-documento",
    });
    expect(estado.enviados).toHaveLength(0);
  });

  it("o documento não está recusado — quem chama pode estar atrasado", async () => {
    estado.documento = { ...estado.documento!, estado: "em_revisao", motivo_recusa: null };
    expect(await avisarDocumentoRecusado(ID)).toEqual({ enviado: false, razao: "nao-recusado" });
    expect(estado.enviados).toHaveLength(0);
  });

  it("uma recusa sem motivo não gera um aviso que não explica nada", async () => {
    estado.documento = { ...estado.documento!, motivo_recusa: "   " };
    expect(await avisarDocumentoRecusado(ID)).toEqual({ enviado: false, razao: "sem-motivo" });
    expect(estado.enviados).toHaveLength(0);
  });

  it("um documento sem anúncio não tem a quem ser enviado", async () => {
    // Subiu antes de o pagamento existir: não há anúncio, não há conta, e a
    // referência não traz endereço nenhum.
    estado.documento = { ...estado.documento!, cavalo_id: null };
    expect(await avisarDocumentoRecusado(ID)).toEqual({ enviado: false, razao: "sem-anuncio" });
  });

  it("um anúncio sem endereço de e-mail", async () => {
    estado.anuncio = { id: CAVALO, nome: "Ícaro", vendedor_email: null };
    expect(await avisarDocumentoRecusado(ID)).toEqual({ enviado: false, razao: "sem-endereco" });
  });

  it("o serviço de e-mail em baixo é dito, não engolido", async () => {
    estado.falharEnvio = true;
    expect(await avisarDocumentoRecusado(ID)).toEqual({
      enviado: false,
      razao: "falha-no-envio",
    });
  });

  it("um tipo fora do contrato não trava o aviso — o que interessa é o motivo", async () => {
    estado.documento = { ...estado.documento!, tipo: "certidao" };
    const r = await avisarDocumentoRecusado(ID);
    expect(r).toEqual({ enviado: true });
    expect(corpo()).toContain(MOTIVO);
  });
});
