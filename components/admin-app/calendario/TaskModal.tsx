"use client";

import { X } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  due_date: string;
  status: string;
  priority: string;
  related_email: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
}

interface TaskFormData {
  title: string;
  description: string;
  task_type: string;
  due_date: string;
  priority: string;
  related_email: string;
  notes: string;
}

interface TaskModalProps {
  isOpen: boolean;
  editingTask: Task | null;
  formData: TaskFormData;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFormChange: (data: Partial<TaskFormData>) => void;
}

export default function TaskModal({
  isOpen,
  editingTask,
  formData,
  onClose,
  onSubmit,
  onFormChange,
}: TaskModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">
            {editingTask ? "Editar Tarefa" : "Nova Tarefa"}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Título *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => onFormChange({ title: e.target.value })}
              className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
              placeholder="Ex: Follow-up cliente João"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)] resize-none"
              rows={3}
              placeholder="Detalhes adicionais..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
              <select
                value={formData.task_type}
                onChange={(e) => onFormChange({ task_type: e.target.value })}
                className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
              >
                <option value="follow_up">Follow-up</option>
                <option value="call">Chamada</option>
                <option value="email">Email</option>
                <option value="meeting">Reunião</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Prioridade</label>
              <select
                value={formData.priority}
                onChange={(e) => onFormChange({ priority: e.target.value })}
                className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
              >
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Data e Hora *</label>
            <input
              type="datetime-local"
              required
              value={formData.due_date}
              onChange={(e) => onFormChange({ due_date: e.target.value })}
              className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email do Cliente</label>
            <input
              type="email"
              value={formData.related_email}
              onChange={(e) => onFormChange({ related_email: e.target.value })}
              className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
              placeholder="cliente@exemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notas Internas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => onFormChange({ notes: e.target.value })}
              className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)] resize-none"
              rows={2}
              placeholder="Notas privadas..."
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
              {editingTask ? "Guardar" : "Criar Tarefa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
