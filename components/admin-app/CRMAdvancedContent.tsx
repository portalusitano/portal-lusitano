"use client";

import { useMemo } from "react";
import {
  Flame,
  Thermometer,
  Snowflake,
  TrendingUp,
  Clock,
  Users,
  AlertTriangle,
  BarChart3,
  Target,
  Star,
} from "lucide-react";
import { Lead } from "@/types/lead";

// -------------------------------------------------------
// Props
// -------------------------------------------------------

interface CRMAdvancedContentProps {
  leads: Lead[];
}

// -------------------------------------------------------
// Lead Scoring
// -------------------------------------------------------

/**
 * Calculate a score for a lead (0-100) based on completeness and value.
 */
function calculateLeadScore(lead: Lead): number {
  let score = 0;

  // Has email (+10)
  if (lead.email && lead.email.trim().length > 0) score += 10;

  // Has phone (+10)
  if (lead.telefone && lead.telefone.trim().length > 0) score += 10;

  // Has budget (+15) -- budget_min or budget_max present
  if (lead.budget_min || lead.budget_max) score += 15;

  // Estimated value thresholds (in cents: 10000 EUR = 1_000_000 cents)
  const valueEur = (lead.estimated_value || 0) / 100;
  if (valueEur > 50000) {
    score += 30;
  } else if (valueEur > 10000) {
    score += 20;
  }

  // Probability above 70% (+15)
  if ((lead.probability || 0) > 70) score += 15;

  // Source type bonus
  if (lead.source_type === "direto") score += 10;
  else if (lead.source_type === "publicidade") score += 5;

  return Math.min(score, 100);
}

type Temperature = "hot" | "warm" | "cold";

