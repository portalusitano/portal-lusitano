"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  X,
  Edit2,
  Trash2,
  Calendar,
  User,
  Filter,
  SortAsc,
  CheckCircle2,
  Clock,
  PlayCircle,
  Search,
} from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
// arrayMove not used currently

// ========================================
// TIPOS
// ========================================

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: "pendente" | "em_andamento" | "concluida";
  priority: "baixa" | "normal" | "alta" | "urgente";
  due_date: string;
  created_at: string;
  updated_at: string;
  admin_email: string | null;
  task_type?: string;
  related_email?: string | null;
  completed_at?: string | null;
}

interface TaskStats {
  total: number;
  pendente: number;
  em_andamento: number;
  concluida: number;
  vencidas: number;
  hoje: number;
}

interface KanbanColumn {
  id: "pendente" | "em_andamento" | "concluida";
  title: string;
  status: "pendente" | "em_andamento" | "concluida";
  color: string;
  icon: React.ElementType;
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    baixa: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    normal: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    alta: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    urgente: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return colors[priority] || colors.normal;
};

const getPriorityLabel = (priority: string) => {
  const labels: Record<string, string> = {
    baixa: "Baixa",
    normal: "Normal",
    alta: "Alta",
    urgente: "Urgente",
  };
  return labels[priority] || priority;
};

const getDueDateColor = (dueDate: string, status: string) => {
  if (status === "concluida") return "text-gray-400";

  const now = new Date();
  const due = new Date(dueDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  if (dueDay < today) return "text-red-400"; // Overdue
  if (dueDay.getTime() === today.getTime()) return "text-yellow-400"; // Today
  return "text-gray-400"; // Future
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateOnly.getTime() === today.getTime()) return "Hoje";
  if (dateOnly.getTime() === yesterday.getTime()) return "Ontem";
  if (dateOnly.getTime() === tomorrow.getTime()) return "Amanhã";

  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
};

// ========================================
// KANBAN COLUMNS
// ========================================

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: "pendente",
    title: "To Do",
    status: "pendente",
    color: "border-gray-500/30",
    icon: Clock,
  },
  {
    id: "em_andamento",
    title: "In Progress",
    status: "em_andamento",
    color: "border-blue-500/30",
    icon: PlayCircle,
  },
  {
    id: "concluida",
    title: "Done",
    status: "concluida",
    color: "border-green-500/30",
    icon: CheckCircle2,
  },
];

// ========================================
// TASK CARD COMPONENT
// ========================================

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}

const DraggableTaskCard = ({ task, onEdit, onDelete }: TaskCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: task,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} isDragging={isDragging} />
    </div>
  );
};

const TaskCard = ({ task, onEdit, onDelete, isDragging }: TaskCardProps) => {
  const dueDateColor = getDueDateColor(task.due_date, task.status);

  return (
    <div
      className={`
        bg-white/5 border border-white/10 rounded-lg p-4 cursor-pointer
        hover:bg-white/10 transition-all group
        ${isDragging ? "opacity-50 rotate-2 scale-105" : ""}
      `}
      onClick={() => onEdit(task)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-white font-semibold text-sm flex-1 pr-2 line-clamp-2">{task.title}</h4>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5 text-gray-400 hover:text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="p-1 hover:bg-red-500/20 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-gray-400 text-xs mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Priority Badge */}
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}
        >
          {getPriorityLabel(task.priority)}
        </span>

        {/* Due Date */}
        <div className={`flex items-center gap-1 text-xs ${dueDateColor}`}>
          <Calendar className="w-3 h-3" />
          {formatDate(task.due_date)}
        </div>
      </div>

      {/* Assigned To */}
      {task.assigned_to && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-2 pt-2 border-t border-white/5">
          <User className="w-3 h-3" />
          <span className="truncate">{task.assigned_to}</span>
        </div>
      )}
    </div>
  );
};

// ========================================
// KANBAN COLUMN COMPONENT
// ========================================

