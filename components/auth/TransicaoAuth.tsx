"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { duracaoDoToken } from "@/lib/curvas-css";

/*
 * A passagem entre o login e o registo.
 *
 * As páginas de `(auth)` partilham o mesmo cartão, e por isso quem troca de
 * uma para a outra não muda de ecrã — muda o que está dentro do mesmo. Sem
 * nada, a troca era um corte: medido no browser, passar do login para o
 * registo mudava a altura do cartão de 559 para 792 pixéis **num quadro
 * só**, e com o cartão centrado verticalmente isso puxa a marca para cima e
 * o rodapé para baixo ao mesmo tempo. Não é uma transição, é um sobressalto.
 *
 * O idioma não se inventa aqui. Entrar no registo a partir do login é entrar
 * num sítio, que é o mesmo que escolher uma região no `/mapa` ou abrir um
 * submenu do menu de ecrã inteiro: `--d-drill` com `--ease-in-out-cubic`, e
 * a duração lida do CSS em vez de copiada para aqui. A altura da caixa é
 * medida e animada como na `.pilha`, pela mesma razão escrita que lá está.
 *
 * **Não embrulha o conteúdo.** A primeira versão era um
 * `<PalcoAuth>{children}</PalcoAuth>`, que é a maneira evidente de o fazer
 * em React: a folha levava uma `key` com o caminho, e era a `key` que fazia
 * a animação repetir-se. Duas notas sobre porque é que aqui está o
 * contrário, e a segunda contradiz a primeira suspeita:
 *
 * 1. **A razão que ficou.** Com a `key`, a folha é um nó novo a cada
 *    navegação, e o `ResizeObserver` que vigia o conteúdo tem de ser
 *    desligado e religado de cada vez. Um observador acabado de ligar
 *    entrega sempre uma primeira medição — a do tamanho com que o nó
 *    nasceu —, que chega depois de a animação já ter arrancado e é
 *    indistinguível de «o conteúdo mudou de tamanho». A primeira versão
 *    abortava por causa dela a animação que tinha acabado de começar, e a
 *    troca continuava a ser o salto de 233px que isto existe para evitar.
 *    Corrigia-se ignorando a primeira entrega, mas isso é uma heurística
 *    frágil enfiada no meio de outra. Com a folha a ser sempre a mesma
 *    `<div>`, o observador liga-se uma vez e nunca mais mente.
 * 2. **A razão que não ficou, e fica escrita para não voltar a tentar-se.**
 *    Suspeitou-se que embrulhar o `children` num componente de cliente
 *    atrasava a hidratação do formulário. Medições seguidas davam 171ms
 *    contra 256ms e pareciam confirmar. Repetida a medição em A/B
 *    intercalado — os dois builds no mesmo processo, alternados três vezes
 *    —, as medianas foram 194/181/201ms sem embrulho contra 192/172/198ms
 *    com ele: **não há diferença nenhuma**. Os primeiros 85ms eram a
 *    máquina a mudar de estado entre duas séries corridas uma a seguir à
 *    outra, não o embrulho. Medir duas versões em alturas diferentes não é
 *    medir.
 *
 * Assim, o palco e a folha são duas `<div>` normais, escritas pelo servidor
 * no `layout`, e este componente é um irmão que não desenha nada (devolve
 * `null`): encontra-as pelos atributos, marca o sentido e anima a altura.
 *
 * Duas coisas que não faz, de propósito:
 *
 * 1. Não anima a primeira chegada. Quem chega de fora já traz a entrada do
 *    cartão (o `.animate-auth-fadeInUp`); uma segunda por cima dessa seriam
 *    duas ideias de entrada ao mesmo tempo, que é o que o `<PainelEscrito>`
 *    também recusa.
 * 2. Não segura ninguém. A folha nunca leva `pointer-events: none` nem
 *    `visibility: hidden`: quem carregar em «Entrar» a meio do movimento
 *    entra. Medido a 120ms de um movimento de 320ms, o campo de email está
 *    alcançável e aceita escrita.
 *
 * Sem JavaScript nada disto é escrito, e o que fica são as duas `<div>` à
 * volta do formulário. É a mesma garantia da cortina: se o script falhar, o
 * que não pode acontecer é ficar conteúdo escondido à espera dele.
 */

