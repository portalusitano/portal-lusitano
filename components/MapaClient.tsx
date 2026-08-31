"use client";

import { useState, useMemo, memo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import dynamic from "next/dynamic";
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  ChevronRight,
  X,
  Compass,
  List,
  Navigation,
  Search,
  Crown,
  Map,
  Layers,
} from "lucide-react";
import LocalizedLink from "@/components/LocalizedLink";
import Image from "next/image";

// O globo desenha-se em canvas e mede o elemento onde está: só no cliente.
const GloboMapa = dynamic(() => import("@/components/GloboMapa"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <Compass className="text-[var(--foreground-muted)]" size={32} aria-hidden="true" />
    </div>
  ),
});

export interface Coudelaria {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  localizacao: string;
  regiao: string;
  telefone?: string;
  email?: string;
  website?: string;
  foto_capa?: string;
  is_pro: boolean;
  destaque: boolean;
  coordenadas_lat?: number;
  coordenadas_lng?: number;
  num_cavalos?: number;
  especialidades?: string[];
}

// Coordenadas centrais por região (para fly-to)
const regiaoCoords: Record<string, [number, number]> = {
  Minho: [41.7, -8.3],
  Douro: [41.2, -7.8],
  Porto: [41.15, -8.6],
  Centro: [40.2, -8.2],
  Ribatejo: [39.3, -8.5],
  Lisboa: [38.75, -9.15],
  Alentejo: [38.0, -7.9],
  Algarve: [37.1, -8.0],
};

const placeholderImages = [
  "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=400",
  "https://images.unsplash.com/photo-1534307671554-9a6d81f4d629?w=400",
  "https://images.unsplash.com/photo-1598974357801-cbca100e65d3?w=400",
];

// Stat Card
/* As bolhas de gradiente verde e roxa que aqui estavam eram as únicas duas
   cores do site fora do sistema, e ainda por cima flutuavam por cima do
   canto do cartão. O número é que é o dado: fica ele em primeiro, com
   `tabular-nums` para alinhar entre os três, e o ícone reduz-se a uma marca
   ténue à esquerda. */
const StatCard = memo(function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="cartao flex items-center gap-3 px-5 py-3 transition-colors hover:border-[var(--border-hover)]">
      <Icon size={15} className="shrink-0 text-[var(--foreground-muted)]" aria-hidden="true" />
      <div className="text-left">
        <div className="text-xl leading-none tabular-nums text-[var(--foreground-strong)]">
          {value}
        </div>
        <div className="meta mt-1">{label}</div>
      </div>
    </div>
  );
});

