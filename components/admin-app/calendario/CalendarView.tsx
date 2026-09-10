"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

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

interface CalendarViewProps {
  currentDate: Date;
  tasks: Task[];
  selectedDate: Date | null;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onDateSelect: (date: Date) => void;
}

export default function CalendarView({
  currentDate,
  tasks,
  selectedDate,
  onPreviousMonth,
  onNextMonth,
  onDateSelect,
}: CalendarViewProps) {
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

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });

  return (
    <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white capitalize">{monthName}</h2>
        <div className="flex gap-2">
          <button
            onClick={onPreviousMonth}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="text-white" />
          </button>
          <button
            onClick={onNextMonth}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRight className="text-white" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-gray-500 uppercase p-2">
            {day}
          </div>
        ))}

        {Array.from({ length: startingDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const dateTasks = getTasksForDate(date);
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected = selectedDate?.toDateString() === date.toDateString();

          return (
            <button
              key={day}
              onClick={() => onDateSelect(date)}
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
  );
}
