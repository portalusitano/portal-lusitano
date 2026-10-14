"use client";

import { DollarSign, TrendingUp, Repeat, ShoppingCart } from "lucide-react";

interface OverviewData {
  overview: {
    totalRevenue: number;
    thisMonthRevenue: number;
    lastMonthRevenue: number;
    growthPercentage: number;
    mrr: number;
    averageTicket: number;
    totalTransactions: number;
  };
}

interface OverviewCardsProps {
  data: OverviewData | null;
}

export default function OverviewCards({ data }: OverviewCardsProps) {
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Receita Total */}
      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Receita Total</h3>
          <DollarSign className="text-[var(--gold)]" size={20} />
        </div>
        <p className="text-3xl font-bold text-white">
          €
          {data.overview.totalRevenue.toLocaleString("pt-PT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
        <p className="text-xs text-gray-500 mt-1">Desde o início</p>
      </div>

      {/* Receita Este Mês */}
      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Este Mês</h3>
          <TrendingUp className="text-green-500" size={20} />
        </div>
        <p className="text-3xl font-bold text-white">
          €
          {data.overview.thisMonthRevenue.toLocaleString("pt-PT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
        <p
          className={`text-xs mt-1 ${
            data.overview.growthPercentage >= 0 ? "text-green-500" : "text-red-500"
          }`}
        >
          {data.overview.growthPercentage >= 0 ? "+" : ""}
          {data.overview.growthPercentage.toFixed(1)}% vs mês passado
        </p>
      </div>

      {/* MRR */}
      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">MRR</h3>
          <Repeat className="text-[var(--gold)]" size={20} />
        </div>
        <p className="text-3xl font-bold text-white">
          €
          {data.overview.mrr.toLocaleString("pt-PT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
        <p className="text-xs text-gray-500 mt-1">Receita recorrente mensal</p>
      </div>

      {/* Transações */}
      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Transações</h3>
          <ShoppingCart className="text-[var(--gold)]" size={20} />
        </div>
        <p className="text-3xl font-bold text-white">{data.overview.totalTransactions}</p>
        <p className="text-xs text-gray-500 mt-1">
          Ticket médio: €{data.overview.averageTicket.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
