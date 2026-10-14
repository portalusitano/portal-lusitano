"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users, DollarSign, Target, ArrowRight } from "lucide-react";

interface TrafficData {
  overview: {
    totalViews: number;
    totalCavalosViews: number;
    totalEventosViews: number;
    averageViewsPerContent: number;
    totalLeads: number;
    recentLeads: number;
    leadsGrowth: number;
  };
  topCavalos: Array<{ id: string; name: string; views: number }>;
  topEventos: Array<{ id: string; name: string; views: number }>;
  trafficSources: Array<{ source: string; count: number }>;
}

interface ConversionsData {
  overview: {
    totalViews: number;
    totalLeads: number;
    uniqueCustomers: number;
    visitorToLeadRate: number;
    leadToCustomerRate: number;
    revenuePerLead: number;
  };
  funnel: Array<{
    stage: string;
    count: number;
    percentage: number;
    label: string;
  }>;
  monthlyConversions: Array<{
    month: string;
    leads: number;
    customers: number;
    conversionRate: string;
  }>;
}

interface SourcesData {
  trafficSources: Array<{ source: string; leads: number; percentage: number }>;
  roiByChannel: Array<{
    source: string;
    revenue: number;
    leads: number;
    revenuePerLead: number;
    estimatedCost: number;
    roi: number;
  }>;
  bestChannel: {
    source: string;
    roi: number;
    revenue: number;
  } | null;
  totalLeads: number;
  totalRevenue: number;
}

