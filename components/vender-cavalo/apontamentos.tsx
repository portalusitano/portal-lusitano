"use client";

import { AlertTriangle, Lightbulb } from "lucide-react";
import type { Apontamento, ApontamentosPorCampo } from "@/components/vender-cavalo/inspeccao";
import type { ErrosPorCampo } from "@/components/vender-cavalo/campos-com-erro";
import type { AccoesCampo } from "@/components/vender-cavalo/types";

/**
 * O que um campo mostra quando o que lá está é improvável, mas não impossível.
 *
 * Os erros continuam a passar pelo caminho de sempre (`ErroDoCampo`), porque
 * um erro trava o passo e tem de aparecer no resumo do topo. **Aqui só passam
 * avisos e sugestões**, que não travam nada: por isso não são vermelhos e por
 * isso não vão ao resumo — um resumo de coisas que não impedem ninguém de
 * avançar é ruído no sítio onde se procura o que impede.
 *
 * A cor: o aviso usa o `--foreground-secondary` sobre uma hairline, como o
 * `.painel-nota`, e não uma quarta cor inventada. Sobre preto, quem diz «olhe
 * para isto» é o contraste e o ícone, não um amarelo que o site não tem.
 */

export function ApontamentoDoCampo({
  apontamentos,
  campo,
  aoAceitar,
}: {
  apontamentos: ApontamentosPorCampo;
  campo: string;
  /** Escreve a correcção no campo. Só as sugestões a chamam. */
  aoAceitar?: (campo: string, valor: string) => void;
}) {
  const lista = apontamentos[campo];
  if (!lista || lista.length === 0) return null;

  return (
    <div id={`apontamento-${campo}`}>
      {lista.map((a, i) => (
        <p key={`${a.nivel}-${i}`} className={`apontamento apontamento--${a.nivel}`}>
          {a.nivel === "sugestao" ? (
            <Lightbulb size={13} className="flex-none mt-0.5" aria-hidden="true" />
          ) : (
            <AlertTriangle size={13} className="flex-none mt-0.5" aria-hidden="true" />
          )}
          <span className="min-w-0">
            {a.mensagem}
            {a.nivel === "sugestao" && a.correccao !== undefined && aoAceitar && (
              <button
                type="button"
                className="apontamento__aceitar"
                onClick={() => aoAceitar(campo, a.correccao as string)}
              >
                {a.correccao}
              </button>
            )}
          </span>
        </p>
      ))}
    </div>
  );
}

/**
 * Os atributos ARIA do campo, com o erro e o apontamento juntos.
 *
 * Existe porque `aria-describedby` é **uma lista** e o `atributosErro` só
 * conhecia o erro: um campo com erro e com aviso ao mesmo tempo lia só o
 * erro, e o aviso ficava a ser texto que só quem vê o ecrã encontra.
 *
 * `aria-invalid` fica reservado ao erro. Um aviso não é uma invalidade — o
 * valor passa, o formulário avança —, e marcá-lo como inválido faria o leitor
 * de ecrã anunciar como erro aquilo que é uma pergunta.
 */
export function atributosCampo(
  erros: ErrosPorCampo,
  apontamentos: ApontamentosPorCampo,
  campo: string
): { "aria-invalid"?: true; "aria-describedby"?: string } {
  const temErro = Boolean(erros[campo]);
  const temApontamento = Boolean(apontamentos[campo]?.length);
  const descrito = [temErro ? `erro-${campo}` : "", temApontamento ? `apontamento-${campo}` : ""]
    .filter(Boolean)
    .join(" ");

  return {
    ...(temErro ? { "aria-invalid": true as const } : {}),
    ...(descrito ? { "aria-describedby": descrito } : {}),
  };
}

/** Só os apontamentos que este campo tem, para quem precisa da lista crua. */
export function apontamentosDe(apontamentos: ApontamentosPorCampo, campo: string): Apontamento[] {
  return apontamentos[campo] ?? [];
}

/**
 * Tudo o que uma caixa de texto precisa, numa chamada só: os atributos que o
 * leitor de ecrã lê e os dois momentos que decidem quando o campo pode falar.
 *
 * Existe para que ligar um campo novo seja uma linha e não cinco — com cinco,
 * o campo que se acrescenta amanhã fica com três delas e ninguém dá por isso.
 */
export function ligarCampo(
  nome: string,
  valor: string,
  props: { erros: ErrosPorCampo; apontamentos: ApontamentosPorCampo; campo: AccoesCampo }
) {
  return {
    ...atributosCampo(props.erros, props.apontamentos, nome),
    onFocus: () => props.campo.aoFocar(nome, valor),
    onBlur: () => props.campo.aoSair(nome),
  };
}
