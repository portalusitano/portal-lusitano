import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SellerListing } from "@/lib/marketplace-listings";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({ language: "pt", t: {} }),
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const imgProps = { ...props, fill: undefined };
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(imgProps as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

import HomeContent from "@/components/HomeContent";

function anuncio(over: Partial<SellerListing> = {}): SellerListing {
  return {
    id: "id-1",
    nome: "Imperador do Lagar",
    slug: null,
    status: "active",
    statusLabel: "Publicado",
    preco: 45000,
    precoNegociavel: false,
    precoSobConsulta: false,
    fotoPrincipal: null,
    fotos: [],
    totalFotos: 0,
    localizacao: "Golegã",
    regiao: "Santarém",
    descricao: null,
    sexo: "macho",
    idade: 7,
    vendedorNome: null,
    vendedorTelefone: null,
    vendedorWhatsapp: null,
    videoUrl: null,
    aceitaTroca: false,
    transporteIncluido: false,
    views: 0,
    tier: "standard",
    tierName: "Standard",
    destaque: false,
    verificado: false,
    expiresAt: null,
    featuredUntil: null,
    expirado: false,
    diasRestantes: null,
    publico: true,
    createdAt: null,
    vendidoAt: null,
    ...over,
  };
}

const VAZIO = { destaques: [], recentes: [], totalAtivos: 0 };

describe("HomeContent", () => {
  it("mostra a proposta do marketplace no cabeçalho", () => {
    render(<HomeContent {...VAZIO} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Lusitano");
  });

  it("oferece a pesquisa como acção principal", () => {
    render(<HomeContent {...VAZIO} />);
    expect(screen.getByLabelText("Procurar cavalos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /procurar/i })).toBeInTheDocument();
  });

  it("mostra o estado vazio, com apelo a publicar, quando não há anúncios", () => {
    render(<HomeContent {...VAZIO} />);
    expect(screen.getByText("Ainda não há cavalos publicados")).toBeInTheDocument();
  });

  it("não anuncia uma contagem de cavalos quando o catálogo está vazio", () => {
    render(<HomeContent {...VAZIO} />);
    expect(screen.queryByText(/cavalos? à venda/)).not.toBeInTheDocument();
  });

  it("lista os anúncios recentes em vez do estado vazio", () => {
    render(<HomeContent destaques={[]} recentes={[anuncio()]} totalAtivos={1} />);
    expect(screen.getByText("Imperador do Lagar")).toBeInTheDocument();
    expect(screen.queryByText("Ainda não há cavalos publicados")).not.toBeInTheDocument();
  });

  it("concorda o singular na contagem de anúncios", () => {
    render(<HomeContent destaques={[]} recentes={[anuncio()]} totalAtivos={1} />);
    expect(screen.getByText("1 cavalo à venda")).toBeInTheDocument();
  });

  it("formata o preço em euros e sem cêntimos", () => {
    render(<HomeContent destaques={[]} recentes={[anuncio()]} totalAtivos={1} />);
    // O Intl usa espaço não separável no separador de milhares.
    expect(screen.getByText(/45\s?000\s?€/)).toBeInTheDocument();
  });

  it("assinala preço sob consulta em vez de mostrar um valor inventado", () => {
    render(
      <HomeContent
        destaques={[]}
        recentes={[anuncio({ preco: null, precoSobConsulta: true })]}
        totalAtivos={1}
      />
    );
    expect(screen.getByText("Sob consulta")).toBeInTheDocument();
  });

  it("distingue visualmente um anúncio em destaque", () => {
    render(<HomeContent destaques={[anuncio({ destaque: true })]} recentes={[]} totalAtivos={1} />);
    expect(screen.getByText("Destaque")).toBeInTheDocument();
  });

  it("assinala um cavalo reservado, para o comprador não perder tempo", () => {
    render(
      <HomeContent destaques={[]} recentes={[anuncio({ status: "reservado" })]} totalAtivos={1} />
    );
    expect(screen.getByText("Reservado")).toBeInTheDocument();
  });

  it("liga cada cartão à ficha do anúncio", () => {
    render(<HomeContent destaques={[]} recentes={[anuncio()]} totalAtivos={1} />);
    const link = screen.getByText("Imperador do Lagar").closest("a");
    expect(link).toHaveAttribute("href", "/comprar/id-1");
  });

  it("mantém o apelo a publicar mesmo com o catálogo cheio", () => {
    render(<HomeContent destaques={[]} recentes={[anuncio()]} totalAtivos={1} />);
    expect(screen.getAllByText(/publicar anúncio/i).length).toBeGreaterThan(0);
  });
});
