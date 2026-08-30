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
      <div className="grid sm:grid-cols-3 gap-px bg-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden">
        {steps.map(({ number, icon: Icon, title, desc }) => (
          <div key={number} className="bg-[var(--background-secondary)]/60 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[var(--gold)]/40 text-2xl leading-none select-none">
                {number}
              </span>
              <div className="w-7 h-7 border border-[var(--gold)]/30 flex items-center justify-center">
                <Icon size={13} className="text-[var(--gold)]" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)] mb-1">{title}</p>
              <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
