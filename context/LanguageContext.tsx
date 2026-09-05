"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
// PT is imported statically so it is always available synchronously —
// prevents blank-page flash while the dynamic import Promise resolves.
import ptDefault from "@/locales/pt.json";

type Translations = typeof ptDefault;
export type { Translations };
type Language = "pt" | "en" | "es";

// PT starts populated so the first render never returns null.
const translationsCache: Record<Language, Translations | null> = {
  pt: ptDefault,
  en: null,
  es: null,
};

const loaders: Record<Language, () => Promise<{ default: Translations }>> = {
  pt: () => import("@/locales/pt.json") as Promise<{ default: Translations }>,
  en: () => import("@/locales/en.json") as Promise<{ default: Translations }>,
  es: () => import("@/locales/es.json") as Promise<{ default: Translations }>,
};

// ptReady is always available because PT is imported statically above.
const ptReady: Translations = ptDefault;

async function loadTranslations(lang: Language): Promise<Translations> {
  if (translationsCache[lang]) return translationsCache[lang]!;
  const mod = await loaders[lang]();
  translationsCache[lang] = mod.default;
  return mod.default;
}

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  escolherIdioma: (codigo: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({
  children,
  initialLanguage = "pt",
}: {
  children: ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguage] = useState<Language>(initialLanguage);

  // translationsCache[language] is pre-populated for PT; for EN/ES falls back to
  // ptReady so the initial render always has valid translations.
  const [t, setT] = useState<Translations>(translationsCache[language] ?? ptReady);

  // When language changes to EN or ES, load translations if not cached yet.
  useEffect(() => {
    if (!translationsCache[language]) {
      loadTranslations(language).then((data) => setT(data));
    } else {
      setT(translationsCache[language]!);
    }
  }, [language]);

  // Read locale from cookie on mount — allows root layout to be static (no cookies() call)
  // while still picking up the locale set by middleware for /en/* and /es/* routes.
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)locale=(\w+)/);
    const cookieLocale = match?.[1] as Language | undefined;
    if (cookieLocale && cookieLocale !== language && ["pt", "en", "es"].includes(cookieLocale)) {
      setLanguage(cookieLocale);
      if (!translationsCache[cookieLocale]) {
        loadTranslations(cookieLocale).then(setT);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync browser state when language changes
  useEffect(() => {
    document.documentElement.lang = language;
    document.cookie = `locale=${language}; path=/; samesite=lax; max-age=${60 * 60 * 24 * 365}`;

    // Only async-load uncached translations; cached ones handled below via useMemo
    if (!translationsCache[language]) {
      loadTranslations(language).then(setT);
    }
  }, [language]);

  // Use cache if available (instant on re-render), else fall back to state.
  // Always a valid Translations object — never null.
  const resolvedT = translationsCache[language] ?? t;

  /**
   * Passa para uma língua nomeada.
   *
   * É esta que a barra usa. O `toggleLanguage` — que roda pt → en → es →
   * pt — fica por baixo dela, porque a rotação é só um caso particular de
   * escolher a seguinte, e não vale a pena manter duas cópias da troca de
   * URL e do pré-carregamento.
   */
  const escolherIdioma = useCallback((codigo: Language) => {
    setLanguage((prev) => {
      if (prev === codigo) return prev;

      // Pré-carrega a seguinte, para a escolha a seguir a esta ser instantânea.
      const aSeguir = codigo === "pt" ? "en" : codigo === "en" ? "es" : "pt";
      if (!translationsCache[aSeguir]) loadTranslations(aSeguir);

      const pathname = window.location.pathname;
      const cleanPath = pathname.replace(/^\/(en|es)/, "") || "/";
      const newPath =
        codigo === "pt" ? cleanPath : `/${codigo}${cleanPath === "/" ? "" : cleanPath}`;
      if (newPath !== pathname) {
        window.history.replaceState(null, "", newPath);
      }

      return codigo;
    });
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const seguinte = prev === "pt" ? "en" : prev === "en" ? "es" : "pt";
      // Fora do `setLanguage` para não repetir a troca de URL; o `escolherIdioma`
      // faz o trabalho e devolve o estado novo por si.
      queueMicrotask(() => escolherIdioma(seguinte));
      return prev;
    });
  }, [escolherIdioma]);

  // Memoize the context value object so consumers only re-render when
  // language or translations actually change — not on every provider render.
  const contextValue = useMemo(
    () => ({ language, toggleLanguage, escolherIdioma, t: resolvedT }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, resolvedT]
    // toggleLanguage is stable (useCallback with no deps), excluded intentionally
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage deve ser usado dentro de um LanguageProvider");
  }
  return context;
};
