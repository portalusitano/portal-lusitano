/**
 * StepIndicator Component - Reusable progress indicator
 * Used by: Calculadora, Análise Perfil, Comparador, e future forms
 */ "use client";

import React from "react";
import { Check, ChevronRight } from "lucide-react";
import type { StepIndicatorProps } from "@/lib/form-step-types";
import { cn } from "@/lib/utils";

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  totalSteps,
  steps,
  onStepClick,
  vertical = false,
}) => {
  return (
    <div className={cn("flex gap-2 md:gap-3", vertical ? "flex-col" : "flex-row flex-wrap")}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;

        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => onStepClick?.(index)}
              disabled={!onStepClick || isUpcoming}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                "disabled:cursor-not-allowed",
                isCompleted && "bg-green-100 text-green-700",
                isCurrent && "bg-blue-100 text-blue-700 ring-2 ring-blue-400 ring-offset-2",
                isUpcoming && "bg-gray-100 text-gray-400",
                !isUpcoming && "hover:shadow-md"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full font-semibold text-sm",
                  isCompleted && "bg-green-500 text-white",
                  isCurrent && "bg-blue-500 text-white",
                  isUpcoming && "bg-gray-300 text-gray-500"
                )}
              >
                {isCompleted ? <Check size={16} /> : <span>{index + 1}</span>}
              </div>

              <div className="text-left">
                <p className="text-xs font-medium opacity-75">
                  Step {index + 1} of {totalSteps}
                </p>
                <p className="text-sm font-semibold">{step.label}</p>
                {step.description && <p className="text-xs opacity-60">{step.description}</p>}
              </div>
            </button>

            {!vertical && index < steps.length - 1 && (
              <div className="flex items-center">
                <ChevronRight
                  size={16}
                  className={isCompleted ? "text-green-500" : "text-gray-300"}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

StepIndicator.displayName = "StepIndicator";
