"use client";

import { TOTAL_STEPS } from "@/components/vender-cavalo/data";
import { useLanguage } from "@/context/LanguageContext";

interface FormNavigationProps {
  step: number;
  onPrev: () => void;
}

/**
 * Os botões de andar para a frente e para trás.
 *
 * O «Continuar» é `type="submit"` e não tem `onClick` nenhum: quem avança o
 * passo é o `onSubmit` do formulário. Assim a tecla Enter num campo de texto e
 * o carregar no botão passam pelo mesmo caminho — antes não havia `<form>` de
 * todo, e a tecla Enter não fazia nada.
 *
 * O «Anterior» leva `type="button"` de propósito: dentro de um formulário, um
 * botão sem `type` é um botão de submissão, e voltar atrás submetia.
 */
export default function FormNavigation({ step, onPrev }: FormNavigationProps) {
  const { t } = useLanguage();

  return (
    <>
      {/* Computador */}
      <div className="hidden sm:flex items-center justify-between mt-6">
        {step > 1 ? (
          <button type="button" onClick={onPrev} className="btn btn-secundario rounded-full">
            {t.vender_cavalo.previous}
          </button>
        ) : (
          <div />
        )}

        {step < TOTAL_STEPS && (
          <button type="submit" className="btn btn-primario rounded-full px-6">
            {t.vender_cavalo.continue}
          </button>
        )}
      </div>

      {/* Barra fixa em telemóvel */}
      <div className="sm:hidden fixed bottom-16 left-0 right-0 z-30 bg-[var(--background)]/95 backdrop-blur-md border-t border-[var(--border)] px-4 py-3 flex items-center gap-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={onPrev}
            className="btn btn-secundario btn-sm flex-none touch-manipulation active:scale-95"
          >
            {t.vender_cavalo.previous}
          </button>
        ) : (
          <div className="flex-none w-0" />
        )}

        <div className="flex-1 text-center">
          <p className="rotulo">
            {t.vender_cavalo.step_counter
              .replace("{current}", String(step))
              .replace("{total}", String(TOTAL_STEPS))}
          </p>
        </div>

        {step < TOTAL_STEPS && (
          <button
            type="submit"
            className="btn btn-primario btn-sm flex-none px-6 touch-manipulation active:scale-95"
          >
            {t.vender_cavalo.continue}
          </button>
        )}
      </div>

      {/* Espaço para o conteúdo não ficar debaixo da barra fixa */}
      <div className="sm:hidden h-20" />
    </>
  );
}
