/**
 * Generic types for multi-step form components
 * Used by: Calculadora, Análise Perfil, Comparador
 */

export interface FormStepItem {
  id: string;
  label: string;
  component: React.FC<Record<string, unknown>>;
  icon?: React.ReactNode;
  description?: string;
}

export interface FormStepConfig {
  totalSteps: number;
  onStepChange?: (step: number) => void;
  onCalculate?: () => Promise<void>;
  onReset?: () => void;
  onComplete?: (data: Record<string, unknown>) => void;
  showProgress?: boolean;
  showSkip?: boolean;
  allowGoBack?: boolean;
  allowJumpToStep?: boolean;
}

export interface FormStepContextValue {
  currentStep: number;
  totalSteps: number;
  isCalculating: boolean;

  data: Record<string, unknown>;

  goToStep: (step: number, allowJump?: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateData: (key: string, value: unknown) => void;
  reset: () => void;
  submit: () => Promise<void>;
}

export interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: FormStepItem[];
  onStepClick?: (step: number) => void;
  vertical?: boolean;
}

export interface StepContentProps {
  step: number;
  totalSteps: number;
  component: React.ReactNode;
  isLoading?: boolean;
}

export interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  isCalculating?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onReset?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  prevLabel?: string;
}