interface KanbanColumnProps {
  column: KanbanColumn;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const KanbanColumnComponent = ({ column, tasks, onEdit, onDelete }: KanbanColumnProps) => {
  const Icon = column.icon;
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-black/20 rounded-xl border-2 ${column.color} p-4 flex flex-col h-full min-h-[600px] transition-all ${
        isOver ? "border-[var(--gold)] bg-[var(--gold)]/5 scale-105" : ""
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-[var(--gold)]" />
          <h3 className="text-white font-semibold">{column.title}</h3>
          <span className="text-sm text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-3 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        {tasks.map((task) => (
          <DraggableTaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
        ))}

        {tasks.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">Nenhuma tarefa</div>
        )}
      </div>
    </div>
  );
};

// ========================================
// TASK MODAL COMPONENT
// ========================================

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSave: (taskData: Partial<Task>) => void;
  adminUsers: string[];
}

const TaskModal = ({ isOpen, onClose, task, onSave, adminUsers }: TaskModalProps) => {
  const getFormData = (): Partial<Task> => {
    if (task) {
      return {
        title: task.title,
        description: task.description || "",
        assigned_to: task.assigned_to || "",
        priority: task.priority,
        due_date: task.due_date.split("T")[0],
        status: task.status,
      };
    }
    return {
      title: "",
      description: "",
      assigned_to: "",
      priority: "normal",
      due_date: new Date().toISOString().split("T")[0],
      status: "pendente",
    };
  };

  const [formData, setFormData] = useState<Partial<Task>>(getFormData);

  // Sync formData when task or modal open state changes
  useEffect(() => {
    if (isOpen) {
      setFormData(getFormData());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--background-secondary)] border border-white/20 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">{task ? "Editar Tarefa" : "Nova Tarefa"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)] transition-colors"
              placeholder="Ex: Contactar cliente sobre proposta"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Descrição</label>
            <textarea
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)] transition-colors resize-none"
              placeholder="Detalhes da tarefa..."
            />
          </div>

          {/* Assigned To & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Atribuído a</label>
              <input
                type="text"
                list="admin-users"
                value={formData.assigned_to || ""}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)] transition-colors"
                placeholder="email@exemplo.com"
              />
              <datalist id="admin-users">
                {adminUsers.map((email) => (
                  <option key={email} value={email} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Prioridade</label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value as Task["priority"] })
                }
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--gold)] transition-colors"
              >
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          {/* Due Date & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Data de Vencimento <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.due_date || ""}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--gold)] transition-colors"
              />
            </div>

            {task && (
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Estado</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as Task["status"] })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--gold)] transition-colors"
                >
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluida">Concluída</option>
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-semibold rounded-lg transition-colors"
            >
              {task ? "Guardar" : "Criar Tarefa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ========================================
// MAIN TASKS CONTENT COMPONENT
// ========================================

export default function TasksContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    pendente: 0,
    em_andamento: 0,
    concluida: 0,
    vencidas: 0,
    hoje: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [adminUsers, setAdminUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAssigned, setFilterAssigned] = useState("all");
  const [sortBy, setSortBy] = useState<"due_date" | "created_at" | "priority">("due_date");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, usersRes] = await Promise.all([
        fetch("/api/admin/tasks"),
        fetch("/api/admin/users"),
      ]);

      const tasksData = await tasksRes.json();
      const usersData = await usersRes.json();

      if (tasksData.tasks) {
        setTasks(tasksData.tasks);
        setStats(tasksData.stats);
      }

      if (usersData.users) {
        setAdminUsers(usersData.users.map((u: { email: string }) => u.email));
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[TasksContent]", error);
      showToast("Erro ao carregar dados", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    // Simple toast implementation - you can replace with a library
    const toast = document.createElement("div");
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg text-white font-semibold z-50 ${
      type === "success" ? "bg-green-500" : "bg-red-500"
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const handleCreateTask = async (taskData: Partial<Task>) => {
    try {
      const response = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) throw new Error("Erro ao criar tarefa");

      showToast("Tarefa criada com sucesso!", "success");
      setShowModal(false);
      loadData();
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[TasksContent]", error);
      showToast("Erro ao criar tarefa", "error");
    }
  };

  const handleUpdateTask = async (taskData: Partial<Task>) => {
    if (!editingTask) return;

    try {
      const response = await fetch(`/api/admin/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) throw new Error("Erro ao atualizar tarefa");

      showToast("Tarefa atualizada com sucesso!", "success");
      setShowModal(false);
      setEditingTask(null);
      loadData();
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[TasksContent]", error);
      showToast("Erro ao atualizar tarefa", "error");
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Tem certeza que deseja eliminar esta tarefa?")) return;

    try {
      const response = await fetch(`/api/admin/tasks/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao eliminar tarefa");

      showToast("Tarefa eliminada com sucesso!", "success");
      loadData();
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[TasksContent]", error);
      showToast("Erro ao eliminar tarefa", "error");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as "pendente" | "em_andamento" | "concluida";

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

    try {
      const response = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Erro ao atualizar tarefa");

      showToast("Tarefa movida com sucesso!", "success");
      loadData();
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[TasksContent]", error);
      showToast("Erro ao mover tarefa", "error");
      // Revert on error
      loadData();
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const handleNewTask = () => {
    setEditingTask(null);
    setShowModal(true);
  };

  // Filter and sort tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      searchTerm === "" ||
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    const matchesAssigned = filterAssigned === "all" || task.assigned_to === filterAssigned;

    return matchesSearch && matchesPriority && matchesAssigned;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "due_date") {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (sortBy === "created_at") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === "priority") {
      const priorityOrder = { urgente: 0, alta: 1, normal: 2, baixa: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return 0;
  });

  const getTasksByStatus = (status: "pendente" | "em_andamento" | "concluida") => {
    return sortedTasks.filter((task) => task.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--gold)] mx-auto mb-4"></div>
          <p className="text-gray-400">A carregar tarefas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-[var(--background)] via-[var(--background-secondary)] to-[var(--background)] p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Gestão de Tarefas</h1>
            <p className="text-gray-400">Organize e acompanhe as suas tarefas em kanban</p>
          </div>

          <button
            onClick={handleNewTask}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-semibold rounded-lg transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            Nova Tarefa
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">Total</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">Pendentes</p>
            <p className="text-2xl font-bold text-gray-400">{stats.pendente}</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-blue-400 text-sm mb-1">Em Andamento</p>
            <p className="text-2xl font-bold text-blue-400">{stats.em_andamento}</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <p className="text-green-400 text-sm mb-1">Concluídas</p>
            <p className="text-2xl font-bold text-green-400">{stats.concluida}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400 text-sm mb-1">Vencidas</p>
            <p className="text-2xl font-bold text-red-400">{stats.vencidas}</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-yellow-400 text-sm mb-1">Hoje</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.hoje}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Pesquisar tarefas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)] transition-colors"
              />
            </div>
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-8 py-2 text-white appearance-none focus:outline-none focus:border-[var(--gold)] transition-colors cursor-pointer"
            >
              <option value="all">Todas Prioridades</option>
              <option value="urgente">Urgente</option>
              <option value="alta">Alta</option>
              <option value="normal">Normal</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>

          {/* Assigned Filter */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={filterAssigned}
              onChange={(e) => setFilterAssigned(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-8 py-2 text-white appearance-none focus:outline-none focus:border-[var(--gold)] transition-colors cursor-pointer"
            >
              <option value="all">Todos Atribuídos</option>
              {Array.from(
                new Set(tasks.map((t) => t.assigned_to).filter((v): v is string => Boolean(v)))
              ).map((email) => (
                <option key={email} value={email}>
                  {email}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="relative">
            <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "due_date" | "created_at" | "priority")}
              className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-8 py-2 text-white appearance-none focus:outline-none focus:border-[var(--gold)] transition-colors cursor-pointer"
            >
              <option value="due_date">Ordenar por Vencimento</option>
              <option value="created_at">Ordenar por Criação</option>
              <option value="priority">Ordenar por Prioridade</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6">
          {KANBAN_COLUMNS.map((column) => (
            <div key={column.id} id={column.id}>
              <KanbanColumnComponent
                column={column}
                tasks={getTasksByStatus(column.status)}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeTaskId ? (
            <TaskCard
              task={tasks.find((t) => t.id === activeTaskId)!}
              onEdit={() => {}}
              onDelete={() => {}}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Modal */}
      <TaskModal
        key={editingTask?.id || "new"}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingTask(null);
        }}
        task={editingTask}
        onSave={editingTask ? handleUpdateTask : handleCreateTask}
        adminUsers={adminUsers}
      />
    </div>
  );
}
