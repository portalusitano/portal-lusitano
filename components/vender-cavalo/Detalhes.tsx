"use client";

import { useId, useState } from "react";
import { ChevronRight } from "lucide-react";

interface DetalhesProps {
  titulo: string;
  /** Quantos campos há aqui dentro. Aparece na cabeça: quem abre sabe ao que vai. */
  campos: number;
  /** O que se ganha em abrir. Uma linha, não um parágrafo. */
  nota?: string;
  children: React.ReactNode;
}

/**
 * Detalhe opcional, fechado por omissão.
 *
 * Medido antes: 27 campos à entrada do passo 1, 47 no passo 2, 19 no passo 3 —
 * 3,3, 5,4 e 3,2 ecrãs de altura. Nenhum deles era obrigatório na maior parte,
 * mas todos estavam à vista, e uma pessoa que quer vender um cavalo não
 * distingue à primeira o que tem de preencher do que pode preencher.
 *
 * Não se usa `<details>` nativo por uma razão só: a seta e o corpo têm de
 * animar com os tokens do sistema, e o `<details>` abre de repente. O contrato
 * de acessibilidade fica o mesmo — um botão com `aria-expanded` e `aria-controls`
 * a apontar à região.
 */
export default function Detalhes({ titulo, campos, nota, children }: DetalhesProps) {
  const [aberto, setAberto] = useState(false);
  const id = useId();

  return (
    <div className="detalhes" data-aberto={aberto ? "sim" : "nao"}>
      <button
        type="button"
        className="detalhes__cabeca"
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto((a) => !a)}
      >
        <span className="min-w-0">
          <span className="titulo-seccao block">{titulo}</span>
          {nota && <span className="meta block mt-0.5">{nota}</span>}
        </span>
        <span className="flex items-center gap-2 flex-none">
          <span className="meta tabular-nums">{campos}</span>
          <ChevronRight size={16} className="detalhes__seta" aria-hidden="true" />
        </span>
      </button>
      <div id={id} className="detalhes__corpo" hidden={!aberto}>
        {children}
      </div>
    </div>
  );
}
