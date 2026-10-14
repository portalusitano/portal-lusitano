/**
 * O painel que o vendedor lê.
 *
 * A falha que motivou este trabalho não foi um erro de lógica: foi um **visto
 * verde** ao anexar um ficheiro, a afirmar uma verificação que ninguém tinha
 * feito. Estes testes existem para que essa afirmação não volte por outra
 * porta — um estado neutro pintado de bom, ou um «recebido» reescrito como «em
 * análise» por parecer melhor.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/supabase-admin", () => {
  const duplo = { from: vi.fn(), storage: { from: vi.fn() } };
  return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
});

vi.mock("@/components/LocalizedLink", () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

const avisos: Array<{ tipo: string; texto: string }> = [];
vi.mock("@/context/ToastContext", () => ({
  useToast: () => ({
    showToast: (tipo: string, texto: string) => avisos.push({ tipo, texto }),
  }),
}));

import DocumentosContent from "@/components/minha-conta/DocumentosContent";

const CAVALO = "aaaaaaaa-0000-4000-8000-000000000001";

function documento(extra: Record<string, unknown> = {}) {
  return {
    id: "doc-1",
    anuncioId: CAVALO,
    tipo: "livro_azul",
    nomeDoTipo: "Livro Azul",
    estado: "por_verificar",
    criadoEm: "2026-09-01T10:00:00.000Z",
    decididoEm: null,
    motivoRecusa: null,
    nomeOriginal: "livro azul.pdf",
    mime: "application/pdf",
    bytes: 2048,
    substituido: false,
    ...extra,
  };
}

function responder(documentos: Array<Record<string, unknown>>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ anuncios: [{ id: CAVALO, nome: "Ícaro", documentos }] }),
    }))
  );
}

beforeEach(() => {
  avisos.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("o que o painel afirma", () => {
  it("um documento recebido diz que ainda não foi revisto, e não «em análise»", async () => {
    responder([documento()]);
    render(<DocumentosContent />);

    await screen.findByText("Recebido. Ainda não foi revisto.");
    expect(screen.queryByText(/an[áa]lise/i)).toBeNull();
    // Nenhuma marca positiva sobre o que ninguém viu.
    expect(screen.queryByText("Verificado")).toBeNull();
  });

  it("só o verificado leva o distintivo", async () => {
    responder([documento({ estado: "verificado", decididoEm: "2026-09-04T10:00:00.000Z" })]);
    render(<DocumentosContent />);

    await screen.findByText("Verificado por nós.");
    expect(screen.getByText("Verificado")).toBeInTheDocument();
  });

  it("uma recusa mostra o motivo tal como foi escrito e o caminho para enviar outro", async () => {
    responder([
      documento({
        estado: "recusado",
        motivoRecusa: "A digitalização corta a página do meio.",
        decididoEm: "2026-09-03T10:00:00.000Z",
      }),
    ]);
    render(<DocumentosContent />);

    await screen.findByText("A digitalização corta a página do meio.");
    expect(screen.getByRole("button", { name: /enviar outro ficheiro/i })).toBeInTheDocument();
  });

  it("uma recusa já substituída não volta a pedir outro ficheiro", async () => {
    responder([
      documento({ estado: "recusado", motivoRecusa: "ilegível", substituido: true }),
      documento({ id: "doc-2", criadoEm: "2026-09-05T10:00:00.000Z" }),
    ]);
    render(<DocumentosContent />);

    await screen.findByText("ilegível");
    expect(screen.queryByRole("button", { name: /enviar outro ficheiro/i })).toBeNull();
    expect(screen.getByText(/já enviou outro ficheiro para este documento/i)).toBeInTheDocument();
  });

  it("nenhum estado promete um prazo", async () => {
    responder([
      documento({ id: "a", estado: "por_verificar" }),
      documento({ id: "b", estado: "em_revisao" }),
      documento({ id: "c", estado: "verificado" }),
      documento({ id: "d", estado: "recusado", motivoRecusa: "ilegível" }),
    ]);
    const { container } = render(<DocumentosContent />);
    await screen.findByText("Está a ser revisto.");

    const texto = container.textContent ?? "";
    for (const padrao of [/24\s*h/i, /\bhoras\b/i, /dias úteis/i, /em breve/i, /brevemente/i]) {
      expect(padrao.test(texto), `«${padrao}» no painel`).toBe(false);
    }
  });

  it("o ficheiro abre-se pelo nosso endereço, nunca por um do armazenamento", async () => {
    responder([documento()]);
    render(<DocumentosContent />);

    const ligacao = await screen.findByRole("link", { name: /ver o ficheiro/i });
    expect(ligacao).toHaveAttribute("href", "/api/meus-anuncios/documentos/doc-1/ficheiro");
  });

  it("um anúncio sem documentos diz que não recebemos nada — e não fica calado", async () => {
    responder([]);
    render(<DocumentosContent />);

    await waitFor(() =>
      expect(
        screen.getByText("Não recebemos nenhum documento para este anúncio.")
      ).toBeInTheDocument()
    );
  });
});
