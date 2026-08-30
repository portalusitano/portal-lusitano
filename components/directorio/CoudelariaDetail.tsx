"use client";

import { useState, useEffect } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import dynamic from "next/dynamic";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { analytics } from "@/lib/analytics-events";
import Image from "next/image";
import Breadcrumb from "@/components/Breadcrumb";
import { AnimateOnScroll } from "@/components/AnimateOnScroll";
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Instagram,
  Facebook,
  Youtube,
  Calendar,
  Award,
  Star,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Trophy,
  Sparkles,
  ExternalLink,
  Quote,
  ArrowLeft,
  CheckCircle,
  MessageSquare,
  ThumbsUp,
  Send,
  Loader2,
  Navigation,
} from "lucide-react";

// ─── Dynamic Map ───────────────────────────────────────────────────────────────

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--background-secondary)]/80">
      <Loader2 className="text-[var(--gold)] animate-spin" size={28} />
    </div>
  ),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  autor_nome: string;
  autor_localizacao?: string;
  avaliacao: number;
  titulo?: string;
  comentario: string;
  data_visita?: string;
  tipo_visita?: string;
  recomenda: boolean;
  created_at: string;
}

export interface Coudelaria {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  historia?: string;
  localizacao: string;
  regiao: string;
  telefone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  num_cavalos?: number;
  ano_fundacao?: number;
  especialidades: string[];
  linhagens?: string[];
  premios?: string[];
  servicos?: string[];
  horario?: string;
  coordenadas_lat?: number;
  coordenadas_lng?: number;
  foto_capa?: string;
  galeria?: string[];
  video_url?: string;
  cavalos_destaque?: {
    nome: string;
    ano: number;
    pelagem: string;
    aptidao: string;
    preco?: number;
    vendido: boolean;
  }[];
  testemunhos?: {
    autor: string;
    texto: string;
    data: string;
  }[];
  is_pro: boolean;
  destaque: boolean;
  views_count: number;
}

// ─── Placeholder images ───────────────────────────────────────────────────────

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=1200",
  "https://images.unsplash.com/photo-1534307671554-9a6d81f4d629?w=1200",
  "https://images.unsplash.com/photo-1598974357801-cbca100e65d3?w=1200",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200",
  "https://images.unsplash.com/photo-1450052590821-8bf91254a353?w=1200",
];

// ─── Star rating row ──────────────────────────────────────────────────────────

