"use client";

import { useEffect, useMemo, useState } from "react";
import GuardaRascunho from "@/components/vender-cavalo/GuardaRascunho";
import type { EstadoRascunho } from "@/components/vender-cavalo/usar-rascunho";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";

interface FarolProps {
  /** Quantas respostas faltam neste passo. É a mesma conta que trava o botão. */
  faltam: number;
  /** Se o que já se escreveu está a salvo. */
  rascunho: EstadoRascunho;
  /** Muda quando se muda de passo: é o sinal para reobservar as secções. */
  passo: number;
}

/**
 * O que está no ecrã quando se está a meio.
 *
 * **O buraco, medido.** Com o rolo em 2200px no passo 1, o que está fixo no
 * ecrã é a barra de navegação do site e o botão de subir, e mais nada. O
 * indicador de passos ficou lá em cima, o «Continuar» está lá em baixo, e o
 * cabeçalho da secção onde se está passou por trás da navegação. As três
 * perguntas de quem preenche um formulário longo — *onde vou*, *quanto falta*,
 * *isto está guardado?* — têm todas resposta nesta página, e nenhuma delas
 * está onde se trabalha.
 *
 * As três respostas cabem numa linha, e é essa linha.
 *
 * **Só em ecrã largo**, e a razão é que em telemóvel isto já existe: a
 * `FormNavigation` tem uma barra fixa que diz o passo e o estado do rascunho.
 * Duas barras fixas num ecrã de 700px é tirar-lhe o formulário para lhe contar
 * o formulário.
 *
 * **Aparece quando o indicador desaparece**, e nunca os dois ao mesmo tempo:
 * enquanto o topo do formulário está no ecrã, quem responde a estas perguntas
 * é ele, com mais detalhe e sem tapar nada.
 *
 * **Todo o estado que o rolo muda vive aqui dentro**, e é de propósito. A
 * secção actual muda enquanto se rola; se ela vivesse na página, cada mudança
 * repintava um formulário de 951 nós. Aqui repinta três.
 *
 * E quem observa é o `IntersectionObserver`, não um ouvinte de `scroll`: um
 * ouvinte destes obriga a ler o layout a meio do gesto, que é a despesa que o
 * `CLAUDE.md` conta ter tirado da página inicial e do directório.
 */
export default function Farol({ faltam, rascunho, passo }: FarolProps) {
  const { language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);
  const [visivel, setVisivel] = useState(false);
  /**
   * A secção actual **traz o passo consigo**.
   *
   * Sem isso era preciso limpá-la sempre que o passo mudasse, e limpar estado
   * no corpo de um efeito é uma cascata de renders (é o que a regra
   * `react-hooks/set-state-in-effect` recusa, e com razão). Com o passo lá
   * dentro, uma leitura de um passo anterior distingue-se de uma deste ao ser
   * lida, e não há nada a limpar: o passo 4 não tem secções nenhumas, e é
   * assim que o farol fica sem nome nele.
   */
  const [onde, setOnde] = useState<{ passo: number; nome: string | null }>({
    passo,
    nome: null,
  });

  /**
   * Mostrar-se ou não. São **duas** condições, e a segunda foi paga com um
   * defeito visto numa captura.
   *
   * A primeira é o topo do formulário ter saído do ecrã: o alvo é o
   * `[data-farol-topo]`, que a página põe no bloco do indicador de passos, e
   * assim as duas superfícies nunca se contradizem — uma entra exactamente
   * quando a outra sai.
   *
   * A segunda é o formulário ainda estar à vista. Sem ela, chegar ao rodapé
   * deixava o farol a anunciar «Official identification and conformation ·
   * faltam 27» por cima de uma página onde o formulário já tinha acabado —
   * uma barra que continua a apontar para uma secção que já passou é pior do
   * que barra nenhuma. Aqui a promessa é dizer onde se está, e no rodapé não
   * se está em secção nenhuma.
   */
  useEffect(() => {
    const topo = document.querySelector("[data-farol-topo]");
    const formulario = document.querySelector("form");
    if (!topo || !formulario) return;
    let passouOTopo = false;
    let formularioAVista = true;
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.target === topo) passouOTopo = !e.isIntersecting;
          else formularioAVista = e.isIntersecting;
        }
        setVisivel(passouOTopo && formularioAVista);
      },
      { threshold: 0 }
    );
    obs.observe(topo);
    obs.observe(formulario);
    return () => obs.disconnect();
  }, []);

  /**
   * Em que secção é que se está.
   *
   * A faixa de leitura é o terço de cima do ecrã (`-15%` em baixo do topo,
   * `-70%` acima do fundo): é onde os olhos estão quando se preenche um campo,
   * e não o meio geométrico da janela. A secção que a intersecta é a que se
   * anuncia; quando são duas, ganha a que estiver mais acima, que é a que se
   * está a acabar.
   *
   * Reobserva-se a cada passo porque as secções do passo anterior saíram do
   * DOM — um observador com alvos que já não existem não dá erro nenhum,
   * apenas deixa de dizer a verdade, que é pior.
   */
  useEffect(() => {
    const seccoes = [...document.querySelectorAll<HTMLElement>("form .seccao-campos")];
    if (seccoes.length === 0) return;
    const aVista = new Set<HTMLElement>();
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) aVista.add(e.target as HTMLElement);
          else aVista.delete(e.target as HTMLElement);
        }
        // A que estiver mais acima na página é a que se está a acabar.
        let primeira: HTMLElement | null = null;
        for (const s of aVista) if (!primeira || s.offsetTop < primeira.offsetTop) primeira = s;
        setOnde({
          passo,
          nome: primeira?.querySelector(".titulo-seccao")?.textContent?.trim() ?? null,
        });
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );
    for (const s of seccoes) obs.observe(s);
    return () => obs.disconnect();
  }, [passo]);

  const conta =
    faltam === 0
      ? tr("Passo completo", "Step complete", "Paso completo")
      : faltam === 1
        ? tr("Falta 1", "1 left", "Falta 1")
        : tr(`Faltam ${faltam}`, `${faltam} left`, `Faltan ${faltam}`);

  /* Uma leitura de um passo que já se deixou não vale para este. */
  const nome = onde.passo === passo ? onde.nome : null;

  return (
    <div
      className="vc-farol hidden sm:flex"
      data-visivel={visivel ? "sim" : "nao"}
      /* `aria-hidden` porque tudo o que aqui se escreve já é dito, e melhor,
         pelo indicador de passos e pelo cabeçalho de cada secção — os dois
         com marcação própria. Anunciar isto outra vez, e a cada secção por
         que se passa, seria falar por cima de quem está a escrever. */
      aria-hidden="true"
    >
      <span className="vc-farol__onde">{nome ?? " "}</span>
      <span className="vc-farol__sep" />
      <span className="vc-farol__falta" data-zero={faltam === 0 ? "sim" : "nao"}>
        {conta}
      </span>
      {rascunho.estado !== "vazio" && (
        <>
          <span className="vc-farol__sep" />
          <GuardaRascunho estado={rascunho} className="flex-none" />
        </>
      )}
    </div>
  );
}
