import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Newsletter from "@/components/Newsletter";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
// O componente lê o idioma do contexto; sem provider rebenta antes de renderizar.
vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({ language: "pt", t: {} }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  mockFetch.mockReset();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Newsletter", () => {
  it("renders email input", () => {
    render(<Newsletter />);
    expect(screen.getByLabelText("O seu e-mail")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("O seu melhor e-mail")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<Newsletter />);
    expect(screen.getByRole("button", { name: /subscrever/i })).toBeInTheDocument();
  });

  it("shows success message after submission", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    render(<Newsletter />);

    const input = screen.getByLabelText("O seu e-mail");
    const button = screen.getByRole("button", { name: /subscrever/i });

    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Bem-vindo à elite/i)).toBeInTheDocument();
    });
  });

  it("shows error state on failed submission", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    render(<Newsletter />);

    const input = screen.getByLabelText("O seu e-mail");
    const button = screen.getByRole("button", { name: /subscrever/i });

    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(button);

    // After a failed submission the form stays visible (status becomes "error")
    // and the button should still be available (not in loading state)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /subscrever/i })).toBeEnabled();
    });

    // The success message should NOT appear
    expect(screen.queryByText(/Bem-vindo à elite/i)).not.toBeInTheDocument();
  });
});
