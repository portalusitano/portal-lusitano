"use client";

import { useLanguage } from "@/context/LanguageContext";

/**
 * Os dois atalhos de teclado que abrem a página a quem navega sem rato.
 *
 * Era um Server Component — mais barato, mas escrito só em português. Um
 * atalho de acessibilidade que ninguém percebe não é um atalho, e a língua
 * do site só se sabe no cliente (o `layout` é estático de propósito: ler o
 * cookie no servidor tornava dinâmica a página inteira). Duas ligações
 * escondidas custam menos ao pacote do que isso custaria ao servidor.
 */
export default function SkipLinks() {
  const { t } = useLanguage();

  return (
    <div className="skip-links">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[10001] focus:bg-[var(--foreground-strong)] focus:text-black focus:px-6 focus:py-3 focus:text-sm focus:font-bold focus:uppercase focus:tracking-wider"
      >
        {t.nav.skip_to_content}
      </a>
      <a
        href="#main-navigation"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-[280px] focus:z-[10001] focus:bg-[var(--foreground-strong)] focus:text-black focus:px-6 focus:py-3 focus:text-sm focus:font-bold focus:uppercase focus:tracking-wider"
      >
        {t.nav.skip_to_navigation}
      </a>
    </div>
  );
}
