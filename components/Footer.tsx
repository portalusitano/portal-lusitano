"use client";

import { memo, useMemo, Fragment } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { ArrowUpRight, ArrowRight } from "lucide-react";
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
      { name: t.footer.contact, href: "/contacto" },
      { name: t.footer.returns, href: "/devolucoes" },
    ],
    [t.nav.home, t.footer.contact, t.footer.returns]
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

  const socials = [
    { href: SOCIAL_LINKS.instagram, label: "Instagram" },
    { href: SOCIAL_LINKS.tiktok, label: "TikTok" },
    { href: `mailto:${CONTACT_EMAIL}`, label: "Email" },
  ];

  const cols = [
    { label: t.footer.navigation, items: col1 },
    { label: t.footer.lusitano, items: col2 },
    { label: t.footer.tools, items: col3 },
    { label: "Portal", items: col4 },
  ];

  return (
    <footer className="bg-[var(--background)] relative overflow-hidden">
      {/* Costura com a secção de cima. Uma hairline, e mais nada: o bloco de
          marca que aqui estava — ornamentos de canto, grão, losangos e o
          letreiro a correr — era do desenho anterior e repetia a marca que a
          barra de navegação já mostra em cada página. */}
      <div className="h-px w-full bg-[var(--border-soft)]" aria-hidden="true" />

      {/* ── MAIN CONTAINER ────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* ── 4-COLUMN NAV ──────────────────────────── */}
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 py-8 sm:py-10"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          {cols.map((col) => (
            <nav key={col.label} aria-label={col.label}>
              <h3 className="rotulo mb-3">{col.label}</h3>
              <ul className="space-y-1.5">
                {col.items.map((item) => (
                  <li key={item.href}>
                    <LocalizedLink
                      href={item.href}
                      className="meta transition-colors duration-200 hover:text-[var(--foreground-strong)]"
                    >
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
          <div className="min-w-0">
            <p className="text-sm text-[var(--foreground-strong)]">{t.footer.sell_horse}</p>
            <p className="meta mt-0.5">
              Publique o seu Lusitano e chegue a compradores em todo o país
            </p>
          </div>
          <ArrowRight
            size={16}
            aria-hidden="true"
            className="flex-shrink-0 text-[var(--foreground-muted)] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[var(--foreground-strong)]"
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
                      className="text-[var(--foreground-muted)]/20 text-[10px] select-none"
                      aria-hidden="true"
                    >
                      ·
                    </span>
                  )}
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rotulo hover:text-[var(--foreground-secondary)] transition-colors"
                  >
                    {link.label}
                    <ArrowUpRight size={8} />
                  </a>
                </Fragment>
              ) : (
                <Fragment key={link.href}>
                  {i > 0 && (
                    <span
                      className="text-[var(--foreground-muted)]/20 text-[10px] select-none"
                      aria-hidden="true"
                    >
                      ·
                    </span>
                  )}
                  <LocalizedLink
                    href={link.href}
                    className="rotulo hover:text-[var(--foreground-secondary)] transition-colors"
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
          <p className="rotulo" suppressHydrationWarning>
            © {new Date().getFullYear()} Portal Lusitano · {t.footer.rights}
          </p>

          {/* As redes em palavra, não em quadrado. Três ícones de marca lado a
              lado traziam três cores que o sistema não tem. */}
          <div className="flex items-center gap-5">
            {socials.map((rede) => (
              <a
                key={rede.label}
                href={rede.href}
                target={rede.href.startsWith("http") ? "_blank" : undefined}
                rel={rede.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="meta inline-flex items-center gap-1 transition-colors hover:text-[var(--foreground-strong)]"
              >
                {rede.label}
                <ArrowUpRight size={12} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
});
