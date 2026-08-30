"use client";

import { Check } from "lucide-react";
import { TOTAL_STEPS } from "@/components/vender-cavalo/data";
import { useLanguage } from "@/context/LanguageContext";

interface StepIndicatorProps {
  currentStep: number;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  const { t } = useLanguage();

  const stepLabels: string[] = [
    t.vender_cavalo.step_label_owner + " & " + t.vender_cavalo.step_label_id,
    t.vender_cavalo.step_label_lineage + " & " + t.vender_cavalo.step_label_health,
    t.vender_cavalo.step_label_price,
    t.vender_cavalo.step_label_payment,
  ];

  const progressPercent = Math.round(((currentStep - 1) / (TOTAL_STEPS - 1)) * 100);
  const stepText = t.vender_cavalo.step_counter
    .replace("{current}", String(currentStep))
    .replace("{total}", String(TOTAL_STEPS));

  return (
    <div className="mb-10">
      {/* Progress bar */}
      <div
        className="relative h-0.5 bg-[var(--background-card)] mb-6 mx-4"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={stepText}
      >
        <div
          className="absolute inset-y-0 left-0 bg-[var(--gold)] transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step announcement for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {stepText}
      </div>

      {/* Steps */}
      <div className="flex items-start justify-between">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => {
          const isCompleted = s < currentStep;
          const isCurrent = s === currentStep;
          const label = stepLabels[s - 1] ?? `${s}`;

          return (
            <div key={s} className="flex flex-col items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                  isCurrent
                    ? "bg-[var(--gold)] text-black ring-2 ring-[var(--gold)]/30 ring-offset-2 ring-offset-[var(--background)]"
                    : isCompleted
                      ? "bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/40"
                      : "bg-[var(--background-card)] text-[var(--foreground-muted)] border border-[var(--border)]"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isCompleted ? <Check size={13} strokeWidth={2.5} /> : s}
              </div>
              <span
                className={`text-[11px] uppercase tracking-wider text-center leading-tight hidden sm:block ${
                  isCurrent
                    ? "text-[var(--gold)] font-semibold"
                    : isCompleted
                      ? "text-[var(--foreground-secondary)]"
                      : "text-[var(--foreground-muted)]"
                }`}
              >
                {label}
              </span>
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
