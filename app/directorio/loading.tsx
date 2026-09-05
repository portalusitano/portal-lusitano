/**
 * O que se vê enquanto o directório não chegou.
 *
 * Era o `app/loading.tsx` do site inteiro. Pela mesma razão que já está
 * escrita no `/comprar` e na área de entrada: **uma espera deve ter a forma do
 * que substitui.** Quando as coudelarias chegam, o que estava no ecrã continua
 * lá — a página compõe-se, em vez de saltar de um bloco de texto centrado para
 * uma grelha de cinco colunas.
 *
 * Aqui a forma é: o título ao centro, a barra de pesquisa, e chapas com a
 * proporção exacta do cartão — `16/10` na fotografia, que é o que o
 * `DirectorioContent` usa.
 *
 * Dez chapas, e não vinte e nove: é quanto cabe no primeiro ecrã de um
 * computador, e desenhar as que ninguém vai ver é trabalho de pintura por
 * baixo da dobra.
 *
 * O `animate-pulse` é a excepção aceite à regra dos ciclos infinitos do
 * `CLAUDE.md`: só existe enquanto o conteúdo não chegou, e desaparece com ele.
 */
function ChapaCoudelaria() {
  return (
    <div className="cartao overflow-hidden" aria-hidden="true">
      <div className="aspect-[16/10] animate-pulse bg-[var(--background-elevated)]" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-4/5 animate-pulse rounded bg-[var(--background-elevated)]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--background-elevated)]" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div data-carregando className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-4 pt-28 pb-20 sm:px-6">
        {/* O cabeçalho, que é centrado. */}
        <div className="mb-12 flex flex-col items-center gap-3 text-center" aria-hidden="true">
          <div className="h-10 w-72 animate-pulse rounded bg-[var(--background-elevated)]" />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-[var(--background-elevated)]" />
          <div className="h-4 w-2/3 max-w-xl animate-pulse rounded bg-[var(--background-elevated)]" />
        </div>

        {/* A barra: pesquisar, filtrar, ordenar — numa concha só. */}
        <div
          className="mb-6 h-12 animate-pulse rounded-[var(--raio-lg)] bg-[var(--background-elevated)]"
          aria-hidden="true"
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <ChapaCoudelaria key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
