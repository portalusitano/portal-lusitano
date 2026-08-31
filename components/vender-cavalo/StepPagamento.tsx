"use client";

import { useMemo } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { CreditCard, Shield, Check, Clock, Camera, Star } from "lucide-react";
import type { FormData } from "@/components/vender-cavalo/types";
import { LISTING_TIERS } from "@/lib/listing-tiers";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";

interface StepPagamentoProps {
  formData: FormData;
  imagens: File[];
  selectedTier: string;
  termsAccepted: boolean;
  onTermsChange: (checked: boolean) => void;
  loading: boolean;
  onSubmit: () => void;
}

export default function StepPagamento({
  formData,
  imagens,
  selectedTier,
  termsAccepted,
  onTermsChange,
  loading,
  onSubmit,
}: StepPagamentoProps) {
  const { t, language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);
  const tier = LISTING_TIERS[selectedTier] || LISTING_TIERS.standard;
  const precoTotal = tier.priceInCents / 100;

  const durationLabel =
    tier.durationDays === 15
      ? tr("15 dias", "15 days", "15 días")
      : tier.durationDays === 30
        ? tr("30 dias", "30 days", "30 días")
        : tr("60 dias", "60 days", "60 días");

  const photosLabel =
    tier.maxPhotos === -1 ? tr("Ilimitadas", "Unlimited", "Ilimitadas") : `${tier.maxPhotos}`;

  const isDestaque = selectedTier === "destaque" || selectedTier === "premium";

  return (
    <div className="bg-[var(--background-secondary)]/50 cartao p-6">
      <h2 className="text-xl mb-6 flex items-center gap-3">
        <span className="w-8 h-8 bg-[var(--foreground-strong)] rounded-full flex items-center justify-center text-black text-sm font-bold">
          6
        </span>
        {t.vender_cavalo.step_payment_title}
      </h2>

      {/* Resumo do cavalo */}
      <div className="bg-[var(--background-card)]/50 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium mb-4">{t.vender_cavalo.ad_summary}</h3>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-[var(--foreground-muted)]">{t.vender_cavalo.summary_horse}:</span>
          <span>{formData.nome || "-"}</span>
          <span className="text-[var(--foreground-muted)]">
            {t.vender_cavalo.summary_registration}:
          </span>
          <span>{formData.numero_registo || "-"}</span>
          <span className="text-[var(--foreground-muted)]">{t.vender_cavalo.summary_price}:</span>
          <span>{formData.preco ? `${parseInt(formData.preco).toLocaleString()}€` : "-"}</span>
          <span className="text-[var(--foreground-muted)]">
            {t.vender_cavalo.summary_location}:
          </span>
          <span>{formData.localizacao || "-"}</span>
          <span className="text-[var(--foreground-muted)]">{t.vender_cavalo.summary_photos}:</span>
          <span>
            {imagens.length} {t.vender_cavalo.photos_count}
          </span>
        </div>
      </div>

      {/* Resumo do Tier Seleccionado */}
      <div className="border border-[var(--border-soft)] rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star
              size={16}
              className={
                isDestaque
                  ? "text-[var(--foreground-muted)] fill-current"
                  : "text-[var(--foreground-muted)]"
              }
            />
            <span className="font-semibold">
              {tr("Plano", "Plan", "Plan")} {tier.name}
            </span>
            {tier.badge && (
              <span className="px-2 py-0.5 bg-[var(--elevate-1)] text-[var(--foreground-muted)] text-[10px] font-bold uppercase tracking-wider rounded">
                {tier.badge}
              </span>
            )}
          </div>
          <span className="text-xl font-bold text-[var(--foreground-muted)]">{precoTotal}€</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-[var(--foreground-secondary)]">
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-[var(--foreground-muted)]" />
            {durationLabel}
          </div>
          <div className="flex items-center gap-1.5">
            <Camera size={12} className="text-[var(--foreground-muted)]" />
            {photosLabel} {tr("fotos", "photos", "fotos")}
          </div>
          {isDestaque && (
            <div className="flex items-center gap-1.5">
              <Check size={12} className="text-[var(--foreground-muted)]" />
              {tr("Destaque incluído", "Featured included", "Destacado incluido")}
            </div>
          )}
        </div>
      </div>

      {/* Preço Total */}
      <div className="bg-[var(--elevate-1)] border border-[var(--border-soft)] rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-[var(--foreground-secondary)]">
              {t.vender_cavalo.total_to_pay}
            </span>
            <div className="text-2xl font-bold text-[var(--foreground-muted)]">{precoTotal}€</div>
          </div>
          <CreditCard size={32} className="text-[var(--foreground-muted)]" />
        </div>
        <div className="text-xs text-[var(--foreground-muted)] mt-2">
          {tr("Plano", "Plan", "Plan")} {tier.name} — {durationLabel}
        </div>
      </div>

      {/* Termos */}
      <div className="mb-6">
        <label
          htmlFor="termos_aceites"
          className="flex items-start gap-3 cursor-pointer touch-manipulation"
        >
          <input
            id="termos_aceites"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => onTermsChange(e.target.checked)}
            className="w-5 h-5 accent-[var(--foreground-strong)] mt-0.5"
          />
          <span className="text-sm text-[var(--foreground-secondary)]">
            {t.vender_cavalo.terms_agree}{" "}
            <LocalizedLink
              href="/termos"
              className="text-[var(--foreground-muted)] hover:underline"
            >
              {t.vender_cavalo.terms_link}
            </LocalizedLink>{" "}
            {t.vender_cavalo.privacy_and}{" "}
            <LocalizedLink
              href="/privacidade"
              className="text-[var(--foreground-muted)] hover:underline"
            >
              {t.vender_cavalo.privacy_link}
            </LocalizedLink>
            . {t.vender_cavalo.terms_confirm}
          </span>
        </label>
      </div>

      {/* Info Verificação */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Shield size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">{t.vender_cavalo.doc_verification_title}</p>
            <p className="text-blue-300/80">{t.vender_cavalo.doc_verification_desc}</p>
          </div>
        </div>
      </div>

      {/* Botão Pagamento */}
      <button
        onClick={onSubmit}
        disabled={loading || !termsAccepted}
        className="w-full py-4 btn btn-primario w-full gap-3 rounded-full disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            {t.vender_cavalo.processing}
          </>
        ) : (
          <>
            <CreditCard size={20} />
            {t.vender_cavalo.pay_and_publish.replace("{price}", `${precoTotal}€`)}
          </>
        )}
      </button>

      <p className="text-center text-xs text-[var(--foreground-muted)] mt-4">
        {t.vender_cavalo.secure_payment}
      </p>
    </div>
  );
}
