"use client";

import { useState } from "react";
import {
  Users,
  Mail,
  Phone,
  CreditCard,
  CheckCircle,
  TrendingDown,
  AlertCircle,
} from "lucide-react";

interface FunnelStage {
  id: string;
  label: string;
  count: number;
  icon: typeof Users;
  color: string;
}

interface ConversionFunnelProps {
  stages: FunnelStage[];
  title?: string;
  showPercentages?: boolean;
  showDropoff?: boolean;
}

export default function ConversionFunnel({
  stages,
  title = "Funil de Conversão",
  showPercentages = true,
  showDropoff = true,
}: ConversionFunnelProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Calcular total inicial
  const totalStart = stages[0]?.count || 1;

  // Calcular percentagens e drop-off
  const stagesWithMetrics = stages.map((stage, index) => {
    const percentage = (stage.count / totalStart) * 100;
    const previousCount = index > 0 ? stages[index - 1].count : stage.count;
    const dropoff = index > 0 ? previousCount - stage.count : 0;
    const dropoffPercentage = index > 0 ? (dropoff / previousCount) * 100 : 0;
    const conversionRate = index > 0 ? (stage.count / previousCount) * 100 : 100;

    return {
      ...stage,
      percentage,
      dropoff,
      dropoffPercentage,
      conversionRate,
    };
  });

  // Calcular taxa de conversão geral
  const overallConversion =
    stages.length > 0 ? (stages[stages.length - 1].count / totalStart) * 100 : 0;

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
          <p className="text-gray-400 text-sm">
            Taxa de conversão geral:{" "}
            <span className="text-[var(--gold)] font-semibold">
              {overallConversion.toFixed(1)}%
            </span>
          </p>
        </div>
      </div>

      {/* Funil Visual */}
      <div className="space-y-4">
        {stagesWithMetrics.map((stage, index) => {
          const Icon = stage.icon;
          const isHovered = hoveredIndex === index;
          const widthPercentage = (stage.count / totalStart) * 100;

          return (
            <div key={stage.id}>
              {/* Estágio */}
              <div
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="relative"
              >
                {/* Barra do funil */}
                <div
                  className={`
                    relative rounded-xl transition-all duration-300
                    ${isHovered ? "scale-[1.02]" : ""}
                  `}
                  style={{
                    width: `${Math.max(widthPercentage, 10)}%`,
                    marginLeft: "auto",
                    marginRight: "auto",
                  }}
                >
                  <div
                    className={`
                      flex items-center gap-4 px-6 py-4 rounded-xl border-2
                      transition-all cursor-pointer
                      ${stage.color}
                      ${isHovered ? "shadow-2xl" : "shadow-lg"}
                    `}
                  >
                    {/* Icon */}
                    <div className="w-12 h-12 bg-black/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-lg mb-1">{stage.label}</h3>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-semibold">
                          {stage.count.toLocaleString("pt-PT")} utilizadores
                        </span>
                        {showPercentages && (
                          <span className="opacity-75">
                            {stage.percentage.toFixed(1)}% do total
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Taxa de Conversão para próximo estágio */}
                    {index < stages.length - 1 && (
                      <div className="flex-shrink-0 text-right">
                        <p className="text-2xl font-bold">{stage.conversionRate.toFixed(0)}%</p>
                        <p className="text-xs opacity-75">conversão</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tooltip no hover */}
                {isHovered && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-10 bg-black border border-white/20 rounded-lg px-4 py-3 shadow-2xl min-w-[250px]">
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total:</span>
                        <span className="text-white font-semibold">
                          {stage.count.toLocaleString("pt-PT")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">% do início:</span>
                        <span className="text-white font-semibold">
                          {stage.percentage.toFixed(1)}%
                        </span>
                      </div>
                      {index > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Taxa conversão:</span>
                            <span className="text-green-400 font-semibold">
                              {stage.conversionRate.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Perdidos:</span>
                            <span className="text-red-400 font-semibold">
                              {stage.dropoff.toLocaleString("pt-PT")}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Drop-off entre estágios */}
              {showDropoff && index < stages.length - 1 && stage.dropoff > 0 && (
                <div className="flex items-center justify-center gap-2 py-3">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400 font-medium">
                    -{stage.dropoff.toLocaleString("pt-PT")} ({stage.dropoffPercentage.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Insights */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/20 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-400 mb-1">Maior Drop-off</p>
            <p className="text-lg font-bold text-red-400">
              {Math.max(...stagesWithMetrics.map((s) => s.dropoffPercentage)).toFixed(1)}%
            </p>
          </div>
          <div className="bg-black/20 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-400 mb-1">Melhor Conversão</p>
            <p className="text-lg font-bold text-green-400">
              {Math.max(
                ...stagesWithMetrics.filter((_, i) => i > 0).map((s) => s.conversionRate)
              ).toFixed(1)}
              %
            </p>
          </div>
          <div className="bg-black/20 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-400 mb-1">Conversão Final</p>
            <p className="text-lg font-bold text-[var(--gold)]">{overallConversion.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Funis pré-configurados
export const funnelPresets = {
  ecommerce: [
    {
      id: "visitors",
      label: "Visitantes",
      count: 0,
      icon: Users,
      color: "bg-blue-500/20 border-blue-500/30",
    },
    {
      id: "viewed",
      label: "Viram Produto",
      count: 0,
      icon: Mail,
      color: "bg-purple-500/20 border-purple-500/30",
    },
    {
      id: "cart",
      label: "Adicionaram ao Carrinho",
      count: 0,
      icon: Phone,
      color: "bg-yellow-500/20 border-yellow-500/30",
    },
    {
      id: "checkout",
      label: "Iniciaram Checkout",
      count: 0,
      icon: CreditCard,
      color: "bg-orange-500/20 border-orange-500/30",
    },
    {
      id: "purchase",
      label: "Compraram",
      count: 0,
      icon: CheckCircle,
      color: "bg-green-500/20 border-green-500/30",
    },
  ],

  leads: [
    {
      id: "visitors",
      label: "Visitantes do Site",
      count: 0,
      icon: Users,
      color: "bg-blue-500/20 border-blue-500/30",
    },
    {
      id: "engaged",
      label: "Interagiram",
      count: 0,
      icon: Mail,
      color: "bg-purple-500/20 border-purple-500/30",
    },
    {
      id: "leads",
      label: "Tornaram-se Leads",
      count: 0,
      icon: Phone,
      color: "bg-yellow-500/20 border-yellow-500/30",
    },
    {
      id: "contacted",
      label: "Foram Contactados",
      count: 0,
      icon: CreditCard,
      color: "bg-orange-500/20 border-orange-500/30",
    },
    {
      id: "customers",
      label: "Viraram Clientes",
      count: 0,
      icon: CheckCircle,
      color: "bg-green-500/20 border-green-500/30",
    },
  ],
};
