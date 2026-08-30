"use client";

import { useState, useMemo, useCallback, useRef, useDeferredValue, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MapPin,
  Search,
  Crown,
  ArrowRight,
  Plus,
  Users,
  Star,
  X,
  CheckCircle,
  Map,
} from "lucide-react";
import LocalizedLink from "@/components/LocalizedLink";
import Image from "next/image";
import dynamic from "next/dynamic";
import Pagination from "@/components/ui/Pagination";
import { AnimateOnScroll } from "@/components/AnimateOnScroll";
import { useLanguage } from "@/context/LanguageContext";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--background-secondary)]/80">
      <Map className="text-[var(--gold)] animate-pulse" size={28} />
    </div>
  ),
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface Coudelaria {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  localizacao: string;
  regiao: string;
  telefone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  foto_capa?: string;
  num_cavalos?: number;
  ano_fundacao?: number;
  especialidades: string[];
  linhagens?: string[];
  premios?: string[];
  is_pro: boolean;
  destaque: boolean;
  views_count: number;
  coordenadas_lat?: number;
  coordenadas_lng?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REGIAO_VALUES = [
  "Todas",
  "Ribatejo",
  "Alentejo",
  "Lisboa",
  "Porto",
  "Minho",
  "Douro",
  "Centro",
] as const;

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800",
  "https://images.unsplash.com/photo-1534307671554-9a6d81f4d629?w=800",
  "https://images.unsplash.com/photo-1598974357801-cbca100e65d3?w=800",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
  "https://images.unsplash.com/photo-1450052590821-8bf91254a353?w=800",
];

