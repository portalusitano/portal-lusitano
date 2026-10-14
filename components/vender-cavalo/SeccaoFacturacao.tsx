"use client";

import { useMemo } from "react";
import type { FormData, AccoesCampo } from "@/components/vender-cavalo/types";
import type { ApontamentosPorCampo } from "@/components/vender-cavalo/inspeccao";
import { tiposProprietario, paisesOpcoes } from "@/components/vender-cavalo/data";
import { eCoudelaria } from "@/components/vender-cavalo/campos";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";
import Seleccao from "@/components/ui/Seleccao";
import Seccao from "@/components/vender-cavalo/Seccao";
import {
  ErroDoCampo,
  classeCampo,
  useFaltas,
  type ErrosPorCampo,
} from "@/components/vender-cavalo/campos-com-erro";
import {
  ApontamentoDoCampo,
  atributosCampo,
  ligarCampo,
} from "@/components/vender-cavalo/apontamentos";

interface SeccaoFacturacaoProps {
  formData: FormData;
  updateField: (campo: keyof FormData, valor: FormData[keyof FormData]) => void;
  erros: ErrosPorCampo;
  apontamentos: ApontamentosPorCampo;
  campo: AccoesCampo;
  conta: (seccao: string) => { feitos: number; total: number };
}

/**
 * Quem recebe a factura.
 *
 * **Estes cinco campos estavam no passo 1**, numa secção chamada «Facturação e
 * contacto adicional», entre o telefone e o nome do cavalo. Medido no browser,
 * o resultado era este: das nove primeiras perguntas do formulário, **seis
 * eram sobre a factura**, e o nome do cavalo era a décima — a **946px de rolo
 * a 1400×950 e a 1309px a 390×700**. Quem chega a um classificados de cavalos
 * chega para falar de um cavalo, e a primeira coisa que se lhe perguntava a
 * seguir ao telefone era o número de contribuinte.
 *
 * Não foram tirados nem tornados opcionais — são os mesmos cinco, com o mesmo
 * asterisco, e ninguém publica sem os responder porque este é o passo do
 * pagamento. Só mudaram de sítio: **estão agora onde a factura se faz**, entre
 * o preço a pagar e o botão que cobra. Uma pergunta cuja resposta só serve
 * daqui a três passos, feita antes de todas as outras, não é rigor — é uma
 * barreira colocada no sítio onde mais gente desiste.
 *
 * O **WhatsApp** não veio com eles e ficou na secção do contacto, ao lado do
 * telefone: é um canal de contacto e não um dado de factura. O cabeçalho
 * antigo dizia-o sem querer — uma secção que precisa de um «e» para caber duas
 * coisas são duas secções.
 *
 * O que **não** mudou: a morada continua a ser pedida aqui e não deixada ao
 * Stripe (`billing_address_collection: "auto"` só a recolhe quando o meio de
 * pagamento a exige — num cartão português é o código postal, em MB WAY é
 * nada), e o NIF continua a não ser guardado em `cavalos_venda`, cuja política
 * de leitura não tem papel atribuído. A razão dos dois está escrita em
 * `docs/campos-do-anuncio.md` e não foi tocada.
 */
export default function SeccaoFacturacao({
  formData,
  updateField,
  erros: errosCrus,
  apontamentos,
  campo,
  conta,
}: SeccaoFacturacaoProps) {
  const { t, language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  const erros = useFaltas(errosCrus, formData);
  const ligacao = { erros, apontamentos, campo };
  const coudelaria = eCoudelaria(formData);

  return (
    <Seccao
      titulo={tr("Quem recebe a factura", "Who the invoice is for", "Quién recibe la factura")}
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
              // O tipo de vendedor decide se o NIF devia ser de empresa ou de
              // pessoa: mudá-lo é mudar a resposta sobre o NIF.
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
              // O país decide qual é a regra do telefone: a portuguesa ou o
              // mínimo internacional. Mudá-lo reavalia os dois — e os dois
              // vivem no passo 1, que é onde a submissão final leva quem
              // escreveu um número que a regra nova recusa.
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
      </div>

      {/* O website só é pedido a quem é coudelaria ou escola, e é por isso que
          o catálogo o marca com `exigidoQuando`. Exigir uma resposta a uma
          caixa que a pessoa não vê tranca o formulário. */}
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
  );
}
