"use client";

import dynamic from "next/dynamic";
import LocalizedLink from "@/components/LocalizedLink";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { useState, useEffect, useRef, useCallback, memo } from "react";
import { usePathname } from "next/navigation";
import { eRotaDeEntrada } from "@/lib/rotas-de-entrada";
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

  // Ao passar para desktop, fechar o menu.
  //
  // O painel é `lg:hidden`, por isso ao alargar a janela desaparecia do ecrã
  // — mas o estado ficava aberto e o `overflow: hidden` que ele põe no body
  // ficava com ele. Resultado: uma página que não rola e sem nada visível
  // para fechar. Só se sai daí voltando a estreitar a janela.
  useEffect(() => {
    const largo = window.matchMedia("(min-width: 1024px)");
    const aoMudar = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setIsMobileOpen(false);
    };
    aoMudar(largo);
    largo.addEventListener("change", aoMudar);
    return () => largo.removeEventListener("change", aoMudar);
  }, []);

  // Com o menu aberto, a barra sai também da árvore de acessibilidade.
  //
  // Sem isto ficava invisível e sem eventos mas continuava a ser lida: o seu
  // botão passa a chamar-se «Fechar menu» quando o menu abre, e um leitor de
  // ecrã anunciava dois botões com esse nome — o do painel, que funciona, e
  // este, que não se consegue activar.
  //
  // O atributo é posto por referência e não como prop no JSX. Como prop,
  // `inert={…}` fazia o build emitir uma referência a um chunk que não
  // chegava a existir, e a página deixava de hidratar por completo — nada
  // no site respondia a um clique. Verificado nos dois sentidos.
  const barraRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const barra = barraRef.current;
    if (!barra) return;
    if (isMobileOpen) barra.setAttribute("inert", "");
    else barra.removeAttribute("inert");
  }, [isMobileOpen]);

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

  // As páginas de entrada são um ecrã só, com a marca ao centro. Com esta
  // barra por cima ficavam duas marcas no mesmo ecrã.
  if (eRotaDeEntrada(pathname)) return null;

  return (
    // A barra entra a descer uma vez, ao carregar. Depois disso só reage ao
    // scroll: ganha um véu escuro com desfoque e uma hairline em vez de ter
    // fundo sólido desde o início, para o topo da página respirar.
    <nav
      ref={barraRef}
      id="main-navigation"
      role="navigation"
      aria-label={
        language === "pt"
          ? "Navegação principal"
          : language === "es"
            ? "Navegación principal"
            : "Main navigation"
      }
      // Com o menu aberto a barra sai de cena. O painel é translúcido, por
      // isso a barra ficava a atravessá-lo desfocada por trás da marca que o
      // próprio painel já mostra — a mesma palavra duas vezes, uma delas
      // fantasma.
      className={`anim-cabecalho fixed w-full z-50 border-b [transform:translateZ(0)] transition-[border-color,opacity] duration-[230ms] ease-[var(--ease-header)] ${
        scrolled ? "border-[var(--border-soft)]" : "border-transparent"
      } ${isMobileOpen ? "pointer-events-none opacity-0" : "opacity-100"}`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-[var(--nav-bg-scrolled)] backdrop-blur-[24px] transition-opacity duration-[230ms] ease-[var(--ease-header)] ${
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
            className="hidden md:block w-11 h-11 object-contain group-hover:scale-105 transition-transform"
          />
          {/* A marca é o texto. Peso forte e tracking apertado dão-lhe presença
              sem precisar de tamanho — e sem a data por baixo, que roubava
              atenção ao nome e envelhece sozinha. */}
          <span className="text-lg md:text-xl font-bold tracking-[0.01em] text-[var(--foreground-strong)] group-hover:text-[var(--foreground-strong)] transition-colors leading-none whitespace-nowrap">
            PORTAL LUSITANO
          </span>
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
        onLanguageToggle={toggleLanguage}
        onClose={handleMobileClose}
      />

      {/* Modal de Pesquisa */}
      <SearchModal isOpen={isSearchOpen} onClose={handleSearchClose} />
    </nav>
  );
});
