"use client";

import { useState } from "react";
import {
  CheckSquare,
  Trash2,
  Archive,
  Eye,
  EyeOff,
  Star,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";

export interface BulkAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  confirmMessage?: string;
  dangerous?: boolean;
}

export interface BulkActionHistory {
  id: string;
  action: string;
  itemsCount: number;
  itemsData: Record<string, unknown>[];
  timestamp: Date;
}

interface BulkActionsAdvancedProps {
  selectedItems: string[];
  totalItems: number;
  actions: BulkAction[];
  onAction: (actionId: string, items: string[]) => Promise<void>;
  onUndo?: (history: BulkActionHistory) => Promise<void>;
  itemsData?: Record<string, unknown>[];
  entityName?: string;
}

export default function BulkActionsAdvanced({
  selectedItems,
  totalItems,
  actions,
  onAction,
  onUndo,
  itemsData = [],
  entityName = "items",
}: BulkActionsAdvancedProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [history, setHistory] = useState<BulkActionHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const toast = useToast();

  const selectedData = itemsData.filter((item) => selectedItems.includes(String(item.id)));

  const handleAction = async (actionId: string) => {
    const action = actions.find((a) => a.id === actionId);

    // Show confirmation for dangerous actions
    if (action?.dangerous || action?.confirmMessage) {
      setShowConfirm(actionId);
      return;
    }

    await executeAction(actionId);
  };

  const executeAction = async (actionId: string) => {
    setLoading(true);
    setShowConfirm(null);
    setShowPreview(false);

    try {
      // Save to history before executing
      const historyEntry: BulkActionHistory = {
        id: Date.now().toString(),
        action: actionId,
        itemsCount: selectedItems.length,
        itemsData: selectedData,
        timestamp: new Date(),
      };

      await onAction(actionId, selectedItems);

      // Add to history
      setHistory((prev) => [historyEntry, ...prev].slice(0, 10)); // Keep last 10 actions

      const action = actions.find((a) => a.id === actionId);
      toast.success(`${selectedItems.length} ${entityName} ${action?.label.toLowerCase()}`);
    } catch (error: unknown) {
      toast.error(`Erro: ${error instanceof Error ? error.message : "Desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async (historyEntry: BulkActionHistory) => {
    if (!onUndo) return;

    setLoading(true);
    try {
      await onUndo(historyEntry);
      setHistory((prev) => prev.filter((h) => h.id !== historyEntry.id));
      toast.success(`Ação revertida: ${historyEntry.action}`);
    } catch (error: unknown) {
      toast.error(`Erro ao reverter: ${error instanceof Error ? error.message : "Desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  const confirmAction = actions.find((a) => a.id === showConfirm);

  if (selectedItems.length === 0) return null;

  return (
    <>
      {/* Bulk Actions Bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
        <div className="bg-gradient-to-r from-[var(--gold)] to-[var(--gold-hover)] rounded-full shadow-2xl px-6 py-4 flex items-center gap-4">
          {/* Selection Count */}
          <div className="flex items-center gap-2 text-black font-bold">
            <CheckSquare className="w-5 h-5" />
            <span>
              {selectedItems.length} / {totalItems} selecionados
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-black/20"></div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleAction(action.id)}
                  disabled={loading}
                  className={`
                    px-4 py-2 rounded-full font-semibold transition-all
                    hover:scale-105 active:scale-95 disabled:opacity-50
                    ${action.color}
                  `}
                  title={action.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}

            {/* Preview Button */}
            <button
              onClick={() => setShowPreview(true)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-black rounded-full font-semibold transition-all"
            >
              <Eye className="w-4 h-4" />
            </button>

            {/* History Button */}
            {onUndo && history.length > 0 && (
              <button
                onClick={() => setShowHistory(true)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-black rounded-full font-semibold transition-all relative"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {history.length}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background-elevated)] border border-white/10 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                Preview: {selectedItems.length} {entityName}
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-white/5 rounded-lg transition-all"
              >
                <Eye className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-3">
                {selectedData.map((item) => (
                  <div
                    key={String(item.id)}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-white font-semibold">
                        {String(item.name || item.title || item.id)}
                      </p>
                      {Boolean(item.email) && (
                        <p className="text-sm text-gray-400">{String(item.email)}</p>
                      )}
                      {Boolean(item.status) && (
                        <span className="inline-block mt-2 px-2 py-1 bg-[var(--elevate-1)] text-[var(--gold)] text-xs rounded">
                          {String(item.status)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && confirmAction && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background-elevated)] border border-white/10 rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 ${confirmAction.dangerous ? "bg-red-500/20" : "bg-yellow-500/20"} rounded-lg flex items-center justify-center`}
                >
                  <AlertCircle
                    className={`w-6 h-6 ${confirmAction.dangerous ? "text-red-400" : "text-yellow-400"}`}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Confirmar Ação</h3>
                  <p className="text-sm text-gray-400">
                    Esta ação afeta {selectedItems.length} {entityName}
                  </p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
                <p className="text-white">
                  {confirmAction.confirmMessage ||
                    `Tens a certeza que queres ${confirmAction.label.toLowerCase()} ${selectedItems.length} ${entityName}?`}
                </p>
                {confirmAction.dangerous && (
                  <p className="text-red-400 text-sm mt-2 font-semibold">
                    ⚠️ Esta ação é irreversível!
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => executeAction(showConfirm)}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 ${
                    confirmAction.dangerous
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black"
                  }`}
                >
                  {loading ? "A executar..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && onUndo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background-elevated)] border border-white/10 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-[var(--gold)]" />
                Histórico de Ações ({history.length})
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-white/5 rounded-lg transition-all"
              >
                <Eye className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-3">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between hover:bg-white/10 transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <p className="text-white font-semibold">{entry.action}</p>
                      </div>
                      <p className="text-sm text-gray-400">
                        {entry.itemsCount} {entityName} •{" "}
                        {new Date(entry.timestamp).toLocaleString("pt-PT")}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUndo(entry)}
                      disabled={loading}
                      className="px-4 py-2 bg-[var(--elevate-1)] hover:bg-[var(--elevate-1)] text-[var(--gold)] rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reverter
                    </button>
                  </div>
                ))}

                {history.length === 0 && (
                  <div className="text-center py-8 text-gray-400">Nenhuma ação no histórico</div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowHistory(false)}
                className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Common bulk action presets
export const commonBulkActions: Record<string, BulkAction> = {
  delete: {
    id: "delete",
    label: "Eliminar",
    icon: Trash2,
    color: "bg-red-500 hover:bg-red-600 text-white",
    confirmMessage: "Esta ação não pode ser revertida. Tens a certeza?",
    dangerous: true,
  },
  archive: {
    id: "archive",
    label: "Arquivar",
    icon: Archive,
    color: "bg-gray-600 hover:bg-gray-700 text-white",
    confirmMessage: "Tens a certeza que queres arquivar estes items?",
  },
  activate: {
    id: "activate",
    label: "Ativar",
    icon: Eye,
    color: "bg-green-600 hover:bg-green-700 text-white",
  },
  deactivate: {
    id: "deactivate",
    label: "Desativar",
    icon: EyeOff,
    color: "bg-orange-600 hover:bg-orange-700 text-white",
  },
  feature: {
    id: "feature",
    label: "Destacar",
    icon: Star,
    color: "bg-yellow-600 hover:bg-yellow-700 text-white",
  },
};
