"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  DollarSign,
  Mail,
  Users,
  Calendar,
  Star,
  Eye,
  Settings,
  RefreshCw,
  Plus,
  X,
  Grid,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Target,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ========================================
// TIPOS
// ========================================

interface Widget {
  id: string;
  title: string;
  enabled: boolean;
  size: "small" | "medium" | "large";
  category: "metrics" | "charts" | "lists" | "actions";
}

interface DashboardData {
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
    mrr: number;
  };
  messages: {
    total: number;
    unread: number;
    last24h: number;
    responseRate: number;
  };
  cavalos: {
    total: number;
    active: number;
    sold: number;
    views: number;
  };
  events: {
    total: number;
    upcoming: number;
    featured: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    message: string;
    time: string;
    icon: string;
  }>;
  quickStats: {
    todayRevenue: number;
    newLeads: number;
    pendingReviews: number;
    activeUsers: number;
  };
}

// ========================================
// SORTABLE WRAPPER
// ========================================

interface SortableWidgetProps {
  id: string;
  children: React.ReactNode;
}

const SortableWidget = ({ id, children }: SortableWidgetProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <div className="p-2 bg-[var(--gold)]/20 hover:bg-[var(--gold)]/30 rounded-lg backdrop-blur-sm">
          <GripVertical className="w-4 h-4 text-[var(--gold)]" />
        </div>
      </div>
      {children}
    </div>
  );
};

// ========================================
// WIDGETS COMPONENTS
// ========================================

