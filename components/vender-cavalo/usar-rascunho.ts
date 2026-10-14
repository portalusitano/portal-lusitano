"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormData } from "@/components/vender-cavalo/types";
import {
  guardarRascunho,
  temConteudo,
  type ResultadoGuardar,
} from "@/components/vender-cavalo/rascunho";

/**
 * O estado do rascunho, tal como pode ser dito a quem escreve.
 *
 * São quatro e não três: `recusado` existe porque o browser pode não deixar
 * guardar, e nesse caso o pior que se pode fazer é continuar a mostrar
 * «guardado».
 */
export type EstadoRascunho =
  | { estado: "vazio" }
  | { estado: "por-guardar" }
  | { estado: "guardado"; quando: number }
  | { estado: "recusado" };

/**
 * Quanto tempo de silêncio antes de escrever.
 *
 * Medido no browser, antes disto: trinta e oito teclas no nome do cavalo
 * davam **trinta e oito** gravações e 84 645 bytes escritos — 2 227 bytes por
 * tecla, em `JSON.stringify` mais um `setItem` síncrono, na linha principal, a
 * cada letra. O `localStorage` não é assíncrono e não há compositor que o
 * salve: é trabalho que se faz entre a tecla e a letra aparecer.
 *
 * Oitocentos milissegundos é o intervalo a partir do qual quem escreve parou
 * de escrever de facto — dentro de uma palavra as teclas andam a 100–250ms
 * umas das outras. Não é uma duração de movimento e por isso não é um token do
 * `globals.css`: nada se anima com ela.
 *
 * **O que torna o atraso honesto é a gravação à saída.** Sem ela, esperar por
 * silêncio seria trocar uma promessa cumprida por uma quase-promessa: fechar o
 * separador a meio de uma palavra perdia o que estivesse por gravar.
 */
const SILENCIO_MS = 800;

export interface DadosDoRascunho {
  formData: FormData;
  passo: number;
  plano: string;
  fotografias: number;
  documentos: number;
}

/** O que a última gravação escreveu, e o que lhe aconteceu. */
interface Gravacao extends DadosDoRascunho {
  resultado: ResultadoGuardar;
  quando: number;
}

/**
 * O que já está gravado é o mesmo que está no formulário?
 *
 * Compara campo a campo e **não** por identidade do objecto. Por identidade
 * era mais barato e funcionava com o `formData` que vem do `useState` da
 * página — mas bastava alguém chamar este hook com um objecto montado na
 * chamada para o indicador ficar preso em «a guardar» para sempre, a gravar
 * de 800 em 800 milissegundos e a nunca confirmar nada. Um indicador de
 * gravação que nunca confirma é a mesma promessa falha que ele existe para
 * corrigir, e não é o género de coisa que deva depender de quem chama se
 * lembrar de memoizar.
 *
 * São noventa e cinco comparações de `===` por render, o que é menos trabalho
 * do que o `temConteudo` que já corre aqui ao lado, e muito menos do que o
 * `JSON.stringify` que isto evita.
 */
function mesmosDados(a: DadosDoRascunho, b: DadosDoRascunho): boolean {
  if (
    a.passo !== b.passo ||
    a.plano !== b.plano ||
    a.fotografias !== b.fotografias ||
    a.documentos !== b.documentos
  ) {
    return false;
  }
  if (a.formData === b.formData) return true;
  const chaves = Object.keys(a.formData) as (keyof FormData)[];
  if (chaves.length !== Object.keys(b.formData).length) return false;
  return chaves.every((chave) => a.formData[chave] === b.formData[chave]);
}

