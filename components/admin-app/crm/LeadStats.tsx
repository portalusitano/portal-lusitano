"use client";

import { DollarSign, TrendingUp, User, Calendar } from "lucide-react";
import { CRMStats } from "@/types/lead";
import { formatarEurosInteiros } from "@/lib/format";

interface LeadStatsProps {
  stats: CRMStats | null;
  pipelineValue: number;
  wonValue: number;
}

export default function LeadStats({ stats, pipelineValue, wonValue }: LeadStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <User className="text-[var(--gold)]" size={24} />
          <h3 className="text-sm font-medium text-gray-400">Total Leads</h3>
        </div>
        <p className="text-3xl font-bold text-white">{stats?.total || 0}</p>
      </div>

      <div className="bg-[var(--background-secondary)] border border-green-500/20 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="text-green-500" size={24} />
          <h3 className="text-sm font-medium text-gray-400">Valor Pipeline</h3>
        </div>
        <p className="text-3xl font-bold text-green-500">
          {formatarEurosInteiros(Math.round(pipelineValue))}
        </p>
        <p className="text-xs text-gray-500 mt-1">Valor ponderado por probabilidade</p>
      </div>

      <div className="bg-[var(--background-secondary)] border border-emerald-500/20 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="text-emerald-500" size={24} />
          <h3 className="text-sm font-medium text-gray-400">Vendas Ganhas</h3>
        </div>
        <p className="text-3xl font-bold text-emerald-500">{formatarEurosInteiros(wonValue)}</p>
        <p className="text-xs text-gray-500 mt-1">{stats?.ganho || 0} negócios fechados</p>
      </div>

      <div className="bg-[var(--background-secondary)] border border-orange-500/20 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="text-orange-500" size={24} />
          <h3 className="text-sm font-medium text-gray-400">Taxa de Conversão</h3>
        </div>
        <p className="text-3xl font-bold text-orange-500">
          {stats && stats.total > 0 ? ((stats.ganho / stats.total) * 100).toFixed(1) : "0.0"}%
        </p>
        <p className="text-xs text-gray-500 mt-1">Leads → Vendas</p>
      </div>
    </div>
  );
}
