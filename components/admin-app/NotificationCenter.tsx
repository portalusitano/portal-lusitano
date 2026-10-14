"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, RefreshCw } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  link: string;
  icon: string;
  priority: "low" | "medium" | "high";
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carregar notificações
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/notifications");
      const data = await response.json();

      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[NotificationCenter]", error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar ao montar e a cada 30 segundos
  useEffect(() => {
    loadNotifications();

    const interval = setInterval(loadNotifications, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    // Marcar como lida (removendo da lista)
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    setUnreadCount((prev) => Math.max(0, prev - 1));

    // Navegar para o link
    if (notification.link) {
      window.location.href = notification.link;
    }

    setShowDropdown(false);
  };

  const markAllAsRead = () => {
    setNotifications([]);
    setUnreadCount(0);
    setShowDropdown(false);
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: "text-red-400 bg-red-500/10 border-red-500/20",
      medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
      low: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) return `Há ${diffHours}h`;
    if (diffDays === 1) return "Ontem";
    return `Há ${diffDays} dias`;
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 hover:border-[var(--gold)]/30 group"
        title="Notificações"
      >
        <Bell className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />

        {/* Badge com contador */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 rounded-full flex items-center justify-center px-1 animate-pulse">
            <span className="text-xs font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </div>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-[var(--background-secondary)] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/5 bg-gradient-to-r from-[var(--gold)]/10 to-transparent">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-[var(--gold)]" />
                Notificações
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h3>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadNotifications}
                  disabled={loading}
                  className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                  title="Atualizar"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
                </button>

                {notifications.length > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                    title="Marcar todas como lidas"
                  >
                    <CheckCheck className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Lista de Notificações */}
          <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            {notifications.length > 0 ? (
              <div className="p-2">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`
                      w-full text-left p-3 rounded-lg mb-2 border
                      transition-all hover:scale-[1.02]
                      ${getPriorityColor(notification.priority)}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">{notification.icon}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-semibold text-white text-sm">{notification.title}</p>
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {getTimeAgo(notification.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 line-clamp-2">
                          {notification.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-400 mb-1">Sem notificações</p>
                <p className="text-sm text-gray-500">Estás em dia! 🎉</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-white/5 bg-black/20">
              <button
                onClick={markAllAsRead}
                className="w-full text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Marcar todas como lidas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
