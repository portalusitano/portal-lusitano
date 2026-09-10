"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";

interface DistrictData {
  name: string;
  value: number;
  color?: string;
}

interface PortugalHeatmapProps {
  data: DistrictData[];
  title?: string;
  subtitle?: string;
  valueLabel?: string;
  colorScheme?: "blue" | "green" | "gold" | "red";
}

// Coordenadas simplificadas dos distritos de Portugal
const DISTRICTS: Record<string, { path: string; cx: number; cy: number }> = {
  "Viana do Castelo": {
    path: "M 150 50 L 170 50 L 180 70 L 170 85 L 150 85 Z",
    cx: 165,
    cy: 67,
  },
  Braga: {
    path: "M 170 85 L 190 85 L 195 105 L 185 115 L 170 110 Z",
    cx: 180,
    cy: 100,
  },
  Porto: {
    path: "M 165 110 L 185 115 L 190 130 L 175 140 L 160 135 Z",
    cx: 175,
    cy: 125,
  },
  "Vila Real": {
    path: "M 185 115 L 210 120 L 215 140 L 200 150 L 185 145 Z",
    cx: 200,
    cy: 132,
  },
  Bragança: {
    path: "M 210 90 L 240 95 L 245 125 L 230 135 L 215 125 Z",
    cx: 227,
    cy: 112,
  },
  Aveiro: {
    path: "M 160 135 L 175 140 L 180 160 L 165 170 L 150 165 Z",
    cx: 167,
    cy: 152,
  },
  Viseu: {
    path: "M 180 145 L 200 150 L 205 170 L 190 180 L 175 175 Z",
    cx: 192,
    cy: 162,
  },
  Guarda: {
    path: "M 205 145 L 230 150 L 235 175 L 220 185 L 205 180 Z",
    cx: 220,
    cy: 165,
  },
  Coimbra: {
    path: "M 150 165 L 175 175 L 180 195 L 165 205 L 145 200 Z",
    cx: 165,
    cy: 185,
  },
  "Castelo Branco": {
    path: "M 190 180 L 220 185 L 225 210 L 210 220 L 190 215 Z",
    cx: 210,
    cy: 200,
  },
  Leiria: {
    path: "M 145 200 L 165 205 L 170 230 L 155 240 L 135 235 Z",
    cx: 155,
    cy: 220,
  },
  Santarém: {
    path: "M 155 235 L 180 240 L 185 265 L 170 275 L 150 270 Z",
    cx: 170,
    cy: 255,
  },
  Lisboa: {
    path: "M 135 270 L 155 275 L 160 295 L 145 305 L 125 300 Z",
    cx: 145,
    cy: 287,
  },
  Portalegre: {
    path: "M 190 215 L 215 220 L 220 245 L 205 255 L 185 250 Z",
    cx: 205,
    cy: 235,
  },
  Évora: {
    path: "M 170 275 L 205 280 L 210 310 L 190 320 L 165 315 Z",
    cx: 190,
    cy: 297,
  },
  Setúbal: {
    path: "M 145 305 L 170 310 L 175 335 L 160 345 L 140 340 Z",
    cx: 160,
    cy: 322,
  },
  Beja: {
    path: "M 160 340 L 195 345 L 200 375 L 180 385 L 155 380 Z",
    cx: 180,
    cy: 362,
  },
  Faro: {
    path: "M 150 380 L 200 385 L 210 420 L 180 430 L 140 425 Z",
    cx: 175,
    cy: 407,
  },
};

