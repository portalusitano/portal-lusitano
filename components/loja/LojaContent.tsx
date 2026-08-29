"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Image from "next/image";
import LocalizedLink from "@/components/LocalizedLink";
import { ShoppingBag, ArrowRight, ListFilter, X, Search, ChevronDown } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { ProductListing } from "@/types/product";
import { createTranslator } from "@/lib/tr";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import dynamic from "next/dynamic";

const MagneticButton = dynamic(() => import("@/components/ui/MagneticButton"));

// ─── Types & helpers ──────────────────────────────────────────────────────────

type SortKey = "default" | "price_asc" | "price_desc" | "alpha";

function formatPrice(p: ProductListing) {
  return Number(p.priceRange?.minVariantPrice.amount || 0).toFixed(2);
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "default", label: "Relevância" },
  { key: "price_asc", label: "Preço ↑" },
  { key: "price_desc", label: "Preço ↓" },
  { key: "alpha", label: "A–Z" },
];

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  index,
  refNum,
}: {
  product: ProductListing;
  index: number;
  refNum: string;
}) {
  const price = formatPrice(product);
  const secondaryImageUrl = product.images[1]?.url;
  const { language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  return (
    <LocalizedLink
      href={`/loja/${product.handle}`}
      className="group block"
      style={{
        opacity: 0,
        animation: `fadeSlideIn 0.55s ease-out ${Math.min(index * 0.07, 0.45) + 0.05}s forwards`,
      }}
      aria-label={`${product.title} — ${price} EUR`}
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-[#0c0c0c]" style={{ aspectRatio: "3/4" }}>
        {product.images[0]?.url ? (
          <>
            <Image
              src={product.images[0].url}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 33vw"
              className={`object-cover transition-[opacity,transform] duration-700 ease-out ${
                secondaryImageUrl ? "group-hover:opacity-0" : "group-hover:scale-[1.06]"
              }`}
              priority={index < 6}
            />
            {secondaryImageUrl && (
              <Image
                src={secondaryImageUrl}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 33vw"
                className="object-cover transition-[opacity,transform] duration-500 opacity-0 group-hover:opacity-100 group-hover:scale-[1.04]"
                aria-hidden
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ShoppingBag className="text-white/10" size={28} aria-hidden />
          </div>
        )}

        {/* Full overlay on hover */}
        <div
          className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500 pointer-events-none"
          aria-hidden
        />

        {/* Gold top sweep */}
        <div
          className="absolute top-0 inset-x-0 h-px origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-600 z-10"
          style={{ background: "rgba(197,160,89,0.7)" }}
          aria-hidden
        />
        {/* Gold bottom sweep */}
        <div
          className="absolute bottom-0 inset-x-0 h-px origin-right scale-x-0 group-hover:scale-x-100 transition-transform duration-600 delay-100 z-10"
          style={{ background: "rgba(197,160,89,0.4)" }}
          aria-hidden
        />

        {/* Ref number */}
        <span
          className="absolute top-3 left-3.5 font-mono text-[6px] tracking-[0.4em] text-white/15 select-none z-10 group-hover:text-[var(--gold)]/50 transition-colors duration-500"
          aria-hidden
        >
          {refNum}
        </span>

        {/* Corner ornaments — appear on hover */}
        <div
          className="absolute top-2.5 left-2.5 w-4 h-4 border-t border-l border-[var(--gold)]/0 group-hover:border-[var(--gold)]/35 transition-[border-color] duration-500 z-10 pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute top-2.5 right-2.5 w-4 h-4 border-t border-r border-[var(--gold)]/0 group-hover:border-[var(--gold)]/35 transition-[border-color] duration-500 z-10 pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b border-l border-[var(--gold)]/0 group-hover:border-[var(--gold)]/35 transition-[border-color] duration-500 z-10 pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b border-r border-[var(--gold)]/0 group-hover:border-[var(--gold)]/35 transition-[border-color] duration-500 z-10 pointer-events-none"
          aria-hidden
        />

        {/* Price badge — always visible, bottom right */}
        <div
          className="absolute bottom-3 right-3 z-20 px-3 py-1.5 flex items-baseline gap-1"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        >
          <span className="font-serif text-[var(--gold)] tabular-nums text-sm">{price}</span>
          <span className="text-[5px] font-mono uppercase tracking-[0.35em] text-white/40">
            EUR
          </span>
        </div>

        {/* Quick action strip — slides up on hover */}
        <div
          className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center py-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)",
          }}
        >
          <span className="inline-flex items-center gap-2 text-[7px] font-mono uppercase tracking-[0.45em] text-[var(--gold)]">
            {tr("Ver Peça", "View Piece", "Ver Pieza")}
            <ArrowRight
              size={9}
              className="group-hover:translate-x-0.5 transition-transform duration-300"
            />
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="pt-4 pb-1 relative">
        {/* Gold accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: "linear-gradient(to right, rgba(197,160,89,0.15), transparent 50%)",
          }}
          aria-hidden
        />
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[6px] font-mono uppercase tracking-[0.45em] text-[var(--gold)]/40 mb-1.5">
              Heritage
            </p>
            <h3
              className="font-serif italic text-[var(--foreground)] leading-snug group-hover:text-[var(--gold)] transition-colors duration-300"
              style={{ fontSize: "clamp(0.9rem, 1.8vw, 1.05rem)" }}
            >
              {product.title}
            </h3>
          </div>
          <div className="flex-shrink-0 pt-0.5">
            <ArrowRight
              size={14}
              className="text-[var(--foreground-muted)]/20 group-hover:text-[var(--gold)] group-hover:translate-x-1 transition-[color,transform] duration-300"
            />
          </div>
        </div>

        {/* Hover underline */}
        <div
          className="mt-3 h-px origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
          style={{ background: "rgba(197,160,89,0.3)" }}
          aria-hidden
        />
      </div>
    </LocalizedLink>
  );
}

// ─── Featured Panel ───────────────────────────────────────────────────────────
// Full-width immersive showcase — cinematic hero for the featured product

function FeaturedPanel({ product }: { product: ProductListing }) {
  const price = formatPrice(product);
  const { language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);
  const secondaryImage = product.images[1]?.url;

  return (
    <section aria-label={`Destaque: ${product.title}`} className="relative">
      {/* ── Full-width immersive image background ── */}
      <div className="relative min-h-[90vh] lg:min-h-[100vh] overflow-hidden">
        {/* Main image — full bleed */}
        <LocalizedLink
          href={`/loja/${product.handle}`}
          className="group/hero block absolute inset-0"
        >
          {product.images[0]?.url ? (
            <Image
              src={product.images[0].url}
              alt={product.title}
              fill
              sizes="100vw"
              className="object-cover transition-transform duration-[2000ms] ease-out group-hover/hero:scale-[1.03]"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-[#070707] flex items-center justify-center">
              <ShoppingBag className="text-white/10" size={64} aria-hidden />
            </div>
          )}

          {/* Cinematic overlays */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.02) 30%, rgba(0,0,0,0.6) 65%, rgba(0,0,0,0.95) 100%)",
            }}
            aria-hidden
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.7) 0%, transparent 45%, rgba(0,0,0,0.3) 100%)",
            }}
            aria-hidden
          />

          {/* Subtle film grain texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E\")",
            }}
            aria-hidden
          />

          {/* Hover gold sweep at bottom */}
          <div
            className="absolute bottom-0 inset-x-0 h-[2px] origin-left scale-x-0 group-hover/hero:scale-x-100 transition-transform duration-1000"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(197,160,89,0.8), transparent)",
            }}
            aria-hidden
          />
        </LocalizedLink>

        {/* ── Top label bar ── */}
        <div
          className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-6 sm:px-10 lg:px-16 pt-8"
          style={{ opacity: 0, animation: "fadeSlideIn 0.6s ease-out 0.2s forwards" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-px" style={{ background: "rgba(197,160,89,0.5)" }} aria-hidden />
            <span className="text-[7px] font-mono uppercase tracking-[0.7em] text-white/40">
              01 — {tr("Peça em Destaque", "Featured Piece", "Pieza Destacada")}
            </span>
          </div>
          <span className="text-[6px] font-mono uppercase tracking-[0.5em] text-white/20 hidden sm:block">
            Heritage · MMXXVI
          </span>
        </div>

        {/* ── Content overlay — bottom left ── */}
        <div
          className="absolute bottom-0 left-0 right-0 z-10 px-6 sm:px-10 lg:px-16 pb-10 sm:pb-14 lg:pb-20"
          style={{ opacity: 0, animation: "fadeSlideIn 0.8s ease-out 0.3s forwards" }}
        >
          <div className="max-w-4xl">
            {/* Collection label */}
            <div className="flex items-center gap-4 mb-5">
              <span className="text-[7px] font-mono uppercase tracking-[0.6em] text-[var(--gold)]/70">
                {tr("Colecção Portuguesa", "Portuguese Collection", "Colección Portuguesa")}
              </span>
              <div
                className="flex-1 max-w-24 h-px"
                style={{
                  background: "linear-gradient(to right, rgba(197,160,89,0.4), transparent)",
                }}
                aria-hidden
              />
            </div>

            {/* Title — massive editorial */}
            <h2
              className="font-serif italic text-white leading-[0.85] mb-6 lg:mb-8"
              style={{ fontSize: "clamp(2.8rem, 7vw, 6.5rem)", letterSpacing: "-0.01em" }}
            >
              {product.title}
            </h2>

            {/* Description */}
            {product.description && (
              <p className="text-white/50 text-sm sm:text-base leading-[1.8] mb-8 max-w-lg">
                {product.description}
              </p>
            )}

            {/* Price + CTA row */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-10 mb-8">
              {/* Price block */}
              <div>
                <p className="text-[7px] font-mono uppercase tracking-[0.5em] text-white/30 mb-2">
                  {tr("Desde", "From", "Desde")}
                </p>
                <div className="flex items-baseline gap-3">
                  <span
                    className="font-serif text-[var(--gold)] tabular-nums"
                    style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
                  >
                    {price}
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.4em] text-white/35 font-mono">
                    EUR
                  </span>
                </div>
              </div>

              {/* CTA */}
              <MagneticButton strength={0.2}>
                <LocalizedLink
                  href={`/loja/${product.handle}`}
                  className="inline-flex items-center gap-4 px-12 py-5 text-[10px] uppercase tracking-[0.4em] font-bold bg-[var(--gold)] text-black hover:bg-white transition-[background-color,transform] duration-300 active:scale-[0.97] touch-manipulation group/cta shadow-[0_12px_48px_rgba(197,160,89,0.35)]"
                >
                  <ShoppingBag size={15} aria-hidden />
                  {tr("Descobrir Peça", "Discover Piece", "Descubrir Pieza")}
                  <ArrowRight
                    size={13}
                    className="group-hover/cta:translate-x-1.5 transition-transform duration-300"
                    aria-hidden
                  />
                </LocalizedLink>
              </MagneticButton>
            </div>

            {/* Trust signals — horizontal */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {[
                { icon: "◆", label: tr("Envio Seguro", "Secure Shipping", "Envío Seguro") },
                { icon: "◆", label: tr("Edição Limitada", "Limited Edition", "Edición Limitada") },
                { icon: "◆", label: tr("Feito à Mão", "Handmade", "Hecho a Mano") },
                { icon: "◆", label: tr("Certificado", "Certified", "Certificado") },
              ].map((trust) => (
                <div key={trust.label} className="flex items-center gap-2">
                  <span className="text-[5px] text-[var(--gold)]/50" aria-hidden>
                    {trust.icon}
                  </span>
                  <span className="text-[7px] font-mono uppercase tracking-[0.35em] text-white/35">
                    {trust.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Specs panel — desktop right side ── */}
        <div
          className="absolute bottom-14 right-6 sm:right-10 lg:right-16 z-10 hidden lg:block w-[280px]"
          style={{ opacity: 0, animation: "fadeSlideIn 0.7s ease-out 0.5s forwards" }}
        >
          <div
            className="p-6"
            style={{
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(197,160,89,0.12)",
            }}
          >
            {/* Secondary image thumbnail */}
            {secondaryImage && (
              <div
                className="relative h-[160px] mb-5 overflow-hidden"
                style={{ border: "1px solid rgba(197,160,89,0.08)" }}
              >
                <Image
                  src={secondaryImage}
                  alt={`${product.title} — detalhe`}
                  fill
                  sizes="280px"
                  className="object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)",
                  }}
                  aria-hidden
                />
              </div>
            )}

            {/* Specs list */}
            <div className="space-y-3 mb-5">
              {[
                { k: tr("Origem", "Origin", "Origen"), v: "Portugal" },
                {
                  k: tr("Produção", "Production", "Producción"),
                  v: tr("Artesanal", "Artisanal", "Artesanal"),
                },
                { k: tr("Coleção", "Collection", "Colección"), v: "Heritage" },
                {
                  k: tr("Material", "Material", "Material"),
                  v: tr("Premium", "Premium", "Premium"),
                },
              ].map(({ k, v }) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-[7px] font-mono uppercase tracking-[0.35em] text-white/35">
                    {k}
                  </span>
                  <span className="text-[7px] font-mono uppercase tracking-[0.25em] text-white/60">
                    {v}
                  </span>
                </div>
              ))}
            </div>

            {/* Separator */}
            <div className="h-px mb-4" style={{ background: "rgba(197,160,89,0.1)" }} aria-hidden />

            {/* Quick view link */}
            <LocalizedLink
              href={`/loja/${product.handle}`}
              className="flex items-center justify-between group/quick"
            >
              <span className="text-[7px] font-mono uppercase tracking-[0.4em] text-[var(--gold)]/60 group-hover/quick:text-[var(--gold)] transition-colors duration-300">
                {tr("Ver Detalhes", "View Details", "Ver Detalles")}
              </span>
              <ArrowRight
                size={10}
                className="text-[var(--gold)]/40 group-hover/quick:translate-x-1 transition-transform duration-300"
                aria-hidden
              />
            </LocalizedLink>
          </div>
        </div>

        {/* ── Vertical text — right edge ── */}
        <div
          className="absolute top-1/2 -translate-y-1/2 right-6 lg:right-10 z-10 hidden md:block"
          aria-hidden
        >
          <span
            className="text-[6px] font-mono uppercase tracking-[0.8em] text-white/10"
            style={{ writingMode: "vertical-lr" }}
          >
            {tr("Peça em Destaque", "Featured Piece", "Pieza Destacada")} · {product.title}
          </span>
        </div>

        {/* ── Corner ornaments ── */}
        <div
          className="absolute top-8 left-6 sm:left-10 lg:left-16 w-12 h-12 border-t border-l border-[var(--gold)]/10 z-10 pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute top-8 right-6 sm:right-10 lg:right-16 w-12 h-12 border-t border-r border-[var(--gold)]/10 z-10 pointer-events-none hidden sm:block"
          aria-hidden
        />
        <div
          className="absolute bottom-8 left-6 sm:left-10 lg:left-16 w-12 h-12 border-b border-l border-[var(--gold)]/10 z-10 pointer-events-none hidden sm:block"
          aria-hidden
        />
      </div>
    </section>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LojaContent({ products }: { products: ProductListing[] }) {
  const { t, language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [query, setQuery] = useState("");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const sorted = useMemo(() => {
    const list = [...products];
    if (sortKey === "price_asc")
      return list.sort(
        (a, b) =>
          Number(a.priceRange?.minVariantPrice.amount || 0) -
          Number(b.priceRange?.minVariantPrice.amount || 0)
      );
    if (sortKey === "price_desc")
      return list.sort(
        (a, b) =>
          Number(b.priceRange?.minVariantPrice.amount || 0) -
          Number(a.priceRange?.minVariantPrice.amount || 0)
      );
    if (sortKey === "alpha") return list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [products, sortKey]);

  const filtered = useMemo(() => {
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter(
      (p) => p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [sorted, query]);

  const isSingle = products.length === 1;
  const heroImage = products[0]?.images[0]?.url ?? null;
  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] overflow-x-hidden">
      {/* ═══════════════════════════════════════════════════════════════════════
          HERO — full viewport, cinematic
      ══════════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ height: "100svh", minHeight: "640px" }}
      >
        {/* Background image */}
        {heroImage ? (
          <Image
            src={heroImage}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
            aria-hidden
          />
        ) : (
          <div className="absolute inset-0 bg-[#070707]" />
        )}

        {/* Diagonal dark overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(155deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.18) 48%, rgba(0,0,0,0.72) 100%)",
          }}
          aria-hidden
        />

        {/* Bottom gradient — text legibility */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{
            height: "62%",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.55) 42%, transparent 100%)",
          }}
          aria-hidden
        />

        {/* Subtle gold tech grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(197,160,89,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(197,160,89,0.03) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
          aria-hidden
        />
        {/* Fine-pitch tech grid — data visualization aesthetic */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(197,160,89,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(197,160,89,0.015) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
          aria-hidden
        />
        {/* Subtle scan-line overlay — technological aesthetic */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(197,160,89,0.008) 2px, rgba(197,160,89,0.008) 4px)",
          }}
          aria-hidden
        />

        {/* ── Top meta bar ── */}
        <div
          className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-6 sm:px-10 lg:px-16"
          style={{
            paddingTop: "max(env(safe-area-inset-top), 2rem)",
            opacity: 0,
            animation: "fadeSlideIn 0.6s ease-out 0.05s forwards",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-5 h-px" style={{ background: "rgba(197,160,89,0.5)" }} aria-hidden />
            <span className="text-[6px] font-mono uppercase tracking-[0.7em] text-white/30">
              Portal Lusitano · Loja
            </span>
          </div>

          {products.length > 0 && (
            <div className="flex items-baseline gap-1.5" aria-hidden>
              <span style={{ fontSize: "clamp(1rem, 2.5vw, 1.6rem)" }}>
                <AnimatedCounter
                  end={products.length}
                  duration={1200}
                  className="font-serif italic text-[var(--gold)]/35 tabular-nums leading-none"
                />
              </span>
              <span className="text-[5.5px] font-mono uppercase tracking-[0.5em] text-white/20">
                {products.length === 1
                  ? tr("Peça", "Piece", "Pieza")
                  : tr("Peças", "Pieces", "Piezas")}
              </span>
            </div>
          )}
        </div>

        {/* ── Main content — bottom left ── */}
        <div
          className="absolute bottom-0 inset-x-0 z-20 px-6 sm:px-10 lg:px-16 pb-14 sm:pb-20 lg:pb-24"
          style={{
            opacity: 0,
            animation: "fadeSlideIn 0.95s ease-out 0.2s forwards",
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-5 h-px" style={{ background: "rgba(197,160,89,0.5)" }} aria-hidden />
            <span className="text-[7px] font-mono uppercase tracking-[0.55em] text-[var(--gold)]/60">
              {t.shop.collection}
            </span>
            <div className="w-5 h-px" style={{ background: "rgba(197,160,89,0.5)" }} aria-hidden />
          </div>

          {/* Single product: show product name directly; Multi: show page title */}
          <h1
            className="font-serif italic text-white leading-[0.84] mb-6 sm:mb-8"
            style={{
              fontSize: isSingle ? "clamp(2.8rem, 8vw, 7rem)" : "clamp(3.5rem, 9.5vw, 9.5rem)",
              letterSpacing: isSingle ? "-0.01em" : "0.04em",
            }}
          >
            {isSingle && featured ? featured.title : t.shop.legacy}
          </h1>

          {/* Gold line */}
          <div
            className="mb-6"
            style={{
              width: "clamp(56px, 9vw, 140px)",
              height: "1px",
              background: "linear-gradient(to right, rgba(197,160,89,0.8), transparent)",
            }}
            aria-hidden
          />

          {/* Single product: show description; Multi: show subtitle */}
          {isSingle && featured?.description ? (
            <p className="text-white/45 text-sm sm:text-base leading-[1.8] mb-8 max-w-lg">
              {featured.description}
            </p>
          ) : (
            <p className="text-[8px] font-mono uppercase tracking-[0.45em] text-white/35 mb-10 sm:mb-12">
              {t.shop.legacy_subtitle ||
                "Onde a tradição equestre encontra a elegância contemporânea"}
            </p>
          )}

          {/* Single product: price + direct link CTA; Multi: scroll CTA */}
          {featured && (
            <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-10">
              {/* Price — only for single product */}
              {isSingle && (
                <div>
                  <p className="text-[7px] font-mono uppercase tracking-[0.5em] text-white/30 mb-2">
                    {tr("Preço", "Price", "Precio")}
                  </p>
                  <div className="flex items-baseline gap-3">
                    <span
                      className="font-serif text-[var(--gold)] tabular-nums"
                      style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
                    >
                      {formatPrice(featured)}
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.4em] text-white/35 font-mono">
                      EUR
                    </span>
                  </div>
                </div>
              )}

              <MagneticButton strength={0.2}>
                {isSingle ? (
                  <LocalizedLink
                    href={`/loja/${featured.handle}`}
                    className="ripple-btn inline-flex items-center gap-3 group/cta bg-[var(--gold)] text-black px-10 py-5 text-[9px] font-bold uppercase tracking-[0.35em] hover:bg-white transition-[background-color] duration-300 shadow-[0_12px_48px_rgba(197,160,89,0.35)] focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-[var(--gold)]"
                  >
                    <ShoppingBag size={14} aria-hidden />
                    {tr("Comprar Agora", "Buy Now", "Comprar Ahora")}
                    <ArrowRight
                      size={12}
                      className="group-hover/cta:translate-x-1 transition-transform duration-300"
                      aria-hidden
                    />
                  </LocalizedLink>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("colecao")?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="ripple-btn inline-flex items-center gap-3 group/cta bg-[var(--gold)] text-black px-8 py-4 text-[8px] font-bold uppercase tracking-[0.35em] hover:bg-white transition-[background-color] duration-300 shadow-[0_8px_32px_rgba(197,160,89,0.3)] focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-[var(--gold)]"
                    aria-label={tr("Ver colecção", "View collection", "Ver colección")}
                  >
                    <ShoppingBag size={12} aria-hidden />
                    {tr("Ver Colecção", "View Collection", "Ver Colección")}
                    <ArrowRight
                      size={10}
                      className="group-hover/cta:translate-x-0.5 transition-transform duration-300"
                      aria-hidden
                    />
                  </button>
                )}
              </MagneticButton>

              {/* Trust signals — single product only */}
              {isSingle && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:pl-4">
                  {[
                    tr("Envio Seguro", "Secure Shipping", "Envío Seguro"),
                    tr("Edição Limitada", "Limited Edition", "Edición Limitada"),
                    tr("Feito à Mão", "Handmade", "Hecho a Mano"),
                  ].map((label) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="text-[5px] text-[var(--gold)]/50" aria-hidden>
                        &#9670;
                      </span>
                      <span className="text-[6px] font-mono uppercase tracking-[0.35em] text-white/30">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Piece count — multi product only */}
              {!isSingle && (
                <span className="inline-flex items-center gap-2 text-[7px] font-mono uppercase tracking-[0.45em] text-white/25 pt-3 sm:pt-0">
                  {products.length}{" "}
                  {tr("peças disponíveis", "pieces available", "piezas disponibles")}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Featured product preview card — desktop only, multi-product ── */}
        {!isSingle && featured && featured.images[0]?.url && (
          <LocalizedLink
            href={`/loja/${featured.handle}`}
            className="absolute bottom-20 right-16 z-20 hidden lg:block group/preview"
            style={{ opacity: 0, animation: "fadeSlideIn 0.7s ease-out 0.6s forwards" }}
          >
            <div
              className="relative w-[200px] overflow-hidden"
              style={{
                border: "1px solid rgba(197,160,89,0.12)",
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Image */}
              <div className="relative h-[220px] overflow-hidden">
                <Image
                  src={featured.images[0].url}
                  alt={featured.title}
                  fill
                  sizes="200px"
                  className="object-cover transition-transform duration-700 group-hover/preview:scale-[1.06]"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)",
                  }}
                  aria-hidden
                />
                {/* Price badge */}
                <div
                  className="absolute bottom-2 right-2 px-2 py-1 flex items-baseline gap-1"
                  style={{ background: "rgba(0,0,0,0.6)" }}
                >
                  <span className="font-serif text-[var(--gold)] tabular-nums text-xs">
                    {formatPrice(featured)}
                  </span>
                  <span className="text-[4px] font-mono uppercase tracking-[0.3em] text-white/35">
                    EUR
                  </span>
                </div>
              </div>
              {/* Info */}
              <div className="p-3" style={{ borderTop: "1px solid rgba(197,160,89,0.1)" }}>
                <p className="text-[5px] font-mono uppercase tracking-[0.5em] text-[var(--gold)]/40 mb-1">
                  {tr("Em Destaque", "Featured", "Destacado")}
                </p>
                <p className="font-serif italic text-white/80 text-xs leading-tight group-hover/preview:text-[var(--gold)] transition-colors duration-300 truncate">
                  {featured.title}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[5px] font-mono uppercase tracking-[0.4em] text-[var(--gold)]/50">
                    {tr("Explorar", "Explore", "Explorar")}
                  </span>
                  <ArrowRight
                    size={7}
                    className="text-[var(--gold)]/50 group-hover/preview:translate-x-0.5 transition-transform duration-300"
                  />
                </div>
              </div>
              {/* Gold sweep on hover */}
              <div
                className="absolute top-0 inset-x-0 h-px origin-left scale-x-0 group-hover/preview:scale-x-100 transition-transform duration-500"
                style={{ background: "rgba(197,160,89,0.5)" }}
                aria-hidden
              />
            </div>
          </LocalizedLink>
        )}

        {/* ── Specs card — single product, desktop right side ── */}
        {isSingle && featured && featured.images[1]?.url && (
          <div
            className="absolute bottom-20 right-6 sm:right-10 lg:right-16 z-20 hidden lg:block w-[220px]"
            style={{ opacity: 0, animation: "fadeSlideIn 0.7s ease-out 0.5s forwards" }}
          >
            <LocalizedLink href={`/loja/${featured.handle}`} className="block group/spec">
              <div
                className="overflow-hidden"
                style={{
                  border: "1px solid rgba(197,160,89,0.12)",
                  background: "rgba(0,0,0,0.5)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="relative h-[180px] overflow-hidden">
                  <Image
                    src={featured.images[1].url}
                    alt={`${featured.title} — detalhe`}
                    fill
                    sizes="220px"
                    className="object-cover transition-transform duration-700 group-hover/spec:scale-[1.06]"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)",
                    }}
                    aria-hidden
                  />
                </div>
                <div className="p-4" style={{ borderTop: "1px solid rgba(197,160,89,0.1)" }}>
                  <div className="space-y-2 mb-3">
                    {[
                      { k: tr("Origem", "Origin", "Origen"), v: "Portugal" },
                      {
                        k: tr("Produção", "Production", "Producción"),
                        v: tr("Artesanal", "Artisanal", "Artesanal"),
                      },
                    ].map(({ k, v }) => (
                      <div key={k} className="flex items-center justify-between">
                        <span className="text-[6px] font-mono uppercase tracking-[0.35em] text-white/35">
                          {k}
                        </span>
                        <span className="text-[6px] font-mono uppercase tracking-[0.25em] text-white/55">
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[6px] font-mono uppercase tracking-[0.4em] text-[var(--gold)]/60 group-hover/spec:text-[var(--gold)] transition-colors duration-300">
                      {tr("Ver Detalhes", "View Details", "Ver Detalles")}
                    </span>
                    <ArrowRight
                      size={9}
                      className="text-[var(--gold)]/40 group-hover/spec:translate-x-1 transition-transform duration-300"
                      aria-hidden
                    />
                  </div>
                </div>
              </div>
            </LocalizedLink>
          </div>
        )}

        {/* ── Scroll indicator — multi-product only ── */}
        {!isSingle && (
          <div
            className="absolute bottom-14 sm:bottom-20 right-6 sm:right-10 lg:right-16 z-20 hidden sm:flex flex-col items-center gap-3"
            style={{ opacity: 0, animation: "fadeSlideIn 0.5s ease-out 0.85s forwards" }}
            aria-hidden
          >
            <span
              className="text-[5px] font-mono uppercase tracking-[0.65em] text-white/18"
              style={{ writingMode: "vertical-lr" }}
            >
              Scroll
            </span>
            <div
              className="w-px"
              style={{
                height: "52px",
                background: "linear-gradient(to bottom, rgba(197,160,89,0.28), transparent)",
              }}
            />
          </div>
        )}

        {/* ── Corner ornaments ── */}
        <div
          className="absolute top-8 left-6 sm:left-10 lg:left-16 w-12 h-12 border-t border-l border-[var(--gold)]/10 z-10 pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute top-8 right-6 sm:right-10 lg:right-16 w-12 h-12 border-t border-r border-[var(--gold)]/10 z-10 pointer-events-none hidden sm:block"
          aria-hidden
        />

        {/* ── Coordinates ── */}
        <div
          className="absolute bottom-5 right-6 sm:right-10 lg:right-16 z-20 hidden md:block"
          aria-hidden
          style={{ opacity: 0, animation: "fadeSlideIn 0.5s ease-out 0.7s forwards" }}
        >
          <span className="text-[5.5px] font-mono tracking-[0.35em] text-white/12">
            38.7° N · 9.1° W
          </span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          COLLECTION
      ══════════════════════════════════════════════════════════════════════════ */}
      <div id="colecao">
        {/* ─── Multi-product: featured editorial panel ──────────────────────── */}
        {!isSingle && featured && (
          <RevealOnScroll variant="fade-up" duration={700}>
            <FeaturedPanel product={featured} />
          </RevealOnScroll>
        )}

        {/* ─── Trust/Stats Strip — editorial pillars ─────────────────────────── */}
        {!isSingle && products.length > 0 && (
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-px"
            style={{ background: "rgba(197,160,89,0.07)" }}
          >
            {[
              {
                ordinal: "01",
                label: tr("Artesanal", "Artisanal", "Artesanal"),
                desc: tr("Produção manual", "Handcrafted", "Producción manual"),
              },
              {
                ordinal: "02",
                label: tr("Edição Limitada", "Limited Edition", "Edición Limitada"),
                desc: tr("Peças exclusivas", "Exclusive pieces", "Piezas exclusivas"),
              },
              {
                ordinal: "03",
                label: "Portugal",
                desc: tr("Origem certificada", "Certified origin", "Origen certificado"),
              },
              {
                ordinal: "04",
                label: "Heritage MMXXVI",
                desc: tr("Tradição secular", "Secular tradition", "Tradición secular"),
              },
            ].map((stat, i) => (
              <RevealOnScroll key={stat.ordinal} delay={i * 100} variant="fade-up">
                <div
                  className="relative group overflow-hidden flex flex-col p-6 sm:p-8 lg:p-10"
                  style={{ background: "var(--background)" }}
                >
                  {/* Top gold accent line */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[1px]"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(197,160,89,0.5) 0%, rgba(197,160,89,0.1) 60%, transparent 100%)",
                    }}
                    aria-hidden
                  />
                  {/* Bottom hover sweep */}
                  <div
                    className="absolute bottom-0 left-0 h-[1px] w-0 group-hover:w-full transition-[width] duration-500 bg-[var(--gold)]/30 pointer-events-none"
                    aria-hidden
                  />
                  {/* Hover fill */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: "rgba(197,160,89,0.025)" }}
                  />

                  {/* Ordinal */}
                  <span className="text-[9px] uppercase tracking-[0.4em] text-[var(--gold)]/35 mb-3 font-medium relative z-10">
                    {stat.ordinal}
                  </span>

                  {/* Label */}
                  <h3 className="font-serif text-[var(--foreground)] text-base sm:text-lg mb-1 relative z-10">
                    {stat.label}
                  </h3>

                  {/* Description */}
                  <p className="text-[var(--foreground-muted)] text-xs sm:text-sm leading-relaxed relative z-10">
                    {stat.desc}
                  </p>

                  {/* Ghost watermark */}
                  <span
                    className="absolute bottom-1 right-2 font-serif select-none pointer-events-none"
                    aria-hidden
                    style={{ fontSize: "52px", color: "rgba(197,160,89,0.04)", lineHeight: 1 }}
                  >
                    {stat.ordinal}
                  </span>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        )}

        {/* ─── Sticky toolbar: search + sort ───────────────────────────────── */}
        {!isSingle && products.length > 0 && (
          <div
            className="sticky top-0 z-40 px-6 sm:px-10 lg:px-12 py-3.5 flex items-center justify-between gap-4"
            style={{
              background: "rgba(7,7,7,0.92)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              borderBottom: "1px solid rgba(197,160,89,0.06)",
              borderTop: "1px solid rgba(197,160,89,0.06)",
            }}
          >
            {/* Left */}
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-px"
                style={{ background: "rgba(197,160,89,0.45)" }}
                aria-hidden
              />
              <span className="text-[7px] font-mono uppercase tracking-[0.5em] text-[var(--foreground-secondary)]">
                Colecção
              </span>
              <span className="text-[6.5px] font-mono text-[var(--foreground-muted)]/28 tabular-nums">
                {filtered.length}
              </span>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3 sm:gap-5">
              {/* Search */}
              <div className="relative flex items-center">
                <Search
                  size={9}
                  className="absolute left-2.5 text-[var(--foreground-muted)]/35 pointer-events-none"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Pesquisar..."
                  aria-label="Pesquisar produtos"
                  className="bg-transparent pl-7 pr-6 py-1.5 text-[7px] uppercase tracking-[0.25em] text-[var(--foreground-secondary)] placeholder:text-[var(--foreground-muted)]/28 outline-none w-28 sm:w-40 transition-[border-color]"
                  style={{ border: "1px solid rgba(197,160,89,0.11)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(197,160,89,0.35)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(197,160,89,0.11)")}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Limpar pesquisa"
                    className="absolute right-2 text-[var(--foreground-muted)]/30 hover:text-[var(--gold)] transition-colors"
                  >
                    <X size={8} />
                  </button>
                )}
              </div>

              {/* Sort */}
              {products.length > 1 && (
                <div ref={sortRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setSortOpen((v) => !v)}
                    className="flex items-center gap-1.5 text-[7px] uppercase tracking-[0.35em] text-[var(--foreground-muted)] hover:text-[var(--gold)] transition-colors"
                    aria-expanded={sortOpen}
                    aria-haspopup="listbox"
                  >
                    <ListFilter size={9} aria-hidden />
                    <span className="hidden sm:inline">Ordenar</span>
                    <ChevronDown
                      size={8}
                      className={`transition-transform duration-200 ${sortOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>

                  {sortOpen && (
                    <div
                      role="listbox"
                      className="absolute right-0 top-full mt-2 z-50 min-w-[148px] bg-[#090909] shadow-[0_24px_70px_rgba(0,0,0,0.9)]"
                      style={{ border: "1px solid rgba(197,160,89,0.1)" }}
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          role="option"
                          aria-selected={sortKey === opt.key}
                          onClick={() => {
                            setSortKey(opt.key);
                            setSortOpen(false);
                          }}
                          className={`w-full text-left px-5 py-3 text-[7px] uppercase tracking-[0.3em] transition-colors hover:text-[var(--gold)] flex items-center gap-2.5 ${
                            sortKey === opt.key
                              ? "text-[var(--gold)]"
                              : "text-[var(--foreground-muted)]"
                          }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full flex-shrink-0 bg-[var(--gold)] transition-opacity ${
                              sortKey === opt.key ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Empty state ──────────────────────────────────────────────────── */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-48 gap-6 px-6">
            <ShoppingBag className="text-[var(--foreground-muted)]/20" size={22} aria-hidden />
            {query ? (
              <>
                <p
                  className="font-serif italic text-[var(--foreground-secondary)]"
                  style={{ fontSize: "clamp(1.1rem, 3vw, 1.7rem)" }}
                >
                  Nenhuma peça para{" "}
                  <span style={{ color: "var(--gold)" }}>&ldquo;{query}&rdquo;</span>
                </p>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-[7px] uppercase tracking-[0.45em] text-[var(--foreground-muted)] hover:text-[var(--gold)] transition-colors flex items-center gap-2"
                >
                  Limpar pesquisa
                  <ArrowRight size={9} />
                </button>
              </>
            ) : (
              <p
                className="font-serif italic text-[var(--foreground-secondary)]"
                style={{ fontSize: "clamp(1.1rem, 3vw, 1.7rem)" }}
              >
                {t.shop.not_found}
              </p>
            )}
          </div>
        )}

        {/* ─── Multi-product grid ───────────────────────────────────────────── */}
        {!isSingle && rest.length > 0 && (
          <div className="px-4 sm:px-6 lg:px-10 pt-10 sm:pt-14 pb-20 sm:pb-32">
            {/* Section header — editorial pattern */}
            <RevealOnScroll variant="fade-up" className="mb-8 sm:mb-12">
              <div className="flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-6 h-[1px] bg-[var(--gold)]" aria-hidden />
                    <span className="text-[9px] uppercase tracking-[0.55em] text-[var(--gold)]">
                      {tr("Colecção", "Collection", "Colección")}
                    </span>
                  </div>
                  <h2
                    className="font-serif text-[var(--foreground)] leading-none"
                    style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)" }}
                  >
                    {tr("Peças da Colecção", "Collection Pieces", "Piezas de la Colección")}
                  </h2>
                </div>
                <div className="flex items-baseline gap-1.5" aria-hidden>
                  <span style={{ fontSize: "clamp(1rem, 2.5vw, 1.6rem)" }}>
                    <AnimatedCounter
                      end={rest.length}
                      duration={1500}
                      className="font-serif italic text-[var(--gold)]/40 tabular-nums leading-none"
                    />
                  </span>
                  <span className="text-[6px] font-mono uppercase tracking-[0.45em] text-[var(--foreground-muted)]/30">
                    {rest.length === 1
                      ? tr("Peça", "Piece", "Pieza")
                      : tr("Peças", "Pieces", "Piezas")}
                  </span>
                </div>
              </div>
              <div
                className="mt-4 h-px"
                style={{
                  background: "linear-gradient(to right, rgba(197,160,89,0.35), transparent 70%)",
                }}
                aria-hidden
              />
            </RevealOnScroll>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-6 lg:gap-x-8 gap-y-10 sm:gap-y-14">
              {rest.map((product, i) => {
                // Every 4th product spans 2 columns on desktop for editorial rhythm
                const isWide = i > 0 && i % 4 === 0;
                return (
                  <div key={product.id} className={isWide ? "lg:col-span-2" : ""}>
                    <ProductCard
                      product={product}
                      index={i}
                      refNum={String(i + 2).padStart(2, "0")}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════════ */}
      {filtered.length > 0 && (
        <RevealOnScroll variant="blur-up" duration={700}>
          <footer
            className="px-6 sm:px-10 lg:px-16 py-20 sm:py-32 flex flex-col items-center text-center gap-8 relative overflow-hidden"
            style={{ borderTop: "1px solid rgba(197,160,89,0.06)" }}
          >
            {/* Atmospheric gold glow */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 0%, rgba(197,160,89,0.04) 0%, transparent 70%)",
              }}
              aria-hidden
            />

            {/* Diamond separator */}
            <div className="flex items-center gap-4" aria-hidden>
              <div
                className="w-12 h-px"
                style={{
                  background: "linear-gradient(to right, transparent, rgba(197,160,89,0.4))",
                }}
              />
              <span className="text-[var(--gold)]/40 text-[10px]">&#9670;</span>
              <div
                className="w-12 h-px"
                style={{
                  background: "linear-gradient(to left, transparent, rgba(197,160,89,0.4))",
                }}
              />
            </div>

            {/* Editorial quote */}
            <p
              className="font-serif italic text-[var(--foreground-secondary)] leading-[1.35] max-w-md relative z-10"
              style={{ fontSize: "clamp(1.15rem, 2.8vw, 1.75rem)", opacity: 0.65 }}
            >
              {tr(
                "Produção artesanal sob encomenda, enraizada na tradição lusitana.",
                "Artisanal production made to order, rooted in Lusitanian tradition.",
                "Producción artesanal bajo encargo, arraigada en la tradición lusitana."
              )}
            </p>

            {/* Location text */}
            <span className="text-[6px] font-mono uppercase tracking-[0.6em] text-[var(--foreground-muted)]/25 relative z-10">
              38.7° N · 9.1° W — Heritage · MMXXVI · Portugal
            </span>
          </footer>
        </RevealOnScroll>
      )}
    </main>
  );
}