function StarRow({ value, max = 5, size = 16 }: { value: number; max?: number; size?: number }) {
  return (
    <div className="flex" role="img" aria-label={`${value} de ${max} estrelas`}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={
            i < Math.round(value)
              ? "text-[var(--gold)] fill-[var(--gold)]"
              : "text-[var(--foreground-muted)]"
          }
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

// ─── Section Title ────────────────────────────────────────────────────────────

function SectionTitle({ icon, title }: { icon?: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4 sm:mb-6 min-w-0">
      <span className="w-px h-5 sm:h-6 bg-[var(--gold)] flex-shrink-0" aria-hidden="true" />
      {icon && (
        <span className="text-[var(--gold)] flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      <h2 className="text-lg sm:text-2xl font-serif text-[var(--foreground)] leading-tight min-w-0">
        {title}
      </h2>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CoudelariaDetailProps {
  coudelaria: Coudelaria;
  initialReviews: Review[];
  initialReviewStats: { total: number; media: number };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CoudelariaDetail({
  coudelaria,
  initialReviews,
  initialReviewStats,
}: CoudelariaDetailProps) {
  const { showToast } = useToast();
  const { t, language } = useLanguage();
  const locale = language === "en" ? "en-GB" : language === "es" ? "es-ES" : "pt-PT";

  const [activeImage, setActiveImage] = useState(0);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [reviewStats, setReviewStats] = useState(initialReviewStats);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    autor_nome: "",
    autor_email: "",
    autor_localizacao: "",
    avaliacao: 5,
    titulo: "",
    comentario: "",
    tipo_visita: "visita",
    recomenda: true,
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Analytics: track coudelaria view on mount
  useEffect(() => {
    analytics.viewCoudelaria({
      id: coudelaria.id,
      nome: coudelaria.nome,
      localizacao: coudelaria.localizacao,
      regiao: coudelaria.regiao,
    });
  }, [coudelaria.id, coudelaria.nome, coudelaria.localizacao, coudelaria.regiao]);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coudelaria?.id) return;

    setSubmittingReview(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...reviewForm, coudelaria_id: coudelaria.id }),
      });

      if (res.ok) {
        analytics.submitReview({
          id: coudelaria.id,
          nome: coudelaria.nome,
          rating: reviewForm.avaliacao,
        });
        setShowReviewForm(false);
        setReviewForm({
          autor_nome: "",
          autor_email: "",
          autor_localizacao: "",
          avaliacao: 5,
          titulo: "",
          comentario: "",
          tipo_visita: "visita",
          recomenda: true,
        });
        showToast("success", "Avaliacao submetida com sucesso! Sera publicada apos revisao.");
        const reviewsRes = await fetch(`/api/reviews?coudelaria_id=${coudelaria.id}`);
        if (reviewsRes.ok) {
          const data = await reviewsRes.json();
          setReviews(data.reviews || []);
          setReviewStats(data.stats || { total: 0, media: 0 });
        }
      } else {
        const errorData = await res.json().catch(() => ({ message: "Erro desconhecido" }));
        showToast("error", errorData.message || "Erro ao submeter avaliacao. Tente novamente.");
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[DirectorioSlug]", error);
      showToast("error", "Erro de conexao. Verifique sua internet e tente novamente.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const images = coudelaria.galeria?.length ? coudelaria.galeria : PLACEHOLDER_IMAGES;
  const localCapa = `/images/coudelarias/${coudelaria.slug}/capa.webp`;
  const [heroImage, setHeroImage] = useState(coudelaria.foto_capa || localCapa);

  return (
    <main className="min-h-screen bg-[var(--background)] [overflow-x:clip]">
      {/* ── Hero ── */}
      <section
        className="relative h-[50vh] sm:h-[65vh] min-h-[340px] sm:min-h-[460px]"
        aria-label={coudelaria.nome}
      >
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src={heroImage}
            alt={coudelaria.nome}
            fill
            priority
            sizes="100vw"
            className="object-cover"
            onError={() => {
              if (heroImage.endsWith(".webp")) {
                setHeroImage(`/images/coudelarias/${coudelaria.slug}/capa.jpg`);
              } else {
                setHeroImage(images[0]);
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/60 to-transparent" />
          {/* Subtle vignette sides */}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--background)]/30 via-transparent to-[var(--background)]/30" />
        </div>

        {/* Back button */}
        <div className="absolute top-28 left-4 sm:left-6 z-10">
          <LocalizedLink
            href="/directorio"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-black/40 backdrop-blur-sm border border-white/10 px-4 py-2 hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span className="text-sm">{t.directorio.back_to_directory}</span>
          </LocalizedLink>
        </div>

        {/* Destaque + Verified badges */}
        <div className="absolute top-28 right-4 sm:right-6 z-10 flex flex-col gap-2 items-end">
          {coudelaria.destaque && (
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#C5A059] to-[#E8D5A3] text-black px-3 py-1.5 text-xs font-bold uppercase tracking-wide">
              <Star size={13} aria-hidden="true" />
              {t.directorio.highlight}
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm border border-white/10 text-white/80 px-3 py-1.5 text-xs font-medium">
            <CheckCircle size={13} className="text-green-400" aria-hidden="true" />
            {t.directorio.verified}
          </div>
        </div>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="max-w-6xl mx-auto">
            <AnimateOnScroll>
              {coudelaria.ano_fundacao && (
                <span className="text-[var(--gold)] text-xs uppercase tracking-wider mb-3 block">
                  {t.directorio.founded} {coudelaria.ano_fundacao}
                </span>
              )}
              <h1 className="text-2xl sm:text-4xl md:text-6xl font-serif text-white mb-4 leading-tight">
                {coudelaria.nome}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm">
                <span className="flex items-center gap-2">
                  <MapPin size={15} className="text-[var(--gold)]" aria-hidden="true" />
                  {coudelaria.localizacao}, {coudelaria.regiao}
                </span>
                {coudelaria.num_cavalos && (
                  <span className="flex items-center gap-2">
                    <Users size={15} className="text-[var(--gold)]" aria-hidden="true" />
                    {coudelaria.num_cavalos} {t.directorio.horses}
                  </span>
                )}
                {reviewStats.total > 0 && (
                  <span className="flex items-center gap-2">
                    <StarRow value={reviewStats.media} size={14} />
                    <span>({reviewStats.total})</span>
                  </span>
                )}
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* ── Body ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Directorio", href: "/directorio" },
            { label: coudelaria.nome },
          ]}
        />

        <div className="grid lg:grid-cols-3 gap-12 mt-8">
          {/* ── Main ── */}
          <div className="lg:col-span-2 space-y-10 sm:space-y-14 min-w-0">
            {/* Description */}
            <AnimateOnScroll delay={50}>
              <p className="text-base sm:text-xl text-[var(--foreground-secondary)] leading-relaxed break-words">
                {coudelaria.descricao}
              </p>
            </AnimateOnScroll>

            {/* Especialidades */}
            {Array.isArray(coudelaria.especialidades) && coudelaria.especialidades.length > 0 && (
              <AnimateOnScroll delay={100}>
                <section aria-label={t.directorio.specialties}>
                  <SectionTitle icon={<Sparkles size={22} />} title={t.directorio.specialties} />
                  <div className="flex flex-wrap gap-3">
                    {coudelaria.especialidades.map((esp) => (
                      <span
                        key={esp}
                        className="px-4 py-2 bg-[var(--gold)]/10 border border-[var(--gold)]/30 text-[var(--gold)] text-sm hover:bg-[var(--gold)]/15 transition-colors"
                      >
                        {esp}
                      </span>
                    ))}
                  </div>
                </section>
              </AnimateOnScroll>
            )}

            {/* Historia */}
            {coudelaria.historia && (
              <AnimateOnScroll delay={150}>
                <section aria-label={t.directorio.history}>
                  <SectionTitle icon={<Calendar size={22} />} title={t.directorio.history} />
                  <div className="space-y-4">
                    {coudelaria.historia.split("\n\n").map((paragraph, i) => (
                      <p
                        key={i}
                        className="text-[var(--foreground-secondary)] leading-relaxed break-words"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              </AnimateOnScroll>
            )}

            {/* Galeria */}
            {images.length > 1 && (
              <AnimateOnScroll delay={200}>
                <section aria-label={t.directorio.gallery}>
                  <SectionTitle title={t.directorio.gallery} />
                  <div className="relative">
                    <div className="aspect-video relative overflow-hidden bg-[var(--background-secondary)] border border-[var(--border)]">
                      <Image
                        src={images[activeImage]}
                        alt={`${coudelaria.nome} - ${t.directorio.gallery} ${activeImage + 1}`}
                        fill
                        sizes="100vw"
                        className="object-cover"
                      />
                      {/* Navigation arrows */}
                      {images.length > 1 && (
                        <>
                          <button
                            onClick={() =>
                              setActiveImage((activeImage - 1 + images.length) % images.length)
                            }
                            aria-label="Imagem anterior"
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 border border-white/10 text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
                          >
                            <ChevronLeft size={22} aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => setActiveImage((activeImage + 1) % images.length)}
                            aria-label="Proxima imagem"
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 border border-white/10 text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
                          >
                            <ChevronRight size={22} aria-hidden="true" />
                          </button>
                          {/* Counter */}
                          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white/80 px-2.5 py-1 text-xs">
                            {activeImage + 1} / {images.length}
                          </div>
                        </>
                      )}
                    </div>
                    {/* Thumbnails */}
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1" role="tablist">
                      {images.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveImage(i)}
                          role="tab"
                          aria-label={`Ver imagem ${i + 1}`}
                          aria-selected={activeImage === i}
                          className={`flex-shrink-0 w-20 h-14 overflow-hidden border-2 transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] ${
                            activeImage === i
                              ? "border-[var(--gold)] opacity-100"
                              : "border-transparent opacity-50 hover:opacity-80"
                          }`}
                        >
                          <Image
                            src={img}
                            alt={`Miniatura ${i + 1}`}
                            fill
                            sizes="(max-width: 640px) 80px, 120px"
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              </AnimateOnScroll>
            )}

            {/* Premios */}
            {Array.isArray(coudelaria.premios) && coudelaria.premios.length > 0 && (
              <AnimateOnScroll delay={250}>
                <section aria-label={t.directorio.awards}>
                  <SectionTitle icon={<Trophy size={22} />} title={t.directorio.awards} />
                  <div className="space-y-3">
                    {coudelaria.premios.map((premio) => (
                      <div
                        key={premio}
                        className="flex items-start gap-3 p-4 bg-[var(--background-secondary)]/50 border border-[var(--border)] hover:border-[var(--gold)]/30 transition-colors"
                      >
                        <Award
                          className="text-[var(--gold)] flex-shrink-0 mt-0.5"
                          size={18}
                          aria-hidden="true"
                        />
                        <span className="text-[var(--foreground-secondary)] text-sm leading-relaxed">
                          {premio}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </AnimateOnScroll>
            )}

            {/* Cavalos em Destaque */}
            {Array.isArray(coudelaria.cavalos_destaque) &&
              coudelaria.cavalos_destaque.length > 0 && (
                <AnimateOnScroll delay={300}>
                  <section aria-label={t.directorio.featured_horses}>
                    <SectionTitle icon={<Star size={22} />} title={t.directorio.featured_horses} />
                    <div className="grid sm:grid-cols-2 gap-4">
                      {coudelaria.cavalos_destaque.map((cavalo) => (
                        <div
                          key={cavalo.nome}
                          className={`p-5 border transition-colors ${
                            cavalo.vendido
                              ? "bg-[var(--background-secondary)]/20 border-[var(--border)] opacity-55"
                              : "bg-[var(--background-secondary)]/50 border-[var(--border)] hover:border-[var(--gold)]/30"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="text-base font-medium text-[var(--foreground)]">
                              {cavalo.nome}
                            </h3>
                            {cavalo.vendido && (
                              <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/20 px-2 py-0.5 font-medium">
                                {t.directorio.sold}
                              </span>
                            )}
                          </div>
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-[var(--foreground-secondary)] mb-4">
                            <div>
                              <dt className="text-[var(--foreground-muted)] text-xs uppercase tracking-wide">
                                Ano
                              </dt>
                              <dd>{cavalo.ano}</dd>
                            </div>
                            <div>
                              <dt className="text-[var(--foreground-muted)] text-xs uppercase tracking-wide">
                                Pelagem
                              </dt>
                              <dd>{cavalo.pelagem}</dd>
                            </div>
                            <div className="col-span-2">
                              <dt className="text-[var(--foreground-muted)] text-xs uppercase tracking-wide">
                                Aptidao
                              </dt>
                              <dd>{cavalo.aptidao}</dd>
                            </div>
                          </dl>
                          {cavalo.preco && !cavalo.vendido && (
                            <div className="text-[var(--gold)] font-bold text-lg">
                              {cavalo.preco.toLocaleString(locale)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                </AnimateOnScroll>
              )}

            {/* Testemunhos */}
            {Array.isArray(coudelaria.testemunhos) && coudelaria.testemunhos.length > 0 && (
              <AnimateOnScroll delay={350}>
                <section aria-label={t.directorio.testimonials}>
                  <SectionTitle icon={<Quote size={22} />} title={t.directorio.testimonials} />
                  <div className="space-y-4">
                    {coudelaria.testemunhos.map((test) => (
                      <blockquote
                        key={`${test.autor}-${test.data}`}
                        className="p-4 sm:p-6 bg-[var(--background-secondary)]/50 border border-[var(--border)] hover:border-[var(--gold)]/20 transition-colors"
                      >
                        <p className="text-[var(--foreground-secondary)] italic mb-4 leading-relaxed">
                          {`\u201C${test.texto}\u201D`}
                        </p>
                        <footer className="flex items-center justify-between">
                          <cite className="text-[var(--gold)] font-medium not-italic">
                            — {test.autor}
                          </cite>
                          <time className="text-[var(--foreground-muted)] text-sm">
                            {test.data}
                          </time>
                        </footer>
                      </blockquote>
                    ))}
                  </div>
                </section>
              </AnimateOnScroll>
            )}

            {/* Reviews */}
            <AnimateOnScroll delay={400}>
              <section aria-label={t.directorio.reviews}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="w-px h-6 bg-[var(--gold)]" aria-hidden="true" />
                    <MessageSquare className="text-[var(--gold)]" size={22} aria-hidden="true" />
                    <h2 className="text-xl sm:text-2xl font-serif text-[var(--foreground)]">
                      {t.directorio.reviews}
                    </h2>
                    {reviewStats.total > 0 && (
                      <span className="text-sm bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/20 px-2.5 py-0.5">
                        {reviewStats.total}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    aria-expanded={showReviewForm}
                    className="inline-flex items-center gap-2 bg-[var(--gold)] text-black px-4 py-2 text-sm font-bold hover:bg-[var(--gold-hover)] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                  >
                    <Star size={15} aria-hidden="true" />
                    {t.directorio.rate_stud}
                  </button>
                </div>

                {/* Review stats */}
                {reviewStats.total > 0 && (
                  <div className="flex items-center gap-6 mb-6 p-5 bg-[var(--background-secondary)]/50 border border-[var(--border)]">
                    <div className="text-center">
                      <div
                        className="text-4xl font-serif text-[var(--gold)]"
                        aria-label={`${reviewStats.media} estrelas`}
                      >
                        {reviewStats.media}
                      </div>
                      <StarRow value={reviewStats.media} />
                      <div className="text-[var(--foreground-muted)] text-sm mt-1">
                        {reviewStats.total} {reviewStats.total === 1 ? "avaliacao" : "avaliacoes"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Review form */}
                {showReviewForm && (
                  <AnimateOnScroll>
                    <form
                      onSubmit={submitReview}
                      className="mb-6 sm:mb-8 p-4 sm:p-6 bg-[var(--background-secondary)]/50 border border-[var(--gold)]/25"
                      aria-label={t.directorio.share_experience}
                    >
                      <h3 className="text-lg font-serif text-[var(--foreground)] mb-5">
                        {t.directorio.share_experience}
                      </h3>

                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        <input
                          type="text"
                          placeholder={t.directorio.your_name}
                          value={reviewForm.autor_nome}
                          onChange={(e) =>
                            setReviewForm({ ...reviewForm, autor_nome: e.target.value })
                          }
                          required
                          className="bg-[var(--background-card)] border border-[var(--border)] px-4 py-3 text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:border-[var(--gold)] focus:outline-none transition-colors"
                        />
                        <input
                          type="email"
                          placeholder={t.directorio.email_optional}
                          value={reviewForm.autor_email}
                          onChange={(e) =>
                            setReviewForm({ ...reviewForm, autor_email: e.target.value })
                          }
                          className="bg-[var(--background-card)] border border-[var(--border)] px-4 py-3 text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:border-[var(--gold)] focus:outline-none transition-colors"
                        />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        <input
                          type="text"
                          placeholder={t.directorio.location_optional}
                          value={reviewForm.autor_localizacao}
                          onChange={(e) =>
                            setReviewForm({ ...reviewForm, autor_localizacao: e.target.value })
                          }
                          className="bg-[var(--background-card)] border border-[var(--border)] px-4 py-3 text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:border-[var(--gold)] focus:outline-none transition-colors"
                        />
                        <select
                          value={reviewForm.tipo_visita}
                          onChange={(e) =>
                            setReviewForm({ ...reviewForm, tipo_visita: e.target.value })
                          }
                          aria-label={t.directorio.visit_type}
                          className="bg-[var(--background-card)] border border-[var(--border)] px-4 py-3 text-[var(--foreground)] focus:border-[var(--gold)] focus:outline-none transition-colors appearance-none"
                        >
                          <option value="visita">{t.directorio.visit}</option>
                          <option value="compra">{t.directorio.purchase}</option>
                          <option value="aulas">{t.directorio.lessons}</option>
                          <option value="eventos">{t.directorio.event}</option>
                        </select>
                      </div>

                      {/* Star rating input */}
                      <fieldset className="mb-4">
                        <legend className="text-[var(--foreground-secondary)] text-sm mb-2">
                          {t.directorio.rating_label}
                        </legend>
                        <div className="flex gap-1" role="radiogroup">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewForm({ ...reviewForm, avaliacao: star })}
                              aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
                              aria-pressed={star <= reviewForm.avaliacao}
                              className="p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] rounded"
                            >
                              <Star
                                size={30}
                                className={
                                  star <= reviewForm.avaliacao
                                    ? "text-[var(--gold)] fill-[var(--gold)]"
                                    : "text-[var(--foreground-muted)] hover:text-[var(--gold)] transition-colors"
                                }
                                aria-hidden="true"
                              />
                            </button>
                          ))}
                        </div>
                      </fieldset>

                      <input
                        type="text"
                        placeholder={t.directorio.review_title_optional}
                        value={reviewForm.titulo}
                        onChange={(e) => setReviewForm({ ...reviewForm, titulo: e.target.value })}
                        className="w-full bg-[var(--background-card)] border border-[var(--border)] px-4 py-3 text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:border-[var(--gold)] focus:outline-none transition-colors mb-4"
                      />

                      <textarea
                        placeholder={t.directorio.review_comment}
                        value={reviewForm.comentario}
                        onChange={(e) =>
                          setReviewForm({ ...reviewForm, comentario: e.target.value })
                        }
                        required
                        rows={4}
                        className="w-full bg-[var(--background-card)] border border-[var(--border)] px-4 py-3 text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:border-[var(--gold)] focus:outline-none transition-colors mb-4 resize-none"
                      />

                      <label className="flex items-center gap-3 mb-6 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reviewForm.recomenda}
                          onChange={(e) =>
                            setReviewForm({ ...reviewForm, recomenda: e.target.checked })
                          }
                          className="w-4 h-4 accent-[#C5A059]"
                        />
                        <span className="text-[var(--foreground-secondary)] text-sm">
                          {t.directorio.recommend}
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="inline-flex items-center gap-2 bg-[var(--gold)] text-black px-6 py-3 font-bold hover:bg-[var(--gold-hover)] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
                      >
                        {submittingReview ? (
                          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                        ) : (
                          <Send size={16} aria-hidden="true" />
                        )}
                        {submittingReview ? t.directorio.submitting : t.directorio.submit_review}
                      </button>
                    </form>
                  </AnimateOnScroll>
                )}

                {/* Reviews list */}
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <article
                        key={review.id}
                        className="p-4 sm:p-6 bg-[var(--background-secondary)]/50 border border-[var(--border)] hover:border-[var(--gold)]/20 transition-colors"
                      >
                        <header className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[var(--foreground)] font-medium text-sm">
                                {review.autor_nome}
                              </span>
                              {review.recomenda && (
                                <ThumbsUp
                                  size={13}
                                  className="text-green-500"
                                  aria-label="Recomenda"
                                />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
                              {review.autor_localizacao && <span>{review.autor_localizacao}</span>}
                              {review.tipo_visita && (
                                <span className="before:content-['\u2022'] before:mr-2">
                                  {review.tipo_visita}
                                </span>
                              )}
                            </div>
                          </div>
                          <StarRow value={review.avaliacao} size={13} />
                        </header>
                        {review.titulo && (
                          <h4 className="text-[var(--foreground)] font-medium text-sm mb-2">
                            {review.titulo}
                          </h4>
                        )}
                        <p className="text-[var(--foreground-secondary)] text-sm leading-relaxed">
                          {review.comentario}
                        </p>
                        <footer className="mt-3 text-[var(--foreground-muted)] text-xs">
                          <time dateTime={review.created_at}>
                            {new Date(review.created_at).toLocaleDateString(locale)}
                          </time>
                        </footer>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-[var(--background-secondary)]/30 border border-[var(--border)]">
                    <MessageSquare
                      className="mx-auto text-[var(--foreground-muted)] mb-3"
                      size={28}
                      aria-hidden="true"
                    />
                    <p className="text-[var(--foreground-muted)] text-sm">
                      {t.directorio.no_reviews}
                    </p>
                  </div>
                )}
              </section>
            </AnimateOnScroll>
          </div>

          {/* ── Sidebar ── */}
          <aside className="lg:col-span-1 min-w-0" aria-label="Informacoes da coudelaria">
            <div className="sticky top-32 space-y-5">
              {/* Contact card */}
              <AnimateOnScroll delay={100}>
                <div className="bg-[var(--background-secondary)]/60 border border-[var(--border)] hover:border-[var(--gold)]/30 transition-colors p-4 sm:p-6">
                  <h3 className="text-base font-semibold text-[var(--foreground)] mb-5 pb-4 border-b border-[var(--border)]">
                    {t.directorio.contact_info}
                  </h3>
                  <div className="space-y-4">
                    {coudelaria.telefone && (
                      <a
                        href={`tel:${coudelaria.telefone}`}
                        className="flex items-center gap-3 min-w-0 text-[var(--foreground-secondary)] hover:text-[var(--gold)] transition-colors group"
                      >
                        <span className="w-9 h-9 bg-[var(--gold)]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--gold)]/20 transition-colors">
                          <Phone size={16} className="text-[var(--gold)]" aria-hidden="true" />
                        </span>
                        <span className="text-sm">{coudelaria.telefone}</span>
                      </a>
                    )}
                    {coudelaria.email && (
                      <a
                        href={`mailto:${coudelaria.email}`}
                        className="flex items-center gap-3 min-w-0 text-[var(--foreground-secondary)] hover:text-[var(--gold)] transition-colors group"
                      >
                        <span className="w-9 h-9 bg-[var(--gold)]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--gold)]/20 transition-colors">
                          <Mail size={16} className="text-[var(--gold)]" aria-hidden="true" />
                        </span>
                        <span className="text-sm truncate min-w-0">{coudelaria.email}</span>
                      </a>
                    )}
                    {coudelaria.website && (
                      <a
                        href={coudelaria.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 min-w-0 text-[var(--foreground-secondary)] hover:text-[var(--gold)] transition-colors group"
                      >
                        <span className="w-9 h-9 bg-[var(--gold)]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--gold)]/20 transition-colors">
                          <Globe size={16} className="text-[var(--gold)]" aria-hidden="true" />
                        </span>
                        <span className="text-sm flex items-center gap-1">
                          Website
                          <ExternalLink size={12} aria-hidden="true" />
                        </span>
                      </a>
                    )}
                    {coudelaria.coordenadas_lat && coudelaria.coordenadas_lng && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${coudelaria.coordenadas_lat},${coudelaria.coordenadas_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 min-w-0 text-[var(--foreground-secondary)] hover:text-[var(--gold)] transition-colors group"
                      >
                        <span className="w-9 h-9 bg-[var(--gold)]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--gold)]/20 transition-colors">
                          <Navigation size={16} className="text-[var(--gold)]" aria-hidden="true" />
                        </span>
                        <span className="text-sm flex items-center gap-1">
                          Como chegar
                          <ExternalLink size={12} aria-hidden="true" />
                        </span>
                      </a>
                    )}
                    {!coudelaria.telefone && !coudelaria.email && !coudelaria.website && (
                      <p className="text-[var(--foreground-muted)] text-sm italic">
                        {t.directorio.no_contacts}
                      </p>
                    )}

                    {/* Social icons */}
                    {(coudelaria.instagram || coudelaria.facebook || coudelaria.youtube) && (
                      <div className="flex gap-2 pt-4 border-t border-[var(--border)]">
                        {coudelaria.instagram && (
                          <a
                            href={`https://instagram.com/${(coudelaria.instagram || "").replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Instagram"
                            className="w-9 h-9 bg-[var(--background-card)] hover:bg-[var(--gold)] text-[var(--foreground-secondary)] hover:text-black flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
                          >
                            <Instagram size={16} aria-hidden="true" />
                          </a>
                        )}
                        {coudelaria.facebook && (
                          <a
                            href={coudelaria.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Facebook"
                            className="w-9 h-9 bg-[var(--background-card)] hover:bg-[var(--gold)] text-[var(--foreground-secondary)] hover:text-black flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
                          >
                            <Facebook size={16} aria-hidden="true" />
                          </a>
                        )}
                        {coudelaria.youtube && (
                          <a
                            href={coudelaria.youtube}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="YouTube"
                            className="w-9 h-9 bg-[var(--background-card)] hover:bg-[var(--gold)] text-[var(--foreground-secondary)] hover:text-black flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
                          >
                            <Youtube size={16} aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Schedule */}
                    {coudelaria.horario && (
                      <div className="pt-4 border-t border-[var(--border)]">
                        <div className="flex items-center gap-2 text-[var(--foreground-secondary)] mb-2">
                          <Clock size={15} className="text-[var(--gold)]" aria-hidden="true" />
                          <span className="text-sm font-medium">{t.directorio.schedule}</span>
                        </div>
                        <p className="text-[var(--foreground-muted)] text-sm leading-relaxed">
                          {coudelaria.horario}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </AnimateOnScroll>

              {/* Servicos */}
              {Array.isArray(coudelaria.servicos) && coudelaria.servicos.length > 0 && (
                <AnimateOnScroll delay={150}>
                  <div className="bg-[var(--background-secondary)]/60 border border-[var(--border)] hover:border-[var(--gold)]/30 transition-colors p-4 sm:p-6">
                    <h3 className="text-base font-semibold text-[var(--foreground)] mb-4 pb-4 border-b border-[var(--border)]">
                      {t.directorio.services}
                    </h3>
                    <ul className="space-y-2.5">
                      {coudelaria.servicos.map((servico) => (
                        <li
                          key={servico}
                          className="flex items-center gap-2.5 text-[var(--foreground-secondary)] text-sm"
                        >
                          <CheckCircle
                            size={14}
                            className="text-green-500 flex-shrink-0"
                            aria-hidden="true"
                          />
                          {servico}
                        </li>
                      ))}
                    </ul>
                  </div>
                </AnimateOnScroll>
              )}

              {/* Linhagens */}
              {Array.isArray(coudelaria.linhagens) && coudelaria.linhagens.length > 0 && (
                <AnimateOnScroll delay={200}>
                  <div className="bg-[var(--background-secondary)]/60 border border-[var(--border)] hover:border-[var(--gold)]/30 transition-colors p-4 sm:p-6">
                    <h3 className="text-base font-semibold text-[var(--foreground)] mb-4 pb-4 border-b border-[var(--border)]">
                      {t.directorio.lineages}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {coudelaria.linhagens.map((linhagem) => (
                        <span
                          key={linhagem}
                          className="px-3 py-1 bg-[var(--background-card)] border border-[var(--border)] text-[var(--foreground-secondary)] text-xs hover:border-[var(--gold)]/30 transition-colors"
                        >
                          {linhagem}
                        </span>
                      ))}
                    </div>
                  </div>
                </AnimateOnScroll>
              )}

              {/* Map */}
              <AnimateOnScroll delay={250}>
                <div className="relative z-0 bg-[var(--background-secondary)]/60 border border-[var(--border)] overflow-hidden">
                  <div style={{ height: 280 }}>
                    <LeafletMap
                      coudelarias={[
                        {
                          id: coudelaria.id,
                          nome: coudelaria.nome,
                          slug: coudelaria.slug,
                          descricao: coudelaria.descricao,
                          localizacao: coudelaria.localizacao,
                          regiao: coudelaria.regiao,
                          foto_capa: coudelaria.foto_capa,
                          is_pro: coudelaria.is_pro,
                          destaque: coudelaria.destaque,
                          coordenadas_lat: coudelaria.coordenadas_lat,
                          coordenadas_lng: coudelaria.coordenadas_lng,
                        },
                      ]}
                    />
                  </div>
                </div>
              </AnimateOnScroll>

              {/* CTA */}
              <AnimateOnScroll delay={300}>
                <div className="bg-gradient-to-br from-[#C5A059]/15 to-[#C5A059]/5 border border-[var(--gold)]/25 p-4 sm:p-6">
                  <h3 className="text-base font-semibold text-[var(--foreground)] mb-2">
                    {t.directorio.has_stud_sidebar}
                  </h3>
                  <p className="text-[var(--foreground-secondary)] text-sm mb-5 leading-relaxed">
                    {t.directorio.has_stud_sidebar_desc}
                  </p>
                  <LocalizedLink
                    href="/directorio/registar"
                    className="block w-full bg-[var(--gold)] text-black py-3 text-sm font-bold uppercase tracking-wider hover:bg-[var(--gold-hover)] active:scale-95 transition-all text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                  >
                    {t.directorio.register_stud}
                  </LocalizedLink>
                </div>
              </AnimateOnScroll>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Mobile sticky contact bar ── */}
      {(coudelaria.telefone || coudelaria.email || coudelaria.website) && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 bg-[var(--background)]/95 backdrop-blur-md border-t border-[var(--border)] px-4 py-3 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)] leading-none mb-0.5 truncate">
              {coudelaria.nome}
            </p>
            <p className="text-xs text-[var(--foreground-secondary)] truncate">
              {coudelaria.localizacao}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {coudelaria.telefone && (
              <a
                href={`tel:${coudelaria.telefone}`}
                aria-label="Ligar"
                className="flex items-center justify-center w-10 h-10 bg-[var(--background-card)] border border-[var(--border)] rounded-lg text-[var(--gold)] touch-manipulation active:scale-95 transition-transform"
              >
                <Phone size={16} />
              </a>
            )}
            {coudelaria.email && (
              <a
                href={`mailto:${coudelaria.email}`}
                aria-label="Enviar email"
                className="flex items-center justify-center w-10 h-10 bg-[var(--background-card)] border border-[var(--border)] rounded-lg text-[var(--gold)] touch-manipulation active:scale-95 transition-transform"
              >
                <Mail size={16} />
              </a>
            )}
            {coudelaria.website && (
              <a
                href={coudelaria.website}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Website"
                className="flex items-center gap-2 bg-[var(--gold)] text-black px-4 h-10 rounded-lg text-sm font-semibold touch-manipulation active:scale-95 transition-transform"
              >
                <Globe size={14} />
                Website
              </a>
            )}
            {!coudelaria.website && coudelaria.email && (
              <a
                href={`mailto:${coudelaria.email}`}
                className="flex items-center gap-2 bg-[var(--gold)] text-black px-4 h-10 rounded-lg text-sm font-semibold touch-manipulation active:scale-95 transition-transform"
              >
                <Mail size={14} />
                Contactar
              </a>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
