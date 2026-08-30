import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-[var(--gold)] text-sm uppercase tracking-wider mb-4">404</p>
      <h1 className="text-3xl md:text-4xl font-serif text-[var(--foreground)] mb-4">
        Anúncio Não Encontrado
      </h1>
      <p className="text-[var(--foreground-muted)] mb-8 max-w-md">
        O anúncio que procura não existe ou já não está disponível. Veja outros cavalos à venda no
        nosso marketplace.
      </p>
      <Link
        href="/comprar"
        className="border border-[var(--gold)]/30 px-8 py-3 rotulo text-[var(--foreground)] hover:bg-[var(--gold)] hover:text-black transition-all duration-300"
      >
        Ver Todos os Anúncios
      </Link>
    </div>
  );
}
