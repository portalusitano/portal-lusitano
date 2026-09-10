"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import MetricsGrid from "@/components/admin-app/analytics/MetricsGrid";
import TrafficChart from "@/components/admin-app/analytics/TrafficChart";

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

export default function AdminAnalyticsPage() {
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
      if (process.env.NODE_ENV === "development") console.error("[Analytics]", error);
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
      if (process.env.NODE_ENV === "development") console.error("[Analytics]", error);
    }
  };

  const loadConversions = async () => {
    try {
      const res = await fetch("/api/admin/analytics/conversions");
      if (!res.ok) throw new Error("Failed to load conversions data");
      const data = await res.json();
      setConversions(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[Analytics]", error);
    }
  };

  const loadSources = async () => {
    try {
      const res = await fetch("/api/admin/analytics/sources");
      if (!res.ok) throw new Error("Failed to load sources data");
      const data = await res.json();
      setSources(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[Analytics]", error);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("pt-PT").format(num);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--foreground-strong)] mx-auto"></div>
          <p className="text-gray-400 mt-4">A carregar analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[var(--background-secondary)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Analytics Completo</h1>
              <p className="text-gray-400 mt-1">Tráfego, Conversões e ROI por Canal</p>
            </div>
            <Link
              href="/admin"
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition-colors"
            >
              ← Voltar ao Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* SECÇÃO: FUNIL DE CONVERSÃO */}
        {conversions && (
          <>
            <h2 className="text-2xl font-bold text-white mb-6">🎯 Funil de Conversão</h2>

            <MetricsGrid overview={conversions.overview} formatNumber={formatNumber} />

            {/* Funil Visual */}
            <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-8 mb-12">
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
                        <span className="text-[var(--foreground-muted)] text-sm font-semibold">
                          {stage.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-12 bg-white/5 rounded-lg overflow-hidden relative">
                      <div
                        className="h-full bg-[var(--foreground-strong)] transition-all duration-1000 flex items-center justify-end pr-4"
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
              <div className="bg-gradient-to-r from-[var(--elevate-1)] to-[var(--elevate-1)] border-2 border-[var(--border-soft)] rounded-lg p-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">🏆</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-[var(--foreground-muted)] mb-2">
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
              <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
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
              <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
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
              <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
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
                        <span className="text-[var(--foreground-muted)] font-bold w-6">
                          #{index + 1}
                        </span>
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
              <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
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
            <TrafficChart monthlyConversions={conversions.monthlyConversions} />
          </>
        )}
      </div>
    </div>
  );
}
