"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  User,
  Mail,
  Phone,
  Calendar,
  Plus,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import { Lead, CRMStats } from "@/types/lead";
import Seleccao from "@/components/ui/Seleccao";

const STAGES = [
  { key: "novo", label: "Novo", color: "blue" },
  { key: "contactado", label: "Contactado", color: "cyan" },
  { key: "qualificado", label: "Qualificado", color: "green" },
  { key: "proposta", label: "Proposta", color: "yellow" },
  { key: "negociacao", label: "Negociação", color: "orange" },
  { key: "ganho", label: "Ganho ✓", color: "emerald" },
  { key: "perdido", label: "Perdido ✗", color: "red" },
];

export default function CRMContent() {
  const [isLoading, setIsLoading] = useState(true);

  // Estado dos leads
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [pipelineValue, setPipelineValue] = useState(0);
  const [wonValue, setWonValue] = useState(0);

  // Estado do modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Estado do formulário
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    telefone: "",
    company: "",
    estimated_value: "",
    probability: "50",
    source_type: "",
    interests: "",
    notes: "",
    budget_min: "",
    budget_max: "",
    next_follow_up: "",
  });

  // Estado do drag-and-drop
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  // Buscar leads
  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/crm");
      if (!res.ok) throw new Error("Failed to fetch leads");

      const data = await res.json();
      setLeads(data.leads || []);
      setStats(data.stats || null);
      setPipelineValue(data.pipelineValue || 0);
      setWonValue(data.wonValue || 0);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[CRMContent]", error);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    setIsLoading(false);
  }, [fetchLeads]);

  // Funções de lead
  const createLead = async () => {
    try {
      const res = await fetch("/api/admin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          estimated_value: parseInt(formData.estimated_value) * 100 || 0,
          probability: parseInt(formData.probability) || 50,
          budget_min: formData.budget_min ? parseInt(formData.budget_min) * 100 : null,
          budget_max: formData.budget_max ? parseInt(formData.budget_max) * 100 : null,
        }),
      });

      if (!res.ok) throw new Error("Failed to create lead");

      fetchLeads();
      closeModal();
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[CRMContent]", error);
      alert("Erro ao criar lead");
    }
  };

  const updateLead = async (leadId: string, updates: Partial<Lead>) => {
    try {
      const res = await fetch(`/api/admin/crm/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error("Failed to update lead");

      fetchLeads();
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[CRMContent]", error);
      alert("Erro ao atualizar lead");
    }
  };

  const deleteLead = async (leadId: string) => {
    if (!confirm("Tem certeza que deseja eliminar este lead?")) return;

    try {
      const res = await fetch(`/api/admin/crm/${leadId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete lead");

      fetchLeads();
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[CRMContent]", error);
      alert("Erro ao eliminar lead");
    }
  };

  // Drag-and-drop handlers
  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetStage: string) => {
    if (!draggedLead || draggedLead.stage === targetStage) return;

    updateLead(draggedLead.id, { stage: targetStage });
    setDraggedLead(null);
  };

  // Modal
  const openModal = (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        name: lead.name,
        email: lead.email,
        telefone: lead.telefone || "",
        company: lead.company || "",
        estimated_value: ((lead.estimated_value || 0) / 100).toString(),
        probability: lead.probability.toString(),
        source_type: lead.source_type || "",
        interests: lead.interests || "",
        notes: lead.notes || "",
        budget_min: lead.budget_min ? (lead.budget_min / 100).toString() : "",
        budget_max: lead.budget_max ? (lead.budget_max / 100).toString() : "",
        next_follow_up: lead.next_follow_up
          ? new Date(lead.next_follow_up).toISOString().slice(0, 16)
          : "",
      });
    } else {
      setEditingLead(null);
      setFormData({
        name: "",
        email: "",
        telefone: "",
        company: "",
        estimated_value: "",
        probability: "50",
        source_type: "",
        interests: "",
        notes: "",
        budget_min: "",
        budget_max: "",
        next_follow_up: "",
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLead(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingLead) {
      await updateLead(editingLead.id, {
        name: formData.name,
        email: formData.email,
        telefone: formData.telefone || null,
        company: formData.company || null,
        estimated_value: parseInt(formData.estimated_value) * 100 || 0,
        probability: parseInt(formData.probability) || 50,
        source_type: formData.source_type || null,
        interests: formData.interests || null,
        notes: formData.notes || null,
        budget_min: formData.budget_min ? parseInt(formData.budget_min) * 100 : null,
        budget_max: formData.budget_max ? parseInt(formData.budget_max) * 100 : null,
        next_follow_up: formData.next_follow_up || null,
      });
    } else {
      await createLead();
    }
  };

  const formatCurrency = (cents: number) => {
    return `€${(cents / 100).toLocaleString("pt-PT", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gold)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-[var(--gold)]" size={32} />
              <div>
                <h1 className="text-3xl font-bold text-white">CRM - Pipeline de Vendas</h1>
                <p className="text-gray-400">Gestão visual de leads e oportunidades</p>
              </div>
            </div>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-semibold rounded-lg transition-colors"
            >
              <Plus size={16} />
              Novo Lead
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <User className="text-[var(--gold)]" size={24} />
              <h3 className="text-sm font-medium text-gray-400">Total Leads</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.total || 0}</p>
          </div>

          <div className="bg-white/5 border border-green-500/20 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="text-green-500" size={24} />
              <h3 className="text-sm font-medium text-gray-400">Valor Pipeline</h3>
            </div>
            <p className="text-3xl font-bold text-green-500">
              {formatCurrency(Math.round(pipelineValue))}
            </p>
            <p className="text-xs text-gray-500 mt-1">Valor ponderado por probabilidade</p>
          </div>

          <div className="bg-white/5 border border-emerald-500/20 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-emerald-500" size={24} />
              <h3 className="text-sm font-medium text-gray-400">Vendas Ganhas</h3>
            </div>
            <p className="text-3xl font-bold text-emerald-500">{formatCurrency(wonValue)}</p>
            <p className="text-xs text-gray-500 mt-1">{stats?.ganho || 0} negócios fechados</p>
          </div>

          <div className="bg-white/5 border border-orange-500/20 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="text-orange-500" size={24} />
              <h3 className="text-sm font-medium text-gray-400">Taxa de Conversão</h3>
            </div>
            <p className="text-3xl font-bold text-orange-500">
              {stats && stats.total > 0 ? ((stats.ganho / stats.total) * 100).toFixed(1) : "0.0"}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Leads → Vendas</p>
          </div>
        </div>

        {/* Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 overflow-x-auto pb-6">
          {STAGES.map((stage) => {
            const stageLeads = leads.filter((lead) => lead.stage === stage.key);
            const stageValue = stageLeads.reduce(
              (sum, lead) => sum + ((lead.estimated_value || 0) * (lead.probability || 50)) / 100,
              0
            );

            return (
              <div
                key={stage.key}
                className={`bg-white/5 border border-${stage.color}-500/20 rounded-lg min-h-[600px]`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage.key)}
              >
                {/* Header da coluna */}
                <div
                  className={`p-4 border-b border-${stage.color}-500/20 bg-${stage.color}-500/5`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-semibold text-${stage.color}-500`}>{stage.label}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full bg-${stage.color}-500/20 text-${stage.color}-400 font-medium`}
                    >
                      {stageLeads.length}
                    </span>
                  </div>
                  {!["ganho", "perdido"].includes(stage.key) && (
                    <p className="text-xs text-gray-500">
                      {formatCurrency(Math.round(stageValue))}
                    </p>
                  )}
                </div>

                {/* Cards dos leads */}
                <div className="p-3 space-y-3">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => handleDragStart(lead)}
                      className="bg-white/5 border border-white/10 rounded-lg p-4 cursor-move hover:border-white/30 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-white font-medium text-sm mb-1">{lead.name}</h4>
                          {lead.company && <p className="text-xs text-gray-500">{lead.company}</p>}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openModal(lead)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                          >
                            <Pencil className="text-gray-400" size={12} />
                          </button>
                          <button
                            onClick={() => deleteLead(lead.id)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                          >
                            <Trash2 className="text-red-400" size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Mail size={10} />
                          <span className="truncate">{lead.email}</span>
                        </div>
                        {lead.telefone && (
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Phone size={10} />
                            <span>{lead.telefone}</span>
                          </div>
                        )}
                      </div>

                      {lead.interests && (
                        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{lead.interests}</p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <span className="text-sm font-semibold text-[var(--gold)]">
                          {formatCurrency(lead.estimated_value || 0)}
                        </span>
                        <span className="text-xs text-gray-500">{lead.probability}% prob.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Criar/Editar Lead */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingLead ? "Editar Lead" : "Novo Lead"}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Empresa</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                    className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Origem</label>
                  <Seleccao
                    value={formData.source_type}
                    onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                    className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
                  >
                    <option value="">Selecione...</option>
                    <option value="vender_cavalo">Vender Cavalo</option>
                    <option value="publicidade">Publicidade</option>
                    <option value="instagram">Instagram</option>
                    <option value="direto">Direto</option>
                  </Seleccao>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Próximo Follow-up
                </label>
                <input
                  type="datetime-local"
                  value={formData.next_follow_up}
                  onChange={(e) => setFormData({ ...formData, next_follow_up: e.target.value })}
                  className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)] resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
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
      )}
    </div>
  );
}
