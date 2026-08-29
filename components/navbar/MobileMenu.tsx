import { useMemo, memo } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { User, Plus, ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { getMobileDbItems, MOBILE_MAIN_NAV_ITEMS } from "./navData";

interface MobileMenuProps {
  isOpen: boolean;
  language: string;
  t: {
    nav: {
      home: string;
      shop: string;
      journal: string;
      about: string;
      database: string;
      tools: string;
      community: string;
      horse_favorites: string;
      shop_favorites: string;
      advertising: string;
      my_account: string;
      free_ebook: string;
      buy_horse: string;
      buy_horse_desc: string;
      sell_horse: string;
      sell_horse_desc: string;
      studs: string;
      studs_desc: string;
      map: string;
      map_desc: string;
      events: string;
      events_desc: string;
      lineages: string;
      lineages_desc: string;
      piroplasmosis: string;
      piroplasmosis_desc: string;
      calculator: string;
      calculator_desc: string;
      comparator: string;
      comparator_desc: string;
      compatibility: string;
      compatibility_desc: string;
      professionals: string;
      professionals_desc: string;
      notable_lusitanos: string;
      notable_lusitanos_desc: string;
      profile_analysis: string;
      profile_analysis_desc: string;
    };
  };
  onLanguageToggle: () => void;
  onClose: () => void;
}

export const MobileMenu = memo(function MobileMenu({
  isOpen,
  language,
  t,
  onLanguageToggle,
  onClose,
}: MobileMenuProps) {
  const pathname = usePathname();

  const mobileDbItems = useMemo(() => getMobileDbItems(t.nav), [t]);

  // Memoized to avoid rebuilding a new array reference on every render.
  // Icons are stable module-level references so they are safe to include.
  // Derivado da lista, não indexado por posição: indexar por posição fixa
  // rebentava assim que a lista encolheu (MOBILE_MAIN_NAV_ITEMS[3] passou a
  // undefined e o prerender falhava a ler .icon).
  const mainNavItems = useMemo(
    () =>
      MOBILE_MAIN_NAV_ITEMS.map((item) => ({
        name: item.nameKey === "home" ? t.nav.home : t.nav.about,
        href: item.href,
        icon: item.icon,
      })),
    [t.nav.home, t.nav.about]
  );

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  if (!isOpen) return null;

  return (
    <nav
      id="mobile-menu"
      aria-label="Menu mobile"
      className="lg:hidden border-t border-[var(--gold)]/15 max-h-[calc(100svh-56px)] overflow-y-auto overscroll-contain animate-[mobileMenuIn_0.28s_cubic-bezier(0.2,0,0,1)_forwards]"
      style={{ background: "rgba(5,5,5,0.98)" }}
    >
      <div className="px-4 py-6 space-y-2">
        {/* Main Navigation */}
        {mainNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <LocalizedLink
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-4 py-4 px-3 text-lg transition-colors rounded-lg active:scale-[0.98] touch-manipulation ${
                active
                  ? "text-[var(--gold)] bg-[var(--surface-hover)]"
                  : "text-[var(--foreground-secondary)] hover:text-[var(--gold)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              <item.icon size={20} className="text-[var(--foreground-muted)]" />
              {item.name}
            </LocalizedLink>
          );
        })}

        {/* Lusitano Section Mobile - Grid Layout */}
        <div className="border-t border-[var(--border)] pt-4 mt-4">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--gold)] mb-3 block px-3 font-medium">
            {t.nav.database}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {mobileDbItems.map((item) => (
              <LocalizedLink
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 py-3 px-3 text-sm transition-colors rounded-lg active:scale-[0.98] touch-manipulation ${
                  item.highlight
                    ? "text-green-400 bg-green-500/10 border border-green-500/30"
                    : "text-[var(--foreground-secondary)] hover:text-[var(--gold)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <item.icon
                  size={18}
                  className={item.highlight ? "text-green-400" : "text-[var(--gold)]/70"}
                />
                <span className="truncate">{item.label}</span>
              </LocalizedLink>
            ))}
          </div>
        </div>

        {/* Publicar anúncio — a acção que sustenta o marketplace */}
        <div className="border-t border-[var(--border)] pt-4 mt-4">
          <LocalizedLink
            href="/vender-cavalo"
            onClick={onClose}
            className="flex items-center gap-4 p-4 bg-gradient-to-r from-[var(--gold)]/15 via-[var(--gold)]/8 to-transparent border border-[var(--gold)]/30 rounded-xl active:scale-[0.98] touch-manipulation transition-transform"
          >
            <div className="w-12 h-12 bg-[var(--gold)]/15 border border-[var(--gold)]/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <Plus size={20} className="text-[var(--gold)]" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)] leading-tight">
                {language === "pt"
                  ? "Vender o meu cavalo"
                  : language === "es"
                    ? "Vender mi caballo"
                    : "Sell my horse"}
              </p>
              <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5 leading-tight">
                {language === "pt"
                  ? "Publique o anúncio em minutos"
                  : language === "es"
                    ? "Publique su anuncio en minutos"
                    : "Publish your listing in minutes"}
              </p>
            </div>
            <ArrowRight size={16} className="text-[var(--gold)] flex-shrink-0" />
          </LocalizedLink>
        </div>

        {/* Additional Links */}
        <div className="border-t border-[var(--border)] pt-4 mt-4 space-y-2">
          <LocalizedLink
            href="/minha-conta"
            className="flex items-center gap-4 py-3 px-3 text-[var(--foreground-secondary)] hover:text-[var(--gold)] hover:bg-[var(--surface-hover)] transition-colors rounded-lg active:scale-[0.98] touch-manipulation"
          >
            <User size={18} className="text-[var(--foreground-muted)]" />
            {t.nav.my_account}
          </LocalizedLink>
        </div>

        {/* CTA & Language */}
        <div className="border-t border-[var(--border)] pt-4 mt-4 space-y-3">
          <button
            onClick={() => {
              onLanguageToggle();
              onClose();
            }}
            className="w-full text-center py-3 px-3 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors rounded-lg active:scale-[0.98] touch-manipulation"
          >
            {language === "pt"
              ? "Switch to English"
              : language === "en"
                ? "Cambiar a Español"
                : "Mudar para Português"}
          </button>
        </div>
      </div>
    </nav>
  );
});
