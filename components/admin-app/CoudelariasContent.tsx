"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Home, Search, Pencil, Trash2, Check, X, Star, Eye } from "lucide-react";
import Seleccao from "@/components/ui/Seleccao";
import {
  COUDELARIA_ACCAO_LABEL,
  COUDELARIA_STATUS,
  COUDELARIA_STATUS_LABEL,
  COUDELARIA_STATUS_VALUES,
  etiquetaDoEstado,
  transicoesDe,
} from "@/lib/coudelaria-status";

/**
 * Uma linha da tabela `coudelarias` como a base a tem.
 *
 * O que aqui estava não era o esquema: `cidade`, `plano`, `plano_ativo` e
 * `plano_fim` não existem em coluna nenhuma. A rota devolve `select("*")`, por
 * isso o TypeScript não protegia nada e os quatro campos chegavam a
 * `undefined` — a coluna «Localização» aparecia vazia e o
 * `coudelaria.plano.toUpperCase()` rebentava com a página inteira à primeira
 * linha. A morada real vive em `localizacao` e `regiao`, e o plano em `plan`.
 *
 * `distrito` existe mas está a `NULL` nas 35 linhas em produção, por isso não
 * se mostra: uma coluna sempre vazia é ruído.
 */
interface Coudelaria {
  id: string;
  nome: string;
  slug: string;
  localizacao: string | null;
  regiao: string | null;
  telefone: string | null;
  email: string | null;
  website: string | null;
  plan: string | null;
  is_pro: boolean | null;
  status: string | null;
  destaque: boolean | null;
  created_at: string;
  proprietario_nome: string | null;
  proprietario_email: string | null;
}

interface Stats {
  total: number;
  pendente: number;
  aprovado: number;
  rejeitado: number;
  destaque: number;
  bronze: number;
  prata: number;
  ouro: number;
}

interface CoudelariasContentProps {
  /**
   * Caminho de volta, mostrado como uma casa ao lado do título. Só a rota
   * `/admin/coudelarias` o passa: dentro do `/admin-app` a navegação já está
   * na barra lateral e uma segunda seria ruído.
   */
  voltarHref?: string;
}

