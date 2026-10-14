"use client";

import { useMemo } from "react";
import { ClipboardList, ShieldCheck, PhoneCall } from "lucide-react";
import { TOTAL_STEPS } from "@/components/vender-cavalo/data";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";

/**
 * As três coisas que acontecem depois de carregar em publicar.
 *
 * **Duas frases saíram daqui, e as duas pela razão que já tinha tirado o
 * sobretítulo e as três promessas do `PageHeader`: uma promessa que ninguém
 * verifica lê-se, antes de pagar 49 €, como parte do negócio.**
 *
 * 1. «em 6 passos simples» — e os passos são quatro. Não era uma figura de
 *    estilo: era um número, escrito nas três línguas, ao lado de um indicador
 *    que conta até quatro. A frase deixou de ter o número lá dentro e passou a
 *    lê-lo do `TOTAL_STEPS`, que é a mesma constante que desenha os passos —
 *    assim não há segunda contagem para divergir da primeira, que é a regra
 *    que já vale para o «faltam 7 campos» e para o «14 de 30 respostas».
 * 2. «publica o anúncio em até 24 horas» — um prazo de serviço que nada no
 *    produto mede nem garante. O que o produto **faz** é verificar os
 *    documentos e mandar um email quando o anúncio fica publicado, e é isso
 *    que aqui está agora. Perdeu-se um número; ganhou-se uma frase que se
 *    pode ir confirmar ao código.
 *
 * Ficou o que se cumpre, e ganhou-se o que faltava dizer: que se pode parar a
 * meio. É a informação mais útil que se pode dar a quem está prestes a
 * começar um formulário de vinte minutos, e é nova — o formulário guardava o
 * rascunho desde sempre e nunca o disse a ninguém antes de o restaurar.
 */
export default function HowItWorks() {
  const { t, language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  const steps = [
    {
      number: "01",
      icon: ClipboardList,
      title: t.vender_cavalo.hiw_step1_title,
      desc: tr(
        `Os dados do teu cavalo e a documentação, em ${TOTAL_STEPS} passos. Podes parar a meio: o que escreveres fica guardado neste browser.`,
        `Your horse's details and paperwork, in ${TOTAL_STEPS} steps. You can stop halfway: what you write is kept in this browser.`,
        `Los datos de tu caballo y la documentación, en ${TOTAL_STEPS} pasos. Puedes parar a medias: lo que escribas queda guardado en este navegador.`
      ),
    },
    {
      number: "02",
      icon: ShieldCheck,
      title: t.vender_cavalo.hiw_step2_title,
      desc: tr(
        "Verificamos a documentação APSL e recebes um email assim que o anúncio for publicado.",
        "We check the APSL paperwork and you get an email as soon as the listing goes live.",
        "Verificamos la documentación APSL y recibes un email en cuanto el anuncio se publique."
      ),
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
