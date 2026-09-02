"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";
import type { StepProps } from "@/components/vender-cavalo/types";
import {
  pelagens,
  coresOlhos,
  coresCasco,
  temperamentosOpcoes,
  coresCrina,
  paisesOpcoes,
} from "@/components/vender-cavalo/data";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";
import Seleccao from "@/components/ui/Seleccao";
import Detalhes from "@/components/vender-cavalo/Detalhes";
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
 * À vista fica o que o anúncio publicado mostra — nome, registo, data de
 * nascimento, sexo, pelagem, altura. O resto do bilhete de identidade
 * (microchip, passaporte, raça, país, peso, cores, temperamento, marcas) está
 * atrás de um painel fechado.
 *
 * O microchip saiu dos obrigatórios de propósito: são quinze dígitos que
 * estão no Livro Azul, e o Livro Azul é anexado no passo seguinte. Pedir a
 * alguém que copie à mão um número que vai enviar em PDF dali a dois minutos
 * é o campo mais caro do formulário — e nada, do anúncio à aprovação, o lê
 * antes de o documento chegar.
 */
interface StepIdentificacaoProps extends StepProps {
  /** Em que pé vai a consulta do número de registo à nossa base. */
  registoApsl: RegistoVerificado["estado"];
}

export default function StepIdentificacao(props: StepIdentificacaoProps) {
  const { formData, updateField, erros, apontamentos, campo, registoApsl } = props;
  const { t, language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  return (
    <div className="bg-[var(--background-secondary)]/50 cartao p-6">
      <h2 className="text-xl mb-6">{t.vender_cavalo.step_id_title}</h2>

      <div className="painel-nota mb-6">
        <Info size={16} className="flex-none mt-0.5" aria-hidden="true" />
        <p>{t.vender_cavalo.apsl_notice}</p>
      </div>

      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="nome" className="block text-sm text-[var(--foreground-secondary)] mb-1">
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
          </div>
          <div>
            <label htmlFor="sexo" className="block text-sm text-[var(--foreground-secondary)] mb-1">
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
              {t.vender_cavalo.height}
              <span className="text-[var(--foreground-muted)] text-xs ml-1">(cm)</span>
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
              {tr("Temperamento", "Temperament", "Temperamento")}
            </label>
            <Seleccao
              id="temperamento"
              value={formData.temperamento}
              onChange={(e) => updateField("temperamento", e.target.value)}
              className="campo"
            >
              <option value="">{t.vender_cavalo.select}</option>
              {(temperamentosOpcoes[language] || temperamentosOpcoes.pt).map((tp) => (
                <option key={tp} value={tp}>
                  {tp}
                </option>
              ))}
            </Seleccao>
          </div>
        </div>

        <Detalhes
          titulo={tr(
            "Identificação oficial e morfologia",
            "Official identification and conformation",
            "Identificación oficial y morfología"
          )}
          campos={12}
          nota={tr(
            "Opcional. O microchip e a raça já vêm no Livro Azul que anexa a seguir.",
            "Optional. Microchip and breed already appear on the Blue Book you attach next.",
            "Opcional. El microchip y la raza ya vienen en el Libro Azul que adjunta después."
          )}
        >
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="nome_registo"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {t.vender_cavalo.registration_name}
                </label>
                <input
                  id="nome_registo"
                  type="text"
                  value={formData.nome_registo}
                  onChange={(e) => updateField("nome_registo", e.target.value)}
                  className="campo"
                  placeholder={t.vender_cavalo.placeholder_registration_name}
                />
              </div>
              <div>
                <label
                  htmlFor="microchip"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {t.vender_cavalo.microchip_number}
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
                  {t.vender_cavalo.passport_number}
                </label>
                <input
                  id="passaporte_equino"
                  type="text"
                  value={formData.passaporte_equino}
                  onChange={(e) => updateField("passaporte_equino", e.target.value)}
                  className="campo"
                  placeholder={t.vender_cavalo.placeholder_passport}
                />
              </div>
              <div>
                <label
                  htmlFor="raca_confirmada"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {tr("Raça Confirmada", "Confirmed Breed", "Raza Confirmada")}
                </label>
                <Seleccao
                  id="raca_confirmada"
                  value={formData.raca_confirmada}
                  onChange={(e) => updateField("raca_confirmada", e.target.value)}
                  className="campo"
                >
                  <option value="">{t.vender_cavalo.select}</option>
                  <option value="PSL — Puro Sangue Lusitano">PSL — Puro Sangue Lusitano</option>
                  <option value="Cruzado PSL (com passaporte)">Cruzado PSL (com passaporte)</option>
                  <option value="PRE — Pura Raza Española">PRE — Pura Raza Española</option>
                  <option value="Anglo-Lusitano">Anglo-Lusitano</option>
                  <option value="Outro (com registo)">Outro (com registo)</option>
                </Seleccao>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="pais_nascimento"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {tr("País de Nascimento", "Country of Birth", "País de Nacimiento")}
                </label>
                <Seleccao
                  id="pais_nascimento"
                  value={formData.pais_nascimento}
                  onChange={(e) => updateField("pais_nascimento", e.target.value)}
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
              <div>
                <label
                  htmlFor="peso"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {tr("Peso", "Weight", "Peso")}
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
                  {tr("Cor dos Olhos", "Eye Color", "Color de Ojos")}
                </label>
                <Seleccao
                  id="cor_olhos"
                  value={formData.cor_olhos}
                  onChange={(e) => updateField("cor_olhos", e.target.value)}
                  className="campo"
                >
                  <option value="">{t.vender_cavalo.select}</option>
                  {coresOlhos.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Seleccao>
              </div>
              <div>
                <label
                  htmlFor="cor_crina"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {tr("Cor da Crina", "Mane Color", "Color de Crines")}
                </label>
                <Seleccao
                  id="cor_crina"
                  value={formData.cor_crina}
                  onChange={(e) => updateField("cor_crina", e.target.value)}
                  className="campo"
                >
                  <option value="">{t.vender_cavalo.select}</option>
                  {coresCrina.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Seleccao>
              </div>
              <div>
                <label
                  htmlFor="cor_casco"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {tr("Cor do Casco", "Hoof Color", "Color del Casco")}
                </label>
                <Seleccao
                  id="cor_casco"
                  value={formData.cor_casco}
                  onChange={(e) => updateField("cor_casco", e.target.value)}
                  className="campo"
                >
                  <option value="">{t.vender_cavalo.select}</option>
                  {coresCasco.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Seleccao>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="marcas_distintivas"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {tr("Marcas Distintivas", "Distinctive Markings", "Marcas Distintivas")}
                </label>
                <input
                  id="marcas_distintivas"
                  type="text"
                  value={formData.marcas_distintivas}
                  onChange={(e) => updateField("marcas_distintivas", e.target.value)}
                  className="campo"
                  placeholder="Ex: Estrela na testa, meia-lua, meia no posterior esquerdo"
                />
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
                  )}
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

            <label
              htmlFor="prova_aptidao_apsl"
              className="flex items-center gap-3 cursor-pointer touch-manipulation"
            >
              <input
                id="prova_aptidao_apsl"
                type="checkbox"
                checked={formData.prova_aptidao_apsl}
                onChange={(e) => updateField("prova_aptidao_apsl", e.target.checked)}
                className="w-5 h-5 accent-[var(--foreground-strong)]"
              />
              <span className="text-sm">
                {tr(
                  "Prova de Aptidão APSL realizada",
                  "APSL Aptitude Test completed",
                  "Prueba de Aptitud APSL realizada"
                )}
              </span>
            </label>
          </div>
        </Detalhes>
      </div>
    </div>
  );
}
