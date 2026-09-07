"use client";

/**
 * O preço, dito uma vez.
 *
 * ## O que aqui estava
 *
 * Uma grelha de quatro cartões — 29 €, 49 €, 79 €, 149 € — cada um com um
 * círculo de escolha, uma lista de vistos e um distintivo dourado «Popular» a
 * apontar para o segundo. Entre quem chega para vender um cavalo e o
 * formulário havia uma decisão que ninguém sabe tomar à chegada: quantos dias
 * vou precisar? quantas fotografias tenho? vale a pena o destaque?
 *
 * Passou a haver **um preço**. Não há nada a escolher, e por isso não há aqui
 * um comando: há uma afirmação. É a peça mais Apple de toda esta página, e não
 * por causa de como está pintada — é por não pedir nada a ninguém.
 *
 * ## Porque é que o número é grande e o resto é pequeno
 *
 * Porque a pergunta que traz alguém a esta secção é uma só, e a resposta cabe
 * em três caracteres. O que vem a seguir — dias, fotografias, comissão,
 * revisão — não são argumentos de venda a competir pelo mesmo olhar: são a
 * letra pequena, e ficam do tamanho da letra pequena. O `.preco` do sistema já
 * tem `tabular-nums`, que é o que faz os dígitos assentarem.
 *
 * **Nenhum destes quatro é um visto verde.** Não são vantagens sobre um plano
 * que não existe; são o que está incluído, e a lista não tem com que competir.
 *
 * ## O movimento
 *
 * O número conta-se do zero até 79 em `--d-nascer`, uma vez, ao entrar no
 * ecrã. É a única peça desta página que faz isso, e faz por uma razão: um
 * preço que se conta é um preço que se lê — o olho segue o algarismo a
 * assentar em vez de o encontrar já pousado. Com `prefers-reduced-motion` o
 * número está lá, pousado, desde o primeiro quadro.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { PLANO } from "@/lib/listing-tiers";

/** O preço em euros. Vem do plano — não se escreve o número aqui. */
const EUROS = PLANO.priceInCents / 100;

/**
 * O número a contar até ao preço.
 *
 * Um `requestAnimationFrame` que corre uma vez, e pára. Não é um ciclo: chega
 * ao fim e desliga-se, e por isso não entra na conta dos ciclos infinitos do
 * site. Com `prefers-reduced-motion` nem sequer arranca.
 */
function useContagem(destino: number, duracaoMs: number, activo: boolean) {
  const [valor, setValor] = useState(activo ? 0 : destino);

  useEffect(() => {
    if (!activo) return;
    let quadro = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracaoMs);
      // A mesma curva de saída do sistema: rápido no princípio, a assentar no
      // fim. Escrita à mão porque um `cubic-bezier` do CSS não se aplica a um
      // número; os pontos são os do `--ease-out`.
      const suave = 1 - Math.pow(1 - t, 3);
      setValor(Math.round(destino * suave));
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [destino, duracaoMs, activo]);

  return valor;
}

/** Lê a duração de um token do CSS, em ms. Um número à mão aqui era um número que ninguém encontra. */
function duracaoDoToken(nome: string, omissao: number): number {
  if (typeof window === "undefined") return omissao;
  const bruto = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  if (bruto.endsWith("ms")) return parseFloat(bruto) || omissao;
  if (bruto.endsWith("s")) return (parseFloat(bruto) || omissao / 1000) * 1000;
  return omissao;
}

