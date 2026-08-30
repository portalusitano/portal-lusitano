"use client";

import { Plus, Pencil, Trash2 } from "lucide-react";

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

interface TasksListProps {
  selectedDate: Date | null;
  tasks: Task[];
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
}

export default function TasksList({
  selectedDate,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onCompleteTask,
}: TasksListProps) {
  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => {
      const taskDate = new Date(task.due_date);
      return taskDate.toDateString() === date.toDateString();
    });
  };

  const dateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  return (
    <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
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
          onClick={onAddTask}
          className="p-2 bg-[var(--gold)] hover:bg-[var(--gold-hover)] rounded-lg transition-colors"
        >
          <Plus className="text-black" size={16} />
        </button>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {selectedDate && dateTasks.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">Nenhuma tarefa para este dia</p>
        )}

        {selectedDate &&
          dateTasks.map((task) => (
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
                    onClick={() => onEditTask(task)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    <Pencil className="text-gray-400" size={14} />
                  </button>
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    <Trash2 className="text-red-400" size={14} />
                  </button>
                </div>
              </div>

              {task.description && <p className="text-gray-400 text-xs mb-2">{task.description}</p>}

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
                    onClick={() => onCompleteTask(task.id)}
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
  );
}
