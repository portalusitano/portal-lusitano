"use client";

import { Heart } from "lucide-react";
import ShareButtons from "@/components/ShareButtons";
import { useHorseFavorites, FavoriteHorse } from "@/context/HorseFavoritesContext";

interface AccoesAnuncioProps {
  cavalo: FavoriteHorse;
  /** URL absoluto do anúncio, usado nos links de partilha. */
  url: string;
}

/**
 * Barra de acções da ficha do anúncio: guardar nos favoritos e partilhar.
 *
 * Num classificados estes dois botões são o que faz o anúncio circular — a
 * partilha por WhatsApp é, em Portugal, o canal onde a maioria dos anúncios
 * é reencaminhada.
 */
export default function AccoesAnuncio({ cavalo, url }: AccoesAnuncioProps) {
  const { isFavorite, addToFavorites, removeFromFavorites } = useHorseFavorites();
  const guardado = isFavorite(cavalo.id);

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <button
        type="button"
        onClick={() => (guardado ? removeFromFavorites(cavalo.id) : addToFavorites(cavalo))}
        aria-pressed={guardado}
        className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg text-[11px] uppercase tracking-widest font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] ${
          guardado
            ? "border-red-500/40 bg-red-500/10 text-red-400"
            : "border-[var(--border)] bg-[var(--background-secondary)] text-[var(--foreground-secondary)] hover:border-[var(--gold)]/40 hover:text-[var(--gold)]"
        }`}
      >
        <Heart size={14} aria-hidden="true" fill={guardado ? "currentColor" : "none"} />
        {guardado ? "Guardado" : "Guardar"}
      </button>

      <ShareButtons
        title={cavalo.name}
        url={url}
        variant="dialog"
        utmMedium="partilha-anuncio"
        utmCampaign="anuncio"
      />
    </div>
  );
}
