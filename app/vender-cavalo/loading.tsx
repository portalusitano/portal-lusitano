/**
 * O que se vê enquanto o formulário de venda não chegou.
 *
 * Era o `app/loading.tsx` do site inteiro: uma roda ao centro de um ecrã
 * preto, onde vai ficar um cabeçalho, uma barra de planos e um formulário de
 * noventa e nove perguntas. Pela razão já escrita no `/comprar` e na área de
 * entrada, **uma espera deve ter a forma do que substitui** — quando o
 * conteúdo chega, o que estava no ecrã continua lá.
 *
 * Esta desenha o que se vê no primeiro ecrã, pela ordem em que a página o põe:
 * o cabeçalho, os três planos lado a lado, o indicador de passos, e as
 * primeiras caixas do passo um. Nada abaixo disso: o resto do formulário é
 * longo e ninguém o vê antes de chegar.
 *
 * O indicador tem **quatro** marcos, que são os passos que o formulário conta
 * — não um número redondo à sorte. Uma espera que promete cinco passos e
 * entrega quatro é uma promessa falsa, ainda que dure duzentos milissegundos.
 *
 * O `animate-pulse` é a excepção aceite à regra dos ciclos infinitos do
 * `CLAUDE.md`: só existe enquanto o conteúdo não chegou.
 */
import { TOTAL_STEPS } from "@/components/vender-cavalo/data";

function Chapa({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[var(--background-elevated)] ${className}`}
      aria-hidden="true"
    />
  );
}

export default function Loading() {
  return (
    <div data-carregando className="min-h-screen bg-[var(--background)] px-4 pt-28 pb-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* O cabeçalho da página. */}
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <Chapa className="h-10 w-80 max-w-full" />
          <Chapa className="h-4 w-full max-w-xl" />
          <Chapa className="h-4 w-2/3 max-w-md" />
        </div>

        {/* Os planos, lado a lado. */}
        <div className="mb-10 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Chapa key={i} className="h-28 rounded-[var(--raio-lg)]" />
          ))}
        </div>

        {/* O indicador de passos: um marco por passo, e o traço entre eles. */}
        <div className="mb-8 flex items-center gap-2" aria-hidden="true">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="flex flex-1 items-center gap-2">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-[var(--background-elevated)]" />
              {i < TOTAL_STEPS - 1 && <Chapa className="h-px flex-1" />}
            </div>
          ))}
        </div>

        {/* As primeiras caixas do passo um. */}
        <div className="space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Chapa className="h-3 w-32" />
              <Chapa className="h-12 rounded-[var(--raio-md)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
