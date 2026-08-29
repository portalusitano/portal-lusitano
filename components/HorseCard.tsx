"use client";

import { memo } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import Image from "next/image";
import { MapPin, Calendar, Flame } from "lucide-react";
import HorseFavoriteButton from "./HorseFavoriteButton";
import { useLanguage } from "@/context/LanguageContext";
import { getBlurDataURL } from "@/lib/image-utils";

interface HorseCardProps {
  horse: {
    id: string;
    nome_cavalo: string;
    preco: number;
    image_url?: string;
    slug?: string;
    localizacao?: string;
    idade?: number;
    raca?: string;
    destaque?: boolean;
    nivel?: string;
    disciplinas?: string[] | string | null;
    created_at?: string;
  };
  href: string;
  compact?: boolean;
  /** Set true for the first 2–4 cards visible above the fold to improve LCP */
  priority?: boolean;
}

function getPrimaryDiscipline(disciplinas: string[] | string | null | undefined): string | null {
  if (!disciplinas) return null;
  if (Array.isArray(disciplinas)) return disciplinas[0] || null;
  if (typeof disciplinas === "string") {
    const first = disciplinas.split(",")[0]?.trim();
    return first || null;
  }
  return null;
}

/** Um anúncio é \"novo\" na primeira semana — o mesmo critério em toda a grelha. */
function ehRecente(criadoEm: string | undefined): boolean {
  if (!criadoEm) return false;
  const quando = new Date(criadoEm).getTime();
  if (Number.isNaN(quando)) return false;
  return Date.now() - quando < 7 * 86_400_000;
}

// memo: HorseCard re-renders for every filter/sort change in MarketplaceGrid.
// Wrapping in memo avoids re-rendering cards whose props haven't changed.
export default memo(function HorseCard({
  horse,
  href,
  compact = false,
  priority = false,
}: HorseCardProps) {
  const { language } = useLanguage();
  const locale = language === "en" ? "en-GB" : language === "es" ? "es-ES" : "pt-PT";
  const favoriteHorse = {
    id: horse.id,
    slug: horse.slug || horse.id,
    name: horse.nome_cavalo,
    price: horse.preco,
    image: horse.image_url,
    location: horse.localizacao,
    age: horse.idade,
    breed: horse.raca,
  };

  const primaryDiscipline = getPrimaryDiscipline(horse.disciplinas);
  const badgeLabel = horse.nivel || primaryDiscipline;

  return (
    <article className="group relative touch-manipulation" aria-label={horse.nome_cavalo}>
      <LocalizedLink
        href={href}
        className="cartao cartao-interactivo block overflow-hidden active:scale-[0.99] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
      >
        {/* Fotografia. 4:3 em vez de 4:5: numa grelha de classificados o que
            conta é caberem mais anúncios no ecrã, e o retrato alto gastava
            altura sem mostrar mais cavalo. */}
        <div
          className={`${
            compact ? "aspect-square" : "aspect-[4/3]"
          } bg-[var(--background-secondary)] overflow-hidden relative`}
        >
          {horse.image_url ? (
            <Image
              src={horse.image_url}
              alt={[
                horse.nome_cavalo,
                horse.raca || "Cavalo Lusitano",
                horse.idade ? `${horse.idade} anos` : null,
                horse.localizacao ? `em ${horse.localizacao}` : null,
              ]
                .filter(Boolean)
                .join(" — ")}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              quality={80}
              priority={priority}
              placeholder={priority ? undefined : "blur"}
              blurDataURL={priority ? undefined : getBlurDataURL("horse")}
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center rotulo"
              role="img"
              aria-label={`${horse.nome_cavalo} — sem fotografia`}
            >
              Sem foto
            </div>
          )}

          {/* Distintivos. Ficam sobre a foto porque em baixo roubariam a linha
              que o preço e o nome precisam num cartão compacto. */}
          <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1">
            {horse.destaque && (
              <span className="selo selo-destaque">
                <Flame size={9} aria-hidden="true" />
                Destaque
              </span>
            )}
            {ehRecente(horse.created_at) && <span className="selo selo-novo">Novo</span>}
            {badgeLabel && <span className="selo selo-neutro">{badgeLabel}</span>}
          </div>
        </div>

        {/* Informação. Preço primeiro: num classificados é o que decide se o
            anúncio merece um clique. */}
        <div className="p-2.5 space-y-1">
          <p className="preco text-base sm:text-lg">
            {Number(horse.preco).toLocaleString(locale)} €
          </p>

          <h2 className="text-sm font-medium text-[var(--foreground)] line-clamp-1 group-hover:text-[var(--gold)] transition-colors">
            {horse.nome_cavalo}
          </h2>

          <div className="meta flex items-center gap-2 min-h-[1.05rem]">
            {horse.idade ? (
              <span className="flex items-center gap-1 flex-shrink-0">
                <Calendar size={11} aria-hidden="true" />
                {horse.idade} anos
              </span>
            ) : null}
            {horse.localizacao ? (
              <span className="flex items-center gap-1 truncate">
                <MapPin size={11} className="flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{horse.localizacao}</span>
              </span>
            ) : null}
          </div>
        </div>
      </LocalizedLink>

      <div className="absolute top-2 right-2 z-10">
        <HorseFavoriteButton horse={favoriteHorse} size="sm" className="shadow-lg" />
      </div>
    </article>
  );
});
