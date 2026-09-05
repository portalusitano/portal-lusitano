"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    if (localStorage.getItem("pwa-install-dismissed")) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Os três avisos do fundo — cookies, notificações e este — ocupam
      // agora a mesma barra em baixo. Este espera que o de cookies esteja
      // respondido, senão empilhavam-se exactamente um sobre o outro.
      setTimeout(() => {
        if (localStorage.getItem("cookie-consent")) setShowBanner(true);
      }, 5000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!showBanner || dismissed) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar a aplicação"
      className="fixed inset-x-3 bottom-3 z-[9990] mx-auto max-w-6xl opacity-0 animate-[slideUp_0.4s_cubic-bezier(0.22,1,0.36,1)_forwards] lg:inset-x-6 lg:bottom-6"
      style={{ willChange: "transform, opacity", marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative rounded-[28px] border border-[var(--border-soft)] bg-[var(--background-elevated)] p-4 shadow-[0_12px_60px_rgba(0,0,0,0.8)] sm:p-5">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)] lg:hidden"
          aria-label="Fechar"
        >
          <X size={16} aria-hidden="true" />
        </button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
          <p className="flex-1 pr-8 text-sm leading-relaxed text-[var(--foreground-secondary)] lg:pr-0">
            <span className="text-[var(--foreground-strong)]">
              Cavalos Lusitanos sempre consigo.
            </span>{" "}
            Instale a app — é gratuita e funciona sem ligação.
          </p>

          <div className="flex shrink-0 gap-2.5">
            <button
              onClick={handleDismiss}
              className="btn btn-secundario hidden rounded-full lg:inline-flex"
            >
              Agora não
            </button>
            <button
              onClick={handleInstall}
              className="btn btn-primario flex-1 rounded-full text-sm lg:flex-none"
            >
              Instalar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
