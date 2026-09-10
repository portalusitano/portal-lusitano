/**
 * Página de Cavalos Favoritos — Marketplace
 *
 * Lista os cavalos do marketplace (/comprar) que o utilizador guardou.
 * Usa HorseFavoritesContext (cavalos à venda no marketplace).
 *
 * NÃO confundir com /favoritos que é a wishlist de produtos da loja Shopify.
 */ "use client";

import { Heart, Trash2, MapPin, Calendar, ExternalLink, Share2, Filter } from "lucide-react";
import LocalizedLink from "@/components/LocalizedLink";
import Image from "next/image";
import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useHorseFavorites } from "@/context/HorseFavoritesContext";

export default function CavalosFavoritosPage() {
  const { t, language } = useLanguage();
  const { favorites, removeFromFavorites, clearFavorites, favoritesCount } = useHorseFavorites();
  const [sortBy, setSortBy] = useState<"recent" | "price-asc" | "price-desc">("recent");

  const txt = t.cavalos_favoritos;
  const locale = language === "en" ? "en-GB" : language === "es" ? "es-ES" : "pt-PT";

  // Sort favorites
  const sortedFavorites = [...favorites].sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return (a.price || 0) - (b.price || 0);
      case "price-desc":
        return (b.price || 0) - (a.price || 0);
      default:
        return 0; // Keep original order (most recent)
    }
  });

  const handleShare = async (horse: (typeof favorites)[0]) => {
    const url = `${window.location.origin}/comprar/${horse.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: horse.name,
          text: `${horse.name}`,
          url,
        });
      } catch (error) {
        console.warn("[CavalosFavoritos] Share failed or was cancelled:", error);
      }
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[var(--background)] pt-24 sm:pt-32 pb-24 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-16 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[var(--elevate-1)] rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Heart className="text-[var(--foreground-muted)]" size={28} aria-hidden="true" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl text-[var(--foreground)] mb-2 sm:mb-4">
              {txt.title}
            </h1>
            <p className="text-[var(--foreground-secondary)] font-normal text-sm sm:text-base">
              {txt.subtitle}
            </p>

            {favoritesCount > 0 && (
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
                <span className="text-[var(--foreground-muted)] text-sm">
                  {favoritesCount} {txt.total}
                </span>
                <button
                  onClick={clearFavorites}
                  className="text-xs uppercase tracking-wider text-[var(--foreground-muted)] hover:text-red-500 transition-colors active:scale-95"
                >
                  {txt.clear_all}
                </button>
              </div>
            )}
          </div>

          {favorites.length === 0 ? (
            <div
              className="text-center py-16 sm:py-20 px-4 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]"
              style={{ animationDelay: "0.2s" }}
            >
              <Heart className="text-[var(--foreground-muted)] mx-auto mb-6" size={56} />
              <h2 className="text-xl sm:text-2xl text-[var(--foreground)] mb-3">{txt.empty}</h2>
              <p className="text-[var(--foreground-muted)] mb-8 text-sm sm:text-base max-w-md mx-auto">
                {txt.empty_subtitle}
              </p>
              <LocalizedLink
                href="/comprar"
                className="btn btn-primario rounded-full px-8 active:scale-95"
              >
                {txt.explore}
              </LocalizedLink>
            </div>
          ) : (
            <>
              {/* Sort Controls - Mobile Optimized */}
              <div
                className="flex items-center justify-between mb-6 sm:mb-8 px-1 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]"
                style={{ animationDelay: "0.3s" }}
              >
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-[var(--foreground-muted)]" />
                </div>
                <div className="flex gap-1 sm:gap-2">
                  {[
                    { key: "recent", label: txt.sort_recent },
                    { key: "price-asc", label: txt.sort_price_asc },
                    { key: "price-desc", label: txt.sort_price_desc },
                  ].map((option) => (
                    <button
                      key={option.key}
                      onClick={() => setSortBy(option.key as typeof sortBy)}
                      className={`chip active:scale-95 ${sortBy === option.key ? "chip-activo" : ""}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid - Mobile First */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {sortedFavorites.map((horse, index) => (
                  <div
                    key={horse.id}
                    className="group bg-[var(--background-secondary)]/50 border border-[var(--border)] overflow-hidden touch-manipulation opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]"
                    style={{ animationDelay: `${index * 0.08}s` }}
                  >
                    {/* Image */}
                    <LocalizedLink href={`/comprar/${horse.id}`} className="block">
                      <div className="aspect-[4/3] sm:aspect-[4/5] bg-[var(--background-secondary)] overflow-hidden relative">
                        {horse.image ? (
                          <Image
                            src={horse.image}
                            alt={horse.name}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--foreground-muted)]">
                            <Heart size={40} />
                          </div>
                        )}
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                        {/* Quick info overlay - Mobile */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                          {horse.price && (
                            <p className="preco text-lg sm:text-xl">
                              {Number(horse.price).toLocaleString(locale)} €
                            </p>
                          )}
                        </div>
                      </div>
                    </LocalizedLink>

                    {/* Info */}
                    <div className="p-4 sm:p-5">
                      <LocalizedLink href={`/comprar/${horse.id}`}>
                        <h3 className="text-lg sm:text-xl text-[var(--foreground)] mb-2 group-hover:text-[var(--foreground-strong)] transition-colors line-clamp-1">
                          {horse.name}
                        </h3>
                      </LocalizedLink>

                      {/* Meta info */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--foreground-muted)] mb-4">
                        {horse.age && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {horse.age} {txt.years}
                          </span>
                        )}
                        {horse.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {horse.location}
                          </span>
                        )}
                        {horse.breed && (
                          <span className="text-[var(--foreground-muted)]">{horse.breed}</span>
                        )}
                      </div>

                      {/* Actions - Touch Optimized */}
                      <div className="flex gap-2">
                        <LocalizedLink
                          href={`/comprar/${horse.id}`}
                          className="btn btn-primario flex-1 touch-manipulation rounded-full active:scale-[0.98]"
                        >
                          {txt.view}
                        </LocalizedLink>
                        <button
                          onClick={() => handleShare(horse)}
                          className="w-12 border border-[var(--border)] text-[var(--foreground-secondary)] hover:text-[var(--foreground-strong)] hover:border-[var(--border-hover)] transition-colors flex items-center justify-center active:scale-95 touch-manipulation"
                          aria-label={txt.share}
                        >
                          <Share2 size={16} />
                        </button>
                        <button
                          onClick={() => removeFromFavorites(horse.id)}
                          className="w-12 border border-[var(--border)] text-[var(--foreground-secondary)] hover:text-red-500 hover:border-red-500/50 transition-colors flex items-center justify-center active:scale-95 touch-manipulation"
                          aria-label={txt.remove}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom CTA - Mobile */}
              <div
                className="mt-8 sm:mt-12 text-center opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]"
                style={{ animationDelay: "0.5s" }}
              >
                <LocalizedLink
                  href="/comprar"
                  className="inline-flex items-center gap-2 text-[var(--foreground-muted)] hover:text-[var(--foreground-strong)] transition-colors text-sm"
                >
                  <span>{txt.continue_exploring}</span>
                  <ExternalLink size={14} />
                </LocalizedLink>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