export default function PortugalHeatmap({
  data,
  title = "Mapa de Calor - Portugal",
  subtitle,
  valueLabel = "valor",
  colorScheme = "gold",
}: PortugalHeatmapProps) {
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Determinar valores min/max para escala de cores
  const values = data.map((d) => d.value);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 1);

  // Criar mapa de dados por distrito
  const dataMap = new Map(data.map((d) => [d.name, d]));

  // Obter cor baseada no valor
  const getColor = (districtName: string): string => {
    const districtData = dataMap.get(districtName);
    if (!districtData || districtData.value === 0) {
      return "rgba(255, 255, 255, 0.05)"; // Cinza muito claro se sem dados
    }

    // Calcular intensidade (0 a 1)
    const intensity = (districtData.value - minValue) / (maxValue - minValue || 1);

    // Cores baseadas no scheme
    const schemes = {
      blue: `rgba(59, 130, 246, ${0.2 + intensity * 0.8})`,
      green: `rgba(34, 197, 94, ${0.2 + intensity * 0.8})`,
      gold: `rgba(197, 160, 89, ${0.2 + intensity * 0.8})`,
      red: `rgba(239, 68, 68, ${0.2 + intensity * 0.8})`,
    };

    return schemes[colorScheme];
  };

  // Handler do mouse
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-xl p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
        {subtitle && <p className="text-gray-400 text-sm">{subtitle}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mapa */}
        <div className="lg:col-span-2 relative">
          <svg
            viewBox="0 0 400 500"
            className="w-full h-auto"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredDistrict(null)}
          >
            {/* Renderizar distritos */}
            {Object.entries(DISTRICTS).map(([name, { path }]) => {
              const isHovered = hoveredDistrict === name;
              const districtData = dataMap.get(name);
              const _hasData = districtData && districtData.value > 0;

              return (
                <path
                  key={name}
                  d={path}
                  fill={getColor(name)}
                  stroke={isHovered ? "#C5A059" : "rgba(255, 255, 255, 0.2)"}
                  strokeWidth={isHovered ? 2 : 1}
                  className="transition-all cursor-pointer"
                  style={{
                    filter: isHovered ? "brightness(1.2)" : "none",
                  }}
                  onMouseEnter={() => setHoveredDistrict(name)}
                  onMouseLeave={() => setHoveredDistrict(null)}
                />
              );
            })}

            {/* Labels dos distritos (apenas se hover) */}
            {hoveredDistrict && DISTRICTS[hoveredDistrict] && (
              <text
                x={DISTRICTS[hoveredDistrict].cx}
                y={DISTRICTS[hoveredDistrict].cy}
                textAnchor="middle"
                className="text-[10px] font-bold fill-white pointer-events-none"
                style={{ textShadow: "0 0 4px black" }}
              >
                {hoveredDistrict}
              </text>
            )}
          </svg>

          {/* Tooltip */}
          {hoveredDistrict && (
            <div
              className="absolute bg-black border border-white/20 rounded-lg px-4 py-3 shadow-2xl pointer-events-none z-10"
              style={{
                left: mousePos.x + 20,
                top: mousePos.y - 20,
              }}
            >
              <p className="text-white font-bold mb-1">{hoveredDistrict}</p>
              <p className="text-sm text-gray-400">
                {valueLabel}:{" "}
                <span className="text-[var(--gold)] font-semibold">
                  {dataMap.get(hoveredDistrict)?.value.toLocaleString("pt-PT") || "Sem dados"}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Legenda e Top 5 */}
        <div className="space-y-6">
          {/* Legenda de Cores */}
          <div className="bg-black/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Intensidade</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded"
                  style={{
                    background:
                      colorScheme === "gold"
                        ? "rgb(var(--gold-rgb) / 0.3)"
                        : "rgba(59, 130, 246, 0.3)",
                  }}
                />
                <span className="text-xs text-gray-400">Baixa</span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded"
                  style={{
                    background:
                      colorScheme === "gold"
                        ? "rgb(var(--gold-rgb) / 0.6)"
                        : "rgba(59, 130, 246, 0.6)",
                  }}
                />
                <span className="text-xs text-gray-400">Média</span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded"
                  style={{
                    background:
                      colorScheme === "gold" ? "rgb(var(--gold-rgb) / 1)" : "rgba(59, 130, 246, 1)",
                  }}
                />
                <span className="text-xs text-gray-400">Alta</span>
              </div>
            </div>
          </div>

          {/* Top 5 Distritos */}
          <div className="bg-black/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top 5 Distritos
            </h3>
            <div className="space-y-2">
              {[...data]
                .sort((a, b) => b.value - a.value)
                .slice(0, 5)
                .map((district, index) => (
                  <div key={district.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--gold)] font-bold text-sm">{index + 1}.</span>
                      <span className="text-white text-sm">{district.name}</span>
                    </div>
                    <span className="text-gray-400 text-sm font-semibold">
                      {district.value.toLocaleString("pt-PT")}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Stats Gerais */}
          <div className="bg-black/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Resumo Geral</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total:</span>
                <span className="text-white font-semibold">
                  {data.reduce((sum, d) => sum + d.value, 0).toLocaleString("pt-PT")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Média:</span>
                <span className="text-white font-semibold">
                  {(data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Distritos ativos:</span>
                <span className="text-white font-semibold">
                  {data.filter((d) => d.value > 0).length} / {data.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Preset de dados por distrito (exemplo)
export const generateEmptyDistrictData = (): DistrictData[] => {
  return Object.keys(DISTRICTS).map((name) => ({
    name,
    value: 0,
  }));
};
