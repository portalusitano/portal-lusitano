/**
 * O que se vê enquanto o formulário de inscrição de uma coudelaria não chegou.
 *
 * Era o `app/loading.tsx` do site inteiro. A razão de ter forma própria é a
 * mesma que já está escrita no `/comprar`, na área de entrada e no directório:
 * **uma espera deve ter a forma do que substitui**, para a página se compor em
 * vez de saltar de uma roda ao centro para um formulário.
 *
 * A forma é a da página: o cabeçalho centrado numa coluna larga, e o
 * formulário numa coluna mais estreita, com os campos aos pares como a página
 * os põe em ecrã largo.
 *
 * O `animate-pulse` é a excepção aceite à regra dos ciclos infinitos do
 * `CLAUDE.md`: só existe enquanto o conteúdo não chegou.
 */
function Chapa({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[var(--background-elevated)] ${className}`}
      aria-hidden="true"
    />
  );
}

function Campo({ estreito = false }: { estreito?: boolean }) {
  return (
    <div className="space-y-2">
      <Chapa className={estreito ? "h-3 w-24" : "h-3 w-32"} />
      <Chapa className="h-12 rounded-[var(--raio-md)]" />
    </div>
  );
}

export default function Loading() {
  return (
    <div data-carregando className="min-h-screen bg-[var(--background)] px-6 pt-28 pb-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <Chapa className="h-10 w-96 max-w-full" />
          <Chapa className="h-4 w-full max-w-xl" />
        </div>

        <div className="mx-auto max-w-2xl space-y-6">
          <Campo />
          {/* Os pares, que em ecrã largo ficam lado a lado. */}
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="grid gap-4 md:grid-cols-2">
              <Campo estreito />
              <Campo estreito />
            </div>
          ))}
          <Campo />
          <Chapa className="h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
