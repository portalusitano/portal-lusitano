"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  OverviewCards,
  RevenueCharts,
  TransactionsTable,
  PDFReportSection,
} from "@/components/admin-app/financeiro";

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
  revenueByProduct: Array<{
    type: string;
    amount: number;
  }>;
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

export default function AdminFinanceiroPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Estado dos dados
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [transactionsData, setTransactionsData] = useState<TransactionsData | null>(null);

  // Estado dos filtros
  const [filters, setFilters] = useState({
    product_type: "all",
    status: "all",
    start_date: "",
    end_date: "",
    search: "",
  });

  // Estado da paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  // Estado do relatório PDF
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Verificar autenticação
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/check");
        const data = await res.json();

        if (!data.authenticated) {
          router.push("/admin/login");
          return;
        }

        setIsAuthenticated(true);
        fetchAllData();
      } catch (error) {
        if (process.env.NODE_ENV === "development") console.error("[Financeiro]", error);
        router.push("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Fetch all data
  const fetchAllData = async () => {
    try {
      await Promise.all([fetchOverview(), fetchCharts(), fetchTransactions()]);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[Financeiro]", error);
    }
  };

  // Fetch overview
  const fetchOverview = async () => {
    try {
      const res = await fetch("/api/admin/financeiro/overview");
      if (!res.ok) throw new Error("Failed to fetch overview");
      const data = await res.json();
      setOverviewData(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[Financeiro]", error);
    }
  };

  // Fetch charts
  const fetchCharts = async () => {
    try {
      const res = await fetch("/api/admin/financeiro/charts");
      if (!res.ok) throw new Error("Failed to fetch charts");
      const data = await res.json();
      setChartData(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[Financeiro]", error);
    }
  };

  // Fetch transactions
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
      if (process.env.NODE_ENV === "development") console.error("[Financeiro]", error);
    }
  };

  // Atualizar filtros
  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Aplicar filtros
  const applyFilters = () => {
    fetchTransactions();
  };

  // Exportar CSV
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
      if (process.env.NODE_ENV === "development") console.error("[Financeiro]", error);
      alert("Erro ao exportar CSV");
    }
  };

  // Gerar Relatório PDF
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
      if (process.env.NODE_ENV === "development") console.error("[Financeiro]", error);
      alert("Erro ao gerar relatório PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Mudar página
  const changePage = (newPage: number) => {
    setCurrentPage(newPage);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gold)]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[var(--background-secondary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard Financeiro</h1>
              <p className="text-gray-400 mt-1">Gestão completa de receitas e transações</p>
            </div>
            <button
              onClick={() => router.push("/admin")}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Voltar ao Admin
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PDFReportSection
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          isGeneratingPDF={isGeneratingPDF}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
          onGeneratePDF={generatePDFReport}
        />

        <OverviewCards data={overviewData} />

        <RevenueCharts data={chartData} />

        <TransactionsTable
          data={transactionsData}
          filters={filters}
          currentPage={currentPage}
          onFilterChange={handleFilterChange}
          onApplyFilters={applyFilters}
          onExportCSV={exportCSV}
          onPageChange={changePage}
        />
      </div>
    </div>
  );
}
