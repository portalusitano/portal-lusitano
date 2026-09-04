"use client";

import { useMemo } from "react";
import type { StepProps } from "@/components/vender-cavalo/types";
import { tiposProprietario, paisesOpcoes } from "@/components/vender-cavalo/data";
import { eCoudelaria } from "@/components/vender-cavalo/campos";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";
import Seleccao from "@/components/ui/Seleccao";
import Seccao from "@/components/vender-cavalo/Seccao";
import { ErroDoCampo, classeCampo, useFaltas } from "@/components/vender-cavalo/campos-com-erro";
import {
  ApontamentoDoCampo,
  atributosCampo,
  ligarCampo,
} from "@/components/vender-cavalo/apontamentos";

/**
 * Quem vende.
 *
 * Nove campos, todos obrigatórios, em duas secções abertas. Estavam três à
 * vista e seis dentro de uma gaveta que dizia «Opcional. Pode ficar para
 * depois de o anúncio estar no ar» — e a gaveta saiu com o «opcional».
 *
 * **A morada de facturação fica, e é exigida.** O argumento para a tirar era
 * que o checkout já a pede ao Stripe, e por isso pedi-la aqui é pedir duas
 * vezes o mesmo. Foi ao ver o que a rota do checkout faz que a decisão virou:
 * `billing_address_collection: "auto"` quer dizer que o Stripe só recolhe a
 * morada **quando o meio de pagamento ou a regulação a exigem**. Num cartão
 * português isso é muitas vezes só o código postal, e em MB WAY é nada. Ou
 * seja: «o Stripe já a pede» é verdade algumas vezes, e a factura precisa dela
 * todas. Pedi-la uma vez, aqui, no único sítio onde a resposta chega de
 * certeza, não é pedi-la duas — é pedi-la uma. E o valor já tem casa: fica em
 * `contact_submissions.form_data`, cujas políticas exigem `service_role`, que é
 * onde a factura o quer e onde o público não chega.
 */
