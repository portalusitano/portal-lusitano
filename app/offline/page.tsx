"use client";

import LocalizedLink from "@/components/LocalizedLink";
import { useLanguage } from "@/context/LanguageContext";

const text = {
  pt: {
    badge: "Sem Ligação",
    title: "Está Offline",
    description: "A ligação à internet foi perdida. Verifique a sua rede e tente novamente.",
    retry: "Tentar Novamente",
    home: "Página Inicial",
  },
  en: {
    badge: "No Connection",
    title: "You're Offline",
    description: "The internet connection was lost. Check your network and try again.",
    retry: "Try Again",
    home: "Homepage",
  },
  es: {
    badge: "Sin Conexión",
    title: "Está Offline",
    description: "La conexión a internet se ha perdido. Verifique su red e intente nuevamente.",
    retry: "Intentar de Nuevo",
    home: "Página de Inicio",
  },
};

export default function OfflinePage() {
  const { language } = useLanguage();
  const t = text[language];

  return (
    <main className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-6 text-center">
      {/* Linha decorativa */}
      <div className="w-px h-16 bg-gradient-to-b from-transparent via-[var(--gold)] to-transparent mb-10" />

      <span className="rotulo-forte mb-6 block">{t.badge}</span>

      <h1 className="text-2xl sm:text-4xl md:text-6xl font-serif text-[var(--foreground)] mb-6 leading-tight">
        {t.title}
      </h1>

      <p className="text-[var(--foreground-secondary)] font-normal text-sm md:text-base max-w-sm leading-relaxed mb-12">
        &ldquo;{t.description}&rdquo;
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-3 text-[10px] uppercase tracking-wider bg-[var(--gold)] text-black hover:bg-white transition-colors font-bold"
        >
          {t.retry}
        </button>
        <LocalizedLink
          href="/"
          className="px-8 py-3 text-[10px] uppercase tracking-wider border border-[var(--border)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:border-[var(--border-hover)] transition-colors"
        >
          {t.home}
        </LocalizedLink>
      </div>

      <div className="mt-20 flex items-center gap-4">
        <div className="w-8 h-px bg-[var(--gold)]" />
        <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[var(--foreground-muted)]">
          Portal Lusitano
        </span>
        <div className="w-8 h-px bg-[var(--gold)]" />
      </div>
    </main>
  );
}
