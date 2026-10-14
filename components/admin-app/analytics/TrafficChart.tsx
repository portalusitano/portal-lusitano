"use client";

interface MonthlyConversion {
  month: string;
  leads: number;
  customers: number;
  conversionRate: string;
}

interface TrafficChartProps {
  monthlyConversions: MonthlyConversion[];
}

export default function TrafficChart({ monthlyConversions }: TrafficChartProps) {
  return (
    <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
      <div className="h-80 flex items-end justify-between gap-2">
        {monthlyConversions.map((month, index) => {
          const maxLeads = Math.max(...monthlyConversions.map((m) => m.leads));
          const leadsHeight = maxLeads > 0 ? (month.leads / maxLeads) * 100 : 0;
          const customersHeight =
            month.leads > 0 ? (month.customers / month.leads) * leadsHeight : 0;

          return (
            <div key={index} className="group relative flex-1 h-full flex flex-col justify-end">
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                <div className="font-bold mb-1">{month.month}</div>
                <div className="text-green-400">Leads: {month.leads}</div>
                <div className="text-[var(--gold)]">Clientes: {month.customers}</div>
                <div className="text-purple-400">Taxa: {month.conversionRate}%</div>
              </div>

              {/* Barra Leads */}
              <div
                className="w-full bg-green-500/30 rounded-t transition-all hover:bg-green-500/50 cursor-pointer relative"
                style={{ height: `${leadsHeight}%` }}
              >
                {/* Barra Clientes dentro */}
                <div
                  className="absolute bottom-0 w-full bg-[var(--gold)] rounded-t"
                  style={{ height: `${customersHeight}%` }}
                />
              </div>

              <p className="text-center text-xs text-gray-500 mt-2">{month.month}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500/30 rounded"></div>
          <span className="text-sm text-gray-400">Leads</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[var(--gold)] rounded"></div>
          <span className="text-sm text-gray-400">Clientes</span>
        </div>
      </div>
    </div>
  );
}