function getTemperature(score: number): Temperature {
  if (score > 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

const STAGES_ORDER = [
  "novo",
  "contactado",
  "qualificado",
  "proposta",
  "negociacao",
  "ganho",
  "perdido",
];

const STAGE_LABELS: Record<string, string> = {
  novo: "Novo",
  contactado: "Contactado",
  qualificado: "Qualificado",
  proposta: "Proposta",
  negociacao: "Negociacao",
  ganho: "Ganho",
  perdido: "Perdido",
};

function formatCurrency(cents: number): string {
  return `€${(cents / 100).toLocaleString("pt-PT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function isFollowUpDueOrPast(lead: Lead): boolean {
  if (!lead.next_follow_up) return false;
  const followUp = new Date(lead.next_follow_up);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return followUp <= today;
}

// -------------------------------------------------------
// Sub-components
// -------------------------------------------------------

function TemperatureBadge({ temperature }: { temperature: Temperature }) {
  const config = {
    hot: {
      icon: <Flame className="w-3.5 h-3.5" />,
      label: "Quente",
      classes: "bg-red-500/20 text-red-400 border-red-500/30",
    },
    warm: {
      icon: <Thermometer className="w-3.5 h-3.5" />,
      label: "Morno",
      classes: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    },
    cold: {
      icon: <Snowflake className="w-3.5 h-3.5" />,
      label: "Frio",
      classes: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    },
  };

  const { icon, label, classes } = config[temperature];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${classes}`}
    >
      {icon}
      {label}
    </span>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  borderColor = "border-white/10",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  borderColor?: string;
}) {
  return (
    <div className={`bg-white/5 border ${borderColor} rounded-xl p-5`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h4 className="text-sm font-medium text-gray-400">{title}</h4>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// -------------------------------------------------------
// Main component
// -------------------------------------------------------

export default function CRMAdvancedContent({ leads }: CRMAdvancedContentProps) {
  // ---- Scored leads ----
  const scoredLeads = useMemo(
    () =>
      leads.map((lead) => {
        const score = calculateLeadScore(lead);
        return {
          ...lead,
          score,
          temperature: getTemperature(score),
        };
      }),
    [leads]
  );

  // ---- Temperature counts ----
  const tempCounts = useMemo(() => {
    const counts = { hot: 0, warm: 0, cold: 0 };
    scoredLeads.forEach((l) => {
      counts[l.temperature]++;
    });
    return counts;
  }, [scoredLeads]);

  // ---- RFM-style segmentation ----
  // Simplified segmentation: Champions (ganho + score>70), Engaged (score>40),
  // At Risk (follow-up past due), New (stage=novo), Lost (stage=perdido)
  const rfmSegments = useMemo(() => {
    const segments = {
      champions: 0,
      engaged: 0,
      atRisk: 0,
      newLeads: 0,
      lost: 0,
    };

    scoredLeads.forEach((lead) => {
      if (lead.stage === "perdido") {
        segments.lost++;
      } else if (lead.stage === "ganho" && lead.score > 70) {
        segments.champions++;
      } else if (lead.stage === "novo") {
        segments.newLeads++;
      } else if (isFollowUpDueOrPast(lead)) {
        segments.atRisk++;
      } else if (lead.score >= 40) {
        segments.engaged++;
      } else {
        segments.newLeads++;
      }
    });

    return segments;
  }, [scoredLeads]);

  // ---- Stage conversion metrics ----
  const stageMetrics = useMemo(() => {
    const stageCounts: Record<string, number> = {};
    STAGES_ORDER.forEach((s) => (stageCounts[s] = 0));
    leads.forEach((l) => {
      if (stageCounts[l.stage] !== undefined) {
        stageCounts[l.stage]++;
      }
    });

    const total = leads.length || 1;
    const won = stageCounts["ganho"] || 0;
    const lost = stageCounts["perdido"] || 0;
    const conversionRate = won + lost > 0 ? ((won / (won + lost)) * 100).toFixed(1) : "0.0";

    // Average stage progression (simplified: how many leads advance past 'novo')
    const advancedLeads = leads.filter((l) => l.stage !== "novo").length;
    const advancementRate = ((advancedLeads / total) * 100).toFixed(1);

    return {
      stageCounts,
      conversionRate,
      advancementRate,
      total,
    };
  }, [leads]);

  // ---- Follow-up reminders ----
  const followUpReminders = useMemo(
    () =>
      scoredLeads
        .filter((lead) => isFollowUpDueOrPast(lead))
        .sort((a, b) => {
          const dateA = a.next_follow_up ? new Date(a.next_follow_up).getTime() : 0;
          const dateB = b.next_follow_up ? new Date(b.next_follow_up).getTime() : 0;
          return dateA - dateB;
        }),
    [scoredLeads]
  );

  // ---- Top leads by score ----
  const topLeads = useMemo(
    () =>
      [...scoredLeads]
        .filter((l) => l.stage !== "perdido" && l.stage !== "ganho")
        .sort((a, b) => b.score - a.score)
        .slice(0, 8),
    [scoredLeads]
  );

  // ---- Average score ----
  const averageScore = useMemo(() => {
    if (scoredLeads.length === 0) return 0;
    return Math.round(scoredLeads.reduce((sum, l) => sum + l.score, 0) / scoredLeads.length);
  }, [scoredLeads]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-[var(--gold)]" />
          CRM Avancado
        </h2>
        <p className="text-gray-400 mt-1">Lead scoring, segmentacao e follow-ups</p>
      </div>

      {/* Temperature overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Leads Quentes"
          value={tempCounts.hot}
          subtitle="Score acima de 70"
          icon={<Flame className="w-5 h-5 text-red-400" />}
          borderColor="border-red-500/20"
        />
        <MetricCard
          title="Leads Mornos"
          value={tempCounts.warm}
          subtitle="Score 40 - 70"
          icon={<Thermometer className="w-5 h-5 text-yellow-400" />}
          borderColor="border-yellow-500/20"
        />
        <MetricCard
          title="Leads Frios"
          value={tempCounts.cold}
          subtitle="Score abaixo de 40"
          icon={<Snowflake className="w-5 h-5 text-blue-400" />}
          borderColor="border-blue-500/20"
        />
        <MetricCard
          title="Score Medio"
          value={`${averageScore}/100`}
          subtitle="Todos os leads activos"
          icon={<Star className="w-5 h-5 text-[var(--gold)]" />}
          borderColor="border-[var(--gold)]/20"
        />
      </div>

      {/* RFM Segmentation + Conversion metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RFM Segments */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-[var(--gold)]" />
            Segmentacao RFM
          </h3>
          <div className="space-y-3">
            {[
              {
                label: "Champions",
                count: rfmSegments.champions,
                color: "bg-emerald-500",
                desc: "Ganhos com score alto",
              },
              {
                label: "Engaged",
                count: rfmSegments.engaged,
                color: "bg-blue-500",
                desc: "Score moderado, em progresso",
              },
              {
                label: "Em Risco",
                count: rfmSegments.atRisk,
                color: "bg-orange-500",
                desc: "Follow-up em atraso",
              },
              {
                label: "Novos",
                count: rfmSegments.newLeads,
                color: "bg-cyan-500",
                desc: "Leads recentes ou baixo score",
              },
              {
                label: "Perdidos",
                count: rfmSegments.lost,
                color: "bg-red-500",
                desc: "Negocios nao concretizados",
              },
            ].map((seg) => {
              const pct = leads.length > 0 ? Math.round((seg.count / leads.length) * 100) : 0;
              return (
                <div key={seg.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 ${seg.color} rounded-full`} />
                      <span className="text-sm font-medium text-white">{seg.label}</span>
                      <span className="text-xs text-gray-500">{seg.desc}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {seg.count} <span className="text-gray-500 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${seg.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stage Conversion Metrics */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[var(--gold)]" />
            Metricas de Conversao
          </h3>

          {/* Conversion stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{stageMetrics.conversionRate}%</p>
              <p className="text-xs text-gray-400 mt-1">Taxa Ganho vs Perdido</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{stageMetrics.advancementRate}%</p>
              <p className="text-xs text-gray-400 mt-1">Avancam de &quot;Novo&quot;</p>
            </div>
          </div>

          {/* Stage breakdown */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Distribuicao por Fase</h4>
            {STAGES_ORDER.map((stage) => {
              const count = stageMetrics.stageCounts[stage] || 0;
              const pct =
                stageMetrics.total > 0 ? Math.round((count / stageMetrics.total) * 100) : 0;
              return (
                <div key={stage} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 min-w-[100px]">
                    {STAGE_LABELS[stage] || stage}
                  </span>
                  <div className="flex-1 mx-3">
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--gold)] rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-white font-medium tabular-nums w-12 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Scored Leads + Follow-up Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top leads */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-[var(--gold)]" />
            Top Leads por Score
          </h3>

          {topLeads.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Nenhum lead activo encontrado.</p>
          ) : (
            <div className="space-y-3">
              {topLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white truncate">{lead.name}</span>
                      <TemperatureBadge temperature={lead.temperature} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {lead.company && <span>{lead.company}</span>}
                      <span>{formatCurrency(lead.estimated_value || 0)}</span>
                      <span>{STAGE_LABELS[lead.stage] || lead.stage}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-lg font-bold tabular-nums ${
                        lead.score > 70
                          ? "text-red-400"
                          : lead.score >= 40
                            ? "text-yellow-400"
                            : "text-blue-400"
                      }`}
                    >
                      {lead.score}
                    </div>
                    <div className="text-xs text-gray-500">pontos</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Follow-up reminders */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-orange-400" />
            Follow-ups Pendentes
            {followUpReminders.length > 0 && (
              <span className="ml-auto px-2.5 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-semibold rounded-full">
                {followUpReminders.length}
              </span>
            )}
          </h3>

          {followUpReminders.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Nenhum follow-up pendente.</p>
              <p className="text-gray-600 text-xs mt-1">Todos os lembretes estao em dia.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {followUpReminders.map((lead) => {
                const followUpDate = lead.next_follow_up ? new Date(lead.next_follow_up) : null;
                const now = new Date();
                const isPast = followUpDate ? followUpDate < new Date(now.toDateString()) : false;

                return (
                  <div
                    key={lead.id}
                    className={`flex items-start gap-3 rounded-lg p-3 border ${
                      isPast
                        ? "bg-red-500/5 border-red-500/20"
                        : "bg-orange-500/5 border-orange-500/20"
                    }`}
                  >
                    {isPast ? (
                      <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">{lead.name}</span>
                        <TemperatureBadge temperature={lead.temperature} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {lead.email}
                        {lead.company ? ` - ${lead.company}` : ""}
                      </p>
                      <p
                        className={`text-xs mt-1 font-medium ${
                          isPast ? "text-red-400" : "text-orange-400"
                        }`}
                      >
                        {isPast ? "Em atraso: " : "Hoje: "}
                        {followUpDate
                          ? followUpDate.toLocaleDateString("pt-PT", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">
                      {formatCurrency(lead.estimated_value || 0)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
