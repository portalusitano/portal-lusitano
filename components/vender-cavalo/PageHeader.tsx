"use client";

import LocalizedLink from "@/components/LocalizedLink";
import { ArrowLeft, Clock, Globe, BadgeCheck } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function PageHeader() {
  const { t } = useLanguage();

  const trustItems = [
    { icon: Clock, label: t.vender_cavalo.trust_24h },
    { icon: Globe, label: t.vender_cavalo.trust_reach },
    { icon: BadgeCheck, label: t.vender_cavalo.trust_no_commission },
  ];

  return (
    <div className="max-w-3xl mx-auto mb-10">
      <LocalizedLink
        href="/comprar"
        className="inline-flex items-center gap-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground-strong)] transition-colors mb-8 touch-manipulation"
      >
        <ArrowLeft size={18} />
        <span className="text-sm">{t.vender_cavalo.back_marketplace}</span>
      </LocalizedLink>

      <div className="text-center">
        <span className="text-[var(--foreground-muted)] uppercase tracking-wider text-[11px] sm:text-[10px] font-bold block mb-3">
          {t.vender_cavalo.marketplace_title}
        </span>

        {/* Linha decorativa dourada */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="w-1.5 h-1.5 bg-[var(--foreground-muted)] rotate-45" />
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal mb-4">
          {t.vender_cavalo.page_title}
        </h1>
        <p className="text-[var(--foreground-secondary)] text-sm max-w-xl mx-auto mb-8">
          {t.vender_cavalo.page_desc}
        </p>

        {/* Trust indicators */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
          {trustItems.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 text-xs text-[var(--foreground-secondary)]"
            >
              <Icon size={13} className="text-[var(--foreground-muted)] shrink-0" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
