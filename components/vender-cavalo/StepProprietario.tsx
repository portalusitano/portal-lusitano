"use client";

import { useMemo } from "react";
import type { StepProps } from "@/components/vender-cavalo/types";
import { tiposProprietario, paisesOpcoes } from "@/components/vender-cavalo/data";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";
import Seleccao from "@/components/ui/Seleccao";
import Detalhes from "@/components/vender-cavalo/Detalhes";
import { ErroDoCampo, classeCampo } from "@/components/vender-cavalo/campos-com-erro";
import { ApontamentoDoCampo, ligarCampo } from "@/components/vender-cavalo/apontamentos";

/**
 * Quem vende.
 *
 * Três campos à vista, e são os três que servem para alguém ser contactado: o
 * nome, o email e o telefone. O resto — tipo de vendedor, país, NIF, morada,
 * WhatsApp, website — está aqui na mesma, mas fechado. Nenhum deles era
 * verificado, dois deles tinham um asterisco que não correspondia a regra
 * nenhuma, e a facturação faz-se depois de o anúncio existir, não antes.
 */
export default function StepProprietario(props: StepProps) {
  const { formData, updateField, erros, apontamentos, campo } = props;
  const { t, language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  const eCoudelaria =
    formData.tipo_proprietario === "Coudelaria" ||
    formData.tipo_proprietario === "Clube / Escola de Equitação";

  return (
    <div className="bg-[var(--background-secondary)]/50 cartao p-6">
      <h2 className="text-xl mb-6">{t.vender_cavalo.step_owner_title}</h2>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="proprietario_nome"
            className="block text-sm text-[var(--foreground-secondary)] mb-1"
          >
            {t.vender_cavalo.full_name} *
          </label>
          <input
            id="proprietario_nome"
            type="text"
            autoComplete="name"
            value={formData.proprietario_nome}
            onChange={(e) => updateField("proprietario_nome", e.target.value)}
            className={classeCampo(erros, "proprietario_nome")}
            placeholder={t.vender_cavalo.placeholder_full_name}
            {...ligarCampo("proprietario_nome", formData.proprietario_nome, props)}
          />
          <ErroDoCampo erros={erros} campo="proprietario_nome" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="proprietario_email"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {t.vender_cavalo.email} *
            </label>
            <input
              id="proprietario_email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={formData.proprietario_email}
              onChange={(e) => updateField("proprietario_email", e.target.value)}
              className={classeCampo(erros, "proprietario_email")}
              placeholder={t.vender_cavalo.placeholder_email}
              {...ligarCampo("proprietario_email", formData.proprietario_email, props)}
            />
            <ErroDoCampo erros={erros} campo="proprietario_email" />
            <ApontamentoDoCampo
              apontamentos={apontamentos}
              campo="proprietario_email"
              aoAceitar={campo.aoAceitar}
            />
          </div>
          <div>
            <label
              htmlFor="proprietario_telefone"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {t.vender_cavalo.phone} *
            </label>
            <input
              id="proprietario_telefone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={formData.proprietario_telefone}
              onChange={(e) => updateField("proprietario_telefone", e.target.value)}
              className={classeCampo(erros, "proprietario_telefone")}
              placeholder={t.vender_cavalo.placeholder_phone}
              {...ligarCampo("proprietario_telefone", formData.proprietario_telefone, props)}
            />
            <ErroDoCampo erros={erros} campo="proprietario_telefone" />
            <ApontamentoDoCampo apontamentos={apontamentos} campo="proprietario_telefone" />
          </div>
        </div>

        <Detalhes
          titulo={tr(
            "Facturação e contacto adicional",
            "Billing and extra contact",
            "Facturación y contacto adicional"
          )}
          campos={eCoudelaria ? 6 : 5}
          nota={tr(
            "Opcional. Pode ficar para depois de o anúncio estar no ar.",
            "Optional. Can wait until the listing is live.",
            "Opcional. Puede esperar a que el anuncio esté publicado."
          )}
        >
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="tipo_proprietario"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {tr("Tipo de Vendedor", "Seller Type", "Tipo de Vendedor")}
                </label>
                <Seleccao
                  id="tipo_proprietario"
                  value={formData.tipo_proprietario}
                  onChange={(e) => {
                    updateField("tipo_proprietario", e.target.value);
                    // O tipo de vendedor decide se o NIF devia ser de empresa
                    // ou de pessoa: mudá-lo é mudar a resposta sobre o NIF.
                    campo.aoEscolher("proprietario_nif");
                  }}
                  className="campo"
                >
                  <option value="">{t.vender_cavalo.select}</option>
                  {(tiposProprietario[language] || tiposProprietario.pt).map((tp) => (
                    <option key={tp} value={tp}>
                      {tp}
                    </option>
                  ))}
                </Seleccao>
              </div>
              <div>
                <label
                  htmlFor="pais_proprietario"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {tr("País de Residência", "Country of Residence", "País de Residencia")}
                </label>
                <Seleccao
                  id="pais_proprietario"
                  value={formData.pais_proprietario}
                  onChange={(e) => {
                    updateField("pais_proprietario", e.target.value);
                    // O país decide qual é a regra do telefone: a portuguesa
                    // ou o mínimo internacional. Mudá-lo reavalia os dois.
                    campo.aoEscolher("proprietario_telefone");
                    campo.aoEscolher("proprietario_whatsapp");
                  }}
                  className="campo"
                >
                  <option value="">{t.vender_cavalo.select}</option>
                  {paisesOpcoes.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Seleccao>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="proprietario_nif"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {t.vender_cavalo.nif}
                </label>
                <input
                  id="proprietario_nif"
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  value={formData.proprietario_nif}
                  onChange={(e) => updateField("proprietario_nif", e.target.value)}
                  className={classeCampo(erros, "proprietario_nif")}
                  placeholder={t.vender_cavalo.placeholder_nif}
                  {...ligarCampo("proprietario_nif", formData.proprietario_nif, props)}
                />
                <ErroDoCampo erros={erros} campo="proprietario_nif" />
                <ApontamentoDoCampo apontamentos={apontamentos} campo="proprietario_nif" />
              </div>
              <div>
                <label
                  htmlFor="proprietario_whatsapp"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  WhatsApp
                  <span className="text-[var(--foreground-muted)] text-xs ml-1">
                    {tr(
                      "(se diferente do telefone)",
                      "(if different from phone)",
                      "(si diferente del teléfono)"
                    )}
                  </span>
                </label>
                <input
                  id="proprietario_whatsapp"
                  type="tel"
                  inputMode="tel"
                  value={formData.proprietario_whatsapp}
                  onChange={(e) => updateField("proprietario_whatsapp", e.target.value)}
                  className={classeCampo(erros, "proprietario_whatsapp")}
                  placeholder="+351 9XX XXX XXX"
                  {...ligarCampo("proprietario_whatsapp", formData.proprietario_whatsapp, props)}
                />
                <ErroDoCampo erros={erros} campo="proprietario_whatsapp" />
                <ApontamentoDoCampo apontamentos={apontamentos} campo="proprietario_whatsapp" />
              </div>
            </div>

            <div>
              <label
                htmlFor="proprietario_morada"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.address}
              </label>
              <input
                id="proprietario_morada"
                type="text"
                autoComplete="street-address"
                value={formData.proprietario_morada}
                onChange={(e) => updateField("proprietario_morada", e.target.value)}
                className="campo"
                placeholder={t.vender_cavalo.placeholder_address}
              />
            </div>

            {eCoudelaria && (
              <div>
                <label
                  htmlFor="website_coudelaria"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {tr(
                    "Website da Coudelaria / Escola",
                    "Stud Farm / School Website",
                    "Sitio Web del Criadero / Escuela"
                  )}
                </label>
                <input
                  id="website_coudelaria"
                  type="url"
                  inputMode="url"
                  value={formData.website_coudelaria}
                  onChange={(e) => updateField("website_coudelaria", e.target.value)}
                  className="campo"
                  placeholder="https://www.coudelaria.pt"
                />
              </div>
            )}
          </div>
        </Detalhes>
      </div>
    </div>
  );
}
