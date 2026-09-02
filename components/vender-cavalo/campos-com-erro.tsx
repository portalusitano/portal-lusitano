"use client";

import { AlertCircle } from "lucide-react";
import type { ErroCampo } from "@/components/vender-cavalo/validacao";

/**
 * O que um campo precisa de saber quando está errado.
 *
 * A validação devolve erros que sabem de que campo são (ver `validacao.ts`).
 * Estas três funções são o que leva essa informação até ao campo: a classe
 * que o acende, os atributos que o leitor de ecrã lê, e a frase por baixo.
 */
export type ErrosPorCampo = Record<string, string>;

export function porCampo(erros: ErroCampo[]): ErrosPorCampo {
  const mapa: ErrosPorCampo = {};
  for (const e of erros) if (!mapa[e.campo]) mapa[e.campo] = e.mensagem;
  return mapa;
}

/** `.campo`, mais `.campo-erro` quando é este que está a travar o passo. */
export function classeCampo(erros: ErrosPorCampo, campo: string, extra = ""): string {
  return ["campo", erros[campo] ? "campo-erro" : "", extra].filter(Boolean).join(" ");
}

/* Os atributos que dizem a um leitor de ecrã que o campo está inválido e onde
   está a explicação vivem agora em `apontamentos.tsx`, no `atributosCampo`.
   Esta função só conhecia o erro, e o `aria-describedby` é uma lista: num
   campo com erro *e* com aviso, quem não vê o ecrã ouvia só metade. */

/** A frase por baixo do campo. Não renderiza nada quando não há erro. */
export function ErroDoCampo({ erros, campo }: { erros: ErrosPorCampo; campo: string }) {
  const mensagem = erros[campo];
  if (!mensagem) return null;
  return (
    <p className="erro-campo" id={`erro-${campo}`}>
      <AlertCircle size={13} className="flex-none mt-0.5" aria-hidden="true" />
      <span>{mensagem}</span>
    </p>
  );
}
