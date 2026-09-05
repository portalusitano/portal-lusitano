"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Zap,
  Plus,
  Search,
  Trash2,
  Edit,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Activity,
  AlertCircle,
  X,
  Save,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Seleccao from "@/components/ui/Seleccao";
// Simple toast utility (replace with your preferred toast library)
const toast = {
  success: (message: string) => {
    alert(message);
  },
  error: (message: string) => {
    alert(`Erro: ${message}`);
  },
};

// ========================================
// TIPOS
// ========================================

interface Automation {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger_type: string;
  trigger_conditions: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  delay_minutes: number;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  last_run_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

interface AutomationLog {
  id: string;
  automation_id: string;
  status: string;
  trigger_data: Record<string, unknown>;
  action_result: Record<string, unknown>;
  error_message: string | null;
  executed_at: string;
  completed_at: string | null;
}

interface Stats {
  total: number;
  enabled: number;
  disabled: number;
  total_runs: number;
  total_successful: number;
  total_failed: number;
  success_rate: number;
}

// ========================================
// CONSTANTES
// ========================================

const TRIGGER_TYPES = [
  {
    value: "lead_created",
    label: "Lead Criado",
    icon: "👤",
    description: "Quando um novo lead se regista",
  },
  {
    value: "payment_succeeded",
    label: "Pagamento Bem-Sucedido",
    icon: "💳",
    description: "Após pagamento confirmado",
  },
  {
    value: "review_submitted",
    label: "Review Submetida",
    icon: "⭐",
    description: "Nova review pendente",
  },
  {
    value: "cavalo_created",
    label: "Cavalo Criado",
    icon: "🐴",
    description: "Novo cavalo adicionado",
  },
  { value: "time_based", label: "Baseado em Tempo", icon: "⏰", description: "Execução agendada" },
];

const ACTION_TYPES = [
  {
    value: "send_email",
    label: "Enviar Email",
    icon: "📧",
    description: "Enviar email via Resend",
  },
  {
    value: "create_task",
    label: "Criar Tarefa",
    icon: "✅",
    description: "Criar tarefa no admin_tasks",
  },
  {
    value: "update_field",
    label: "Atualizar Campo",
    icon: "✏️",
    description: "Atualizar campo numa tabela",
  },
  {
    value: "approve_review",
    label: "Aprovar Review",
    icon: "⭐",
    description: "Aprovar review automaticamente",
  },
  {
    value: "send_notification",
    label: "Enviar Notificação",
    icon: "🔔",
    description: "Criar notificação admin",
  },
];

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

export default function AutomationsContent() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEnabled, setFilterEnabled] = useState<"all" | "true" | "false">("all");
  const [filterTrigger, setFilterTrigger] = useState("all");
  const [filterAction, setFilterAction] = useState("all");

  // Modais
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger_type: "lead_created",
    trigger_conditions: "{}",
    action_type: "send_email",
    action_config: "{}",
    delay_minutes: 0,
    enabled: true,
  });

  const loadAutomations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterEnabled !== "all") params.set("enabled", filterEnabled);
      if (filterTrigger !== "all") params.set("trigger_type", filterTrigger);
      if (filterAction !== "all") params.set("action_type", filterAction);

      const response = await fetch(`/api/admin/automations?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setAutomations(data.automations);
      setStats(data.stats);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar automações");
    } finally {
      setLoading(false);
    }
  }, [filterEnabled, filterTrigger, filterAction]);

  useEffect(() => {
    loadAutomations();
  }, [loadAutomations]);

  const handleCreateAutomation = async () => {
    try {
      // Validar JSON
      let trigger_conditions, action_config;
      try {
        trigger_conditions = JSON.parse(formData.trigger_conditions);
        action_config = JSON.parse(formData.action_config);
      } catch {
        toast.error("JSON inválido nas configurações");
        return;
      }

      const response = await fetch("/api/admin/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          trigger_conditions,
          action_config,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      toast.success("Automação criada com sucesso!");
      setShowCreateModal(false);
      resetForm();
      loadAutomations();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar automação");
    }
  };

  const handleUpdateAutomation = async () => {
    if (!selectedAutomation) return;

    try {
      // Validar JSON
      let trigger_conditions, action_config;
      try {
        trigger_conditions = JSON.parse(formData.trigger_conditions);
        action_config = JSON.parse(formData.action_config);
      } catch {
        toast.error("JSON inválido nas configurações");
        return;
      }

      const response = await fetch("/api/admin/automations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAutomation.id,
          ...formData,
          trigger_conditions,
          action_config,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      toast.success("Automação atualizada!");
      setShowEditModal(false);
      setSelectedAutomation(null);
      resetForm();
      loadAutomations();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar automação");
    }
  };

  const handleToggleEnabled = async (automation: Automation) => {
    try {
      const response = await fetch("/api/admin/automations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: automation.id,
          enabled: !automation.enabled,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      toast.success(automation.enabled ? "Automação desativada" : "Automação ativada");
      loadAutomations();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar automação");
    }
  };

  const handleDeleteAutomation = async (automation: Automation) => {
    if (!confirm(`Tem certeza que deseja apagar a automação "${automation.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/automations?id=${automation.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      toast.success("Automação apagada!");
      loadAutomations();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao apagar automação");
    }
  };

  const handleExecuteAutomation = async (automation: Automation) => {
    try {
      const response = await fetch("/api/admin/automations/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          automation_id: automation.id,
          trigger_data: { manual_trigger: true },
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      if (data.success) {
        toast.success("Automação executada com sucesso!");
      } else {
        toast.error(`Erro na execução: ${data.error}`);
      }

      loadAutomations();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao executar automação");
    }
  };

  const openEditModal = (automation: Automation) => {
    setSelectedAutomation(automation);
    setFormData({
      name: automation.name,
      description: automation.description || "",
      trigger_type: automation.trigger_type,
      trigger_conditions: JSON.stringify(automation.trigger_conditions, null, 2),
      action_type: automation.action_type,
      action_config: JSON.stringify(automation.action_config, null, 2),
      delay_minutes: automation.delay_minutes,
      enabled: automation.enabled,
    });
    setShowEditModal(true);
  };

  const openLogsModal = (automation: Automation) => {
    setSelectedAutomation(automation);
    setShowLogsModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      trigger_type: "lead_created",
      trigger_conditions: "{}",
      action_type: "send_email",
      action_config: "{}",
      delay_minutes: 0,
      enabled: true,
    });
  };

  const filteredAutomations = automations.filter((automation) => {
    const matchesSearch =
      automation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      automation.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--gold)] mx-auto mb-4"></div>
          <p className="text-gray-400">A carregar automações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-[var(--background)] via-[var(--background-secondary)] to-[var(--background)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
            <Zap className="w-8 h-8 text-[var(--gold)]" />
            Automações
          </h1>
          <p className="text-gray-400">Configure triggers e ações automáticas</p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-semibold rounded-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Nova Automação
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard title="Total Automações" value={stats.total} icon={Activity} color="blue" />
          <StatsCard title="Ativas" value={stats.enabled} icon={CheckCircle2} color="green" />
          <StatsCard
            title="Total Execuções"
            value={stats.total_runs}
            icon={TrendingUp}
            color="purple"
          />
          <StatsCard
            title="Taxa de Sucesso"
            value={`${stats.success_rate}%`}
            icon={Zap}
            color="yellow"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar automações..."
              className="w-full bg-black/30 border border-white/10 pl-10 pr-4 py-2 text-white rounded-lg focus:outline-none focus:border-[var(--gold)]"
            />
          </div>

          {/* Filter: Status */}
          <Seleccao
            value={filterEnabled}
            onChange={(e) => setFilterEnabled(e.target.value as "all" | "true" | "false")}
            className="bg-black/30 border border-white/10 px-4 py-2 text-white rounded-lg focus:outline-none focus:border-[var(--gold)]"
          >
            <option value="all">Todas</option>
            <option value="true">Apenas Ativas</option>
            <option value="false">Apenas Inativas</option>
          </Seleccao>

          {/* Filter: Trigger */}
          <Seleccao
            value={filterTrigger}
            onChange={(e) => setFilterTrigger(e.target.value)}
            className="bg-black/30 border border-white/10 px-4 py-2 text-white rounded-lg focus:outline-none focus:border-[var(--gold)]"
          >
            <option value="all">Todos os Triggers</option>
            {TRIGGER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Seleccao>

          {/* Filter: Action */}
          <Seleccao
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-black/30 border border-white/10 px-4 py-2 text-white rounded-lg focus:outline-none focus:border-[var(--gold)]"
          >
            <option value="all">Todas as Ações</option>
            {ACTION_TYPES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Seleccao>
        </div>
      </div>

      {/* Automations List */}
      <div className="space-y-4">
        {filteredAutomations.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">Nenhuma automação encontrada</p>
          </div>
        ) : (
          filteredAutomations.map((automation) => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              onToggle={handleToggleEnabled}
              onEdit={openEditModal}
              onDelete={handleDeleteAutomation}
              onExecute={handleExecuteAutomation}
              onViewLogs={openLogsModal}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <AutomationModal
          title="Nova Automação"
          formData={formData}
          setFormData={setFormData}
          onSave={handleCreateAutomation}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
        />
      )}

      {showEditModal && (
        <AutomationModal
          title="Editar Automação"
          formData={formData}
          setFormData={setFormData}
          onSave={handleUpdateAutomation}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAutomation(null);
            resetForm();
          }}
        />
      )}

      {showLogsModal && selectedAutomation && (
        <LogsModal
          automation={selectedAutomation}
          onClose={() => {
            setShowLogsModal(false);
            setSelectedAutomation(null);
          }}
        />
      )}
    </div>
  );
}

