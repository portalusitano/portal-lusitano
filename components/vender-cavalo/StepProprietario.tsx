"use client";

import { useMemo } from "react";
import type { StepProps } from "@/components/vender-cavalo/types";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";
import Seccao from "@/components/vender-cavalo/Seccao";
import { ErroDoCampo, classeCampo, useFaltas } from "@/components/vender-cavalo/campos-com-erro";
import { ApontamentoDoCampo, ligarCampo } from "@/components/vender-cavalo/apontamentos";

/**
 * Como o comprador chega ao vendedor. Quatro campos, e mais nenhum.
 *
 * **Eram nove, em duas secções**, e as cinco que saíram eram todas sobre a
 * factura — tipo de vendedor, país de residência, NIF, morada e website. Ou
 * seja: das nove primeiras perguntas do formulário, seis eram sobre quem paga
 * e três sobre como se é contactado, e **o nome do cavalo era a décima**.
 * Medido no browser: **946px de rolo até à caixa do nome do cavalo a
 * 1400×950, e 1309px a 390×700**. Depois desta mudança são 706px e 876px, com
 * quatro caixas antes em vez de oito — e as quatro são o nome, o email, o
 * telefone e o WhatsApp de quem vende, que é o que o comprador precisa para
 * lhe falar.
 *
 * As cinco não foram tiradas nem tornadas opcionais: estão no passo 4, ao lado
 * do preço e do botão que cobra, e continuam a travar a publicação. Ver
 * `SeccaoFacturacao.tsx`, e a nota de ordem no cabeçalho do `campos.ts`.
 *
 * O **WhatsApp** veio para cá, que é onde ele sempre pertenceu. A secção de
 * onde saiu chamava-se «Facturação e contacto adicional» — um cabeçalho que
 * precisa de um «e» para caber duas coisas está a dizer que ali estão duas
 * secções. E o botão de «usar o mesmo número» só faz sentido com o telefone à
 * vista, que agora está mesmo ao lado: a página já dava o telefone por
 * resposta quando o WhatsApp vinha vazio (`page.tsx`, no pedido de checkout),
 * e o que este botão faz é dizer isso em vez de o fazer às escondidas.
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

  return (
    <div className="bg-[var(--background-secondary)]/50 cartao p-6">
      {/* «Dados do Proprietário» era o título de um bloco que pedia o NIF e a
          morada de facturação. Já não os pede — pede quem vende e por onde se
          lhe fala —, e o título passou a dizer isso. Duas palavras, e não as
          mesmas do cabeçalho da secção que vem dois centímetros abaixo: o
          mesmo texto repetido a dois tamanhos não é hierarquia, é uma gralha
          com autoridade. */}
      <h2 className="text-xl mb-6">{tr("Quem vende", "Who is selling", "Quién vende")}</h2>

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
            <div>
              <label
                htmlFor="proprietario_whatsapp"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                WhatsApp *
                {/* Um campo obrigatório cuja resposta o formulário já tem
                    escrita ao lado não se pede outra vez: oferece-se. O botão
                    só aparece quando há telefone para copiar e quando o
                    WhatsApp ainda não é igual a ele. */}
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
        </Seccao>

      </div>
    </div>
  );
}
