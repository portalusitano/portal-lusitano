"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon, MapPin } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--background-secondary)]/80 rounded-2xl">
      <MapIcon className="text-[var(--gold)] animate-pulse" size={28} />
    </div>
  ),
});

import type { Evento } from "./types";

interface EventosMapProps {
  eventos: Evento[];
  onEventClick: (evento: Evento) => void;
}

const REGIOES = [
  { name: "Minho", coords: [41.7, -8.3] as [number, number] },
  { name: "Porto", coords: [41.15, -8.6] as [number, number] },
  { name: "Centro", coords: [40.2, -8.2] as [number, number] },
  { name: "Ribatejo", coords: [39.3, -8.5] as [number, number] },
  { name: "Lisboa", coords: [38.75, -9.15] as [number, number] },
  { name: "Alentejo", coords: [38.0, -7.9] as [number, number] },
  { name: "Algarve", coords: [37.1, -8.0] as [number, number] },
];

export default function EventosMap({ eventos, onEventClick }: EventosMapProps) {
  const { t } = useLanguage();
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [selectedRegiao, setSelectedRegiao] = useState<string | null>(null);

  // Map Evento[] → Coudelaria[] format for LeafletMap compatibility
  const mapData = useMemo(
    () =>
      eventos.map((e) => ({
        id: e.id,
        nome: e.titulo,
        slug: e.slug,
        descricao: e.descricao,
        localizacao: e.localizacao,
        regiao: e.regiao || "Lisboa",
        is_pro: false,
        destaque: e.destaque,
      })),
    [eventos]
  );

  // Store original eventos for click handler
  const eventoById = useMemo(() => {
    const map = new Map<string, Evento>();
    eventos.forEach((e) => map.set(e.id, e));
    return map;
  }, [eventos]);

  const handleMarkerClick = (c: { id: string }) => {
    const evento = eventoById.get(c.id);
    if (evento) onEventClick(evento);
  };

  const handleRegionClick = (regiao: (typeof REGIOES)[number]) => {
    setSelectedRegiao(regiao.name);
    setFlyTo(regiao.coords);
  };

  const handleAllRegions = () => {
    setSelectedRegiao(null);
    setFlyTo([39.5, -8.0]);
  };

  // Count events per region
  const eventCountByRegion = useMemo(() => {
    const counts: Record<string, number> = {};
    eventos.forEach((e) => {
      const r = e.regiao || "Outro";
      counts[r] = (counts[r] || 0) + 1;
    });
    return counts;
  }, [eventos]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Map */}
      <div className="lg:col-span-9 h-[500px] sm:h-[600px] rounded-2xl overflow-hidden border border-[var(--border)]">
        <LeafletMap coudelarias={mapData} flyTo={flyTo} onMarkerClick={handleMarkerClick} />
      </div>

      {/* Sidebar — Regiões */}
      <div className="lg:col-span-3">
        <div className="bg-[var(--background-secondary)]/50 border border-[var(--border)] rounded-xl p-4">
          <h3 className="text-sm font-medium text-[var(--foreground)] mb-4 flex items-center gap-2">
            <MapPin size={14} className="text-[var(--gold)]" />
            {t.eventos.map_regions}
          </h3>

          <div className="space-y-1">
            <button
              onClick={handleAllRegions}
              className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                !selectedRegiao
                  ? "bg-[var(--elevate-1)] text-[var(--gold)] border border-[var(--border-soft)]"
                  : "text-[var(--foreground-secondary)] hover:bg-[var(--background-card)] hover:text-[var(--foreground)]"
              }`}
            >
              <span>{t.eventos.map_all_regions}</span>
              <span className="text-xs text-[var(--foreground-muted)]">{eventos.length}</span>
            </button>

            {REGIOES.map((regiao) => {
              const count = eventCountByRegion[regiao.name] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={regiao.name}
                  onClick={() => handleRegionClick(regiao)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    selectedRegiao === regiao.name
                      ? "bg-[var(--elevate-1)] text-[var(--gold)] border border-[var(--border-soft)]"
                      : "text-[var(--foreground-secondary)] hover:bg-[var(--background-card)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <span>{regiao.name}</span>
                  <span className="text-xs text-[var(--foreground-muted)]">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