// ========================================
// SUB-COMPONENTES
// ========================================

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: typeof Activity;
  color: string;
}

function StatsCard({ title, value, icon: Icon, color }: StatsCardProps) {
  const colorMap: Record<string, string> = {
    blue: "from-blue-500/10 to-cyan-500/10 border-blue-500/20 text-blue-400",
    green: "from-green-500/10 to-emerald-500/10 border-green-500/20 text-green-400",
    purple: "from-purple-500/10 to-pink-500/10 border-purple-500/20 text-purple-400",
    yellow: "from-yellow-500/10 to-orange-500/10 border-yellow-500/20 text-yellow-400",
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-xl p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white">{value}</h3>
        </div>
        <div className={`w-12 h-12 bg-${color}-500/20 rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

interface AutomationCardProps {
  automation: Automation;
  onToggle: (automation: Automation) => void;
  onEdit: (automation: Automation) => void;
  onDelete: (automation: Automation) => void;
  onExecute: (automation: Automation) => void;
  onViewLogs: (automation: Automation) => void;
}

function AutomationCard({
  automation,
  onToggle,
  onEdit,
  onDelete,
  onExecute,
  onViewLogs,
}: AutomationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const trigger = TRIGGER_TYPES.find((t) => t.value === automation.trigger_type);
  const action = ACTION_TYPES.find((a) => a.value === automation.action_type);

  const successRate =
    automation.total_runs > 0
      ? Math.round((automation.successful_runs / automation.total_runs) * 100)
      : 0;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-white">{automation.name}</h3>
            <span
              className={`px-2 py-1 rounded text-xs font-semibold ${
                automation.enabled
                  ? "bg-green-500/20 text-green-400"
                  : "bg-gray-500/20 text-gray-400"
              }`}
            >
              {automation.enabled ? "Ativa" : "Inativa"}
            </span>
          </div>
          {automation.description && (
            <p className="text-sm text-gray-400 mb-3">{automation.description}</p>
          )}

          {/* Trigger & Action */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <span className="text-lg">{trigger?.icon}</span>
              <span className="text-xs text-blue-400">{trigger?.label}</span>
            </div>
            <span className="text-gray-500">→</span>
            <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <span className="text-lg">{action?.icon}</span>
              <span className="text-xs text-purple-400">{action?.label}</span>
            </div>
            {automation.delay_minutes > 0 && (
              <>
                <span className="text-gray-500">⏱️</span>
                <span className="text-xs text-gray-400">Delay: {automation.delay_minutes} min</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(automation)}
            className={`p-2 rounded-lg transition-all ${
              automation.enabled
                ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
            }`}
            title={automation.enabled ? "Desativar" : "Ativar"}
          >
            {automation.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => onExecute(automation)}
            className="p-2 bg-[var(--gold)]/20 text-[var(--gold)] hover:bg-[var(--gold)]/30 rounded-lg transition-all"
            title="Executar agora"
          >
            <Play className="w-4 h-4" />
          </button>

          <button
            onClick={() => onEdit(automation)}
            className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-all"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>

          <button
            onClick={() => onViewLogs(automation)}
            className="p-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition-all"
            title="Ver logs"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete(automation)}
            className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-all"
            title="Apagar"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg transition-all"
            title="Expandir"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 pt-4 border-t border-white/10">
        <div>
          <p className="text-xs text-gray-400">Execuções</p>
          <p className="text-lg font-bold text-white">{automation.total_runs}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Sucesso</p>
          <p className="text-lg font-bold text-green-400">{automation.successful_runs}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Falhas</p>
          <p className="text-lg font-bold text-red-400">{automation.failed_runs}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Taxa</p>
          <p className="text-lg font-bold text-[var(--gold)]">{successRate}%</p>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
          <div>
            <p className="text-xs text-gray-400 mb-1">Trigger Conditions:</p>
            <pre className="text-xs text-white bg-black/30 p-3 rounded-lg overflow-auto">
              {JSON.stringify(automation.trigger_conditions, null, 2)}
            </pre>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Action Config:</p>
            <pre className="text-xs text-white bg-black/30 p-3 rounded-lg overflow-auto">
              {JSON.stringify(automation.action_config, null, 2)}
            </pre>
          </div>
          {automation.last_run_at && (
            <div>
              <p className="text-xs text-gray-400">Última Execução:</p>
              <p className="text-sm text-white">
                {new Date(automation.last_run_at).toLocaleString("pt-PT")}
              </p>
            </div>
          )}
          {automation.last_error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Último Erro:</p>
              <p className="text-sm text-red-400">{automation.last_error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AutomationFormData {
  name: string;
  description: string;
  trigger_type: string;
  trigger_conditions: string;
  action_type: string;
  action_config: string;
  delay_minutes: number;
  enabled: boolean;
}

interface AutomationModalProps {
  title: string;
  formData: AutomationFormData;
  setFormData: (data: AutomationFormData) => void;
  onSave: () => void;
  onClose: () => void;
}

function AutomationModal({ title, formData, setFormData, onSave, onClose }: AutomationModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-all">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome da Automação *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-black/30 border border-white/10 px-4 py-2 text-white rounded-lg focus:outline-none focus:border-[var(--gold)]"
              placeholder="Ex: Boas-vindas a novos leads"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-black/30 border border-white/10 px-4 py-2 text-white rounded-lg focus:outline-none focus:border-[var(--gold)]"
              rows={3}
              placeholder="Descrição da automação..."
            />
          </div>

          {/* Trigger Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Trigger (Quando executar) *
            </label>
            <Seleccao
              value={formData.trigger_type}
              onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
              className="w-full bg-black/30 border border-white/10 px-4 py-2 text-white rounded-lg focus:outline-none focus:border-[var(--gold)]"
            >
              {TRIGGER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.icon} {t.label} - {t.description}
                </option>
              ))}
            </Seleccao>
          </div>

          {/* Trigger Conditions (JSON) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Condições do Trigger (JSON)
            </label>
            <textarea
              value={formData.trigger_conditions}
              onChange={(e) => setFormData({ ...formData, trigger_conditions: e.target.value })}
              className="w-full bg-black/30 border border-white/10 px-4 py-2 text-white rounded-lg focus:outline-none focus:border-[var(--gold)] font-mono text-sm"
              rows={4}
              placeholder='{"amount_min": 50}'
            />
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ação (O que fazer) *
            </label>
            <Seleccao
              value={formData.action_type}
              onChange={(e) => setFormData({ ...formData, action_type: e.target.value })}
              className="w-full bg-black/30 border border-white/10 px-4 py-2 text-white rounded-lg focus:outline-none focus:border-[var(--gold)]"
            >
              {ACTION_TYPES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.icon} {a.label} - {a.description}
                </option>
              ))}
            </Seleccao>
          </div>

          {/* Action Config (JSON) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Configuração da Ação (JSON) *
            </label>
            <textarea
              value={formData.action_config}
              onChange={(e) => setFormData({ ...formData, action_config: e.target.value })}
              className="w-full bg-black/30 border border-white/10 px-4 py-2 text-white rounded-lg focus:outline-none focus:border-[var(--gold)] font-mono text-sm"
              rows={6}
              placeholder='{"to": "email@example.com", "subject": "Assunto"}'
            />
            <p className="text-xs text-gray-500 mt-2">
              Exemplos:
              <br />- Email:{" "}
              {`{"to": "user@example.com", "subject": "Bem-vindo", "template": "welcome"}`}
              <br />- Tarefa:{" "}
              {`{"title": "Follow-up", "task_type": "follow_up", "priority": "alta"}`}
              <br />- Notificação:{" "}
              {`{"title": "Nova Review", "message": "Review pendente", "type": "info"}`}
            </p>
          </div>

          {/* Delay */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Delay (minutos)</label>
            <input
              type="number"
              value={formData.delay_minutes}
              onChange={(e) =>
                setFormData({ ...formData, delay_minutes: parseInt(e.target.value) || 0 })
              }
              className="w-full bg-black/30 border border-white/10 px-4 py-2 text-white rounded-lg focus:outline-none focus:border-[var(--gold)]"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              0 = executar imediatamente, 60 = executar após 1 hora, 1440 = após 24 horas
            </p>
          </div>

          {/* Enabled */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="w-5 h-5 bg-black/30 border border-white/10 rounded focus:ring-[var(--gold)]"
            />
            <label htmlFor="enabled" className="text-sm text-gray-300">
              Ativar automação imediatamente
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-semibold rounded-lg transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

interface LogsModalProps {
  automation: Automation;
  onClose: () => void;
}

function LogsModal({ automation, onClose }: LogsModalProps) {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/automations/logs?automation_id=${automation.id}&limit=10`
      );
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setLogs(data.logs);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar logs");
    } finally {
      setLoading(false);
    }
  }, [automation.id]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Logs de Execução</h2>
            <p className="text-sm text-gray-400">{automation.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-all">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gold)] mx-auto mb-4"></div>
              <p className="text-gray-400">A carregar logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Nenhuma execução registada ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`border rounded-xl p-4 ${
                    log.status === "success"
                      ? "bg-green-500/10 border-green-500/20"
                      : log.status === "failed"
                        ? "bg-red-500/10 border-red-500/20"
                        : "bg-yellow-500/10 border-yellow-500/20"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {log.status === "success" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : log.status === "failed" ? (
                        <XCircle className="w-5 h-5 text-red-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-400" />
                      )}
                      <span
                        className={`font-semibold ${
                          log.status === "success"
                            ? "text-green-400"
                            : log.status === "failed"
                              ? "text-red-400"
                              : "text-yellow-400"
                        }`}
                      >
                        {log.status === "success"
                          ? "Sucesso"
                          : log.status === "failed"
                            ? "Falhou"
                            : "Pendente"}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(log.executed_at).toLocaleString("pt-PT")}
                    </span>
                  </div>

                  {log.error_message && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-400 mb-1">Erro:</p>
                      <p className="text-sm text-red-400">{log.error_message}</p>
                    </div>
                  )}

                  <details className="mt-3">
                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-white">
                      Ver detalhes
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div>
                        <p className="text-xs text-gray-400">Trigger Data:</p>
                        <pre className="text-xs text-white bg-black/30 p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(log.trigger_data, null, 2)}
                        </pre>
                      </div>
                      {log.action_result && (
                        <div>
                          <p className="text-xs text-gray-400">Action Result:</p>
                          <pre className="text-xs text-white bg-black/30 p-2 rounded mt-1 overflow-auto">
                            {JSON.stringify(log.action_result, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
