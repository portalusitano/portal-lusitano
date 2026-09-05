"use client";

import { Facebook, Linkedin, Link2, Check, Share2, X as XIcon } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";

interface ShareButtonsProps {
  title: string;
  url?: string;
  /** UTM source to append (default: "portal-lusitano") */
  utmSource?: string;
  /** UTM medium to append (default: "social") */
  utmMedium?: string;
  /** UTM campaign to append (e.g. "resultado-partilha") */
  utmCampaign?: string;
  /** Whether to show as a compact row (default) or inside a dialog triggered by a button */
  variant?: "inline" | "dialog";
  /** Titulo do painel de partilha na variante "dialog" */
  dialogTitle?: string;
}

/**
 * Appends UTM parameters to a URL string.
 * If the URL already has query params, appends with '&'; otherwise starts with '?'.
 */
function appendUtm(
  baseUrl: string,
  source: string,
  medium: string,
  campaign: string,
  content: string
): string {
  if (!baseUrl) return baseUrl;
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}utm_source=${encodeURIComponent(source)}&utm_medium=${encodeURIComponent(medium)}&utm_campaign=${encodeURIComponent(campaign)}&utm_content=${encodeURIComponent(content)}`;
}

export default function ShareButtons({
  title,
  url,
  utmSource = "portal-lusitano",
  utmMedium = "social",
  utmCampaign = "partilha",
  variant = "inline",
  dialogTitle,
}: ShareButtonsProps) {
  const { language } = useLanguage();
  const tr = createTranslator(language);

  // Rótulos repetidos: a variante em linha e a de diálogo desenham os mesmos
  // botões, e escrevê-los duas vezes era deixá-los divergir.
  const rotuloWhatsApp = tr("Partilhar no WhatsApp", "Share on WhatsApp", "Compartir en WhatsApp");
  const rotuloFacebook = tr("Partilhar no Facebook", "Share on Facebook", "Compartir en Facebook");
  const rotuloLinkedIn = tr("Partilhar no LinkedIn", "Share on LinkedIn", "Compartir en LinkedIn");
  const rotuloCopiado = tr("Link copiado", "Link copied", "Enlace copiado");
  const textoCopiado = tr("Copiado", "Copied", "Copiado");
  const textoCopiar = tr("Copiar", "Copy", "Copiar");
  const tituloPainel = dialogTitle ?? tr("Partilhar", "Share", "Compartir");

  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Base URL without UTM params (for clipboard copy)
  const baseUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  // Build platform-specific share URLs with UTM tracking
  const getShareUrl = useCallback(
    (platform: string) => appendUtm(baseUrl, utmSource, utmMedium, utmCampaign, platform),
    [baseUrl, utmSource, utmMedium, utmCampaign]
  );

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(title + " - Portal Lusitano\n" + getShareUrl("whatsapp"))}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl("facebook"))}`,
    twitter: `https://x.com/intent/tweet?url=${encodeURIComponent(getShareUrl("twitter"))}&text=${encodeURIComponent(title + " | Portal Lusitano")}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl("linkedin"))}`,
  };

  const copyToClipboard = async () => {
    const copyUrl = getShareUrl("copy-link");
    try {
      await navigator.clipboard.writeText(copyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers / insecure contexts
      const textarea = document.createElement("textarea");
      textarea.value = copyUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const openShareWindow = (shareUrl: string) => {
    window.open(shareUrl, "_blank", "width=600,height=500,noopener,noreferrer");
  };

  // Use the Web Share API when available (mobile browsers)
  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${title} | Portal Lusitano`,
          text: title,
          url: getShareUrl("native-share"),
        });
      } catch {
        // User cancelled or API not available - fall through silently
      }
    }
  };

  const hasNativeShare =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function";

  // Close dialog when clicking outside
  useEffect(() => {
    if (!dialogOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        setDialogOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDialogOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [dialogOpen]);

  // --- Share buttons row (reused in both inline and dialog variants) ---
  const buttonsRow = (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label={tr("Opções de partilha", "Share options", "Opciones de compartir")}
    >
      {/* WhatsApp */}
      <button
        onClick={() => openShareWindow(shareLinks.whatsapp)}
        className="p-2.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] hover:bg-[#25D366] text-[var(--foreground-secondary)] hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        aria-label={rotuloWhatsApp}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </button>

      {/* Facebook */}
      <button
        onClick={() => openShareWindow(shareLinks.facebook)}
        className="p-2.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] hover:bg-[#1877F2] text-[var(--foreground-secondary)] hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        aria-label={rotuloFacebook}
      >
        <Facebook size={16} aria-hidden="true" />
      </button>

      {/* X / Twitter */}
      <button
        onClick={() => openShareWindow(shareLinks.twitter)}
        className="p-2.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] hover:bg-black text-[var(--foreground-secondary)] hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        aria-label={tr(
          "Partilhar no X (antigo Twitter)",
          "Share on X (formerly Twitter)",
          "Compartir en X (antes Twitter)"
        )}
      >
        {/* X logo SVG */}
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>

      {/* LinkedIn */}
      <button
        onClick={() => openShareWindow(shareLinks.linkedin)}
        className="p-2.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] hover:bg-[#0A66C2] text-[var(--foreground-secondary)] hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        aria-label={rotuloLinkedIn}
      >
        <Linkedin size={16} aria-hidden="true" />
      </button>

      {/* Copy Link */}
      <button
        onClick={copyToClipboard}
        className={`p-2.5 rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] ${
          copied
            ? "bg-green-600/20 border-green-500/30 text-green-400"
            : "bg-[var(--background-secondary)] border-[var(--border)] hover:bg-[var(--elevate-1)] hover:border-[var(--border-hover)] text-[var(--foreground-secondary)] hover:text-[var(--foreground-strong)]"
        }`}
        aria-label={
          copied
            ? rotuloCopiado
            : tr("Copiar link de partilha", "Copy share link", "Copiar enlace para compartir")
        }
      >
        {copied ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
      </button>

      {/* Native Share API (mobile) */}
      {hasNativeShare && (
        <button
          onClick={handleNativeShare}
          className="p-2.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] hover:bg-[var(--elevate-1)] hover:border-[var(--border-hover)] text-[var(--foreground-secondary)] hover:text-[var(--foreground-strong)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] sm:hidden"
          aria-label={tr(
            "Mais opções de partilha",
            "More share options",
            "Más opciones de compartir"
          )}
        >
          <Share2 size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );

  // --- Inline variant: just the row of buttons ---
  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider mr-2 hidden sm:block">
          {tr("Partilhar:", "Share:", "Compartir:")}
        </span>
        {buttonsRow}
      </div>
    );
  }

  // --- Dialog variant: button that opens a floating share panel ---
  return (
    <div className="relative">
      <button
        onClick={() => setDialogOpen(!dialogOpen)}
        className="btn btn-secundario"
        aria-expanded={dialogOpen}
        aria-haspopup="dialog"
        aria-label={tr(
          "Abrir opções de partilha",
          "Open share options",
          "Abrir opciones de compartir"
        )}
      >
        <Share2 size={15} aria-hidden="true" />
        <span>{tituloPainel}</span>
      </button>

      {dialogOpen && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-label={tituloPainel}
          className="absolute right-0 top-full mt-2 z-50 w-[320px] bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-5 shadow-2xl shadow-black/40 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">{tituloPainel}</h3>
            <button
              onClick={() => setDialogOpen(false)}
              className="p-1 rounded text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
              aria-label={tr(
                "Fechar diálogo de partilha",
                "Close share dialog",
                "Cerrar diálogo de compartir"
              )}
            >
              <XIcon size={14} aria-hidden="true" />
            </button>
          </div>

          {/* Share platforms grid */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {/* WhatsApp */}
            <button
              onClick={() => openShareWindow(shareLinks.whatsapp)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
              aria-label={rotuloWhatsApp}
            >
              <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366] group-hover:bg-[#25D366]/20 transition-colors">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <span className="text-[10px] text-[var(--foreground-muted)]">WhatsApp</span>
            </button>

            {/* Facebook */}
            <button
              onClick={() => openShareWindow(shareLinks.facebook)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
              aria-label={rotuloFacebook}
            >
              <div className="w-10 h-10 rounded-full bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2] group-hover:bg-[#1877F2]/20 transition-colors">
                <Facebook size={18} aria-hidden="true" />
              </div>
              <span className="text-[10px] text-[var(--foreground-muted)]">Facebook</span>
            </button>

            {/* X / Twitter */}
            <button
              onClick={() => openShareWindow(shareLinks.twitter)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
              aria-label={tr("Partilhar no X", "Share on X", "Compartir en X")}
            >
              <div className="w-10 h-10 rounded-full bg-[var(--surface-hover)] flex items-center justify-center text-[var(--foreground-secondary)] group-hover:bg-[var(--border)] transition-colors">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <span className="text-[10px] text-[var(--foreground-muted)]">X</span>
            </button>

            {/* LinkedIn */}
            <button
              onClick={() => openShareWindow(shareLinks.linkedin)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
              aria-label={rotuloLinkedIn}
            >
              <div className="w-10 h-10 rounded-full bg-[#0A66C2]/10 flex items-center justify-center text-[#0A66C2] group-hover:bg-[#0A66C2]/20 transition-colors">
                <Linkedin size={18} aria-hidden="true" />
              </div>
              <span className="text-[10px] text-[var(--foreground-muted)]">LinkedIn</span>
            </button>

            {/* Copy Link */}
            <button
              onClick={copyToClipboard}
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
              aria-label={copied ? rotuloCopiado : tr("Copiar link", "Copy link", "Copiar enlace")}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  copied
                    ? "bg-green-500/20 text-green-400"
                    : "bg-[var(--elevate-1)] text-[var(--foreground-muted)] group-hover:bg-[var(--elevate-1)]"
                }`}
              >
                {copied ? (
                  <Check size={18} aria-hidden="true" />
                ) : (
                  <Link2 size={18} aria-hidden="true" />
                )}
              </div>
              <span className="text-[10px] text-[var(--foreground-muted)]">
                {copied ? textoCopiado : textoCopiar}
              </span>
            </button>
          </div>

          {/* URL preview with copy */}
          <div className="flex items-center gap-2 bg-[var(--background-elevated)]/60 border border-[var(--border)] rounded-lg p-2">
            <span className="flex-1 text-xs text-[var(--foreground-muted)] truncate select-all">
              {baseUrl}
            </span>
            <button
              onClick={copyToClipboard}
              className={`flex-shrink-0 px-3 py-1.5 rounded text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] ${
                copied
                  ? "bg-green-500/20 text-green-400"
                  : "bg-[var(--elevate-1)] text-[var(--foreground-strong)] hover:bg-[var(--elevate-1)]"
              }`}
            >
              {copied ? textoCopiado : textoCopiar}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
