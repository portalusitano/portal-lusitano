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

export default function StepIdentificacao({ formData, updateField }: StepProps) {
  const { t, language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  return (
    <div className="bg-[var(--background-secondary)]/50 cartao p-6">
      <h2 className="text-xl mb-6 flex items-center gap-3">
        <span className="w-8 h-8 bg-[var(--foreground-strong)] rounded-full flex items-center justify-center text-black text-sm font-bold">
          2
        </span>
        {t.vender_cavalo.step_id_title}
      </h2>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-300">{t.vender_cavalo.apsl_notice}</p>
        </div>
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
              required
              minLength={2}
              value={formData.nome}
              onChange={(e) => updateField("nome", e.target.value)}
              className="campo"
              placeholder={t.vender_cavalo.placeholder_horse_name}
            />
          </div>
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
              required
              minLength={2}
              value={formData.nome_registo}
              onChange={(e) => updateField("nome_registo", e.target.value)}
              className="campo"
              placeholder={t.vender_cavalo.placeholder_registration_name}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
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
              required
              value={formData.numero_registo}
              onChange={(e) => updateField("numero_registo", e.target.value)}
              className="campo"
              placeholder={t.vender_cavalo.placeholder_registration_number}
            />
          </div>
          <div>
            <label
              htmlFor="microchip"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {t.vender_cavalo.microchip_number} *
            </label>
            <input
              id="microchip"
              type="text"
              required
              minLength={15}
              maxLength={15}
              value={formData.microchip}
              onChange={(e) => updateField("microchip", e.target.value)}
              className="campo"
              placeholder={t.vender_cavalo.placeholder_microchip}
            />
          </div>
        </div>

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

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="raca_confirmada"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {tr("Raça Confirmada *", "Confirmed Breed *", "Raza Confirmada *")}
            </label>
            <select
              id="raca_confirmada"
              required
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
            </select>
          </div>
          <div>
            <label
              htmlFor="pais_nascimento"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {tr("País de Nascimento *", "Country of Birth *", "País de Nacimiento *")}
            </label>
            <select
              id="pais_nascimento"
              required
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
            </select>
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
              required
              value={formData.data_nascimento}
              onChange={(e) => updateField("data_nascimento", e.target.value)}
              className="campo"
            />
          </div>
          <div>
            <label htmlFor="sexo" className="block text-sm text-[var(--foreground-secondary)] mb-1">
              {t.vender_cavalo.sex} *
            </label>
            <select
              id="sexo"
              required
              value={formData.sexo}
              onChange={(e) => updateField("sexo", e.target.value)}
              className="campo"
            >
              <option value="">{t.vender_cavalo.select}</option>
              <option value="Garanhão">{t.vender_cavalo.stallion}</option>
              <option value="Égua">{t.vender_cavalo.mare}</option>
              <option value="Castrado">{t.vender_cavalo.gelding}</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="pelagem"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {t.vender_cavalo.coat} *
            </label>
            <select
              id="pelagem"
              value={formData.pelagem}
              onChange={(e) => updateField("pelagem", e.target.value)}
              className="campo"
            >
              <option value="">{t.vender_cavalo.select}</option>
              {(pelagens[language] || pelagens.pt).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
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
              value={formData.altura}
              onChange={(e) => updateField("altura", e.target.value)}
              className="campo"
              placeholder={t.vender_cavalo.placeholder_height}
              min={140}
              max={180}
            />
          </div>
          <div>
            <label htmlFor="peso" className="block text-sm text-[var(--foreground-secondary)] mb-1">
              {tr("Peso", "Weight", "Peso")}
              <span className="text-[var(--foreground-muted)] text-xs ml-1">(kg)</span>
            </label>
            <input
              id="peso"
              type="number"
              value={formData.peso}
              onChange={(e) => updateField("peso", e.target.value)}
              className="campo"
              placeholder="500"
              min={100}
              max={900}
            />
          </div>
          <div>
            <label
              htmlFor="cor_olhos"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {tr("Cor dos Olhos", "Eye Color", "Color de Ojos")}
            </label>
            <select
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
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="cor_crina"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {tr("Cor da Crina", "Mane Color", "Color de Crines")}
            </label>
            <select
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
            </select>
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
              <span className="text-[var(--foreground-muted)] text-xs ml-1">
                {tr("(opcional)", "(optional)", "(opcional)")}
              </span>
            </label>
            <input
              id="nivel_apsl"
              type="text"
              value={formData.nivel_apsl}
              onChange={(e) => updateField("nivel_apsl", e.target.value)}
              className="campo"
              placeholder="Ex: 78.5 pontos — Muito Bom"
            />
          </div>
          <div>
            <label
              htmlFor="temperamento"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {tr("Temperamento *", "Temperament *", "Temperamento *")}
            </label>
            <select
              id="temperamento"
              required
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
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="marcas_distintivas"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {tr("Marcas Distintivas", "Distinctive Markings", "Marcas Distintivas")}
              <span className="text-[var(--foreground-muted)] text-xs ml-1">
                (estrela, meia-lua, meias, rodados, etc.)
              </span>
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
              htmlFor="cor_casco"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {tr("Cor do Casco", "Hoof Color", "Color del Casco")}
            </label>
            <select
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
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
      </div>
    </div>
  );
}
