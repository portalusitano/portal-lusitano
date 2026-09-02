"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import LocalizedLink from "@/components/LocalizedLink";
import { CheckCircle, ArrowRight, Mail, Clock, Eye } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { limparRascunho } from "@/components/vender-cavalo/rascunho";

/**
 * O anúncio foi pago.
 *
 * Duas coisas mudaram aqui, e as duas são sobre quem manda na página.
 *
 * 1. **É aqui que o rascunho se apaga, e não antes.** Estava a ser apagado no
 *    instante anterior ao salto para o Stripe. Quem desistisse no Stripe — ou
 *    a quem o cartão fosse recusado — voltava pelo `cancel_url` a um
 *    formulário vazio, com quatro passos de trabalho perdidos e o pagamento
 *    por fazer. Só nesta página é que se sabe que o anúncio existe.
 * 2. **Deixou de haver reencaminhamento automático.** Havia uma contagem de
 *    cinco segundos que levava a pessoa para `/comprar` — para longe do
 *    identificador da transacção que acabara de pagar e das três coisas que
 *    lhe explicam o que se segue. Sair da página é uma decisão de quem paga;
 *    os dois botões estão aqui em baixo.
 */
export default function VenderCavaloSucessoContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { t } = useLanguage();

  useEffect(() => {
    limparRascunho();
  }, []);

  const passos = [
    {
      icone: Mail,
      titulo: t.success_pages.confirmation_email,
      texto: t.success_pages.confirmation_email_desc,
    },
    {
      icone: Clock,
      titulo: t.success_pages.approval_24h,
      texto: t.success_pages.approval_24h_desc,
    },
    {
      icone: Eye,
      titulo: t.success_pages.validity_30_days,
      texto: t.success_pages.validity_30_days_desc,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-20 sm:pt-24 md:pt-32 pb-32 px-4 sm:px-6 md:px-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--elevate-1)] border border-[var(--border-soft)] mb-6">
            <CheckCircle className="w-10 h-10 text-[var(--ok)]" />
          </div>
          <h1 className="titulo-pagina mb-4">{t.success_pages.payment_confirmed}</h1>
          <p className="text-[var(--foreground-secondary)]">
            {t.success_pages.confirmation_email_desc}
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {passos.map(({ icone: Icone, titulo, texto }) => (
            <div key={titulo} className="bg-[var(--background-secondary)] cartao p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--elevate-1)] flex items-center justify-center">
                  <Icone className="w-5 h-5 text-[var(--foreground-muted)]" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h2 className="titulo-seccao mb-2">{titulo}</h2>
                  <p className="text-sm text-[var(--foreground-secondary)]">{texto}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {sessionId && (
          <div className="bg-[var(--background-secondary)]/50 cartao p-4 mb-8">
            <p className="rotulo mb-1">{t.success_pages.transaction_id}</p>
            <p className="text-xs text-[var(--foreground-secondary)] font-mono break-all">
              {sessionId}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <LocalizedLink href="/comprar" className="btn btn-primario w-full gap-2 rounded-full">
            <span>{t.success_pages.view_marketplace}</span>
            <ArrowRight size={18} aria-hidden="true" />
          </LocalizedLink>

          <LocalizedLink href="/" className="btn btn-secundario w-full rounded-full">
            <span>{t.success_pages.back_home}</span>
          </LocalizedLink>
        </div>
      </div>
    </div>
  );
}
