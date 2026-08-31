import { HelpCircle } from "lucide-react";
import { getServerLanguage } from "@/lib/get-server-language";
import { faqData } from "@/data/faqData";
import { CONTACT_EMAIL } from "@/lib/constants";
import FAQAccordionList from "@/components/FAQAccordionList";

export default async function FAQPage() {
  const { language, tr } = await getServerLanguage();
  const faqs = faqData[language] ?? faqData.pt;

  return (
    <main className="min-h-screen bg-[var(--background)] pt-20 sm:pt-32 pb-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
          <div className="w-16 h-16 bg-[var(--elevate-1)] rounded-full flex items-center justify-center mx-auto mb-6">
            <HelpCircle className="text-[var(--foreground-muted)]" size={32} aria-hidden="true" />
          </div>
          <span className="rotulo block mb-4">{tr("Suporte", "Support", "Soporte")}</span>
          <h1 className="text-2xl sm:text-4xl md:text-5xl text-[var(--foreground)] mb-4">
            {tr("Perguntas Frequentes", "Frequently Asked Questions", "Preguntas Frecuentes")}
          </h1>
          <p className="text-[var(--foreground-secondary)] font-normal">
            {tr(
              "Encontre respostas as duvidas mais comuns",
              "Find answers to the most common questions",
              "Encuentre respuestas a las dudas más comunes"
            )}
          </p>
        </div>

        {/* FAQ List — client component for accordion interactivity */}
        <FAQAccordionList faqs={faqs} />

        {/* Contact CTA */}
        <div
          className="mt-16 text-center p-8 bg-[var(--surface-hover)] border border-[var(--border)] opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]"
          style={{ animationDelay: "0.2s" }}
        >
          <p className="text-[var(--foreground-secondary)] mb-4">
            {tr(
              "Nao encontrou o que procurava?",
              "Didn't find what you were looking for?",
              "¿No encontró lo que buscaba?"
            )}
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="btn btn-secundario rounded-full text-sm">
            {tr("Contacte-nos", "Contact us", "Contáctenos")} →
          </a>
        </div>
      </div>
    </main>
  );
}
