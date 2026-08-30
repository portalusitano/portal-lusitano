import { Mail, MapPin, Clock, FileText, ExternalLink } from "lucide-react";
import CopyEmailButton from "@/components/CopyEmailButton";

export default function ContactoPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-20 sm:pt-32 pb-20 px-4 sm:px-6 selection:bg-[var(--gold)] selection:text-black">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-[var(--gold)] rotulo font-bold block mb-6">Fale Connosco</span>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-normal mb-4">Contacto</h1>
          <p className="text-[var(--foreground-secondary)] text-sm font-normal max-w-md mx-auto">
            Estamos disponíveis para responder a questões sobre anúncios, subscrições, parcerias ou
            qualquer outro assunto.
          </p>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 gap-4 mb-16">
          {/* Email */}
          <div className="border border-[var(--border)] p-6 space-y-3 hover:border-[var(--gold)]/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border border-[var(--gold)]/30 flex items-center justify-center flex-shrink-0">
                <Mail size={15} className="text-[var(--gold)]" />
              </div>
              <span className="rotulo-forte font-medium">Email</span>
            </div>
            <p className="text-[var(--foreground)] text-sm font-normal break-all">
              portal.lusitano2023@gmail.com
            </p>
            <CopyEmailButton />
          </div>

          {/* Morada */}
          <div className="border border-[var(--border)] p-6 space-y-3 hover:border-[var(--gold)]/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border border-[var(--gold)]/30 flex items-center justify-center flex-shrink-0">
                <MapPin size={15} className="text-[var(--gold)]" />
              </div>
              <span className="rotulo-forte font-medium">Sede</span>
            </div>
            <p className="text-[var(--foreground)] text-sm font-normal leading-relaxed">
              Rua Dom Teotónio de Bragança, 33, 1.º
              <br />
              7005-454 Évora
              <br />
              Portugal
            </p>
          </div>

          {/* Tempo de resposta */}
          <div className="border border-[var(--border)] p-6 space-y-3 hover:border-[var(--gold)]/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border border-[var(--gold)]/30 flex items-center justify-center flex-shrink-0">
                <Clock size={15} className="text-[var(--gold)]" />
              </div>
              <span className="rotulo-forte font-medium">Tempo de Resposta</span>
            </div>
            <p className="text-[var(--foreground)] text-sm font-normal">
              Respondemos em regra dentro de <strong>48 horas úteis</strong>.
            </p>
            <p className="text-[var(--foreground-muted)] text-xs">
              Segunda a Sexta · 9h–18h (hora de Lisboa)
            </p>
          </div>

          {/* Identificação fiscal */}
          <div className="border border-[var(--border)] p-6 space-y-3 hover:border-[var(--gold)]/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border border-[var(--gold)]/30 flex items-center justify-center flex-shrink-0">
                <FileText size={15} className="text-[var(--gold)]" />
              </div>
              <span className="rotulo-forte font-medium">Identificação Legal</span>
            </div>
            <p className="text-[var(--foreground)] text-sm font-normal leading-relaxed">
              Francisco Maria Carrelhas das Neves
              <br />
              da Palma Gaspar
              <br />
              <span className="text-[var(--foreground-muted)]">NIF 255669801 · ENI</span>
            </p>
          </div>
        </div>

        {/* Assuntos frequentes */}
        <div className="border-t border-[var(--border)] pt-10 mb-12">
          <h2 className="text-[var(--gold)] rotulo font-medium mb-6">Assuntos Frequentes</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {[
              {
                assunto: "Anúncio de venda de cavalo",
                detalhe: "Dúvidas sobre planos ou publicação",
              },
              {
                assunto: "Subscrição Profissional",
                detalhe: "Registo, plano, faturação ou cancelamento",
              },
              {
                assunto: "Loja — Devolução",
                detalhe: "Produto recebido com defeito ou pedido de devolução",
              },
              {
                assunto: "Parceria / Publicidade",
                detalhe: "Coudelarias, marcas ou media equestre",
              },
              {
                assunto: "Dados Pessoais (RGPD)",
                detalhe: "Exercício de direitos ao abrigo do RGPD",
              },
              { assunto: "Erro técnico", detalhe: "Problema no site ou numa funcionalidade" },
            ].map((item) => (
              <a
                key={item.assunto}
                href={`mailto:portal.lusitano2023@gmail.com?subject=${encodeURIComponent(item.assunto)}`}
                className="border border-[var(--border)] p-4 hover:border-[var(--gold)]/40 hover:bg-[var(--gold)]/[0.03] transition-colors group"
              >
                <p className="text-[var(--foreground)] text-xs font-medium group-hover:text-[var(--gold)] transition-colors mb-1">
                  {item.assunto}
                </p>
                <p className="text-[var(--foreground-muted)] text-[11px]">{item.detalhe}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Links legais */}
        <div className="border-t border-[var(--border)] pt-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <p className="text-xs text-[var(--foreground-muted)] font-normal">
            Reclamações formais podem ser submetidas via:
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="https://www.livroreclamacoes.pt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rotulo-forte hover:underline underline-offset-4 transition-all"
            >
              Livro de Reclamações
              <ExternalLink size={10} />
            </a>
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rotulo hover:text-[var(--gold)] hover:underline underline-offset-4 transition-all"
            >
              Resolução de Litígios UE
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
