"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  MailOpen,
  CheckCircle2,
  Archive,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  Send,
  X,
  AlertCircle,
  Clock,
  Building2,
  Phone,
  Calendar,
  MessageSquare,
} from "lucide-react";
import WhatsAppButton from "@/components/admin/WhatsAppButton";

interface Message {
  id: string;
  form_type: string;
  name: string;
  email: string;
  telefone: string | null;
  company: string | null;
  form_data: Record<string, unknown>;
  status: string;
  priority: string;
  tags: string[];
  admin_notes: string | null;
  admin_response: string | null;
  payment_id: string | null;
  cavalo_id: string | null;
  created_at: string;
  read_at: string | null;
  responded_at: string | null;
  responded_by: string | null;
}

interface Stats {
  total: number;
  unread: number;
  last24h: number;
  byStatus: {
    novo: number;
    lido: number;
    respondido: number;
    arquivado: number;
  };
}

export default function MensagensPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    formType: "all",
    status: "novo",
    priority: "all",
  });

  // Reply modal state
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, searchTerm]);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/messages/stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[AdminMensagens]", error);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        form_type: filters.formType,
        status: filters.status,
        priority: filters.priority,
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/admin/messages?${params}`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[AdminMensagens]", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMessage = async (message: Message) => {
    setSelectedMessage(message);

    // Marcar como lida se for nova
    if (message.status === "novo") {
      await fetch(`/api/admin/messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "lido" }),
      });

      // Atualizar local
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, status: "lido" } : m)));
      fetchStats();
    }
  };

  const handleUpdateStatus = async (messageId: string, status: string) => {
    try {
      await fetch(`/api/admin/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status } : m)));

      if (selectedMessage?.id === messageId) {
        setSelectedMessage({ ...selectedMessage, status });
      }

      fetchStats();
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[AdminMensagens]", error);
      alert("Erro ao atualizar status");
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replySubject || !replyMessage) {
      alert("Preencha assunto e mensagem");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/admin/messages/${selectedMessage.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: replySubject,
          message: replyMessage,
        }),
      });

      if (!response.ok) throw new Error("Erro ao enviar");

      alert("Email enviado com sucesso!");
      setShowReplyModal(false);
      setReplySubject("");
      setReplyMessage("");

      // Atualizar status
      handleUpdateStatus(selectedMessage.id, "respondido");
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[AdminMensagens]", error);
      alert("Erro ao enviar email");
    } finally {
      setSending(false);
    }
  };

  const getFormTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vender_cavalo: "Vender Cavalo",
      publicidade: "Publicidade",
      instagram: "Instagram",
      contact_general: "Contacto",
    };
    return labels[type] || type;
  };

  const getFormTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      vender_cavalo: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      publicidade: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      instagram: "bg-pink-500/20 text-pink-400 border-pink-500/30",
      contact_general: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    };
    return colors[type] || colors.contact_general;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgente: "text-red-400",
      alta: "text-orange-400",
      normal: "text-yellow-400",
      baixa: "text-gray-400",
    };
    return colors[priority] || colors.normal;
  };

  return (
    <main className="min-h-screen bg-[var(--background)] pt-32 pb-20">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header com Stats */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl text-white mb-2">Mensagens</h1>
              <p className="text-zinc-400">Gestão centralizada de contactos</p>
            </div>

            <button
              onClick={fetchMessages}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw size={18} />
              Actualizar
            </button>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-zinc-900/50 border border-white/10 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Mail className="text-blue-400" size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{stats.total}</div>
                    <div className="text-sm text-zinc-400">Total</div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-orange-500/20 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <AlertCircle className="text-orange-400" size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-400">{stats.unread}</div>
                    <div className="text-sm text-zinc-400">Não Lidas</div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-white/10 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="text-green-400" size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{stats.byStatus.respondido}</div>
                    <div className="text-sm text-zinc-400">Respondidas</div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-white/10 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Clock className="text-purple-400" size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{stats.last24h}</div>
                    <div className="text-sm text-zinc-400">Últimas 24h</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Layout Principal: 3 Colunas */}
        <div className="grid grid-cols-12 gap-6">
          {/* Coluna 1: Filtros */}
          <div className="col-span-2">
            <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 sticky top-36">
              <div className="flex items-center gap-2 mb-4">
                <Filter size={18} className="text-zinc-400" />
                <h3 className="font-medium text-white">Filtros</h3>
              </div>

              {/* Status */}
              <div className="mb-6">
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">
                  Status
                </label>
                <div className="space-y-1">
                  {[
                    { value: "all", label: "Todos", count: stats?.total || 0 },
                    { value: "novo", label: "Novos", count: stats?.byStatus.novo || 0 },
                    { value: "lido", label: "Lidos", count: stats?.byStatus.lido || 0 },
                    {
                      value: "respondido",
                      label: "Respondidos",
                      count: stats?.byStatus.respondido || 0,
                    },
                    {
                      value: "arquivado",
                      label: "Arquivados",
                      count: stats?.byStatus.arquivado || 0,
                    },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setFilters({ ...filters, status: item.value })}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                        filters.status === item.value
                          ? "bg-[var(--gold)] text-black"
                          : "text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className="text-xs">{item.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo de Formulário */}
              <div className="mb-6">
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">
                  Tipo
                </label>
                <div className="space-y-1">
                  {[
                    { value: "all", label: "Todos" },
                    { value: "vender_cavalo", label: "Vender Cavalo" },
                    { value: "publicidade", label: "Publicidade" },
                    { value: "instagram", label: "Instagram" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setFilters({ ...filters, formType: item.value })}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        filters.formType === item.value
                          ? "bg-[var(--gold)] text-black"
                          : "text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prioridade */}
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">
                  Prioridade
                </label>
                <div className="space-y-1">
                  {[
                    { value: "all", label: "Todas" },
                    { value: "urgente", label: "Urgente" },
                    { value: "alta", label: "Alta" },
                    { value: "normal", label: "Normal" },
                    { value: "baixa", label: "Baixa" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setFilters({ ...filters, priority: item.value })}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        filters.priority === item.value
                          ? "bg-[var(--gold)] text-black"
                          : "text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Coluna 2: Lista de Mensagens */}
          <div className="col-span-4">
            {/* Pesquisa */}
            <div className="mb-4">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  size={18}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por nome, email ou empresa..."
                  className="w-full bg-zinc-900/50 border border-white/10 pl-10 pr-4 py-3 text-white rounded-lg focus:outline-none focus:border-[var(--gold)] transition-colors"
                />
              </div>
            </div>

            {/* Lista */}
            <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
              {loading ? (
                <div className="text-center py-20">
                  <RefreshCw className="animate-spin text-[var(--gold)] mx-auto mb-4" size={32} />
                  <p className="text-zinc-500">A carregar...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-20">
                  <Mail className="text-zinc-700 mx-auto mb-4" size={48} />
                  <p className="text-zinc-500">Nenhuma mensagem encontrada</p>
                </div>
              ) : (
                messages.map((message) => (
                  <button
                    key={message.id}
                    onClick={() => handleSelectMessage(message)}
                    className={`w-full text-left p-4 rounded-xl transition-all border ${
                      selectedMessage?.id === message.id
                        ? "bg-[var(--gold)]/20 border-[var(--gold)]"
                        : "bg-zinc-900/30 border-white/5 hover:border-white/10 hover:bg-zinc-900/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 ${message.status === "novo" ? "text-orange-400" : "text-zinc-600"}`}
                      >
                        {message.status === "novo" ? <Mail size={20} /> : <MailOpen size={20} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`font-medium text-white truncate ${message.status === "novo" ? "font-bold" : ""}`}
                          >
                            {message.name}
                          </span>
                          <span
                            className={`flex-shrink-0 w-2 h-2 rounded-full ${getPriorityColor(message.priority)}`}
                          ></span>
                        </div>

                        <div className="text-sm text-zinc-500 truncate mb-2">{message.email}</div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded border ${getFormTypeColor(message.form_type)}`}
                          >
                            {getFormTypeLabel(message.form_type)}
                          </span>

                          <span className="text-xs text-zinc-600">
                            {new Date(message.created_at).toLocaleDateString("pt-PT", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        </div>
                      </div>

                      <ChevronRight size={18} className="text-zinc-600 flex-shrink-0" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Coluna 3: Detalhes */}
          <div className="col-span-6">
            {selectedMessage ? (
              <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6 pb-6 border-b border-white/10">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl text-white">{selectedMessage.name}</h2>
                      <span
                        className={`text-xs px-2 py-1 rounded border ${getFormTypeColor(selectedMessage.form_type)}`}
                      >
                        {getFormTypeLabel(selectedMessage.form_type)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <Mail size={14} />
                        {selectedMessage.email}
                      </span>
                      {selectedMessage.telefone && (
                        <span className="flex items-center gap-1.5">
                          <Phone size={14} />
                          {selectedMessage.telefone}
                        </span>
                      )}
                      {selectedMessage.company && (
                        <span className="flex items-center gap-1.5">
                          <Building2 size={14} />
                          {selectedMessage.company}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3 text-xs text-zinc-500">
                      <Calendar size={12} />
                      {new Date(selectedMessage.created_at).toLocaleDateString("pt-PT", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="text-zinc-500 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Dados do Formulário */}
                <div className="mb-6">
                  <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                    <MessageSquare size={18} />
                    Detalhes do Formulário
                  </h3>

                  <div className="bg-black/50 p-4 rounded-lg space-y-3">
                    {Object.entries(selectedMessage.form_data || {}).map(([key, value]) => (
                      <div key={key} className="flex">
                        <span className="text-zinc-500 text-sm w-40 flex-shrink-0 capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}:
                        </span>
                        <span className="text-zinc-300 text-sm">
                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => {
                      setReplySubject(
                        `Re: ${getFormTypeLabel(selectedMessage.form_type)} - ${selectedMessage.name}`
                      );
                      setShowReplyModal(true);
                    }}
                    className="flex items-center gap-2 bg-[var(--gold)] hover:bg-[var(--gold)] text-black px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <Send size={16} />
                    Responder Email
                  </button>

                  {selectedMessage.telefone && (
                    <WhatsAppButton
                      phone={selectedMessage.telefone}
                      name={selectedMessage.name}
                      context={{
                        type: selectedMessage.form_type,
                        details: JSON.stringify(selectedMessage.form_data),
                      }}
                      variant="button"
                    />
                  )}

                  {selectedMessage.status !== "respondido" && (
                    <button
                      onClick={() => handleUpdateStatus(selectedMessage.id, "respondido")}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <CheckCircle2 size={16} />
                      Marcar Respondida
                    </button>
                  )}

                  {selectedMessage.status !== "arquivado" && (
                    <button
                      onClick={() => handleUpdateStatus(selectedMessage.id, "arquivado")}
                      className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <Archive size={16} />
                      Arquivar
                    </button>
                  )}
                </div>

                {/* Info Adicional */}
                {(selectedMessage.responded_at ||
                  selectedMessage.payment_id ||
                  selectedMessage.cavalo_id) && (
                  <div className="bg-zinc-800/50 p-4 rounded-lg space-y-2 text-sm">
                    {selectedMessage.responded_at && (
                      <div className="text-green-400">
                        ✅ Respondida em{""}
                        {new Date(selectedMessage.responded_at).toLocaleDateString("pt-PT", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {selectedMessage.responded_by && (
                          <span className="text-zinc-500"> por {selectedMessage.responded_by}</span>
                        )}
                      </div>
                    )}

                    {selectedMessage.payment_id && (
                      <div className="text-blue-400">💳 Pagamento associado</div>
                    )}

                    {selectedMessage.cavalo_id && (
                      <div className="text-purple-400">🐴 Anúncio de cavalo criado</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-20 text-center">
                <Mail className="text-zinc-700 mx-auto mb-4" size={64} />
                <p className="text-zinc-500 text-lg">Seleciona uma mensagem para ver detalhes</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Resposta */}
        {showReplyModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
            <div className="bg-zinc-900 border border-white/10 rounded-xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl text-white">Responder Email</h3>
                <button
                  onClick={() => setShowReplyModal(false)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Para:</label>
                  <input
                    type="text"
                    value={selectedMessage?.email || ""}
                    disabled
                    className="w-full bg-zinc-800 border border-white/10 px-4 py-2 text-zinc-500 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Assunto:</label>
                  <input
                    type="text"
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    className="w-full bg-zinc-800 border border-white/10 px-4 py-3 text-white rounded-lg focus:outline-none focus:border-[var(--gold)] transition-colors"
                    placeholder="Assunto do email"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Mensagem:</label>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={10}
                    className="w-full bg-zinc-800 border border-white/10 px-4 py-3 text-white rounded-lg focus:outline-none focus:border-[var(--gold)] transition-colors resize-none"
                    placeholder="Escreva a sua mensagem aqui..."
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowReplyModal(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSendReply}
                    disabled={sending || !replySubject || !replyMessage}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold)] text-black rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <>
                        <RefreshCw className="animate-spin" size={16} />A enviar...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Enviar Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
