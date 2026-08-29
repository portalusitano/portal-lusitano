"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import {
  Calendar,
  CalendarDays,
  MapPin,
  Clock,
  Euro,
  ChevronLeft,
  ChevronRight,
  Tag,
  ExternalLink,
  Star,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  List,
  Map,
  Search,
  X,
} from "lucide-react";
import LocalizedLink from "@/components/LocalizedLink";
import Pagination from "@/components/ui/Pagination";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import HorizontalScrollGallery from "@/components/ui/HorizontalScrollGallery";
import TextSplit from "@/components/TextSplit";
import ParallaxSection from "@/components/ui/ParallaxSection";
import MagneticButton from "@/components/ui/MagneticButton";
import EventosCalendar from "@/components/eventos/EventosCalendar";
import EventosMap from "@/components/eventos/EventosMap";
import type { Evento } from "./types";

// ─── Constants ───────────────────────────────────────────────────────────────

const tiposEvento = [
  { value: "todos", icon: "🎪" },
  { value: "feira", icon: "🎠" },
  { value: "competicao", icon: "🏆" },
  { value: "leilao", icon: "🔨" },
  { value: "exposicao", icon: "🎨" },
  { value: "workshop", icon: "📚" },
];

const meses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const ITENS_POR_PAGINA = 12;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTipoIcon(tipo: string) {
  return tiposEvento.find((t) => t.value === tipo)?.icon || "📅";
}

function getTipoColor(tipo: string) {
  const colors: Record<string, string> = {
    feira: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    competicao: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    leilao: "bg-green-500/20 text-green-400 border-green-500/30",
    exposicao: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    workshop: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  };
  return (
    colors[tipo] ||
    "bg-[var(--foreground-muted)]/20 text-[var(--foreground-muted)] border-[var(--foreground-muted)]/30"
  );
}

