"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  chaveRegistoApsl,
  lerRegistoApsl,
  verificarRegisto,
  type EstadoVerificacao,
} from "@/components/vender-cavalo/registo-apsl";

/**
 * A verificação do número de registo contra a nossa própria base.
 *
 * É a única verificação de existência possível hoje — a razão está escrita no
 * cabeçalho de `registo-apsl.ts` — e por isso vive num sítio à parte da
 * inspecção: as outras regras são contas locais e instantâneas, esta é um
 * pedido a um servidor e tem os problemas todos de um pedido a um servidor.
 *
 * Três coisas que valem a pena estar aqui escritas:
 *
 * - **Pergunta-se ao sair do campo, não a cada tecla.** Um número de registo
 *   tem uma dúzia de caracteres; verificar a cada tecla seriam doze pedidos
 *   para uma resposta que só interessa no fim.
 * - **Uma resposta atrasada não escreve por cima de uma pergunta nova.**
 *   Guarda-se a chave que se perguntou e compara-se com a que está no campo
 *   quando a resposta chega; se já não for a mesma, deita-se fora.
 * - **Uma falha nunca vira um «já existe».** Uma rede em baixo devolve
 *   `indisponivel`, e nesse estado o formulário não diz nada — não se acusa
 *   ninguém de duplicar um anúncio por causa de um pedido que não chegou.
 */

export interface RegistoVerificado {
  estado: EstadoVerificacao | "por-verificar" | "a-verificar";
  duplicado: boolean;
  /** Chamar ao sair do campo do número de registo. */
  verificar: (numero: string, nomeCavalo: string) => void;
  /** Chamar quando o número muda: a resposta anterior deixou de valer. */
  esquecer: () => void;
}

export function useRegistoApsl(opcoes: { fetch?: typeof fetch } = {}): RegistoVerificado {
  const [estado, setEstado] = useState<RegistoVerificado["estado"]>("por-verificar");
  /** A chave que está a ser perguntada agora. */
  const emCurso = useRef<string | null>(null);
  /** Montado? Uma resposta que chega depois de a página sair não escreve estado. */
  const vivo = useRef(true);
  const buscar = opcoes.fetch;

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const esquecer = useCallback(() => {
    emCurso.current = null;
    setEstado("por-verificar");
  }, []);

  const verificar = useCallback(
    (numero: string, nomeCavalo: string) => {
      const chave = chaveRegistoApsl(numero);
      // Um número que já falha nas regras locais não se vai perguntar ao
      // servidor: o que ele tem de errado já está dito, e a resposta seria
      // sempre «não existe», que aqui não é informação nenhuma.
      if (!chave || lerRegistoApsl(numero, nomeCavalo).problema) {
        esquecer();
        return;
      }
      if (emCurso.current === chave) return;

      emCurso.current = chave;
      setEstado("a-verificar");
      void verificarRegisto(numero, buscar ? { fetch: buscar } : {}).then((resultado) => {
        // A resposta de uma pergunta que já não é a que está no campo não
        // conta. Sem isto, escrever depressa deixava a resposta de um número
        // antigo colada a um número novo.
        if (!vivo.current || emCurso.current !== chave) return;
        setEstado(resultado.estado);
      });
    },
    [buscar, esquecer]
  );

  return { estado, duplicado: estado === "duplicado", verificar, esquecer };
}
