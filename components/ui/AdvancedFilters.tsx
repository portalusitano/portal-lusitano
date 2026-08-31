"use client";

import { useState, useEffect, useCallback } from "react";
import { Filter, X, Save, Calendar, Search, Download, Trash2 } from "lucide-react";

// -------------------------------------------------------
// Public interfaces
// -------------------------------------------------------

export interface FilterConfig {
  showDateRange?: boolean;
  showSearch?: boolean;
  showStatus?: boolean;
  statusOptions?: Array<{ value: string; label: string }>;
  typeOptions?: Array<{ value: string; label: string }>;
  onFilterChange: (filters: ActiveFilters) => void;
  onExport?: () => void;
  presetKey?: string;
}

export interface ActiveFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  type: string;
}

interface SavedPreset {
  id: string;
  name: string;
  filters: ActiveFilters;
}

// -------------------------------------------------------
// Default values
// -------------------------------------------------------

const DEFAULT_FILTERS: ActiveFilters = {
  search: "",
  dateFrom: "",
  dateTo: "",
  status: "",
  type: "",
};

const DEFAULT_STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

// -------------------------------------------------------
// Component
// -------------------------------------------------------

export default function AdvancedFilters({
  showDateRange = true,
  showSearch = true,
  showStatus = true,
  statusOptions,
  typeOptions,
  onFilterChange,
  onExport,
  presetKey = "advanced-filters",
}: FilterConfig) {
  const [filters, setFilters] = useState<ActiveFilters>(DEFAULT_FILTERS);
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState("");

  // Hydrate saved presets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${presetKey}-presets`);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage on mount
      if (stored) setSavedPresets(JSON.parse(stored));
    } catch {
      /* ignore corrupt data */
    }
  }, [presetKey]);

  // Notify parent of filter changes
  const propagate = useCallback(
    (next: ActiveFilters) => {
      setFilters(next);
      onFilterChange(next);
    },
    [onFilterChange]
  );

  // ------- Handlers -------

  const handleSearchChange = (value: string) => {
    propagate({ ...filters, search: value });
  };

  const handleDateFromChange = (value: string) => {
    propagate({ ...filters, dateFrom: value });
  };

  const handleDateToChange = (value: string) => {
    propagate({ ...filters, dateTo: value });
  };

  const handleStatusChange = (value: string) => {
    propagate({ ...filters, status: value });
  };

  const handleTypeChange = (value: string) => {
    propagate({ ...filters, type: value });
  };

  const clearAll = () => {
    propagate({ ...DEFAULT_FILTERS });
  };

  const hasActiveFilters =
    filters.search !== "" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "" ||
    filters.status !== "" ||
    filters.type !== "";

  // ------- Presets -------

  const persistPresets = (presets: SavedPreset[]) => {
    setSavedPresets(presets);
    try {
      localStorage.setItem(`${presetKey}-presets`, JSON.stringify(presets));
    } catch {
      /* quota exceeded - silently ignore */
    }
  };

  const savePreset = () => {
    if (!presetName.trim()) return;
    const newPreset: SavedPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      filters: { ...filters },
    };
    persistPresets([...savedPresets, newPreset]);
    setPresetName("");
    setShowSaveModal(false);
  };

  const loadPreset = (preset: SavedPreset) => {
    propagate({ ...preset.filters });
  };

  const deletePreset = (id: string) => {
    persistPresets(savedPresets.filter((p) => p.id !== id));
  };

  // Resolved options lists
  const resolvedStatusOptions = statusOptions || DEFAULT_STATUS_OPTIONS;

  return (
    <div className="space-y-4">
      {/* Main filter bar */}
      <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
            <Filter className="w-5 h-5 text-[var(--foreground-muted)]" />
            Filtros Avancados
          </h3>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <>
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="px-3 py-1.5 bg-[var(--elevate-1)] text-[var(--foreground-strong)] rounded-lg text-sm font-medium hover:bg-[var(--elevate-1)] transition-all flex items-center gap-2"
                  aria-label="Guardar filtros actuais como preset"
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
                <button
                  onClick={clearAll}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-all flex items-center gap-2"
                  aria-label="Limpar todos os filtros"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar
                </button>
              </>
            )}

            {onExport && (
              <button
                onClick={onExport}
                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-all flex items-center gap-2"
                aria-label="Exportar dados filtrados"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
            )}
          </div>
        </div>

        {/* Filter controls grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          {showSearch && (
            <div>
              <label
                htmlFor="filter-search"
                className="block text-xs font-medium text-[var(--foreground-secondary)] mb-1.5"
              >
                Pesquisa
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
                <input
                  id="filter-search"
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Pesquisar..."
                  className="w-full pl-9 pr-3 py-2 bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-[var(--border-hover)] transition-colors"
                />
              </div>
            </div>
          )}

          {/* Date range */}
          {showDateRange && (
            <div className="md:col-span-1 lg:col-span-1">
              <label className="block text-xs font-medium text-[var(--foreground-secondary)] mb-1.5">
                Periodo
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)] pointer-events-none" />
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleDateFromChange(e.target.value)}
                    aria-label="Data de inicio"
                    className="w-full pl-9 pr-2 py-2 bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--border-hover)] transition-colors [color-scheme:dark]"
                  />
                </div>
                <span className="text-[var(--foreground-muted)] text-sm shrink-0">ate</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  aria-label="Data de fim"
                  className="flex-1 px-3 py-2 bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--border-hover)] transition-colors [color-scheme:dark]"
                />
              </div>
            </div>
          )}

          {/* Status */}
          {showStatus && (
            <div>
              <label
                htmlFor="filter-status"
                className="block text-xs font-medium text-[var(--foreground-secondary)] mb-1.5"
              >
                Estado
              </label>
              <select
                id="filter-status"
                value={filters.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--border-hover)] transition-colors"
              >
                {resolvedStatusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Type */}
          {typeOptions && typeOptions.length > 0 && (
            <div>
              <label
                htmlFor="filter-type"
                className="block text-xs font-medium text-[var(--foreground-secondary)] mb-1.5"
              >
                Tipo
              </label>
              <select
                id="filter-type"
                value={filters.type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--border-hover)] transition-colors"
              >
                <option value="">Todos</option>
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Active filter pills */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]">
            <span className="text-xs text-[var(--foreground-muted)]">Filtros activos:</span>
            {filters.search && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--elevate-1)] text-[var(--foreground-secondary)] text-xs rounded-full">
                Pesquisa: &quot;{filters.search}&quot;
                <button
                  onClick={() => handleSearchChange("")}
                  aria-label="Remover filtro de pesquisa"
                  className="hover:text-[var(--foreground)] transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.dateFrom && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--elevate-1)] text-[var(--foreground-secondary)] text-xs rounded-full">
                De: {filters.dateFrom}
                <button
                  onClick={() => handleDateFromChange("")}
                  aria-label="Remover data de inicio"
                  className="hover:text-[var(--foreground)] transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.dateTo && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--elevate-1)] text-[var(--foreground-secondary)] text-xs rounded-full">
                Ate: {filters.dateTo}
                <button
                  onClick={() => handleDateToChange("")}
                  aria-label="Remover data de fim"
                  className="hover:text-[var(--foreground)] transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--elevate-1)] text-[var(--foreground-secondary)] text-xs rounded-full">
                Estado:{" "}
                {resolvedStatusOptions.find((o) => o.value === filters.status)?.label ||
                  filters.status}
                <button
                  onClick={() => handleStatusChange("")}
                  aria-label="Remover filtro de estado"
                  className="hover:text-[var(--foreground)] transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.type && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--elevate-1)] text-[var(--foreground-secondary)] text-xs rounded-full">
                Tipo: {typeOptions?.find((o) => o.value === filters.type)?.label || filters.type}
                <button
                  onClick={() => handleTypeChange("")}
                  aria-label="Remover filtro de tipo"
                  className="hover:text-[var(--foreground)] transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Saved presets */}
      {savedPresets.length > 0 && (
        <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-4">
          <h4 className="text-sm font-bold text-[var(--foreground)] mb-3">Filtros Guardados</h4>
          <div className="flex flex-wrap gap-2">
            {savedPresets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center gap-2 bg-[var(--surface-hover)] rounded-lg px-3 py-2"
              >
                <button
                  onClick={() => loadPreset(preset)}
                  className="text-sm text-[var(--foreground-strong)] underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--border-hover)]"
                >
                  {preset.name}
                </button>
                <button
                  onClick={() => deletePreset(preset.id)}
                  className="p-1 hover:bg-red-500/20 rounded transition-all"
                  aria-label={`Eliminar preset ${preset.name}`}
                >
                  <X className="w-3 h-3 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save preset modal */}
      {showSaveModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Guardar preset de filtros"
        >
          <div className="bg-[var(--background-card)] cartao p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-[var(--foreground)] mb-4">Guardar Filtros</h3>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Nome do preset..."
              className="w-full px-4 py-2 bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--foreground-muted)] mb-4 focus:outline-none focus:border-[var(--border-hover)]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") savePreset();
                if (e.key === "Escape") {
                  setShowSaveModal(false);
                  setPresetName("");
                }
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={savePreset}
                disabled={!presetName.trim()}
                className="btn btn-primario flex-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guardar
              </button>
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setPresetName("");
                }}
                className="flex-1 px-4 py-2 bg-[var(--surface-hover)] text-[var(--foreground)] rounded-lg font-semibold hover:bg-[var(--background-card)] transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
