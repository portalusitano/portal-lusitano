"use client";

import { useEffect, type ReactNode } from "react";

/** De onde entra o bloco. A distância é sempre a mesma; muda só o eixo. */
export type Direccao = "up" | "down" | "left" | "right";

interface RevelarProps {
  children: ReactNode;
  /** De onde entra. Por omissão sobe. */
  direccao?: Direccao;
  /** Deslocamento inicial, em pixels. Por omissão 2rem. */
  y?: number;
  /** Duração da transição, em milissegundos. */
  duracao?: number;
  /** Atraso, para escalonar blocos de uma grelha. */
  atraso?: number;
  className?: string;
}

/**
 * Atraso de um item numa grelha, com tecto.
 *
 * Numa página de resultados com 24 anúncios, 100ms por cartão punha o último
 * a entrar 2,4 segundos depois do primeiro — a grelha ficava a montar-se à
 * frente de quem já estava a ler. Ao fim de cinco passos o atraso pára.
 */
export function atrasoEmGrelha(indice: number, passo = 100, maximo = 5): number {
  return Math.min(indice, maximo) * passo;
}

/**
 * Envolve um bloco que deve aparecer ao entrar no ecrã.
 *
 * Só marca o elemento; quem o anima é o `ObservadorRevelar`, montado uma vez
 * para toda a aplicação — um observador partilhado em vez de um por bloco.
 */
