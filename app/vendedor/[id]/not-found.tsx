import LocalizedLink from "@/components/LocalizedLink";

export default function VendedorNaoEncontrado() {
  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-light text-[var(--foreground)]">Vendedor não encontrado</h1>
        <p className="text-sm text-[var(--foreground-muted)] mt-3">
          Este vendedor não tem anúncios publicados de momento.
        </p>
        <LocalizedLink
          href="/comprar"
          className="inline-block mt-8 px-6 py-3 border border-[var(--gold)]/40 text-[10px] uppercase tracking-[0.3em] text-[var(--gold)] hover:bg-[var(--gold)]/10 transition-colors"
        >
          Ver cavalos à venda
        </LocalizedLink>
      </div>
    </main>
  );
}
