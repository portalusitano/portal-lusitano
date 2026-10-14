"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { useTab } from "@/context/TabContext";
import {
  X,
  LogOut,
  Menu,
  Home,
  Users,
  Calendar,
  Star,
  Mail,
  DollarSign,
  BarChart2,
  Settings,
  Tag,
  FileText,
  Award,
  Briefcase,
  TrendingUp,
  MessageSquare,
  Shield,
  Map,
  Activity,
} from "lucide-react";
import Image from "next/image";

// Lazy load das páginas para performance
const DashboardContent = lazy(() => import("@/components/admin-app/DashboardContent"));
const CavalosContent = lazy(() => import("@/components/admin-app/CavalosContent"));
const EventosContent = lazy(() => import("@/components/admin-app/EventosContent"));
const CoudelariasContent = lazy(() => import("@/components/admin-app/CoudelariasContent"));
const ProfissionaisContent = lazy(() => import("@/components/admin-app/ProfissionaisContent"));
const MensagensContent = lazy(() => import("@/components/admin-app/MensagensContent"));
const CupoesContent = lazy(() => import("@/components/admin-app/CupoesContent"));
const FinanceiroContent = lazy(() => import("@/components/admin-app/FinanceiroContent"));
const ReviewsContent = lazy(() => import("@/components/admin-app/ReviewsContent"));
const AnalyticsContent = lazy(() => import("@/components/admin-app/AnalyticsContent"));
const CalendarioContent = lazy(() => import("@/components/admin-app/CalendarioContent"));
const TasksContent = lazy(() => import("@/components/admin-app/TasksContent"));
const CRMContent = lazy(() => import("@/components/admin-app/CRMContent"));
const DepoimentosContent = lazy(() => import("@/components/admin-app/DepoimentosContent"));
const DefinicoesContent = lazy(() => import("@/components/admin-app/DefinicoesContent"));
const LogsContent = lazy(() => import("@/components/admin-app/LogsContent"));
const UsersContent = lazy(() => import("@/components/admin-app/UsersContent"));
const GeoAnalyticsContent = lazy(() => import("@/components/admin-app/GeoAnalyticsContent"));
const ForecastingContent = lazy(() => import("@/components/admin-app/ForecastingContent"));
const AutomationsContent = lazy(() => import("@/components/admin-app/AutomationsContent"));
const GlobalSearch = lazy(() => import("@/components/admin-app/GlobalSearch"));
const NotificationCenter = lazy(() => import("@/components/admin-app/NotificationCenter"));

interface MenuItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  emoji: string;
  component: React.LazyExoticComponent<React.ComponentType>;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: Home,
    emoji: "🏠",
    component: DashboardContent,
  },
  {
    id: "cavalos",
    title: "Cavalos",
    icon: Users,
    emoji: "🐴",
    component: CavalosContent,
  },
  {
    id: "eventos",
    title: "Eventos",
    icon: Calendar,
    emoji: "📅",
    component: EventosContent,
  },
  {
    id: "coudelarias",
    title: "Coudelarias",
    icon: Briefcase,
    emoji: "🏛️",
    component: CoudelariasContent,
  },
  {
    id: "profissionais",
    title: "Profissionais",
    icon: Award,
    emoji: "👔",
    component: ProfissionaisContent,
  },
  {
    id: "reviews",
    title: "Reviews",
    icon: Star,
    emoji: "⭐",
    component: ReviewsContent,
  },
  {
    id: "mensagens",
    title: "Mensagens",
    icon: Mail,
    emoji: "📧",
    component: MensagensContent,
  },
  {
    id: "cupoes",
    title: "Cupões",
    icon: Tag,
    emoji: "💰",
    component: CupoesContent,
  },
  {
    id: "financeiro",
    title: "Financeiro",
    icon: DollarSign,
    emoji: "💵",
    component: FinanceiroContent,
  },
  {
    id: "depoimentos",
    title: "Depoimentos",
    icon: MessageSquare,
    emoji: "💬",
    component: DepoimentosContent,
  },
  {
    id: "crm",
    title: "CRM",
    icon: TrendingUp,
    emoji: "💼",
    component: CRMContent,
  },
  {
    id: "calendario",
    title: "Calendário",
    icon: Calendar,
    emoji: "📅",
    component: CalendarioContent,
  },
  {
    id: "tasks",
    title: "Tarefas",
    icon: FileText,
    emoji: "✅",
    component: TasksContent,
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: BarChart2,
    emoji: "📊",
    component: AnalyticsContent,
  },
  {
    id: "geo",
    title: "Geo Analytics",
    icon: Map,
    emoji: "🗺️",
    component: GeoAnalyticsContent,
  },
  {
    id: "forecasting",
    title: "Previsões",
    icon: Activity,
    emoji: "🔮",
    component: ForecastingContent,
  },
  {
    id: "automations",
    title: "Automações",
    icon: Activity,
    emoji: "⚡",
    component: AutomationsContent,
  },
  {
    id: "logs",
    title: "Logs",
    icon: FileText,
    emoji: "📋",
    component: LogsContent,
  },
  {
    id: "users",
    title: "Utilizadores",
    icon: Shield,
    emoji: "🔐",
    component: UsersContent,
  },
  {
    id: "definicoes",
    title: "Definições",
    icon: Settings,
    emoji: "⚙️",
    component: DefinicoesContent,
  },
];

