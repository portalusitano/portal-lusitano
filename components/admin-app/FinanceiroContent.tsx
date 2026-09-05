"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Repeat,
  ShoppingCart,
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import Seleccao from "@/components/ui/Seleccao";

interface OverviewData {
  overview: {
    totalRevenue: number;
    thisMonthRevenue: number;
    lastMonthRevenue: number;
    growthPercentage: number;
    mrr: number;
    averageTicket: number;
    totalTransactions: number;
  };
}

interface ChartData {
  dailyRevenue: Array<{ date: string; revenue: number }>;
  monthlyRevenue: Array<{ month: string; fullMonth: string; revenue: number }>;
  revenueByProduct: Array<{
    type: string;
    typeKey: string;
    revenue: number;
    count: number;
  }>;
  mrrEvolution: Array<{ month: string; fullMonth: string; mrr: number }>;
}

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

export default function FinanceiroContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [transactionsData, setTransactionsData] = useState<TransactionsData | null>(null);

  const [filters, setFilters] = useState({
    product_type: "all",
    status: "all",
    start_date: "",
    end_date: "",
    search: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllData = async () => {
    try {
      await Promise.all([fetchOverview(), fetchCharts(), fetchTransactions()]);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[FinanceiroContent]", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      const res = await fetch("/api/admin/financeiro/overview");
      if (!res.ok) throw new Error("Failed to fetch overview");
      const data = await res.json();
      setOverviewData(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[FinanceiroContent]", error);
    }
  };

  const fetchCharts = async () => {
    try {
      const res = await fetch("/api/admin/financeiro/charts");
      if (!res.ok) throw new Error("Failed to fetch charts");
      const data = await res.json();
      setChartData(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[FinanceiroContent]", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...filters,
      });

      const res = await fetch(`/api/admin/financeiro/transactions?${params}`);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      const data = await res.json();
      setTransactionsData(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[FinanceiroContent]", error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const applyFilters = () => {
    fetchTransactions();
  };

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams(filters);
      const res = await fetch(`/api/admin/financeiro/export?${params}`);
      if (!res.ok) throw new Error("Failed to export");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transacoes_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[FinanceiroContent]", error);
      alert("Erro ao exportar CSV");
    }
  };

  const generatePDFReport = async () => {
    setIsGeneratingPDF(true);
    try {
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });

      const res = await fetch(`/api/admin/reports/generate?${params}`);
      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `portal-lusitano-relatorio-${selectedYear}-${String(selectedMonth).padStart(2, "0")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[FinanceiroContent]", error);
      alert("Erro ao gerar relatório PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const changePage = (newPage: number) => {
    setCurrentPage(newPage);
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gold)]"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Dashboard Financeiro</h1>
        <p className="text-gray-400 mt-1">Gestão completa de receitas e transações</p>
      </div>

      {/* Relatórios PDF */}
      <div className="bg-gradient-to-r from-[var(--gold)]/10 to-[var(--gold)]/5 border border-[var(--gold)]/20 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="text-[var(--gold)]" size={20} />
              Relatórios Mensais em PDF
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Descarregue relatórios profissionais com todas as métricas do mês
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Mês
            </label>
            <Seleccao
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)]"
            >
              <option value="1">Janeiro</option>
              <option value="2">Fevereiro</option>
              <option value="3">Março</option>
              <option value="4">Abril</option>
              <option value="5">Maio</option>
              <option value="6">Junho</option>
              <option value="7">Julho</option>
              <option value="8">Agosto</option>
              <option value="9">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </Seleccao>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Ano
            </label>
            <Seleccao
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)]"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </Seleccao>
          </div>

          <button
            onClick={generatePDFReport}
            disabled={isGeneratingPDF}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingPDF ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>A
                gerar...
              </>
            ) : (
              <>
                <Download size={16} />
                Descarregar Relatório PDF
              </>
            )}
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--gold)]/20">
          <p className="text-xs text-gray-500">
            📊 O relatório inclui: Resumo Executivo, Receitas por Produto, Top 5 Cavalos Mais
            Vistos, Análise de Leads e ROI
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      {overviewData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Receita Total</h3>
              <DollarSign className="text-[var(--gold)]" size={20} />
            </div>
            <p className="text-3xl font-bold text-white">
              €
              {overviewData.overview.totalRevenue.toLocaleString("pt-PT", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-xs text-gray-500 mt-1">Desde o início</p>
          </div>

          <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Este Mês</h3>
              <TrendingUp className="text-green-500" size={20} />
            </div>
            <p className="text-3xl font-bold text-white">
              €
              {overviewData.overview.thisMonthRevenue.toLocaleString("pt-PT", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p
              className={`text-xs mt-1 ${overviewData.overview.growthPercentage >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {overviewData.overview.growthPercentage >= 0 ? "+" : ""}
              {overviewData.overview.growthPercentage.toFixed(1)}% vs mês passado
            </p>
          </div>

          <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">MRR</h3>
              <Repeat className="text-[var(--gold)]" size={20} />
            </div>
            <p className="text-3xl font-bold text-white">
              €
              {overviewData.overview.mrr.toLocaleString("pt-PT", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-xs text-gray-500 mt-1">Receita recorrente mensal</p>
          </div>

          <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Transações</h3>
              <ShoppingCart className="text-[var(--gold)]" size={20} />
            </div>
            <p className="text-3xl font-bold text-white">
              {overviewData.overview.totalTransactions}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Ticket médio: €{overviewData.overview.averageTicket.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      {chartData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Receita Diária (Últimos 30 Dias)
            </h3>
            <div className="h-64 flex items-end justify-between gap-1">
              {chartData.dailyRevenue.slice(-30).map((day, index) => {
                const maxRevenue = Math.max(...chartData.dailyRevenue.map((d) => d.revenue));
                const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={index} className="group relative flex-1" style={{ height: "100%" }}>
                    <div
                      className="absolute bottom-0 w-full bg-[var(--gold)] rounded-t transition-all hover:bg-[var(--gold-hover)] cursor-pointer"
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {new Date(day.date).toLocaleDateString("pt-PT")}
                        <br />€{day.revenue.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Receita por Produto</h3>
            <div className="space-y-4">
              {chartData.revenueByProduct.map((product, index) => {
                const totalRevenue = chartData.revenueByProduct.reduce(
                  (sum, p) => sum + p.revenue,
                  0
                );
                const percentage = totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0;
                const colors = ["#C5A059", "#8B7042", "#A08850", "#666"];
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300">{product.type}</span>
                      <span className="text-sm font-semibold text-white">
                        €{product.revenue.toFixed(2)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: colors[index % colors.length],
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{product.count} transações</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Transações</h3>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-medium rounded-lg transition-colors"
          >
            <Download size={16} />
            Exportar CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Seleccao
            value={filters.product_type}
            onChange={(e) => handleFilterChange("product_type", e.target.value)}
            className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)]"
          >
            <option value="all">Todos os produtos</option>
            <option value="cavalo_anuncio">Anúncios de Cavalos</option>
            <option value="instagram_ad">Instagram</option>
            <option value="publicidade">Publicidade</option>
          </Seleccao>

          <Seleccao
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)]"
          >
            <option value="all">Todos os status</option>
            <option value="succeeded">Sucesso</option>
            <option value="pending">Pendente</option>
            <option value="failed">Falhado</option>
          </Seleccao>

          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => handleFilterChange("start_date", e.target.value)}
            className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)]"
          />

          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => handleFilterChange("end_date", e.target.value)}
            className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)]"
          />

          <div className="relative">
            <input
              type="text"
              placeholder="Pesquisar email..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full px-3 py-2 pl-9 bg-black/30 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]"
            />
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              size={16}
            />
          </div>
        </div>

        <button
          onClick={applyFilters}
          className="mb-6 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition-colors"
        >
          <Filter size={16} />
          Aplicar Filtros
        </button>

        {transactionsData && (
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
                  {transactionsData.transactions.map((transaction) => (
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

            <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
              <div className="text-sm text-gray-400">
                Mostrando{" "}
                {(transactionsData.pagination.page - 1) * transactionsData.pagination.limit + 1} a{" "}
                {Math.min(
                  transactionsData.pagination.page * transactionsData.pagination.limit,
                  transactionsData.pagination.total
                )}{" "}
                de {transactionsData.pagination.total} transações
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from(
                  { length: Math.min(5, transactionsData.pagination.totalPages) },
                  (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => changePage(pageNum)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? "bg-[var(--gold)] text-black font-semibold"
                            : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}
                <button
                  onClick={() => changePage(currentPage + 1)}
                  disabled={currentPage === transactionsData.pagination.totalPages}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
