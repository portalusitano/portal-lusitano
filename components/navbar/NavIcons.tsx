import { memo } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { Search, Heart, User, Plus, Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useHorseFavorites } from "@/context/HorseFavoritesContext";

interface NavIconsProps {
  language: string;
  t: { cart: string };
  isMobileOpen: boolean;
  onSearchClick: () => void;
  onLanguageToggle: () => void;
  onMobileToggle: () => void;
}

function tr3(lang: string, pt: string, en: string, es: string) {
  return lang === "pt" ? pt : lang === "es" ? es : en;
}

export const NavIcons = memo(function NavIcons({
  language,
  t,
  isMobileOpen,
  onSearchClick,
  onLanguageToggle,
  onMobileToggle,
}: NavIconsProps) {
  const { theme, toggleTheme } = useTheme();
  const { favoritesCount } = useHorseFavorites();

  return (
    <div className="flex items-center gap-2 md:gap-4">
      {/* Tema — hidden on mobile to save space (brand text visible now) */}
      <button
        onClick={toggleTheme}
        className="hidden sm:flex text-[var(--foreground-secondary)] hover:text-[var(--gold)] transition-colors p-2 min-w-[44px] min-h-[44px] items-center justify-center active:scale-95 touch-manipulation"
        aria-label={
          theme === "dark"
            ? tr3(language, "Mudar para modo claro", "Switch to light mode", "Cambiar a modo claro")
            : tr3(
                language,
                "Mudar para modo escuro",
                "Switch to dark mode",
                "Cambiar a modo oscuro"
              )
        }
      >
        {theme === "dark" ? (
          <Sun size={20} strokeWidth={1.5} />
        ) : (
          <Moon size={20} strokeWidth={1.5} />
        )}
      </button>

      {/* Pesquisa */}
      <button
        onClick={onSearchClick}
        className="text-[var(--foreground-secondary)] hover:text-[var(--gold)] transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 touch-manipulation"
        aria-label={tr3(language, "Pesquisar", "Search", "Buscar")}
      >
        <Search size={20} strokeWidth={1.5} />
      </button>

      {/* Idioma */}
      <button
        onClick={onLanguageToggle}
        className="hidden lg:flex text-xs font-bold tracking-widest text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors border border-transparent hover:border-[var(--border)] px-2 py-1 rounded-sm"
        aria-label={tr3(language, "Mudar idioma", "Change language", "Cambiar idioma")}
      >
        <span className={language === "pt" ? "text-[var(--gold)]" : ""}>PT</span>
        <span className="mx-1 opacity-30 text-[var(--foreground-muted)]">|</span>
        <span className={language === "en" ? "text-[var(--gold)]" : ""}>EN</span>
        <span className="mx-1 opacity-30 text-[var(--foreground-muted)]">|</span>
        <span className={language === "es" ? "text-[var(--gold)]" : ""}>ES</span>
      </button>

      {/* Favoritos — hidden on mobile (accessible via BottomNav) */}
      <LocalizedLink
        href="/cavalos-favoritos"
        className="hidden sm:flex text-[var(--foreground-secondary)] hover:text-[var(--gold)] transition-colors p-2 min-w-[44px] min-h-[44px] items-center justify-center relative active:scale-95 touch-manipulation"
        aria-label={
          language === "pt"
            ? "Cavalos Favoritos"
            : language === "es"
              ? "Caballos Favoritos"
              : "Favorite Horses"
        }
      >
        <Heart size={20} strokeWidth={1.5} />
        {favoritesCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-5 h-5 bg-[var(--gold)] rounded-full flex items-center justify-center text-[10px] text-black font-bold">
            {favoritesCount}
          </span>
        )}
      </LocalizedLink>

      {/* Conta */}
      <LocalizedLink
        href="/minha-conta"
        className="hidden md:flex text-[var(--foreground-secondary)] hover:text-[var(--gold)] transition-colors p-2 min-w-[44px] min-h-[44px] items-center justify-center active:scale-95 touch-manipulation"
        aria-label={tr3(language, "Minha conta", "My account", "Mi cuenta")}
      >
        <User size={20} strokeWidth={1.5} />
      </LocalizedLink>

      {/* Publicar anúncio — a acção que sustenta o marketplace, por isso é o
          único destaque com fundo cheio na barra. */}
      <LocalizedLink
        href="/vender-cavalo"
        className="hidden sm:flex items-center gap-2 bg-[var(--gold)] text-black px-4 py-2 text-[10px] uppercase tracking-widest font-medium hover:bg-[var(--gold-hover)] transition-colors active:scale-95 touch-manipulation"
      >
        <Plus size={14} strokeWidth={2} />
        {tr3(language, "Vender", "Sell", "Vender")}
      </LocalizedLink>

      {/* Menu Mobile — hidden when BottomNav is active (< lg) */}
      <button
        className="hidden text-[var(--foreground)] p-2 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 touch-manipulation"
        onClick={onMobileToggle}
        aria-label={
          isMobileOpen
            ? tr3(language, "Fechar menu", "Close menu", "Cerrar menú")
            : tr3(language, "Abrir menu", "Open menu", "Abrir menú")
        }
        aria-expanded={isMobileOpen}
        aria-controls="mobile-menu"
      >
        {isMobileOpen ? <X size={26} /> : <Menu size={26} />}
      </button>
    </div>
  );
});
