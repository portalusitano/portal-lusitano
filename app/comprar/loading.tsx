/**
 * O que se vê enquanto a montra não chegou.
 *
 * Era o `app/loading.tsx` do site inteiro: um ecrã preto com dois anéis a
 * rodar ao centro e «A carregar…». Diz que alguma coisa está a acontecer e não
 * diz o quê, ocupa a altura toda, e quando o conteúdo chega **nada** do que
 * estava no ecrã continua lá — a página salta de um anel centrado para uma
 * grelha de cinco colunas.
 *
 * Este tem a forma da página que substitui: o título onde o título vai ficar, a
 * barra onde a barra vai ficar, e dez chapas com a proporção exacta do cartão.
 * Quem chega vê a montra a compor-se em vez de um sinal de espera, e o que
 * chega assenta onde a chapa já estava.
 *
 * O `animate-pulse` é a excepção aceite à regra dos ciclos infinitos do
 * `CLAUDE.md`: só existe enquanto o conteúdo não chegou, e desaparece com ele.
 */
function ChapaCartao() {
  return (
    <div className="cartao overflow-hidden" aria-hidden="true">
      <div className="aspect-[4/3] animate-pulse bg-[var(--background-elevated)]" />
      <div className="space-y-2 p-2.5">
        <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--background-elevated)]" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--background-elevated)]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--background-elevated)]" />
      </div>
    </div>
  );
}

export default function ComprarLoading() {
  return (
    <section
      data-carregando
      className="min-h-screen bg-[var(--background)] px-4 pt-16 pb-24 sm:px-6 sm:pt-20 sm:pb-32 md:px-12 lg:px-20"
      aria-busy="true"
      aria-label="A carregar os anúncios"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-72 animate-pulse rounded bg-[var(--background-elevated)] md:h-10 md:w-96" />
            <div className="h-3 w-32 animate-pulse rounded bg-[var(--background-elevated)]" />
          </div>
          <div className="h-10 w-44 animate-pulse rounded-full bg-[var(--background-elevated)]" />
        </div>

        <div className="mt-8">
          <div className="h-10 animate-pulse rounded-full bg-[var(--background-elevated)]" />

          <div className="mt-5 border-t border-[var(--border-soft)] pt-4">
            <div className="h-4 w-24 animate-pulse rounded bg-[var(--background-elevated)]" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }, (_, i) => (
              <ChapaCartao key={i} />
            ))}
          </div>
        </div>
      </div>

      {/* Quem lê com um leitor de ecrã não vê chapas nenhumas. */}
      <p className="sr-only" role="status">
        A carregar os anúncios.
      </p>
    </section>
  );
}
