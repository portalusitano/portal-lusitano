"use client";

import { X } from "lucide-react";
import { Lead } from "@/types/lead";

interface LeadFormData {
  name: string;
  email: string;
  telefone: string;
  company: string;
  estimated_value: string;
  probability: string;
  source_type: string;
  interests: string;
  notes: string;
  budget_min: string;
  budget_max: string;
  next_follow_up: string;
}

interface LeadModalProps {
  isOpen: boolean;
  editingLead: Lead | null;
  formData: LeadFormData;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFormChange: (data: Partial<LeadFormData>) => void;
}

export default function LeadModal({
  isOpen,
  editingLead,
  formData,
  onClose,
  onSubmit,
  onFormChange,
}: LeadModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg max-w-2xl w-full p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">
            {editingLead ? "Editar Lead" : "Novo Lead"}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nome *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => onFormChange({ name: e.target.value })}
                className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => onFormChange({ email: e.target.value })}
                className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Telefone</label>
              <input
                type="text"
                value={formData.telefone}
                onChange={(e) => onFormChange({ telefone: e.target.value })}
                className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Empresa</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => onFormChange({ company: e.target.value })}
                className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Interesses/Necessidades
            </label>
            <textarea
              value={formData.interests}
              onChange={(e) => onFormChange({ interests: e.target.value })}
              className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)] resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Valor Estimado (€)
              </label>
              <input
                type="number"
                value={formData.estimated_value}
                onChange={(e) => onFormChange({ estimated_value: e.target.value })}
                className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Probabilidade (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => onFormChange({ probability: e.target.value })}
                className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Origem</label>
              <select
                value={formData.source_type}
                onChange={(e) => onFormChange({ source_type: e.target.value })}
                className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
              >
                <option value="">Selecione...</option>
                <option value="vender_cavalo">Vender Cavalo</option>
                <option value="publicidade">Publicidade</option>
                <option value="instagram">Instagram</option>
                <option value="direto">Direto</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Próximo Follow-up
            </label>
            <input
              type="datetime-local"
              value={formData.next_follow_up}
              onChange={(e) => onFormChange({ next_follow_up: e.target.value })}
              className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => onFormChange({ notes: e.target.value })}
              className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)] resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-semibold rounded-lg transition-colors"
            >
              {editingLead ? "Guardar" : "Criar Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
