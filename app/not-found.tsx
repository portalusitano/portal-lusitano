"use client";

import LocalizedLink from "@/components/LocalizedLink";
import { Home, ArrowLeft, Search } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 opacity-5" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--gold)] rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[var(--gold)] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 text-center max-w-2xl">
        {/* Numero 404 */}
        <div className="relative mb-8 opacity-0 animate-[scaleIn_0.4s_ease-out_forwards]">
          <span className="text-[180px] md:text-[250px] font-serif text-transparent bg-clip-text bg-gradient-to-b from-[var(--background-elevated)] to-transparent leading-none select-none">
            404
          </span>
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards]"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="text-6xl md:text-8xl font-serif text-[var(--gold)]">404</span>
          </div>
        </div>

        {/* Titulo */}
        <h1
          className="text-3xl md:text-4xl font-serif text-[var(--foreground)] mb-4 opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards]"
          style={{ animationDelay: "0.15s" }}
        >
          {t.not_found.title}
        </h1>

        {/* Descricao */}
        <p
          className="text-[var(--foreground-muted)] mb-12 font-serif italic opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards]"
          style={{ animationDelay: "0.2s" }}
        >
          {t.not_found.description}
          <br />
          {t.not_found.guide_back}
        </p>

        {/* Botoes */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards]"
          style={{ animationDelay: "0.25s" }}
        >
          <LocalizedLink
            href="/"
            className="flex items-center gap-3 bg-[var(--gold)] text-black px-8 py-4 text-xs uppercase tracking-[0.2em] font-bold hover:bg-white transition-colors"
          >
            <Home size={16} />
            {t.not_found.back_home}
          </LocalizedLink>

          <LocalizedLink
            href="/comprar"
            className="flex items-center gap-3 border border-[var(--border-hover)] text-[var(--foreground)] px-8 py-4 text-xs uppercase tracking-[0.2em] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors"
          >
            <Search size={16} />
            {t.not_found.explore_shop}
          </LocalizedLink>
        </div>

        {/* Link de voltar */}
        <button
          onClick={() => window.history.back()}
          className="mt-12 inline-flex items-center gap-2 text-[var(--foreground-muted)] hover:text-[var(--gold)] transition-colors text-sm opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards]"
          style={{ animationDelay: "0.35s" }}
        >
          <ArrowLeft size={14} />
          {t.not_found.go_back}
        </button>

        {/* Decoracao inferior */}
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards]"
          style={{ animationDelay: "0.45s" }}
        >
          <div className="w-12 h-[1px] bg-[var(--gold)]" />
          <span className="text-[10px] sm:text-[8px] uppercase tracking-[0.3em] text-[var(--foreground-muted)]">
            Portal Lusitano
          </span>
          <div className="w-12 h-[1px] bg-[var(--gold)]" />
        </div>
      </div>
    </main>
  );
}
