"use client";

import { Heart } from "lucide-react";
import ShareButtons from "@/components/ShareButtons";
import { useHorseFavorites, FavoriteHorse } from "@/context/HorseFavoritesContext";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";

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
  const { language } = useLanguage();
  const tr = createTranslator(language);
  const guardado = isFavorite(cavalo.id);

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <button
        type="button"
        onClick={() => (guardado ? removeFromFavorites(cavalo.id) : addToFavorites(cavalo))}
        aria-pressed={guardado}
        className={`btn ${
          guardado ? "border-red-500/40 bg-red-500/10 text-red-400" : "btn-secundario"
        }`}
      >
        <Heart size={15} aria-hidden="true" fill={guardado ? "currentColor" : "none"} />
        {guardado ? tr("Guardado", "Saved", "Guardado") : tr("Guardar", "Save", "Guardar")}
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
