"use client";

import { Component, ReactNode } from "react";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";
import LocalizedLink from "@/components/LocalizedLink";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

type Lang = "pt" | "en" | "es";

const errorText: Record<Lang, { title: string; description: string; retry: string; home: string }> =
  {
    pt: {
      title: "Algo correu mal",
      description:
        "Ocorreu um erro inesperado. Por favor, tente novamente ou volte à página inicial.",
      retry: "Tentar Novamente",
      home: "Página Inicial",
    },
    en: {
      title: "Something went wrong",
      description: "An unexpected error occurred. Please try again or return to the homepage.",
      retry: "Try Again",
      home: "Homepage",
    },
    es: {
      title: "Algo salió mal",
      description:
        "Ocurrió un error inesperado. Por favor, inténtelo de nuevo o vuelva a la página de inicio.",
      retry: "Intentar de Nuevo",
      home: "Página de Inicio",
    },
  };

function detectLanguage(): Lang {
  if (typeof window === "undefined") return "pt";
  try {
    const stored = localStorage.getItem("portal-language");
    if (stored === "en" || stored === "es" || stored === "pt") return stored;
  } catch {
    // localStorage may be unavailable
  }
  const nav = navigator.language?.toLowerCase() || "";
  if (nav.startsWith("en")) return "en";
  if (nav.startsWith("es")) return "es";
  return "pt";
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // next/dynamic com ssr:false lança este erro no servidor — é comportamento
    // esperado do Next.js, NÃO um erro real. Se o apanharmos aqui, impedimos
    // a hidratação e os event handlers deixam de funcionar no cliente.
    if (
      error.message?.includes("Bail out to client-side rendering") ||
      error.message?.includes("BAILOUT_TO_CLIENT_SIDE_RENDERING")
    ) {
      throw error; // re-throw para o Next.js tratar normalmente
    }
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: React.ErrorInfo) {
    // Sentry captura automaticamente via sentry.client.config.ts
    if (process.env.NODE_ENV === "development") {
      // ErrorBoundary caught error (Sentry captures automatically)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const lang = detectLanguage();
      const t = errorText[lang];

      return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6">
          <div className="max-w-md w-full text-center">
            {/* Icone */}
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <AlertTriangle className="text-red-500" size={40} />
            </div>

            {/* Titulo */}
            <h1 className="text-3xl text-[var(--foreground)] mb-4">{t.title}</h1>

            {/* Descricao */}
            <p className="text-[var(--foreground-secondary)] mb-8">{t.description}</p>

            {/* Detalhes do erro (apenas em desenvolvimento) */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-left overflow-auto max-h-40">
                <p className="text-red-400 text-xs font-mono">{this.state.error.message}</p>
              </div>
            )}

            {/* Acoes */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center gap-2 bg-[var(--gold)] text-black px-6 py-3 text-xs uppercase tracking-wider font-bold hover:bg-white transition-colors"
              >
                <RefreshCw size={16} />
                {t.retry}
              </button>

              <LocalizedLink
                href="/"
                className="inline-flex items-center justify-center gap-2 border border-[var(--border-hover)] text-[var(--foreground)] px-6 py-3 text-xs uppercase tracking-wider hover:border-[var(--border-hover)] hover:text-[var(--foreground-strong)] transition-colors"
              >
                <Home size={16} />
                {t.home}
              </LocalizedLink>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
