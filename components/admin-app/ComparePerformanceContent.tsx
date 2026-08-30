"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Eye, DollarSign, Users, BarChart3 } from "lucide-react";

interface CompareItem {
  id: string;
  name: string;
  type: "cavalo" | "evento";
  views: number;
  leads: number;
  revenue: number;
  conversion_rate: number;
}

export default function ComparePerformanceContent() {
  const [selectedType, setSelectedType] = useState<"cavalo" | "evento">("cavalo");
  const [items, setItems] = useState<CompareItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/compare?type=${selectedType}`);
      if (!response.ok) throw new Error("Erro ao carregar dados");

      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[ComparePerformance]", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const toggleItem = (id: string) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const selectedData = items.filter((item) => selectedItems.includes(item.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-[var(--gold)]" />
          Comparação de Performance
        </h1>
        <p className="text-gray-400">Compare métricas de cavalos ou eventos lado a lado</p>
      </div>

      {/* Type Selector */}
      <div className="flex gap-4">
        <button
          onClick={() => setSelectedType("cavalo")}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            selectedType === "cavalo"
              ? "bg-[var(--gold)] text-black"
              : "bg-white/5 text-white hover:bg-white/10"
          }`}
        >
          Cavalos
        </button>
        <button
          onClick={() => setSelectedType("evento")}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            selectedType === "evento"
              ? "bg-[var(--gold)] text-black"
              : "bg-white/5 text-white hover:bg-white/10"
          }`}
        >
          Eventos
        </button>
      </div>

      {/* Item Selection */}
      <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">
          Seleciona {selectedType}s para comparar (até 4)
        </h3>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-10 h-10 border-4 border-[var(--gold)] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-400">A carregar {selectedType}s...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                disabled={selectedItems.length >= 4 && !selectedItems.includes(item.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedItems.includes(item.id)
                    ? "bg-[var(--gold)]/20 border-[var(--gold)]"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <p className="font-semibold text-white">{item.name}</p>
                <p className="text-sm text-gray-400">{item.views} views</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Comparison Table */}
      {selectedData.length > 0 && (
        <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-xl p-6 overflow-x-auto">
          <h3 className="text-lg font-bold text-white mb-4">Comparação</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Métrica</th>
                {selectedData.map((item) => (
                  <th key={item.id} className="text-center py-3 px-4 text-white font-semibold">
                    {item.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/10">
                <td className="py-3 px-4 text-gray-400">
                  <Eye className="w-4 h-4 inline mr-2" />
                  Views
                </td>
                {selectedData.map((item) => (
                  <td key={item.id} className="text-center py-3 px-4 text-white font-semibold">
                    {item.views.toLocaleString("pt-PT")}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/10">
                <td className="py-3 px-4 text-gray-400">
                  <Users className="w-4 h-4 inline mr-2" />
                  Leads
                </td>
                {selectedData.map((item) => (
                  <td key={item.id} className="text-center py-3 px-4 text-white font-semibold">
                    {item.leads}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/10">
                <td className="py-3 px-4 text-gray-400">
                  <DollarSign className="w-4 h-4 inline mr-2" />
                  Receita
                </td>
                {selectedData.map((item) => (
                  <td key={item.id} className="text-center py-3 px-4 text-white font-semibold">
                    €{(item.revenue / 100).toLocaleString("pt-PT")}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 text-gray-400">
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Taxa Conversão
                </td>
                {selectedData.map((item) => (
                  <td key={item.id} className="text-center py-3 px-4 text-white font-semibold">
                    {item.conversion_rate.toFixed(2)}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Winner Highlight */}
      {selectedData.length >= 2 && (
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-2">🏆 Melhor Performance</h3>
          <p className="text-gray-300">
            <strong className="text-green-400">
              {
                selectedData.reduce((prev, current) =>
                  prev.conversion_rate > current.conversion_rate ? prev : current
                ).name
              }
            </strong>{" "}
            tem a melhor taxa de conversão com{" "}
            <strong className="text-green-400">
              {Math.max(...selectedData.map((d) => d.conversion_rate)).toFixed(2)}%
            </strong>
          </p>
        </div>
      )}
    </div>
  );
}
