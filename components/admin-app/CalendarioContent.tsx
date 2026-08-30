"use client";

import { useEffect, useState } from "react";
import { Calendar, Plus, X, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  due_date: string;
  status: string;
  priority: string;
  related_email: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
}

interface TaskStats {
  total: number;
  pendente: number;
  em_andamento: number;
  concluida: number;
  vencidas: number;
  hoje: number;
}

export default function CalendarioContent() {
  const [isLoading, setIsLoading] = useState(true);

  // Estado das tarefas
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);

  // Estado do calendário
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Estado do modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Estado do formulário
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    task_type: "follow_up",
    due_date: "",
    priority: "normal",
    related_email: "",
    notes: "",
  });

  useEffect(() => {
    fetchTasks();
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  // Buscar tarefas
  const fetchTasks = async () => {
    try {
      const month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
      const res = await fetch(`/api/admin/tasks?month=${month}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");

      const data = await res.json();
      setTasks(data.tasks || []);
      setStats(data.stats || null);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[CalendarioContent]", error);
    }
  };

  // Funções do calendário
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => {
      const taskDate = new Date(task.due_date);
      return taskDate.toDateString() === date.toDateString();
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // Funções de tarefa
  const createTask = async () => {
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to create task");

      fetchTasks();
      closeModal();
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[CalendarioContent]", error);
      alert("Erro ao criar tarefa");
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error("Failed to update task");

      fetchTasks();
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[CalendarioContent]", error);
      alert("Erro ao atualizar tarefa");
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Tem certeza que deseja eliminar esta tarefa?")) return;

    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete task");

      fetchTasks();
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[CalendarioContent]", error);
      alert("Erro ao eliminar tarefa");
    }
  };

  const completeTask = (taskId: string) => {
    updateTask(taskId, { status: "concluida" });
  };

  // Modal
  const openModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description || "",
        task_type: task.task_type,
        due_date: new Date(task.due_date).toISOString().slice(0, 16),
        priority: task.priority,
        related_email: task.related_email || "",
        notes: task.notes || "",
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: "",
        description: "",
        task_type: "follow_up",
        due_date: selectedDate
          ? new Date(selectedDate).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        priority: "normal",
        related_email: "",
        notes: "",
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingTask) {
      await updateTask(editingTask.id, formData);
    } else {
      await createTask();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gold)]"></div>
      </div>
    );
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="text-[var(--gold)]" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-white">Calendário de Follow-ups</h1>
              <p className="text-gray-400">Gerir tarefas e lembretes de clientes</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="bg-white/5 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-xs text-yellow-500 uppercase tracking-wider mb-1">Hoje</p>
              <p className="text-2xl font-bold text-yellow-500">{stats.hoje}</p>
            </div>
            <div className="bg-white/5 border border-red-500/20 rounded-lg p-4">
              <p className="text-xs text-red-500 uppercase tracking-wider mb-1">Vencidas</p>
              <p className="text-2xl font-bold text-red-500">{stats.vencidas}</p>
            </div>
            <div className="bg-white/5 border border-blue-500/20 rounded-lg p-4">
              <p className="text-xs text-blue-500 uppercase tracking-wider mb-1">Pendentes</p>
              <p className="text-2xl font-bold text-blue-500">{stats.pendente}</p>
            </div>
            <div className="bg-white/5 border border-orange-500/20 rounded-lg p-4">
              <p className="text-xs text-orange-500 uppercase tracking-wider mb-1">Em Andamento</p>
              <p className="text-2xl font-bold text-orange-500">{stats.em_andamento}</p>
            </div>
            <div className="bg-white/5 border border-green-500/20 rounded-lg p-4">
              <p className="text-xs text-green-500 uppercase tracking-wider mb-1">Concluídas</p>
              <p className="text-2xl font-bold text-green-500">{stats.concluida}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendário */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-lg p-6">
            {/* Controlos do mês */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white capitalize">{monthName}</h2>
              <div className="flex gap-2">
                <button
                  onClick={previousMonth}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ChevronLeft className="text-white" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ChevronRight className="text-white" />
                </button>
              </div>
            </div>

            {/* Grid do calendário */}
            <div className="grid grid-cols-7 gap-2">
              {/* Dias da semana */}
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-gray-500 uppercase p-2"
                >
                  {day}
                </div>
              ))}

              {/* Dias vazios antes do início do mês */}
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Dias do mês */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const dateTasks = getTasksForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();
                const isSelected = selectedDate?.toDateString() === date.toDateString();

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(date)}
                    className={`aspect-square p-2 rounded-lg border transition-all relative ${
                      isToday
                        ? "border-[var(--gold)] bg-[var(--gold)]/10"
                        : isSelected
                          ? "border-white/30 bg-white/5"
                          : "border-white/10 hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${isToday ? "text-[var(--gold)]" : "text-white"}`}
                    >
                      {day}
                    </span>

                    {/* Indicadores de tarefas */}
                    {dateTasks.length > 0 && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                        {dateTasks.slice(0, 3).map((task, idx) => (
                          <div
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full ${
                              task.status === "concluida"
                                ? "bg-green-500"
                                : task.status === "em_andamento"
                                  ? "bg-orange-500"
                                  : new Date(task.due_date) < new Date()
                                    ? "bg-red-500"
                                    : "bg-blue-500"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de tarefas do dia selecionado */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {selectedDate
                  ? selectedDate.toLocaleDateString("pt-PT", {
                      day: "numeric",
                      month: "long",
                    })
                  : "Selecione um dia"}
              </h3>
              <button
                onClick={() => openModal()}
                className="p-2 bg-[var(--gold)] hover:bg-[var(--gold-hover)] rounded-lg transition-colors"
              >
                <Plus className="text-black" size={16} />
              </button>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {selectedDate && getTasksForDate(selectedDate).length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">
                  Nenhuma tarefa para este dia
                </p>
              )}

              {selectedDate &&
                getTasksForDate(selectedDate).map((task) => (
                  <div
                    key={task.id}
                    className={`bg-white/5 border rounded-lg p-4 ${
                      task.status === "concluida"
                        ? "border-green-500/30 opacity-60"
                        : task.status === "em_andamento"
                          ? "border-orange-500/30"
                          : new Date(task.due_date) < new Date()
                            ? "border-red-500/30"
                            : "border-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-medium text-sm">{task.title}</h4>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openModal(task)}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          <Pencil className="text-gray-400" size={14} />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          <Trash2 className="text-red-400" size={14} />
                        </button>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-gray-400 text-xs mb-2">{task.description}</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          task.priority === "urgente"
                            ? "bg-red-500/20 text-red-400"
                            : task.priority === "alta"
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {task.priority}
                      </span>

                      <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-300">
                        {task.task_type.replace("_", " ")}
                      </span>

                      {task.status !== "concluida" && (
                        <button
                          onClick={() => completeTask(task.id)}
                          className="ml-auto text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                        >
                          Concluir
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Criar/Editar Tarefa */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingTask ? "Editar Tarefa" : "Nova Tarefa"}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Título *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
                  placeholder="Ex: Follow-up cliente João"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)] resize-none"
                  rows={3}
                  placeholder="Detalhes adicionais..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
                  <select
                    value={formData.task_type}
                    onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                    className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
                  >
                    <option value="follow_up">Follow-up</option>
                    <option value="call">Chamada</option>
                    <option value="email">Email</option>
                    <option value="meeting">Reunião</option>
                    <option value="other">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Prioridade</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Data e Hora *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email do Cliente
                </label>
                <input
                  type="email"
                  value={formData.related_email}
                  onChange={(e) => setFormData({ ...formData, related_email: e.target.value })}
                  className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
                  placeholder="cliente@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notas Internas
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--gold)] resize-none"
                  rows={2}
                  placeholder="Notas privadas..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-semibold rounded-lg transition-colors"
                >
                  {editingTask ? "Guardar" : "Criar Tarefa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
