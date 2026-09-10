"use client";

import { useEffect } from "react";

export default function AdminError({
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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-zinc-900/50 border border-zinc-800 p-8 text-center rounded-lg">
        <div className="text-red-500 text-5xl mb-4">!</div>

        <h1 className="text-xl font-semibold text-white mb-2">Erro na Administração</h1>

        <p className="text-zinc-400 text-sm mb-6">Ocorreu um erro ao carregar esta página.</p>

        {error.digest && <p className="text-zinc-400 text-xs mb-4 font-mono">{error.digest}</p>}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-[var(--foreground-strong)] text-black font-medium text-sm py-2 px-6 hover:bg-[var(--foreground)] transition-all rounded"
          >
            Tentar novamente
          </button>

          <a
            href="/admin"
            className="bg-zinc-800 text-white font-medium text-sm py-2 px-6 hover:bg-zinc-700 transition-all rounded"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
