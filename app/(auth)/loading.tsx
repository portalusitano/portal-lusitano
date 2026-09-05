/*
 * A espera da área de entrada.
 *
 * Aqui estava `export { default } from "@/app/loading"` — o esqueleto geral
 * do site, que é um ecrã inteiro com dois anéis a rodar, um ponto a pulsar e
 * a palavra «A carregar...» também a pulsar. Medido no browser, com o
 * payload do `/login` atrasado para forçar este estado: **900px de altura**
 * (o ecrã todo) e **quatro animações infinitas ao mesmo tempo**
 * (`spin-slow`, `spin-slow-reverse`, `pulse-scale`, `pulse-opacity`).
 *
 * Duas coisas estavam mal, e nenhuma delas é a velocidade:
 *
 * 1. **Não se parecia nada com o destino.** Quem carrega em «A minha conta»
 *    vai dar a um cartão de 420px com um formulário; o que aparecia entre as
 *    duas coisas era um ecrã preto com anéis ao centro. Dois desenhos
 *    diferentes seguidos leem-se como duas páginas, e é isso que faz a
 *    chegada parecer aos solavancos mesmo quando demora 92ms.
 * 2. **Quatro ciclos infinitos.** O site tem três, contados e com razão
 *    escrita. Os esqueletos são a excepção aceite — mas a excepção escrita é
 *    o `animate-pulse` do Tailwind, um ciclo numa caixa, não quatro
 *    fotogramas próprios por cima uns dos outros.
 *
 * Fica a silhueta do que vem a seguir: as mesmas faixas, na mesma ordem e
 * com o mesmo ritmo do formulário que aterra por cima. O cartão não muda de
 * forma quando o conteúdo chega — muda de conteúdo.
 *
 * Deliberadamente **sem** marca e **sem** moldura de cartão próprios. Este
 * ficheiro é o `loading` de um segmento, e o Next usa-o em dois sítios
 * diferentes: dentro do `layout` de `(auth)` quando já se está na área, e
 * sozinho quando se está a entrar nela de fora. Uma silhueta que já traga
 * cartão fica com cartão dentro de cartão no primeiro caso; esta, que é só o
 * miolo, serve os dois.
 *
 * As medidas não são inventadas nem são pixel a pixel: são o ritmo medido no
 * formulário do `/login` (título 32px, legenda de duas linhas, botão de
 * conta externa, dois campos com rótulo, submeter, e a linha do registo).
 * Aproximado de propósito — o formulário está a ser redesenhado, e uma
 * silhueta pregada ao pixel do desenho de hoje fica errada amanhã.
 */
export default function Loading() {
  return (
    <div data-carregando role="status" className="animate-pulse">
      {/* Quem lê por voz recebe a palavra; quem lê pelo ecrã recebe a
          silhueta. As faixas são decoração e ficam fora da árvore de
          acessibilidade. */}
      <span className="sr-only">A carregar…</span>
      <div aria-hidden="true">
        {/* Título e legenda */}
        <div className="h-8 w-2/3 rounded-md bg-[var(--background-elevated)]" />
        <div className="mt-2.5 h-4 w-full rounded-md bg-[var(--background-elevated)]" />
        <div className="mt-1.5 h-4 w-4/5 rounded-md bg-[var(--background-elevated)]" />

        {/* Entrar com conta externa */}
        <div className="mt-7 h-11 w-full rounded-full bg-[var(--background-elevated)]" />

        {/* A costura entre as duas maneiras de entrar */}
        <div className="mt-6 h-px w-full bg-[var(--border-soft)]" />

        {/* Os dois campos, cada um com o seu rótulo */}
        <div className="mt-6 h-3 w-20 rounded-md bg-[var(--background-elevated)]" />
        <div className="mt-2 h-12 w-full rounded-lg bg-[var(--background-elevated)]" />
        <div className="mt-4 h-3 w-28 rounded-md bg-[var(--background-elevated)]" />
        <div className="mt-2 h-12 w-full rounded-lg bg-[var(--background-elevated)]" />

        {/* «Esqueceu-se da palavra-passe?», encostada à direita como no
          formulário */}
        <div className="mt-3 ml-auto h-3 w-32 rounded-md bg-[var(--background-elevated)]" />

        {/* Submeter */}
        <div className="mt-4 h-11 w-full rounded-full bg-[var(--background-elevated)]" />

        {/* «Ainda não tem conta? Criar conta» */}
        <div className="mx-auto mt-6 h-4 w-3/4 rounded-md bg-[var(--background-elevated)]" />
      </div>
    </div>
  );
}
