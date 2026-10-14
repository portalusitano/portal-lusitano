"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  FileText,
  Search,
} from "lucide-react";
import Seleccao from "@/components/ui/Seleccao";

interface Log {
  id: string;
  admin_email: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export default function LogsContent() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action_type: "all",
    entity_type: "all",
    admin_email: "all",
  });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [availableAdmins, setAvailableAdmins] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        action_type: filters.action_type,
        entity_type: filters.entity_type,
        admin_email: filters.admin_email,
        page: page.toString(),
      });

      const response = await fetch(`/api/admin/logs?${params}`);
      const data = await response.json();

      setLogs(data.logs || []);
      setPagination(data.pagination || {});
      setAvailableAdmins(data.filters?.admins || []);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[LogsContent]", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    const icons = {
      create: Plus,
      update: Edit,
      delete: Trash2,
      approve: CheckCircle,
    };
    return icons[actionType as keyof typeof icons] || Activity;
  };

  const getActionColor = (actionType: string) => {
    const colors = {
      create: "text-green-400 bg-green-500/10",
      update: "text-blue-400 bg-blue-500/10",
      delete: "text-red-400 bg-red-500/10",
      approve: "text-purple-400 bg-purple-500/10",
    };
    return colors[actionType as keyof typeof colors] || "text-gray-400 bg-gray-500/10";
  };

  const getEntityEmoji = (entityType: string) => {
    const emojis: Record<string, string> = {
      cavalo: "🐴",
      evento: "📅",
      review: "⭐",
      contact: "📧",
      coudelaria: "🏛️",
      profissional: "👔",
      setting: "⚙️",
    };
    return emojis[entityType] || "📄";
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

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      create: "Criou",
      update: "Atualizou",
      delete: "Eliminou",
      approve: "Aprovou",
    };
    return labels[actionType] || actionType;
  };

  const getEntityLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      cavalo: "Cavalo",
      evento: "Evento",
      review: "Review",
      contact: "Contacto",
      coudelaria: "Coudelaria",
      profissional: "Profissional",
      setting: "Definição",
    };
    return labels[entityType] || entityType;
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.admin_email.toLowerCase().includes(search) ||
      log.entity_type.toLowerCase().includes(search) ||
      log.action_type.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--gold)] mx-auto mb-4"></div>
          <p className="text-gray-400">A carregar logs...</p>
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
            <Activity className="w-8 h-8 text-[var(--gold)]" />
            Logs de Atividade
          </h1>
          <p className="text-gray-400">
            {pagination.total} registos • Página {pagination.page} de {pagination.totalPages}
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-semibold rounded-lg transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-[var(--gold)]" />
          <h3 className="text-lg font-semibold text-white">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Pesquisa */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar..."
              className="w-full bg-black/30 border border-white/10 pl-10 pr-4 py-2 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]"
            />
          </div>

          {/* Tipo de Ação */}
          <Seleccao
            value={filters.action_type}
            onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
            className="bg-black/30 border border-white/10 px-4 py-2 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
          >
            <option value="all">Todas as Ações</option>
            <option value="create">Criar</option>
            <option value="update">Atualizar</option>
            <option value="delete">Eliminar</option>
            <option value="approve">Aprovar</option>
          </Seleccao>

          {/* Tipo de Entidade */}
          <Seleccao
            value={filters.entity_type}
            onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
            className="bg-black/30 border border-white/10 px-4 py-2 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
          >
            <option value="all">Todas as Entidades</option>
            <option value="cavalo">Cavalos</option>
            <option value="evento">Eventos</option>
            <option value="review">Reviews</option>
            <option value="contact">Contactos</option>
            <option value="coudelaria">Coudelarias</option>
            <option value="profissional">Profissionais</option>
          </Seleccao>

          {/* Admin */}
          <Seleccao
            value={filters.admin_email}
            onChange={(e) => setFilters({ ...filters, admin_email: e.target.value })}
            className="bg-black/30 border border-white/10 px-4 py-2 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
          >
            <option value="all">Todos os Admins</option>
            {availableAdmins.map((admin) => (
              <option key={admin} value={admin}>
                {admin}
              </option>
            ))}
          </Seleccao>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Linha vertical da timeline */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[var(--gold)] via-[var(--gold)]/50 to-transparent"></div>

        {/* Logs */}
        <div className="space-y-6">
          {filteredLogs.map((log, _index) => {
            const Icon = getActionIcon(log.action_type);
            const actionColor = getActionColor(log.action_type);

            return (
              <div key={log.id} className="relative pl-20">
                {/* Icon da timeline */}
                <div
                  className={`absolute left-0 w-16 h-16 ${actionColor} rounded-xl flex items-center justify-center border-2 border-white/10 shadow-lg`}
                >
                  <Icon className="w-7 h-7" />
                </div>

                {/* Card do log */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getEntityEmoji(log.entity_type)}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {getActionLabel(log.action_type)} {getEntityLabel(log.entity_type)}
                        </h3>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1.5 text-sm text-gray-400">
                            <User className="w-4 h-4" />
                            {log.admin_email}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-gray-400">
                            <Calendar className="w-4 h-4" />
                            {getTimeAgo(log.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <span className="text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleString("pt-PT")}
                    </span>
                  </div>

                  {/* ID da Entidade */}
                  {log.entity_id && (
                    <div className="text-sm text-gray-400 mb-2">
                      ID:{" "}
                      <code className="bg-black/30 px-2 py-1 rounded text-[var(--gold)]">
                        {log.entity_id}
                      </code>
                    </div>
                  )}

                  {/* Mudanças (se existirem) */}
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <details className="mt-3 group/details">
                      <summary className="cursor-pointer text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Ver Alterações
                      </summary>
                      <pre className="mt-2 bg-black/50 border border-white/10 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto">
                        {JSON.stringify(log.changes, null, 2)}
                      </pre>
                    </details>
                  )}

                  {/* IP */}
                  {log.ip_address && (
                    <div className="text-xs text-gray-600 mt-2">IP: {log.ip_address}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Nenhum log encontrado</p>
            <p className="text-gray-500 text-sm mt-2">Ajusta os filtros para ver mais resultados</p>
          </div>
        )}
      </div>

      {/* Paginação */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          <span className="text-gray-400">
            Página {page} de {pagination.totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Seguinte
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
