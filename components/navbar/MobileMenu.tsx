"use client";

import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import LocalizedLink from "@/components/LocalizedLink";
import { ArrowRight, ArrowUpRight, X } from "lucide-react";
import { usePathname } from "next/navigation";

interface MobileMenuProps {
  isOpen: boolean;
  language: string;
  onLanguageToggle: () => void;
  onClose: () => void;
}

function tr3(lang: string, pt: string, en: string, es: string) {
  return lang === "pt" ? pt : lang === "es" ? es : en;
}

/** As redes onde o portal está. Ícones, sem rótulo — a linha lê-se de relance. */
const REDES = [
  { nome: "Instagram", href: "https://www.instagram.com/portal.lusitano/" },
  { nome: "Facebook", href: "https://www.facebook.com/portallusitano" },
];

/**
 * Menu de ecrã inteiro.
 *
 * Sem ícones, sem caixas e sem cor nas entradas: a hierarquia é feita só com
 * tamanho de letra. Numa lista de seis destinos, um ícone por linha não
 * acrescenta informação nenhuma e rouba a atenção que devia ir para a palavra.
 *
 * A única entrada com tratamento próprio é publicar anúncio, que é a acção
 * que sustenta o marketplace, e vai numa pastilha por baixo da lista.
 */
export const MobileMenu = memo(function MobileMenu({
  isOpen,
  language,
  onLanguageToggle,
  onClose,
}: MobileMenuProps) {
  const pathname = usePathname();
  // O painel fica montado enquanto a animação de saída corre; quem o desmonta
  // é o fim dessa animação, não um temporizador que tem de adivinhar a
  // duração. O estado é ajustado durante o render — a forma que o React
  // aceita — em vez de num efeito, que encadearia renders.
  const [montado, setMontado] = useState(isOpen);
  const [abertoAntes, setAbertoAntes] = useState(isOpen);

  if (isOpen !== abertoAntes) {
    setAbertoAntes(isOpen);
    if (isOpen) setMontado(true);
  }

  const aFechar = montado && !isOpen;

  // Com o menu aberto, a página por baixo não deve rolar.
  useEffect(() => {
    if (!isOpen) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [isOpen, onClose]);

  if (!montado) return null;

  const destinos = [
    { href: "/", label: tr3(language, "Início", "Home", "Inicio") },
    { href: "/comprar", label: tr3(language, "Comprar cavalo", "Buy a horse", "Comprar caballo") },
    { href: "/directorio", label: tr3(language, "Coudelarias", "Studs", "Cuadras") },
    { href: "/mapa", label: tr3(language, "Mapa", "Map", "Mapa") },
    { href: "/eventos", label: tr3(language, "Eventos", "Events", "Eventos") },
    { href: "/sobre", label: tr3(language, "Sobre", "About", "Sobre") },
    { href: "/minha-conta", label: tr3(language, "A minha conta", "My account", "Mi cuenta") },
  ];

  // Num portal para o `body`, e não onde está declarado: a barra de navegação
  // leva `transform: translateZ(0)` para compor na GPU, e um antecessor com
  // transform passa a ser o bloco de contenção de qualquer `position: fixed`
  // lá dentro. O painel resolvia o `inset-0` contra a barra — 56px de altura —
  // em vez de contra a janela.
  return createPortal(
    <div
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label={tr3(language, "Menu", "Menu", "Menú")}
      data-a-fechar={aFechar ? "true" : "false"}
      onAnimationEnd={(e) => {
        // Só a animação do próprio painel decide o desmonte; as das entradas
        // borbulham até aqui e não têm nada a ver com isto.
        if (aFechar && e.target === e.currentTarget) setMontado(false);
      }}
      className="menu-painel fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-[var(--background)] px-5 pb-10 lg:hidden"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
    >
      {/* Cabeçalho do painel: a marca fica onde estava, o botão passa a fechar. */}
      <div className="flex items-center justify-between gap-4 h-14">
        <LocalizedLink
          href="/"
          onClick={onClose}
          className="text-lg font-bold tracking-[0.01em] text-[var(--foreground-strong)]"
        >
          PORTAL LUSITANO
        </LocalizedLink>

        <button
          onClick={onClose}
          aria-label={tr3(language, "Fechar menu", "Close menu", "Cerrar menú")}
          className="btn btn-pilula gap-2 active:scale-95 touch-manipulation"
        >
          <X size={18} aria-hidden="true" />
          {tr3(language, "Fechar", "Close", "Cerrar")}
        </button>
      </div>

      {/* Destinos. Só palavras, em corpo grande. */}
      <nav className="mt-10 flex flex-col">
        {destinos.map((d, i) => {
          const activo = d.href === "/" ? pathname === "/" : pathname.startsWith(d.href);
          return (
            <LocalizedLink
              key={d.href}
              href={d.href}
              onClick={onClose}
              aria-current={activo ? "page" : undefined}
              className={`menu-item flex items-center justify-between py-3 text-[2rem] font-normal leading-tight tracking-tight transition-colors ${
                activo
                  ? "text-[var(--gold)]"
                  : "text-[var(--foreground-strong)] hover:text-[var(--foreground-secondary)]"
              }`}
              style={{ ["--i" as string]: i }}
            >
              {d.label}
            </LocalizedLink>
          );
        })}
      </nav>

      {/* A acção que sustenta o marketplace, em pastilha. */}
      <div className="menu-item mt-8" style={{ ["--i" as string]: destinos.length }}>
        <LocalizedLink
          href="/vender-cavalo"
          onClick={onClose}
          className="btn btn-pilula gap-2.5 text-base"
        >
          {tr3(language, "Publicar anúncio", "Post a listing", "Publicar anuncio")}
          <ArrowRight size={17} aria-hidden="true" />
        </LocalizedLink>
      </div>

      <div className="flex-1" />

      {/* Rodapé do painel: idioma e redes. */}
      <div
        className="menu-item mt-12 border-t border-[var(--border-soft)] pt-6"
        style={{ ["--i" as string]: destinos.length + 1 }}
      >
        <button onClick={onLanguageToggle} className="btn btn-subtil px-0 text-sm">
          {language === "pt" ? "Switch to English" : "Mudar para português"}
        </button>

        <div className="mt-5 flex items-center gap-5">
          {REDES.map((r) => (
            <a
              key={r.nome}
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className="meta inline-flex items-center gap-1 hover:text-[var(--foreground-strong)] transition-colors"
            >
              {r.nome}
              <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
});
