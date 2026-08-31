"use client";

import { ClipboardList, ShieldCheck, PhoneCall } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function HowItWorks() {
  const { t } = useLanguage();

  const steps = [
    {
      number: "01",
      icon: ClipboardList,
      title: t.vender_cavalo.hiw_step1_title,
      desc: t.vender_cavalo.hiw_step1_desc,
    },
    {
      number: "02",
      icon: ShieldCheck,
      title: t.vender_cavalo.hiw_step2_title,
      desc: t.vender_cavalo.hiw_step2_desc,
    },
    {
      number: "03",
      icon: PhoneCall,
      title: t.vender_cavalo.hiw_step3_title,
      desc: t.vender_cavalo.hiw_step3_desc,
    },
  ];

  return (
    <div className="max-w-3xl mx-auto mb-10">
      <p className="text-center rotulo mb-6">{t.vender_cavalo.hiw_label}</p>
      {/* Cartão assinatura: costura de luz no topo e laterais dissolvidas no
          fundo, para os passos emergirem do preto em vez de estarem colados. */}
      <div className="grid gap-6 sm:grid-cols-3">
        {steps.map(({ number, icon: Icon, title, desc }) => (
          <article key={number} className="cartao-seco h-full">
            <div className="cartao-seco__costura" />
            <div className="cartao-seco__esbatido" />
            <div className="relative z-10 p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[var(--foreground-muted)] text-2xl leading-none select-none">
                  {number}
                </span>
                <div className="w-7 h-7 border border-[var(--border-soft)] flex items-center justify-center">
                  <Icon size={13} className="text-[var(--foreground-muted)]" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)] mb-1">{title}</p>
                <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">{desc}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
