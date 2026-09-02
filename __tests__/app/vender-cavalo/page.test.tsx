import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks — vi.mock calls are hoisted, so we cannot reference outer variables.
// All mock data must be defined inline within the factory functions.
// ---------------------------------------------------------------------------

// A página lê o idioma e o sistema de avisos do contexto; sem provider no teste
// rebentava antes de renderizar o formulário.
vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    language: "pt",
    // As mensagens de validação são lidas de t.form_validation; sem elas a
    // validação rebenta ao construir a lista de erros.
    t: {
      vender_cavalo: {},
      form_validation: new Proxy({}, { get: (_a, chave: string) => `erro:${String(chave)}` }),
    },
  }),
}));

vi.mock("@/context/ToastContext", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("@/components/vender-cavalo/types", () => ({
  DocumentType: {},
}));

vi.mock("@/components/vender-cavalo/data", () => ({
  initialFormData: {
    proprietario_nome: "",
    proprietario_email: "",
    proprietario_telefone: "",
    proprietario_nif: "",
    nome: "",
    nome_registo: "",
    numero_registo: "",
    microchip: "",
    passaporte_equino: "",
    data_nascimento: "",
    sexo: "",
    pelagem: "",
    altura: "",
    pai_nome: "",
    pai_registo: "",
    mae_nome: "",
    mae_registo: "",
    coudelaria_origem: "",
    nivel_treino: "",
    disciplinas: [],
    competicoes: "",
    premios: "",
    estado_saude: "",
    vacinacao_atualizada: false,
    desparasitacao_atualizada: false,
    exame_veterinario: "",
    observacoes_saude: "",
    preco: "",
    negociavel: false,
    localizacao: "",
    descricao: "",
  },
  TOTAL_STEPS: 4,
  MIN_IMAGES: 3,
  MIN_DESCRIPTION_LENGTH: 100,
}));

vi.mock("@/components/vender-cavalo/PageHeader", () => ({
  default: () => <div data-testid="page-header">Vender Cavalo Header</div>,
}));

vi.mock("@/components/vender-cavalo/PricingBanner", () => ({
  default: () => <div data-testid="pricing-banner">Pricing Info</div>,
}));

vi.mock("@/components/vender-cavalo/StepIndicator", () => ({
  default: ({ currentStep }: { currentStep: number }) => (
    <div data-testid="step-indicator">Step {currentStep}</div>
  ),
}));

// Os erros deixaram de ser frases soltas: cada um sabe de que campo é, para
// que o resumo possa levar lá quem o lê. O `ref` existe porque é a página que
// chama o foco ao resumo quando a validação falha.
vi.mock("@/components/vender-cavalo/FormErrors", () => ({
  default: ({
    erros,
    ref,
  }: {
    erros: { campo: string; mensagem: string }[];
    ref?: React.Ref<HTMLDivElement>;
  }) =>
    erros.length === 0 ? null : (
      <div data-testid="form-errors" ref={ref} tabIndex={-1}>
        {erros.map((e) => `${e.campo}:${e.mensagem}`).join(", ")}
      </div>
    ),
}));

// O «Proximo» é um botão de submissão e não tem `onClick`: quem avança o passo
// é o `onSubmit` do formulário, que é o mesmo caminho da tecla Enter.
vi.mock("@/components/vender-cavalo/FormNavigation", () => ({
  default: ({ step: _step, onPrev }: { step: number; onPrev: () => void }) => (
    <div data-testid="form-navigation">
      <button type="button" onClick={onPrev}>
        Anterior
      </button>
      <button type="submit">Proximo</button>
    </div>
  ),
}));

vi.mock("@/components/vender-cavalo/StepProprietario", () => ({
  default: ({
    formData,
    updateField,
  }: {
    formData: Record<string, unknown>;
    updateField: (field: string, value: unknown) => void;
  }) => (
    <div data-testid="step-proprietario">
      <input
        placeholder="Nome do proprietario"
        value={formData.proprietario_nome as string}
        onChange={(e) => updateField("proprietario_nome", e.target.value)}
      />
    </div>
  ),
}));

vi.mock("@/components/vender-cavalo/StepIdentificacao", () => ({
  default: ({ formData: _formData }: { formData: Record<string, unknown> }) => (
    <div data-testid="step-identificacao">Identificacao Step</div>
  ),
}));

vi.mock("@/components/vender-cavalo/StepLinhagem", () => ({
  default: ({ formData: _formData }: { formData: Record<string, unknown> }) => (
    <div data-testid="step-linhagem">Linhagem Step</div>
  ),
}));

vi.mock("@/components/vender-cavalo/StepTreinoSaude", () => ({
  default: ({ formData: _formData }: { formData: Record<string, unknown> }) => (
    <div data-testid="step-treino-saude">Treino e Saude Step</div>
  ),
}));

vi.mock("@/components/vender-cavalo/StepPrecoApresentacao", () => ({
  default: ({ formData: _formData }: { formData: Record<string, unknown> }) => (
    <div data-testid="step-preco-apresentacao">Preco e Apresentacao Step</div>
  ),
}));

vi.mock("@/components/vender-cavalo/StepPagamento", () => ({
  default: ({
    formData: _formData,
    termsAccepted,
    onTermsChange,
    loading,
  }: {
    formData: Record<string, unknown>;
    termsAccepted: boolean;
    onTermsChange: (value: boolean) => void;
    loading: boolean;
  }) => (
    <div data-testid="step-pagamento">
      <input
        type="checkbox"
        checked={termsAccepted}
        onChange={(e) => onTermsChange(e.target.checked)}
      />
      {/* Também é de submissão, e por isso não leva `onSubmit`: carregar em
          pagar e carregar em Enter passam pelo mesmo sítio. */}
      <button type="submit" disabled={loading}>
        {loading ? "A processar..." : "Finalizar"}
      </button>
    </div>
  ),
}));

// Import AFTER mocks
import VenderCavaloPage from "@/app/vender-cavalo/page";

describe("VenderCavaloPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // A página guarda um rascunho no `localStorage` a cada alteração, e o
    // jsdom partilha-o entre casos. Sem isto, o caso que escreve um nome
    // deixava-o preenchido para o caso seguinte, que passava a exercer outra
    // coisa que não a que diz exercer.
    localStorage.clear();
  });

  it("renders page header", () => {
    render(<VenderCavaloPage />);
    expect(screen.getByTestId("page-header")).toBeInTheDocument();
  });

  it("renders pricing banner", () => {
    render(<VenderCavaloPage />);
    expect(screen.getByTestId("pricing-banner")).toBeInTheDocument();
  });

  it("renders step indicator with current step", () => {
    render(<VenderCavaloPage />);
    expect(screen.getByText("Step 1")).toBeInTheDocument();
  });

  it("renders StepProprietario on step 1", () => {
    render(<VenderCavaloPage />);
    expect(screen.getByTestId("step-proprietario")).toBeInTheDocument();
  });

  it("navigates to next step when Proximo is clicked", () => {
    render(<VenderCavaloPage />);
    expect(screen.getByTestId("step-proprietario")).toBeInTheDocument();

    // Fill required field
    const input = screen.getByPlaceholderText("Nome do proprietario");
    fireEvent.change(input, { target: { value: "Test Name" } });

    fireEvent.click(screen.getByText("Proximo"));
    // Should show validation errors since all fields are not filled
    expect(screen.getByTestId("form-errors")).toBeInTheDocument();
  });

  it("junta proprietário e identificação no primeiro passo", () => {
    // O formulário passou a agrupar os passos: quem publica preenche os dados do
    // dono e do cavalo de uma vez, em vez de atravessar seis ecrãs.
    render(<VenderCavaloPage />);
    expect(screen.getByTestId("step-proprietario")).toBeInTheDocument();
    expect(screen.getByTestId("step-identificacao")).toBeInTheDocument();
  });

  it("renders form navigation", () => {
    render(<VenderCavaloPage />);
    expect(screen.getByTestId("form-navigation")).toBeInTheDocument();
    expect(screen.getByText("Anterior")).toBeInTheDocument();
    expect(screen.getByText("Proximo")).toBeInTheDocument();
  });

  it("allows input in proprietario step", () => {
    render(<VenderCavaloPage />);
    const input = screen.getByPlaceholderText("Nome do proprietario");
    fireEvent.change(input, { target: { value: "John Doe" } });
    expect(input).toHaveValue("John Doe");
  });

  it("não avança de passo com o formulário vazio", () => {
    // O que interessa é que a validação trava o avanço; a forma como as
    // mensagens são apresentadas é detalhe do componente FormErrors.
    render(<VenderCavaloPage />);
    fireEvent.click(screen.getByText("Proximo"));
    expect(screen.getByTestId("step-proprietario")).toBeInTheDocument();
  });

  it("can navigate back to previous step", () => {
    render(<VenderCavaloPage />);
    expect(screen.getByText("Anterior")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Anterior"));
    // Should still be on step 1 since we can't go below 1
    expect(screen.getByText("Step 1")).toBeInTheDocument();
  });
});