export default function AnalyticsContent() {
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [conversions, setConversions] = useState<ConversionsData | null>(null);
  const [sources, setSources] = useState<SourcesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllData = async () => {
    try {
      await Promise.all([loadTraffic(), loadConversions(), loadSources()]);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[AnalyticsContent]", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTraffic = async () => {
    try {
      const res = await fetch("/api/admin/analytics/traffic");
      if (!res.ok) throw new Error("Failed to load traffic data");
      const data = await res.json();
      setTraffic(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[AnalyticsContent]", error);
    }
  };

  const loadConversions = async () => {
    try {
      const res = await fetch("/api/admin/analytics/conversions");
      if (!res.ok) throw new Error("Failed to load conversions data");
      const data = await res.json();
      setConversions(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[AnalyticsContent]", error);
    }
  };

  const loadSources = async () => {
    try {
      const res = await fetch("/api/admin/analytics/sources");
      if (!res.ok) throw new Error("Failed to load sources data");
      const data = await res.json();
      setSources(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[AnalyticsContent]", error);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("pt-PT").format(num);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gold)] mx-auto"></div>
          <p className="text-gray-400 mt-4">A carregar analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Analytics Completo</h1>
          <p className="text-gray-400 mt-1">Tráfego, Conversões e ROI por Canal</p>
        </div>

        {/* SECÇÃO: FUNIL DE CONVERSÃO */}
        {conversions && (
          <>
            <h2 className="text-2xl font-bold text-white mb-6">🎯 Funil de Conversão</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              {/* Cards Overview */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">Visitantes</h3>
                  <Users className="text-blue-500" size={20} />
                </div>
                <p className="text-3xl font-bold text-white">
                  {formatNumber(conversions.overview.totalViews)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Total visualizações</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">Leads</h3>
                  <Target className="text-green-500" size={20} />
                </div>
                <p className="text-3xl font-bold text-white">
                  {formatNumber(conversions.overview.totalLeads)}
                </p>
                <p className="text-xs text-green-500 mt-1">
                  {conversions.overview.visitorToLeadRate.toFixed(2)}% conversão
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">Clientes</h3>
                  <DollarSign className="text-[var(--gold)]" size={20} />
                </div>
                <p className="text-3xl font-bold text-white">
                  {formatNumber(conversions.overview.uniqueCustomers)}
                </p>
                <p className="text-xs text-[var(--gold)] mt-1">
                  {conversions.overview.leadToCustomerRate.toFixed(2)}% conversão
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">LTV por Lead</h3>
                  <TrendingUp className="text-purple-500" size={20} />
                </div>
                <p className="text-3xl font-bold text-white">
                  €{conversions.overview.revenuePerLead.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Lifetime Value</p>
              </div>
            </div>

            {/* Funil Visual */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-8 mb-12">
              <h3 className="text-lg font-semibold text-white mb-6">Visualização do Funil</h3>
              <div className="space-y-4">
                {conversions.funnel.map((stage, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-white font-semibold">{stage.stage}</span>
                        <span className="text-gray-400 text-sm">{stage.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-bold">{formatNumber(stage.count)}</span>
                        <span className="text-[var(--gold)] text-sm font-semibold">
                          {stage.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-12 bg-white/5 rounded-lg overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-hover)] transition-all duration-1000 flex items-center justify-end pr-4"
                        style={{ width: `${stage.percentage}%` }}
                      >
                        <span className="text-black font-bold text-sm">
                          {formatNumber(stage.count)}
                        </span>
                      </div>
                    </div>
                    {index < conversions.funnel.length - 1 && (
                      <div className="flex justify-center my-2">
                        <ArrowRight className="text-gray-600" size={24} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* SECÇÃO: ROI POR CANAL */}
        {sources && (
          <>
            <h2 className="text-2xl font-bold text-white mb-6">💰 ROI por Canal de Marketing</h2>

            {sources.bestChannel && (
              <div className="bg-gradient-to-r from-[var(--gold)]/20 to-[var(--gold)]/5 border-2 border-[var(--gold)]/30 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">🏆</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-[var(--gold)] mb-2">
                      Melhor Canal: {sources.bestChannel.source}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">ROI</p>
                        <p className="text-2xl font-bold text-white">
                          {sources.bestChannel.roi.toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Receita Gerada</p>
                        <p className="text-2xl font-bold text-white">
                          €{sources.bestChannel.revenue.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
              {/* Tabela ROI */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">ROI Detalhado por Canal</h3>
                <div className="space-y-3">
                  {sources.roiByChannel.slice(0, 5).map((channel, index) => (
                    <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-white">{channel.source}</span>
                        <span
                          className={`text-lg font-bold ${
                            channel.roi >= 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {channel.roi >= 0 ? "+" : ""}
                          {channel.roi.toFixed(0)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-gray-500">Receita</p>
                          <p className="text-white font-semibold">€{channel.revenue.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Leads</p>
                          <p className="text-white font-semibold">{channel.leads}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">€/Lead</p>
                          <p className="text-white font-semibold">
                            €{channel.revenuePerLead.toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Distribuição de Fontes */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Distribuição de Tráfego</h3>
                <div className="space-y-4">
                  {sources.trafficSources.slice(0, 6).map((source, index) => {
                    const colors = [
                      "#C5A059",
                      "#8B7042",
                      "#A08850",
                      "#7A6838",
                      "#9A8850",
                      "#6B5828",
                    ];

                    return (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-300">{source.source}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">
                              {source.leads} leads
                            </span>
                            <span className="text-xs text-gray-500">
                              ({source.percentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              width: `${source.percentage}%`,
                              backgroundColor: colors[index % colors.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* SECÇÃO: TOP CONTENT */}
        {traffic && (
          <>
            <h2 className="text-2xl font-bold text-white mb-6">🔥 Conteúdo Mais Popular</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
              {/* Top Cavalos */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  🐴 Top 10 Cavalos Mais Vistos
                </h3>
                <div className="space-y-2">
                  {traffic.topCavalos.slice(0, 10).map((cavalo, index) => (
                    <div
                      key={cavalo.id}
                      className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[var(--gold)] font-bold w-6">#{index + 1}</span>
                        <span className="text-white">{cavalo.name}</span>
                      </div>
                      <span className="text-gray-400 text-sm">
                        {formatNumber(cavalo.views)} views
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Eventos */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  📅 Top 10 Eventos Mais Vistos
                </h3>
                <div className="space-y-2">
                  {traffic.topEventos.slice(0, 10).map((evento, index) => (
                    <div
                      key={evento.id}
                      className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-purple-500 font-bold w-6">#{index + 1}</span>
                        <span className="text-white">{evento.name}</span>
                      </div>
                      <span className="text-gray-400 text-sm">
                        {formatNumber(evento.views)} views
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* SECÇÃO: CONVERSÕES MENSAIS */}
        {conversions && (
          <>
            <h2 className="text-2xl font-bold text-white mb-6">📈 Evolução de Conversões</h2>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <div className="h-80 flex items-end justify-between gap-2">
                {conversions.monthlyConversions.map((month, index) => {
                  const maxLeads = Math.max(...conversions.monthlyConversions.map((m) => m.leads));
                  const leadsHeight = maxLeads > 0 ? (month.leads / maxLeads) * 100 : 0;
                  const customersHeight =
                    month.leads > 0 ? (month.customers / month.leads) * leadsHeight : 0;

                  return (
                    <div
                      key={index}
                      className="group relative flex-1 h-full flex flex-col justify-end"
                    >
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                        <div className="font-bold mb-1">{month.month}</div>
                        <div className="text-green-400">Leads: {month.leads}</div>
                        <div className="text-[var(--gold)]">Clientes: {month.customers}</div>
                        <div className="text-purple-400">Taxa: {month.conversionRate}%</div>
                      </div>

                      {/* Barra Leads */}
                      <div
                        className="w-full bg-green-500/30 rounded-t transition-all hover:bg-green-500/50 cursor-pointer relative"
                        style={{ height: `${leadsHeight}%` }}
                      >
                        {/* Barra Clientes dentro */}
                        <div
                          className="absolute bottom-0 w-full bg-[var(--gold)] rounded-t"
                          style={{ height: `${customersHeight}%` }}
                        />
                      </div>

                      <p className="text-center text-xs text-gray-500 mt-2">{month.month}</p>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500/30 rounded"></div>
                  <span className="text-sm text-gray-400">Leads</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[var(--gold)] rounded"></div>
                  <span className="text-sm text-gray-400">Clientes</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
