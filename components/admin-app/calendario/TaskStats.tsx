"use client";

interface TaskStats {
  total: number;
  pendente: number;
  em_andamento: number;
  concluida: number;
  vencidas: number;
  hoje: number;
}

interface TaskStatsProps {
  stats: TaskStats | null;
}

export default function TaskStats({ stats }: TaskStatsProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
      <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-4">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total</p>
        <p className="text-2xl font-bold text-white">{stats.total}</p>
      </div>
      <div className="bg-[var(--background-secondary)] border border-yellow-500/20 rounded-lg p-4">
        <p className="text-xs text-yellow-500 uppercase tracking-wider mb-1">Hoje</p>
        <p className="text-2xl font-bold text-yellow-500">{stats.hoje}</p>
      </div>
      <div className="bg-[var(--background-secondary)] border border-red-500/20 rounded-lg p-4">
        <p className="text-xs text-red-500 uppercase tracking-wider mb-1">Vencidas</p>
        <p className="text-2xl font-bold text-red-500">{stats.vencidas}</p>
      </div>
      <div className="bg-[var(--background-secondary)] border border-blue-500/20 rounded-lg p-4">
        <p className="text-xs text-blue-500 uppercase tracking-wider mb-1">Pendentes</p>
        <p className="text-2xl font-bold text-blue-500">{stats.pendente}</p>
      </div>
      <div className="bg-[var(--background-secondary)] border border-orange-500/20 rounded-lg p-4">
        <p className="text-xs text-orange-500 uppercase tracking-wider mb-1">Em Andamento</p>
        <p className="text-2xl font-bold text-orange-500">{stats.em_andamento}</p>
      </div>
      <div className="bg-[var(--background-secondary)] border border-green-500/20 rounded-lg p-4">
        <p className="text-xs text-green-500 uppercase tracking-wider mb-1">Concluídas</p>
        <p className="text-2xl font-bold text-green-500">{stats.concluida}</p>
      </div>
    </div>
  );
}
