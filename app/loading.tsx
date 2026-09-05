/**
 * O que se vê enquanto uma página ainda não chegou, quando ela não tem uma
 * espera própria.
 *
 * ## O que aqui estava, e porque saiu
 *
 * Um ecrã preto de altura inteira com dois anéis a rodar, um ponto a pulsar e
 * a palavra «A carregar...» também a pulsar. **Quatro animações infinitas ao
 * mesmo tempo** — `spin-slow`, `spin-slow-reverse`, `pulse-scale`,
 * `pulse-opacity` —, medidas no browser. O site tem três ciclos infinitos,
 * contados e com razão escrita, e os esqueletos são a excepção aceite: mas a
 * excepção escrita no `CLAUDE.md` é o `animate-pulse` do Tailwind, **um** ciclo
 * numa caixa, e não quatro numa roda.
 *
 * E dizia «A carregar...» em português a quem tinha o site em inglês ou em
 * espanhol. Um esqueleto não precisa de se anunciar: as formas dizem-no, e uma
 * frase escrita à mão numa página que serve sete rotas é uma frase que nunca
 * ninguém se lembra de traduzir. **Não há texto nenhum aqui, de propósito.**
 *
 * ## O que fica, e a razão da forma
 *
 * A mesma que está escrita no `app/comprar/loading.tsx` e no
 * `app/(auth)/loading.tsx`: **uma espera deve ter a forma do que substitui.**
 * Quando o conteúdo chega, o que estava no ecrã continua lá — a página compõe-
 * se em vez de saltar de uma roda ao centro para um cabeçalho e um corpo de
 * texto. Dois desenhos diferentes seguidos leem-se como duas páginas, e é isso
 * que faz uma chegada de 90ms parecer aos solavancos.
 *
 * Esta é a genérica, e por isso desenha o que quase todas as páginas têm: um
 * título, uma linha de apoio, e bandas de texto. Serve os termos, a política
 * de privacidade e as perguntas frequentes tal e qual. As rotas com uma forma
 * muito própria — o directório, o formulário de venda — ganham mais em ter a
 * sua, como o `/comprar`, o `/mapa` e a área de entrada já têm.
 *
 * O `data-carregando` não é decoração: é por ele que o CSS esconde as esperas
 * quando não há JavaScript. Sem isso, quem chega sem JavaScript ficava a olhar
 * para o esqueleto para sempre, porque nada o vinha substituir.
 */
function Banda({ largura }: { largura: string }) {
  return (
    <div
      className={`h-4 ${largura} animate-pulse rounded bg-[var(--background-elevated)]`}
      aria-hidden="true"
    />
  );
}

export default function Loading() {
  return (
    <div data-carregando className="min-h-screen bg-[var(--background)] px-4 pt-28 pb-16">
      <div className="mx-auto max-w-3xl space-y-10">
        {/* O título e a linha que quase sempre o acompanha. */}
        <div className="space-y-3">
          <div
            className="h-9 w-2/3 animate-pulse rounded bg-[var(--background-elevated)]"
            aria-hidden="true"
          />
          <Banda largura="w-1/2" />
        </div>

        {/* O corpo. Larguras desiguais, porque um parágrafo a sério não tem
            todas as linhas do mesmo tamanho e uma pilha de barras iguais
            lê-se como uma tabela. */}
        <div className="space-y-6">
          {[
            ["w-full", "w-11/12", "w-4/5"],
            ["w-full", "w-10/12", "w-9/12"],
            ["w-11/12", "w-full", "w-2/3"],
          ].map((paragrafo, i) => (
            <div key={i} className="space-y-2.5">
              {paragrafo.map((largura, j) => (
                <Banda key={j} largura={largura} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