export default function AdminAppPage() {
  const { tabs, activeTabId, addTab, closeTab, setActiveTabId } = useTab();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Verificar autenticação
  useEffect(() => {
    const token = document.cookie.split("; ").find((row) => row.startsWith("auth-token="));

    if (token) {
      setIsAuthenticated(true);
      // Abrir dashboard por padrão se não houver tabs
      if (tabs.length === 0) {
        handleMenuClick(MENU_ITEMS[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (!response.ok) {
        setLoginError(data.error || "Erro ao fazer login");
        return;
      }

      setIsAuthenticated(true);
      handleMenuClick(MENU_ITEMS[0]); // Abrir dashboard
    } catch {
      setLoginError("Erro ao conectar ao servidor");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleMenuClick = (item: MenuItem) => {
    const Component = item.component;

    addTab({
      id: item.id,
      title: item.title,
      icon: item.emoji,
      component: (
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C5A059]"></div>
            </div>
          }
        >
          <Component />
        </Suspense>
      ),
      closable: item.id !== "dashboard", // Dashboard não pode fechar
    });
  };

  const handleLogout = () => {
    document.cookie = "auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    setIsAuthenticated(false);
    setLoginForm({ email: "", password: "" });
  };

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Tela de Login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <Image
                src="/logo.png"
                alt="Portal Lusitano"
                width={96}
                height={96}
                className="mx-auto mb-4 object-contain"
              />
              <h1 className="text-3xl font-bold text-[#C5A059] mb-2">Portal Lusitano</h1>
              <p className="text-gray-400">Admin App - Sistema de Gestão</p>
            </div>

            {/* Formulário */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full bg-black/30 border border-white/10 px-4 py-3 text-white rounded-lg focus:outline-none focus:border-[#C5A059] transition-colors"
                  placeholder="admin@portal-lusitano.pt"
                  required
                  disabled={isLoggingIn}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full bg-black/30 border border-white/10 px-4 py-3 text-white rounded-lg focus:outline-none focus:border-[#C5A059] transition-colors"
                  placeholder="••••••••"
                  required
                  disabled={isLoggingIn}
                />
              </div>

              {loginError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-[#C5A059] hover:bg-[#d4b469] text-black font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                    A entrar...
                  </>
                ) : (
                  "Entrar no Admin App"
                )}
              </button>
            </form>

            {/* Link para admin antigo */}
            <div className="mt-6 pt-6 border-t border-white/10 text-center">
              <a
                href="/admin"
                className="text-sm text-gray-400 hover:text-[#C5A059] transition-colors"
              >
                Ir para Admin Antigo →
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#050505]">
      {/* SIDEBAR */}
      <aside
        className={`
          bg-gradient-to-b from-[#0A0A0A] to-[#050505] border-r border-white/5
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? "w-72" : "w-0"}
          overflow-hidden flex flex-col shadow-2xl
        `}
      >
        {/* Header com Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#C5A059] to-[#8B7042] rounded-xl flex items-center justify-center shadow-lg p-1.5">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={28}
                  height={28}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Portal Lusitano</h1>
                <p className="text-xs text-gray-500">Admin Dashboard</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors lg:hidden"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Menu Items com melhor espaçamento */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {MENU_ITEMS.map((item) => {
            const isActive = tabs.some((t) => t.id === item.id);
            const isCurrentTab = activeTabId === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item)}
                className={`
                  group w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                  transition-all duration-200 text-left relative overflow-hidden
                  ${
                    isCurrentTab
                      ? "bg-gradient-to-r from-[#C5A059] to-[#d4b469] text-black font-semibold shadow-lg shadow-[#C5A059]/20"
                      : isActive
                        ? "bg-white/5 text-[#C5A059] font-medium"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }
                `}
              >
                <span
                  className={`text-2xl transition-transform duration-200 ${
                    isCurrentTab ? "scale-110" : "group-hover:scale-110"
                  }`}
                >
                  {item.emoji}
                </span>
                <span className="text-sm font-medium">{item.title}</span>
                {isActive && !isCurrentTab && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-[#C5A059]"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer melhorado */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="mb-3 px-4 py-2 bg-white/5 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Sessão ativa</p>
            <p className="text-xs text-white font-medium truncate">
              {loginForm.email || "admin@portal-lusitano.pt"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
              bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300
              transition-all duration-200 font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Terminar Sessão</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search Bar Global + Notifications */}
        <div className="bg-gradient-to-r from-[#0A0A0A] to-[#0F0F0F] border-b border-white/5 px-6 py-4 flex items-center gap-4">
          <Suspense fallback={null}>
            <GlobalSearch />
          </Suspense>
          <Suspense fallback={null}>
            <NotificationCenter />
          </Suspense>
        </div>

        {/* Top Bar com Tabs - Design melhorado */}
        <div className="flex items-center bg-gradient-to-r from-[#0A0A0A] to-[#0F0F0F] border-b border-white/5 shadow-xl">
          {/* Toggle Sidebar Button */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-4 hover:bg-white/5 border-r border-white/5 transition-all duration-200 group"
              title="Abrir Menu"
            >
              <Menu className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            </button>
          )}

          {/* Tabs com scroll suave */}
          <div className="flex-1 flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {tabs.length === 0 ? (
              <div className="px-6 py-4 text-gray-500 text-sm flex items-center gap-2">
                <span className="text-lg">👈</span>
                <span>Seleciona uma funcionalidade na sidebar</span>
              </div>
            ) : (
              tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`
                    group relative flex items-center gap-3 px-5 py-4 cursor-pointer
                    border-r border-white/5 transition-all duration-200 min-w-[160px] max-w-[260px]
                    ${
                      activeTabId === tab.id
                        ? "bg-gradient-to-b from-[#050505] to-black text-[#C5A059]"
                        : "bg-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    }
                  `}
                  onClick={() => setActiveTabId(tab.id)}
                >
                  {/* Indicador de tab ativo */}
                  {activeTabId === tab.id && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#C5A059] to-[#d4b469]"></div>
                  )}

                  {tab.icon && (
                    <span
                      className={`text-xl transition-transform duration-200 ${
                        activeTabId === tab.id ? "scale-110" : "group-hover:scale-105"
                      }`}
                    >
                      {tab.icon}
                    </span>
                  )}
                  <span className="flex-1 truncate text-sm font-medium">{tab.title}</span>
                  {tab.closable !== false && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className={`
                        p-1 rounded-md hover:bg-red-500/20 hover:text-red-400 transition-all duration-200
                        ${
                          activeTabId === tab.id
                            ? "opacity-70 hover:opacity-100"
                            : "opacity-0 group-hover:opacity-70 group-hover:hover:opacity-100"
                        }
                      `}
                      title="Fechar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tab Content com melhor apresentação */}
        <div className="flex-1 overflow-auto bg-gradient-to-br from-[#050505] via-[#0A0A0A] to-[#050505]">
          {activeTab ? (
            <div key={activeTab.id} className="h-full">
              {activeTab.component}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="text-center max-w-md space-y-6">
                {/* Logo animado */}
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-[#C5A059]/20 blur-3xl animate-pulse"></div>
                  <div className="relative text-8xl animate-bounce">🐴</div>
                </div>

                {/* Texto */}
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold text-white">Portal Lusitano Admin</h2>
                  <p className="text-gray-400 text-lg">
                    Seleciona uma funcionalidade na sidebar para começar
                  </p>
                </div>

                {/* Badge decorativo */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  Sistema Operacional
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