function formatDateRange(start: string, end?: string) {
  const startDate = new Date(start);
  if (!end || start === end) {
    return startDate.toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  const endDate = new Date(end);
  return `${startDate.toLocaleDateString("pt-PT", { day: "numeric" })} - ${endDate.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function EventosContent({ eventos }: { eventos: Evento[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;
  const { t } = useLanguage();

  const [activeView, setActiveView] = useState<"list" | "calendar" | "map">("list");
  const [selectedTipo, setSelectedTipo] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);

  // Countdown
  const nextEvento = useMemo(() => {
    const now = new Date();
    return eventos.find((e) => new Date(e.data_inicio) > now) || null;
  }, [eventos]);

  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!nextEvento) return;
    const target = new Date(nextEvento.data_inicio).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) return;
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextEvento]);

  // Translated type options
  const tiposEventoTranslated = useMemo(
    () => [
      { value: "todos", label: t.eventos.all_types, icon: "🎪" },
      { value: "feira", label: t.eventos.fairs, icon: "🎠" },
      { value: "competicao", label: t.eventos.competitions, icon: "🏆" },
      { value: "leilao", label: t.eventos.auctions, icon: "🔨" },
      { value: "exposicao", label: t.eventos.exhibitions, icon: "🎨" },
      { value: "workshop", label: t.eventos.workshops, icon: "📚" },
    ],
    [t]
  );

  // Filtered + sorted events
  const { filteredEventos, eventosDestaque, eventosOrdenados } = useMemo(() => {
    let filtered =
      selectedTipo === "todos" ? eventos : eventos.filter((e) => e.tipo === selectedTipo);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.titulo.toLowerCase().includes(q) ||
          e.localizacao.toLowerCase().includes(q) ||
          e.descricao.toLowerCase().includes(q) ||
          (e.organizador && e.organizador.toLowerCase().includes(q)) ||
          (e.tags && e.tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    }

    const destaque = filtered.filter((e) => e.destaque);
    const normais = filtered.filter((e) => !e.destaque);
    const ordenados = [...normais].sort(
      (a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime()
    );
    return { filteredEventos: filtered, eventosDestaque: destaque, eventosOrdenados: ordenados };
  }, [eventos, selectedTipo, searchQuery]);

  // Pagination
  const totalPaginas = Math.ceil(eventosOrdenados.length / ITENS_POR_PAGINA);
  const inicio = (currentPage - 1) * ITENS_POR_PAGINA;
  const eventosPaginados = eventosOrdenados.slice(inicio, inicio + ITENS_POR_PAGINA);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`?${params.toString()}`, { scroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateMonth = (direction: number) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  // Stats
  const uniqueRegioes = useMemo(
    () => new Set(eventos.map((e) => e.regiao).filter(Boolean)).size,
    [eventos]
  );
  const daysUntilNext = nextEvento
    ? Math.ceil((new Date(nextEvento.data_inicio).getTime() - new Date().getTime()) / 86400000)
    : 0;
  const competicoes = useMemo(
    () => eventos.filter((e) => e.tipo === "competicao").length,
    [eventos]
  );

  function getConfirmacaoBadge(confirmado?: string) {
    switch (confirmado) {
      case "confirmado":
        return {
          icon: CheckCircle,
          label: t.eventos.confirmed,
          color: "text-green-400",
          bg: "bg-green-500/10",
        };
      case "anual":
        return {
          icon: RefreshCw,
          label: t.eventos.annual,
          color: "text-blue-400",
          bg: "bg-blue-500/10",
        };
      case "provisorio":
        return {
          icon: AlertCircle,
          label: t.eventos.provisional,
          color: "text-amber-400",
          bg: "bg-amber-500/10",
        };
      default:
        return null;
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[55vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden noise-overlay">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--gold)]/[0.06] via-[var(--background)] to-[var(--background)]" />

        {/* Floating gold orbs with parallax + gentle float */}
        <ParallaxSection speed={0.15} className="absolute inset-0 pointer-events-none">
          <div
            className="gradient-orb float-gentle"
            style={{
              width: 500,
              height: 500,
              background: "var(--gold)",
              top: "15%",
              left: "-180px",
            }}
          />
          <div
            className="gradient-orb float-gentle"
            style={{
              width: 400,
              height: 400,
              background: "var(--gold)",
              bottom: "10%",
              right: "-140px",
              animationDelay: "-3s",
            }}
          />
          <div
            className="gradient-orb float-gentle"
            style={{
              width: 300,
              height: 300,
              background: "var(--gold)",
              top: "60%",
              left: "50%",
              animationDelay: "-5s",
              opacity: 0.03,
            }}
          />
        </ParallaxSection>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto space-y-6 pt-28 pb-12">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-[var(--gold)] opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
            {t.eventos.badge}
          </p>
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-[var(--gold)] leading-[0.9]">
            <TextSplit text={t.eventos.title} baseDelay={0.15} wordDelay={0.06} />
          </h1>
          <div
            className="w-24 h-[1px] bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent mx-auto opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]"
            style={{ animationDelay: "0.35s" }}
          />
          <p
            className="text-sm md:text-base text-[var(--foreground-secondary)] max-w-lg mx-auto opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]"
            style={{ animationDelay: "0.4s" }}
          >
            {t.eventos.subtitle}
          </p>
        </div>
      </section>

      {/* ═══ COUNTDOWN + STATS ═══ */}
      {nextEvento && (
        <section className="relative py-12 border-y border-[var(--border)] bg-[var(--background-secondary)]/30">
          <div className="max-w-5xl mx-auto px-6">
            {/* Countdown */}
            <RevealOnScroll variant="fade-up" className="text-center mb-8">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)] block mb-2">
                {t.eventos.next_event}
              </span>
              <h3
                className="text-lg sm:text-xl font-serif text-[var(--foreground)] cursor-pointer hover:text-[var(--gold)] transition-colors"
                onClick={() => setSelectedEvento(nextEvento)}
              >
                {nextEvento.titulo}
              </h3>
            </RevealOnScroll>

            <RevealOnScroll
              variant="fade-up"
              delay={100}
              className="flex justify-center gap-3 sm:gap-4 mb-10"
            >
              {[
                { value: countdown.days, label: t.eventos.days },
                { value: countdown.hours, label: t.eventos.hours },
                { value: countdown.minutes, label: t.eventos.minutes },
                { value: countdown.seconds, label: t.eventos.seconds },
              ].map((unit) => (
                <div
                  key={unit.label}
                  className="bg-[var(--background-card)] border border-[var(--gold)]/20 px-3 sm:px-5 py-3 min-w-[60px] sm:min-w-[75px] text-center glow-pulse"
                >
                  <span className="text-2xl sm:text-3xl font-serif text-[var(--gold)]">
                    {String(unit.value).padStart(2, "0")}
                  </span>
                  <span className="block text-[9px] uppercase tracking-[0.2em] text-[var(--foreground-muted)] mt-1">
                    {unit.label}
                  </span>
                </div>
              ))}
            </RevealOnScroll>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              {[
                { value: eventos.length, label: t.eventos.stat_events },
                { value: uniqueRegioes, label: t.eventos.stat_regions },
                { value: daysUntilNext, label: t.eventos.stat_next_in },
                { value: competicoes, label: t.eventos.stat_competitions },
              ].map((stat, i) => (
                <RevealOnScroll key={stat.label} delay={i * 100} variant="fade-up">
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl font-serif text-[var(--gold)] mb-1">
                      <AnimatedCounter end={stat.value} duration={2000 + i * 300} />
                    </div>
                    <p className="text-[var(--foreground-muted)] text-[10px] sm:text-xs uppercase tracking-[0.2em]">
                      {stat.label}
                    </p>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-6 pb-20 pt-12">
        {/* ═══ VIEW TOGGLE ═══ */}
        <RevealOnScroll variant="fade-up" className="flex justify-center mb-10">
          <div className="inline-flex bg-[var(--background-secondary)]/60 border border-[var(--border)] rounded-lg p-1 gap-1">
            {[
              { key: "list" as const, icon: List, label: t.eventos.view_list },
              { key: "calendar" as const, icon: CalendarDays, label: t.eventos.view_calendar },
              { key: "map" as const, icon: Map, label: t.eventos.view_map },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-md transition-all duration-300 ${
                  activeView === key
                    ? "bg-[var(--gold)] text-black font-medium shadow-[0_0_20px_rgba(197,160,89,0.2)]"
                    : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </RevealOnScroll>

        {/* ═══ FEATURED CAROUSEL ═══ */}
        {eventosDestaque.length > 0 && (
          <section className="mb-16">
            <RevealOnScroll variant="fade-up" className="text-center mb-10">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)] block mb-3 glow-pulse inline-block px-3 py-1">
                {t.eventos.featured_badge}
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif text-gradient-gold inline-block">
                {t.eventos.featured}
              </h2>
              <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent mx-auto mt-4" />
            </RevealOnScroll>

            <HorizontalScrollGallery>
              {eventosDestaque.map((evento, index) => (
                <EventoDestaqueCardPremium
                  key={evento.id}
                  evento={evento}
                  index={index}
                  onClick={() => setSelectedEvento(evento)}
                />
              ))}
            </HorizontalScrollGallery>
          </section>
        )}

        {/* AD — between featured and search */}
        <div className="mb-12"></div>

        {/* ═══ SEARCH ═══ */}
        <RevealOnScroll variant="fade-up" className="relative max-w-md mx-auto mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.eventos.search_placeholder}
            className="w-full pl-11 pr-10 py-3 bg-[var(--background-secondary)]/50 border border-[var(--border)] text-[var(--foreground)] text-sm placeholder-[var(--foreground-muted)] focus:outline-none focus:border-[var(--gold)]/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </RevealOnScroll>

        {/* ═══ TYPE FILTERS ═══ */}
        <RevealOnScroll variant="fade-up" delay={50}>
          <div className="flex flex-wrap gap-2 sm:gap-3 mb-8 justify-center">
            {tiposEventoTranslated.map((tipo) => (
              <button
                key={tipo.value}
                onClick={() => setSelectedTipo(tipo.value)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 border text-sm transition-all duration-300 ${
                  selectedTipo === tipo.value
                    ? "bg-[var(--gold)] text-black border-[var(--gold)] shadow-[0_0_15px_rgba(197,160,89,0.15)]"
                    : "bg-[var(--background-secondary)]/50 text-[var(--foreground-secondary)] border-[var(--border)] hover:border-[var(--gold)]/50 hover:text-[var(--foreground)]"
                }`}
                aria-pressed={selectedTipo === tipo.value}
              >
                <span>{tipo.icon}</span>
                <span>{tipo.label}</span>
              </button>
            ))}
          </div>

          {/* Month Navigator */}
          {activeView === "calendar" && (
            <div className="flex items-center justify-between bg-[var(--background-secondary)]/50 border border-[var(--border)] p-4 mb-8">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--gold)] transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <h3 className="text-xl font-serif text-[var(--foreground)]">
                <span className="text-[var(--gold)]">{meses[currentMonth]}</span> {currentYear}
              </h3>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--gold)] transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          )}
        </RevealOnScroll>

        {/* ═══ CALENDAR VIEW ═══ */}
        {activeView === "calendar" && (
          <RevealOnScroll variant="fade-up">
            <EventosCalendar
              eventos={filteredEventos}
              currentMonth={currentMonth}
              currentYear={currentYear}
              onPrevMonth={() => navigateMonth(-1)}
              onNextMonth={() => navigateMonth(1)}
              onEventClick={setSelectedEvento}
            />
          </RevealOnScroll>
        )}

        {/* ═══ MAP VIEW ═══ */}
        {activeView === "map" && (
          <RevealOnScroll variant="fade-up">
            <EventosMap eventos={filteredEventos} onEventClick={setSelectedEvento} />
          </RevealOnScroll>
        )}

        {/* ═══ LIST VIEW ═══ */}
        {activeView === "list" && (
          <>
            {filteredEventos.length === 0 ? (
              <RevealOnScroll variant="fade-up" className="text-center py-20">
                <Calendar className="mx-auto text-[var(--foreground-muted)] mb-4" size={48} />
                <h3 className="text-xl font-serif text-[var(--foreground)] mb-2">
                  {t.eventos.no_events}
                </h3>
                <p className="text-[var(--foreground-muted)]">{t.eventos.no_events_hint}</p>
              </RevealOnScroll>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-serif">
                    <span className="text-gradient-gold">{t.eventos.all_events}</span>
                    <span className="text-[var(--foreground-secondary)] text-lg ml-3">
                      ({eventosOrdenados.length}{" "}
                      {eventosOrdenados.length === 1
                        ? t.eventos.event_single
                        : t.eventos.event_plural}
                      )
                    </span>
                  </h2>
                </div>
                <div className="space-y-4">
                  {eventosPaginados.map((evento, index) => (
                    <EventoCard
                      key={evento.id}
                      evento={evento}
                      index={index}
                      onClick={() => setSelectedEvento(evento)}
                      getConfirmacaoBadge={getConfirmacaoBadge}
                    />
                  ))}
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPaginas}
                  onPageChange={handlePageChange}
                  className="mt-12"
                />
              </>
            )}
          </>
        )}
      </div>

      {/* ═══ MODAL ═══ */}
      {selectedEvento && (
        <EventoModal
          evento={selectedEvento}
          onClose={() => setSelectedEvento(null)}
          getConfirmacaoBadge={getConfirmacaoBadge}
        />
      )}
    </main>
  );
}

