"use client";

import { useEffect } from "react";

export default function AdminAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void error;
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--background-secondary)] flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-[var(--background-card)]/50 border border-[var(--border)] p-8 text-center rounded-lg">
        <div className="text-red-500 text-5xl mb-4">!</div>
        <h1 className="text-xl font-semibold text-[var(--foreground)] mb-2">
          Erro na Administração
        </h1>
        <p className="text-[var(--foreground-secondary)] text-sm mb-6">
          Ocorreu um erro ao carregar esta secção.
        </p>
        {error.digest && (
          <p className="text-[var(--foreground-secondary)] text-xs mb-4 font-mono">
            {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-[var(--gold)] text-black font-medium text-sm py-2 px-6 hover:bg-[var(--gold-hover)] transition-all rounded"
          >
            Tentar novamente
          </button>
          <a
            href="/admin-app"
            className="bg-[var(--background-elevated)] text-[var(--foreground)] font-medium text-sm py-2 px-6 hover:bg-[var(--surface-hover)] transition-all rounded"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
