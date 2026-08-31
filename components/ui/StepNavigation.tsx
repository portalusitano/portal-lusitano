/**
 * StepNavigation Component - Reusable bottom navigation for multi-step forms
 * Used by: Calculadora, Análise Perfil, Comparador
 */ "use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { StepNavigationProps } from "@/lib/form-step-types";
import { cn } from "@/lib/utils";

export const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  totalSteps,
  isCalculating = false,
  onPrev,
  onNext,
  onReset,
  onSkip,
  nextLabel = "Próximo",
  prevLabel = "Anterior",
}) => {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="flex items-center justify-between gap-2 md:gap-4 mt-6 pt-4 border-t">
      {/* Left: Reset button */}
      <div>
        {onReset && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <RotateCcw size={16} className="mr-2" />
            Reset
          </Button>
        )}
      </div>

      {/* Center: Step counter */}
      <div className="text-sm text-gray-600">
        Step {currentStep + 1} of {totalSteps}
      </div>

      {/* Right: Navigation buttons */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Back button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={isFirstStep || isCalculating}
        >
          <ChevronLeft size={16} className="mr-1" />
          {prevLabel}
        </Button>

        {/* Skip button (optional) */}
        {onSkip && !isLastStep && (
          <Button type="button" variant="ghost" size="sm" onClick={onSkip} disabled={isCalculating}>
            Skip
          </Button>
        )}

        {/* Next/Submit button */}
        <Button
          type={isLastStep ? "submit" : "button"}
          onClick={!isLastStep ? onNext : undefined}
          disabled={isCalculating}
          loading={isCalculating}
          className={cn(isLastStep && "bg-green-600 hover:bg-green-700 text-white")}
        >
          {isCalculating && <span className="animate-spin mr-2">⟳</span>}
          {isLastStep ? "Calcular" : nextLabel}
          {!isLastStep && <ChevronRight size={16} className="ml-1" />}
        </Button>
      </div>
    </div>
  );
};

StepNavigation.displayName = "StepNavigation";
