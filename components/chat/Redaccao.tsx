"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, type RefObject } from "react";
import { Loader2, SendHorizontal } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { MAX_MENSAGEM } from "@/lib/marketplace-chat";
import { deveEnviarComEnter } from "./tecla-enter";

/** Quando é que vale a pena escrever quantos caracteres faltam. */
const AVISO_A_PARTIR_DE = MAX_MENSAGEM - 250;

export interface ManipuloDaRedaccao {
  focar: () => void;
}

interface Props {
  valor: string;
  onChange: (v: string) => void;
  onEnviar: () => void;
  aEnviar: boolean;
  manipulo?: RefObject<ManipuloDaRedaccao | null>;
}

/**
 * A caixa de escrever.
 *
 * ## Cresce, e pára
 *
 * Medido antes: a caixa tinha três linhas fixas — 87px a 390×700 — e uma
 * mensagem de 4000 caracteres dava 3077px de texto lá dentro. Escrever um
 * recado comprido era escrevê-lo por uma frincha. Aqui a altura segue o texto
 * até um tecto, e o tecto existe porque a caixa não pode comer o fio que se
 * está a responder.
 *
 * ## A conta de caracteres só aparece quando falta pouco
 *
 * «0 / 4000» escrito desde o princípio é um limite a assombrar uma caixa onde
 * quase ninguém lá chega. Aparece nos últimos 250, que é onde deixa de ser
 * decoração e passa a ser um aviso.
 *
 * ## A tecla Enter
 *
 * A regra está em `tecla-enter.ts`, é pura e tem testes, e a razão de ser
 * assim está lá escrita: **é uma regra sobre o foco**. A lição custou uma vez,
 * no formulário de publicar anúncio, e não se paga duas.
 */
export default function Redaccao({ valor, onChange, onEnviar, aEnviar, manipulo }: Props) {
  const { t } = useLanguage();
  const caixa = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(manipulo, () => ({
    focar: () => caixa.current?.focus({ preventScroll: true }),
  }));

  // A altura segue o texto. Corre depois de cada mudança de valor, o que
  // inclui o rascunho reposto ao reabrir um fio — senão um rascunho de seis
  // linhas voltava a caber numa.
  const ajustar = useCallback(() => {
    const el = caixa.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(ajustar, [valor, ajustar]);

  const restam = MAX_MENSAGEM - valor.length;
  const podeEnviar = valor.trim().length > 0 && !aEnviar;

  return (
    <div className="chat-redaccao">
      <label htmlFor="chat-escrever" className="sr-only">
        {t.chat.escrever_rotulo}
      </label>
      <textarea
        id="chat-escrever"
        ref={caixa}
        rows={1}
        value={valor}
        maxLength={MAX_MENSAGEM}
        placeholder={t.chat.escrever_dica}
        aria-describedby={restam <= AVISO_A_PARTIR_DE ? "chat-restam" : undefined}
        className="chat-redaccao__caixa"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          const enviar = deveEnviarComEnter({
            tecla: e.key,
            nomeDoAlvo: (e.target as HTMLElement).tagName,
            shift: e.shiftKey,
            alt: e.altKey,
            ctrl: e.ctrlKey,
            meta: e.metaKey,
            // O `nativeEvent` é onde o React deixa o sinal do IME.
            aCompor: e.nativeEvent.isComposing,
            // Perguntado no momento e não guardado: um portátil com ecrã
            // táctil muda de apontador conforme o que se usa.
            tactil: typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
          });
          if (!enviar) return;
          e.preventDefault();
          if (podeEnviar) onEnviar();
        }}
      />

      {/* A conta só aparece nos últimos 250 caracteres. «0 / 4000» escrito
          desde o princípio é um limite a assombrar uma caixa onde quase
          ninguém lá chega. O `aria-live` fica desligado de propósito: um
          número que muda a cada tecla, lido em voz alta a cada tecla, é a
          definição de ruído — quem precisa dele lê-o pelo `aria-describedby`
          da caixa, que é onde ele está ligado. */}
      {restam <= AVISO_A_PARTIR_DE && (
        <p
          id="chat-restam"
          data-contador=""
          aria-live="off"
          className="chat-restam"
          title={t.chat.restam}
        >
          {restam}
          <span className="sr-only"> {t.chat.restam}</span>
        </p>
      )}

      <button
        type="button"
        onClick={onEnviar}
        disabled={!podeEnviar}
        aria-label={t.chat.enviar}
        className="chat-enviar"
      >
        {aEnviar ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <SendHorizontal size={16} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
