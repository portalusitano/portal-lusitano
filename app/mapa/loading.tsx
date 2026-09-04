/**
 * O esqueleto da `/mapa`.
 *
 * Tem de ser a planta do que vem a seguir, senão a página salta no momento em
 * que o conteúdo entra. Estava desalinhado em três sítios:
 *   - desenhava uma faixa de três números no herói, e a página não tem
 *     estatísticas nenhumas desde que saíram — o esqueleto prometia 64 pixéis
 *     que nunca chegam;
 *   - desenhava dois cartões na coluna do painel, um de regiões e outro de
 *     coudelarias, quando a página tem um só (a pilha) mais o botão para o
 *     directório;
 *   - reservava uma linha para a barra de resultados, que sem filtros não
 *     ocupa linha nenhuma;
 *   - e abria um `<main>`, quando o `app/layout.tsx` já embrulha tudo num
 *     `<main id="main-content">` — dois marcos «principal» para quem salta
 *     para o conteúdo, e mais 64 pixéis de margem em telemóvel, porque a regra
 *     `@media (max-width:1024px) { main { padding-bottom: … } }` acertava nos
 *     dois. É a mesma troca que os outros trinta ficheiros já fizeram.
 *
 * A altura da lona sai da mesma variável que a página usa, para as duas não
 * poderem divergir.
 *
 * `animate-pulse` é a excepção aceite ao «três ciclos infinitos»: só existe
 * enquanto o conteúdo não chegou.
 *
 * ── O que este ficheiro **não** resolve, e fica medido ────────────────────
 * Sem JavaScript, isto não chega a ver-se. Medido no browser com o JavaScript
 * desligado: o que fica no ecrã é o `app/loading.tsx` da raiz — a roda a girar
 * e «A carregar...» — para sempre. Este esqueleto e a página verdadeira vão os
 * dois para um `<div hidden>` no fim do documento, à espera do `$RC(...)` do
 * React que os muda de sítio, e esse script nunca corre. Um `<noscript>`
 * escrito aqui ou no `MapaClient` ia parar ao mesmo sítio: foi tentado e
 * medido, e não aparecia. Quem pode dizer alguma coisa a quem não tem
 * JavaScript é o `app/loading.tsx`, que é de toda a gente e não deste mapa.
 */
export default function Loading() {
  return (
    <div data-carregando className="min-h-screen bg-[var(--background)]">
      <section className="relative pb-4 pt-16 sm:pb-6 sm:pt-28">
        <div className="mx-auto max-w-7xl animate-pulse px-4 text-center sm:px-6">
          <div className="mx-auto mb-3 h-9 w-64 rounded bg-[var(--background-elevated)] sm:mb-4 sm:h-14 sm:w-96" />
          <div className="mx-auto mb-6 hidden h-4 w-72 rounded bg-[var(--background-elevated)] sm:mb-8 sm:block" />
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] animate-pulse px-4 pb-16 md:px-6">
        {/* Comandos: os dois chips da vista e a caixa de pesquisa. */}
        <div className="cartao mb-3 flex flex-nowrap items-center gap-2 p-3 sm:gap-3">
          <div className="h-8 w-20 shrink-0 rounded-full bg-[var(--background-elevated)]" />
          <div className="h-8 w-20 shrink-0 rounded-full bg-[var(--background-elevated)]" />
          <div className="h-10 min-w-0 flex-1 rounded-lg bg-[var(--background-elevated)] sm:max-w-sm" />
        </div>

        <div className="grid gap-4 [--altura-globo:460px] sm:[--altura-globo:560px] lg:grid-cols-12 lg:gap-6 lg:[--altura-globo:max(320px,min(680px,calc(100dvh-25rem)))]">
          <div className="min-w-0 lg:col-span-8">
            <div className="h-[var(--altura-globo)] rounded-2xl border border-[var(--border)] bg-[var(--background-elevated)]" />
          </div>

          <div className="min-w-0 lg:col-span-4">
            {/* Um cartão só — a pilha, no nível das regiões. */}
            <div className="cartao mb-3 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-[var(--border-soft)] px-4 py-3">
                <div className="h-3.5 w-3.5 shrink-0 rounded bg-[var(--background-elevated)]" />
                <div className="h-4 flex-1 rounded bg-[var(--background-elevated)]" />
                <div className="h-3 w-5 rounded bg-[var(--background-elevated)]" />
              </div>
              <div className="divide-y divide-[var(--border-soft)]">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="h-3.5 w-3.5 shrink-0 rounded bg-[var(--background-elevated)]" />
                    <div className="h-3.5 flex-1 rounded bg-[var(--background-elevated)]" />
                    <div className="h-3 w-5 rounded bg-[var(--background-elevated)]" />
                  </div>
                ))}
              </div>
            </div>

            {/* E o botão para o directório, que é o que fecha a coluna. */}
            <div className="h-9 w-full rounded-xl bg-[var(--background-elevated)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
