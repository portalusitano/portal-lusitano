"use client";

import { useEffect } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { useLanguage } from "@/context/LanguageContext";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[Error Boundary]", error);
    } else {
      import("@sentry/nextjs")
        .then((Sentry) => {
          Sentry.captureException(error);
        })
        .catch(() => {});
    }
  }, [error]);

  return (
    <main
      className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6 relative overflow-hidden"
      aria-labelledby="error-title"
    >
      {/* Background decorativo — idêntico à 404 para consistência de marca */}
      <div className="absolute inset-0 opacity-5" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--gold)] rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[var(--gold)] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 text-center max-w-md w-full">
        {/* Ícone de exclamação estilizado */}
        <div
          className="relative mb-8 opacity-0 animate-[scaleIn_0.4s_ease-out_forwards]"
          aria-hidden="true"
        >
          {/* Grande exclamação decorativa em segundo plano */}
          <span className="text-[180px] md:text-[220px] text-transparent bg-clip-text bg-gradient-to-b from-[var(--background-elevated)] to-transparent leading-none select-none">
            !
          </span>
          {/* Exclamação dourada sobreposta */}
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards]"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="text-6xl md:text-8xl text-[var(--gold)]">!</span>
          </div>
        </div>

        {/* Título */}
        <h1
          id="error-title"
          className="text-2xl md:text-3xl text-[var(--foreground)] mb-4 opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards]"
          style={{ animationDelay: "0.15s" }}
        >
          {t.error_page.something_wrong}
        </h1>

        {/* Descrição */}
        <p
          className="text-[var(--foreground-muted)] mb-8 font-normal opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards]"
          style={{ animationDelay: "0.2s" }}
        >
          {t.error_page.apology}
        </p>

        {/* Referência técnica (digest) — útil para suporte sem expor detalhes */}
        {error.digest && (
          <p
            className="text-[var(--foreground-muted)] text-xs mb-6 font-mono opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards]"
            style={{ animationDelay: "0.25s" }}
          >
            {t.error_page.reference}{" "}
            <span className="text-[var(--foreground-muted)]">{error.digest}</span>
          </p>
        )}

        {/* Botões de ação */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards]"
          style={{ animationDelay: "0.3s" }}
        >
          <button
            onClick={reset}
            className="flex items-center gap-3 bg-[var(--gold)] text-black px-8 py-4 text-xs uppercase tracking-wide font-bold hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            aria-label={t.error_page.try_again}
          >
            {t.error_page.try_again}
          </button>

          <LocalizedLink
            href="/"
            className="flex items-center gap-3 border border-[var(--border-hover)] text-[var(--foreground)] px-8 py-4 text-xs uppercase tracking-wide hover:border-[var(--border-hover)] hover:text-[var(--foreground-strong)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
          >
            {t.error_page.back_home}
          </LocalizedLink>
        </div>

        {/* Contacto de suporte */}
        <p
          className="text-[var(--foreground-muted)] text-xs mt-10 opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards]"
          style={{ animationDelay: "0.4s" }}
        >
          {t.error_page.persist_contact}
          {""}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-[var(--gold)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>

        {/* Ornamento inferior — igual à 404 */}
        <div
          className="mt-12 flex items-center justify-center gap-4 opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards]"
          style={{ animationDelay: "0.5s" }}
          aria-hidden="true"
        >
          <div className="w-12 h-[1px] bg-[var(--gold)]" />
          <span className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
            Portal Lusitano
          </span>
          <div className="w-12 h-[1px] bg-[var(--gold)]" />
        </div>
      </div>
    </main>
  );
}
