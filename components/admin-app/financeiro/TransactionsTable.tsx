"use client";

import { Download, Filter, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  email: string;
  productType: string;
  productTypeKey: string;
  amount: number;
  currency: string;
  status: string;
  statusKey: string;
  description: string;
}

interface TransactionsData {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Filters {
  product_type: string;
  status: string;
  start_date: string;
  end_date: string;
  search: string;
}

interface TransactionsTableProps {
  data: TransactionsData | null;
  filters: Filters;
  currentPage: number;
  onFilterChange: (key: string, value: string) => void;
  onApplyFilters: () => void;
  onExportCSV: () => void;
  onPageChange: (page: number) => void;
}

export default function TransactionsTable({
  data,
  filters,
  currentPage,
  onFilterChange,
  onApplyFilters,
  onExportCSV,
  onPageChange,
}: TransactionsTableProps) {
  return (
    <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Transações</h3>
        <button
          onClick={onExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-medium rounded-lg transition-colors"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {/* Tipo de Produto */}
        <select
          value={filters.product_type}
          onChange={(e) => onFilterChange("product_type", e.target.value)}
          className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)]"
        >
          <option value="all">Todos os produtos</option>
          <option value="cavalo_anuncio">Anúncios de Cavalos</option>
          <option value="instagram_ad">Instagram</option>
          <option value="publicidade">Publicidade</option>
        </select>

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) => onFilterChange("status", e.target.value)}
          className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)]"
        >
          <option value="all">Todos os status</option>
          <option value="succeeded">Sucesso</option>
          <option value="pending">Pendente</option>
          <option value="failed">Falhado</option>
        </select>

        {/* Data Início */}
        <input
          type="date"
          value={filters.start_date}
          onChange={(e) => onFilterChange("start_date", e.target.value)}
          className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)]"
        />

        {/* Data Fim */}
        <input
          type="date"
          value={filters.end_date}
          onChange={(e) => onFilterChange("end_date", e.target.value)}
          className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)]"
        />

        {/* Pesquisa */}
        <div className="relative">
          <input
            type="text"
            placeholder="Pesquisar email..."
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            className="w-full px-3 py-2 pl-9 bg-black/30 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]"
          />
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            size={16}
          />
        </div>
      </div>

      <button
        onClick={onApplyFilters}
        className="mb-6 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition-colors"
      >
        <Filter size={16} />
        Aplicar Filtros
      </button>

      {/* Tabela */}
      {data && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">
                    Data
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">
                    Email
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">
                    Produto
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">
                    Valor
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {data.transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-300">
                      {new Date(transaction.date).toLocaleDateString("pt-PT")}
                      <br />
                      <span className="text-xs text-gray-500">
                        {new Date(transaction.date).toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-white">{transaction.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-300">{transaction.productType}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-white">
                      €{transaction.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          transaction.statusKey === "succeeded"
                            ? "bg-green-500/10 text-green-500"
                            : transaction.statusKey === "pending"
                              ? "bg-yellow-500/10 text-yellow-500"
                              : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
            <div className="text-sm text-gray-400">
              Mostrando {(data.pagination.page - 1) * data.pagination.limit + 1} a{" "}
              {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} de{" "}
              {data.pagination.total} transações
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? "bg-[var(--gold)] text-black font-semibold"
                        : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === data.pagination.totalPages}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