// ─── Featured Card (Premium) ─────────────────────────────────────────────────

function EventoDestaqueCardPremium({
  evento,
  index,
  onClick,
}: {
  evento: Evento;
  index: number;
  onClick: () => void;
}) {
  return (
    <div style={{ transition: "transform 0.1s ease" }}>
      <button
        onClick={onClick}
        className="text-left relative w-[320px] sm:w-[400px] h-80 overflow-hidden group card-premium shimmer-gold animated-border border border-[var(--gold)]/20 hover:border-[var(--gold)]/50 transition-all duration-500 flex-shrink-0"
        style={{ animationDelay: `${index * 0.08}s` }}
      >
        {/* Image */}
        {evento.imagem_capa ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={evento.imagem_capa}
            alt={evento.titulo}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--gold)]/20 via-[var(--background-card)] to-[var(--background-secondary)]">
            <span className="absolute inset-0 flex items-center justify-center text-7xl opacity-15">
              {getTipoIcon(evento.tipo)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        {/* Type badge */}
        <div className="absolute top-4 left-4">
          <span
            className={`px-3 py-1 text-[10px] uppercase tracking-wider border ${getTipoColor(evento.tipo)}`}
          >
            {getTipoIcon(evento.tipo)} {evento.tipo}
          </span>
        </div>

        {/* Destaque star */}
        <div className="absolute top-4 right-4">
          <Star size={18} className="text-[var(--gold)] fill-[var(--gold)]/30" />
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[var(--gold)] text-sm mb-2">
            <Calendar size={14} />
            {formatDateRange(evento.data_inicio, evento.data_fim)}
          </div>
          <h3 className="text-lg sm:text-xl font-serif text-white group-hover:text-[var(--gold)] transition-colors mb-2 line-clamp-2">
            {evento.titulo}
          </h3>
          <div className="flex items-center gap-2 text-[var(--foreground-secondary)] text-sm">
            <MapPin size={14} />
            {evento.localizacao}
          </div>
        </div>
      </button>
    </div>
  );
}

