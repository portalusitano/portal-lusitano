"use client";

import { Suspense } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { Scale } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import MarketplaceGrid from "@/components/MarketplaceGrid";
import VistosRecentemente from "@/components/VistosRecentemente";

interface CavaloVenda {
  id: string;
  nome_cavalo: string;
  preco: number;
  image_url?: string;
  slug?: string;
  localizacao?: string;
  idade?: number;
  raca?: string;
  sexo?: string;
  disciplinas?: string[] | string | null;
  nivel?: string;
  destaque?: boolean;
  created_at?: string;
  status?: string;
}

function ComprarContentInner({
  cavalos,
  hasError,
}: {
  cavalos: CavaloVenda[];
  hasError?: boolean;
}) {
  const { t, language } = useLanguage();

  const totalCount = cavalos.length;

  return (
    <section className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-16 sm:pt-20 pb-24 sm:pb-32">
      {/* ── Marketplace Header — funcional, tipo OLX ── */}
      <header
        className="px-4 sm:px-6 md:px-12 lg:px-20 py-8 sm:py-10"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div>
            <h1 className="titulo-gradiente text-[1.75rem] md:text-[2.5rem] font-normal leading-[120%] tracking-tighter">
              {language === "en"
                ? "Lusitano Horses for Sale"
                : language === "es"
                  ? "Caballos Lusitanos en Venta"
                  : "Cavalos Lusitanos à Venda"}
            </h1>
            {totalCount > 0 && (
              <p className="text-sm text-[var(--foreground-muted)] mt-1">
                {totalCount}{" "}
                {totalCount === 1
                  ? t.comprar_page.horse_available
                  : t.comprar_page.horses_available}{" "}
                ·{" "}
                <span className="text-[var(--gold)]">
                  {language === "en"
                    ? "Verified listings"
                    : language === "es"
                      ? "Anuncios verificados"
                      : "Anúncios verificados"}
                </span>
              </p>
            )}
          </div>

          {/* Sell + Compare CTAs */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <LocalizedLink
              href="/minha-conta/alertas"
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--gold)]/50 hover:text-[var(--gold)] transition-colors text-sm touch-manipulation"
            >
              <Scale className="w-4 h-4" />
              <span className="hidden sm:inline">
                {(t.comprar_page as Record<string, string>).compare_horses || "Comparar"}
              </span>
              <span className="sm:hidden">Comparar</span>
            </LocalizedLink>
            <LocalizedLink
              href="/vender-cavalo"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--gold)] text-black font-semibold hover:bg-[var(--gold-hover)] transition-colors text-sm touch-manipulation whitespace-nowrap"
            >
              +{" "}
              {language === "en"
                ? "List Horse"
                : language === "es"
                  ? "Anunciar"
                  : "Anunciar Cavalo"}
            </LocalizedLink>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 md:px-12 lg:px-20 pt-8">
        {/* Error state */}
        {hasError && cavalos.length === 0 && (
          <div className="text-center py-16 sm:py-24">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-red-400"
              >
                <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-xl font-serif text-[var(--foreground)] mb-3">
              {language === "en"
                ? "Unable to load horses"
                : language === "es"
                  ? "No se pudieron cargar los caballos"
                  : "Erro ao carregar cavalos"}
            </h2>
            <p className="text-sm text-[var(--foreground-muted)] mb-6 max-w-md mx-auto">
              {language === "en"
                ? "A temporary error occurred. Please try again later."
                : language === "es"
                  ? "Ocurrió un error temporal. Inténtelo de nuevo más tarde."
                  : "Ocorreu um erro temporário. Tente novamente mais tarde."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--gold)] text-black font-semibold rounded-lg hover:bg-[var(--gold-hover)] transition-colors text-sm"
            >
              {language === "en"
                ? "Try Again"
                : language === "es"
                  ? "Intentar de Nuevo"
                  : "Tentar Novamente"}
            </button>
          </div>
        )}

        {/* A grelha é sempre montada quando não há erro: com o catálogo vazio,
            montá-la condicionalmente deixava o comprador sem caixa de pesquisa
            nem filtros, e o estado vazio explicativo da própria grelha — o que
            oferece guardar a pesquisa como alerta — nunca chegava a aparecer. */}
        {!hasError && <MarketplaceGrid horses={cavalos} />}

        <VistosRecentemente className="mt-16 pt-10 border-t border-[var(--border)]" />
      </div>
    </section>
  );
}

export default function ComprarContent({
  cavalos,
  hasError,
}: {
  cavalos: CavaloVenda[];
  hasError?: boolean;
}) {
  return (
    <Suspense>
      <ComprarContentInner cavalos={cavalos} hasError={hasError} />
    </Suspense>
  );
}