const ITENS_POR_PAGINA = 10;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div>
      <div className="h-8 w-48 bg-[var(--background-elevated)] rounded animate-pulse mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[400px] bg-[var(--background-elevated)] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function DirectorioContentInner({ coudelarias }: { coudelarias: Coudelaria[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;
  const { t } = useLanguage();

  const regioes = useMemo(() => {
    const r = [...REGIAO_VALUES] as string[];
    r[0] = t.directorio.region_all;
    return r;
  }, [t]);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedRegiao, setSelectedRegiao] = useState("Todas");

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearch("");
  }, []);
  const clearAll = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedRegiao("Todas");
  }, []);

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = coudelarias;
    if (selectedRegiao !== "Todas") {
      result = result.filter((c) => c.regiao === selectedRegiao);
    }
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      result = result.filter(
        (c) =>
          c.nome.toLowerCase().includes(term) ||
          c.localizacao?.toLowerCase().includes(term) ||
          c.descricao?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [coudelarias, selectedRegiao, debouncedSearch]);

  // Defer grid re-render so filter inputs stay responsive during heavy lists
  const deferredFiltered = useDeferredValue(filtered);

  // Pagination
  const totalPaginas = Math.ceil(deferredFiltered.length / ITENS_POR_PAGINA);
  const inicio = (currentPage - 1) * ITENS_POR_PAGINA;
  const paginadas = deferredFiltered.slice(inicio, inicio + ITENS_POR_PAGINA);

  const handlePageChange = useCallback(
    (page: number) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("page", page.toString());
      router.push(`?${p.toString()}`, { scroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [router, searchParams]
  );

  const hasActiveFilters = searchTerm || selectedRegiao !== "Todas";

  const [showMap, setShowMap] = useState(false);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);

  const mapCoudelarias = useMemo(
    () =>
      deferredFiltered
        .filter((c) => c.coordenadas_lat && c.coordenadas_lng)
        .map((c) => ({
          id: c.id,
          nome: c.nome,
          slug: c.slug,
          descricao: c.descricao,
          localizacao: c.localizacao,
          regiao: c.regiao,
          foto_capa: c.foto_capa,
          is_pro: c.is_pro,
          destaque: c.destaque,
          coordenadas_lat: c.coordenadas_lat,
          coordenadas_lng: c.coordenadas_lng,
        })),
    [deferredFiltered]
  );

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* ── Hero ── */}
      <section
        data-revelar=""
        className="relative pt-20 sm:pt-32 pb-16 overflow-hidden"
        aria-label="Cabeçalho do directório"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--gold)]/5 to-transparent pointer-events-none" />
        {/* Decorative line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-[var(--gold)]/60 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <AnimateOnScroll className="text-center">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--gold)] mb-5">
              <span className="block w-8 h-px bg-[var(--gold)]/60" />
              {t.directorio.badge}
              <span className="block w-8 h-px bg-[var(--gold)]/60" />
            </span>
            <h1 className="text-2xl sm:text-4xl md:text-6xl text-[var(--foreground)] mb-5">
              {t.directorio.title}
            </h1>
            <p className="text-[var(--foreground-secondary)] max-w-2xl mx-auto text-lg leading-relaxed">
              {t.directorio.subtitle}
            </p>
          </AnimateOnScroll>

          {/* Stats */}
          <AnimateOnScroll delay={100} className="grid grid-cols-3 gap-4 max-w-xl mx-auto mt-12">
            {[
              {
                value: `${coudelarias.length}+`,
                label: t.directorio.coudelarias,
              },
              { value: String(REGIAO_VALUES.length - 1), label: t.directorio.regioes },
              { value: "1000+", label: t.directorio.cavalos },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="text-center p-4 bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--gold)]/30 transition-colors"
              >
                <div className="text-3xl text-[var(--gold)]">{value}</div>
                <div className="text-sm text-[var(--foreground-muted)] mt-1">{label}</div>
              </div>
            ))}
          </AnimateOnScroll>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        {/* ── CTA Banner ── */}
        <AnimateOnScroll delay={150}>
          <div className="mb-12 p-6 sm:p-8 bg-gradient-to-r from-[var(--gold)]/10 via-[var(--gold)]/5 to-transparent border border-[var(--gold)]/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--gold)]/10 blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative">
              <div className="flex items-center gap-5">
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[var(--gold)] to-[#E8D5A3] flex items-center justify-center flex-shrink-0"
                  aria-hidden="true"
                >
                  <Crown className="text-black" size={28} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl text-[var(--foreground)] mb-1">
                    {t.directorio.has_stud}
                  </h2>
                  <p className="text-[var(--foreground-secondary)] text-sm sm:text-base">
                    {t.directorio.register_cta}
                  </p>
                </div>
              </div>
              <LocalizedLink
                href="/directorio/registar"
                className="inline-flex items-center gap-2 bg-[var(--gold)] text-black px-6 sm:px-8 py-3 sm:py-4 text-sm font-bold uppercase tracking-wider hover:bg-[var(--gold-hover)] active:scale-95 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
              >
                <Plus size={16} aria-hidden="true" />
                {t.directorio.register_btn}
              </LocalizedLink>
            </div>
          </div>
        </AnimateOnScroll>

        {/* ── Filters ── */}
        <AnimateOnScroll delay={200}>
          <div
            className="mb-10 space-y-4"
            role="search"
            aria-label={t.directorio.search_placeholder}
          >
            {/* Search bar */}
            <div className="relative group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] group-focus-within:text-[var(--gold)] transition-colors pointer-events-none"
                size={18}
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder={t.directorio.search_placeholder}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                aria-label={t.directorio.search_placeholder}
                className="w-full bg-[var(--background-secondary)]/60 border border-[var(--border)] pl-11 pr-11 py-4 text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:border-[var(--gold)] focus:outline-none focus:bg-[var(--background-secondary)] transition-all"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  aria-label={t.directorio.search_clear}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--gold)] transition-colors p-0.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Region pills */}
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={t.directorio.filter_region}
            >
              {regioes.map((regiao, i) => {
                const value = i === 0 ? "Todas" : regiao;
                const isActive = selectedRegiao === value;
                return (
                  <button
                    key={regiao}
                    onClick={() => setSelectedRegiao(value)}
                    aria-pressed={isActive}
                    className={`px-4 py-2 text-sm font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)] ${
                      isActive
                        ? "bg-[var(--gold)] border-[var(--gold)] text-black"
                        : "bg-transparent border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--gold)]/50 hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    {regiao}
                    {isActive && i !== 0 && (
                      <CheckCircle size={12} className="inline ml-1.5 -mt-0.5" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active filter summary + clear */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-sm text-[var(--foreground-muted)]">
                  {`${deferredFiltered.length} ${
                    deferredFiltered.length === 1
                      ? t.directorio.coudelaria_single
                      : t.directorio.coudelarias_plural
                  }`}
                </p>
                <button
                  onClick={clearAll}
                  className="text-sm text-[var(--gold)] hover:text-[var(--gold-hover)] hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
                >
                  {t.directorio.clear_filters}
                </button>
              </div>
            )}
          </div>
        </AnimateOnScroll>

        {/* ── Map toggle ── */}
        <AnimateOnScroll delay={250}>
          <div className="mb-10">
            <button
              onClick={() => setShowMap((v) => !v)}
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--foreground-secondary)] hover:text-[var(--gold)] border border-[var(--border)] hover:border-[var(--gold)]/50 px-4 py-2.5 transition-all"
            >
              <Map size={16} />
              {showMap ? "Ocultar Mapa" : "Ver no Mapa"}
              <span className="text-[var(--foreground-muted)] text-xs">
                ({mapCoudelarias.length})
              </span>
            </button>
            {showMap && (
              <div
                className="mt-4 relative z-0 border border-[var(--border)] overflow-hidden"
                style={{ height: 450 }}
              >
                <LeafletMap
                  coudelarias={mapCoudelarias}
                  flyTo={flyTo}
                  onMarkerClick={(c) => {
                    router.push(`/directorio/${c.slug}`);
                  }}
                />
              </div>
            )}
          </div>
        </AnimateOnScroll>

        {/* ── Results ── */}
        <div className="space-y-12">
          {paginadas.length > 0 && (
            <section data-revelar="" aria-label={t.directorio.coudelarias}>
              <AnimateOnScroll>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <span className="w-px h-6 bg-[var(--gold)]" aria-hidden="true" />
                    <Crown className="text-[var(--gold)]" size={20} aria-hidden="true" />
                    <h2 className="text-2xl text-[var(--foreground)]">
                      {t.directorio.coudelarias}
                      <span className="text-[var(--foreground-muted)] text-base font-normal ml-3">
                        ({deferredFiltered.length})
                      </span>
                    </h2>
                  </div>
                </div>
              </AnimateOnScroll>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {paginadas.map((c, i) => (
                  <CoudelariaCard key={c.id} coudelaria={c} index={i} t={t} />
                ))}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPaginas}
                onPageChange={handlePageChange}
                className="mt-12"
              />
            </section>
          )}

          {/* Empty state */}
          {deferredFiltered.length === 0 && (
            <AnimateOnScroll>
              <div className="text-center py-24">
                <div
                  className="w-20 h-20 bg-[var(--background-secondary)] border border-[var(--border)] flex items-center justify-center mx-auto mb-6"
                  aria-hidden="true"
                >
                  <Search className="text-[var(--foreground-muted)]" size={32} />
                </div>
                <h3 className="text-xl text-[var(--foreground)] mb-2">{t.directorio.no_results}</h3>
                <p className="text-[var(--foreground-muted)] max-w-sm mx-auto">
                  {t.directorio.no_results_hint}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearAll}
                    className="mt-6 inline-flex items-center gap-2 text-sm text-[var(--gold)] border border-[var(--gold)]/30 px-5 py-2.5 hover:bg-[var(--gold)]/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
                  >
                    <X size={14} aria-hidden="true" />
                    {t.directorio.clear_filters}
                  </button>
                )}
              </div>
            </AnimateOnScroll>
          )}
        </div>
      </div>
    </main>
  );
}

// ─── Card (formato único para todas as coudelarias) ─────────────────────────

function CoudelariaCard({
  coudelaria,
  index,
  t,
}: {
  coudelaria: Coudelaria;
  index: number;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const localWebp = `/images/coudelarias/${coudelaria.slug}/capa.webp`;
  const localJpg = `/images/coudelarias/${coudelaria.slug}/capa.jpg`;
  const placeholder = PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
  const [imgSrc, setImgSrc] = useState<string>(coudelaria.foto_capa || localWebp);
  // Track fallback step via ref so onError always sees the latest value
  // If foto_capa is null we already show localWebp, so skip to step 1 on error
  const fallbackStep = useRef(coudelaria.foto_capa ? 0 : 1);

  const handleError = () => {
    const step = fallbackStep.current;
    fallbackStep.current += 1;
    if (step === 0) setImgSrc(localWebp);
    else if (step === 1) setImgSrc(localJpg);
    else setImgSrc(placeholder);
  };

  return (
    <AnimateOnScroll delay={index * 50}>
      <LocalizedLink
        href={`/directorio/${coudelaria.slug}`}
        className="group block relative h-[280px] sm:h-[400px] overflow-hidden border border-[var(--border)] hover:border-[var(--gold)]/40 transition-all duration-300 hover:shadow-[0_8px_32px_rgb(var(--gold-rgb) / 0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
        aria-label={`${coudelaria.nome}, ${coudelaria.localizacao}`}
      >
        <Image
          src={imgSrc}
          alt={coudelaria.nome}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          onError={handleError}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        {/* Overlay shimmer on hover */}
        <div className="absolute inset-0 bg-[var(--gold)]/0 group-hover:bg-[var(--gold)]/5 transition-colors duration-300" />

        {/* Top badges */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            {coudelaria.destaque && (
              <span className="flex items-center gap-1.5 bg-gradient-to-r from-[var(--gold)] to-[#E8D5A3] text-black px-3 py-1.5 text-xs font-bold uppercase tracking-wide">
                <Star size={12} aria-hidden="true" />
                {t.directorio.highlight}
              </span>
            )}
            {coudelaria.ano_fundacao && (
              <span className="bg-black/70 backdrop-blur-sm text-white/90 px-2.5 py-1.5 text-xs font-medium">
                {t.directorio.since} {coudelaria.ano_fundacao}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white/80 px-2.5 py-1.5 text-xs border border-white/10">
            <CheckCircle size={10} className="text-green-400" aria-hidden="true" />
            {t.directorio.verified}
          </span>
        </div>

        {/* Content (bottom overlay) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <h3 className="text-base sm:text-2xl text-white mb-1.5 sm:mb-2 group-hover:text-[var(--gold)] transition-colors duration-300 line-clamp-1 sm:line-clamp-none">
            {coudelaria.nome}
          </h3>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-white/70 text-xs sm:text-sm mb-2 sm:mb-3">
            <span className="flex items-center gap-1">
              <MapPin size={11} className="text-[var(--gold)] flex-shrink-0" aria-hidden="true" />
              {coudelaria.localizacao}, {coudelaria.regiao}
            </span>
            {coudelaria.num_cavalos && (
              <span className="hidden sm:flex items-center gap-1.5">
                <Users size={13} className="text-[var(--gold)]" aria-hidden="true" />
                {coudelaria.num_cavalos} {t.directorio.horses}
              </span>
            )}
          </div>

          <p className="text-white/60 line-clamp-1 sm:line-clamp-2 mb-2 sm:mb-4 text-xs sm:text-sm leading-relaxed">
            {coudelaria.descricao}
          </p>

          {/* Especialidades — hidden on mobile */}
          {coudelaria.especialidades?.length > 0 && (
            <div className="hidden sm:flex flex-wrap gap-1.5 mb-4">
              {coudelaria.especialidades.slice(0, 3).map((esp) => (
                <span
                  key={esp}
                  className="text-xs bg-white/10 backdrop-blur-sm text-white/80 px-2.5 py-1 border border-white/10"
                >
                  {esp}
                </span>
              ))}
              {coudelaria.especialidades.length > 3 && (
                <span className="text-xs text-white/50 px-2.5 py-1">
                  +{coudelaria.especialidades.length - 3}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[var(--gold)] text-xs sm:text-sm font-medium">
            {t.directorio.view_stud || t.directorio.view_details}
            <ArrowRight
              size={13}
              className="group-hover:translate-x-1.5 transition-transform duration-300"
              aria-hidden="true"
            />
          </div>
        </div>
      </LocalizedLink>
    </AnimateOnScroll>
  );
}

// ─── Export (with Suspense for useSearchParams) ──────────────────────────────

export default function DirectorioContent({ coudelarias }: { coudelarias: Coudelaria[] }) {
  return (
    <Suspense fallback={<SkeletonGrid />}>
      <DirectorioContentInner coudelarias={coudelarias} />
    </Suspense>
  );
}
