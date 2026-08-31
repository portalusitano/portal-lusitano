"use client";

import { memo } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { usePathname } from "next/navigation";
import { Home, ShoppingCart, User, Plus, MessagesSquare } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useMensagensPorLer } from "@/context/MensagensContext";
export default memo(function MobileBottomNav() {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const { porLer } = useMensagensPorLer();
  // Don't show on certain pages
  const hiddenPaths = ["/studio", "/admin"];
  if (hiddenPaths.some((path) => pathname.startsWith(path))) {
    return null;
  }

  const navItems: {
    href: string;
    icon: typeof Home;
    label: string;
    isActive: boolean;
    /** Número por cima do ícone; 0 esconde-o. */
    distintivo?: number;
  }[] = [
    {
      href: "/",
      icon: Home,
      label: t.mobile_nav.home,
      isActive: pathname === "/",
    },
    {
      href: "/comprar",
      icon: ShoppingCart,
      label: t.mobile_nav.horses,
      isActive: pathname.startsWith("/comprar"),
    },
    {
      // A acção que sustenta o marketplace fica ao alcance do polegar.
      href: "/vender-cavalo",
      icon: Plus,
      label: language === "pt" ? "Vender" : language === "es" ? "Vender" : "Sell",
      isActive: pathname.startsWith("/vender-cavalo"),
    },
    {
      href: "/minha-conta/mensagens",
      icon: MessagesSquare,
      // Sem este número, quem recebe uma mensagem não tem como saber.
      distintivo: porLer,
      label: language === "pt" ? "Mensagens" : language === "es" ? "Mensajes" : "Messages",
      isActive: pathname.startsWith("/minha-conta/mensagens"),
    },
    {
      href: "/minha-conta",
      icon: User,
      label: t.mobile_nav.account,
      isActive: pathname === "/minha-conta",
    },
  ];

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the nav */}
      <div className="h-[72px] lg:hidden" />

      {/* Bottom Navigation */}
      <nav
        aria-label={t.mobile_nav.home ? "Navegação mobile" : "Mobile navigation"}
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[var(--background-secondary)] border-t border-[var(--border)] safe-area-bottom [transform:translateZ(0)]"
      >
        <div className="flex items-center justify-around h-[72px] px-2">
          {navItems.map((item) => (
            <LocalizedLink
              key={item.href}
              href={item.href}
              aria-label={
                item.distintivo ? `${item.label} (${item.distintivo} por ler)` : item.label
              }
              className={`flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[56px] rounded-xl transition-all active:scale-90 touch-manipulation focus-visible:ring-2 focus-visible:ring-[var(--gold)] ${
                item.isActive
                  ? "text-[var(--foreground-muted)]"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)]"
              }`}
            >
              <div className="relative">
                <item.icon size={24} strokeWidth={item.isActive ? 2 : 1.5} />
                {item.distintivo ? (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 bg-[var(--foreground-strong)] text-black rounded-full flex items-center justify-center text-[10px] font-bold"
                  >
                    {item.distintivo > 9 ? "9+" : item.distintivo}
                  </span>
                ) : null}
              </div>
              <span
                className={`text-[10px] font-medium ${item.isActive ? "text-[var(--foreground-muted)]" : ""}`}
              >
                {item.label}
              </span>
            </LocalizedLink>
          ))}
        </div>
      </nav>
    </>
  );
});
