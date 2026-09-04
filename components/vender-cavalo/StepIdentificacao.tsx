"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";
import type { StepProps, Resposta } from "@/components/vender-cavalo/types";
import {
  pelagens,
  coresOlhos,
  coresCasco,
  temperamentosOpcoes,
  coresCrina,
  paisesOpcoes,
} from "@/components/vender-cavalo/data";
import { idadeEmAnos } from "@/components/vender-cavalo/inspeccao";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";
import Seleccao from "@/components/ui/Seleccao";
import Seccao from "@/components/vender-cavalo/Seccao";
import SimNao from "@/components/vender-cavalo/SimNao";
import { ErroDoCampo, classeCampo } from "@/components/vender-cavalo/campos-com-erro";
import {
  ApontamentoDoCampo,
  atributosCampo,
  ligarCampo,
} from "@/components/vender-cavalo/apontamentos";
import type { RegistoVerificado } from "@/components/vender-cavalo/usar-registo-apsl";

/**
 * O cavalo.
 *
 * Dezanove campos em duas secções, e agora todos obrigatórios. O microchip
 * estava fora dos obrigatórios com uma razão escrita — são quinze algarismos
 * copiados à mão de um PDF que é anexado dois minutos depois — e essa razão
 * continua a ser verdade; o que mudou é que deixou de ser nossa a decisão.
 * O que se pode fazer, e se faz, é dizer no rótulo **onde** está cada número,
 * para que ninguém tenha de o procurar: o do Livro Azul, o do passaporte.
 *
 * A inspecção do microchip pela ISO 11784 não muda uma vírgula: obrigatório é
 * sobre estar preenchido, o aviso é sobre estar certo, e um campo obrigatório
 * continua a poder ter um aviso.
 */
interface StepIdentificacaoProps extends StepProps {
  /** Em que pé vai a consulta do número de registo à nossa base. */
  registoApsl: RegistoVerificado["estado"];
}

