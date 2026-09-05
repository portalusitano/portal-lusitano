"use client";

import { memo, useMemo, Fragment } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { eRotaDeEntrada } from "@/lib/rotas-de-entrada";
import { CONTACT_EMAIL, SOCIAL_LINKS } from "@/lib/constants";
import { abrirConsentimento } from "@/lib/consentimento";

/**
 * A linha legal, toda com a mesma caixa.
 *
 * As externas eram `flex`, as internas ficavam em linha e o botão era
 * `inline-block`: em telemóvel a regra de 44px do `globals.css` só pegava
 * nalgumas, e a linha, ao dobrar, saía aos degraus com cada entrada a uma
 * altura diferente. Uma caixa só para as três resolve a altura e o
 * alinhamento ao mesmo tempo.
 */
const LINHA_LEGAL =
  "rotulo inline-flex items-center transition-colors hover:text-[var(--foreground-secondary)]";

export default memo(function Footer() {
  const { t } = useLanguage();
  const pathname = usePathname();

  // Comprar
  const col1 = useMemo(
    () => [
      { name: t.footer.buy_horse, href: "/comprar" },
      { name: t.footer.favorite_horses, href: "/cavalos-favoritos" },
      { name: t.footer.search_alerts, href: "/minha-conta/alertas" },
    ],
    [t.footer.buy_horse, t.footer.favorite_horses, t.footer.search_alerts]
  );

  // Vender
  const col2 = useMemo(
    () => [
      { name: t.footer.sell_horse, href: "/vender-cavalo" },
      { name: t.footer.my_listings, href: "/minha-conta/anuncios" },
      { name: t.footer.my_messages, href: "/minha-conta/mensagens" },
    ],
    [t.footer.sell_horse, t.footer.my_listings, t.footer.my_messages]
  );

  // Descobrir
  const col3 = useMemo(
    () => [
      { name: t.footer.studs, href: "/directorio" },
      { name: t.footer.map, href: "/mapa" },
    ],
    [t.footer.studs, t.footer.map]
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

  // A última entrada não é uma página: reabre o pedido de consentimento.
  // Retirar o consentimento tem de ser tão fácil como tê-lo dado, e depois de
  // respondido o painel não volta sozinho — sem esta porta não havia volta.
  const legalLinks = useMemo(
    () => [
      {
        key: "reclamacoes",
        label: t.footer.complaints_book,
        href: "https://www.livroreclamacoes.pt",
        tipo: "externo" as const,
      },
      {
        key: "litigios",
        label: t.footer.dispute_resolution,
        href: "https://ec.europa.eu/consumers/odr",
        tipo: "externo" as const,
      },
      {
        key: "privacidade",
        label: t.footer.privacy,
        href: "/privacidade",
        tipo: "interno" as const,
      },
      { key: "termos", label: t.footer.terms, href: "/termos", tipo: "interno" as const },
      { key: "cookies", label: t.footer.cookie_settings, tipo: "accao" as const },
    ],
    [
      t.footer.complaints_book,
      t.footer.dispute_resolution,
      t.footer.privacy,
      t.footer.terms,
      t.footer.cookie_settings,
    ]
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
    { label: t.footer.portal, items: col4 },
  ];

  // Ver a nota no Navbar: nas páginas de entrada o ecrã é só o painel.
  if (eRotaDeEntrada(pathname)) return null;

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
                    {/* `inline-flex` e não `inline`: a regra de 44px que o
                        `globals.css` tem para telemóvel é um `min-height`, e
                        um `min-height` não faz nada a um elemento em linha.
                        Medidos: 16px de altura em 390px de largura — onze
                        alvos de toque abaixo do mínimo, e a regra do sistema
                        calada sem dar sinal. Com o elemento a ser caixa, é a
                        própria regra que passa a valer, sem número novo. */}
                    <LocalizedLink
                      href={item.href}
                      className="meta inline-flex items-center transition-colors duration-200 hover:text-[var(--foreground-strong)]"
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
            <p className="meta mt-0.5">{t.footer.sell_horse_subtitle}</p>
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
            {legalLinks.map((link, i) => (
              <Fragment key={link.key}>
                {i > 0 && (
                  <span
                    className="text-[var(--foreground-muted)]/20 text-[10px] select-none"
                    aria-hidden="true"
                  >
                    ·
                  </span>
                )}
                {link.tipo === "externo" ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={LINHA_LEGAL + " gap-1"}
                  >
                    {link.label}
                    <ArrowUpRight size={8} aria-hidden="true" />
                  </a>
                ) : link.tipo === "interno" ? (
                  <LocalizedLink href={link.href} className={LINHA_LEGAL}>
                    {link.label}
                  </LocalizedLink>
                ) : (
                  <button type="button" onClick={abrirConsentimento} className={LINHA_LEGAL}>
                    {link.label}
                  </button>
                )}
              </Fragment>
            ))}
          </div>
        </div>

        {/* ── COPYRIGHT ─────────────────────────────── */}
        <div className="flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
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
