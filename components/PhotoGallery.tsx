"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

interface PhotoGalleryProps {
  photos: string[];
  alt: string;
  backHref: string;
  destaque?: boolean;
}

export default function PhotoGallery({ photos, alt, backHref, destaque }: PhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const prev = () => setActiveIndex((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setActiveIndex((i) => (i + 1) % photos.length);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
    if (e.key === "Escape") setLightboxOpen(false);
  };

  return (
    <>
      {/* Main Gallery */}
      <div className="relative w-full h-[55vw] max-h-[70vh] lg:h-full lg:max-h-none flex flex-col">
        {/* Hero image */}
        <div className="relative flex-1 overflow-hidden bg-[var(--background-secondary)]">
          <Image
            src={photos[activeIndex]}
            alt={`${alt} — foto ${activeIndex + 1}`}
            fill
            className="object-cover transition-opacity duration-300"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority={activeIndex === 0}
          />

          {/* Bottom gradient for mobile */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent lg:hidden pointer-events-none" />

          {/* Nav arrows — only when multiple photos */}
          {photos.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors touch-manipulation"
                aria-label="Foto anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors touch-manipulation"
                aria-label="Próxima foto"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}

          {/* Zoom button */}
          <button
            onClick={() => setLightboxOpen(true)}
            className="absolute bottom-3 right-3 z-10 w-9 h-9 bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors touch-manipulation"
            aria-label="Ver em ecrã cheio"
          >
            <ZoomIn size={15} />
          </button>

          {/* Counter badge */}
          {photos.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-black/50 backdrop-blur-sm px-3 py-1 text-white text-[10px] font-mono tracking-wider">
              {activeIndex + 1} / {photos.length}
            </div>
          )}

          {/* Back link */}
          <div className="absolute top-4 left-4 z-10">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/80 hover:text-white transition-colors bg-black/40 backdrop-blur-sm px-3 py-2"
              aria-label="Voltar ao marketplace"
            >
              <ArrowLeft size={12} aria-hidden="true" />
              Marketplace
            </Link>
          </div>

          {/* Destaque badge */}
          {destaque && (
            <div className="absolute top-4 right-4 z-10">
              <span className="bg-[var(--gold)] text-black rotulo font-bold px-3 py-1">
                Destaque
              </span>
            </div>
          )}
        </div>

        {/* Thumbnails strip — only when multiple photos */}
        {photos.length > 1 && (
          <div
            className="flex gap-1.5 p-2 bg-[var(--background)] overflow-x-auto flex-shrink-0"
            style={{ scrollbarWidth: "none" }}
          >
            {photos.map((src, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`relative flex-shrink-0 w-16 h-12 overflow-hidden border-2 transition-all touch-manipulation ${
                  i === activeIndex
                    ? "border-[var(--gold)] opacity-100"
                    : "border-transparent opacity-50 hover:opacity-80"
                }`}
                aria-label={`Foto ${i + 1}`}
                aria-pressed={i === activeIndex}
              >
                <Image
                  src={src}
                  alt={`${alt} miniatura ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
          onKeyDown={handleKey}
          role="dialog"
          aria-modal="true"
          aria-label="Galeria de fotos"
          tabIndex={-1}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X size={22} />
          </button>

          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-4 z-10 w-12 h-12 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                aria-label="Foto anterior"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-4 z-10 w-12 h-12 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                aria-label="Próxima foto"
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}

          <div className="relative w-full h-full max-w-5xl max-h-[90vh] mx-auto p-8">
            <Image
              src={photos[activeIndex]}
              alt={`${alt} — foto ${activeIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs font-mono tracking-wider">
              {activeIndex + 1} / {photos.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