// ─── List Card (Enhanced) ────────────────────────────────────────────────────

function EventoCard({
  evento,
  index,
  onClick,
  getConfirmacaoBadge,
}: {
  evento: Evento;
  index: number;
  onClick: () => void;
  getConfirmacaoBadge: (
    c?: string
  ) => { icon: typeof CheckCircle; label: string; color: string; bg: string } | null;
}) {
  const date = new Date(evento.data_inicio);

  return (
    <RevealOnScroll delay={index * 60} variant="fade-up">
      <button
        onClick={onClick}
        className="w-full text-left flex items-stretch bg-[var(--background-card)] border border-[var(--gold)]/10 hover:border-[var(--gold)]/40 transition-all duration-300 group card-premium overflow-hidden"
      >
        {/* Image thumbnail */}
        {evento.imagem_capa && (
          <div className="w-32 flex-shrink-0 relative hidden sm:block overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={evento.imagem_capa}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[var(--background-card)]" />
          </div>
        )}

        {/* Date column */}
        <div className="w-20 sm:w-24 flex-shrink-0 flex flex-col items-center justify-center p-3 border-r border-[var(--border)]/50">
          <span className="text-3xl font-serif text-[var(--gold)]">{date.getDate()}</span>
          <span className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
            {date.toLocaleDateString("pt-PT", { month: "short" })}
          </span>
          <span className="text-[9px] text-[var(--foreground-muted)] mt-0.5">
            {date.getFullYear()}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className={`px-2 py-0.5 text-[10px] uppercase tracking-wider border ${getTipoColor(evento.tipo)}`}
            >
              {getTipoIcon(evento.tipo)} {evento.tipo}
            </span>
            {evento.destaque && <Star size={14} className="text-[var(--gold)]" />}
            {(() => {
              const badge = getConfirmacaoBadge(evento.confirmado);
              if (!badge) return null;
              const Icon = badge.icon;
              return (
                <span className={`${badge.color}`} title={badge.label}>
                  <Icon size={12} />
                </span>
              );
            })()}
          </div>
          <h3 className="text-base sm:text-lg font-serif text-[var(--foreground)] group-hover:text-[var(--gold)] transition-colors mb-1 line-clamp-1">
            {evento.titulo}
          </h3>
          <p className="text-sm text-[var(--foreground-muted)] line-clamp-1 mb-2 hidden sm:block">
            {evento.descricao}
          </p>
          <div className="flex items-center gap-4 text-[var(--foreground-muted)] text-sm">
            <span className="flex items-center gap-1">
              <MapPin size={14} />
              <span className="line-clamp-1">{evento.localizacao}</span>
            </span>
            {evento.preco_entrada && (
              <span className="flex items-center gap-1 flex-shrink-0">
                <Euro size={14} />
                {evento.preco_entrada}
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center px-3 sm:px-4 text-[var(--foreground-muted)] group-hover:text-[var(--gold)] transition-colors">
          <ChevronRight size={20} />
        </div>
      </button>
    </RevealOnScroll>
  );
}

// ─── Premium Modal ───────────────────────────────────────────────────────────

function EventoModal({
  evento,
  onClose,
  getConfirmacaoBadge,
}: {
  evento: Evento;
  onClose: () => void;
  getConfirmacaoBadge: (
    c?: string
  ) => { icon: typeof CheckCircle; label: string; color: string; bg: string } | null;
}) {
  const { t } = useLanguage();

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-[var(--background-secondary)] border border-[var(--border)] max-w-3xl w-full max-h-[95vh] overflow-y-auto my-4 opacity-0 animate-[fadeSlideIn_0.4s_ease-out_forwards] animated-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header image (21:9) */}
        <div className="aspect-[21/9] relative overflow-hidden bg-gradient-to-br from-[var(--gold)]/20 to-[var(--background-card)]">
          {evento.imagem_capa ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={evento.imagem_capa}
                alt={evento.titulo}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--background-secondary)] via-transparent to-black/20" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--gold)]/15 via-[var(--background-card)] to-[var(--background-secondary)]">
              <span className="text-[80px] opacity-15">{getTipoIcon(evento.tipo)}</span>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>

          {/* Badges at bottom of image */}
          <div className="absolute bottom-4 left-4 flex gap-2 flex-wrap">
            <span
              className={`px-3 py-1 text-[10px] uppercase tracking-wider border backdrop-blur-sm ${getTipoColor(evento.tipo)}`}
            >
              {getTipoIcon(evento.tipo)} {evento.tipo}
            </span>
            {evento.destaque && (
              <span className="px-3 py-1 bg-[var(--gold)] text-black text-[10px] font-bold uppercase tracking-wider">
                {t.eventos.highlight}
              </span>
            )}
            {(() => {
              const badge = getConfirmacaoBadge(evento.confirmado);
              if (!badge) return null;
              const Icon = badge.icon;
              return (
                <span
                  className={`flex items-center gap-1 ${badge.color} text-[10px] ${badge.bg} px-2 py-1 backdrop-blur-sm border border-current/20 uppercase tracking-wider`}
                >
                  <Icon size={12} /> {badge.label}
                </span>
              );
            })()}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          <h3 className="text-2xl sm:text-3xl font-serif text-gradient-gold mb-6 inline-block">
            {evento.titulo}
          </h3>

          {/* Info grid */}
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            <div className="flex items-center gap-3 p-3 bg-[var(--background-card)]/50 border border-[var(--border)]/50">
              <div className="w-10 h-10 bg-[var(--gold)]/10 flex items-center justify-center flex-shrink-0">
                <Calendar size={18} className="text-[var(--gold)]" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
                  {t.eventos.date_label}
                </p>
                <p className="text-sm text-[var(--foreground)]">
                  {formatDateRange(evento.data_inicio, evento.data_fim)}
                </p>
              </div>
            </div>
            {evento.hora_inicio && (
              <div className="flex items-center gap-3 p-3 bg-[var(--background-card)]/50 border border-[var(--border)]/50">
                <div className="w-10 h-10 bg-[var(--gold)]/10 flex items-center justify-center flex-shrink-0">
                  <Clock size={18} className="text-[var(--gold)]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
                    {t.eventos.time_label}
                  </p>
                  <p className="text-sm text-[var(--foreground)]">
                    {evento.hora_inicio}
                    {evento.hora_fim && ` - ${evento.hora_fim}`}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-[var(--background-card)]/50 border border-[var(--border)]/50">
              <div className="w-10 h-10 bg-[var(--gold)]/10 flex items-center justify-center flex-shrink-0">
                <MapPin size={18} className="text-[var(--gold)]" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
                  {t.eventos.location_label}
                </p>
                <p className="text-sm text-[var(--foreground)]">{evento.localizacao}</p>
              </div>
            </div>
            {evento.preco_entrada && (
              <div className="flex items-center gap-3 p-3 bg-[var(--background-card)]/50 border border-[var(--border)]/50">
                <div className="w-10 h-10 bg-[var(--gold)]/10 flex items-center justify-center flex-shrink-0">
                  <Euro size={18} className="text-[var(--gold)]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
                    {t.eventos.price_label}
                  </p>
                  <p className="text-sm text-[var(--foreground)]">{evento.preco_entrada}</p>
                </div>
              </div>
            )}
          </div>

          {/* Organizer */}
          {evento.organizador && (
            <p className="text-[var(--foreground-muted)] text-sm mb-4">
              {t.eventos.organized_by}:{" "}
              <span className="text-[var(--foreground-secondary)]">{evento.organizador}</span>
            </p>
          )}

          {/* Description */}
          <p className="text-[var(--foreground-secondary)] leading-relaxed mb-6">
            {evento.descricao_completa || evento.descricao}
          </p>

          {/* Tags */}
          {evento.tags && evento.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {evento.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 text-xs bg-[var(--background-elevated)] text-[var(--foreground-secondary)] px-2.5 py-1 border border-[var(--border)]/50"
                >
                  <Tag size={10} />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex flex-col gap-3">
            <MagneticButton strength={0.15}>
              <LocalizedLink
                href={`/eventos/${evento.slug}`}
                className="ripple-btn flex items-center justify-center gap-2 w-full bg-[var(--gold)] text-black py-3 font-bold uppercase tracking-wider hover:bg-[var(--gold-hover)] transition-colors glow-pulse"
              >
                {t.eventos.view_full_page}
              </LocalizedLink>
            </MagneticButton>
            {evento.website && (
              <MagneticButton strength={0.1}>
                <a
                  href={evento.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ripple-btn flex items-center justify-center gap-2 w-full bg-[var(--background-elevated)] text-[var(--foreground)] py-3 font-medium hover:bg-[var(--surface-hover)] transition-colors border border-[var(--border)]"
                >
                  <ExternalLink size={18} />
                  {t.eventos.official_site}
                </a>
              </MagneticButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
