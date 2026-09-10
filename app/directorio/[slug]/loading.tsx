/**
 * O que se vê enquanto a ficha de uma coudelaria não chegou.
 *
 * Era o `app/loading.tsx` do site inteiro — um ecrã com uma roda ao centro
 * onde vai ficar uma capa de 480px de altura com o nome por cima. Dois
 * desenhos seguidos leem-se como duas páginas, e é isso que faz uma chegada
 * rápida parecer aos solavancos.
 *
 * A forma é a da ficha: a capa alta com o nome assente em baixo, e por baixo
 * dela a coluna de texto com o painel de identidade ao lado — a mesma
 * repartição `1fr / 20rem` que o `FichaCoudelaria` usa em ecrã largo.
 *
 * Não se desenha a galeria nem o mapa: ficam abaixo da dobra, e uma espera que
 * pinta o que ninguém vai ver é trabalho a mais para não se ver nada.
 *
 * O `animate-pulse` é a excepção aceite à regra dos ciclos infinitos do
 * `CLAUDE.md`: só existe enquanto o conteúdo não chegou.
 */
function Banda({ largura, altura = "h-4" }: { largura: string; altura?: string }) {
  return (
    <div
      className={`${altura} ${largura} animate-pulse rounded bg-[var(--background-elevated)]`}
      aria-hidden="true"
    />
  );
}

export default function Loading() {
  return (
    <div data-carregando className="min-h-screen bg-[var(--background)]">
      {/* A capa. O nome assenta em baixo, como na ficha. */}
      <div
        className="relative min-h-[340px] animate-pulse bg-[var(--background-elevated)] sm:min-h-[480px]"
        aria-hidden="true"
      >
        <div className="mx-auto flex h-full max-w-6xl flex-col justify-end px-4 pb-8 pt-28 sm:px-6 sm:pb-12">
          <div className="h-10 w-2/3 max-w-md rounded bg-[var(--background-card)]" />
          <div className="mt-3 h-4 w-40 rounded bg-[var(--background-card)]" />
        </div>
      </div>

      {/* O corpo: o texto à esquerda, o painel de identidade à direita. */}
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-8">
            <div className="space-y-2.5">
              <Banda largura="w-full" />
              <Banda largura="w-11/12" />
              <Banda largura="w-4/5" />
            </div>
            <div className="space-y-2.5">
              <Banda largura="w-11/12" />
              <Banda largura="w-full" />
              <Banda largura="w-2/3" />
            </div>
          </div>

          <div className="cartao space-y-4 p-5" aria-hidden="true">
            <Banda largura="w-1/2" altura="h-3" />
            {["w-full", "w-5/6", "w-full", "w-3/4"].map((l, i) => (
              <Banda key={i} largura={l} altura="h-3.5" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