export default function StepIdentificacao(props: StepIdentificacaoProps) {
  const { formData, updateField, erros, apontamentos, campo, registoApsl, conta } = props;
  const { t, language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  /**
   * A idade não é um campo: é uma conta sobre a data de nascimento.
   *
   * Já era calculada — vai no pedido do checkout desde sempre — mas nunca era
   * mostrada, e é a mostrá-la que ela serve para alguma coisa: quem escreve
   * `2109` em vez de `2019` não vê o engano na data, vê-o no «−83 anos» que
   * aparece ao lado. Um valor que se pode inferir de outro não se pergunta
   * duas vezes; escreve-se.
   */
  const idade = useMemo(() => idadeEmAnos(formData.data_nascimento), [formData.data_nascimento]);

  return (
    <div className="bg-[var(--background-secondary)]/50 cartao p-6">
      <h2 className="text-xl mb-6">{t.vender_cavalo.step_id_title}</h2>

      <div className="painel-nota mb-6">
        <Info size={16} className="flex-none mt-0.5" aria-hidden="true" />
        <p>{t.vender_cavalo.apsl_notice}</p>
      </div>

      <div className="space-y-8">
        <Seccao
          titulo={tr("O que vai no anúncio", "What goes on the listing", "Lo que va en el anuncio")}
          nota={tr(
            "É isto que o comprador vê no cartão antes de abrir a ficha.",
            "This is what a buyer sees on the card before opening the listing.",
            "Esto es lo que el comprador ve en la tarjeta antes de abrir la ficha."
          )}
          {...conta("cavalo")}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="nome"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.horse_name} *
              </label>
              <input
                id="nome"
                type="text"
                value={formData.nome}
                onChange={(e) => updateField("nome", e.target.value)}
                className={classeCampo(erros, "nome")}
                placeholder={t.vender_cavalo.placeholder_horse_name}
                {...ligarCampo("nome", formData.nome, props)}
              />
              <ErroDoCampo erros={erros} campo="nome" />
            </div>
            <div>
              <label
                htmlFor="numero_registo"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.registration_number} *
              </label>
              <input
                id="numero_registo"
                type="text"
                value={formData.numero_registo}
                onChange={(e) => updateField("numero_registo", e.target.value)}
                className={classeCampo(erros, "numero_registo")}
                placeholder={t.vender_cavalo.placeholder_registration_number}
                {...ligarCampo("numero_registo", formData.numero_registo, props)}
              />
              <ErroDoCampo erros={erros} campo="numero_registo" />
              <ApontamentoDoCampo apontamentos={apontamentos} campo="numero_registo" />
              {registoApsl === "a-verificar" && (
                <p className="apontamento apontamento--espera">
                  {tr(
                    "A verificar se já existe um anúncio com este número…",
                    "Checking whether a listing already uses this number…",
                    "Comprobando si ya hay un anuncio con este número…"
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="data_nascimento"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.birth_date} *
              </label>
              <input
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => updateField("data_nascimento", e.target.value)}
                className={classeCampo(erros, "data_nascimento")}
                {...ligarCampo("data_nascimento", formData.data_nascimento, props)}
              />
              <ErroDoCampo erros={erros} campo="data_nascimento" />
              {idade !== null && idade >= 0 && (
                <p className="meta mt-1 tabular-nums">
                  {idade === 1
                    ? tr("1 ano", "1 year old", "1 año")
                    : tr(`${idade} anos`, `${idade} years old`, `${idade} años`)}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="sexo"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.sex} *
              </label>
              <Seleccao
                id="sexo"
                value={formData.sexo}
                onChange={(e) => updateField("sexo", e.target.value)}
                className={classeCampo(erros, "sexo")}
                {...atributosCampo(erros, apontamentos, "sexo")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                <option value="Garanhão">{t.vender_cavalo.stallion}</option>
                <option value="Égua">{t.vender_cavalo.mare}</option>
                <option value="Castrado">{t.vender_cavalo.gelding}</option>
              </Seleccao>
              <ErroDoCampo erros={erros} campo="sexo" />
            </div>
            <div>
              <label
                htmlFor="pelagem"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.coat} *
              </label>
              <Seleccao
                id="pelagem"
                value={formData.pelagem}
                onChange={(e) => updateField("pelagem", e.target.value)}
                className={classeCampo(erros, "pelagem")}
                {...atributosCampo(erros, apontamentos, "pelagem")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                {(pelagens[language] || pelagens.pt).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="pelagem" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="altura"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.height} *
                <span className="text-[var(--foreground-muted)] text-xs ml-1">
                  {tr("(cm, ao garrote)", "(cm, at the withers)", "(cm, a la cruz)")}
                </span>
              </label>
              <input
                id="altura"
                type="number"
                inputMode="numeric"
                value={formData.altura}
                onChange={(e) => updateField("altura", e.target.value)}
                className={classeCampo(erros, "altura")}
                placeholder={t.vender_cavalo.placeholder_height}
                min={100}
                max={220}
                {...ligarCampo("altura", formData.altura, props)}
              />
              <ErroDoCampo erros={erros} campo="altura" />
              <ApontamentoDoCampo
                apontamentos={apontamentos}
                campo="altura"
                aoAceitar={campo.aoAceitar}
              />
            </div>
            <div>
              <label
                htmlFor="temperamento"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Temperamento", "Temperament", "Temperamento")} *
              </label>
              <Seleccao
                id="temperamento"
                value={formData.temperamento}
                onChange={(e) => updateField("temperamento", e.target.value)}
                className={classeCampo(erros, "temperamento")}
                {...atributosCampo(erros, apontamentos, "temperamento")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                {(temperamentosOpcoes[language] || temperamentosOpcoes.pt).map((tp) => (
                  <option key={tp} value={tp}>
                    {tp}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="temperamento" />
            </div>
          </div>
        </Seccao>

        <Seccao
          titulo={tr(
            "Identificação oficial e morfologia",
            "Official identification and conformation",
            "Identificación oficial y morfología"
          )}
          nota={tr(
            "Está tudo no Livro Azul e no passaporte, que anexa no passo seguinte.",
            "All of it is on the Blue Book and passport you attach in the next step.",
            "Todo está en el Libro Azul y el pasaporte que adjunta en el paso siguiente."
          )}
          {...conta("identificacao")}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="nome_registo"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.registration_name} *
              </label>
              <input
                id="nome_registo"
                type="text"
                value={formData.nome_registo}
                onChange={(e) => updateField("nome_registo", e.target.value)}
                className={classeCampo(erros, "nome_registo")}
                placeholder={t.vender_cavalo.placeholder_registration_name}
                {...ligarCampo("nome_registo", formData.nome_registo, props)}
              />
              <ErroDoCampo erros={erros} campo="nome_registo" />
            </div>
            <div>
              <label
                htmlFor="microchip"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.microchip_number} *
                <span className="text-[var(--foreground-muted)] text-xs ml-1">
                  {tr(
                    "(15 algarismos, no Livro Azul)",
                    "(15 digits, on the Blue Book)",
                    "(15 dígitos, en el Libro Azul)"
                  )}
                </span>
              </label>
              <input
                id="microchip"
                type="text"
                inputMode="numeric"
                maxLength={15}
                value={formData.microchip}
                onChange={(e) => updateField("microchip", e.target.value)}
                className={classeCampo(erros, "microchip")}
                placeholder={t.vender_cavalo.placeholder_microchip}
                {...ligarCampo("microchip", formData.microchip, props)}
              />
              <ErroDoCampo erros={erros} campo="microchip" />
              <ApontamentoDoCampo apontamentos={apontamentos} campo="microchip" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="passaporte_equino"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.passport_number} *
                <span className="text-[var(--foreground-muted)] text-xs ml-1">
                  {tr(
                    "(UELN: 15 caracteres, 620 em Portugal)",
                    "(UELN: 15 characters, 620 for Portugal)",
                    "(UELN: 15 caracteres, 620 en Portugal)"
                  )}
                </span>
              </label>
              <input
                id="passaporte_equino"
                type="text"
                value={formData.passaporte_equino}
                onChange={(e) => updateField("passaporte_equino", e.target.value)}
                className={classeCampo(erros, "passaporte_equino")}
                placeholder={t.vender_cavalo.placeholder_passport}
                {...ligarCampo("passaporte_equino", formData.passaporte_equino, props)}
              />
              <ErroDoCampo erros={erros} campo="passaporte_equino" />
              <ApontamentoDoCampo apontamentos={apontamentos} campo="passaporte_equino" />
            </div>
            <div>
              <label
                htmlFor="raca_confirmada"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Raça Confirmada", "Confirmed Breed", "Raza Confirmada")} *
              </label>
              <Seleccao
                id="raca_confirmada"
                value={formData.raca_confirmada}
                onChange={(e) => updateField("raca_confirmada", e.target.value)}
                className={classeCampo(erros, "raca_confirmada")}
                {...atributosCampo(erros, apontamentos, "raca_confirmada")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                <option value="PSL — Puro Sangue Lusitano">PSL — Puro Sangue Lusitano</option>
                <option value="Cruzado PSL (com passaporte)">Cruzado PSL (com passaporte)</option>
                <option value="PRE — Pura Raza Española">PRE — Pura Raza Española</option>
                <option value="Anglo-Lusitano">Anglo-Lusitano</option>
                <option value="Outro (com registo)">Outro (com registo)</option>
              </Seleccao>
              <ErroDoCampo erros={erros} campo="raca_confirmada" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="pais_nascimento"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("País de Nascimento", "Country of Birth", "País de Nacimiento")} *
              </label>
              <Seleccao
                id="pais_nascimento"
                value={formData.pais_nascimento}
                onChange={(e) => updateField("pais_nascimento", e.target.value)}
                className={classeCampo(erros, "pais_nascimento")}
                {...atributosCampo(erros, apontamentos, "pais_nascimento")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                {paisesOpcoes.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="pais_nascimento" />
            </div>
            <div>
              <label
                htmlFor="peso"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Peso", "Weight", "Peso")} *
                <span className="text-[var(--foreground-muted)] text-xs ml-1">(kg)</span>
              </label>
              <input
                id="peso"
                type="number"
                inputMode="numeric"
                value={formData.peso}
                onChange={(e) => updateField("peso", e.target.value)}
                className={classeCampo(erros, "peso")}
                placeholder="500"
                min={50}
                max={1200}
                {...ligarCampo("peso", formData.peso, props)}
              />
              <ErroDoCampo erros={erros} campo="peso" />
              <ApontamentoDoCampo apontamentos={apontamentos} campo="peso" />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="cor_olhos"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Cor dos Olhos", "Eye Color", "Color de Ojos")} *
              </label>
              <Seleccao
                id="cor_olhos"
                value={formData.cor_olhos}
                onChange={(e) => updateField("cor_olhos", e.target.value)}
                className={classeCampo(erros, "cor_olhos")}
                {...atributosCampo(erros, apontamentos, "cor_olhos")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                {coresOlhos.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="cor_olhos" />
            </div>
            <div>
              <label
                htmlFor="cor_crina"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Cor da Crina", "Mane Color", "Color de Crines")} *
              </label>
              <Seleccao
                id="cor_crina"
                value={formData.cor_crina}
                onChange={(e) => updateField("cor_crina", e.target.value)}
                className={classeCampo(erros, "cor_crina")}
                {...atributosCampo(erros, apontamentos, "cor_crina")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                {coresCrina.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="cor_crina" />
            </div>
            <div>
              <label
                htmlFor="cor_casco"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Cor do Casco", "Hoof Color", "Color del Casco")} *
              </label>
              <Seleccao
                id="cor_casco"
                value={formData.cor_casco}
                onChange={(e) => updateField("cor_casco", e.target.value)}
                className={classeCampo(erros, "cor_casco")}
                {...atributosCampo(erros, apontamentos, "cor_casco")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                {coresCasco.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="cor_casco" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="marcas_distintivas"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Marcas Distintivas", "Distinctive Markings", "Marcas Distintivas")} *
                <span className="text-[var(--foreground-muted)] text-xs ml-1">
                  {tr(
                    '(se não tiver nenhuma, escreva "Nenhuma")',
                    '(if there are none, write "None")',
                    '(si no tiene ninguna, escriba "Ninguna")'
                  )}
                </span>
              </label>
              <input
                id="marcas_distintivas"
                type="text"
                value={formData.marcas_distintivas}
                onChange={(e) => updateField("marcas_distintivas", e.target.value)}
                className={classeCampo(erros, "marcas_distintivas")}
                placeholder="Ex: Estrela na testa, meia-lua, meia no posterior esquerdo"
                {...ligarCampo("marcas_distintivas", formData.marcas_distintivas, props)}
              />
              <ErroDoCampo erros={erros} campo="marcas_distintivas" />
            </div>
            <div>
              <label
                htmlFor="nivel_apsl"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr(
                  "Pontuação Morfológica APSL",
                  "APSL Morphological Score",
                  "Puntuación Morfológica APSL"
                )}{" "}
                *
              </label>
              <input
                id="nivel_apsl"
                type="text"
                value={formData.nivel_apsl}
                onChange={(e) => updateField("nivel_apsl", e.target.value)}
                className={classeCampo(erros, "nivel_apsl")}
                placeholder="Ex: 78.5 pontos — Muito Bom"
                {...ligarCampo("nivel_apsl", formData.nivel_apsl, props)}
              />
              <ErroDoCampo erros={erros} campo="nivel_apsl" />
              <ApontamentoDoCampo apontamentos={apontamentos} campo="nivel_apsl" />
            </div>
          </div>

          <SimNao
            id="prova_aptidao_apsl"
            pergunta={tr(
              "Prova de Aptidão APSL realizada",
              "APSL Aptitude Test completed",
              "Prueba de Aptitud APSL realizada"
            )}
            valor={formData.prova_aptidao_apsl}
            onChange={(v: Resposta) => {
              updateField("prova_aptidao_apsl", v);
              campo.aoEscolher("prova_aptidao_apsl");
            }}
            erros={erros}
          />
        </Seccao>
      </div>
    </div>
  );
}