export default function CoudelariasContent({ voltarHref }: CoudelariasContentProps = {}) {
  const [coudelarias, setCoudelarias] = useState<Coudelaria[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planoFilter, setPlanoFilter] = useState("all");

  useEffect(() => {
    loadCoudelarias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, planoFilter, searchTerm]);

  const loadCoudelarias = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (planoFilter !== "all") params.append("plano", planoFilter);
      if (searchTerm) params.append("search", searchTerm);

      const res = await fetch(`/api/admin/coudelarias?${params}`);
      const data = await res.json();

      setCoudelarias(data.coudelarias || []);
      setStats(data.stats);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[CoudelariasContent]", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCoudelaria = async (id: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/admin/coudelarias/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        loadCoudelarias();
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[CoudelariasContent]", error);
    }
  };

  const deleteCoudelaria = async (id: string) => {
    if (!confirm("Tem a certeza que quer eliminar esta coudelaria?")) return;

    try {
      const res = await fetch(`/api/admin/coudelarias/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadCoudelarias();
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[CoudelariasContent]", error);
    }
  };

  /**
   * Os planos que a coluna `plan` guarda de facto. O SQL declara
   * `'gratuito','pro','pro_instagram'`, e em produção há ainda `free`, escrito
   * por código mais antigo — duas grafias para a mesma coisa. Mostram-se as
   * duas tal como estão; corrigir a grafia é uma escrita na base, e este
   * painel não a faz por sua conta.
   */
  const getPlanoColor = (plano: string | null) => {
    const colors: Record<string, string> = {
      free: "text-gray-400 bg-gray-500/10",
      gratuito: "text-gray-400 bg-gray-500/10",
      pro: "text-yellow-400 bg-yellow-500/10",
      pro_instagram: "text-yellow-400 bg-yellow-500/10",
    };
    return colors[plano ?? ""] || "text-gray-400 bg-gray-500/10";
  };

  const getStatusColor = (status: string | null) => {
    const colors: Record<string, string> = {
      [COUDELARIA_STATUS.PENDING]: "text-yellow-400 bg-yellow-500/10",
      [COUDELARIA_STATUS.ACTIVE]: "text-green-400 bg-green-500/10",
      [COUDELARIA_STATUS.INACTIVE]: "text-red-400 bg-red-500/10",
    };
    return colors[status ?? ""] || "text-gray-400 bg-gray-500/10";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gold)] mx-auto"></div>
          <p className="text-gray-400 mt-4">A carregar coudelarias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {voltarHref && (
            <Link href={voltarHref} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <Home className="text-gray-400" size={20} />
            </Link>
          )}
          <h1 className="text-3xl font-bold text-white">Gestão de Coudelarias</h1>
        </div>
        <p className="text-gray-400">Gerir coudelarias, planos e aprovações</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Total</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Pendentes</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.pendente}</div>
          </div>
          <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Aprovadas</div>
            <div className="text-2xl font-bold text-green-400">{stats.aprovado}</div>
          </div>
          <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Destaque</div>
            <div className="text-2xl font-bold text-[var(--gold)]">{stats.destaque}</div>
          </div>
          <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Planos Pagos</div>
            <div className="text-2xl font-bold text-blue-400">
              {stats.bronze + stats.prata + stats.ouro}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar coudelarias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--background)] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]"
            />
          </div>

          {/* Status Filter */}
          <Seleccao
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-[var(--background)] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
          >
            <option value="all">Todos os estados</option>
            {COUDELARIA_STATUS_VALUES.map((estado) => (
              <option key={estado} value={estado}>
                {COUDELARIA_STATUS_LABEL[estado]}
              </option>
            ))}
          </Seleccao>

          {/* Plano Filter */}
          <Seleccao
            value={planoFilter}
            onChange={(e) => setPlanoFilter(e.target.value)}
            className="px-4 py-2 bg-[var(--background)] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
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
      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--background)] border-b border-white/10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                Coudelaria
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
            {coudelarias.map((coudelaria) => (
              <tr key={coudelaria.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{coudelaria.nome}</span>
                      {coudelaria.destaque && <Star className="text-[var(--gold)]" size={14} />}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {coudelaria.proprietario_nome || coudelaria.proprietario_email}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-300">
                    {coudelaria.localizacao || "—"}
                    {coudelaria.regiao && `, ${coudelaria.regiao}`}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getPlanoColor(
                      coudelaria.plan
                    )}`}
                  >
                    {coudelaria.plan ? coudelaria.plan.toUpperCase() : "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                      coudelaria.status
                    )}`}
                  >
                    {etiquetaDoEstado(coudelaria.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {/*
                      Publicar / despublicar. Os dois botões só apareciam em
                      `status === "pendente"`, um valor que a base não escreve
                      em linha nenhuma: nenhuma das 35 coudelarias tinha botão
                      de estado. Agora as saídas saem do estado a sério — um
                      registo novo (`pending`) tem duas, um já decidido tem uma.
                    */}
                    {transicoesDe(coudelaria.status).map((destino) =>
                      destino === COUDELARIA_STATUS.ACTIVE ? (
                        <button
                          key={destino}
                          onClick={() => updateCoudelaria(coudelaria.id, { status: destino })}
                          className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                          title={
                            coudelaria.status === COUDELARIA_STATUS.PENDING
                              ? "Aprovar"
                              : COUDELARIA_ACCAO_LABEL[destino]
                          }
                        >
                          <Check className="text-green-500" size={16} />
                        </button>
                      ) : (
                        <button
                          key={destino}
                          onClick={() => updateCoudelaria(coudelaria.id, { status: destino })}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title={
                            coudelaria.status === COUDELARIA_STATUS.PENDING
                              ? "Rejeitar"
                              : COUDELARIA_ACCAO_LABEL[destino]
                          }
                        >
                          <X className="text-red-500" size={16} />
                        </button>
                      )
                    )}

                    {/* Toggle Destaque */}
                    <button
                      onClick={() =>
                        updateCoudelaria(coudelaria.id, {
                          destaque: !coudelaria.destaque,
                        })
                      }
                      className={`p-2 rounded-lg transition-colors ${
                        coudelaria.destaque
                          ? "bg-[var(--gold)]/20 hover:bg-[var(--gold)]/30"
                          : "hover:bg-white/10"
                      }`}
                      title={coudelaria.destaque ? "Remover destaque" : "Adicionar destaque"}
                    >
                      <Star
                        className={coudelaria.destaque ? "text-[var(--gold)]" : "text-gray-400"}
                        size={16}
                      />
                    </button>

                    {/* Ver no site */}
                    <Link
                      href={`/coudelarias/${coudelaria.slug}`}
                      target="_blank"
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Ver no site"
                    >
                      <Eye className="text-gray-400" size={16} />
                    </Link>

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
                      onClick={() => deleteCoudelaria(coudelaria.id)}
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

        {coudelarias.length === 0 && (
          <div className="p-8 text-center text-gray-400">Nenhuma coudelaria encontrada</div>
        )}
      </div>
    </div>
  );
}