/**
 * Quão fundo está cada ecrã da área de entrada.
 *
 * O login é o átrio: é para lá que o middleware manda quem não tem sessão, e
 * é de lá que se sai para o registo ou para a recuperação. Tudo o resto está
 * um degrau abaixo. O prefixo de idioma (`/en/login`) não conta — o que
 * conta é a última parte do caminho.
 */
function degrau(caminho: string): number {
  const folha = caminho.split("/").filter(Boolean).pop() ?? "";
  return folha === "login" ? 0 : 1;
}

export default function TransicaoAuth() {
  const caminho = usePathname();
  const anterior = useRef<string | null>(null);

  /* A altura do **conteúdo**, medida na folha e não no palco. Medi-la no
     palco não funcionava, e o erro era fácil de não ver: o palco é o
     elemento cuja altura se está a animar, por isso o `ResizeObserver`
     disparava a cada quadro da própria animação, dava-a como «o conteúdo
     mudou de tamanho» e abortava-a logo a seguir ao arranque. A folha tem a
     altura natural do que lá está e não se mexe enquanto o palco cresce.

     Guardam-se **duas** medidas, e a razão é uma ordem que não se controla.
     Numa navegação acontecem duas coisas: o conteúdo da folha é trocado e o
     `usePathname` muda. O observador de tamanho corre entre as duas — foi
     medido: quando o efeito do caminho ia buscar «a altura de antes», já lá
     estava a de depois, e o movimento partia e chegava ao mesmo valor (727
     para 727), ou seja, não havia movimento nenhum. Com a actual e a
     anterior, o efeito consegue escolher a certa sem depender de quem correu
     primeiro: se a actual ainda for igual ao que está no ecrã, o observador
     ainda não passou e a de partida é essa; se já for diferente, passou, e a
     de partida é a anterior. */
  const alturaActual = useRef(0);
  const alturaPrevia = useRef(0);
  /* A altura para onde o movimento em curso está a ir. É o que distingue «o
     conteúdo mudou» de «o conteúdo é o que eu estou a animar»: o observador
     de tamanho dispara pela própria troca de página, e sem esta comparação
     abortava, onze milissegundos depois de arrancar, o movimento que a troca
     acabara de pedir. Não se resolve com ordem — medido, o observador tanto
     corre antes do efeito do caminho como depois. */
  const alvoDaAnimacao = useRef(0);
  const aAnimar = useRef(false);
  const largar = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fimDaAltura = useRef<((e: TransitionEvent) => void) | null>(null);

  useLayoutEffect(() => {
    const palco = document.querySelector<HTMLElement>("[data-palco-auth]");
    const folha = document.querySelector<HTMLElement>("[data-palco-folha]");
    if (!palco || !folha) return;

    /** Devolver o palco ao normal: altura livre, sem recorte, sem relógio. */
    const soltar = () => {
      if (largar.current) {
        clearTimeout(largar.current);
        largar.current = undefined;
      }
      if (fimDaAltura.current) {
        palco.removeEventListener("transitionend", fimDaAltura.current);
        fimDaAltura.current = null;
      }
      aAnimar.current = false;
      palco.style.height = "";
      delete palco.dataset.aTrocar;
      alturaActual.current = folha.offsetHeight;
    };

    const primeiraVez = anterior.current === null;
    const noEcra = folha.offsetHeight;
    /* Qual das duas medidas é a de partida — ver o comentário das refs. */
    const de = alturaActual.current === noEcra ? alturaPrevia.current : alturaActual.current;
    const sentido: "dentro" | "fora" =
      !primeiraVez && degrau(caminho) < degrau(anterior.current!) ? "fora" : "dentro";
    anterior.current = caminho;
    alturaActual.current = noEcra;

    /* Primeira chegada: a entrada é a do cartão, e não há altura de onde
       vir. Fica só a medida para a próxima troca. */
    if (primeiraVez) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* Recomeçar a animação da folha. Sem tirar o atributo e forçar um
       refluxo, ir do registo para a recuperação — dois ecrãs do mesmo
       degrau, logo o mesmo sentido — não voltava a animar: para o browser o
       `animation-name` não mudou, e uma animação que já correu não recomeça
       sozinha. É a mesma lição da `key` da `.vista-troca`, escrita à mão
       porque aqui não há `key` nenhuma — a folha é a mesma `<div>` do
       princípio ao fim. */
    delete folha.dataset.sentido;
    void folha.offsetWidth;
    folha.dataset.sentido = sentido;

    const para = noEcra;
    if (!de || de === para) return;

    aAnimar.current = true;
    alvoDaAnimacao.current = para;
    palco.dataset.aTrocar = "sim";
    palco.style.height = `${de}px`;
    /* Ler o layout obriga o browser a assentar a altura de partida antes de
       lhe dar a de chegada. Sem isto ele via só o valor final e não havia
       transição nenhuma. É uma leitura, uma vez por navegação — não é um
       `requestAnimationFrame` a rodar. */
    void palco.offsetHeight;
    palco.style.height = `${para}px`;

    const fim = (e: TransitionEvent) => {
      if (e.target === palco && e.propertyName === "height") soltar();
    };
    fimDaAltura.current = fim;
    palco.addEventListener("transitionend", fim);

    /* A rede de segurança, e a mesma regra da cortina e do globo: se o
       `transitionend` nunca chegar — separador em segundo plano, transição
       interrompida —, larga-se sozinha ao fim do dobro da duração. O que não
       pode acontecer é ficar um cartão com a altura presa para sempre. */
    largar.current = setTimeout(soltar, duracaoDoToken("--d-drill", 320) * 2);

    return () => {
      palco.removeEventListener("transitionend", fim);
      if (fimDaAltura.current === fim) fimDaAltura.current = null;
    };
  }, [caminho]);

  /* O conteúdo pode mudar de tamanho sem que a rota mude — um erro que
     aparece por baixo de um campo, uma mensagem que se abre. Enquanto nada
     se mexe, isso só actualiza a medida para a próxima troca; a meio de um
     movimento, larga-se já a altura fixa, porque mais vale um salto do que
     um formulário cortado pelo `overflow`. */
  useLayoutEffect(() => {
    const palco = document.querySelector<HTMLElement>("[data-palco-auth]");
    const folha = document.querySelector<HTMLElement>("[data-palco-folha]");
    if (!palco || !folha) return;

    const observador = new ResizeObserver(() => {
      const nova = folha.offsetHeight;
      if (!aAnimar.current) {
        if (nova !== alturaActual.current) {
          alturaPrevia.current = alturaActual.current;
          alturaActual.current = nova;
        }
        return;
      }
      /* A folha já tem o tamanho para onde o movimento vai: esta entrega é a
         da própria troca, e não um conteúdo que mudou por baixo dela. */
      if (nova === alvoDaAnimacao.current) return;
      if (largar.current) {
        clearTimeout(largar.current);
        largar.current = undefined;
      }
      if (fimDaAltura.current) {
        palco.removeEventListener("transitionend", fimDaAltura.current);
        fimDaAltura.current = null;
      }
      aAnimar.current = false;
      palco.style.height = "";
      delete palco.dataset.aTrocar;
      alturaActual.current = nova;
    });
    observador.observe(folha);

    return () => {
      observador.disconnect();
      if (largar.current) clearTimeout(largar.current);
    };
  }, []);

  return null;
}
