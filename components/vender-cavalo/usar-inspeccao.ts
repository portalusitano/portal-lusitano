"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { FormData } from "@/components/vender-cavalo/types";
import {
  inspeccionar,
  porCampoApontamentos,
  type Apontamento,
  type ApontamentosPorCampo,
  type MensagensInspeccao,
} from "@/components/vender-cavalo/inspeccao";

/**
 * **Quando** é que um campo pode falar.
 *
 * A `inspeccao.ts` sabe *o que* dizer sobre cada campo e é pura — recalcula
 * tudo a cada tecla e não guarda estado nenhum. O estado é este, e é só sobre
 * o momento:
 *
 * 1. **Um campo cala-se até a pessoa sair dele pela primeira vez.** Marcar a
 *    vermelho um telefone com três algarismos escritos é dizer «está errado»
 *    a quem ainda vai a meio. Quem acabou de escrever ainda está a pensar
 *    naquilo; seis passos depois já não está — e é por isso que também não se
 *    espera pelo botão de Continuar.
 * 2. **Depois de ter falado, cala-se outra vez enquanto a pessoa o corrige.**
 *    Voltar a um campo já assinalado e começar a escrever apaga o apontamento
 *    até se sair de novo. Sem isto, corrigir um email a partir do meio da
 *    palavra dá três mensagens diferentes em três teclas.
 * 3. **Uma escolha numa lista fala logo.** Escolher uma opção é um acto
 *    acabado — não há meia escolha —, por isso um `<Seleccao>` não espera
 *    pelo `blur`.
 */

export interface Inspeccao {
  /** Tudo o que a inspecção encontrou, mostre-se ou não. Serve a validação do passo. */
  todos: Apontamento[];
  /** Só o que se deve ver agora, agrupado por campo. Nunca inclui erros. */
  visiveis: ApontamentosPorCampo;
  /** O erro de nível `erro` deste campo, se houver. */
  erroDe: (campo: string) => Apontamento | undefined;
  aoFocar: (campo: string, valor: string) => void;
  aoEscrever: (campo: string, valor: string) => void;
  aoSair: (campo: string) => void;
  /** Para as escolhas: passam a tocadas sem esperar pelo `blur`. */
  marcarTocado: (campo: string) => void;
}

export function useInspeccao(
  formData: FormData,
  mensagens: MensagensInspeccao,
  contexto: { registoDuplicado?: boolean } = {}
): Inspeccao {
  const { registoDuplicado } = contexto;

  const todos = useMemo(
    () => inspeccionar(formData, mensagens, { registoDuplicado }),
    [formData, mensagens, registoDuplicado]
  );

  const [tocados, setTocados] = useState<Record<string, true>>({});
  /** O campo que está a ser corrigido agora. Enquanto o for, cala-se. */
  const [aCorrigir, setACorrigir] = useState<string | null>(null);
  /** O valor que o campo tinha quando ganhou o foco — é a régua do «mudou». */
  const valorAoFocar = useRef<string>("");

  const marcarTocado = useCallback((campo: string) => {
    setTocados((antes) => (antes[campo] ? antes : { ...antes, [campo]: true }));
  }, []);

  const aoFocar = useCallback((campo: string, valor: string) => {
    valorAoFocar.current = valor;
    setACorrigir((actual) => (actual === campo ? null : actual));
  }, []);

  const aoEscrever = useCallback((campo: string, valor: string) => {
    // Só se cala se o valor mudou desde que ganhou o foco. Entrar num campo e
    // sair sem lhe tocar não devia apagar o que ele já tinha dito.
    setACorrigir(valor === valorAoFocar.current ? null : campo);
  }, []);

  const aoSair = useCallback(
    (campo: string) => {
      setACorrigir((actual) => (actual === campo ? null : actual));
      marcarTocado(campo);
    },
    [marcarTocado]
  );

  const visiveis = useMemo(() => {
    const mostraveis = todos.filter(
      (a) => a.nivel !== "erro" && tocados[a.campo] && a.campo !== aCorrigir
    );
    return porCampoApontamentos(mostraveis);
  }, [todos, tocados, aCorrigir]);

  const erroDe = useCallback(
    (campo: string) => todos.find((a) => a.campo === campo && a.nivel === "erro"),
    [todos]
  );

  return { todos, visiveis, erroDe, aoFocar, aoEscrever, aoSair, marcarTocado };
}
