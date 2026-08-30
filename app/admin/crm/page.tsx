"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Plus } from "lucide-react";
import Link from "next/link";
import { Lead, CRMStats } from "@/types/lead";
import { LeadStats, LeadPipeline, LeadModal } from "@/components/admin-app/crm";

function calculateLeadScore(lead: Lead): number {
  let score = 0;
  if (lead.email) score += 10;
  if (lead.telefone) score += 10;
  if (lead.budget_min || lead.budget_max) score += 15;
  if (lead.estimated_value > 1000000) score += 30;
  else if (lead.estimated_value > 500000) score += 20;
  else if (lead.estimated_value > 0) score += 10;
  if (lead.probability > 70) score += 15;
  else if (lead.probability > 40) score += 8;
  if (lead.source_type === "direto") score += 10;
  else if (lead.source_type === "publicidade") score += 5;
  if (lead.interests) score += 5;
  if (lead.company) score += 5;
  return Math.min(score, 100);
}

export default function CRMPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [pipelineValue, setPipelineValue] = useState(0);
  const [wonValue, setWonValue] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

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

  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/check");
        const data = await res.json();

        if (!data.authenticated) {
          router.push("/admin/login");
          return;
        }

        setIsAuthenticated(true);
        fetchLeads();
      } catch (error) {
        if (process.env.NODE_ENV === "development") console.error("[CRM]", error);
        router.push("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/admin/crm");
      if (!res.ok) throw new Error("Failed to fetch leads");

      const data = await res.json();
      setLeads(data.leads || []);
      setStats(data.stats || null);
      setPipelineValue(data.pipelineValue || 0);
      setWonValue(data.wonValue || 0);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[CRM]", error);
    }
  };

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
      if (process.env.NODE_ENV === "development") console.error("[CRM]", error);
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
      if (process.env.NODE_ENV === "development") console.error("[CRM]", error);
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
      if (process.env.NODE_ENV === "development") console.error("[CRM]", error);
      alert("Erro ao eliminar lead");
    }
  };

  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead);
  };

  const handleDrop = (targetStage: string) => {
    if (!draggedLead || draggedLead.stage === targetStage) return;

    updateLead(draggedLead.id, { stage: targetStage });
    setDraggedLead(null);
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gold)]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="border-b border-white/10 bg-[var(--background-secondary)]">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <TrendingUp className="text-[var(--gold)]" />
                CRM - Pipeline de Vendas
              </h1>
              <p className="text-gray-400 mt-1">Gestão visual de leads e oportunidades</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => openModal()}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-semibold rounded-lg transition-colors"
              >
                <Plus size={16} />
                Novo Lead
              </button>
              <Link
                href="/admin"
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                ← Voltar ao Admin
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LeadStats stats={stats} pipelineValue={pipelineValue} wonValue={wonValue} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Temperatura dos Leads</h3>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <span>🔥</span>
                <span className="text-red-400 font-semibold">
                  {leads.filter((l) => calculateLeadScore(l) >= 70).length}
                </span>
                <span className="text-xs text-gray-500">Quentes</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🌤</span>
                <span className="text-yellow-400 font-semibold">
                  {
                    leads.filter((l) => {
                      const s = calculateLeadScore(l);
                      return s >= 40 && s < 70;
                    }).length
                  }
                </span>
                <span className="text-xs text-gray-500">Mornos</span>
              </div>
              <div className="flex items-center gap-2">
                <span>❄️</span>
                <span className="text-blue-400 font-semibold">
                  {leads.filter((l) => calculateLeadScore(l) < 40).length}
                </span>
                <span className="text-xs text-gray-500">Frios</span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--background-secondary)] border border-orange-500/20 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Follow-ups Pendentes</h3>
            {leads.filter((l) => l.next_follow_up && new Date(l.next_follow_up) <= new Date())
              .length > 0 ? (
              <div className="space-y-1">
                {leads
                  .filter((l) => l.next_follow_up && new Date(l.next_follow_up) <= new Date())
                  .slice(0, 3)
                  .map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between text-xs">
                      <span className="text-orange-400">{lead.name}</span>
                      <span className="text-gray-500">
                        {new Date(lead.next_follow_up!).toLocaleDateString("pt-PT")}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Nenhum follow-up pendente</p>
            )}
          </div>
        </div>

        <LeadPipeline
          leads={leads}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onEdit={openModal}
          onDelete={deleteLead}
        />
      </div>

      <LeadModal
        isOpen={isModalOpen}
        editingLead={editingLead}
        formData={formData}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onFormChange={(data) => setFormData({ ...formData, ...data })}
      />
    </div>
  );
}
