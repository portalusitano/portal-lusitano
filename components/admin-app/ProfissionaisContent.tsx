"use client";

import { useEffect, useState } from "react";
import {
  Award,
  Search,
  Pencil,
  Trash2,
  Check,
  X,
  Star,
  Eye,
  Mail,
  Phone,
  Globe,
} from "lucide-react";
import Seleccao from "@/components/ui/Seleccao";
import { formatarEurosComCentimos } from "@/lib/format";

interface Profissional {
  id: string;
  nome: string;
  tipo: string;
  especialidade: string | null;
  email: string;
  telefone: string | null;
  cidade: string;
  distrito: string;
  website: string | null;
  bio: string | null;
  foto_url: string | null;
  plano: string;
  plano_ativo: boolean;
  plano_valor: number | null;
  plano_inicio: string | null;
  plano_fim: string | null;
  status: string;
  destaque: boolean;
  created_at: string;
}

interface Stats {
  total: number;
  pendente: number;
  aprovado: number;
  rejeitado: number;
  suspenso: number;
  gratis: number;
  bronze: number;
  prata: number;
  ouro: number;
  ativos: number;
  destaque: number;
  veterinario: number;
  treinador: number;
  ferrador: number;
}

export default function ProfissionaisContent() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [mrr, setMrr] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planoFilter, setPlanoFilter] = useState("all");
  const [selectedProfissional, setSelectedProfissional] = useState<Profissional | null>(null);

  useEffect(() => {
    loadProfissionais();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, tipoFilter, planoFilter, searchTerm]);

  const loadProfissionais = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (tipoFilter !== "all") params.append("tipo", tipoFilter);
      if (planoFilter !== "all") params.append("plano", planoFilter);
      if (searchTerm) params.append("search", searchTerm);

      const res = await fetch(`/api/admin/profissionais?${params}`);
      const data = await res.json();

      setProfissionais(data.profissionais || []);
      setStats(data.stats);
      setMrr(data.mrr || 0);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[ProfissionaisContent]", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfissional = async (id: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/admin/profissionais/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        loadProfissionais();
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[ProfissionaisContent]", error);
    }
  };

  const deleteProfissional = async (id: string) => {
    if (!confirm("Tem a certeza que quer eliminar este profissional?")) return;

    try {
      const res = await fetch(`/api/admin/profissionais/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadProfissionais();
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[ProfissionaisContent]", error);
    }
  };

  const getTipoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      veterinario: "text-green-400 bg-green-500/10",
      treinador: "text-blue-400 bg-blue-500/10",
      ferrador: "text-orange-400 bg-orange-500/10",
      outro: "text-gray-400 bg-gray-500/10",
    };
    return colors[tipo] || "text-gray-400 bg-gray-500/10";
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      veterinario: "Veterinário",
      treinador: "Treinador",
      ferrador: "Ferrador",
      outro: "Outro",
    };
    return labels[tipo] || tipo;
  };

  const getPlanoColor = (plano: string) => {
    const colors: Record<string, string> = {
      gratis: "text-gray-400 bg-gray-500/10",
      bronze: "text-orange-400 bg-orange-500/10",
      prata: "text-gray-300 bg-gray-400/10",
      ouro: "text-yellow-400 bg-yellow-500/10",
    };
    return colors[plano] || "text-gray-400 bg-gray-500/10";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pendente: "text-yellow-400 bg-yellow-500/10",
      aprovado: "text-green-400 bg-green-500/10",
      rejeitado: "text-red-400 bg-red-500/10",
      suspenso: "text-orange-400 bg-orange-500/10",
    };
    return colors[status] || "text-gray-400 bg-gray-500/10";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gold)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Award className="text-[var(--gold)]" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-white">Gestão de Profissionais</h1>
              <p className="text-gray-400">Gerir profissionais, planos e aprovações</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total</div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Pendentes</div>
              <div className="text-2xl font-bold text-yellow-400">{stats.pendente}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Aprovados</div>
              <div className="text-2xl font-bold text-green-400">{stats.aprovado}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Destaque</div>
              <div className="text-2xl font-bold text-[var(--gold)]">{stats.destaque}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Planos Ativos</div>
              <div className="text-2xl font-bold text-blue-400">{stats.ativos}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">MRR</div>
              <div className="text-2xl font-bold text-emerald-400">
                {formatarEurosComCentimos(mrr)}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Pesquisar profissionais..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]"
              />
            </div>

            {/* Tipo Filter */}
            <Seleccao
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              className="px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
            >
              <option value="all">Todos os Tipos</option>
              <option value="veterinario">Veterinário</option>
              <option value="treinador">Treinador</option>
              <option value="ferrador">Ferrador</option>
              <option value="outro">Outro</option>
            </Seleccao>

            {/* Status Filter */}
            <Seleccao
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
            >
              <option value="all">Todos os Status</option>
              <option value="pendente">Pendente</option>
              <option value="aprovado">Aprovado</option>
              <option value="rejeitado">Rejeitado</option>
              <option value="suspenso">Suspenso</option>
            </Seleccao>

            {/* Plano Filter */}
            <Seleccao
              value={planoFilter}
              onChange={(e) => setPlanoFilter(e.target.value)}
              className="px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
            >
              <option value="all">Todos os Planos</option>
              <option value="gratis">Grátis</option>
              <option value="bronze">Bronze</option>
              <option value="prata">Prata</option>
              <option value="ouro">Ouro</option>
            </Seleccao>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                  Profissional
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                  Localização
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                  Plano
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {profissionais.map((prof) => (
                <tr key={prof.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {prof.foto_url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={prof.foto_url}
                          alt={prof.nome}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{prof.nome}</span>
                          {prof.destaque && <Star className="text-[var(--gold)]" size={14} />}
                        </div>
                        {prof.especialidade && (
                          <div className="text-xs text-gray-400 mt-1">{prof.especialidade}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {prof.email && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Mail size={10} />
                              {prof.email}
                            </div>
                          )}
                          {prof.telefone && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Phone size={10} />
                              {prof.telefone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getTipoColor(prof.tipo)}`}
                    >
                      {getTipoLabel(prof.tipo)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-300">
                      {prof.cidade}
                      {prof.distrito && `, ${prof.distrito}`}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getPlanoColor(
                        prof.plano
                      )}`}
                    >
                      {prof.plano.toUpperCase()}
                    </span>
                    {prof.plano_ativo && <div className="text-xs text-green-400 mt-1">Ativo</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                        prof.status
                      )}`}
                    >
                      {prof.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* Aprovar */}
                      {prof.status === "pendente" && (
                        <button
                          onClick={() => updateProfissional(prof.id, { status: "aprovado" })}
                          className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                          title="Aprovar"
                        >
                          <Check className="text-green-500" size={16} />
                        </button>
                      )}

                      {/* Rejeitar */}
                      {prof.status === "pendente" && (
                        <button
                          onClick={() => updateProfissional(prof.id, { status: "rejeitado" })}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Rejeitar"
                        >
                          <X className="text-red-500" size={16} />
                        </button>
                      )}

                      {/* Toggle Destaque */}
                      <button
                        onClick={() =>
                          updateProfissional(prof.id, {
                            destaque: !prof.destaque,
                          })
                        }
                        className={`p-2 rounded-lg transition-colors ${
                          prof.destaque
                            ? "bg-[var(--gold)]/20 hover:bg-[var(--gold)]/30"
                            : "hover:bg-white/10"
                        }`}
                        title={prof.destaque ? "Remover destaque" : "Adicionar destaque"}
                      >
                        <Star
                          className={prof.destaque ? "text-[var(--gold)]" : "text-gray-400"}
                          size={16}
                        />
                      </button>

                      {/* Ver detalhes */}
                      <button
                        onClick={() => setSelectedProfissional(prof)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="text-gray-400" size={16} />
                      </button>

                      {/* Editar */}
                      <button
                        onClick={() => {}}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="text-gray-400" size={16} />
                      </button>

                      {/* Eliminar */}
                      <button
                        onClick={() => deleteProfissional(prof.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="text-red-500" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {profissionais.length === 0 && (
            <div className="p-8 text-center text-gray-400">Nenhum profissional encontrado</div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes */}
      {selectedProfissional && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Detalhes do Profissional</h3>
              <button
                onClick={() => setSelectedProfissional(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {selectedProfissional.foto_url && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedProfissional.foto_url}
                    alt={selectedProfissional.nome}
                    className="w-32 h-32 rounded-full object-cover"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-gray-400 uppercase">Nome</label>
                <p className="text-white">{selectedProfissional.nome}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase">Tipo</label>
                  <p className="text-white">{getTipoLabel(selectedProfissional.tipo)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Especialidade</label>
                  <p className="text-white">{selectedProfissional.especialidade || "-"}</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase">Email</label>
                <p className="text-white">{selectedProfissional.email}</p>
              </div>

              {selectedProfissional.telefone && (
                <div>
                  <label className="text-xs text-gray-400 uppercase">Telefone</label>
                  <p className="text-white">{selectedProfissional.telefone}</p>
                </div>
              )}

              <div>
                <label className="text-xs text-gray-400 uppercase">Localização</label>
                <p className="text-white">
                  {selectedProfissional.cidade}, {selectedProfissional.distrito}
                </p>
              </div>

              {selectedProfissional.website && (
                <div>
                  <label className="text-xs text-gray-400 uppercase">Website</label>
                  <a
                    href={selectedProfissional.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--gold)] hover:underline flex items-center gap-2"
                  >
                    {selectedProfissional.website}
                    <Globe size={14} />
                  </a>
                </div>
              )}

              {selectedProfissional.bio && (
                <div>
                  <label className="text-xs text-gray-400 uppercase">Biografia</label>
                  <p className="text-white whitespace-pre-wrap">{selectedProfissional.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase">Plano</label>
                  <p className="text-white">{selectedProfissional.plano.toUpperCase()}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Status Plano</label>
                  <p className="text-white">
                    {selectedProfissional.plano_ativo ? "Ativo" : "Inativo"}
                  </p>
                </div>
              </div>

              {selectedProfissional.plano_inicio && selectedProfissional.plano_fim && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 uppercase">Início Plano</label>
                    <p className="text-white">
                      {new Date(selectedProfissional.plano_inicio).toLocaleDateString("pt-PT")}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase">Fim Plano</label>
                    <p className="text-white">
                      {new Date(selectedProfissional.plano_fim).toLocaleDateString("pt-PT")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
