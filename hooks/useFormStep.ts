/**
 * useFormStep Hook - Consolidação de lógica multi-step
 * Substitui: useCalculadoraState, useQuizLogic, StepForm logic
 *
 * Fornece:
 * - State management centralizado
 * - localStorage persistence
 * - URL parameter handling
 * - Navigation logic
 * - Reset/history management
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { FormStepContextValue } from "@/lib/form-step-types";

interface UseFormStepOptions {
  totalSteps: number;
  initialData?: Record<string, unknown>;
  persistKey?: string; // localStorage key
  onStepChange?: (step: number) => void;
  onDataChange?: (data: Record<string, unknown>) => void;
  allowGoBack?: boolean;
  allowJumpToStep?: boolean;
}

interface DraftData {
  data: Record<string, unknown>;
  step: number;
  timestamp: number;
}

export function useFormStep(options: UseFormStepOptions): FormStepContextValue & {
  hasDraft: boolean;
  draftDate: string | null;
  restoreDraft: () => void;
  clearDraft: () => void;
  exportData: () => Record<string, unknown>;
} {
  const {
    totalSteps,
    initialData = {},
    persistKey,
    onStepChange,
    onDataChange,
    allowGoBack = true,
    allowJumpToStep = false,
  } = options;

  // ─ State ─────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftDate, setDraftDate] = useState<string | null>(null);

  // ─ Refs ──────────────────────────────────────────
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // ─ Effects ───────────────────────────────────────

  // Check for existing draft on mount
  useEffect(() => {
    if (persistKey) {
      const draft = getDraft();
      if (draft) {
        setHasDraft(true);
        setDraftDate(new Date(draft.timestamp).toLocaleString());
      }
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [persistKey]);

  // Auto-save draft on data change
  useEffect(() => {
    if (!persistKey) return;

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(() => {
      if (isMountedRef.current) {
        saveDraft();
      }
    }, 800); // 800ms debounce

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [data, currentStep, persistKey]);

  // ─ Draft persistence ────────────────────────────

  const getDraft = (): DraftData | null => {
    if (!persistKey) return null;
    try {
      const stored = localStorage.getItem(persistKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const saveDraft = () => {
    if (!persistKey) return;
    try {
      const draft: DraftData = {
        data,
        step: currentStep,
        timestamp: Date.now(),
      };
      localStorage.setItem(persistKey, JSON.stringify(draft));
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[useFormStep] Draft save failed:", err);
      }
    }
  };

  const restoreDraft = () => {
    const draft = getDraft();
    if (!draft) return;

    if (isMountedRef.current) {
      setData(draft.data);
      setCurrentStep(draft.step);
      setHasDraft(false);
      setDraftDate(null);
    }
  };

  const clearDraft = () => {
    if (persistKey) {
      try {
        localStorage.removeItem(persistKey);
        setHasDraft(false);
        setDraftDate(null);
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("[useFormStep] Draft clear failed:", err);
        }
      }
    }
  };

  // ─ Navigation ────────────────────────────────────

  const goToStep = useCallback(
    (step: number, allowJump?: boolean) => {
      if (
        !allowJump &&
        !allowJumpToStep &&
        Math.abs(currentStep - step) > 1 &&
        step !== totalSteps - 1
      ) {
        return; // Can only go to adjacent steps
      }

      if (step < 0 || step > totalSteps) return;

      setCurrentStep(step);
      onStepChange?.(step);
    },
    [currentStep, totalSteps, allowJumpToStep, onStepChange]
  );

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, totalSteps, goToStep]);

  const prevStep = useCallback(() => {
    if (allowGoBack && currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, allowGoBack, goToStep]);

  const updateData = useCallback(
    (key: string, value: unknown) => {
      setData((prev) => {
        const updated = { ...prev, [key]: value };
        onDataChange?.(updated);
        return updated;
      });
    },
    [onDataChange]
  );

  const reset = useCallback(() => {
    setCurrentStep(0);
    setData(initialData);
    clearDraft();
  }, [initialData]);

  const submit = useCallback(async () => {
    setIsCalculating(true);
    try {
      // Submit handler should be implemented by parent
      // or passed as option
      clearDraft();
    } finally {
      if (isMountedRef.current) {
        setIsCalculating(false);
      }
    }
  }, []);

  const exportData = useCallback(() => {
    return { ...data };
  }, [data]);

  return {
    currentStep,
    totalSteps,
    isCalculating,
    data,
    goToStep,
    nextStep,
    prevStep,
    updateData,
    reset,
    submit,
    hasDraft,
    draftDate,
    restoreDraft,
    clearDraft,
    exportData,
  };
}
