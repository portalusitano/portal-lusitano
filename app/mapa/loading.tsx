/**
 * O esqueleto tinha de ser a planta da página que vem a seguir, e não era: o
 * globo estava desenhado a 600px fixos quando a página o dá a 460 em telemóvel
 * e 680 em desktop, e a lista lateral eram seis cartões de 9px de ícone que
 * já não existem. Um esqueleto que não bate certo com o que chega vale menos
 * do que nenhum — a página salta no momento em que o conteúdo entra.
 *
 * `animate-pulse` é a excepção aceite ao «três ciclos infinitos»: só existe
 * enquanto o conteúdo não chegou.
 */
export default function Loading() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <section className="relative pb-4 pt-16 sm:pb-6 sm:pt-28">
        <div className="mx-auto max-w-7xl animate-pulse px-4 text-center sm:px-6">
          <div className="mx-auto mb-3 hidden h-7 w-36 rounded-full bg-[var(--background-elevated)] sm:mb-4 sm:block" />
          <div className="mx-auto mb-3 h-9 w-64 rounded bg-[var(--background-elevated)] sm:mb-4 sm:h-14 sm:w-96" />
          <div className="mx-auto mb-6 hidden h-4 w-72 rounded bg-[var(--background-elevated)] sm:mb-8 sm:block" />

          {/* Os três números, no mesmo instrumento dividido por hairlines. */}
          <div className="cartao mx-auto grid w-full max-w-md grid-cols-3 divide-x divide-[var(--border-soft)] overflow-hidden sm:w-auto sm:max-w-none">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex min-w-0 items-center justify-center gap-3 px-2 py-3 sm:justify-start sm:px-6 sm:py-3.5"
              >
                <div className="hidden h-4 w-4 shrink-0 rounded bg-[var(--background-elevated)] sm:block" />
                <div className="min-w-0">
                  <div className="mx-auto h-5 w-12 rounded bg-[var(--background-elevated)] sm:mx-0" />
                  <div className="mx-auto mt-1.5 h-2 w-16 max-w-full rounded bg-[var(--background-elevated)] sm:mx-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] animate-pulse px-4 pb-16 md:px-6">
        {/* Comandos */}
        <div className="cartao mb-3 flex flex-nowrap items-center gap-2 p-3 sm:gap-3">
          <div className="h-8 w-20 shrink-0 rounded-full bg-[var(--background-elevated)]" />
          <div className="h-8 w-20 shrink-0 rounded-full bg-[var(--background-elevated)]" />
          <div className="h-10 min-w-0 flex-1 rounded-lg bg-[var(--background-elevated)] sm:max-w-sm" />
        </div>

        {/* Barra de resultados */}
        <div className="mb-4 px-1">
          <div className="h-3 w-28 rounded bg-[var(--background-elevated)]" />
        </div>

        <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
          {/* A lona, nas mesmas alturas que a página real usa. */}
          <div className="min-w-0 lg:col-span-8">
            <div className="h-[460px] rounded-2xl border border-[var(--border)] bg-[var(--background-elevated)] sm:h-[560px] lg:h-[680px]" />
          </div>

          <div className="min-w-0 lg:col-span-4">
            {/* Painel de regiões: um cartão só, com linhas divididas. */}
            <div className="cartao mb-3 overflow-hidden">
              <div className="border-b border-[var(--border-soft)] px-4 py-3">
                <div className="h-4 w-32 rounded bg-[var(--background-elevated)]" />
              </div>
              <div className="divide-y divide-[var(--border-soft)]">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="h-3.5 w-3.5 shrink-0 rounded bg-[var(--background-elevated)]" />
                    <div className="h-3.5 flex-1 rounded bg-[var(--background-elevated)]" />
                    <div className="h-3 w-5 rounded bg-[var(--background-elevated)]" />
                  </div>
                ))}
              </div>
            </div>

            {/* As coudelarias, que é ao que se vem. */}
            <div className="mb-1.5 h-3 w-24 rounded bg-[var(--background-elevated)]" />
            <div className="cartao divide-y divide-[var(--border-soft)] overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-[var(--background-elevated)]" />
                  <div className="min-w-0 flex-1">
                    <div className="h-3.5 w-32 rounded bg-[var(--background-elevated)]" />
                    <div className="mt-1.5 h-2.5 w-20 rounded bg-[var(--background-elevated)]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