/**
 * Guarda o rascunho, e diz a verdade sobre isso.
 *
 * Duas responsabilidades, e no fundo são a mesma: **gravar** com um ritmo que
 * não estorve quem escreve, e **relatar** em que pé é que a gravação está, para
 * que a página o possa mostrar. O relato vem de `guardarRascunho`, que relê o
 * que escreveu — «guardado» aqui quer dizer que está lá, e não que se tentou.
 *
 * O único estado guardado é o da **última gravação**: o que ela escreveu e o
 * que lhe aconteceu. O «por guardar» não é estado nenhum — é a comparação
 * entre isso e o que está no formulário agora, feita na altura de o mostrar.
 * Estado a mais aqui seria estado a poder ficar dessincronizado do formulário,
 * e um indicador de gravação dessincronizado é pior do que nenhum.
 *
 * `activo` é a trava do arranque: antes de o rascunho existente ter sido lido,
 * gravar é escrever o formulário vazio por cima do que lá estava.
 */
export function useRascunho(dados: DadosDoRascunho, activo: boolean): EstadoRascunho {
  const { formData, passo, plano, fotografias, documentos } = dados;
  const [ultima, setUltima] = useState<Gravacao | null>(null);

  const gravar = useCallback((novos: DadosDoRascunho) => {
    setUltima({ ...novos, resultado: guardarRascunho(novos), quando: Date.now() });
  }, []);

  /** O que a gravação da saída tem de escrever, se a página se fechar já. */
  const ultimos = useRef(dados);
  /** Há alterações por gravar? É o que decide se a saída da página grava. */
  const porGravar = useRef(false);

  const gravado = ultima !== null && mesmosDados(ultima, dados);

  useEffect(() => {
    ultimos.current = { formData, passo, plano, fotografias, documentos };
    porGravar.current = activo && !gravado;
  });

  // ---- O ritmo -------------------------------------------------------------
  // O `formData` é um objecto novo a cada tecla, que é precisamente o sinal
  // que se quer: uma tecla adia a gravação, e o silêncio dispara-a.
  useEffect(() => {
    if (!activo) return;
    const relogio = setTimeout(() => gravar(ultimos.current), SILENCIO_MS);
    return () => clearTimeout(relogio);
  }, [formData, passo, plano, fotografias, documentos, activo, gravar]);

  // ---- A saída da página ---------------------------------------------------
  // `visibilitychange` e `pagehide`, e não `beforeunload`: em telemóvel um
  // separador raramente é «fechado» — é mudado, é posto de lado, e o sistema
  // arruma-o sem avisar. O `beforeunload` não corre nesses casos; estes dois
  // correm. Grava-se ali mesmo, sem esperar pelo silêncio, porque pode não
  // haver mais tempo nenhum.
  useEffect(() => {
    if (!activo) return;
    const aoSair = () => {
      if (porGravar.current) gravar(ultimos.current);
    };
    const aoEsconder = () => {
      if (document.visibilityState === "hidden") aoSair();
    };
    document.addEventListener("visibilitychange", aoEsconder);
    window.addEventListener("pagehide", aoSair);
    return () => {
      document.removeEventListener("visibilitychange", aoEsconder);
      window.removeEventListener("pagehide", aoSair);
    };
  }, [activo, gravar]);

  // ---- O que se pode dizer -------------------------------------------------
  return useMemo<EstadoRascunho>(() => {
    // Um formulário em que ninguém tocou não é um rascunho, e dizer «a
    // guardar» sobre ele seria a primeira mentira do ecrã.
    if (!temConteudo(formData, fotografias, documentos)) return { estado: "vazio" };
    // A recusa vem antes do «por guardar», e é a ordem que interessa: «a
    // guardar» promete que daqui a pouco fica gravado, e num armazenamento
    // que está a recusar isso é falso. Enquanto o browser não deixar, a
    // resposta é a mesma — senão a linha piscava entre as duas de 800 em 800
    // milissegundos, a dar uma esperança por cada aviso.
    if (ultima?.resultado === "recusado") return { estado: "recusado" };
    if (!gravado || ultima === null) return { estado: "por-guardar" };
    if (ultima.resultado === "vazio") return { estado: "vazio" };
    return { estado: "guardado", quando: ultima.quando };
  }, [formData, fotografias, documentos, gravado, ultima]);
}
