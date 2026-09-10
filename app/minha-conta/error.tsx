"use client";

import { useEffect } from "react";
import LocalizedLink from "@/components/LocalizedLink";

export default function MinhaContaError({
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
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="text-[var(--foreground-muted)] text-6xl mb-6">!</div>
        <h1 className="text-2xl text-[var(--foreground)] mb-4">Erro na Conta</h1>
        <p className="text-[var(--foreground-secondary)] mb-8">
          Não foi possível carregar os dados da sua conta. Tente novamente.
        </p>
        <div className="flex flex-col gap-4">
          <button onClick={reset} className="btn btn-primario gap-2 rounded-full">
            Tentar novamente
          </button>
          <LocalizedLink
            href="/"
            className="text-[var(--foreground-muted)] text-sm hover:text-[var(--foreground-strong)] transition-colors"
          >
            Voltar ao início
          </LocalizedLink>
        </div>
      </div>
    </div>
  );
}
