import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import MobileBottomNav from "@/components/MobileBottomNav";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockPathname = vi.fn<() => string>(() => "/");
const mockFavoritesCount = vi.fn<() => number>(() => 0);

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
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

vi.mock("@/context/HorseFavoritesContext", () => ({
  useHorseFavorites: () => ({
    favoritesCount: mockFavoritesCount(),
    favorites: [],
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    isFavorite: vi.fn(),
    toggleFavorite: vi.fn(),
  }),
}));

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    language: "pt",
    t: {
      mobile_nav: {
        home: "Início",
        tools: "Ferramentas",
        horses: "Cavalos",
        favorites: "Favoritos",
        account: "Conta",
        shop: "Loja",
      },
    },
  }),
}));

// Ícones derivados dos que o componente importa: uma lista escrita à mão
// parte sempre que o componente troca de ícone, o que não é regressão.
vi.mock("lucide-react", () => ({
  Home: (props: Record<string, unknown>) => <svg data-testid="icon-home" {...props} />,
  ShoppingCart: (props: Record<string, unknown>) => (
    <svg data-testid="icon-shoppingcart" {...props} />
  ),
  User: (props: Record<string, unknown>) => <svg data-testid="icon-user" {...props} />,
  Plus: (props: Record<string, unknown>) => <svg data-testid="icon-plus" {...props} />,
  MessagesSquare: (props: Record<string, unknown>) => (
    <svg data-testid="icon-messagessquare" {...props} />
  ),
}));

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  mockPathname.mockReturnValue("/");
  mockFavoritesCount.mockReturnValue(0);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("MobileBottomNav", () => {
  it("mostra os cinco destinos do marketplace", () => {
    mockPathname.mockReturnValue("/");
    render(<MobileBottomNav />);
    expect(screen.getByText("Início")).toBeInTheDocument();
    expect(screen.getByText("Cavalos")).toBeInTheDocument();
    expect(screen.getByText("Vender")).toBeInTheDocument();
    expect(screen.getByText("Mensagens")).toBeInTheDocument();
    expect(screen.getByText("Conta")).toBeInTheDocument();
  });

  it("assinala o destino activo a partir do caminho", () => {
    mockPathname.mockReturnValue("/comprar");
    render(<MobileBottomNav />);
    const link = screen.getByText("Cavalos").closest("a");
    expect(link?.className).toContain("gold");
  });

  it("assinala Vender também nas subpáginas de publicação", () => {
    mockPathname.mockReturnValue("/vender-cavalo/sucesso");
    render(<MobileBottomNav />);
    const link = screen.getByText("Vender").closest("a");
    expect(link?.className).toContain("gold");
  });

  it("leva a publicar anúncio, a acção que sustenta o marketplace", () => {
    mockPathname.mockReturnValue("/");
    render(<MobileBottomNav />);
    expect(screen.getByText("Vender").closest("a")).toHaveAttribute("href", "/vender-cavalo");
  });

  it("leva à caixa de mensagens", () => {
    mockPathname.mockReturnValue("/");
    render(<MobileBottomNav />);
    expect(screen.getByText("Mensagens").closest("a")).toHaveAttribute(
      "href",
      "/minha-conta/mensagens"
    );
  });

  it("hides on /admin path", () => {
    mockPathname.mockReturnValue("/admin/dashboard");
    const { container } = render(<MobileBottomNav />);

    const nav = container.querySelector("nav");
    expect(nav).toBeNull();
  });

  it("hides on /studio path", () => {
    mockPathname.mockReturnValue("/studio");
    const { container } = render(<MobileBottomNav />);

    const nav = container.querySelector("nav");
    expect(nav).toBeNull();
  });

  it("não mostra destinos de secções removidas do site", () => {
    mockPathname.mockReturnValue("/");
    render(<MobileBottomNav />);
    expect(screen.queryByText("Ferramentas")).not.toBeInTheDocument();
    expect(screen.queryByText("Loja")).not.toBeInTheDocument();
  });
});
