import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "@/components/ErrorBoundary";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
// O fallback usa LocalizedLink, que lê o idioma do contexto. Sem provider no
// teste, o componente rebentava antes de mostrar o próprio erro.
vi.mock("@/components/LocalizedLink", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
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

// Ícones derivados dos que o componente importa: uma lista escrita à mão
// parte sempre que o componente troca de ícone, o que não é regressão.
vi.mock("lucide-react", () => ({
  RefreshCw: (props: Record<string, unknown>) => <svg data-testid="icon-refreshcw" {...props} />,
  Home: (props: Record<string, unknown>) => <svg data-testid="icon-home" {...props} />,
  AlertTriangle: (props: Record<string, unknown>) => (
    <svg data-testid="icon-alerttriangle" {...props} />
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// A component that throws on render so we can trigger the boundary
function ThrowingChild({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error: component exploded");
  }
  return <div>Child rendered successfully</div>;
}

// Suppress console.error noise from React/ErrorBoundary during tests
beforeEach(() => {
  // O componente detecta o idioma pelo localStorage e, em falta dele, pelo
  // navigator — que em jsdom é en-US. Fixar o idioma torna as afirmações
  // sobre o texto deterministas.
  localStorage.setItem("portal-language", "pt");

  vi.spyOn(console, "error").mockImplementation(() => {});
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ErrorBoundary", () => {
  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("shows default fallback UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Algo correu mal/i)).toBeInTheDocument();
  });

  it("shows custom fallback when provided", () => {
    const customFallback = <div>Custom error page</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowingChild />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom error page")).toBeInTheDocument();
    expect(screen.queryByText(/Algo correu mal/i)).not.toBeInTheDocument();
  });

  it("resets error state when retry button is clicked", () => {
    // We need a component whose throw behavior we can control.
    // On first render it throws, after retry it should succeed.
    let shouldThrow = true;

    function ConditionalThrow() {
      if (shouldThrow) {
        throw new Error("Boom");
      }
      return <div>Recovered content</div>;
    }

    render(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>
    );

    // Error UI should be visible
    expect(screen.getByText(/Algo correu mal/i)).toBeInTheDocument();

    // Now stop the child from throwing
    shouldThrow = false;

    // Click the retry button (find by role or text)
    const retryButton = screen.getByRole("button", {
      name: /tentar novamente/i,
    });
    fireEvent.click(retryButton);

    // Children should render again
    expect(screen.getByText("Recovered content")).toBeInTheDocument();
    expect(screen.queryByText(/Algo correu mal/i)).not.toBeInTheDocument();
  });

  it("shows error details in development mode", () => {
    vi.stubEnv("NODE_ENV", "development");

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );

    // The componentDidCatch should have called console.error in dev
    expect(console.error).toHaveBeenCalled();

    vi.unstubAllEnvs();
  });

  it("renders a link to the homepage in the default fallback", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );

    const homeLink = screen.getByRole("link", {
      name: /in[ií]cio|home|p[aá]gina inicial/i,
    });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute("href", "/");
  });
});
