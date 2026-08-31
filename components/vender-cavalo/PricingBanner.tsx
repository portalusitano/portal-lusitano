"use client";

import { useMemo } from "react";
import { Check, Star, Crown, Zap } from "lucide-react";
import { LISTING_TIERS, type ListingTier } from "@/lib/listing-tiers";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";

interface PricingBannerProps {
  selectedTier: string;
  onTierChange: (tierId: string) => void;
}

const TIER_ORDER = ["basico", "standard", "destaque", "premium"] as const;

const TIER_ICONS: Record<string, React.ReactNode> = {
  basico: <Zap size={18} />,
  standard: <Star size={18} />,
  destaque: <Star size={18} className="fill-current" />,
  premium: <Crown size={18} />,
};

export default function PricingBanner({ selectedTier, onTierChange }: PricingBannerProps) {
  const { language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  return (
    <div className="max-w-5xl mx-auto mb-8">
      <h3 className="text-lg text-center mb-6">
        {tr("Escolha o seu plano", "Choose your plan", "Elija su plan")}
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {TIER_ORDER.map((tierId) => {
          const tier = LISTING_TIERS[tierId];
          const isSelected = selectedTier === tierId;
          const isPopular = tierId === "standard";

          return (
            <TierCard
              key={tierId}
              tier={tier}
              tierId={tierId}
              isSelected={isSelected}
              isPopular={isPopular}
              icon={TIER_ICONS[tierId]}
              language={language}
              onClick={() => onTierChange(tierId)}
            />
          );
        })}
      </div>
    </div>
  );
}

function TierCard({
  tier,
  tierId,
  isSelected,
  isPopular,
  icon,
  language,
  onClick,
}: {
  tier: ListingTier;
  tierId: string;
  isSelected: boolean;
  isPopular: boolean;
  icon: React.ReactNode;
  language: string;
  onClick: () => void;
}) {
  const tr = useMemo(() => createTranslator(language), [language]);
  const price = tier.priceInCents / 100;

  const durationLabel =
    tier.durationDays === 15
      ? tr("15 dias", "15 days", "15 días")
      : tier.durationDays === 30
        ? tr("30 dias", "30 days", "30 días")
        : tr("60 dias", "60 days", "60 días");

  const photosLabel =
    tier.maxPhotos === -1
      ? tr("Fotos ilimitadas", "Unlimited photos", "Fotos ilimitadas")
      : tr(
          `Até ${tier.maxPhotos} fotos`,
          `Up to ${tier.maxPhotos} photos`,
          `Hasta ${tier.maxPhotos} fotos`
        );

  const featuredLabel =
    tier.featuredDays > 0
      ? tr(
          `Destaque ${tier.featuredDays} dias`,
          `Featured ${tier.featuredDays} days`,
          `Destacado ${tier.featuredDays} días`
        )
      : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col p-4 sm:p-5 rounded-xl border-2 transition-all duration-300 text-left cursor-pointer touch-manipulation ${
        isSelected
          ? "border-[var(--gold)] bg-[var(--elevate-1)] shadow-[0_0_20px_rgb(var(--gold-rgb) / 0.15)]"
          : "border-[var(--border)] bg-[var(--background-secondary)]/50 hover:border-[var(--border-hover)]"
      }`}
    >
      {/* Popular badge */}
      {isPopular && (
        <span className="selo selo-destaque absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full whitespace-nowrap">
          {tr("Popular", "Popular", "Popular")}
        </span>
      )}

      {/* Selection indicator */}
      <div
        className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          isSelected
            ? "border-[var(--gold)] bg-[var(--gold)]"
            : "border-[var(--foreground-muted)]/30"
        }`}
      >
        {isSelected && <Check size={12} className="text-black" />}
      </div>

      {/* Icon + Name */}
      <div className="flex items-center gap-2 mb-3 mt-1">
        <span className={isSelected ? "text-[var(--gold)]" : "text-[var(--foreground-muted)]"}>
          {icon}
        </span>
        <span className="font-semibold text-sm sm:text-base">{tier.name}</span>
        {tier.badge && (
          <span className="px-1.5 py-0.5 bg-[var(--elevate-1)] text-[var(--gold)] text-[11px] font-bold uppercase tracking-wider rounded">
            {tier.badge}
          </span>
        )}
      </div>

      {/* Price */}
      <div className="mb-3">
        <span className="text-2xl sm:text-3xl font-bold text-[var(--gold)]">{price}€</span>
        <span className="text-xs text-[var(--foreground-muted)] ml-1">
          {tr("único", "one-time", "único")}
        </span>
      </div>

      {/* Features */}
      <ul className="space-y-1.5 text-xs sm:text-sm text-[var(--foreground-secondary)]">
        <li className="flex items-center gap-2">
          <Check size={12} className="text-[var(--gold)] flex-shrink-0" />
          {durationLabel}
        </li>
        <li className="flex items-center gap-2">
          <Check size={12} className="text-[var(--gold)] flex-shrink-0" />
          {photosLabel}
        </li>
        {featuredLabel && (
          <li className="flex items-center gap-2">
            <Check size={12} className="text-[var(--gold)] flex-shrink-0" />
            {featuredLabel}
          </li>
        )}
        {tierId === "premium" && (
          <li className="flex items-center gap-2">
            <Check size={12} className="text-[var(--gold)] flex-shrink-0" />
            {tr("Promoção redes sociais", "Social media promotion", "Promoción redes sociales")}
          </li>
        )}
      </ul>
    </button>
  );
}
