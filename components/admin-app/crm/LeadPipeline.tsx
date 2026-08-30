"use client";

import { Mail, Phone, Calendar, Pencil, Trash2 } from "lucide-react";
import WhatsAppButton from "@/components/admin/WhatsAppButton";
import { Lead } from "@/types/lead";

const STAGES = [
  { key: "novo", label: "Novo", color: "blue" },
  { key: "contactado", label: "Contactado", color: "cyan" },
  { key: "qualificado", label: "Qualificado", color: "green" },
  { key: "proposta", label: "Proposta", color: "yellow" },
  { key: "negociacao", label: "Negociação", color: "orange" },
  { key: "ganho", label: "Ganho ✓", color: "emerald" },
  { key: "perdido", label: "Perdido ✗", color: "red" },
];

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

function getLeadTemperature(score: number): { label: string; color: string; emoji: string } {
  if (score >= 70) return { label: "Quente", color: "text-red-400", emoji: "🔥" };
  if (score >= 40) return { label: "Morno", color: "text-yellow-400", emoji: "🌤" };
  return { label: "Frio", color: "text-blue-400", emoji: "❄️" };
}

interface LeadPipelineProps {
  leads: Lead[];
  onDragStart: (lead: Lead) => void;
  onDrop: (stage: string) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
}

export default function LeadPipeline({
  leads,
  onDragStart,
  onDrop,
  onEdit,
  onDelete,
}: LeadPipelineProps) {
  const formatCurrency = (cents: number) => {
    return `€${(cents / 100).toLocaleString("pt-PT", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 overflow-x-auto">
      {STAGES.map((stage) => {
        const stageLeads = leads.filter((lead) => lead.stage === stage.key);
        const stageValue = stageLeads.reduce(
          (sum, lead) => sum + ((lead.estimated_value || 0) * (lead.probability || 50)) / 100,
          0
        );

        return (
          <div
            key={stage.key}
            className={`bg-[var(--background-secondary)] border border-${stage.color}-500/20 rounded-lg min-h-[600px]`}
            onDragOver={handleDragOver}
            onDrop={() => onDrop(stage.key)}
          >
            {/* Header da coluna */}
            <div className={`p-4 border-b border-${stage.color}-500/20 bg-${stage.color}-500/5`}>
              <div className="flex items-center justify-between mb-1">
                <h3 className={`font-semibold text-${stage.color}-500`}>{stage.label}</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full bg-${stage.color}-500/20 text-${stage.color}-400 font-medium`}
                >
                  {stageLeads.length}
                </span>
              </div>
              {!["ganho", "perdido"].includes(stage.key) && (
                <p className="text-xs text-gray-500">{formatCurrency(Math.round(stageValue))}</p>
              )}
            </div>

            {/* Cards dos leads */}
            <div className="p-3 space-y-3">
              {stageLeads.map((lead) => {
                const score = calculateLeadScore(lead);
                const temp = getLeadTemperature(score);
                return (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => onDragStart(lead)}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 cursor-move hover:border-white/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-white font-medium text-sm">{lead.name}</h4>
                          <span
                            className={`text-xs ${temp.color}`}
                            title={`Score: ${score} - ${temp.label}`}
                          >
                            {temp.emoji}
                          </span>
                        </div>
                        {lead.company && <p className="text-xs text-gray-500">{lead.company}</p>}
                      </div>
                      <div className="flex gap-1">
                        {lead.telefone && (
                          <WhatsAppButton
                            phone={lead.telefone}
                            name={lead.name}
                            preMessage={`Olá ${lead.name},\n\nRecebi o seu contacto através do Portal Lusitano.\n\n${lead.interests ? `Interesse: ${lead.interests}\n\n` : ""}Como posso ajudar?\n\nCumprimentos,\nPortal Lusitano`}
                            variant="icon"
                            className="p-1"
                          />
                        )}
                        <button
                          onClick={() => onEdit(lead)}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          <Pencil className="text-gray-400" size={12} />
                        </button>
                        <button
                          onClick={() => onDelete(lead.id)}
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
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-600">{score}pts</span>
                        <span className="text-xs text-gray-500">{lead.probability}%</span>
                      </div>
                    </div>
                    {lead.next_follow_up && new Date(lead.next_follow_up) <= new Date() && (
                      <div className="mt-2 text-xs text-orange-400 flex items-center gap-1">
                        <Calendar size={10} />
                        Follow-up pendente!
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
