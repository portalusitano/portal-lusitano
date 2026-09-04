"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { TOTAL_STEPS } from "@/components/vender-cavalo/data";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";

interface StepIndicatorProps {
  currentStep: number;
  /** Quantas respostas cada passo já tem, pela ordem dos passos. */
  feitos: number[];
  /** Quantas respostas cada passo pede, no estado actual do formulário. */
  totais: number[];
}

/**
 * Onde vai o formulário.
 *
 * A barra media **o passo**: `(passo − 1) / 3`. Com vinte campos obrigatórios
 * isso ainda passava; com noventa e oito passa a mentir de uma maneira
 * concreta — alguém com o passo 2 preenchido a meio vê exactamente a mesma
 * barra de quem acabou de lá chegar, e os dois têm quarenta e sete respostas
 * de diferença. A barra passou a medir **respostas**: quantas das que o
 * formulário pede já lá estão, somando os quatro passos.
 *
 * Cada passo mostra a sua conta por baixo do número. Um passo por fazer não
 * diz nada — pôr «0 / 47» debaixo de um passo onde ainda ninguém entrou é
 * escrever o tamanho da tarefa antes de ela começar, e isso não informa,
 * desanima. Diz-se a partir do momento em que há uma resposta lá dentro, e no
 * passo em que se está.
 */
export default function StepIndicator({ currentStep, feitos, totais }: StepIndicatorProps) {
  const { t, language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  const stepLabels: string[] = [
    t.vender_cavalo.step_label_owner + " & " + t.vender_cavalo.step_label_id,
    t.vender_cavalo.step_label_lineage + " & " + t.vender_cavalo.step_label_health,
    t.vender_cavalo.step_label_price,
    t.vender_cavalo.step_label_payment,
  ];

  const somaFeitos = feitos.reduce((a, b) => a + b, 0);
  const somaTotais = totais.reduce((a, b) => a + b, 0);
  const progressPercent = somaTotais > 0 ? Math.round((somaFeitos / somaTotais) * 100) : 0;

  const stepText = t.vender_cavalo.step_counter
    .replace("{current}", String(currentStep))
    .replace("{total}", String(TOTAL_STEPS));

  const contagem = tr(
    `${somaFeitos} de ${somaTotais} respostas`,
    `${somaFeitos} of ${somaTotais} answers`,
    `${somaFeitos} de ${somaTotais} respuestas`
  );

  return (
    <div className="mb-10">
      {/* Progress bar */}
      <div
        className="relative h-0.5 bg-[var(--background-card)] mb-2 mx-4"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={contagem}
      >
        <div
          className="absolute inset-y-0 left-0 bg-[var(--foreground-strong)] transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <p className="meta text-center mb-6 tabular-nums">{contagem}</p>

      {/* Step announcement for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {stepText} — {contagem}
      </div>

      {/* Steps */}
      <div className="flex items-start justify-between">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => {
          const isCompleted = s < currentStep;
          const isCurrent = s === currentStep;
          const label = stepLabels[s - 1] ?? `${s}`;
          const feitosNoPasso = feitos[s - 1] ?? 0;
          const totalNoPasso = totais[s - 1] ?? 0;
          // Só se escreve a conta de um passo onde já se mexeu ou onde se
          // está. Antes disso é o tamanho da tarefa e mais nada.
          const mostraConta = totalNoPasso > 0 && (isCurrent || feitosNoPasso > 0);
          const passoCompleto = totalNoPasso > 0 && feitosNoPasso >= totalNoPasso;

          return (
            <div key={s} className="flex flex-col items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                  isCurrent
                    ? "bg-[var(--foreground-strong)] text-black"
                    : isCompleted
                      ? "bg-[var(--elevate-1)] text-[var(--foreground-muted)] border border-[var(--border-soft)]"
                      : "bg-[var(--background-card)] text-[var(--foreground-muted)] border border-[var(--border)]"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isCompleted ? <Check size={13} strokeWidth={2.5} /> : s}
              </div>
              <span
                className={`rotulo text-center leading-tight hidden sm:block ${
                  isCurrent
                    ? "text-[var(--foreground-muted)] font-semibold"
                    : isCompleted
                      ? "text-[var(--foreground-secondary)]"
                      : "text-[var(--foreground-muted)]"
                }`}
              >
                {label}
              </span>
              {mostraConta && (
                <span
                  className={`meta tabular-nums ${passoCompleto ? "text-[var(--ok)]" : ""}`}
                  aria-hidden="true"
                >
                  {feitosNoPasso}/{totalNoPasso}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Step counter (mobile) */}
      <p className="sm:hidden text-center text-xs text-[var(--foreground-muted)] mt-3">
        {stepText}
      </p>
    </div>
  );
}
