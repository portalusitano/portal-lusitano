"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const { t } = useLanguage();
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

  /* ── Uma barra que ninguém pediu fala baixo ────────────────────────────────
   *
   * Estava escrita a vender: «Cavalos Lusitanos sempre consigo.» a
   * `--foreground-strong`, seguida de «é gratuita e funciona sem ligação». Um
   * slogan em cima do texto mais forte da paleta, num aviso que interrompe quem
   * estava a fazer outra coisa — e «gratuita» é uma palavra de venda para uma
   * coisa que ninguém esperava que se pagasse.
   *
   * Fica o que é: o nome do que se instala, e a única razão que interessa a
   * quem lê. Sem slogan, sem `--foreground-strong` no meio da frase.
   *
   * **E o botão deixa de ser o branco.** O `.btn-primario` é a acção por
   * omissão da página, e esta barra não é a página — é uma interrupção. Quem
   * interrompe não fica com o botão mais forte do sistema. Passa a
   * `.btn-secundario`, de contorno, e o «Agora não» a `.btn-subtil`: a
   * hierarquia entre os dois mantém-se, o peso de ambos desce.
   *
   * O texto estava escrito à mão em português dentro do JSX, num componente que
   * aparece em todas as páginas de um site com três línguas — quem abrisse o
   * site em inglês lia isto em português. Passa pelos `locales/`, e o ficheiro
   * entra na lista do teste que impede que volte. */
  return (
    <div
      role="dialog"
      aria-label={t.common.pwa_titulo}
      className="fixed inset-x-3 bottom-3 z-[9990] mx-auto max-w-6xl opacity-0 animate-[slideUp_0.4s_cubic-bezier(0.22,1,0.36,1)_forwards] lg:inset-x-6 lg:bottom-6"
      style={{ willChange: "transform, opacity", marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative rounded-[28px] border border-[var(--border-soft)] bg-[var(--background-elevated)] p-4 shadow-[0_12px_60px_rgba(0,0,0,0.8)] sm:p-5">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)] lg:hidden"
          aria-label={t.common.pwa_fechar}
        >
          <X size={16} aria-hidden="true" />
        </button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
          <p className="meta flex-1 pr-8 leading-relaxed lg:pr-0">
            {t.common.pwa_titulo} — {t.common.pwa_desc}
          </p>

          <div className="flex shrink-0 gap-2.5">
            <button
              onClick={handleDismiss}
              className="btn btn-subtil hidden rounded-full lg:inline-flex"
            >
              {t.common.pwa_agora_nao}
            </button>
            <button
              onClick={handleInstall}
              className="btn btn-secundario flex-1 rounded-full text-sm lg:flex-none"
            >
              {t.common.pwa_instalar}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
