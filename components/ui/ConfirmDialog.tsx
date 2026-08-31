"use client";

import { useEffect, useRef, useCallback } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "warning",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      confirmBtnRef.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      previousActiveElement.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
      // Focus trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    },
    [onCancel]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  const variantColors = {
    danger: {
      icon: "text-red-400",
      iconBg: "bg-red-500/10",
      confirmBtn: "bg-red-500 hover:bg-red-600 text-white",
    },
    warning: {
      icon: "text-amber-400",
      iconBg: "bg-amber-500/10",
      confirmBtn: "bg-[var(--foreground-strong)] text-black hover:bg-[var(--foreground)]",
    },
    info: {
      icon: "text-blue-400",
      iconBg: "bg-blue-500/10",
      confirmBtn: "bg-blue-500 hover:bg-blue-600 text-white",
    },
  };

  const colors = variantColors[variant];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-sm bg-[var(--background-secondary)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl animate-[fadeSlideIn_0.2s_ease-out_forwards]"
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors rounded-lg"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div
          className={`w-12 h-12 ${colors.iconBg} rounded-xl flex items-center justify-center mb-4`}
        >
          <AlertTriangle size={24} className={colors.icon} />
        </div>

        {/* Title */}
        <h3 id="confirm-dialog-title" className="text-lg text-[var(--foreground)] mb-2">
          {title}
        </h3>

        {/* Message */}
        <p
          id="confirm-dialog-message"
          className="text-sm text-[var(--foreground-secondary)] mb-6 leading-relaxed"
        >
          {message}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 min-h-[44px] border border-[var(--border)] text-[var(--foreground-secondary)] text-sm font-medium rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 min-h-[44px] text-sm font-bold rounded-lg transition-all ${colors.confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
