import { getServerLanguage } from "@/lib/get-server-language";

export default async function TermosPage() {
  const { t } = await getServerLanguage();

  return (
    <>
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-20 sm:pt-32 pb-20 px-4 sm:px-6 font-normal selection:bg-[var(--gold)] selection:text-black">
        <div className="max-w-4xl mx-auto">
          <span className="rotulo mb-6 block text-center">{t.terms.legal}</span>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-normal mb-4 text-center">
            {t.terms.title}
          </h1>
          <p className="text-center text-xs text-[var(--foreground-muted)] mb-16">
            {t.terms.last_updated}
          </p>

          <div className="space-y-12 text-[var(--foreground-secondary)] leading-relaxed text-sm">
            {/* 1. Âmbito */}
            <section data-revelar="" suppressHydrationWarning>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">{t.terms.scope}</h2>
              <p>{t.terms.scope_text}</p>
            </section>

            {/* 2. Serviços */}
            <section data-revelar="" suppressHydrationWarning>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.terms.services}
              </h2>
              <p className="mb-3">{t.terms.services_text}</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>{t.terms.services_list_1}</li>
                <li>{t.terms.services_list_2}</li>
                <li>{t.terms.services_list_3}</li>
                <li>{t.terms.services_list_4}</li>
                <li>{t.terms.services_list_5}</li>
                <li>{t.terms.services_list_6}</li>
              </ul>
            </section>

            {/* 3. Marketplace */}
            <section data-revelar="" suppressHydrationWarning>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.terms.marketplace}
              </h2>
              <p>{t.terms.marketplace_text}</p>
            </section>

            {/* 4. Obrigações do Vendedor */}
            <section data-revelar="" suppressHydrationWarning>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.terms.seller_obligations}
              </h2>
              <p>{t.terms.seller_obligations_text}</p>
            </section>

            {/* 5. Pagamentos */}
            <section data-revelar="" suppressHydrationWarning>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.terms.payments}
              </h2>
              <p>{t.terms.payments_text}</p>
            </section>

            {/* 6. Propriedade Intelectual */}
            <section data-revelar="" suppressHydrationWarning>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.terms.intellectual}
              </h2>
              <p>{t.terms.intellectual_text}</p>
            </section>

            {/* 7. Conteúdo do Utilizador */}
            <section data-revelar="" suppressHydrationWarning>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.terms.user_content}
              </h2>
              <p>{t.terms.user_content_text}</p>
            </section>

            {/* 8. Limitação de Responsabilidade */}
            <section data-revelar="" suppressHydrationWarning>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.terms.liability}
              </h2>
              <p>{t.terms.liability_text}</p>
            </section>

            {/* 9. Lei Aplicável */}
            <section data-revelar="" suppressHydrationWarning>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.terms.governing_law}
              </h2>
              <p>{t.terms.governing_law_text}</p>
            </section>

            {/* 10. Reclamações */}
            <section data-revelar="" suppressHydrationWarning>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.terms.complaints}
              </h2>
              <p>{t.terms.complaints_text}</p>
            </section>

            {/* 11. Alterações */}
            <section data-revelar="" suppressHydrationWarning>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.terms.changes}
              </h2>
              <p>{t.terms.changes_text}</p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
