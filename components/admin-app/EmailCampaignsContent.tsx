"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  Send,
  Eye,
  Trash2,
  Plus,
  X,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  recipient_type: "all_leads" | "customers" | "custom";
  recipients_count: number;
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  failed_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  created_by: string;
}

interface CreateCampaignData {
  name: string;
  subject: string;
  html_content: string;
  recipient_type: "all_leads" | "customers" | "custom";
  custom_emails: string;
  schedule_at: string;
  send_immediately: boolean;
}

export default function EmailCampaignsContent() {
  const { success, error: showError } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewCampaign, setPreviewCampaign] = useState<EmailCampaign | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateCampaignData>({
    name: "",
    subject: "",
    html_content: "",
    recipient_type: "all_leads",
    custom_emails: "",
    schedule_at: "",
    send_immediately: true,
  });

  useEffect(() => {
    fetchCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/admin/campaigns");
      if (!res.ok) throw new Error("Erro ao carregar campanhas");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      showError("Erro ao carregar campanhas");
      if (process.env.NODE_ENV === "development") console.error("[EmailCampaigns]", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        subject: formData.subject,
        html_content: formData.html_content,
        recipient_type: formData.recipient_type,
      };

      if (formData.recipient_type === "custom") {
        payload.custom_emails = formData.custom_emails;
      }

      if (!formData.send_immediately && formData.schedule_at) {
        payload.schedule_at = formData.schedule_at;
      }

      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar campanha");
      }

      success("Campanha criada com sucesso", data.message || "A campanha foi criada");

      setIsCreateModalOpen(false);
      resetForm();
      fetchCampaigns();
    } catch (err: unknown) {
      showError("Erro ao criar campanha", err instanceof Error ? err.message : "Erro desconhecido");
      if (process.env.NODE_ENV === "development") console.error("[EmailCampaigns]", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Tem a certeza que deseja eliminar esta campanha?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/campaigns?id=${campaignId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao eliminar campanha");
      }

      success("Campanha eliminada com sucesso");
      fetchCampaigns();
    } catch (err: unknown) {
      showError(
        "Erro ao eliminar campanha",
        err instanceof Error ? err.message : "Erro desconhecido"
      );
      if (process.env.NODE_ENV === "development") console.error("[EmailCampaigns]", err);
    }
  };

  const openPreview = (campaign: EmailCampaign) => {
    setPreviewCampaign(campaign);
    setIsPreviewModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      subject: "",
      html_content: "",
      recipient_type: "all_leads",
      custom_emails: "",
      schedule_at: "",
      send_immediately: true,
    });
  };

  const getStatusBadge = (status: EmailCampaign["status"]) => {
    const statusConfig = {
      draft: {
        icon: AlertCircle,
        label: "Rascunho",
        bg: "bg-gray-500/20",
        text: "text-gray-400",
        border: "border-gray-500",
      },
      scheduled: {
        icon: Clock,
        label: "Agendada",
        bg: "bg-blue-500/20",
        text: "text-blue-400",
        border: "border-blue-500",
      },
      sending: {
        icon: Send,
        label: "A enviar",
        bg: "bg-yellow-500/20",
        text: "text-yellow-400",
        border: "border-yellow-500",
      },
      sent: {
        icon: CheckCircle,
        label: "Enviada",
        bg: "bg-green-500/20",
        text: "text-green-400",
        border: "border-green-500",
      },
      failed: {
        icon: XCircle,
        label: "Falhada",
        bg: "bg-red-500/20",
        text: "text-red-400",
        border: "border-red-500",
      },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  const getRecipientTypeLabel = (type: EmailCampaign["recipient_type"]) => {
    const labels = {
      all_leads: "Todos os Leads",
      customers: "Clientes",
      custom: "Personalizado",
    };
    return labels[type];
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gold)] mx-auto mb-4"></div>
          <p className="text-gray-400">A carregar campanhas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Campanhas de Email</h1>
          <p className="text-gray-400">Gerir e acompanhar campanhas de email marketing</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold)] text-black font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Campanha
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--background-secondary)] border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--gold)]/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-[var(--gold)]" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total</p>
              <p className="text-2xl font-bold text-white">{campaigns.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--background-secondary)] border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Enviadas</p>
              <p className="text-2xl font-bold text-white">
                {campaigns.filter((c) => c.status === "sent").length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--background-secondary)] border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Agendadas</p>
              <p className="text-2xl font-bold text-white">
                {campaigns.filter((c) => c.status === "scheduled").length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--background-secondary)] border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Falhadas</p>
              <p className="text-2xl font-bold text-white">
                {campaigns.filter((c) => c.status === "failed").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="bg-[var(--background-secondary)] border border-gray-800 rounded-lg overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">Nenhuma campanha criada</h3>
            <p className="text-gray-500 mb-6">Crie a sua primeira campanha de email para começar</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold)] text-black font-semibold rounded-lg transition-colors"
            >
              Criar Campanha
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/50 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                    Campanha
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                    Destinatários
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                    Estatísticas
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Data</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-white">{campaign.name}</p>
                        <p className="text-sm text-gray-400">{campaign.subject}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(campaign.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-white font-medium">{campaign.recipients_count}</span>
                        <span className="text-xs text-gray-500">
                          ({getRecipientTypeLabel(campaign.recipient_type)})
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Enviados:</span>
                          <span className="text-green-400 font-semibold">
                            {campaign.sent_count || 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Abertos:</span>
                          <span className="text-blue-400 font-semibold">
                            {campaign.opened_count || 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Cliques:</span>
                          <span className="text-purple-400 font-semibold">
                            {campaign.clicked_count || 0}
                          </span>
                        </div>
                        {campaign.failed_count > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">Falhados:</span>
                            <span className="text-red-400 font-semibold">
                              {campaign.failed_count}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {campaign.sent_at ? (
                          <div>
                            <p className="text-gray-400">Enviada:</p>
                            <p className="text-white">{formatDate(campaign.sent_at)}</p>
                          </div>
                        ) : campaign.scheduled_at ? (
                          <div>
                            <p className="text-gray-400">Agendada:</p>
                            <p className="text-white">{formatDate(campaign.scheduled_at)}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-gray-400">Criada:</p>
                            <p className="text-white">{formatDate(campaign.created_at)}</p>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openPreview(campaign)}
                          className="p-2 text-gray-400 hover:text-[var(--gold)] hover:bg-[var(--gold)]/10 rounded-lg transition-colors"
                          title="Ver preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background-secondary)] border border-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[var(--background-secondary)] border-b border-gray-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Nova Campanha</h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="p-6 space-y-6">
              {/* Campaign Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Nome da Campanha *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]"
                  placeholder="Ex: Newsletter Maio 2024"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Assunto do Email *
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]"
                  placeholder="Ex: Novidades do Portal Lusitano"
                />
              </div>

              {/* HTML Content */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Conteúdo HTML *
                </label>
                <textarea
                  value={formData.html_content}
                  onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                  required
                  rows={10}
                  className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)] font-mono text-sm"
                  placeholder="<html>&#10;  <body>&#10;    <h1>Olá!</h1>&#10;    <p>Conteúdo do email...</p>&#10;  </body>&#10;</html>"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Use HTML válido para o conteúdo do email
                </p>
              </div>

              {/* Recipient Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Destinatários *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, recipient_type: "all_leads" })}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                      formData.recipient_type === "all_leads"
                        ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
                        : "border-gray-700 bg-black/50 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <Users className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm font-semibold">Todos os Leads</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, recipient_type: "customers" })}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                      formData.recipient_type === "customers"
                        ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
                        : "border-gray-700 bg-black/50 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <TrendingUp className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm font-semibold">Clientes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, recipient_type: "custom" })}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                      formData.recipient_type === "custom"
                        ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
                        : "border-gray-700 bg-black/50 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <Mail className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm font-semibold">Personalizado</span>
                  </button>
                </div>
              </div>

              {/* Custom Emails */}
              {formData.recipient_type === "custom" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Emails (separados por vírgula)
                  </label>
                  <textarea
                    value={formData.custom_emails}
                    onChange={(e) => setFormData({ ...formData, custom_emails: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]"
                    placeholder="email1@example.com, email2@example.com"
                  />
                </div>
              )}

              {/* Send Options */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Opções de Envio
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="send_option"
                      checked={formData.send_immediately}
                      onChange={() => setFormData({ ...formData, send_immediately: true })}
                      className="w-4 h-4 text-[var(--gold)] focus:ring-[var(--gold)]"
                    />
                    <span className="text-white">Enviar imediatamente</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="send_option"
                      checked={!formData.send_immediately}
                      onChange={() => setFormData({ ...formData, send_immediately: false })}
                      className="w-4 h-4 text-[var(--gold)] focus:ring-[var(--gold)]"
                    />
                    <span className="text-white">Agendar envio</span>
                  </label>
                </div>
              </div>

              {/* Schedule Date */}
              {!formData.send_immediately && (
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Data e Hora de Envio
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.schedule_at}
                    onChange={(e) => setFormData({ ...formData, schedule_at: e.target.value })}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-[var(--gold)] hover:bg-[var(--gold)] text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                      A criar...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      {formData.send_immediately ? "Criar e Enviar" : "Agendar"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewModalOpen && previewCampaign && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background-secondary)] border border-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-[var(--background-secondary)] border-b border-gray-800 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">{previewCampaign.name}</h2>
                <p className="text-sm text-gray-400 mt-1">Assunto: {previewCampaign.subject}</p>
              </div>
              <button
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  setPreviewCampaign(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-white rounded-lg p-6">
                <iframe
                  srcDoc={previewCampaign.html_content}
                  className="w-full h-[600px] border-0"
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>

            <div className="bg-[var(--background-secondary)] border-t border-gray-800 px-6 py-4">
              <button
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  setPreviewCampaign(null);
                }}
                className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
