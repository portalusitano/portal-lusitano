"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LocalizedLink from "@/components/LocalizedLink";
import { Scale } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import MarketplaceGrid from "@/components/MarketplaceGrid";

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
  const searchParams = useSearchParams();
  const isDev = searchParams.get("dev") === "true";

  const filterTranslations = {
    filter_sex: t.comprar_page.filter_sex,
    filter_price: t.comprar_page.filter_price,
    filter_discipline: t.comprar_page.filter_discipline,
    filter_sort: t.comprar_page.filter_sort,
    filter_all: t.comprar_page.filter_all,
    filter_male: t.comprar_page.filter_male,
    filter_female: t.comprar_page.filter_female,
    filter_castrated: t.comprar_page.filter_castrated,
    filter_price_under10: t.comprar_page.filter_price_under10,
    filter_price_10to25: t.comprar_page.filter_price_10to25,
    filter_price_25to50: t.comprar_page.filter_price_25to50,
    filter_price_over50: t.comprar_page.filter_price_over50,
    sort_recent: t.comprar_page.sort_recent,
    sort_price_asc: t.comprar_page.sort_price_asc,
    sort_price_desc: t.comprar_page.sort_price_desc,
    results_count: t.comprar_page.results_count,
    results_count_plural: t.comprar_page.results_count_plural,
    clear_filters: t.comprar_page.clear_filters,
    no_results: t.comprar_page.no_results,
    no_results_hint: t.comprar_page.no_results_hint,
    horses_available: t.comprar_page.horses_available,
    horse_available: t.comprar_page.horse_available,
  };

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
            <h1 className="text-2xl sm:text-3xl font-serif text-[var(--foreground)] leading-tight">
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

        {/* Client component handles filters + sorting + grid */}
        {cavalos.length > 0 ? (
          <MarketplaceGrid horses={cavalos} isDev={isDev} t={filterTranslations} />
        ) : (
          <div className="text-center py-20 sm:py-32 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
            <div className="w-16 h-16 border border-[var(--gold)]/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-[var(--foreground-muted)]"
              >
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-serif text-[var(--foreground)] mb-3">
              {t.comprar_page.no_specimens}
            </h2>
            <p className="text-sm text-[var(--foreground-muted)] mb-8 max-w-md mx-auto leading-relaxed">
              {language === "en"
                ? "The finest Lusitanos are about to arrive. Explore our journal while you wait."
                : language === "es"
                  ? "Los mejores Lusitanos están a punto de llegar. Explora nuestro diario mientras tanto."
                  : "Os melhores Lusitanos estão prestes a chegar. Explore o nosso jornal enquanto espera."}
            </p>
            <LocalizedLink
              href="/directorio"
              className="inline-flex items-center gap-2 border border-[var(--gold)]/30 text-[var(--gold)] px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-[var(--gold)]/5 transition-all duration-300"
            >
              {language === "en"
                ? "Explore the Journal"
                : language === "es"
                  ? "Explorar la Revista"
                  : "Explorar o Jornal"}
            </LocalizedLink>
          </div>
        )}
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
