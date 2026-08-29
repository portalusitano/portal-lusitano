import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "@/components/Footer";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    language: "pt",
    t: {
      nav: {
        home: "Inicio",
        shop: "Loja",
        journal: "Jornal",
        about: "Sobre",
      },
      home: {
        manifesto: "Nao criamos apenas vestuario. Criamos simbolos de pertenca.",
      },
      footer: {
        rights: "Todos os direitos reservados",
        privacy: "Privacidade",
        terms: "Termos",
        navigation: "Navegação",
        lusitano: "Lusitano",
        tools: "Ferramentas",
        buy_horse: "Comprar Cavalo",
        studs: "Coudelarias",
        events: "Eventos",
        lineages: "Linhagens",
        notable: "Lusitanos Notáveis",
        calculator: "Calculadora de Valor",
        comparator: "Comparador",
        compatibility: "Compatibilidade",
        profile_analysis: "Análise de Perfil",
        about: "Sobre Nós",
        ebook: "Ebook Grátis",
      },
    },
  }),
}));

// Ícones derivados dos que o componente importa: uma lista escrita à mão
// parte sempre que o componente troca de ícone, o que não é regressão.
vi.mock("lucide-react", () => ({
  ArrowUpRight: (props: Record<string, unknown>) => (
    <svg data-testid="icon-arrowupright" {...props} />
  ),
  Plus: (props: Record<string, unknown>) => <svg data-testid="icon-plus" {...props} />,
  ArrowRight: (props: Record<string, unknown>) => <svg data-testid="icon-arrowright" {...props} />,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Footer", () => {
  it("mostra a marca", () => {
    render(<Footer />);
    expect(screen.getByText("PORTAL")).toBeInTheDocument();
  });

  it("liga às duas acções do marketplace", () => {
    render(<Footer />);
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/comprar");
    expect(hrefs).toContain("/vender-cavalo");
  });

  it("liga às páginas da conta que o vendedor usa", () => {
    render(<Footer />);
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/minha-conta/anuncios");
    expect(hrefs).toContain("/minha-conta/mensagens");
    expect(hrefs).toContain("/minha-conta/alertas");
  });

  it("liga ao ecossistema equestre que o portal mantém", () => {
    render(<Footer />);
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/directorio");
    expect(hrefs).toContain("/eventos");
    expect(hrefs).toContain("/mapa");
  });

  it("não liga a secções que já não existem no site", () => {
    // Um link morto no rodapé aparece em todas as páginas.
    render(<Footer />);
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href") ?? "");
    for (const morta of ["/loja", "/jornal", "/ferramentas", "/linhagens", "/profissionais"]) {
      expect(hrefs).not.toContain(morta);
    }
  });

  it("mostra as ligações externas obrigatórias", () => {
    render(<Footer />);
    const allLinks = screen.getAllByRole("link");
    const hasExternalLink = allLinks.some((link) => {
      const href = link.getAttribute("href") ?? "";
      return href.includes("instagram") || href.includes("tiktok") || href.includes("mailto:");
    });
    expect(hasExternalLink).toBe(true);
  });

  it("mostra o aviso de direitos reservados", () => {
    render(<Footer />);
    expect(screen.getByText(/Todos os direitos reservados/i)).toBeInTheDocument();
  });

  it("renders privacy and terms links", () => {
    render(<Footer />);
    const allLinks = screen.getAllByRole("link");
    const hrefs = allLinks.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/privacidade");
    expect(hrefs).toContain("/termos");
  });
});