export default function Revelar({
  children,
  direccao = "up",
  y = 32,
  duracao = 1000,
  atraso = 0,
  className,
}: RevelarProps) {
  // O eixo é escolhido aqui e não na folha de estilo: o `--ry` em linha
  // ganharia sempre ao que a regra de direcção pusesse.
  const eixo: Record<string, string> =
    direccao === "left"
      ? { "--rx": `${y}px`, "--ry": "0px" }
      : direccao === "right"
        ? { "--rx": `${-y}px`, "--ry": "0px" }
        : { "--ry": `${direccao === "down" ? -y : y}px` };

  return (
    <div
      data-revelar={direccao === "up" ? "" : direccao}
      className={className}
      // O observador acrescenta `dentro` a este elemento, e pode fazê-lo
      // antes de a hidratação terminar. Sem isto, cada bloco com entrada
      // gerava um aviso de hidratação em todas as páginas.
      suppressHydrationWarning
      style={
        {
          ...eixo,
          "--rd": `${duracao}ms`,
          "--rdelay": `${atraso}ms`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

/**
 * Anima os blocos marcados com `data-revelar` quando entram no ecrã.
 *
 * Um só observador para toda a aplicação, e **nenhum ouvinte de
 * deslocamento**. Havia um: a cada evento de scroll corria um
 * `querySelectorAll` por toda a página e um `getBoundingClientRect` em cada
 * bloco que ainda não tinha entrado, e a seguir voltava a inscrever esses
 * blocos no observador. Medido no ambiente de prova, era o que punha 1663
 * leituras forçadas de layout em dois segundos de roda na página inicial — e
 * uma leitura de layout a meio de um deslocamento é a definição de engasgo:
 * obriga o browser a refazer o layout antes de responder à roda.
 *
 * O trabalho que essa varredura fazia está repartido por quem o sabe fazer
 * sem custo contínuo:
 *
 *  - quem entra no ecrã é o `IntersectionObserver`, que já lá estava e que
 *    corre fora da linha principal;
 *  - quem aparece depois (paginação, filtros, um separador que troca) é
 *    apanhado por um `MutationObserver`, que dispara quando o DOM muda em vez
 *    de perguntar a cada deslocamento se mudou.
 *
 * As redes de segurança ficam, porque o pior resultado possível não é uma
 * animação falhada — é uma página em branco. Mudou só o que a rede final
 * faz, e a razão está escrita ao lado dela.
 */
export function ObservadorRevelar() {
  useEffect(() => {
    // Normalmente já lá está, posta pelo script inline antes da primeira
    // pintura; aqui é só rede de segurança para quem chegue por outro caminho.
    document.documentElement.classList.add("js");

    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const porRevelar = () => document.querySelectorAll("[data-revelar]:not(.dentro)");

    // O estado inicial pede `will-change: opacity, transform` a cada bloco, e
    // isso é uma camada de composição por bloco — é ela que faz a entrada
    // correr no compositor em vez de na linha principal. Ficava pedida para
    // sempre: numa página com trinta blocos são trinta camadas a ocupar
    // memória de vídeo muito depois de a última animação ter acabado, que é
    // o contrário do que o `will-change` serve.
    //
    // Quando a entrada acaba, o bloco é marcado como `assente` e a folha de
    // estilo devolve a camada. Quem marca é um temporizador e não um
    // `transitionend`, por duas razões medidas:
    //
    //  - um bloco revelado no mesmo quadro da primeira pintura nunca chega a
    //    transitar, logo nunca há `transitionend` — e ficava com a camada
    //    para sempre. Aconteceu a 3 dos 20 blocos da página inicial;
    //  - um ouvinte de `transitionend` delegado no documento acorda a cada
    //    transição de qualquer elemento da página, incluindo todos os hovers.
    //    Trocar trabalho contínuo por trabalho contínuo não era o negócio.
    //
    // A duração está no próprio bloco, escrita em linha pelo `Revelar`, e
    // lê-se do atributo de estilo — não do estilo calculado, que obrigaria a
    // recalcular estilo para cada bloco revelado.
    const relogios = new Set<number>();
    const revelar = (el: Element) => {
      el.classList.add("dentro");
      const estilo = (el as HTMLElement).style;
      const ms =
        (parseFloat(estilo.getPropertyValue("--rd")) || 1000) +
        (parseFloat(estilo.getPropertyValue("--rdelay")) || 0) +
        120;
      const relogio = window.setTimeout(() => {
        relogios.delete(relogio);
        el.classList.add("assente");
      }, ms);
      relogios.add(relogio);
    };

    const todos = () => porRevelar().forEach(revelar);

    if (reduzido || !("IntersectionObserver" in window)) {
      todos();
      return;
    }

    // Assim que o observador dá sinal de vida uma vez, sabemos que funciona
    // neste browser — e a rede final deixa de ter de assumir o pior.
    let observadorDeuSinal = false;

    const observador = new IntersectionObserver(
      (entradas) => {
        observadorDeuSinal = true;
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            observador.unobserve(entrada.target);
            revelar(entrada.target);
          }
        }
      },
      // A margem de -10% é a do kit: o bloco só entra quando já passou bem a
      // borda, e não no instante em que assoma.
      //
      // O `threshold` fica em 0 e não nos 0.15 do kit, de propósito. Exigir
      // 15% do elemento visível é uma armadilha para secções altas: mil
      // pixels de ecrã não são 15% de trinta mil, e uma página de termos
      // nunca lá chegaria — ficava invisível até a rede de segurança a
      // apanhar segundos depois. A margem já dá o mesmo atraso de entrada,
      // sem depender do tamanho do bloco.
      { rootMargin: "0px 0px -10% 0px", threshold: 0 }
    );

    const ligar = () => porRevelar().forEach((el) => observador.observe(el));
    ligar();

    // Blocos que aparecem depois — paginação, filtros, troca de vista. Antes
    // isto era refeito a cada deslocamento; agora corre quando o DOM muda,
    // que é quando de facto há blocos novos. As mutações são agrupadas num
    // `requestAnimationFrame` para uma renderização que insere trinta cartões
    // não dar trinta varreduras.
    let quadroLigar = 0;
    const mutacoes = new MutationObserver(() => {
      if (quadroLigar) return;
      quadroLigar = requestAnimationFrame(() => {
        quadroLigar = 0;
        ligar();
      });
    });
    mutacoes.observe(document.body, { childList: true, subtree: true });

    /**
     * Revela o que já está dentro da janela, sem a margem de -10%.
     *
     * Corre duas vezes ao carregar e nunca mais. É a resposta à única lacuna
     * real da margem negativa: conteúdo que assenta nos últimos 10% do
     * primeiro ecrã nunca chega a intersectar a janela encolhida, e numa
     * página curta de mais para se rolar ficaria invisível para sempre.
     */
    const varrerJanela = () => {
      const altura = window.innerHeight || 800;
      porRevelar().forEach((el) => {
        const caixa = el.getBoundingClientRect();
        if (caixa.top < altura && caixa.bottom > 0) revelar(el);
      });
    };

    const primeiroFotograma = requestAnimationFrame(varrerJanela);
    const inicial = window.setTimeout(varrerJanela, 400);

    // Rede final, aos quatro segundos.
    //
    // Antes revelava a página inteira, sempre — e com o observador a
    // funcionar isso não é uma rede, é um interruptor que desliga a entrada
    // ao entrar no ecrã e acende de uma vez tudo o que estava por baixo.
    // Agora só o faz se o observador nunca tiver dado sinal, que é o caso
    // que a rede existe para cobrir. Se deu, basta fechar a lacuna da margem.
    const rede = window.setTimeout(() => {
      if (observadorDeuSinal) varrerJanela();
      else todos();
    }, 4000);

    return () => {
      cancelAnimationFrame(primeiroFotograma);
      if (quadroLigar) cancelAnimationFrame(quadroLigar);
      window.clearTimeout(inicial);
      window.clearTimeout(rede);
      for (const relogio of relogios) window.clearTimeout(relogio);
      relogios.clear();
      mutacoes.disconnect();
      observador.disconnect();
    };
  }, []);

  return null;
}
