"use client";

import { Users, Target, DollarSign, TrendingUp } from "lucide-react";

interface ConversionsOverview {
  totalViews: number;
  totalLeads: number;
  uniqueCustomers: number;
  visitorToLeadRate: number;
  leadToCustomerRate: number;
  revenuePerLead: number;
}

interface MetricsGridProps {
  overview: ConversionsOverview;
  formatNumber: (num: number) => string;
}

export default function MetricsGrid({ overview, formatNumber }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Visitantes</h3>
          <Users className="text-blue-500" size={20} />
        </div>
        <p className="text-3xl font-bold text-white">{formatNumber(overview.totalViews)}</p>
        <p className="text-xs text-gray-500 mt-1">Total visualizações</p>
      </div>

      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Leads</h3>
          <Target className="text-green-500" size={20} />
        </div>
        <p className="text-3xl font-bold text-white">{formatNumber(overview.totalLeads)}</p>
        <p className="text-xs text-green-500 mt-1">
          {overview.visitorToLeadRate.toFixed(2)}% conversão
        </p>
      </div>

      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Clientes</h3>
          <DollarSign className="text-[var(--gold)]" size={20} />
        </div>
        <p className="text-3xl font-bold text-white">{formatNumber(overview.uniqueCustomers)}</p>
        <p className="text-xs text-[var(--gold)] mt-1">
          {overview.leadToCustomerRate.toFixed(2)}% conversão
        </p>
      </div>

      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">LTV por Lead</h3>
          <TrendingUp className="text-purple-500" size={20} />
        </div>
        <p className="text-3xl font-bold text-white">€{overview.revenuePerLead.toFixed(2)}</p>
        <p className="text-xs text-gray-500 mt-1">Lifetime Value</p>
      </div>
    </div>
  );
}