export default function PricingBanner() {
  const { t } = useLanguage();
  const v = t.vender_cavalo;

  const caixa = useRef<HTMLDivElement>(null);
  const [aContar, setAContar] = useState(false);
  const [duracao, setDuracao] = useState(700);

  /**
   * Quem não quer movimento vê tudo pousado desde o primeiro quadro.
   *
   * Lido no arranque e não num efeito: a preferência já existe antes do
   * primeiro desenho, e escrevê-la num `setState` de montagem é um render a
   * mais para dizer uma coisa que se sabia de véspera. No servidor não há
   * `matchMedia`, e aí a resposta é «há movimento» — o que se pinta a seguir é
   * o estado inicial da cascata, que é invisível, e o cliente corrige-o no
   * primeiro desenho dele.
   */
  const [semMovimento] = useState(
    () =>
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const el = caixa.current;
    if (semMovimento || !el) return;

    /* Conta quando chega ao ecrã, e uma vez só. O `disconnect` no primeiro
       cruzamento é o que garante que não volta a contar ao rolar para trás —
       um preço que se conta duas vezes lê-se como um preço que mudou.

       As duas escritas de estado vivem dentro do observador e não no corpo do
       efeito: um `setState` na montagem é um render a mais por uma coisa que
       ainda não se vê, e o lint apanha-o. Aqui só acontecem quando o preço
       entra no ecrã, que é o instante em que alguma coisa muda mesmo. */
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        setDuracao(duracaoDoToken("--d-nascer", 700));
        setAContar(true);
        observador.disconnect();
      },
      { threshold: 0.4 }
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, [semMovimento]);

  const mostrado = useContagem(EUROS, duracao, aContar);

  /**
   * Já se pode entrar em cena?
   *
   * Com movimento, é quando o preço entra no ecrã. Sem movimento — ou antes de
   * o observador disparar — tudo tem de estar visível na mesma: uma cascata que
   * nunca arranca é conteúdo que nunca aparece, e isso não é uma animação
   * ausente, é uma página partida.
   */
  const emCena = aContar || semMovimento;

  const incluido = [v.preco_dias, v.preco_fotos, v.preco_comissao, v.preco_revisao];

  return (
    <div ref={caixa} className="mx-auto mb-12 max-w-2xl px-4 text-center">
      {/* Havia aqui um rótulo — «UM PREÇO, E MAIS NADA» — por cima do número.
          Dizia por palavras o que o número diz sozinho: há um preço, é este, e
          não há mais nada no ecrã. Um letreiro a anunciar a ausência de
          letreiros é o contrário do que se queria. Saiu. */}

      {/* O número. `aria-hidden` na contagem e o valor final no rótulo: um
          leitor de ecrã que anunciasse 0, 14, 47, 79 lia um preço a mudar. */}
      <p className="mb-1 flex items-baseline justify-center gap-1">
        <span
          aria-hidden="true"
          className="preco text-6xl leading-none text-[var(--foreground-strong)] sm:text-7xl"
        >
          {mostrado}
          <span className="align-super text-[0.5em]">€</span>
        </span>
        <span className="sr-only">{EUROS} €</span>
      </p>
      <p className="meta mb-8">{v.preco_sufixo}</p>

      {/* ── O que está incluído ────────────────────────────────────────────
          Eram quatro linhas numa grelha de duas colunas, alinhadas à esquerda,
          com um vazio a separar as colunas: lia-se como duas listas de dois e
          não como uma lista de quatro. Passa a ser **uma linha só**, com um
          fio de luz entre cada par — a mesma hairline fria que separa tudo o
          resto no site. Em telemóvel encosta a duas colunas, que é onde uma
          fila de quatro deixa de caber sem partir palavras.

          Chegam escalonadas, 70ms entre elas, **depois** de o preço acabar de
          contar: durante a contagem o olho está no número, e quatro linhas a
          nascer ao mesmo tempo disputavam-lho. O atraso é a duração da
          contagem mais a ordem de cada uma. */}
      <ul
        className="mx-auto mb-7 grid grid-cols-2 gap-y-4 text-sm text-[var(--foreground-secondary)] sm:flex sm:items-center sm:justify-center sm:gap-0"
        style={{ "--atraso-base": `${duracao}ms` } as CSSProperties}
      >
        {incluido.map((linha, i) => (
          <li
            key={linha}
            className={`px-4 leading-snug sm:border-l sm:border-[var(--border-soft)] sm:first:border-l-0 ${
              emCena ? "nascer-linha" : "opacity-0"
            }`}
            style={{ "--ordem": i + 1 } as CSSProperties}
          >
            {linha}
          </li>
        ))}
      </ul>

      <p
        className={`meta mx-auto max-w-md leading-relaxed ${emCena ? "nascer-linha" : "opacity-0"}`}
        style={{ "--ordem": incluido.length + 1 } as CSSProperties}
      >
        {v.preco_nota}
      </p>
    </div>
  );
}
