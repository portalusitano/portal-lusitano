"use client";

import { useState, useEffect, useCallback } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { useLanguage } from "@/context/LanguageContext";

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_CONSENT_KEY = "cookie-consent";
const COOKIE_PREFS_KEY = "cookie-preferences";

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      className={`relative w-10 h-[22px] flex-shrink-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold)] ${
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      } ${checked ? "bg-[var(--gold)]" : "bg-[var(--background-elevated)]"}`}
      style={{ border: "1px solid", borderColor: checked ? "var(--gold)" : "var(--border)" }}
    >
      <span
        className={`absolute top-[3px] w-[14px] h-[14px] bg-white transition-all duration-200 ${
          checked ? "left-[20px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
  });
  const { language } = useLanguage();

  const text = {
    pt: {
      label: "Privacidade & Cookies",
      title: "Experiência Personalizada",
      description:
        "Usamos cookies para garantir o funcionamento do site e melhorar a sua experiência de navegação.",
      policy: "Política de Privacidade",
      accept_all: "Aceitar Todos",
      accept_selected: "Guardar Seleção",
      decline: "Recusar Opcionais",
      customize: "Personalizar",
      hide_details: "Ocultar",
      essential: "Essenciais",
      essential_desc: "Sessão, idioma, consentimento. Sempre activos.",
      analytics: "Analíticos",
      analytics_desc: "Google Analytics — uso anónimo do site.",
      marketing: "Marketing",
      marketing_desc: "Google AdSense · Meta Pixel — anúncios relevantes.",
    },
    en: {
      label: "Privacy & Cookies",
      title: "Personalised Experience",
      description:
        "We use cookies to ensure the website works properly and to improve your browsing experience.",
      policy: "Privacy Policy",
      accept_all: "Accept All",
      accept_selected: "Save Selection",
      decline: "Decline Optional",
      customize: "Customize",
      hide_details: "Hide",
      essential: "Essential",
      essential_desc: "Session, language, consent. Always active.",
      analytics: "Analytics",
      analytics_desc: "Google Analytics — anonymous site usage.",
      marketing: "Marketing",
      marketing_desc: "Google AdSense · Meta Pixel — relevant ads.",
    },
    es: {
      label: "Privacidad & Cookies",
      title: "Experiencia Personalizada",
      description:
        "Usamos cookies para garantizar el funcionamiento del sitio y mejorar su experiencia de navegación.",
      policy: "Política de Privacidad",
      accept_all: "Aceptar Todas",
      accept_selected: "Guardar Selección",
      decline: "Rechazar Opcionales",
      customize: "Personalizar",
      hide_details: "Ocultar",
      essential: "Esenciales",
      essential_desc: "Sesión, idioma, consentimiento. Siempre activos.",
      analytics: "Analíticas",
      analytics_desc: "Google Analytics — uso anónimo del sitio.",
      marketing: "Marketing",
      marketing_desc: "Google AdSense · Meta Pixel — anuncios relevantes.",
    },
  };

  const t = text[language];

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const applyConsent = useCallback((prefs: CookiePreferences) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("consent", "update", {
        ad_storage: prefs.marketing ? "granted" : "denied",
        ad_user_data: prefs.marketing ? "granted" : "denied",
        ad_personalization: prefs.marketing ? "granted" : "denied",
        analytics_storage: prefs.analytics ? "granted" : "denied",
        functionality_storage: "granted",
        personalization_storage: "granted",
      });
    }
    localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify(prefs));
  }, []);

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = { essential: true, analytics: true, marketing: true };
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    applyConsent(allAccepted);
    setIsVisible(false);
  };

  const handleAcceptSelected = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "custom");
    applyConsent(preferences);
    setIsVisible(false);
  };

  const handleDecline = () => {
    const declined: CookiePreferences = { essential: true, analytics: false, marketing: false };
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    applyConsent(declined);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-label={
        language === "en"
          ? "Cookie consent"
          : language === "es"
            ? "Consentimiento de cookies"
            : "Consentimento de cookies"
      }
      className="fixed bottom-0 left-0 right-0 md:left-auto md:right-6 md:bottom-6 z-[9998] md:w-[360px] pb-[72px] md:pb-0 opacity-0 animate-[slideUp_0.5s_cubic-bezier(0.22,1,0.36,1)_forwards]"
      style={{ willChange: "transform, opacity" }}
    >
      <div className="relative bg-[var(--background)] border-t border-l border-r border-[var(--border)] md:border shadow-[0_-8px_50px_rgba(0,0,0,0.7)] md:shadow-[0_12px_60px_rgba(0,0,0,0.8)]">
        {/* Gold accent top line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent" />

        {/* SVG grain texture */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.025] pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="cookie-noise">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.65"
                numOctaves="3"
                stitchTiles="stitch"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
          </defs>
          <rect width="100%" height="100%" filter="url(#cookie-noise)" />
        </svg>

        <div className="relative p-5 md:p-6">
          {/* Header */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              {/* Gold ornament */}
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-px bg-gradient-to-r from-transparent to-[var(--gold)]/60" />
                <svg width="5" height="5" viewBox="0 0 5 5" xmlns="http://www.w3.org/2000/svg">
                  <rect
                    x="0.5"
                    y="0.5"
                    width="4"
                    height="4"
                    transform="rotate(45 2.5 2.5)"
                    fill="none"
                    stroke="var(--gold)"
                    strokeWidth="0.8"
                    strokeOpacity="0.7"
                  />
                </svg>
                <div className="w-4 h-px bg-gradient-to-l from-transparent to-[var(--gold)]/60" />
              </div>
              <p className="text-[var(--gold)] rotulo">{t.label}</p>
            </div>

            <h3 className="font-serif text-[var(--foreground)] text-[1.15rem] leading-snug mb-2.5">
              {t.title}
            </h3>
            <p className="text-[var(--foreground-muted)] text-[11px] leading-relaxed">
              {t.description}{" "}
              <LocalizedLink
                href="/privacidade"
                className="text-[var(--gold)]/70 hover:text-[var(--gold)] transition-colors underline underline-offset-2 decoration-[var(--gold)]/30"
              >
                {t.policy}
              </LocalizedLink>
              .
            </p>
          </div>

          {/* Expandable details */}
          {showDetails && (
            <div className="mb-4 border border-[var(--border)]">
              {[
                {
                  key: "essential",
                  label: t.essential,
                  desc: t.essential_desc,
                  disabled: true,
                  value: true,
                },
                {
                  key: "analytics",
                  label: t.analytics,
                  desc: t.analytics_desc,
                  disabled: false,
                  value: preferences.analytics,
                },
                {
                  key: "marketing",
                  label: t.marketing,
                  desc: t.marketing_desc,
                  disabled: false,
                  value: preferences.marketing,
                },
              ].map(({ key, label, desc, disabled, value }, i, arr) => (
                <div
                  key={key}
                  className={`flex items-center justify-between gap-4 px-4 py-3 ${i < arr.length - 1 ? "border-b border-[var(--border)]" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="rotulo text-[var(--foreground)] font-medium block mb-0.5">
                      {label}
                    </span>
                    <span className="text-[10px] text-[var(--foreground-muted)] leading-snug block">
                      {desc}
                    </span>
                  </div>
                  <Toggle
                    checked={value}
                    disabled={disabled}
                    onChange={
                      disabled
                        ? undefined
                        : () =>
                            setPreferences((p) => ({
                              ...p,
                              [key]: !p[key as keyof CookiePreferences],
                            }))
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            {/* Primary CTA */}
            <button
              onClick={handleAcceptAll}
              className="w-full py-3 bg-[var(--gold)] text-black rotulo font-bold hover:bg-white transition-colors duration-200 shimmer-gold"
            >
              {t.accept_all}
            </button>

            {/* Secondary row */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowDetails((s) => !s)}
                className="py-2.5 border border-[var(--border)] hover:border-[var(--gold)]/40 text-[var(--foreground-muted)] hover:text-[var(--foreground)] rotulo transition-colors duration-200"
              >
                {showDetails ? t.hide_details : t.customize}
              </button>
              <button
                onClick={showDetails ? handleAcceptSelected : handleDecline}
                className="py-2.5 border border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] rotulo transition-colors duration-200"
              >
                {showDetails ? t.accept_selected : t.decline}
              </button>
            </div>
          </div>
        </div>

        {/* Ornamental bottom-right corner */}
        <div className="absolute bottom-3 right-3 pointer-events-none opacity-[0.18]">
          <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 20 L20 20 L20 0" fill="none" stroke="var(--gold)" strokeWidth="1" />
            <path d="M0 15 L15 15 L15 0" fill="none" stroke="var(--gold)" strokeWidth="0.5" />
          </svg>
        </div>

        {/* Ornamental top-left corner */}
        <div className="absolute top-3 left-3 pointer-events-none opacity-[0.18]">
          <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 0 L0 0 L0 20" fill="none" stroke="var(--gold)" strokeWidth="1" />
            <path d="M20 5 L5 5 L5 20" fill="none" stroke="var(--gold)" strokeWidth="0.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}
