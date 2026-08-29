import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
// Ícones derivados dos que o componente importa: uma lista escrita à mão
// parte sempre que o componente troca de ícone, o que não é regressão.
vi.mock("lucide-react", () => ({
  Search: (props: Record<string, unknown>) => <svg data-testid="icon-search" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="icon-x" {...props} />,
  Loader2: (props: Record<string, unknown>) => <svg data-testid="icon-loader2" {...props} />,
  Clock: (props: Record<string, unknown>) => <svg data-testid="icon-clock" {...props} />,
  ChevronRight: (props: Record<string, unknown>) => (
    <svg data-testid="icon-chevronright" {...props} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    language: "pt",
    t: {
      common: {
        search: "Pesquisar",
        search_placeholder: "Pesquisar...",
        close: "Fechar",
      },
      search: {
        type_labels: {
          horse: "Cavalo",
          product: "Produto",
          article: "Artigo",
          event: "Evento",
          stud: "Coudelaria",
          page: "Página",
        },
        filter_tabs: {
          all: "Tudo",
          horses: "Cavalos",
          events: "Eventos",
          studs: "Coudelarias",
          pages: "Páginas",
        },
        placeholder: "Pesquisar...",
        no_results: "Nenhum resultado encontrado",
        search_all: "Pesquisar em tudo",
        min_chars: "Digite pelo menos 2 caracteres",
        recent_searches: "Pesquisas recentes",
        navigate: "navegar",
        open: "abrir",
      },
    },
  }),
}));

// Mock global fetch
const mockFetch = vi.fn();

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import { SearchButton, SearchModal } from "@/components/Search";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      results: [
        {
          id: "1",
          type: "horse",
          title: "Xaquiro",
          description: "Famous Lusitano stallion",
          url: "/cavalos-famosos/xaquiro",
        },
        {
          id: "2",
          type: "product",
          title: "Sela Lusitana",
          description: "Traditional saddle",
          url: "/loja/sela-lusitana",
        },
      ],
    }),
  });
  global.fetch = mockFetch;
});

// ---------------------------------------------------------------------------
// Tests - SearchButton
// ---------------------------------------------------------------------------
describe("SearchButton", () => {
  it("renders a button with search aria-label", () => {
    render(<SearchButton onClick={vi.fn()} />);
    expect(screen.getByLabelText("Pesquisar")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<SearchButton onClick={handleClick} />);
    fireEvent.click(screen.getByLabelText("Pesquisar"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders a search icon inside the button", () => {
    render(<SearchButton onClick={vi.fn()} />);
    expect(screen.getByTestId("icon-search")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests - SearchModal
// ---------------------------------------------------------------------------
describe("SearchModal", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(<SearchModal isOpen={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders search input when isOpen is true", () => {
    render(<SearchModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows placeholder text in search input", () => {
    render(<SearchModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText("Pesquisar...")).toBeInTheDocument();
  });

  it("shows 'type at least 2 characters' message when query is empty", () => {
    render(<SearchModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Digite pelo menos 2 caracteres")).toBeInTheDocument();
  });

  it("calls onClose when Escape is pressed", () => {
    const handleClose = vi.fn();
    render(<SearchModal isOpen={true} onClose={handleClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("renders close button with correct aria-label", () => {
    render(<SearchModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByLabelText("Fechar")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    render(<SearchModal isOpen={true} onClose={handleClose} />);
    fireEvent.click(screen.getByLabelText("Fechar"));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("fetches results when user types 2+ characters", async () => {
    render(<SearchModal isOpen={true} onClose={vi.fn()} />);

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "xa" } });

    // Wait for the 300ms debounce and the fetch call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/search?q=xa"),
        expect.anything()
      );
    });
  });

  it("displays search results with type badges", async () => {
    render(<SearchModal isOpen={true} onClose={vi.fn()} />);

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "xaquiro" } });

    // Wait for the debounce, fetch, and render
    await waitFor(() => {
      expect(screen.getByText("Xaquiro")).toBeInTheDocument();
    });

    // Check type badge labels are shown
    expect(screen.getByText("Cavalo")).toBeInTheDocument();
    expect(screen.getByText("Produto")).toBeInTheDocument();
  });

  it("renders ESC hint in footer", () => {
    render(<SearchModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("ESC")).toBeInTheDocument();
    expect(screen.getByText("Fechar")).toBeInTheDocument();
  });
});
