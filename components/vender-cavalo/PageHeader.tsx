"use client";

import LocalizedLink from "@/components/LocalizedLink";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function PageHeader() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto mb-10 max-w-3xl">
      <LocalizedLink
        href="/comprar"
        className="mb-8 inline-flex touch-manipulation items-center gap-2 text-[var(--foreground-secondary)] transition-colors hover:text-[var(--foreground-strong)]"
      >
        <ArrowLeft size={18} />
        <span className="text-sm">{t.vender_cavalo.back_marketplace}</span>
      </LocalizedLink>

      {/* Saíram daqui o sobretítulo «Lusitano Marketplace» com o losango e a
          linha de três promessas (publicado em 24h, alcance nacional e
          internacional, sem comissão de venda).

          O sobretítulo dizia o nome do sítio a quem já lá está, e o losango
          era ornamento a separar duas linhas de texto que não precisavam de
          separador. A página abre agora no título, que é onde estava a
          informação.

          As três promessas eram compromissos de serviço afirmados acima do
          formulário — e nada no produto os garante nem os mede. Uma promessa
          que ninguém verifica é do mesmo tipo dos números inventados que já
          se tiraram do directório, e quem a lê antes de pagar 49 € lê-a como
          parte do negócio. */}
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-normal sm:text-3xl md:text-4xl">
          {t.vender_cavalo.page_title}
        </h1>
        <p className="mx-auto max-w-xl text-sm text-[var(--foreground-secondary)]">
          {t.vender_cavalo.page_desc}
        </p>
      </div>
    </div>
  );
}