const RevenueWidget = ({ data }: { data: DashboardData["revenue"] }) => {
  const growth = data?.growth ?? 0;
  const isPositive = growth >= 0;

  return (
    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6 hover:shadow-lg hover:shadow-green-500/10 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Receita Total</p>
            <h3 className="text-2xl font-bold text-white">
              €{((data?.total ?? 0) / 100).toLocaleString("pt-PT")}
            </h3>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Este Mês</span>
          <span className="text-white font-semibold">
            €{((data?.thisMonth ?? 0) / 100).toLocaleString("pt-PT")}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">MRR</span>
          <span className="text-green-400 font-semibold">
            €{((data?.mrr ?? 0) / 100).toLocaleString("pt-PT")}
          </span>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          {isPositive ? (
            <ArrowUpRight className="w-4 h-4 text-green-400" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-red-400" />
          )}
          <span
            className={`text-sm font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}
          >
            {isPositive ? "+" : ""}
            {growth.toFixed(1)}% vs mês anterior
          </span>
        </div>
      </div>
    </div>
  );
};

const MessagesWidget = ({ data }: { data: DashboardData["messages"] }) => {
  const urgency = data.unread > 10 ? "high" : data.unread > 5 ? "medium" : "low";

  return (
    <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-6 hover:shadow-lg hover:shadow-blue-500/10 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center relative">
            <Mail className="w-6 h-6 text-blue-400" />
            {data.unread > 0 && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {data.unread > 99 ? "99+" : data.unread}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-400">Mensagens</p>
            <h3 className="text-2xl font-bold text-white">{data.total}</h3>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Não Lidas</span>
          <span
            className={`font-semibold ${
              urgency === "high"
                ? "text-red-400"
                : urgency === "medium"
                  ? "text-yellow-400"
                  : "text-gray-400"
            }`}
          >
            {data.unread}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Últimas 24h</span>
          <span className="text-white font-semibold">{data.last24h}</span>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <Target className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-blue-400 font-semibold">
            {data.responseRate}% taxa de resposta
          </span>
        </div>
      </div>
    </div>
  );
};

const QuickStatsWidget = ({ data }: { data: DashboardData["quickStats"] }) => {
  const stats = [
    {
      label: "Receita Hoje",
      value: `€${(data.todayRevenue / 100).toFixed(0)}`,
      icon: DollarSign,
      color: "green",
    },
    { label: "Novos Leads", value: data.newLeads, icon: Users, color: "blue" },
    { label: "Reviews Pendentes", value: data.pendingReviews, icon: Star, color: "yellow" },
    { label: "Utilizadores Ativos", value: data.activeUsers, icon: Eye, color: "purple" },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-[var(--gold)]" />
          Stats Rápidas
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorMap: Record<string, string> = {
            green: "text-green-400 bg-green-500/10",
            blue: "text-blue-400 bg-blue-500/10",
            yellow: "text-yellow-400 bg-yellow-500/10",
            purple: "text-purple-400 bg-purple-500/10",
          };

          return (
            <div
              key={index}
              className="bg-black/20 rounded-lg p-3 hover:bg-black/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-8 h-8 ${colorMap[stat.color]} rounded-lg flex items-center justify-center`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
              <p className="text-xl font-bold text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RecentActivityWidget = ({ data }: { data: DashboardData["recentActivity"] }) => {
  const getIconColor = (type: string) => {
    const map: Record<string, string> = {
      payment: "text-green-400",
      message: "text-blue-400",
      review: "text-yellow-400",
      sale: "text-purple-400",
    };
    return map[type] || "text-gray-400";
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-[var(--gold)]" />
          Atividade Recente
        </h3>
        <button className="text-xs text-gray-400 hover:text-white transition-colors">
          Ver Tudo
        </button>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        {data.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 bg-black/20 rounded-lg hover:bg-black/30 transition-colors"
          >
            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className={`text-lg ${getIconColor(activity.type)}`}>{activity.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white">{activity.message}</p>
              <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const QuickActionsWidget = () => {
  const actions = [
    {
      label: "Novo Cavalo",
      icon: Plus,
      color: "bg-green-500",
      action: () => {},
    },
    {
      label: "Novo Evento",
      icon: Calendar,
      color: "bg-blue-500",
      action: () => {},
    },
    {
      label: "Ver Mensagens",
      icon: Mail,
      color: "bg-purple-500",
      action: () => {},
    },
    {
      label: "Analytics",
      icon: TrendingUp,
      color: "bg-orange-500",
      action: () => {},
    },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-[var(--gold)]" />
        Quick Actions
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={action.action}
              className={`${action.color} hover:opacity-90 text-white rounded-lg p-4 flex flex-col items-center gap-2 transition-all hover:scale-105`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-sm font-semibold">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const AlertsWidget = () => {
  const alerts = [
    { type: "warning", message: "5 reviews pendentes de aprovação", action: "Ver" },
    { type: "info", message: "Backup automático concluído", action: "OK" },
    { type: "success", message: "Meta de receita mensal atingida! 🎉", action: "Ver" },
  ];

  const getAlertStyle = (type: string) => {
    const styles: Record<string, string> = {
      warning: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
      info: "bg-blue-500/10 border-blue-500/20 text-blue-400",
      success: "bg-green-500/10 border-green-500/20 text-green-400",
    };
    return styles[type] || styles.info;
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-[var(--gold)]" />
        Alertas
      </h3>

      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className={`border rounded-lg p-3 flex items-center justify-between ${getAlertStyle(alert.type)}`}
          >
            <p className="text-sm flex-1">{alert.message}</p>
            <button className="text-xs px-3 py-1 bg-white/10 rounded hover:bg-white/20 transition-colors">
              {alert.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ========================================
// DASHBOARD PRINCIPAL
// ========================================

export default function DashboardContentNew() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCustomize, setShowCustomize] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>([
    { id: "revenue", title: "Receita", enabled: true, size: "medium", category: "metrics" },
    { id: "messages", title: "Mensagens", enabled: true, size: "medium", category: "metrics" },
    { id: "quickStats", title: "Stats Rápidas", enabled: true, size: "large", category: "metrics" },
    { id: "activity", title: "Atividade Recente", enabled: true, size: "large", category: "lists" },
    { id: "actions", title: "Quick Actions", enabled: true, size: "medium", category: "actions" },
    { id: "alerts", title: "Alertas", enabled: true, size: "medium", category: "actions" },
  ]);

  // Drag and Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadDashboardData();
    loadWidgetOrder();
  }, []);

  // Load widget order from localStorage
  const loadWidgetOrder = () => {
    const savedOrder = localStorage.getItem("dashboard-widget-order");
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        setWidgets(parsed);
      } catch (error) {
        if (process.env.NODE_ENV === "development") console.error("[DashboardContent]", error);
      }
    }
  };

  // Save widget order to localStorage
  const saveWidgetOrder = (newWidgets: Widget[]) => {
    localStorage.setItem("dashboard-widget-order", JSON.stringify(newWidgets));
  };

  const loadDashboardData = async () => {
    try {
      // DADOS REAIS - API unificada
      const response = await fetch("/api/admin/dashboard");

      // Se não autorizado (401), redirecionar para login
      if (response.status === 401) {
        // Not authorized - redirecting to login
        window.location.href = "/admin/login";
        return;
      }

      if (!response.ok) {
        throw new Error(`Erro ao carregar dados: ${response.status}`);
      }

      const data = await response.json();

      setDashboardData({
        revenue: data.revenue,
        messages: data.messages,
        cavalos: data.cavalos,
        events: data.events,
        recentActivity: data.recentActivity,
        quickStats: data.quickStats,
      });
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[DashboardContent]", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWidget = (id: string) => {
    const newWidgets = widgets.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w));
    setWidgets(newWidgets);
    saveWidgetOrder(newWidgets);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        saveWidgetOrder(newItems);
        return newItems;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--gold)] mx-auto mb-4"></div>
          <p className="text-gray-400">A carregar dashboard...</p>
        </div>
      </div>
    );
  }

  const enabledWidgets = widgets.filter((w) => w.enabled);

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-[var(--background)] via-[var(--background-secondary)] to-[var(--background)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-gray-400">Bem-vindo de volta! Aqui está o resumo do teu negócio</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>

          <button
            onClick={() => setShowCustomize(!showCustomize)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-semibold rounded-lg transition-all"
          >
            <Grid className="w-4 h-4" />
            Personalizar
          </button>
        </div>
      </div>

      {/* Painel de Customização */}
      {showCustomize && (
        <div className="mb-6 bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Escolhe os teus Widgets
            </h3>
            <button
              onClick={() => setShowCustomize(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {widgets.map((widget) => (
              <button
                key={widget.id}
                onClick={() => toggleWidget(widget.id)}
                className={`
                  p-4 rounded-lg border-2 transition-all text-left
                  ${
                    widget.enabled
                      ? "border-[var(--gold)] bg-[var(--gold)]/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white">{widget.title}</span>
                  {widget.enabled && <CheckCircle2 className="w-5 h-5 text-[var(--gold)]" />}
                </div>
                <span className="text-xs text-gray-400">{widget.category}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid de Widgets com Drag-and-Drop */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={enabledWidgets.map((w) => w.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardData &&
              enabledWidgets.map((widget) => {
                if (widget.id === "revenue") {
                  return (
                    <SortableWidget key={widget.id} id={widget.id}>
                      <RevenueWidget data={dashboardData.revenue} />
                    </SortableWidget>
                  );
                }

                if (widget.id === "messages") {
                  return (
                    <SortableWidget key={widget.id} id={widget.id}>
                      <MessagesWidget data={dashboardData.messages} />
                    </SortableWidget>
                  );
                }

                if (widget.id === "quickStats") {
                  return (
                    <div key={widget.id} className="md:col-span-2 lg:col-span-3">
                      <SortableWidget id={widget.id}>
                        <QuickStatsWidget data={dashboardData.quickStats} />
                      </SortableWidget>
                    </div>
                  );
                }

                if (widget.id === "activity") {
                  return (
                    <div key={widget.id} className="md:col-span-2">
                      <SortableWidget id={widget.id}>
                        <RecentActivityWidget data={dashboardData.recentActivity} />
                      </SortableWidget>
                    </div>
                  );
                }

                if (widget.id === "actions") {
                  return (
                    <SortableWidget key={widget.id} id={widget.id}>
                      <QuickActionsWidget />
                    </SortableWidget>
                  );
                }

                if (widget.id === "alerts") {
                  return (
                    <SortableWidget key={widget.id} id={widget.id}>
                      <AlertsWidget />
                    </SortableWidget>
                  );
                }

                return null;
              })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
