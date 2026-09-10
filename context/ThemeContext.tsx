"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always start with "dark" to match server render (inline script handles visual)
  const [theme, setTheme] = useState<Theme>("dark");

  // Sync React state with localStorage after hydration
  useEffect(() => {
    const stored = localStorage.getItem("portal-lusitano-theme");
    if (stored === "light" || stored === "dark") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with external storage on mount
      setTheme(stored);
    }
  }, []);

  // Sync class on <html> whenever theme changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const apply = () => {
      setTheme((prev) => {
        const next = prev === "dark" ? "light" : "dark";
        localStorage.setItem("portal-lusitano-theme", next);
        document.documentElement.classList.toggle("dark", next === "dark");
        document.documentElement.classList.toggle("light", next === "light");
        return next;
      });
    };

    // Use View Transitions API for animated theme switch (Chrome/Edge 111+)
    if (
      typeof document !== "undefined" &&
      "startViewTransition" in document &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      (
        document as Document & { startViewTransition: (cb: () => void) => void }
      ).startViewTransition(apply);
    } else {
      apply();
    }
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
