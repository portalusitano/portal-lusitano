"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ComparisonData {
  current: number;
  previous: number;
  label: string;
  format?: "currency" | "number" | "percentage";
}

interface TemporalComparisonProps {
  data: ComparisonData;
  period?: "month" | "year" | "week" | "day";
}

export default function TemporalComparison({ data, period = "month" }: TemporalComparisonProps) {
  const { current, previous, label, format = "number" } = data;

  // Calcular diferença e crescimento
  const difference = current - previous;
  const growthPercentage = previous !== 0 ? (difference / previous) * 100 : 0;
  const isPositive = difference > 0;
  const isNeutral = difference === 0;

  // Formatar valor
  const formatValue = (value: number) => {
    switch (format) {
      case "currency":
        return `€${(value / 100).toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;
      case "percentage":
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString("pt-PT");
    }
  };

  // Label do período
  const getPeriodLabel = () => {
    const labels = {
      month: { current: "Este Mês", previous: "Mês Anterior" },
      year: { current: "Este Ano", previous: "Ano Anterior" },
      week: { current: "Esta Semana", previous: "Semana Anterior" },
      day: { current: "Hoje", previous: "Ontem" },
    };
    return labels[period];
  };

  const periodLabels = getPeriodLabel();

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-xl p-6 hover:shadow-lg transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{label}</h3>
        {isNeutral ? (
          <div className="flex items-center gap-1.5 text-gray-400">
            <Minus className="w-5 h-5" />
          </div>
        ) : isPositive ? (
          <div className="flex items-center gap-1.5 text-green-400">
            <TrendingUp className="w-5 h-5" />
            <span className="font-bold">+{growthPercentage.toFixed(1)}%</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-red-400">
            <TrendingDown className="w-5 h-5" />
            <span className="font-bold">{growthPercentage.toFixed(1)}%</span>
          </div>
        )}
      </div>

      {/* Valores */}
      <div className="space-y-4">
        {/* Valor Atual */}
        <div>
          <p className="text-sm text-gray-400 mb-1">{periodLabels.current}</p>
          <p className="text-3xl font-bold text-white">{formatValue(current)}</p>
        </div>

        {/* Divisor com seta */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10"></div>
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-400" />
          ) : isNeutral ? (
            <Minus className="w-4 h-4 text-gray-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
          <div className="flex-1 h-px bg-white/10"></div>
        </div>

        {/* Valor Anterior */}
        <div>
          <p className="text-sm text-gray-400 mb-1">{periodLabels.previous}</p>
          <p className="text-xl font-semibold text-gray-400">{formatValue(previous)}</p>
        </div>

        {/* Diferença */}
        <div
          className={`
          flex items-center justify-between px-4 py-3 rounded-lg border-2
          ${
            isNeutral
              ? "bg-gray-500/10 border-gray-500/20"
              : isPositive
                ? "bg-green-500/10 border-green-500/20"
                : "bg-red-500/10 border-red-500/20"
          }
        `}
        >
          <span className="text-sm text-gray-300">Diferença</span>
          <span
            className={`text-lg font-bold ${
              isNeutral ? "text-gray-400" : isPositive ? "text-green-400" : "text-red-400"
            }`}
          >
            {isPositive && "+"}
            {formatValue(difference)}
          </span>
        </div>
      </div>

      {/* Barra de progresso visual */}
      <div className="mt-4">
        <div className="h-2 bg-black/30 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isPositive ? "bg-green-500" : isNeutral ? "bg-gray-500" : "bg-red-500"
            }`}
            style={{
              width: `${Math.min(Math.abs(growthPercentage), 100)}%`,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}

// Componente de Grid de Comparações
interface ComparisonGridProps {
  comparisons: ComparisonData[];
  period?: "month" | "year" | "week" | "day";
}

export function ComparisonGrid({ comparisons, period = "month" }: ComparisonGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {comparisons.map((data, index) => (
        <TemporalComparison key={index} data={data} period={period} />
      ))}
    </div>
  );
}
