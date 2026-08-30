"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NotificationBadge from "@/components/admin/NotificationBadge";
import {
  DollarSign,
  TrendingUp,
  Repeat,
  ShoppingCart,
  Mail,
  Eye,
  Users,
  Calendar,
  Star,
  BarChart2,
  LogOut,
  ExternalLink,
} from "lucide-react";

interface DashboardStats {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalCavalos: number;
  activeCavalos: number;
  soldCavalos: number;
  cavalosViews: number;
  totalEventos: number;
  featuredEventos: number;
  futureEventos: number;
  eventosViews: number;
  totalCoudelarias: number;
  featuredCoudelarias: number;
  totalReviews: number;
  pendingReviews: number;
  approvedReviews: number;
}

interface FinancialOverview {
  totalRevenue: number;
  thisMonthRevenue: number;
  growthPercentage: number;
  mrr: number;
  averageTicket: number;
  totalTransactions: number;
}

interface MessagesStats {
  total: number;
  novo: number;
  lido: number;
  respondido: number;
}

interface RecentMessage {
  id: string;
  name: string;
  email: string;
  form_type: string;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [financial, setFinancial] = useState<FinancialOverview | null>(null);
  const [messages, setMessages] = useState<MessagesStats | null>(null);
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupNeeded, setSetupNeeded] = useState(false);

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllData = async () => {
    try {
      await Promise.all([loadStats(), loadFinancial(), loadMessages(), loadRecentMessages()]);
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("[AdminDashboard]", err);
      setError("Erro ao carregar alguns dados");
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch("/api/admin/stats");
      if (!response.ok) throw new Error("Erro ao carregar estatísticas");
      const data = await response.json();
      setStats(data);
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("[AdminDashboard]", err);
    }
  };

  const loadFinancial = async () => {
    try {
      const response = await fetch("/api/admin/financeiro/overview");
      if (!response.ok) {
        if (response.status === 500 || response.status === 404) {
          setSetupNeeded(true);
        }
        throw new Error("Erro ao carregar dados financeiros");
      }
      const data = await response.json();
      setFinancial(data.overview);
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("[AdminDashboard]", err);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await fetch("/api/admin/messages/stats");
      if (!response.ok) {
        if (response.status === 500 || response.status === 404) {
          setSetupNeeded(true);
        }
        throw new Error("Erro ao carregar mensagens");
      }
      const data = await response.json();
      setMessages(data.stats);
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("[AdminDashboard]", err);
    }
  };

  const loadRecentMessages = async () => {
    try {
      const response = await fetch("/api/admin/messages?limit=5&page=1");
      if (!response.ok) throw new Error("Erro ao carregar mensagens recentes");
      const data = await response.json();
      setRecentMessages(data.messages);
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("[AdminDashboard]", err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[AdminDashboard]", error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("pt-PT").format(value);
  };

  const getFormTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vender_cavalo: "Vender Cavalo",
      publicidade: "Publicidade",
      instagram: "Instagram",
      contact_general: "Contacto Geral",
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      novo: "bg-blue-500/10 text-blue-500",
      lido: "bg-yellow-500/10 text-yellow-500",
      respondido: "bg-green-500/10 text-green-500",
      arquivado: "bg-gray-500/10 text-gray-500",
    };
    return colors[status] || "bg-gray-500/10 text-gray-500";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gold)] mx-auto"></div>
          <p className="text-gray-400 mt-4">A carregar dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[var(--background-secondary)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard Administrativo</h1>
              <p className="text-gray-400 mt-1">Portal Lusitano - Visão Geral Completa</p>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBadge />
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition-colors"
              >
                <ExternalLink size={16} />
                Ver Site
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Aviso se dados não carregarem */}
        {setupNeeded && (
          <div className="mb-6 p-6 bg-orange-500/10 border-2 border-orange-500/30 rounded-lg">
            <div className="flex items-start gap-4">
              <div className="text-3xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-orange-500 mb-2">Setup Necessário</h3>
                <p className="text-gray-300 mb-3">
                  Alguns dados não estão disponíveis porque as tabelas SQL ainda não foram criadas.
                </p>
                <div className="bg-black/30 p-4 rounded-lg border border-white/10">
                  <p className="text-sm text-gray-300 font-mono mb-2">📋 Siga estes passos:</p>
                  <ol className="text-sm text-gray-400 space-y-1 ml-4 list-decimal">
                    <li>
                      Abra o ficheiro <code className="text-[var(--gold)]">INSTALAR_ADMIN.md</code>
                    </li>
                    <li>Siga as instruções para executar o SQL no Supabase</li>
                    <li>Recarregue esta página (F5)</li>
                  </ol>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  ⏱️ Demora apenas 5 minutos e depois terás acesso completo ao dashboard financeiro
                  e inbox de mensagens!
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-500">{error}</p>
          </div>
        )}

        {/* SECÇÃO FINANCEIRA */}
        {financial && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">💰 Financeiro</h2>
              <Link
                href="/admin/financeiro"
                className="text-[var(--gold)] hover:text-[var(--gold-hover)] text-sm font-medium transition-colors"
              >
                Ver Dashboard Completo →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {/* Receita Total */}
              <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6 hover:border-[var(--gold)]/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">Receita Total</h3>
                  <DollarSign className="text-[var(--gold)]" size={20} />
                </div>
                <p className="text-3xl font-bold text-white">
                  {formatCurrency(financial.totalRevenue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Desde o início</p>
              </div>

              {/* Receita Este Mês */}
              <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6 hover:border-green-500/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">Este Mês</h3>
                  <TrendingUp className="text-green-500" size={20} />
                </div>
                <p className="text-3xl font-bold text-white">
                  {formatCurrency(financial.thisMonthRevenue)}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    financial.growthPercentage >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {financial.growthPercentage >= 0 ? "+" : ""}
                  {financial.growthPercentage.toFixed(1)}% vs mês passado
                </p>
              </div>

              {/* MRR */}
              <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6 hover:border-[var(--gold)]/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">MRR</h3>
                  <Repeat className="text-[var(--gold)]" size={20} />
                </div>
                <p className="text-3xl font-bold text-white">{formatCurrency(financial.mrr)}</p>
                <p className="text-xs text-gray-500 mt-1">Receita recorrente</p>
              </div>

              {/* Transações */}
              <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6 hover:border-[var(--gold)]/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">Transações</h3>
                  <ShoppingCart className="text-[var(--gold)]" size={20} />
                </div>
                <p className="text-3xl font-bold text-white">{financial.totalTransactions}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Ticket médio: {formatCurrency(financial.averageTicket)}
                </p>
              </div>
            </div>
          </>
        )}

        {/* SECÇÃO MENSAGENS */}
        {messages && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">📨 Mensagens & Contactos</h2>
              <Link
                href="/admin/mensagens"
                className="text-[var(--gold)] hover:text-[var(--gold-hover)] text-sm font-medium transition-colors"
              >
                Ver Inbox Completo →
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
              {/* Stats de Mensagens */}
              <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="text-[var(--gold)]" size={24} />
                  <h3 className="text-lg font-semibold text-white">Status das Mensagens</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Novas</span>
                    <span className="text-2xl font-bold text-blue-500">{messages.novo}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Lidas</span>
                    <span className="text-xl font-semibold text-yellow-500">{messages.lido}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Respondidas</span>
                    <span className="text-xl font-semibold text-green-500">
                      {messages.respondido}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-medium">Total</span>
                      <span className="text-xl font-bold text-white">{messages.total}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mensagens Recentes */}
              <div className="lg:col-span-2 bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Mensagens Recentes</h3>
                <div className="space-y-3">
                  {recentMessages.length > 0 ? (
                    recentMessages.map((msg) => (
                      <Link
                        key={msg.id}
                        href={`/admin/mensagens?id=${msg.id}`}
                        className="block p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-white">{msg.name}</p>
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(msg.status)}`}
                              >
                                {msg.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-400">{msg.email}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {getFormTypeLabel(msg.form_type)} •{" "}
                              {new Date(msg.created_at).toLocaleDateString("pt-PT")}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">Nenhuma mensagem recente</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* SECÇÃO ANALYTICS */}
        {stats && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">📊 Analytics & Performance</h2>
              <Link
                href="/admin/analytics"
                className="text-[var(--gold)] hover:text-[var(--gold-hover)] text-sm font-medium transition-colors"
              >
                Ver Analytics Completo →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {/* Views Totais */}
              <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6 hover:border-blue-500/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">Total Views</h3>
                  <Eye className="text-blue-500" size={20} />
                </div>
                <p className="text-3xl font-bold text-white">
                  {formatNumber(stats.cavalosViews + stats.eventosViews)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatNumber(stats.cavalosViews)} cavalos • {formatNumber(stats.eventosViews)}{" "}
                  eventos
                </p>
              </div>

              {/* Leads */}
              <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6 hover:border-green-500/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">Leads (Ebook)</h3>
                  <Users className="text-green-500" size={20} />
                </div>
                <p className="text-3xl font-bold text-white">{stats.totalLeads}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.conversionRate}% taxa conversão</p>
              </div>

              {/* Reviews */}
              <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6 hover:border-yellow-500/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">Reviews</h3>
                  <Star className="text-yellow-500" size={20} />
                </div>
                <p className="text-3xl font-bold text-white">{stats.totalReviews}</p>
                <p className="text-xs text-yellow-500 mt-1">
                  {stats.pendingReviews} pendentes aprovação
                </p>
              </div>

              {/* Eventos */}
              <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6 hover:border-purple-500/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">Eventos</h3>
                  <Calendar className="text-purple-500" size={20} />
                </div>
                <p className="text-3xl font-bold text-white">{stats.totalEventos}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.futureEventos} futuros</p>
              </div>
            </div>
          </>
        )}

        {/* GESTÃO DE CONTEÚDO */}
        {stats && (
          <>
            <h2 className="text-2xl font-bold text-white mb-6">🎯 Gestão de Conteúdo</h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
              <Link
                href="/admin/cavalos"
                className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20 hover:border-orange-500/40 rounded-lg p-4 text-center transition-all hover:scale-105"
              >
                <p className="text-3xl mb-2">🐴</p>
                <p className="font-semibold text-white">Marketplace</p>
                <p className="text-sm text-gray-400">{stats.totalCavalos} cavalos</p>
              </Link>

              <Link
                href="/admin/eventos"
                className="bg-gradient-to-br from-pink-500/10 to-pink-600/10 border border-pink-500/20 hover:border-pink-500/40 rounded-lg p-4 text-center transition-all hover:scale-105"
              >
                <p className="text-3xl mb-2">📅</p>
                <p className="font-semibold text-white">Eventos</p>
                <p className="text-sm text-gray-400">{stats.totalEventos} eventos</p>
              </Link>

              <Link
                href="/directorio"
                className="bg-gradient-to-br from-teal-500/10 to-teal-600/10 border border-teal-500/20 hover:border-teal-500/40 rounded-lg p-4 text-center transition-all hover:scale-105"
              >
                <p className="text-3xl mb-2">🏠</p>
                <p className="font-semibold text-white">Coudelarias</p>
                <p className="text-sm text-gray-400">{stats.totalCoudelarias} registadas</p>
              </Link>

              <Link
                href="/admin/reviews"
                className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 hover:border-yellow-500/40 rounded-lg p-4 text-center transition-all hover:scale-105"
              >
                <p className="text-3xl mb-2">⭐</p>
                <p className="font-semibold text-white">Reviews</p>
                <p className="text-sm text-gray-400">{stats.pendingReviews} pendentes</p>
              </Link>

              <Link
                href="/admin/denuncias"
                className="bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 hover:border-red-500/40 rounded-lg p-4 text-center transition-all hover:scale-105"
              >
                <p className="text-3xl mb-2">⚠️</p>
                <p className="font-semibold text-white">Denúncias</p>
                <p className="text-sm text-gray-400">Anúncios reportados</p>
              </Link>
            </div>
          </>
        )}

        {/* DASHBOARDS ESPECIALIZADOS */}
        <div className="bg-gradient-to-br from-[var(--gold)]/10 to-[var(--gold)]/5 border border-[var(--gold)]/20 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">🚀 Dashboards Especializados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link
              href="/admin/financeiro"
              className="bg-[var(--background-secondary)] border border-white/10 hover:border-[var(--gold)]/50 rounded-lg p-6 transition-all hover:scale-105"
            >
              <div className="flex items-center gap-3 mb-3">
                <DollarSign className="text-[var(--gold)]" size={28} />
                <h3 className="text-lg font-bold text-white">Dashboard Financeiro</h3>
              </div>
              <p className="text-sm text-gray-400">
                Receitas, MRR, gráficos, transações e exportação CSV
              </p>
            </Link>

            <Link
              href="/admin/mensagens"
              className="bg-[var(--background-secondary)] border border-white/10 hover:border-blue-500/50 rounded-lg p-6 transition-all hover:scale-105"
            >
              <div className="flex items-center gap-3 mb-3">
                <Mail className="text-blue-500" size={28} />
                <h3 className="text-lg font-bold text-white">Inbox de Mensagens</h3>
              </div>
              <p className="text-sm text-gray-400">
                Gestão centralizada de todos os contactos e formulários
              </p>
            </Link>

            <Link
              href="/admin/analytics"
              className="bg-[var(--background-secondary)] border border-white/10 hover:border-green-500/50 rounded-lg p-6 transition-all hover:scale-105"
            >
              <div className="flex items-center gap-3 mb-3">
                <BarChart2 className="text-green-500" size={28} />
                <h3 className="text-lg font-bold text-white">Analytics Completo</h3>
              </div>
              <p className="text-sm text-gray-400">
                Tráfego, conversões, performance e análise de leads
              </p>
            </Link>

            <Link
              href="/admin/calendario"
              className="bg-[var(--background-secondary)] border border-white/10 hover:border-purple-500/50 rounded-lg p-6 transition-all hover:scale-105"
            >
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="text-purple-500" size={28} />
                <h3 className="text-lg font-bold text-white">Calendário Follow-ups</h3>
              </div>
              <p className="text-sm text-gray-400">
                Gestão de tarefas, lembretes e follow-ups de clientes
              </p>
            </Link>

            <Link
              href="/admin/crm"
              className="bg-[var(--background-secondary)] border border-white/10 hover:border-orange-500/50 rounded-lg p-6 transition-all hover:scale-105"
            >
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="text-orange-500" size={28} />
                <h3 className="text-lg font-bold text-white">CRM Pipeline</h3>
              </div>
              <p className="text-sm text-gray-400">Pipeline visual de vendas com drag-and-drop</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
