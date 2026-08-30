"use client";

import { TOTAL_STEPS } from "@/components/vender-cavalo/data";
import { useLanguage } from "@/context/LanguageContext";

interface FormNavigationProps {
  step: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function FormNavigation({ step, onPrev, onNext }: FormNavigationProps) {
  const { t } = useLanguage();

  return (
    <>
      {/* Desktop navigation */}
      <div className="hidden sm:flex items-center justify-between mt-6">
        {step > 1 ? (
          <button
            onClick={onPrev}
            className="px-6 py-3 bg-[var(--background-card)] text-[var(--foreground)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors touch-manipulation"
          >
            {t.vender_cavalo.previous}
          </button>
        ) : (
          <div />
        )}

        {step < TOTAL_STEPS && (
          <button
            onClick={onNext}
            className="px-6 py-3 bg-[var(--gold)] text-black font-medium rounded-lg hover:bg-[var(--gold-hover)] transition-colors touch-manipulation"
          >
            {t.vender_cavalo.continue}
          </button>
        )}
      </div>

      {/* Mobile sticky bar */}
      <div className="sm:hidden fixed bottom-16 left-0 right-0 z-30 bg-[var(--background)]/95 backdrop-blur-md border-t border-[var(--border)] px-4 py-3 flex items-center gap-3">
        {step > 1 ? (
          <button
            onClick={onPrev}
            className="flex-none px-5 py-3 bg-[var(--background-card)] text-[var(--foreground)] rounded-lg text-sm touch-manipulation active:scale-95 transition-transform"
          >
            {t.vender_cavalo.previous}
          </button>
        ) : (
          <div className="flex-none w-0" />
        )}

        <div className="flex-1 text-center">
          <p className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
            {t.vender_cavalo.step_counter
              .replace("{current}", String(step))
              .replace("{total}", String(TOTAL_STEPS))}
          </p>
        </div>

        {step < TOTAL_STEPS && (
          <button
            onClick={onNext}
            className="flex-none px-6 py-3 bg-[var(--gold)] text-black font-semibold rounded-lg text-sm touch-manipulation active:scale-95 transition-transform"
          >
            {t.vender_cavalo.continue}
          </button>
        )}
      </div>

      {/* Spacer so content doesn't hide behind sticky bar on mobile */}
      <div className="sm:hidden h-20" />
    </>
  );
}
