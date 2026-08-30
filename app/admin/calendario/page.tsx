"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import Link from "next/link";
import { TaskStats, CalendarView, TasksList, TaskModal } from "@/components/admin-app/calendario";

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

interface TaskStatsType {
  total: number;
  pendente: number;
  em_andamento: number;
  concluida: number;
  vencidas: number;
  hoje: number;
}

export default function CalendarioPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStatsType | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/check");
        const data = await res.json();

        if (!data.authenticated) {
          router.push("/admin/login");
          return;
        }

        setIsAuthenticated(true);
        fetchTasks();
      } catch (error) {
        if (process.env.NODE_ENV === "development") console.error("[Calendario]", error);
        router.push("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchTasks = useCallback(async () => {
    try {
      const month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
      const res = await fetch(`/api/admin/tasks?month=${month}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");

      const data = await res.json();
      setTasks(data.tasks || []);
      setStats(data.stats || null);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[Calendario]", error);
    }
  }, [currentDate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
    }
  }, [currentDate, isAuthenticated, fetchTasks]);

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
      if (process.env.NODE_ENV === "development") console.error("[Calendario]", error);
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
      if (process.env.NODE_ENV === "development") console.error("[Calendario]", error);
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
      if (process.env.NODE_ENV === "development") console.error("[Calendario]", error);
      alert("Erro ao eliminar tarefa");
    }
  };

  const completeTask = (taskId: string) => {
    updateTask(taskId, { status: "concluida" });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="border-b border-white/10 bg-[var(--background-secondary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Calendar className="text-[var(--gold)]" />
                Calendário de Follow-ups
              </h1>
              <p className="text-gray-400 mt-1">Gerir tarefas e lembretes de clientes</p>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Voltar ao Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TaskStats stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CalendarView
              currentDate={currentDate}
              tasks={tasks}
              selectedDate={selectedDate}
              onPreviousMonth={previousMonth}
              onNextMonth={nextMonth}
              onDateSelect={setSelectedDate}
            />
          </div>

          <TasksList
            selectedDate={selectedDate}
            tasks={tasks}
            onAddTask={() => openModal()}
            onEditTask={openModal}
            onDeleteTask={deleteTask}
            onCompleteTask={completeTask}
          />
        </div>
      </div>

      <TaskModal
        isOpen={isModalOpen}
        editingTask={editingTask}
        formData={formData}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onFormChange={(data) => setFormData({ ...formData, ...data })}
      />
    </div>
  );
}
