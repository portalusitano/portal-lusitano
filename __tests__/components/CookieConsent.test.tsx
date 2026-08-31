import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

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

vi.mock("@/context/LanguageContext", async () => {
  const pt = (await import("@/locales/pt.json")).default;
  return { useLanguage: () => ({ language: "pt", t: pt }) };
});

import CookieConsent from "@/components/CookieConsent";
import ptDicionario from "@/locales/pt.json";
import { CHAVE_CONSENTIMENTO, CHAVE_PREFERENCIAS, abrirConsentimento } from "@/lib/consentimento";

const c = ptDicionario.cookies;

describe("consentimento de cookies", () => {
  beforeEach(() => {
    localStorage.clear();
    (window as unknown as { gtag?: unknown }).gtag = vi.fn();
  });

  afterEach(() => {
    delete (window as unknown as { gtag?: unknown }).gtag;
  });

  it("pergunta a quem ainda não respondeu", () => {
    render(<CookieConsent />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("não volta a perguntar a quem já respondeu", () => {
    localStorage.setItem(CHAVE_CONSENTIMENTO, "declined");
    render(<CookieConsent />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  /**
   * O requisito legal, e o que estava em falta: recusar tinha de se ir
   * buscar dentro de «Personalizar» enquanto «Aceitar Todos» estava à
   * frente. Dois cliques contra um não é «tão fácil».
   */
  it("deixa recusar num clique, sem abrir as opções", () => {
    render(<CookieConsent />);
    expect(screen.getByRole("button", { name: c.reject_all })).toBeInTheDocument();
  });

  it("dá a recusar e a aceitar o mesmo peso visual", () => {
    render(<CookieConsent />);
    const recusar = screen.getByRole("button", { name: c.reject_all });
    const aceitar = screen.getByRole("button", { name: c.accept_all });
    expect(recusar.className).toBe(aceitar.className);
    // Ambos na primeira camada: nenhum está dentro de uma secção que só
    // aparece depois de carregar em «Escolher».
    expect(recusar.parentElement).toBe(aceitar.parentElement);
  });

  it("recusar guarda só os essenciais e nega o resto ao Google", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: c.reject_all }));

    expect(localStorage.getItem(CHAVE_CONSENTIMENTO)).toBe("declined");
    expect(JSON.parse(localStorage.getItem(CHAVE_PREFERENCIAS)!)).toEqual({
      essential: true,
      analytics: false,
      marketing: false,
    });
    const gtag = (window as unknown as { gtag: ReturnType<typeof vi.fn> }).gtag;
    expect(gtag).toHaveBeenCalledWith(
      "consent",
      "update",
      expect.objectContaining({ analytics_storage: "denied", ad_storage: "denied" })
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("aceitar guarda tudo", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: c.accept_all }));

    expect(localStorage.getItem(CHAVE_CONSENTIMENTO)).toBe("accepted");
    expect(JSON.parse(localStorage.getItem(CHAVE_PREFERENCIAS)!).marketing).toBe(true);
  });

  it("os essenciais não se podem desligar", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: c.customize }));
    const essenciais = screen.getByRole("switch", { name: `${c.essential} — ${c.always_on}` });
    expect(essenciais).toBeDisabled();
    expect(essenciais).toHaveAttribute("aria-checked", "true");
  });

  /**
   * Retirar o consentimento tem de ser tão fácil como tê-lo dado. Depois de
   * respondido o painel não volta sozinho, por isso o rodapé dispara este
   * sinal — sem ele não havia caminho de volta nenhum.
   */
  it("o rodapé consegue reabrir o pedido depois de respondido", () => {
    localStorage.setItem(CHAVE_CONSENTIMENTO, "accepted");
    render(<CookieConsent />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    act(() => abrirConsentimento());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Reabre já nas escolhas: quem volta cá vem mudar alguma coisa.
    expect(screen.getByRole("button", { name: c.hide_details })).toBeInTheDocument();
  });

  it("é um diálogo modal com nome, não uma barra qualquer", () => {
    render(<CookieConsent />);
    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(dialogo).toHaveAttribute("aria-label", c.aria_label);
  });
});
