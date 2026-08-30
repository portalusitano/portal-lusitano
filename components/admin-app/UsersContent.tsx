"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Power,
  Shield,
  ShieldCheck,
  Search,
  X,
  AlertCircle,
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  nome: string | null;
  role: "admin" | "super_admin";
  ativo: boolean;
  last_login: string | null;
  created_at: string;
}

export default function UsersContent() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [ativoFilter, setAtivoFilter] = useState<string>("all");

  // Modal criar/editar
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    nome: "",
    role: "admin" as "admin" | "super_admin",
  });

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.append("role", roleFilter);
      if (ativoFilter !== "all") params.append("ativo", ativoFilter);

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[UsersContent]", error);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, ativoFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Filtrar localmente por pesquisa
  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return user.email.toLowerCase().includes(term) || user.nome?.toLowerCase().includes(term);
  });

  // Criar/Atualizar utilizador
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : "/api/admin/users";
      const method = editingUser ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        setShowModal(false);
        setEditingUser(null);
        setFormData({ email: "", nome: "", role: "admin" });
        loadUsers();
      } else {
        alert(data.error || "Erro");
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[UsersContent]", error);
      alert("Erro ao processar pedido");
    }
  };

  // Ativar/Desativar
  const toggleAtivo = async (user: AdminUser) => {
    if (!confirm(`Tem a certeza que quer ${user.ativo ? "desativar" : "ativar"} ${user.email}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...user, ativo: !user.ativo }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        loadUsers();
      } else {
        alert(data.error || "Erro");
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[UsersContent]", error);
      alert("Erro ao processar pedido");
    }
  };

  // Eliminar
  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`ELIMINAR ${user.email}?\n\nEsta ação é irreversível!`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        loadUsers();
      } else {
        alert(data.error || "Erro");
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[UsersContent]", error);
      alert("Erro ao eliminar");
    }
  };

  // Abrir modal editar
  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      nome: user.nome || "",
      role: user.role,
    });
    setShowModal(true);
  };

  // Abrir modal criar
  const openCreate = () => {
    setEditingUser(null);
    setFormData({ email: "", nome: "", role: "admin" });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-[var(--gold)]" />
            Gestão de Utilizadores
          </h1>
          <p className="text-gray-400">Total de {total} utilizadores admin</p>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-semibold rounded-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Adicionar Utilizador
        </button>
      </div>

      {/* Filtros e Pesquisa */}
      <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pesquisa */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar por email ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]"
            />
          </div>

          {/* Filtro Role */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--gold)]"
          >
            <option value="all">Todos os roles</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>

          {/* Filtro Ativo */}
          <select
            value={ativoFilter}
            onChange={(e) => setAtivoFilter(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--gold)]"
          >
            <option value="all">Todos os estados</option>
            <option value="true">Apenas Ativos</option>
            <option value="false">Apenas Inativos</option>
          </select>
        </div>
      </div>

      {/* Lista de Utilizadores */}
      {loading ? (
        <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-xl p-12 text-center">
          <div className="animate-spin w-10 h-10 border-4 border-[var(--gold)] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">A carregar utilizadores...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          Nenhum utilizador encontrado
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className={`
                bg-gradient-to-br from-white/5 to-white/10 border rounded-xl p-6
                transition-all hover:shadow-xl
                ${user.ativo ? "border-white/10" : "border-red-500/30 opacity-60"}
              `}
            >
              <div className="flex items-center justify-between">
                {/* Info */}
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      user.role === "super_admin"
                        ? "bg-gradient-to-br from-purple-500 to-pink-500"
                        : "bg-gradient-to-br from-blue-500 to-cyan-500"
                    }`}
                  >
                    {user.role === "super_admin" ? (
                      <ShieldCheck className="w-6 h-6 text-white" />
                    ) : (
                      <Shield className="w-6 h-6 text-white" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{user.nome || user.email}</h3>
                      {!user.ativo && (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded">
                          INATIVO
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{user.email}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>
                        Role:{" "}
                        <span className="text-[var(--gold)]">
                          {user.role === "super_admin" ? "Super Admin" : "Admin"}
                        </span>
                      </span>
                      {user.last_login && (
                        <span>
                          Último login: {new Date(user.last_login).toLocaleDateString("pt-PT")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(user)}
                    className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => toggleAtivo(user)}
                    className={`p-2 rounded-lg transition-all ${
                      user.ativo
                        ? "bg-orange-500/20 hover:bg-orange-500/30 text-orange-400"
                        : "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                    }`}
                    title={user.ativo ? "Desativar" : "Ativar"}
                  >
                    <Power className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(user)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background-secondary)] border border-white/10 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {editingUser ? "Editar Utilizador" : "Novo Utilizador"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingUser}
                  required
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--gold)] disabled:opacity-50"
                />
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Nome</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--gold)]"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as "admin" | "super_admin",
                    })
                  }
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--gold)]"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-semibold rounded-lg transition-all"
                >
                  {editingUser ? "Atualizar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
