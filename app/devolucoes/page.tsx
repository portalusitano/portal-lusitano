import LocalizedLink from "@/components/LocalizedLink";

export default function DevolucoesPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-20 sm:pt-32 pb-20 px-4 sm:px-6 font-normal selection:bg-[var(--gold)] selection:text-black">
      <div data-revelar="" suppressHydrationWarning className="max-w-4xl mx-auto">
        <span className="rotulo mb-6 block text-center">Direitos do Consumidor</span>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-normal mb-4 text-center">
          Devoluções &amp; Direito de Arrependimento
        </h1>
        <p className="text-center text-xs text-[var(--foreground-muted)] mb-16">
          Última atualização: 7 de março de 2026
        </p>

        <div className="space-y-12 text-[var(--foreground-secondary)] leading-relaxed text-sm">
          {/* 1 */}
          <section>
            <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
              1. Direito de Arrependimento — Loja Online
            </h2>
            <p className="mb-3">
              Nos termos do Decreto-Lei n.º 24/2014, de 14 de fevereiro (transpõe a Diretiva
              2011/83/UE relativa aos direitos dos consumidores), tem direito a rescindir o contrato
              de compra de produtos físicos adquiridos na Loja Portal Lusitano, sem necessidade de
              indicar qualquer motivo, no prazo de{" "}
              <strong className="text-[var(--foreground)]">14 dias corridos</strong> a contar do dia
              em que recebe o produto.
            </p>
            <p>
              Para exercer este direito, notifique-nos antes do prazo através de um dos meios
              indicados na secção «Como Exercer o Direito» abaixo.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
              2. Como Exercer o Direito de Arrependimento
            </h2>
            <p className="mb-3">
              Para exercer o direito de arrependimento, envie uma comunicação inequívoca por um dos
              seguintes meios antes do prazo de 14 dias:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mb-3">
              <li>
                <strong className="text-[var(--foreground)]">Email:</strong>{" "}
                <a
                  href="mailto:portal.lusitano2023@gmail.com"
                  className="text-[var(--foreground-strong)] underline decoration-[var(--border)] underline-offset-4 transition-colors hover:decoration-[var(--border-hover)]"
                >
                  portal.lusitano2023@gmail.com
                </a>
              </li>
              <li>
                <strong className="text-[var(--foreground)]">Carta:</strong> Francisco Maria
                Carrelhas das Neves da Palma Gaspar — Portal Lusitano, Rua Dom Teotónio de Bragança,
                33, 1.º, 7005-454 Évora, Portugal
              </li>
            </ul>
            <p>
              A sua comunicação deve incluir: nome completo, referência ou descrição do produto,
              data de encomenda e data de receção. Utilizamos também o formulário normalizado de
              rescisão previsto no Anexo B do DL 24/2014 — pode solicitá-lo por email.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
              3. Devolução do Produto
            </h2>
            <p className="mb-3">
              Após comunicar a rescisão, deve enviar o produto sem demora injustificada e, em todo o
              caso, no prazo máximo de{" "}
              <strong className="text-[var(--foreground)]">14 dias corridos</strong> a contar da
              data em que comunicou a rescisão.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                O produto deve ser devolvido no estado original, sem sinais de uso além do
                necessário para verificar a natureza, características e funcionamento.
              </li>
              <li>
                Os custos de devolução são suportados pelo consumidor, salvo indicação expressa em
                contrário no momento da compra.
              </li>
              <li>
                Endereço de devolução: Rua Dom Teotónio de Bragança, 33, 1.º, 7005-454 Évora,
                Portugal.
              </li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">4. Reembolso</h2>
            <p>
              Após receção e verificação do produto devolvido, procederemos ao reembolso total do
              montante pago (incluindo custos de envio iniciais standard), no prazo máximo de{" "}
              <strong className="text-[var(--foreground)]">14 dias corridos</strong> após a receção
              da devolução, através do mesmo meio de pagamento utilizado na compra original, salvo
              acordo expresso em contrário.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
              5. Exclusões do Direito de Arrependimento
            </h2>
            <p className="mb-3">
              Nos termos do artigo 17.º do DL 24/2014, o direito de arrependimento{" "}
              <strong className="text-[var(--foreground)]">não se aplica</strong> a:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                Serviços já totalmente prestados com o consentimento prévio do consumidor (ex:
                publicação de anúncios de venda de cavalos após ativação).
              </li>
              <li>
                Subscrições de serviços digitais (ex: listagens de profissionais) após início da
                prestação com consentimento expresso.
              </li>
              <li>
                Conteúdos digitais fornecidos em suporte não material (ex: ebook), após início do
                descarregamento com consentimento expresso.
              </li>
              <li>
                Animais vivos — as transações de cavalos são realizadas diretamente entre vendedor e
                comprador, sendo o Portal Lusitano mero intermediário.
              </li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
              6. Garantia Legal de Conformidade
            </h2>
            <p>
              Os produtos vendidos na Loja Portal Lusitano beneficiam da garantia legal de
              conformidade prevista no Decreto-Lei n.º 84/2021, de 18 de outubro — transposição da
              Diretiva (UE) 2019/771. Em caso de desconformidade, tem direito a reparação,
              substituição, redução do preço ou resolução do contrato, durante{" "}
              <strong className="text-[var(--foreground)]">dois anos</strong> a contar da entrega do
              bem.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">7. Reclamações</h2>
            <p className="mb-3">
              Em caso de reclamação, pode contactar-nos pelo email{" "}
              <a
                href="mailto:portal.lusitano2023@gmail.com"
                className="text-[var(--foreground-strong)] underline decoration-[var(--border)] underline-offset-4 transition-colors hover:decoration-[var(--border-hover)]"
              >
                portal.lusitano2023@gmail.com
              </a>{" "}
              ou através do Livro de Reclamações Eletrónico:
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://www.livroreclamacoes.pt"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-[var(--border-soft)] px-4 py-2.5 rotulo-forte hover:bg-[var(--elevate-1)] transition-colors"
              >
                Livro de Reclamações
              </a>
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-[var(--border)] px-4 py-2.5 rotulo hover:border-[var(--border-hover)] hover:text-[var(--foreground-strong)] transition-colors"
              >
                Resolução de Litígios UE (ODR)
              </a>
            </div>
          </section>

          {/* contact CTA */}
          <div className="border-t border-[var(--border)] pt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs text-[var(--foreground-muted)]">
              Dúvidas? Estamos disponíveis para ajudar.
            </p>
            <LocalizedLink
              href="/contacto"
              className="rotulo-forte hover:underline underline-offset-4 transition-all"
            >
              Contactar →
            </LocalizedLink>
          </div>
        </div>
      </div>
    </main>
  );
}
