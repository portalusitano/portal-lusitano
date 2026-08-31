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
      className={`relative h-[22px] w-10 flex-shrink-0 rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold)] ${
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      } ${
        checked
          ? "border-transparent bg-[var(--foreground-strong)]"
          : "border-[var(--border)] bg-[var(--background-elevated)]"
      }`}
    >
      <span
        className={`absolute top-[3px] h-[14px] w-[14px] rounded-full transition-all duration-200 ${
          checked ? "left-[20px] bg-black" : "left-[3px] bg-[var(--foreground-muted)]"
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
      id="aviso-cookies"
      role="dialog"
      aria-label={
        language === "en"
          ? "Cookie consent"
          : language === "es"
            ? "Consentimiento de cookies"
            : "Consentimento de cookies"
      }
      // Barra larga em baixo em vez de cartão a um canto: o texto tem espaço
      // para se ler numa ou duas linhas e as acções ficam à direita, onde a
      // mão já está. Em ecrã pequeno empilha.
      className="fixed inset-x-3 bottom-3 z-[9998] mx-auto max-w-6xl opacity-0 animate-[slideUp_0.4s_cubic-bezier(0.22,1,0.36,1)_forwards] lg:inset-x-6 lg:bottom-6"
      style={{ willChange: "transform, opacity", marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="rounded-[28px] border border-[var(--border-soft)] bg-[var(--background-elevated)] p-4 shadow-[0_12px_60px_rgba(0,0,0,0.8)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
          <p className="flex-1 text-sm leading-relaxed text-[var(--foreground-secondary)]">
            {t.description}{" "}
            <LocalizedLink
              href="/privacidade"
              className="text-[var(--foreground-strong)] underline underline-offset-2 decoration-[var(--border)] hover:decoration-[var(--border-hover)]"
            >
              {t.policy}
            </LocalizedLink>
            .
          </p>

          <div className="flex shrink-0 gap-2.5">
            <button
              onClick={() => setShowDetails((v) => !v)}
              className="btn btn-secundario flex-1 rounded-full lg:flex-none"
              aria-expanded={showDetails}
            >
              {showDetails ? t.hide_details : t.customize}
            </button>
            <button
              onClick={handleAcceptAll}
              className="btn btn-primario flex-1 rounded-full text-sm lg:flex-none"
            >
              {t.accept_all}
            </button>
          </div>
        </div>

        {/* Preferências. Só aparecem a pedido — a barra fica de uma linha para
            quem só quer aceitar e seguir. */}
        {showDetails && (
          <div className="anim-crescer mt-4 border-t border-[var(--border-soft)] pt-4">
            <div className="grid gap-3 sm:grid-cols-3">
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
              ].map(({ key, label, desc, disabled, value }) => (
                <div
                  key={key}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--border-soft)] p-3"
                >
                  <div className="min-w-0">
                    <span className="block text-sm font-medium text-[var(--foreground)]">
                      {label}
                    </span>
                    <span className="meta mt-0.5 block leading-snug">{desc}</span>
                  </div>
                  <Toggle
                    checked={value}
                    disabled={disabled}
                    onChange={
                      disabled
                        ? undefined
                        : () =>
                            setPreferences((pref) => ({
                              ...pref,
                              [key]: !pref[key as keyof CookiePreferences],
                            }))
                    }
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
              <button onClick={handleDecline} className="btn btn-secundario rounded-full">
                {t.decline}
              </button>
              <button
                onClick={handleAcceptSelected}
                className="btn btn-primario rounded-full text-sm"
              >
                {t.accept_selected}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
