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
      <div className="cartao relative rounded-b-none md:rounded-[24px] shadow-[0_12px_60px_rgba(0,0,0,0.8)]">
        <div className="relative p-5 md:p-6">
          {/* Header */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <p className="rotulo-forte">{t.label}</p>
            </div>

            <h3 className="titulo-seccao text-base mb-2">{t.title}</h3>
            <p className="meta leading-relaxed">
              {t.description}{" "}
              <LocalizedLink
                href="/privacidade"
                className="text-[var(--gold)] hover:underline underline-offset-2"
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
            <button onClick={handleAcceptAll} className="btn btn-primario w-full">
              {t.accept_all}
            </button>

            {/* Secondary row */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setShowDetails((s) => !s)} className="btn btn-secundario">
                {showDetails ? t.hide_details : t.customize}
              </button>
              <button
                onClick={showDetails ? handleAcceptSelected : handleDecline}
                className="btn btn-secundario"
              >
                {showDetails ? t.accept_selected : t.decline}
              </button>
            </div>
          </div>
        </div>{" "}
      </div>
    </div>
  );
}