// Sidebar Card
const CoudelariaCard = memo(function CoudelariaCard({
  coudelaria,
  index,
  onSelect,
  isSelected,
}: {
  coudelaria: Coudelaria;
  index: number;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const image = coudelaria.foto_capa || placeholderImages[index % placeholderImages.length];
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 border rounded-lg transition-all ${isSelected ? "bg-[var(--elevate-1)] border-[var(--border-hover)]" : "cartao hover:border-[var(--border-hover)]"}`}
    >
      <div className="flex items-start gap-3">
        <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--background-card)]">
          <Image
            src={image}
            alt={coudelaria.nome}
            fill
            sizes="56px"
            className="object-cover"
            loading="lazy"
          />
          {coudelaria.destaque && (
            <div className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--foreground-strong)]">
              <Star size={8} className="text-black" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[var(--foreground)] text-sm truncate">{coudelaria.nome}</h3>
          <p className="text-[var(--foreground-muted)] text-xs flex items-center gap-1">
            <MapPin size={10} className="text-[var(--foreground-muted)]" aria-hidden="true" />
            {coudelaria.localizacao}
          </p>
        </div>
        <ChevronRight
          className={`flex-shrink-0 ${isSelected ? "text-[var(--foreground-strong)]" : "text-[var(--foreground-muted)]"}`}
          size={16}
        />
      </div>
    </button>
  );
});

// Grid Card
const GridCard = memo(function GridCard({
  coudelaria,
  index,
}: {
  coudelaria: Coudelaria;
  index: number;
}) {
  const image = coudelaria.foto_capa || placeholderImages[index % placeholderImages.length];
  return (
    <LocalizedLink
      href={`/directorio/${coudelaria.slug}`}
      className="group block cartao transition-colors hover:border-[var(--border-hover)]"
    >
      <div className="relative h-44 overflow-hidden bg-[var(--background-card)]">
        <Image
          src={image}
          alt={coudelaria.nome}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        {coudelaria.destaque && (
          <div className="selo selo-destaque absolute top-2 left-2 rounded-full">
            <Star size={10} /> Destaque
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 text-white px-2 py-1 text-[10px] rounded-full">
          <MapPin size={10} className="text-[var(--foreground-muted)]" aria-hidden="true" />
          {coudelaria.regiao}
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-[var(--foreground)] group-hover:text-[var(--foreground-strong)] transition-colors">
          {coudelaria.nome}
        </h3>
        <p className="text-[var(--foreground-muted)] text-xs mb-1">{coudelaria.localizacao}</p>
        <p className="text-[var(--foreground-secondary)] text-xs line-clamp-2">
          {coudelaria.descricao}
        </p>
      </div>
    </LocalizedLink>
  );
});

interface MapaClientProps {
  coudelarias: Coudelaria[];
}

export default function MapaClient({ coudelarias }: MapaClientProps) {
  const { t } = useLanguage();
  const [selectedRegiao, setSelectedRegiao] = useState<string | null>(null);
  const [selectedCoudelaria, setSelectedCoudelaria] = useState<Coudelaria | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);

  const coudelariasPorRegiao = useMemo(
    () =>
      coudelarias.reduce(
        (acc, c) => {
          if (!acc[c.regiao]) acc[c.regiao] = [];
          acc[c.regiao].push(c);
          return acc;
        },
        {} as Record<string, Coudelaria[]>
      ),
    [coudelarias]
  );

  const filteredCoudelarias = useMemo(() => {
    if (!searchQuery.trim()) return coudelarias;
    const q = searchQuery.toLowerCase();
    return coudelarias.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.localizacao.toLowerCase().includes(q) ||
        c.regiao.toLowerCase().includes(q)
    );
  }, [coudelarias, searchQuery]);

  const stats = useMemo(
    () => ({
      total: coudelarias.length,
      regioes: Object.keys(coudelariasPorRegiao).length,
      destaque: coudelarias.filter((c) => c.destaque).length,
    }),
    [coudelarias, coudelariasPorRegiao]
  );

  const handleSelectRegiao = (regiao: string | null) => {
    setSelectedRegiao(regiao);
    if (regiao && regiaoCoords[regiao]) {
      setFlyTo(regiaoCoords[regiao]);
    } else {
      setFlyTo([39.5, -8.0]);
    }
  };

  const handleMarkerClick = (c: Coudelaria) => {
    setSelectedCoudelaria(c);
  };

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 50% at 50% 0%, var(--elevate-1), transparent 70%)",
          }}
        />
      </div>

      {/* Hero */}
      <section className="relative pt-28 pb-6">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-5 py-2 bg-[var(--elevate-1)] border border-[var(--border-soft)] rounded-full">
            <Compass className="text-[var(--foreground-muted)]" size={16} aria-hidden="true" />
            <span className="rotulo-forte">{t.mapa.badge}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-6xl mb-4 text-[var(--foreground)]">
            {t.mapa.title.split("Portugal")[0]}
            <span className="text-[var(--foreground-strong)]">Portugal</span>
            {t.mapa.title.split("Portugal")[1]}
          </h1>
          <p className="text-[var(--foreground-secondary)] max-w-xl mx-auto mb-8">
            {t.mapa.subtitle}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <StatCard icon={MapPin} label={t.mapa.stat_studs} value={stats.total} />
            <StatCard icon={Map} label={t.mapa.stat_regions} value={stats.regioes} />
            <StatCard icon={Crown} label={t.mapa.stat_horses} value={stats.destaque} />
          </div>
        </div>
      </section>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pb-16">
        {/* Controls */}
        <div className="cartao mb-6 flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewMode("map")}
              className={`chip gap-1.5 ${viewMode === "map" ? "chip-activo" : ""}`}
            >
              <Layers size={16} /> {t.mapa.view_map}
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`chip gap-1.5 ${viewMode === "list" ? "chip-activo" : ""}`}
            >
              <List size={16} /> {t.mapa.view_list}
            </button>
          </div>

          <div className="flex-1 max-w-sm mx-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
              />
              <input
                type="text"
                placeholder={t.mapa.search_placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="campo h-10 pl-10 text-sm"
              />
            </div>
          </div>
        </div>

        {viewMode === "map" ? (
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Globo */}
            <div className="lg:col-span-8">
              <div className="relative z-0 h-[400px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] sm:h-[500px] lg:h-[600px]">
                <GloboMapa
                  coudelarias={searchQuery ? filteredCoudelarias : coudelarias}
                  flyTo={flyTo}
                  onMarkerClick={handleMarkerClick}
                />
              </div>
            </div>

            {/* Side Panel */}
            <div className="lg:col-span-4">
              {selectedRegiao ? (
                <div className="sticky top-28 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
                  <div className="mb-4 p-4 cartao">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="rotulo">{t.mapa.region}</span>
                        <h2 className="text-xl text-[var(--foreground)]">{selectedRegiao}</h2>
                        <p className="text-[var(--foreground-secondary)] text-sm">
                          <span className="font-bold tabular-nums text-[var(--foreground-strong)]">
                            {coudelariasPorRegiao[selectedRegiao]?.length || 0}
                          </span>
                          {""}
                          {t.mapa.studs_count}
                        </p>
                      </div>
                      <button
                        onClick={() => handleSelectRegiao(null)}
                        className="p-1.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] bg-[var(--surface-hover)] rounded-lg"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {coudelariasPorRegiao[selectedRegiao]?.map((c, i) => (
                      <CoudelariaCard
                        key={c.id}
                        coudelaria={c}
                        index={i}
                        onSelect={() => setSelectedCoudelaria(c)}
                        isSelected={selectedCoudelaria?.id === c.id}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="sticky top-28 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
                  <div className="mb-4 p-4 cartao">
                    <div className="flex items-center gap-2 mb-1">
                      <Layers
                        className="text-[var(--foreground-muted)]"
                        size={16}
                        aria-hidden="true"
                      />
                      <h2 className="text-[var(--foreground)]">{t.mapa.explore_regions}</h2>
                    </div>
                    <p className="text-[var(--foreground-muted)] text-xs">
                      {t.mapa.select_region_hint}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(coudelariasPorRegiao)
                      .sort((a, b) => b[1].length - a[1].length)
                      .map(([regiao, list]) => (
                        <button
                          key={regiao}
                          onClick={() => handleSelectRegiao(regiao)}
                          className="w-full p-3 cartao transition-colors hover:border-[var(--border-hover)] text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-[var(--elevate-1)] rounded-lg flex items-center justify-center">
                                <MapPin
                                  className="text-[var(--foreground-muted)]"
                                  size={16}
                                  aria-hidden="true"
                                />
                              </div>
                              <div>
                                <h3 className="text-[var(--foreground)] text-sm">{regiao}</h3>
                                <p className="text-[var(--foreground-muted)] text-[10px]">
                                  {list.length} {t.mapa.studs_count}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="text-[var(--foreground-muted)]" size={16} />
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            {searchQuery && (
              <p className="mb-4 text-[var(--foreground-secondary)] text-sm">
                <span className="font-bold tabular-nums text-[var(--foreground-strong)]">
                  {filteredCoudelarias.length}
                </span>
                {""}
                resultados
              </p>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(searchQuery ? filteredCoudelarias : coudelarias).map((c, i) => (
                <GridCard key={c.id} coudelaria={c} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Modal de detalhe */}
        {selectedCoudelaria && (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]"
            onClick={() => setSelectedCoudelaria(null)}
          >
            <div
              className="cartao w-full max-w-md opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]"
              style={{ animationDelay: "0.1s" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-40">
                <Image
                  src={selectedCoudelaria.foto_capa || placeholderImages[0]}
                  alt={selectedCoudelaria.nome}
                  fill
                  sizes="(max-width: 448px) 100vw, 448px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
                <button
                  onClick={() => setSelectedCoudelaria(null)}
                  className="absolute top-3 right-3 p-1.5 bg-black/50 text-white rounded-full"
                >
                  <X size={18} />
                </button>
                {selectedCoudelaria.destaque && (
                  <div className="selo selo-destaque absolute top-3 left-3 rounded-full">
                    <Star size={12} /> Destaque
                  </div>
                )}
              </div>
              <div className="p-5">
                <h3 className="text-xl text-[var(--foreground)] mb-1">{selectedCoudelaria.nome}</h3>
                <p className="text-[var(--foreground-secondary)] text-sm flex items-center gap-1 mb-3">
                  <MapPin size={12} className="text-[var(--foreground-muted)]" aria-hidden="true" />
                  {selectedCoudelaria.localizacao}, {selectedCoudelaria.regiao}
                </p>
                <p className="text-[var(--foreground-secondary)] text-sm mb-4">
                  {selectedCoudelaria.descricao}
                </p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {selectedCoudelaria.telefone && (
                    <a
                      href={`tel:${selectedCoudelaria.telefone}`}
                      className="flex flex-col items-center p-2 bg-[var(--background-card)] rounded-lg text-center"
                    >
                      <Phone
                        size={16}
                        className="mb-1 text-[var(--foreground-muted)]"
                        aria-hidden="true"
                      />
                      <span className="text-[10px] text-[var(--foreground-secondary)]">
                        {t.mapa.call}
                      </span>
                    </a>
                  )}
                  {selectedCoudelaria.email && (
                    <a
                      href={`mailto:${selectedCoudelaria.email}`}
                      className="flex flex-col items-center p-2 bg-[var(--background-card)] rounded-lg text-center"
                    >
                      <Mail
                        size={16}
                        className="mb-1 text-[var(--foreground-muted)]"
                        aria-hidden="true"
                      />
                      <span className="text-[10px] text-[var(--foreground-secondary)]">
                        {t.mapa.email}
                      </span>
                    </a>
                  )}
                  {selectedCoudelaria.website && (
                    <a
                      href={selectedCoudelaria.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center p-2 bg-[var(--background-card)] rounded-lg text-center"
                    >
                      <Globe
                        size={16}
                        className="mb-1 text-[var(--foreground-muted)]"
                        aria-hidden="true"
                      />
                      <span className="text-[10px] text-[var(--foreground-secondary)]">
                        {t.mapa.website}
                      </span>
                    </a>
                  )}
                </div>
                <LocalizedLink
                  href={`/directorio/${selectedCoudelaria.slug}`}
                  className="btn btn-primario w-full gap-2 rounded-full"
                >
                  <Navigation size={16} /> {t.mapa.view_page}
                </LocalizedLink>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
