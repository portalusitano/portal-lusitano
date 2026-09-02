"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin, Users, CreditCard, TrendingUp, HelpCircle } from "lucide-react";
import PortugalHeatmap from "./PortugalHeatmap";

interface DistrictData {
  name: string;
  value: number;
}

type MetricType = "leads" | "payments" | "customers" | "cavalos";

export default function GeoAnalyticsContent() {
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>("leads");
  const [data, setData] = useState<DistrictData[]>([]);
  const [total, setTotal] = useState(0);
  /**
   * Porque é que esta métrica não tem números, quando não tem.
   *
   * Três das quatro liam `leads.location`, coluna que a tabela não tem: a rota
   * respondia com todos os distritos a zero, e um mapa a zeros lê-se como «não
   * há clientes em Portugal», não como «não há dados». O painel passa a dizer
   * o que se passa em vez de desenhar um mapa vazio com ar de resposta.
   */
  const [motivo, setMotivo] = useState<string | null>(null);

  // Configuração de métricas
  const metrics = [
    {
      id: "leads" as MetricType,
      label: "Leads",
      icon: Users,
      color: "blue",
      description: "Total de leads captados por distrito",
    },
    {
      id: "payments" as MetricType,
      label: "Pagamentos",
      icon: CreditCard,
      color: "green",
      description: "Número de transações por distrito",
    },
    {
      id: "customers" as MetricType,
      label: "Clientes",
      icon: TrendingUp,
      color: "gold",
      description: "Clientes únicos por distrito",
    },
    {
      id: "cavalos" as MetricType,
      label: "Cavalos",
      icon: MapPin,
      color: "red",
      description: "Cavalos à venda por distrito",
    },
  ];

  const currentMetric = metrics.find((m) => m.id === metric)!;

  // Carregar dados
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/geo?metric=${metric}`);
      const result = await response.json();

      if (response.ok) {
        setData(result.data || []);
        setTotal(result.total || 0);
        setMotivo(result.indisponivel ? result.motivo || "Métrica sem fonte de dados." : null);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[GeoAnalytics]", error);
    } finally {
      setLoading(false);
    }
  }, [metric]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <MapPin className="w-8 h-8 text-[var(--gold)]" />
          Análise Geográfica
        </h1>
        <p className="text-gray-400">Visualize a distribuição de dados por distrito de Portugal</p>
      </div>

      {/* Seletor de Métrica */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          const isActive = metric === m.id;

          return (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              className={`
                relative p-6 rounded-xl border-2 transition-all text-left
                ${
                  isActive
                    ? "bg-gradient-to-br from-[var(--gold)]/20 to-[var(--gold)]/10 border-[var(--gold)]"
                    : "bg-gradient-to-br from-white/5 to-white/10 border-white/10 hover:border-white/20"
                }
              `}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`
                  w-12 h-12 rounded-lg flex items-center justify-center
                  ${isActive ? "bg-[var(--gold)]" : "bg-white/10"}
                `}
                >
                  <Icon className={`w-6 h-6 ${isActive ? "text-black" : "text-gray-400"}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-bold ${isActive ? "text-white" : "text-gray-300"}`}>
                    {m.label}
                  </h3>
                  {!loading && isActive && !motivo && (
                    <p className="text-2xl font-bold text-[var(--gold)] mt-1">
                      {total.toLocaleString("pt-PT")}
                    </p>
                  )}
                  {!loading && isActive && motivo && (
                    <p className="text-sm text-gray-400 mt-1">Sem dados</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400">{m.description}</p>

              {/* Indicador ativo */}
              {isActive && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-[var(--gold)] rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Heatmap */}
      {loading ? (
        <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-xl p-12 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[var(--gold)] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">A carregar dados geográficos...</p>
        </div>
      ) : motivo ? (
        <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-xl p-12 text-center">
          <HelpCircle className="w-10 h-10 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">
            {currentMetric.label} — sem dados por distrito
          </h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">{motivo}</p>
        </div>
      ) : (
        <PortugalHeatmap
          data={data}
          title={`Mapa de Calor - ${currentMetric.label}`}
          subtitle={currentMetric.description}
          valueLabel={currentMetric.label.toLowerCase()}
          colorScheme={currentMetric.color as "blue" | "green" | "gold" | "red"}
        />
      )}

      {/* Info adicional */}
      <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <HelpCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Como funcionam os mapas de calor?</h3>
            <div className="text-sm text-gray-300 space-y-2">
              <p>
                • <strong>Cavalos:</strong> baseado na localização do anúncio
              </p>
              <p className="text-gray-400">
                • <strong>Leads</strong>, <strong>Pagamentos</strong> e <strong>Clientes</strong>: a
                tabela de leads não guarda localização, por isso não há como as distribuir por
                distrito. Enquanto essa informação não for recolhida, estas três não têm mapa.
              </p>
              <p className="text-gray-400 mt-3">
                💡 <em>Distritos sem dados aparecem em cinza claro</em>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
