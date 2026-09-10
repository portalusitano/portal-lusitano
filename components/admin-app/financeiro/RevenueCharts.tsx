"use client";

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

interface RevenueChartsProps {
  data: ChartData | null;
}

export default function RevenueCharts({ data }: RevenueChartsProps) {
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Receita Diária */}
      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Receita Diária (Últimos 30 Dias)</h3>
        <div className="h-64 flex items-end justify-between gap-1">
          {data.dailyRevenue.slice(-30).map((day, index) => {
            const maxRevenue = Math.max(...data.dailyRevenue.map((d) => d.revenue));
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

      {/* Receita por Produto */}
      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Receita por Produto</h3>
        <div className="space-y-4">
          {data.revenueByProduct.map((product, index) => {
            const totalRevenue = data.revenueByProduct.reduce((sum, p) => sum + p.revenue, 0);
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
                    className="h-full rounded-full transition-all"
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

      {/* Crescimento Mensal */}
      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Crescimento Mensal (Últimos 12 Meses)
        </h3>
        <div className="h-64 flex items-end justify-between gap-2">
          {data.monthlyRevenue.map((month, index) => {
            const maxRevenue = Math.max(...data.monthlyRevenue.map((m) => m.revenue));
            const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;

            return (
              <div key={index} className="group relative flex-1" style={{ height: "100%" }}>
                <div
                  className="absolute bottom-8 w-full bg-gradient-to-t from-[var(--gold)] to-[var(--gold-hover)] rounded-t transition-all hover:from-[var(--gold-hover)] hover:to-[var(--gold-hover)] cursor-pointer"
                  style={{ height: `calc(${height}% - 2rem)` }}
                >
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {month.fullMonth}
                    <br />€{month.revenue.toFixed(2)}
                  </div>
                </div>
                <p className="absolute bottom-0 w-full text-center text-xs text-gray-500">
                  {month.month}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Evolução MRR */}
      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Evolução MRR</h3>
        <div className="h-64 relative">
          <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="mrrGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#C5A059" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#C5A059" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Área sob a curva */}
            {data.mrrEvolution.length > 0 && (
              <>
                {(() => {
                  const maxMRR = Math.max(...data.mrrEvolution.map((m) => m.mrr));
                  const points = data.mrrEvolution
                    .map((month, index) => {
                      const x = (index / (data.mrrEvolution.length - 1)) * 400;
                      const y = maxMRR > 0 ? 200 - (month.mrr / maxMRR) * 180 : 200;
                      return `${x},${y}`;
                    })
                    .join(" ");

                  const areaPoints = `0,200 ${points} 400,200`;

                  return (
                    <>
                      <polyline points={areaPoints} fill="url(#mrrGradient)" />
                      <polyline points={points} fill="none" stroke="#C5A059" strokeWidth="2" />
                    </>
                  );
                })()}
              </>
            )}
          </svg>
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
            {data.mrrEvolution
              .filter((_, i) => i % 2 === 0)
              .map((month, index) => (
                <span key={index} className="text-xs text-gray-500">
                  {month.month}
                </span>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
