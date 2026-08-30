"use client";

import { useMemo, useState, useCallback } from "react";
import { Euro, Camera, X, Upload, ImagePlus } from "lucide-react";
import type { StepProps } from "@/components/vender-cavalo/types";
import {
  disponibilidades,
  MIN_IMAGES,
  regioesPT,
  duracoesTrialOpcoes,
  motivosVenda,
} from "@/components/vender-cavalo/data";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";

interface StepPrecoApresentacaoProps extends StepProps {
  imagens: File[];
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  maxImages: number;
}

export default function StepPrecoApresentacao({
  formData,
  updateField,
  imagens,
  onImageUpload,
  onRemoveImage,
  maxImages,
}: StepPrecoApresentacaoProps) {
  const { t, language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (files.length === 0) return;
      // Simulate a change event using a synthetic-compatible approach
      const dataTransfer = new DataTransfer();
      files.forEach((f) => dataTransfer.items.add(f));
      const input = document.createElement("input");
      input.type = "file";
      Object.defineProperty(input, "files", { value: dataTransfer.files });
      onImageUpload({ target: input } as React.ChangeEvent<HTMLInputElement>);
    },
    [onImageUpload]
  );

  const descLength = formData.descricao.length;
  const descMin = 100;
  const descPercent = Math.min(100, Math.round((descLength / descMin) * 100));
  const descReached = descLength >= descMin;

  return (
    <div className="bg-[var(--background-secondary)]/50 cartao p-6">
      <h2 className="text-xl font-serif mb-6 flex items-center gap-3">
        <span className="w-8 h-8 bg-[var(--gold)] rounded-full flex items-center justify-center text-black text-sm font-bold">
          5
        </span>
        {t.vender_cavalo.step_price_title}
      </h2>

      <div className="space-y-6">
        {/* Preço + Localização */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="preco"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {t.vender_cavalo.price_eur} *
            </label>
            <div className="relative">
              <Euro
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
              />
              <input
                id="preco"
                type="number"
                required
                min={0}
                value={formData.preco}
                onChange={(e) => updateField("preco", e.target.value)}
                className="w-full bg-[var(--background-card)] border border-[var(--border)] rounded-lg pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--gold)] transition-colors"
                placeholder="25000"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="regiao"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {tr("Distrito / Região *", "District / Region *", "Distrito / Región *")}
            </label>
            <select
              id="regiao"
              required
              value={formData.regiao}
              onChange={(e) => updateField("regiao", e.target.value)}
              className="campo"
            >
              <option value="">{t.vender_cavalo.select}</option>
              {regioesPT.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="localizacao"
            className="block text-sm text-[var(--foreground-secondary)] mb-1"
          >
            {t.vender_cavalo.location} *
            <span className="text-[var(--foreground-muted)] text-xs ml-1">
              (localidade ou coudelaria)
            </span>
          </label>
          <input
            id="localizacao"
            type="text"
            required
            minLength={3}
            value={formData.localizacao}
            onChange={(e) => updateField("localizacao", e.target.value)}
            className="campo"
            placeholder={t.vender_cavalo.placeholder_location}
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <label
            htmlFor="negociavel"
            className="flex items-center gap-3 cursor-pointer touch-manipulation"
          >
            <input
              id="negociavel"
              type="checkbox"
              checked={formData.negociavel}
              onChange={(e) => updateField("negociavel", e.target.checked)}
              className="w-5 h-5 accent-[var(--gold)]"
            />
            <span className="text-sm">{t.vender_cavalo.price_negotiable}</span>
          </label>
          <label
            htmlFor="aceita_troca"
            className="flex items-center gap-3 cursor-pointer touch-manipulation"
          >
            <input
              id="aceita_troca"
              type="checkbox"
              checked={formData.aceita_troca}
              onChange={(e) => updateField("aceita_troca", e.target.checked)}
              className="w-5 h-5 accent-[var(--gold)]"
            />
            <span className="text-sm">{t.vender_cavalo.accepts_trade}</span>
          </label>
          <label
            htmlFor="transporte_incluido"
            className="flex items-center gap-3 cursor-pointer touch-manipulation"
          >
            <input
              id="transporte_incluido"
              type="checkbox"
              checked={formData.transporte_incluido}
              onChange={(e) => updateField("transporte_incluido", e.target.checked)}
              className="w-5 h-5 accent-[var(--gold)]"
            />
            <span className="text-sm">
              {tr(
                "Transporte incluído no preço",
                "Transport included in price",
                "Transporte incluido en el precio"
              )}
            </span>
          </label>
          <label
            htmlFor="trial_possivel"
            className="flex items-center gap-3 cursor-pointer touch-manipulation"
          >
            <input
              id="trial_possivel"
              type="checkbox"
              checked={formData.trial_possivel}
              onChange={(e) => updateField("trial_possivel", e.target.checked)}
              className="w-5 h-5 accent-[var(--gold)]"
            />
            <span className="text-sm">
              {tr(
                "Trial / Período de prova possível",
                "Trial period possible",
                "Período de prueba posible"
              )}
            </span>
          </label>
          <label
            htmlFor="financiamento_possivel"
            className="flex items-center gap-3 cursor-pointer touch-manipulation"
          >
            <input
              id="financiamento_possivel"
              type="checkbox"
              checked={formData.financiamento_possivel}
              onChange={(e) => updateField("financiamento_possivel", e.target.checked)}
              className="w-5 h-5 accent-[var(--gold)]"
            />
            <span className="text-sm">
              {tr(
                "Financiamento / pagamento parcelado disponível",
                "Financing / instalment payment available",
                "Financiación / pago a plazos disponible"
              )}
            </span>
          </label>
          <label
            htmlFor="exportacao_possivel"
            className="flex items-center gap-3 cursor-pointer touch-manipulation"
          >
            <input
              id="exportacao_possivel"
              type="checkbox"
              checked={formData.exportacao_possivel}
              onChange={(e) => updateField("exportacao_possivel", e.target.checked)}
              className="w-5 h-5 accent-[var(--gold)]"
            />
            <span className="text-sm">
              {tr(
                "Exportação possível (documentação disponível)",
                "Export possible (documentation available)",
                "Exportación posible (documentación disponible)"
              )}
            </span>
          </label>
          <label
            htmlFor="acompanhamento_pos_venda"
            className="flex items-center gap-3 cursor-pointer touch-manipulation"
          >
            <input
              id="acompanhamento_pos_venda"
              type="checkbox"
              checked={formData.acompanhamento_pos_venda}
              onChange={(e) => updateField("acompanhamento_pos_venda", e.target.checked)}
              className="w-5 h-5 accent-[var(--gold)]"
            />
            <span className="text-sm">
              {tr(
                "Acompanhamento pós-venda oferecido",
                "After-sales support offered",
                "Acompañamiento postventa ofrecido"
              )}
            </span>
          </label>
          <label
            htmlFor="internato_possivel"
            className="flex items-center gap-3 cursor-pointer touch-manipulation"
          >
            <input
              id="internato_possivel"
              type="checkbox"
              checked={formData.internato_possivel}
              onChange={(e) => updateField("internato_possivel", e.target.checked)}
              className="w-5 h-5 accent-[var(--gold)]"
            />
            <span className="text-sm">
              {tr(
                "Internato possível (cavalo permanece na coudelaria durante adaptação)",
                "Livery possible (horse remains at the stud during negotiation)",
                "Internado posible (el caballo permanece en el criadero durante la negociación)"
              )}
            </span>
          </label>
          <label
            htmlFor="aulas_incluidas"
            className="flex items-center gap-3 cursor-pointer touch-manipulation"
          >
            <input
              id="aulas_incluidas"
              type="checkbox"
              checked={formData.aulas_incluidas}
              onChange={(e) => updateField("aulas_incluidas", e.target.checked)}
              className="w-5 h-5 accent-[var(--gold)]"
            />
            <span className="text-sm">
              {tr(
                "Aulas de equitação incluídas na venda",
                "Riding lessons included in the sale",
                "Clases de equitación incluidas en la venta"
              )}
            </span>
          </label>
          {formData.sexo === "Garanhão" && (
            <label
              htmlFor="disponivel_cobricao"
              className="flex items-center gap-3 cursor-pointer touch-manipulation"
            >
              <input
                id="disponivel_cobricao"
                type="checkbox"
                checked={formData.disponivel_cobricao}
                onChange={(e) => updateField("disponivel_cobricao", e.target.checked)}
                className="w-5 h-5 accent-[var(--gold)]"
              />
              <span className="text-sm">
                {tr(
                  "Disponível para cobrição",
                  "Available for covering",
                  "Disponible para cubrición"
                )}
              </span>
            </label>
          )}
        </div>

        {formData.trial_possivel && (
          <div>
            <label
              htmlFor="duracao_trial"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {tr("Duração do Trial", "Trial Duration", "Duración del Período de Prueba")}
            </label>
            <select
              id="duracao_trial"
              value={formData.duracao_trial}
              onChange={(e) => updateField("duracao_trial", e.target.value)}
              className="campo"
            >
              <option value="">{t.vender_cavalo.select}</option>
              {duracoesTrialOpcoes.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}

        {formData.sexo === "Garanhão" && formData.disponivel_cobricao && (
          <div>
            <label
              htmlFor="preco_cobricao"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {tr("Preço de Cobrição (€)", "Covering Fee (€)", "Precio de Cubrición (€)")}
            </label>
            <div className="relative">
              <Euro
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
              />
              <input
                id="preco_cobricao"
                type="number"
                min={0}
                value={formData.preco_cobricao}
                onChange={(e) => updateField("preco_cobricao", e.target.value)}
                className="w-full bg-[var(--background-card)] border border-[var(--border)] rounded-lg pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--gold)] transition-colors"
                placeholder="500"
              />
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="disponibilidade_visita"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {t.vender_cavalo.visit_availability}
            </label>
            <select
              id="disponibilidade_visita"
              value={formData.disponibilidade_visita}
              onChange={(e) => updateField("disponibilidade_visita", e.target.value)}
              className="campo"
            >
              <option value="">{t.vender_cavalo.select}</option>
              {disponibilidades.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="motivo_venda"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {tr("Motivo da Venda", "Reason for Sale", "Motivo de la Venta")}
              <span className="text-[var(--foreground-muted)] text-xs ml-1">
                {tr("(opcional)", "(optional)", "(opcional)")}
              </span>
            </label>
            <select
              id="motivo_venda"
              value={formData.motivo_venda}
              onChange={(e) => updateField("motivo_venda", e.target.value)}
              className="campo"
            >
              <option value="">{t.vender_cavalo.select}</option>
              {(motivosVenda[language] || motivosVenda.pt).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="equipamento_incluido"
            className="block text-sm text-[var(--foreground-secondary)] mb-1"
          >
            {tr(
              "Equipamento Incluído na Venda",
              "Equipment Included in Sale",
              "Equipamiento Incluido en la Venta"
            )}
            <span className="text-[var(--foreground-muted)] text-xs ml-1">
              (sela, cabeçada, mantas, etc.)
            </span>
          </label>
          <input
            id="equipamento_incluido"
            type="text"
            value={formData.equipamento_incluido}
            onChange={(e) => updateField("equipamento_incluido", e.target.value)}
            className="campo"
            placeholder="Ex: Sela Pessoa + 2 mantas + cabeçada de couro"
          />
        </div>

        <label
          htmlFor="aceita_visita_veterinario"
          className="flex items-center gap-3 cursor-pointer touch-manipulation"
        >
          <input
            id="aceita_visita_veterinario"
            type="checkbox"
            checked={formData.aceita_visita_veterinario}
            onChange={(e) => updateField("aceita_visita_veterinario", e.target.checked)}
            className="w-5 h-5 accent-[var(--gold)]"
          />
          <span className="text-sm">
            {tr(
              "Aceita exame de pré-compra por veterinário do comprador",
              "Accepts pre-purchase exam by buyer's veterinarian",
              "Acepta examen de pre-compra por veterinario del comprador"
            )}
          </span>
        </label>

        {/* Fotos */}
        <div className="border-t border-[var(--border)] pt-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-medium text-[var(--foreground)] flex items-center gap-2">
              <Camera size={16} className="text-[var(--gold)]" />
              {t.vender_cavalo.photos_title} *
            </h3>
            <span className="text-xs text-[var(--foreground-muted)]">
              {imagens.length}/{maxImages} &middot; {t.vender_cavalo.photos_min_req}
            </span>
          </div>
          <p className="text-xs text-[var(--foreground-muted)] mb-4">
            {t.vender_cavalo.photos_tip}
          </p>

          {/* Progresso de imagens */}
          <div className="h-1 bg-[var(--background-card)] rounded-full mb-4">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                imagens.length >= MIN_IMAGES ? "bg-[var(--gold)]" : "bg-[var(--foreground-muted)]"
              }`}
              style={{ width: `${Math.min(100, (imagens.length / MIN_IMAGES) * 100)}%` }}
            />
          </div>

          {/* Grid de pré-visualizações */}
          {imagens.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
              {imagens.map((img, i) => (
                <div
                  key={i}
                  className="aspect-square bg-[var(--background-card)] rounded-lg relative overflow-hidden group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(img)}
                    alt={`Foto ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <button
                    onClick={() => onRemoveImage(i)}
                    className="absolute top-1 right-1 p-1 bg-red-500/90 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 touch-manipulation"
                    aria-label={`Remover foto ${i + 1}`}
                  >
                    <X size={12} />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 text-[10px] uppercase tracking-wider bg-black/60 text-[var(--gold)] px-1.5 py-0.5 rounded">
                      {t.vender_cavalo.photo_main}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Drag & drop area */}
          {imagens.length < maxImages && (
            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-3 w-full py-8 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 touch-manipulation ${
                isDragging
                  ? "border-[var(--gold)] bg-[var(--gold)]/5"
                  : "border-[var(--border)] hover:border-[var(--gold)]/50 hover:bg-[var(--background-card)]/50"
              }`}
            >
              <div className="w-10 h-10 border border-[var(--border)] rounded-lg flex items-center justify-center">
                {isDragging ? (
                  <ImagePlus size={20} className="text-[var(--gold)]" />
                ) : (
                  <Upload size={18} className="text-[var(--foreground-muted)]" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm text-[var(--foreground-secondary)]">
                  {isDragging ? t.vender_cavalo.drop_here : t.vender_cavalo.drag_or_click}
                </p>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  JPG, PNG, WEBP &middot;{" "}
                  {t.vender_cavalo.max_images_hint.replace("{max}", String(maxImages))}
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onImageUpload}
              />
            </label>
          )}
        </div>

        {/* Descrição com contador de progresso */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="descricao" className="block text-sm text-[var(--foreground-secondary)]">
              {t.vender_cavalo.description} *
            </label>
            <span
              className={`text-xs transition-colors ${
                descReached ? "text-[var(--gold)]" : "text-[var(--foreground-muted)]"
              }`}
            >
              {descLength}/{descMin}
            </span>
          </div>
          <textarea
            id="descricao"
            required
            minLength={100}
            value={formData.descricao}
            onChange={(e) => updateField("descricao", e.target.value)}
            className="campo h-40 resize-none transition-colors"
            placeholder={t.vender_cavalo.placeholder_description}
          />
          {/* Barra de progresso do texto */}
          <div className="mt-1.5 h-0.5 bg-[var(--background-card)] rounded-full">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                descReached ? "bg-[var(--gold)]" : "bg-[var(--foreground-muted)]/40"
              }`}
              style={{ width: `${descPercent}%` }}
            />
          </div>
        </div>

        {/* Vídeos */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="videos_url"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {t.vender_cavalo.video_link}
              <span className="text-[var(--foreground-muted)] text-xs ml-1">(vídeo 1)</span>
            </label>
            <input
              id="videos_url"
              type="url"
              value={formData.videos_url}
              onChange={(e) => updateField("videos_url", e.target.value)}
              className="campo"
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
          <div>
            <label
              htmlFor="videos_url_2"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {t.vender_cavalo.video_link}
              <span className="text-[var(--foreground-muted)] text-xs ml-1">(vídeo 2)</span>
            </label>
            <input
              id="videos_url_2"
              type="url"
              value={formData.videos_url_2}
              onChange={(e) => updateField("videos_url_2", e.target.value)}
              className="campo"
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