export default function StepProprietario(props: StepProps) {
  const { formData, updateField, erros: errosCrus, apontamentos, campo, conta } = props;
  const { t, language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  /**
   * As faltas deste passo, separadas em duas: o que está por responder e o
   * que está respondido e mal. A régua é o `estaPreenchido` do catálogo — a
   * mesma que trava o botão e a mesma que conta «7 / 12» no cabeçalho da
   * secção —, e é ela que decide qual dos campos leva vermelho.
   */
  const erros = useFaltas(errosCrus, formData);

  /**
   * O que `ligarCampo` precisa de saber, montado uma vez.
   *
   * Era o objecto `props` inteiro. Deixou de poder ser: o `erros` que chega
   * nas props é a lista crua da validação, e o que os campos leem é a versão
   * já separada em «por responder» e «erro». Passar `props` aqui seria pintar
   * de vermelho, pela porta das traseiras, exactamente o que este trabalho
   * deixou de pintar.
   */
  const ligacao = { erros, apontamentos, campo };

  const coudelaria = eCoudelaria(formData);

  return (
    <div className="bg-[var(--background-secondary)]/50 cartao p-6">
      <h2 className="text-xl mb-6">{t.vender_cavalo.step_owner_title}</h2>

      <div className="space-y-8">
        <Seccao
          titulo={tr("Como o contactam", "How buyers reach you", "Cómo le contactan")}
          nota={tr(
            "É por aqui que o comprador chega — sem isto o anúncio não serve.",
            "This is how a buyer reaches you — without it the listing is useless.",
            "Es por aquí que el comprador llega — sin esto el anuncio no sirve."
          )}
          {...conta("contacto")}
        >
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
              {...ligarCampo("proprietario_nome", formData.proprietario_nome, ligacao)}
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
                {...ligarCampo("proprietario_email", formData.proprietario_email, ligacao)}
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
                {...ligarCampo("proprietario_telefone", formData.proprietario_telefone, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="proprietario_telefone" />
              <ApontamentoDoCampo apontamentos={apontamentos} campo="proprietario_telefone" />
            </div>
          </div>
        </Seccao>

        <Seccao
          titulo={tr(
            "Facturação e contacto adicional",
            "Billing and extra contact",
            "Facturación y contacto adicional"
          )}
          nota={tr(
            "Fica só para a factura e para a administração — nada disto aparece no anúncio.",
            "For the invoice and the back office only — none of this shows on the listing.",
            "Sólo para la factura y la administración — nada de esto aparece en el anuncio."
          )}
          {...conta("facturacao")}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="tipo_proprietario"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Tipo de Vendedor", "Seller Type", "Tipo de Vendedor")} *
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
                className={classeCampo(erros, "tipo_proprietario")}
                {...atributosCampo(erros, apontamentos, "tipo_proprietario")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                {(tiposProprietario[language] || tiposProprietario.pt).map((tp) => (
                  <option key={tp} value={tp}>
                    {tp}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="tipo_proprietario" />
            </div>
            <div>
              <label
                htmlFor="pais_proprietario"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("País de Residência", "Country of Residence", "País de Residencia")} *
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
                className={classeCampo(erros, "pais_proprietario")}
                {...atributosCampo(erros, apontamentos, "pais_proprietario")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                {paisesOpcoes.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="pais_proprietario" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="proprietario_nif"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.nif} *
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
                {...ligarCampo("proprietario_nif", formData.proprietario_nif, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="proprietario_nif" />
              <ApontamentoDoCampo apontamentos={apontamentos} campo="proprietario_nif" />
            </div>
            <div>
              <label
                htmlFor="proprietario_whatsapp"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                WhatsApp *
                {/* Um campo obrigatório cuja resposta o formulário já tem
                    escrita duas linhas acima não se pede outra vez: oferece-se.
                    O botão só aparece quando há telefone para copiar e quando
                    o WhatsApp ainda não é igual a ele. */}
                {formData.proprietario_telefone.trim() &&
                  formData.proprietario_whatsapp.trim() !==
                    formData.proprietario_telefone.trim() && (
                    <button
                      type="button"
                      className="btn btn-subtil btn-sm ml-2 align-baseline"
                      onClick={() => {
                        updateField("proprietario_whatsapp", formData.proprietario_telefone);
                        campo.aoEscolher("proprietario_whatsapp");
                      }}
                    >
                      {tr("usar o mesmo número", "use the same number", "usar el mismo número")}
                    </button>
                  )}
              </label>
              <input
                id="proprietario_whatsapp"
                type="tel"
                inputMode="tel"
                value={formData.proprietario_whatsapp}
                onChange={(e) => updateField("proprietario_whatsapp", e.target.value)}
                className={classeCampo(erros, "proprietario_whatsapp")}
                placeholder="+351 9XX XXX XXX"
                {...ligarCampo("proprietario_whatsapp", formData.proprietario_whatsapp, ligacao)}
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
              {t.vender_cavalo.address} *
              <span className="text-[var(--foreground-muted)] text-xs ml-1">
                {tr("(para a factura)", "(for the invoice)", "(para la factura)")}
              </span>
            </label>
            <input
              id="proprietario_morada"
              type="text"
              autoComplete="street-address"
              value={formData.proprietario_morada}
              onChange={(e) => updateField("proprietario_morada", e.target.value)}
              className={classeCampo(erros, "proprietario_morada")}
              placeholder={t.vender_cavalo.placeholder_address}
              {...ligarCampo("proprietario_morada", formData.proprietario_morada, ligacao)}
            />
            <ErroDoCampo erros={erros} campo="proprietario_morada" />
          </div>

          {/* O website só é pedido a quem é coudelaria ou escola, e é por isso
              que o catálogo o marca com `exigidoQuando`. Exigir uma resposta a
              uma caixa que a pessoa não vê tranca o formulário. */}
          {coudelaria && (
            <div>
              <label
                htmlFor="website_coudelaria"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr(
                  "Website da Coudelaria / Escola",
                  "Stud Farm / School Website",
                  "Sitio Web del Criadero / Escuela"
                )}{" "}
                *
              </label>
              <input
                id="website_coudelaria"
                type="url"
                inputMode="url"
                value={formData.website_coudelaria}
                onChange={(e) => updateField("website_coudelaria", e.target.value)}
                className={classeCampo(erros, "website_coudelaria")}
                placeholder="https://www.coudelaria.pt"
                {...ligarCampo("website_coudelaria", formData.website_coudelaria, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="website_coudelaria" />
            </div>
          )}
        </Seccao>
      </div>
    </div>
  );
}
