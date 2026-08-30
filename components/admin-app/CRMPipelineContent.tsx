"use client";

import { useState, useEffect } from "react";
import {
  Users,
  TrendingUp,
  DollarSign,
  Phone,
  Calendar,
  Flame,
  Snowflake,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  value: number;
  temperature: "hot" | "warm" | "cold";
  stage: "lead" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
  lastContact?: string;
  notes?: string;
  source?: string;
}

interface Stage {
  id: string;
  name: string;
  color: string;
  leads: Lead[];
}

const STAGES: { id: Stage["id"]; name: string; color: string }[] = [
  { id: "lead", name: "Novo Lead", color: "bg-gray-500" },
  { id: "contacted", name: "Contactado", color: "bg-blue-500" },
  { id: "qualified", name: "Qualificado", color: "bg-purple-500" },
  { id: "proposal", name: "Proposta", color: "bg-yellow-500" },
  { id: "negotiation", name: "Negociação", color: "bg-orange-500" },
  { id: "won", name: "Ganho 🎉", color: "bg-green-500" },
];

function LeadCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const tempIcon = {
    hot: <Flame className="w-4 h-4 text-red-400" />,
    warm: <TrendingUp className="w-4 h-4 text-yellow-400" />,
    cold: <Snowflake className="w-4 h-4 text-blue-400" />,
  };

  const tempColor = {
    hot: "border-red-500/50 bg-red-500/5",
    warm: "border-yellow-500/50 bg-yellow-500/5",
    cold: "border-blue-500/50 bg-blue-500/5",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        bg-gradient-to-br from-white/5 to-white/10 border rounded-lg p-4
        cursor-grab active:cursor-grabbing hover:shadow-lg transition-all
        ${tempColor[lead.temperature]}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="text-white font-semibold text-sm mb-1">{lead.name}</h4>
          <p className="text-xs text-gray-400">{lead.email}</p>
          {lead.company && <p className="text-xs text-gray-500">{lead.company}</p>}
        </div>
        <div className="flex items-center gap-1">{tempIcon[lead.temperature]}</div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center gap-1 text-green-400">
          <DollarSign className="w-4 h-4" />
          <span className="text-sm font-semibold">
            €{(lead.value / 100).toLocaleString("pt-PT")}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          {lead.phone && <Phone className="w-3 h-3" />}
          {lead.lastContact && (
            <span title={lead.lastContact}>
              <Calendar className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>

      {lead.notes && <p className="mt-2 text-xs text-gray-400 italic line-clamp-2">{lead.notes}</p>}
    </div>
  );
}

function StageColumn({ stage, leads }: { stage: Stage; leads: Lead[] }) {
  const totalValue = leads.reduce((sum, lead) => sum + lead.value, 0);

  return (
    <div className="flex-1 min-w-[280px]">
      <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-xl p-4">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-bold flex items-center gap-2">
              <div className={`w-3 h-3 ${stage.color} rounded-full`}></div>
              {stage.name}
            </h3>
            <span className="text-sm font-semibold text-gray-400">{leads.length}</span>
          </div>
          <p className="text-xs text-green-400 font-semibold">
            €{(totalValue / 100).toLocaleString("pt-PT")}
          </p>
        </div>

        {/* Leads */}
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 min-h-[200px]">
            {leads.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">Nenhum lead nesta fase</div>
            ) : (
              leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

export default function CRMPipelineContent() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      // DADOS REAIS da API
      const response = await fetch("/api/admin/crm/leads");
      if (!response.ok) throw new Error("Erro ao carregar leads");

      const data = await response.json();
      setLeads(data.leads || []);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[CRMPipeline]", error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: { active: { id: string | number } }) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const newStageId = over.id as string;

    // Find if we're dropping on a stage column (not another lead)
    const stageMatch = STAGES.find((s) => s.id === newStageId);
    if (stageMatch) {
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, stage: stageMatch.id as Lead["stage"] } : lead
        )
      );
    }
  };

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  // Group leads by stage
  const stagesWithLeads: Stage[] = STAGES.map((stage) => ({
    ...stage,
    leads: leads.filter((lead) => lead.stage === stage.id),
  }));

  // Stats
  const totalValue = leads.reduce((sum, lead) => sum + lead.value, 0);
  const wonValue = leads
    .filter((l) => l.stage === "won")
    .reduce((sum, lead) => sum + lead.value, 0);
  const conversionRate =
    leads.length > 0 ? (leads.filter((l) => l.stage === "won").length / leads.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-[var(--gold)]" />
            Pipeline CRM
          </h1>
          <p className="text-gray-400">Gestão visual do funil de vendas</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-semibold rounded-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Novo Lead
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Leads</p>
              <p className="text-2xl font-bold text-white">{leads.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Pipeline Value</p>
              <p className="text-2xl font-bold text-white">
                €{(totalValue / 100).toLocaleString("pt-PT")}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Ganhos</p>
              <p className="text-2xl font-bold text-white">
                €{(wonValue / 100).toLocaleString("pt-PT")}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <ChevronRight className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Taxa Conversão</p>
              <p className="text-2xl font-bold text-white">{conversionRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto">
          <div className="flex gap-4 pb-4 min-w-max">
            {stagesWithLeads.map((stage) => (
              <SortableContext
                key={stage.id}
                id={stage.id}
                items={stage.leads.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <StageColumn stage={stage} leads={stage.leads} />
              </SortableContext>
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeLead ? (
            <div className="rotate-3 opacity-90">
              <LeadCard lead={activeLead} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background-elevated)] border border-white/10 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Novo Lead</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-white/5 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Valor (€)</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
                  placeholder="5000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Temperatura</label>
                <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                  <option value="hot">🔥 Quente</option>
                  <option value="warm">📈 Morno</option>
                  <option value="cold">❄️ Frio</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-semibold rounded-lg transition-all"
                >
                  Criar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
