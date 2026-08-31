import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks - all factories use inline data only (no outer variable references)
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

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const imgProps = { ...props, fill: undefined };
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(imgProps as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    const Component = () => null;
    Component.displayName = "DynamicMock";
    return Component;
  },
}));

vi.mock("@/context/CartContext", () => ({
  useCart: () => ({
    totalQuantity: 0,
    openCart: vi.fn(),
    cart: [],
    isCartOpen: false,
    closeCart: vi.fn(),
    addItemToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    checkoutUrl: null,
  }),
}));

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    language: "pt",
    toggleLanguage: vi.fn(),
    t: {
      nav: { home: "Inicio", shop: "Loja", about: "Sobre", journal: "Jornal" },
      cart: "Saco",
    },
  }),
}));

vi.mock("@/context/WishlistContext", () => ({
  useWishlist: () => ({ wishlist: [] }),
}));

vi.mock("@/context/HorseFavoritesContext", () => ({
  useHorseFavorites: () => ({ favoritesCount: 0 }),
}));

// Mock sub-components as simple divs with data-testids
vi.mock("@/components/navbar/DesktopMenu", () => ({
  DesktopMenu: () => <div data-testid="desktop-menu">DesktopMenu</div>,
}));

vi.mock("@/components/navbar/NavIcons", () => ({
  NavIcons: () => <div data-testid="nav-icons">NavIcons</div>,
}));

vi.mock("@/components/navbar/MobileMenu", () => ({
  MobileMenu: () => <div data-testid="mobile-menu">MobileMenu</div>,
}));

// ---------------------------------------------------------------------------
// Import component after all mocks are declared
// ---------------------------------------------------------------------------
import Navbar from "@/components/Navbar";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Navbar", () => {
  it("renders the nav element with role='navigation'", () => {
    render(<Navbar />);
    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();
  });

  it("mostra a marca como texto e liga-a à página inicial", () => {
    render(<Navbar />);
    expect(screen.getByText("PORTAL LUSITANO")).toBeInTheDocument();

    // The logo text should be inside a link pointing to "/"
    const logoLink = screen.getByText("PORTAL LUSITANO").closest("a");
    expect(logoLink).toBeTruthy();
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("renders DesktopMenu component", () => {
    render(<Navbar />);
    expect(screen.getByTestId("desktop-menu")).toBeInTheDocument();
  });

  it("renders NavIcons component", () => {
    render(<Navbar />);
    expect(screen.getByTestId("nav-icons")).toBeInTheDocument();
  });

  it("has correct aria-label on nav element", () => {
    render(<Navbar />);
    const nav = screen.getByRole("navigation");
    expect(nav).toHaveAttribute("aria-label", "Navegação principal");
  });

  it("renders the logo image with correct alt text", () => {
    render(<Navbar />);
    const logoImg = screen.getByAltText("Portal Lusitano");
    expect(logoImg).toBeInTheDocument();
    expect(logoImg).toHaveAttribute("src", "/logo.webp");
  });

  it("não mostra a data de fundação", () => {
    // Roubava atenção ao nome e envelhece sozinha.
    render(<Navbar />);
    expect(screen.queryByText(/EST\. ?2023/i)).not.toBeInTheDocument();
  });

  it("renders MobileMenu component", () => {
    render(<Navbar />);
    expect(screen.getByTestId("mobile-menu")).toBeInTheDocument();
  });
});
