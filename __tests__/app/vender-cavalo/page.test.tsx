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

vi.mock("@/components/vender-cavalo/FormErrors", () => ({
  default: ({ errors }: { errors: string[] }) => (
    <div data-testid="form-errors">{errors.join(", ")}</div>
  ),
}));

vi.mock("@/components/vender-cavalo/FormNavigation", () => ({
  default: ({
    step: _step,
    onPrev,
    onNext,
  }: {
    step: number;
    onPrev: () => void;
    onNext: () => void;
  }) => (
    <div data-testid="form-navigation">
      <button onClick={onPrev}>Anterior</button>
      <button onClick={onNext}>Proximo</button>
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
    opcaoDestaque: _opcaoDestaque,
    termsAccepted,
    onTermsChange,
    loading,
    onSubmit,
  }: {
    formData: Record<string, unknown>;
    opcaoDestaque: boolean;
    termsAccepted: boolean;
    onTermsChange: (value: boolean) => void;
    loading: boolean;
    onSubmit: () => void;
  }) => (
    <div data-testid="step-pagamento">
      <input
        type="checkbox"
        checked={termsAccepted}
        onChange={(e) => onTermsChange(e.target.checked)}
      />
      <button onClick={onSubmit} disabled={loading}>
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
