import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
// A página é um server component que importa o cliente admin; esse módulo
// recusa-se a carregar quando existe window, como acontece em jsdom.
vi.mock("@/lib/supabase-admin", () => {
  // Cadeia encadeável em qualquer ordem e resolúvel em qualquer ponto: assim o
  // duplo não precisa de acompanhar a sequência exacta de filtros da página.
  const criarCadeia = () => {
    const cadeia: Record<string, unknown> = {};
    for (const metodo of ["select", "eq", "neq", "gte", "lte", "in", "or", "order", "limit"]) {
      cadeia[metodo] = vi.fn(() => cadeia);
    }
    cadeia.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve, reject);
    return cadeia;
  };
  const duplo = { from: vi.fn(() => criarCadeia()) };
  return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
});

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
  useSearchParams: () => ({
    get: () => null,
    toString: () => "",
  }),
}));

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    language: "pt",
    toggleLanguage: vi.fn(),
    t: {
      eventos: {
        badge: "Calendario Equestre",
        title: "Eventos Lusitanos",
        subtitle: "Descubra os melhores eventos equestres em Portugal",
        all_types: "Todos os Eventos",
        fairs: "Feiras",
        competitions: "Competicoes",
        auctions: "Leiloes",
        exhibitions: "Exposicoes",
        workshops: "Workshops",
        featured: "Em Destaque",
        loading: "A carregar eventos...",
        no_events: "Sem eventos",
        no_events_hint: "Volte mais tarde",
        all_events: "Todos os Eventos",
        event_single: "evento",
        event_plural: "eventos",
        confirmed: "Confirmado",
        annual: "Anual",
        provisional: "Provisorio",
        highlight: "Destaque",
        organized_by: "Organizado por",
        view_full_page: "Ver pagina completa",
        official_site: "Site oficial",
      },
    },
  }),
}));

vi.mock("@/components/ui/Pagination", () => ({
  default: () => <div data-testid="pagination" />,
}));

// Ícones derivados dos que a página e os seus componentes importam.
// TextSplit anima o título letra a letra, partindo-o em vários elementos e
// tornando-o inencontrável por texto. O duplo devolve-o inteiro.
vi.mock("@/components/TextSplit", () => ({
  default: ({ text }: { text: string }) => <>{text}</>,
}));

vi.mock("lucide-react", () => ({
  AlertCircle: (props: Record<string, unknown>) => (
    <svg data-testid="icon-alertcircle" {...props} />
  ),
  Calendar: (props: Record<string, unknown>) => <svg data-testid="icon-calendar" {...props} />,
  CalendarDays: (props: Record<string, unknown>) => (
    <svg data-testid="icon-calendardays" {...props} />
  ),
  Check: (props: Record<string, unknown>) => <svg data-testid="icon-check" {...props} />,
  CheckCircle: (props: Record<string, unknown>) => (
    <svg data-testid="icon-checkcircle" {...props} />
  ),
  ChevronLeft: (props: Record<string, unknown>) => (
    <svg data-testid="icon-chevronleft" {...props} />
  ),
  ChevronRight: (props: Record<string, unknown>) => (
    <svg data-testid="icon-chevronright" {...props} />
  ),
  Clock: (props: Record<string, unknown>) => <svg data-testid="icon-clock" {...props} />,
  Copy: (props: Record<string, unknown>) => <svg data-testid="icon-copy" {...props} />,
  Download: (props: Record<string, unknown>) => <svg data-testid="icon-download" {...props} />,
  Euro: (props: Record<string, unknown>) => <svg data-testid="icon-euro" {...props} />,
  ExternalLink: (props: Record<string, unknown>) => (
    <svg data-testid="icon-externallink" {...props} />
  ),
  Eye: (props: Record<string, unknown>) => <svg data-testid="icon-eye" {...props} />,
  Facebook: (props: Record<string, unknown>) => <svg data-testid="icon-facebook" {...props} />,
  Linkedin: (props: Record<string, unknown>) => <svg data-testid="icon-linkedin" {...props} />,
  List: (props: Record<string, unknown>) => <svg data-testid="icon-list" {...props} />,
  Map: (props: Record<string, unknown>) => <svg data-testid="icon-map" {...props} />,
  MapPin: (props: Record<string, unknown>) => <svg data-testid="icon-mappin" {...props} />,
  RefreshCw: (props: Record<string, unknown>) => <svg data-testid="icon-refreshcw" {...props} />,
  Search: (props: Record<string, unknown>) => <svg data-testid="icon-search" {...props} />,
  Share2: (props: Record<string, unknown>) => <svg data-testid="icon-share2" {...props} />,
  Star: (props: Record<string, unknown>) => <svg data-testid="icon-star" {...props} />,
  Tag: (props: Record<string, unknown>) => <svg data-testid="icon-tag" {...props} />,
  Twitter: (props: Record<string, unknown>) => <svg data-testid="icon-twitter" {...props} />,
  Users: (props: Record<string, unknown>) => <svg data-testid="icon-users" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="icon-x" {...props} />,
}));

// Mock global fetch
const mockFetch = vi.fn();

// ---------------------------------------------------------------------------
// Import (after mocks)
// ---------------------------------------------------------------------------
import EventosPage from "@/app/eventos/page";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ eventos: [] }),
  });
  global.fetch = mockFetch;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("EventosPage", () => {
  it("renders the page title", async () => {
    // EventosPage é um server component assíncrono: tem de ser resolvido
    // antes de ser entregue ao render.
    render(await EventosPage());
    expect(screen.getByText("Eventos Lusitanos")).toBeInTheDocument();
  });

  it("renders the subtitle text", async () => {
    // EventosPage é um server component assíncrono: tem de ser resolvido
    // antes de ser entregue ao render.
    render(await EventosPage());
    expect(
      screen.getByText("Descubra os melhores eventos equestres em Portugal")
    ).toBeInTheDocument();
  });

  it("renders the badge text", async () => {
    // EventosPage é um server component assíncrono: tem de ser resolvido
    // antes de ser entregue ao render.
    render(await EventosPage());
    expect(screen.getByText("Calendario Equestre")).toBeInTheDocument();
  });

  it("renders event type filter buttons", async () => {
    // EventosPage é um server component assíncrono: tem de ser resolvido
    // antes de ser entregue ao render.
    render(await EventosPage());
    expect(screen.getByText("Todos os Eventos")).toBeInTheDocument();
    expect(screen.getByText("Feiras")).toBeInTheDocument();
    expect(screen.getByText("Competicoes")).toBeInTheDocument();
    expect(screen.getByText("Leiloes")).toBeInTheDocument();
    expect(screen.getByText("Exposicoes")).toBeInTheDocument();
    expect(screen.getByText("Workshops")).toBeInTheDocument();
  });

  it("não vai buscar eventos no cliente: os dados vêm do servidor", async () => {
    // A página passou a ser um server component que lê da base de dados; um
    // fetch no browser seria uma segunda ida desnecessária.
    render(await EventosPage());
    expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining("/api/eventos"));
  });
});
