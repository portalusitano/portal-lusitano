"use client";

import { LanguageProvider } from "@/context/LanguageContext";
import { ToastProvider } from "@/context/ToastContext";
import { HorseFavoritesProvider } from "@/context/HorseFavoritesContext";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/context/ThemeContext";
import { type ReactNode, type FC, lazy, Suspense } from "react";

import ErrorBoundary from "@/components/ErrorBoundary";
import ClientOverlays from "@/components/ClientOverlays";

const PWAInstallPrompt = lazy(() => import("@/components/PWAInstallPrompt"));

// FC wrapper for ErrorBoundary class component — avoids unsafe `as unknown as` cast
function ErrorBoundaryWrapper({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

// Compose multiple providers to avoid deeply nested JSX
// Each provider only re-renders its own consumers, not siblings
function composeProviders(...providers: FC<{ children: ReactNode }>[]) {
  return function ComposedProviders({ children }: { children: ReactNode }) {
    return providers.reduceRight((acc, Provider) => <Provider>{acc}</Provider>, children);
  };
}

// Providers ordered by dependency:
// ErrorBoundary > Theme > Auth > Toast > HorseFavorites
// LanguageProvider extracted from compose because it needs initialLanguage prop
const ComposedProviders = composeProviders(
  ErrorBoundaryWrapper,
  ThemeProvider,
  AuthProvider,
  ToastProvider,
  HorseFavoritesProvider
);

export function Providers({
  children,
  initialLanguage = "pt",
}: {
  children: ReactNode;
  initialLanguage?: "pt" | "en" | "es";
}) {
  return (
    <LanguageProvider initialLanguage={initialLanguage}>
      <ComposedProviders>
        {children}
        <ClientOverlays />
        <Suspense fallback={null}>
          <PWAInstallPrompt />
        </Suspense>
      </ComposedProviders>
    </LanguageProvider>
  );
}
