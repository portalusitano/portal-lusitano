"use client";

import { memo, useMemo, Fragment } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { ArrowUpRight, Plus, ArrowRight } from "lucide-react";
import { IconInstagram, IconTikTok, IconEmail } from "@/components/icons/SocialIcons";
import { useLanguage } from "@/context/LanguageContext";
import { CONTACT_EMAIL, SOCIAL_LINKS } from "@/lib/constants";

export default memo(function Footer() {
  const { t } = useLanguage();

  // Comprar
  const col1 = useMemo(
    () => [
      { name: t.footer.buy_horse, href: "/comprar" },
      { name: "Cavalos favoritos", href: "/cavalos-favoritos" },
      { name: "Alertas de pesquisa", href: "/minha-conta/alertas" },
    ],
    [t.footer.buy_horse]
  );

  // Vender
  const col2 = useMemo(
    () => [
      { name: t.footer.sell_horse, href: "/vender-cavalo" },
      { name: "Os meus anúncios", href: "/minha-conta/anuncios" },
      { name: "As minhas mensagens", href: "/minha-conta/mensagens" },
    ],
    [t.footer.sell_horse]
  );

  // Descobrir
  const col3 = useMemo(
    () => [
      { name: t.footer.studs, href: "/directorio" },
      { name: t.nav.map || "Mapa", href: "/mapa" },
    ],
    [t.footer.studs, t.nav.map]
  );

  // Portal
  const col4 = useMemo(
    () => [
      { name: t.nav.home, href: "/" },
      { name: t.footer.about, href: "/sobre" },
      { name: t.footer.contact, href: "/contacto" },
      { name: t.footer.returns, href: "/devolucoes" },
    ],
    [t.nav.home, t.footer.about, t.footer.contact, t.footer.returns]
  );

  const legalLinks = useMemo(
    () => [
      { label: t.footer.complaints_book, href: "https://www.livroreclamacoes.pt", external: true },
      {
        label: t.footer.dispute_resolution,
        href: "https://ec.europa.eu/consumers/odr",
        external: true,
      },
      { label: t.footer.privacy, href: "/privacidade", external: false },
      { label: t.footer.terms, href: "/termos", external: false },
    ],
    [t.footer.complaints_book, t.footer.dispute_resolution, t.footer.privacy, t.footer.terms]
  );

  const MARQUEE =
    "Cavalos Lusitanos · Portugal · Est. 2023 · O Legado Nobre · Raça Lusitana · The Lusitano Archive · Coudelarias · Profissionais Equestres · ";

  const socials = [
    {
      href: SOCIAL_LINKS.instagram,
      label: "Instagram",
      icon: IconInstagram,
      hover: "hover:bg-gradient-to-br hover:from-purple-600 hover:via-pink-500 hover:to-orange-400",
    },
    { href: SOCIAL_LINKS.tiktok, label: "TikTok", icon: IconTikTok, hover: "hover:bg-[#ff0050]" },
    {
      href: `mailto:${CONTACT_EMAIL}`,
      label: "Email",
      icon: IconEmail,
      hover: "hover:bg-[var(--gold)]",
    },
  ];

  const cols = [
    { label: t.footer.navigation, items: col1 },
    { label: t.footer.lusitano, items: col2 },
    { label: t.footer.tools, items: col3 },
    { label: "Portal", items: col4 },
  ];

  return (
    <footer className="bg-[var(--background)] relative overflow-hidden">
      {/* ── AMBIENT LIGHT ─────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-[var(--gold)] opacity-[0.045] blur-[130px] [transform:translateZ(0)]" />
        <div className="absolute top-0 left-1/4 w-[400px] h-[250px] bg-[var(--gold)] opacity-[0.018] blur-[90px] [transform:translateZ(0)]" />
        <div className="absolute top-0 right-1/4 w-[400px] h-[250px] bg-[var(--gold)] opacity-[0.018] blur-[90px] [transform:translateZ(0)]" />
      </div>

      {/* ── TOP GOLD HAIRLINE ─────────────────────────── */}
      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(197,160,89,0.45) 50%, transparent)",
        }}
        aria-hidden="true"
      />

      {/* ── BRAND STATEMENT ───────────────────────────── */}
      <div className="relative text-center pt-14 sm:pt-20 pb-10 sm:pb-14 px-4 sm:px-6 overflow-hidden">
        {/* Grain texture */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none select-none"
          aria-hidden="true"
        >
          <filter id="ftg">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#ftg)" />
        </svg>

        {/* Corner ornaments */}
        {[
          "top-6 left-4 sm:left-10 border-t border-l",
          "top-6 right-4 sm:right-10 border-t border-r",
          "bottom-6 left-4 sm:left-10 border-b border-l",
          "bottom-6 right-4 sm:right-10 border-b border-r",
        ].map((cls) => (
          <div
            key={cls}
            className={`absolute ${cls} w-7 h-7 border-[var(--gold)]/20 pointer-events-none`}
            aria-hidden="true"
          />
        ))}

        {/* Est. label */}
        <div className="flex items-center justify-center gap-3 mb-7">
          <div
            className="h-px w-6 sm:w-16"
            style={{ background: "linear-gradient(to right, transparent, rgba(197,160,89,0.5))" }}
          />
          <span className="text-[var(--gold)] text-[8px] uppercase tracking-[0.5em]">
            Est. MMXXIII · Portugal
          </span>
          <div
            className="h-px w-6 sm:w-16"
            style={{ background: "linear-gradient(to left, transparent, rgba(197,160,89,0.5))" }}
          />
        </div>

        {/* Wordmark — medium, refined */}
        <LocalizedLink href="/" className="group inline-block mb-2" aria-label="Portal Lusitano">
          <div className="leading-[0.9]">
            <span
              className="block font-serif font-normal tracking-[-0.03em] text-[var(--foreground)] group-hover:text-[var(--gold)] transition-colors duration-700"
              style={{ fontSize: "clamp(2.2rem, 5.5vw, 4.5rem)" }}
            >
              PORTAL
            </span>
            <span
              className="block font-serif italic font-light tracking-[-0.01em] text-[var(--gold)]"
              style={{ fontSize: "clamp(2.2rem, 5.5vw, 4.5rem)" }}
            >
              Lusitano
            </span>
          </div>
        </LocalizedLink>

        {/* Diamond + tagline */}
        <div className="flex items-center justify-center gap-3 mt-5 mb-5">
          <div
            className="h-px w-8 sm:w-28"
            style={{ background: "linear-gradient(to right, transparent, rgba(197,160,89,0.3))" }}
          />
          <svg
            width="5"
            height="5"
            viewBox="0 0 5 5"
            fill="currentColor"
            className="text-[var(--gold)]/50 rotate-45 flex-shrink-0"
            aria-hidden="true"
          >
            <rect width="5" height="5" />
          </svg>
          <div
            className="h-px w-8 sm:w-28"
            style={{ background: "linear-gradient(to left, transparent, rgba(197,160,89,0.3))" }}
          />
        </div>

        <p className="text-[var(--foreground-muted)] text-xs sm:text-sm font-light max-w-sm mx-auto leading-relaxed mb-7">
          {t.home.manifesto}
        </p>

        {/* Social icons — centered */}
        <div className="flex items-center justify-center gap-2.5">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target={s.href.startsWith("http") ? "_blank" : undefined}
              rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
              aria-label={s.label}
              className={`w-9 h-9 border border-[var(--border)] flex items-center justify-center text-[var(--foreground-muted)] hover:text-white hover:border-transparent transition-all duration-300 ${s.hover}`}
            >
              <s.icon size={15} />
            </a>
          ))}
        </div>
      </div>

      {/* ── MARQUEE ───────────────────────────────────── */}
      <div
        className="overflow-hidden py-2.5"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          maskImage: "linear-gradient(to right, transparent, black 7%, black 93%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 7%, black 93%, transparent)",
        }}
        aria-hidden="true"
      >
        <div
          className="flex whitespace-nowrap"
          style={{ animation: "footer-marquee 38s linear infinite", willChange: "transform" }}
        >
          {[0, 1].map((i) => (
            <span
              key={i}
              className="text-[7px] sm:text-[8px] uppercase tracking-[0.45em] text-[var(--foreground-muted)]/30 flex-shrink-0 pr-0"
            >
              {Array(6).fill(MARQUEE).join("")}
            </span>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTAINER ────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* ── 4-COLUMN NAV ──────────────────────────── */}
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 py-8 sm:py-10"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          {cols.map((col) => (
            <nav key={col.label} aria-label={col.label}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-px bg-[var(--gold)]" />
                <h3 className="text-[var(--gold)] text-[7px] sm:text-[8px] uppercase tracking-[0.4em] font-medium">
                  {col.label}
                </h3>
              </div>
              <ul className="space-y-1.5">
                {col.items.map((item) => (
                  <li key={item.href}>
                    <LocalizedLink
                      href={item.href}
                      className="group flex items-center gap-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] text-[11px] sm:text-[12px] font-light tracking-[0.02em] transition-colors duration-200"
                    >
                      <span className="w-2 h-px bg-[var(--gold)] opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity duration-200" />
                      {item.name}
                    </LocalizedLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* ── VENDER CTA ────────────────────────────── */}
        <LocalizedLink
          href="/vender-cavalo"
          className="group flex items-center justify-between gap-4 py-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-8 h-8 border border-[var(--gold)]/35 flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--gold)]/10 transition-colors duration-300">
              <Plus size={13} className="text-[var(--gold)]" />
            </div>
            <div className="min-w-0">
              <p className="text-[var(--foreground)] text-xs font-medium tracking-wide">
                {t.footer.sell_horse}
              </p>
              <p className="text-[var(--foreground-muted)] text-[10px] font-light">
                Publique o seu Lusitano e chegue a compradores em todo o país
              </p>
            </div>
          </div>
          <ArrowRight
            size={14}
            className="text-[var(--gold)]/50 flex-shrink-0 group-hover:translate-x-1 group-hover:text-[var(--gold)] transition-all duration-300"
          />
        </LocalizedLink>

        {/* ── LEGAL ─────────────────────────────────── */}
        <div className="py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {legalLinks.map((link, i) =>
              link.external ? (
                <Fragment key={link.href}>
                  {i > 0 && (
                    <span
                      className="text-[var(--foreground-muted)]/20 text-[8px] select-none"
                      aria-hidden="true"
                    >
                      ·
                    </span>
                  )}
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[8px] uppercase tracking-[0.22em] text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)] transition-colors"
                  >
                    {link.label}
                    <ArrowUpRight size={8} />
                  </a>
                </Fragment>
              ) : (
                <Fragment key={link.href}>
                  {i > 0 && (
                    <span
                      className="text-[var(--foreground-muted)]/20 text-[8px] select-none"
                      aria-hidden="true"
                    >
                      ·
                    </span>
                  )}
                  <LocalizedLink
                    href={link.href}
                    className="text-[8px] uppercase tracking-[0.22em] text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)] transition-colors"
                  >
                    {link.label}
                  </LocalizedLink>
                </Fragment>
              )
            )}
          </div>
        </div>

        {/* ── COPYRIGHT ─────────────────────────────── */}
        <div className="py-4 pb-16 lg:pb-12 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p
            className="text-[var(--foreground-muted)] text-[8px] uppercase tracking-[0.25em]"
            suppressHydrationWarning
          >
            © {new Date().getFullYear()} Portal Lusitano · {t.footer.rights}
          </p>
          <p className="text-[var(--foreground-muted)] text-[8px] tracking-wide">NIF 255669801</p>
        </div>
      </div>

      <style>{`
        @keyframes footer-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </footer>
  );
});
