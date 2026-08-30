"use client";

import React, { useState } from "react";
import {
  CheckSquare,
  Square,
  Trash2,
  Archive,
  CheckCircle,
  X,
  Download,
  Mail,
  Tag,
} from "lucide-react";

interface BulkAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  action: (selectedIds: string[]) => void | Promise<void>;
}

interface BulkActionsProps {
  items: Record<string, unknown>[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  actions: BulkAction[];
  idField?: string;
}

export default function BulkActions({
  items,
  selectedIds,
  onSelectionChange,
  actions,
  idField = "id",
}: BulkActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < items.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(items.map((item) => String(item[idField])));
    }
  };

  const handleAction = async (action: BulkAction) => {
    if (selectedIds.length === 0) return;

    setIsProcessing(true);
    try {
      await action.action(selectedIds);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[BulkActions]", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="sticky top-0 z-10 bg-gradient-to-r from-[var(--background-secondary)] to-[var(--background-elevated)] border-b border-white/10 shadow-xl">
      <div className="flex items-center gap-4 px-6 py-4">
        {/* Select All Checkbox */}
        <button
          onClick={toggleSelectAll}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors group relative"
          title={allSelected ? "Desselecionar tudo" : "Selecionar tudo"}
        >
          {allSelected ? (
            <CheckSquare className="w-5 h-5 text-[var(--gold)]" />
          ) : someSelected ? (
            <div className="w-5 h-5 border-2 border-[var(--gold)] rounded flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-[var(--gold)] rounded-sm"></div>
            </div>
          ) : (
            <Square className="w-5 h-5 text-gray-400 group-hover:text-white" />
          )}
        </button>

        {/* Counter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{selectedIds.length}</span>
          <span className="text-sm text-gray-400">
            {selectedIds.length === 1 ? "item selecionado" : "items selecionados"}
          </span>
        </div>

        {/* Divider */}
        {selectedIds.length > 0 && (
          <>
            <div className="h-6 w-px bg-white/20"></div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-1">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action)}
                    disabled={isProcessing}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                      transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
                      ${action.color}
                    `}
                    title={action.label}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{action.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Clear Selection */}
            <button
              onClick={() => onSelectionChange([])}
              className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
              title="Limpar seleção"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-[var(--background-secondary)] border border-white/10 rounded-xl px-6 py-4 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--gold)]"></div>
            <span className="text-white font-medium">A processar...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook para gerir seleção
export function useBulkSelection(items: Record<string, unknown>[], idField: string = "id") {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  const clearSelection = () => setSelectedIds([]);

  const selectAll = () => setSelectedIds(items.map((item) => String(item[idField])));

  return {
    selectedIds,
    setSelectedIds,
    toggleItem,
    isSelected,
    clearSelection,
    selectAll,
  };
}

// Exemplos de ações comuns
export const commonBulkActions = {
  delete: (onDelete: (ids: string[]) => Promise<void>): BulkAction => ({
    id: "delete",
    label: "Eliminar",
    icon: Trash2,
    color: "bg-red-500 hover:bg-red-600 text-white",
    action: onDelete,
  }),

  archive: (onArchive: (ids: string[]) => Promise<void>): BulkAction => ({
    id: "archive",
    label: "Arquivar",
    icon: Archive,
    color: "bg-gray-500 hover:bg-gray-600 text-white",
    action: onArchive,
  }),

  approve: (onApprove: (ids: string[]) => Promise<void>): BulkAction => ({
    id: "approve",
    label: "Aprovar",
    icon: CheckCircle,
    color: "bg-green-500 hover:bg-green-600 text-white",
    action: onApprove,
  }),

  export: (onExport: (ids: string[]) => Promise<void>): BulkAction => ({
    id: "export",
    label: "Exportar",
    icon: Download,
    color: "bg-blue-500 hover:bg-blue-600 text-white",
    action: onExport,
  }),

  email: (onEmail: (ids: string[]) => Promise<void>): BulkAction => ({
    id: "email",
    label: "Enviar Email",
    icon: Mail,
    color: "bg-purple-500 hover:bg-purple-600 text-white",
    action: onEmail,
  }),

  addTag: (onAddTag: (ids: string[]) => Promise<void>): BulkAction => ({
    id: "addTag",
    label: "Adicionar Tag",
    icon: Tag,
    color: "bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black",
    action: onAddTag,
  }),
};
