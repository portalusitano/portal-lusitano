"use client";

import dynamic from "next/dynamic";
import LocalizedLink from "@/components/LocalizedLink";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { useState, useEffect, useRef, useCallback, memo } from "react";
import { usePathname } from "next/navigation";
import { DesktopMenu } from "./navbar/DesktopMenu";
import { NavIcons } from "./navbar/NavIcons";
import { MobileMenu } from "./navbar/MobileMenu";

// Lazy load - SearchModal só carrega quando o utilizador abre a pesquisa
const SearchModal = dynamic(
  () => import("./Search").then((mod) => ({ default: mod.SearchModal })),
  { ssr: false }
);

export default memo(function Navbar() {
  const { language, toggleLanguage, t } = useLanguage();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Fechar menu mobile quando a página muda
  useEffect(() => {
    setIsMobileOpen(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, [pathname]);

  // Stable callbacks — prevent NavIcons and MobileMenu from re-rendering on every
  // scroll event (which causes `scrolled` state to update and re-render Navbar)
  const handleSearchClick = useCallback(() => setIsSearchOpen(true), []);
  const handleSearchClose = useCallback(() => setIsSearchOpen(false), []);
  const handleMobileToggle = useCallback(() => setIsMobileOpen((prev) => !prev), []);
  const handleMobileClose = useCallback(() => setIsMobileOpen(false), []);

  // Global Ctrl+K / Cmd+K shortcut to open search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Detect scroll for better mobile UX (RAF-throttled, only updates on change)
  const scrolledRef = useRef(false);
  useEffect(() => {
    let rafId = 0;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const next = window.scrollY > 20;
        if (next !== scrolledRef.current) {
          scrolledRef.current = next;
          setScrolled(next);
        }
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    // A barra entra a descer uma vez, ao carregar. Depois disso só reage ao
    // scroll: ganha um véu escuro com desfoque e uma hairline em vez de ter
    // fundo sólido desde o início, para o topo da página respirar.
    <nav
      id="main-navigation"
      role="navigation"
      aria-label={
        language === "pt"
          ? "Navegação principal"
          : language === "es"
            ? "Navegación principal"
            : "Main navigation"
      }
      className={`anim-cabecalho fixed w-full z-50 border-b [transform:translateZ(0)] transition-[border-color] duration-200 ease-in-out ${
        scrolled ? "border-[var(--border-soft)]" : "border-transparent"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-[var(--nav-bg-scrolled)] backdrop-blur-md transition-opacity duration-150 ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-20 flex items-center justify-between gap-4">
        {/* LOGÓTIPO COM IMAGEM */}
        <LocalizedLink href="/" className="flex items-center gap-2 md:gap-3 group flex-shrink-0">
          <Image
            src="/logo.webp"
            alt="Portal Lusitano"
            width={44}
            height={44}
            priority
            className="w-9 h-9 md:w-11 md:h-11 object-contain group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col justify-center">
            <span className="text-base md:text-lg font-semibold tracking-tight text-[var(--foreground-strong)] group-hover:text-[var(--gold)] transition-colors leading-none whitespace-nowrap">
              PORTAL LUSITANO
            </span>
            <span className="rotulo text-[var(--foreground-muted)] mt-0.5 group-hover:text-[var(--gold)]/70 transition-colors leading-none">
              EST. 2023
            </span>
          </div>
        </LocalizedLink>

        {/* MENU DESKTOP */}
        <DesktopMenu t={t} />

        {/* ICONES E IDIOMA */}
        <NavIcons
          language={language}
          t={t}
          isMobileOpen={isMobileOpen}
          onSearchClick={handleSearchClick}
          onLanguageToggle={toggleLanguage}
          onMobileToggle={handleMobileToggle}
        />
      </div>

      {/* Menu Mobile Expandido */}
      <MobileMenu
        isOpen={isMobileOpen}
        language={language}
        t={t}
        onLanguageToggle={toggleLanguage}
        onClose={handleMobileClose}
      />

      {/* Modal de Pesquisa */}
      <SearchModal isOpen={isSearchOpen} onClose={handleSearchClose} />
    </nav>
  );
});
