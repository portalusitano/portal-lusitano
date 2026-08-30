import { getServerLanguage } from "@/lib/get-server-language";

export default async function PrivacidadePage() {
  const { t } = await getServerLanguage();

  return (
    <>
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-20 sm:pt-32 pb-20 px-4 sm:px-6 font-normal selection:bg-[var(--gold)] selection:text-black">
        <div className="max-w-4xl mx-auto">
          <span className="text-[var(--gold)] text-[10px] sm:rotulo font-bold block mb-6 text-center">
            {t.privacy.security}
          </span>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-normal mb-4 text-center">
            {t.privacy.title}
          </h1>
          <p className="text-center text-xs text-[var(--foreground-muted)] mb-16">
            {t.privacy.last_updated}
          </p>

          <div className="space-y-12 text-[var(--foreground-secondary)] leading-relaxed text-sm">
            {/* Introdução */}
            <section>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.privacy.intro}
              </h2>
              <p>{t.privacy.intro_text}</p>
            </section>

            {/* Responsável */}
            <section>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.privacy.controller}
              </h2>
              <p>{t.privacy.controller_text}</p>
            </section>

            {/* Dados Recolhidos */}
            <section>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.privacy.data_collected}
              </h2>
              <p className="mb-3">{t.privacy.data_collected_text}</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>{t.privacy.data_collected_list_1}</li>
                <li>{t.privacy.data_collected_list_2}</li>
                <li>{t.privacy.data_collected_list_3}</li>
                <li>{t.privacy.data_collected_list_4}</li>
                <li>{t.privacy.data_collected_list_5}</li>
                <li>{t.privacy.data_collected_list_6}</li>
              </ul>
            </section>

            {/* Finalidade */}
            <section>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.privacy.purposes}
              </h2>
              <p className="mb-3">{t.privacy.purposes_text}</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>{t.privacy.purposes_list_1}</li>
                <li>{t.privacy.purposes_list_2}</li>
                <li>{t.privacy.purposes_list_3}</li>
                <li>{t.privacy.purposes_list_4}</li>
                <li>{t.privacy.purposes_list_5}</li>
                <li>{t.privacy.purposes_list_6}</li>
              </ul>
            </section>

            {/* Base Legal */}
            <section>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.privacy.legal_basis}
              </h2>
              <p className="mb-3">{t.privacy.legal_basis_text}</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>{t.privacy.legal_basis_list_1}</li>
                <li>{t.privacy.legal_basis_list_2}</li>
                <li>{t.privacy.legal_basis_list_3}</li>
                <li>{t.privacy.legal_basis_list_4}</li>
              </ul>
            </section>

            {/* Prazo de Conservação */}
            <section>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.privacy.retention}
              </h2>
              <p className="mb-3">{t.privacy.retention_text}</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>{t.privacy.retention_list_1}</li>
                <li>{t.privacy.retention_list_2}</li>
                <li>{t.privacy.retention_list_3}</li>
                <li>{t.privacy.retention_list_4}</li>
              </ul>
            </section>

            {/* Direitos */}
            <section>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.privacy.rights}
              </h2>
              <p className="mb-3">{t.privacy.rights_text}</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>{t.privacy.rights_list_1}</li>
                <li>{t.privacy.rights_list_2}</li>
                <li>{t.privacy.rights_list_3}</li>
                <li>{t.privacy.rights_list_4}</li>
                <li>{t.privacy.rights_list_5}</li>
                <li>{t.privacy.rights_list_6}</li>
              </ul>
              <p className="mt-3">{t.privacy.rights_exercise}</p>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.privacy.cookies_title}
              </h2>
              <p className="mb-3">{t.privacy.cookies_text}</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>{t.privacy.cookies_essential}</li>
                <li>{t.privacy.cookies_analytics}</li>
                <li>{t.privacy.cookies_marketing}</li>
              </ul>
              <p className="mt-3">{t.privacy.cookies_manage}</p>
            </section>

            {/* Terceiros */}
            <section>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.privacy.third_parties}
              </h2>
              <p className="mb-3">{t.privacy.third_parties_text}</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>{t.privacy.third_parties_list_1}</li>
                <li>{t.privacy.third_parties_list_2}</li>
                <li>{t.privacy.third_parties_list_3}</li>
                <li>{t.privacy.third_parties_list_4}</li>
                <li>{t.privacy.third_parties_list_5}</li>
              </ul>
            </section>

            {/* Segurança */}
            <section>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.privacy.security}
              </h2>
              <p>{t.privacy.security_text}</p>
            </section>

            {/* Reclamação */}
            <section>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.privacy.complaint}
              </h2>
              <p className="mb-3">{t.privacy.complaint_text}</p>
              <p className="text-xs text-[var(--foreground-muted)] bg-[var(--background-secondary)] p-4 rounded-lg">
                {t.privacy.complaint_cnpd}
              </p>
            </section>

            {/* Alterações */}
            <section>
              <h2 className="text-[var(--foreground)] font-normal text-xl mb-4">
                {t.privacy.changes}
              </h2>
              <p>{t.privacy.changes_text}</p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
