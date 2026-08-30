"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  AlertCircle,
  DollarSign,
  Users,
  UserPlus,
  BarChart3,
} from "lucide-react";

interface DataPoint {
  date: string;
  value: number;
  is_forecast?: boolean;
}

interface ForecastMetrics {
  growth_rate: number;
  current_trend: number;
  total_historical: number;
  total_forecast: number;
  avg_daily: number;
  confidence: number;
}

type MetricType = "revenue" | "leads" | "customers";

export default function ForecastingContent() {
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>("revenue");
  const [daysBack, setDaysBack] = useState(30);
  const [daysAhead, setDaysAhead] = useState(7);

  const [historical, setHistorical] = useState<DataPoint[]>([]);
  const [forecast, setForecast] = useState<DataPoint[]>([]);
  const [metrics, setMetrics] = useState<ForecastMetrics | null>(null);

  const metricConfigs = {
    revenue: {
      label: "Receita",
      icon: DollarSign,
      color: "text-green-400",
      bgColor: "bg-green-500/20",
      borderColor: "border-green-500/30",
      unit: "€",
    },
    leads: {
      label: "Leads",
      icon: Users,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      borderColor: "border-blue-500/30",
      unit: "",
    },
    customers: {
      label: "Novos Clientes",
      icon: UserPlus,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      borderColor: "border-purple-500/30",
      unit: "",
    },
  };

  const config = metricConfigs[metric];

  // Carregar previsões
  const loadForecast = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/forecasting?metric=${metric}&days_back=${daysBack}&days_ahead=${daysAhead}`
      );
      const data = await response.json();

      if (response.ok) {
        setHistorical(data.historical || []);
        setForecast(data.forecast || []);
        setMetrics(data.metrics);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[ForecastingContent]", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, daysBack, daysAhead]);

  // Gráfico simples em SVG
  const renderChart = () => {
    const allData = [...historical, ...forecast];
    if (allData.length === 0) return null;

    const maxValue = Math.max(...allData.map((d) => d.value), 1);
    const width = 800;
    const height = 300;
    const padding = 40;

    const xScale = (index: number) =>
      padding + ((width - padding * 2) / (allData.length - 1)) * index;
    const yScale = (value: number) =>
      height - padding - ((height - padding * 2) / maxValue) * value;

    // Pontos históricos
    const historicalPoints = historical.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(" ");

    // Pontos previstos
    const forecastPoints = [historical[historical.length - 1], ...forecast]
      .map((d, i) => `${xScale(historical.length - 1 + i)},${yScale(d.value)}`)
      .join(" ");

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />

        {/* Linha histórica */}
        <polyline points={historicalPoints} fill="none" stroke="#C5A059" strokeWidth="3" />

        {/* Área histórica */}
        <polygon
          points={`${padding},${height - padding} ${historicalPoints} ${xScale(historical.length - 1)},${height - padding}`}
          fill="url(#historicalGradient)"
          opacity="0.3"
        />

        {/* Linha prevista (tracejada) */}
        <polyline
          points={forecastPoints}
          fill="none"
          stroke="#C5A059"
          strokeWidth="3"
          strokeDasharray="10,5"
          opacity="0.7"
        />

        {/* Área prevista */}
        <polygon
          points={`${xScale(historical.length - 1)},${height - padding} ${forecastPoints} ${xScale(allData.length - 1)},${height - padding}`}
          fill="url(#forecastGradient)"
          opacity="0.2"
        />

        {/* Gradientes */}
        <defs>
          <linearGradient id="historicalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C5A059" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#C5A059" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="forecastGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C5A059" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#C5A059" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Pontos */}
        {historical.map((d, i) => (
          <circle key={`h-${i}`} cx={xScale(i)} cy={yScale(d.value)} r="4" fill="#C5A059" />
        ))}

        {forecast.map((d, i) => (
          <circle
            key={`f-${i}`}
            cx={xScale(historical.length + i)}
            cy={yScale(d.value)}
            r="4"
            fill="#C5A059"
            opacity="0.6"
          />
        ))}

        {/* Labels */}
        <text x={padding} y={height - 10} fill="rgba(255,255,255,0.5)" fontSize="12">
          {historical[0]?.date}
        </text>
        <text x={width - padding - 80} y={height - 10} fill="rgba(255,255,255,0.5)" fontSize="12">
          {forecast[forecast.length - 1]?.date}
        </text>
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Activity className="w-8 h-8 text-[var(--gold)]" />
          Previsões & Forecasting
        </h1>
        <p className="text-gray-400">
          Análise de tendências e projeções futuras baseadas em dados históricos
        </p>
      </div>

      {/* Controlos */}
      <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Métrica */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Métrica</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as MetricType)}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--gold)]"
            >
              <option value="revenue">Receita (€)</option>
              <option value="leads">Leads</option>
              <option value="customers">Novos Clientes</option>
            </select>
          </div>

          {/* Dias históricos */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Histórico (dias)</label>
            <select
              value={daysBack}
              onChange={(e) => setDaysBack(parseInt(e.target.value))}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--gold)]"
            >
              <option value="7">7 dias</option>
              <option value="14">14 dias</option>
              <option value="30">30 dias</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
            </select>
          </div>

          {/* Dias futuros */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Previsão (dias)</label>
            <select
              value={daysAhead}
              onChange={(e) => setDaysAhead(parseInt(e.target.value))}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--gold)]"
            >
              <option value="3">3 dias</option>
              <option value="7">7 dias</option>
              <option value="14">14 dias</option>
              <option value="30">30 dias</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-xl p-12 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[var(--gold)] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">A calcular previsões...</p>
        </div>
      ) : (
        <>
          {/* Métricas */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Taxa de Crescimento */}
              <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Taxa de Crescimento</span>
                  {metrics.growth_rate >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <p
                  className={`text-3xl font-bold ${
                    metrics.growth_rate >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {metrics.growth_rate >= 0 ? "+" : ""}
                  {metrics.growth_rate.toFixed(1)}%
                </p>
              </div>

              {/* Total Histórico */}
              <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Total Histórico</span>
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {config.unit}
                  {metrics.total_historical.toLocaleString("pt-PT", {
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>

              {/* Previsão Total */}
              <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Previsão Total</span>
                  <Target className="w-5 h-5 text-[var(--gold)]" />
                </div>
                <p className="text-3xl font-bold text-[var(--gold)]">
                  {config.unit}
                  {metrics.total_forecast.toLocaleString("pt-PT", {
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>

              {/* Confiança */}
              <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Confiança</span>
                  <AlertCircle className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-purple-400">
                  {metrics.confidence.toFixed(0)}%
                </p>
              </div>
            </div>
          )}

          {/* Gráfico */}
          <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">
              {config.label} - Histórico vs Previsão
            </h3>
            {renderChart()}

            <div className="flex items-center justify-center gap-8 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-[var(--gold)] rounded" />
                <span className="text-sm text-gray-400">Histórico</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-1 bg-[var(--gold)] opacity-70 rounded"
                  style={{ borderTop: "2px dashed #C5A059" }}
                />
                <span className="text-sm text-gray-400">Previsão</span>
              </div>
            </div>
          </div>

          {/* Aviso */}
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Sobre as Previsões</h3>
                <div className="text-sm text-gray-300 space-y-2">
                  <p>
                    • As previsões são baseadas em <strong>análise de tendências lineares</strong>{" "}
                    dos dados históricos
                  </p>
                  <p>
                    • A <strong>confiança</strong> é calculada com base na volatilidade dos dados
                  </p>
                  <p>• Previsões mais longas tendem a ter menor precisão</p>
                  <p className="text-yellow-400 mt-3">
                    ⚠️ Use estas previsões como <em>orientação</em>, não como garantia
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
