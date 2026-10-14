import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Avatar from "@/components/perfil/Avatar";

vi.mock("next/image", () => ({
  default: ({ src, onError, ...p }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img data-testid="foto" src={src as string} onError={onError as () => void} {...p} />
  ),
}));

vi.mock("lucide-react", () => ({
  User: (p: Record<string, unknown>) => <svg data-testid="icone-pessoa" {...p} />,
}));

/**
 * Uma fotografia que não carrega deixava a caixa **vazia** — um disco do
 * tamanho de uma cara, sem nada lá dentro. As iniciais existem exactamente
 * para este momento e nunca eram desenhadas, porque o ramo delas só corria
 * quando não havia `src`.
 *
 * As causas em produção não são raras: um ficheiro apagado, o balde fora do
 * ar, um endereço fora do `remotePatterns` (que devolve 400), ou estar sem
 * rede a meio do carregamento.
 */
describe("o retrato quando a fotografia não carrega", () => {
  it("cai nas iniciais", () => {
    render(<Avatar nome="Beatriz Nunes" src="https://exemplo.invalido/x.webp" />);
    expect(screen.getByTestId("foto")).toBeInTheDocument();
    expect(screen.queryByText("BN")).not.toBeInTheDocument();

    fireEvent.error(screen.getByTestId("foto"));

    expect(screen.queryByTestId("foto")).not.toBeInTheDocument();
    expect(screen.getByText("BN")).toBeInTheDocument();
  });

  // Sem nome não há iniciais, e o ícone é o terceiro degrau — nunca um vazio.
  it("cai no ícone de pessoa quando também não há nome", () => {
    render(<Avatar nome={null} src="https://exemplo.invalido/x.webp" />);
    fireEvent.error(screen.getByTestId("foto"));
    expect(screen.getByTestId("icone-pessoa")).toBeInTheDocument();
  });

  // Quem acabou de trocar a fotografia tem direito a que a nova seja tentada.
  it("volta a tentar quando o src muda", () => {
    const { rerender } = render(<Avatar nome="Ana" src="https://exemplo.invalido/a.webp" />);
    fireEvent.error(screen.getByTestId("foto"));
    expect(screen.getByText("A")).toBeInTheDocument();

    rerender(<Avatar nome="Ana" src="https://exemplo.invalido/b.webp" />);
    expect(screen.getByTestId("foto")).toBeInTheDocument();
  });
});
