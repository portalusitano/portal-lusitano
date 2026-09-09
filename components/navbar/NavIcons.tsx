import { memo } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { Heart, User, Plus, MessagesSquare } from "lucide-react";
import { useHorseFavorites } from "@/context/HorseFavoritesContext";
import { useMensagensPorLer } from "@/context/MensagensContext";
import { BotaoIdioma } from "./BotaoIdioma";

interface NavIconsProps {
  language: string;
  t: {
    nav: {
      change_language: string;
      horse_favorites: string;
      messages: string;
      unread: string;
      my_account: string;
      post_listing: string;
      menu: string;
      open_menu: string;
      close_menu: string;
    };
    common: { search: string };
  };
  isMobileOpen: boolean;
  onLanguageChoose: (codigo: "pt" | "en" | "es") => void;
  onMobileToggle: () => void;
}

export const NavIcons = memo(function NavIcons({
  language,
  t,
  isMobileOpen,
  onLanguageChoose,
  onMobileToggle,
}: NavIconsProps) {
  const { favoritesCount } = useHorseFavorites();
  const { porLer } = useMensagensPorLer();

  return (
    <div className="flex items-center gap-2 md:gap-4">
      {/* ── A lupa saiu da barra ────────────────────────────────────────────
          Era um ícone sozinho, sem palavra, a abrir uma modal — e o site tem
          caixas de pesquisa **escritas** onde a pesquisa serve para alguma
          coisa: no `/comprar`, no `/directorio` e no `/mapa`, todas com o
          marcador a dizer o que procuram. Um ícone mudo ao lado delas é um
          quarto sítio para a mesma acção, e o único que não diz o que faz.
          Quem tinha o hábito continua a ter o atalho `/`, que a barra do mapa
          anuncia. */}

      {/* Idioma */}
      <BotaoIdioma
        language={language}
        rotulo={t.nav.change_language}
        onEscolher={onLanguageChoose}
        className="hidden lg:grid"
      />

      {/* Favoritos — escondido em telemóvel; lá vive no menu de ecrã inteiro. */}
      <LocalizedLink
        href="/cavalos-favoritos"
        className="hidden sm:flex text-[var(--foreground-secondary)] hover:text-[var(--foreground-strong)] transition-colors p-2 min-w-[44px] min-h-[44px] items-center justify-center relative active:scale-95 touch-manipulation"
        aria-label={t.nav.horse_favorites}
      >
        <Heart size={20} strokeWidth={1.5} />
        {favoritesCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-5 h-5 bg-[var(--foreground-strong)] rounded-full flex items-center justify-center text-[10px] text-black font-bold">
            {favoritesCount}
          </span>
        )}
      </LocalizedLink>

      {/* Mensagens — só aparece quando há alguma coisa por ler, para não
          ocupar a barra a quem nunca falou com ninguém. */}
      {porLer > 0 && (
        <LocalizedLink
          href="/minha-conta/mensagens"
          className="hidden sm:flex text-[var(--foreground-secondary)] hover:text-[var(--foreground-strong)] transition-colors p-2 min-w-[44px] min-h-[44px] items-center justify-center relative active:scale-95 touch-manipulation"
          aria-label={`${t.nav.messages} (${porLer} ${t.nav.unread})`}
        >
          <MessagesSquare size={20} strokeWidth={1.5} />
          <span
            aria-hidden="true"
            className="absolute top-0.5 right-0.5 min-w-[20px] h-5 px-1 bg-[var(--foreground-strong)] rounded-full flex items-center justify-center text-[10px] text-black font-bold"
          >
            {porLer > 9 ? "9+" : porLer}
          </span>
        </LocalizedLink>
      )}

      {/* Conta */}
      <LocalizedLink
        href="/minha-conta"
        className="hidden md:flex text-[var(--foreground-secondary)] hover:text-[var(--foreground-strong)] transition-colors p-2 min-w-[44px] min-h-[44px] items-center justify-center active:scale-95 touch-manipulation"
        aria-label={t.nav.my_account}
      >
        <User size={20} strokeWidth={1.5} />
      </LocalizedLink>

      {/* Publicar anúncio — a acção que sustenta o marketplace, por isso é o
          único destaque com fundo cheio na barra. */}
      <LocalizedLink
        href="/vender-cavalo"
        className="btn btn-acento btn-sm hidden sm:inline-flex active:scale-95 touch-manipulation"
      >
        <Plus size={14} strokeWidth={2} aria-hidden="true" />
        {t.nav.post_listing}
      </LocalizedLink>

      {/* Menu em ecrã pequeno: pastilha com a palavra, não um ícone de três
          traços. Lê-se à primeira e é um alvo de toque maior. */}
      <button
        className="btn btn-pilula lg:hidden active:scale-95 touch-manipulation"
        onClick={onMobileToggle}
        aria-label={isMobileOpen ? t.nav.close_menu : t.nav.open_menu}
        aria-expanded={isMobileOpen}
        aria-controls="mobile-menu"
      >
        {t.nav.menu}
      </button>
    </div>
  );
});
