"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { Evento } from "./types";

interface EventosCalendarProps {
  eventos: Evento[];
  currentMonth: number;
  currentYear: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onEventClick: (evento: Evento) => void;
}

const TIPO_COLORS: Record<string, string> = {
  feira: "bg-amber-500",
  competicao: "bg-blue-500",
  leilao: "bg-green-500",
  exposicao: "bg-purple-500",
  workshop: "bg-pink-500",
};

const TIPO_DOT_COLORS: Record<string, string> = {
  feira: "bg-amber-400",
  competicao: "bg-blue-400",
  leilao: "bg-green-400",
  exposicao: "bg-purple-400",
  workshop: "bg-pink-400",
};

const meses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function EventosCalendar({
  eventos,
  currentMonth,
  currentYear,
  onPrevMonth,
  onNextMonth,
  onEventClick,
}: EventosCalendarProps) {
  const { t } = useLanguage();

  const weekDays = [
    t.eventos.calendar_mon,
    t.eventos.calendar_tue,
    t.eventos.calendar_wed,
    t.eventos.calendar_thu,
    t.eventos.calendar_fri,
    t.eventos.calendar_sat,
    t.eventos.calendar_sun,
  ];

  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Monday = 0, Sunday = 6
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const days: (number | null)[] = [];

    // Empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }

    return days;
  }, [currentMonth, currentYear]);

  // Map events to days (including multi-day events)
  const eventsByDay = useMemo(() => {
    const map: Record<number, Evento[]> = {};

    eventos.forEach((evento) => {
      const start = new Date(evento.data_inicio);
      const end = evento.data_fim ? new Date(evento.data_fim) : start;

      // Check if event overlaps with current month
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);

      if (start > monthEnd || end < monthStart) return;

      // Iterate through days of the event that fall in this month
      const effectiveStart = start < monthStart ? monthStart : start;
      const effectiveEnd = end > monthEnd ? monthEnd : end;

      const d = new Date(effectiveStart);
      while (d <= effectiveEnd) {
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          const day = d.getDate();
          if (!map[day]) map[day] = [];
          // Avoid duplicates
          if (!map[day].find((e) => e.id === evento.id)) {
            map[day].push(evento);
          }
        }
        d.setDate(d.getDate() + 1);
      }
    });

    return map;
  }, [eventos, currentMonth, currentYear]);

  const MAX_VISIBLE = 2;

  return (
    <div className="bg-[var(--background-secondary)]/50 border border-[var(--border)] rounded-xl overflow-hidden animated-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <button
          onClick={onPrevMonth}
          className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground-strong)] transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h3 className="text-lg">
          <span className="text-gradient-gold">{meses[currentMonth]}</span>
          {""}
          <span className="text-[var(--foreground)]">{currentYear}</span>
        </h3>
        <button
          onClick={onNextMonth}
          className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground-strong)] transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-[var(--border)]">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          const dayEvents = day ? eventsByDay[day] || [] : [];
          const isToday = isCurrentMonth && day === today.getDate();
          const hasEvents = dayEvents.length > 0;

          return (
            <div
              key={i}
              className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-[var(--border)] p-1 sm:p-2 transition-colors duration-200 ${
                day === null ? "bg-[var(--background)]/30" : ""
              } ${hasEvents ? "bg-[var(--gold)]/[0.03] hover:bg-[var(--gold)]/[0.06]" : ""} ${
                isToday ? "ring-1 ring-inset ring-[var(--gold)]/30" : ""
              }`}
            >
              {day !== null && (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs sm:text-sm ${
                        isToday
                          ? "w-6 h-6 flex items-center justify-center rounded-full bg-[var(--gold)] text-black font-bold shadow-[0_0_12px_rgb(var(--gold-rgb) / 0.4)]"
                          : "text-[var(--foreground-muted)]"
                      }`}
                    >
                      {day}
                    </span>
                  </div>

                  {/* Event pills */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, MAX_VISIBLE).map((evento) => (
                      <button
                        key={evento.id}
                        onClick={() => onEventClick(evento)}
                        className={`w-full text-left rounded px-1 py-0.5 text-[10px] sm:text-xs truncate cursor-pointer hover:brightness-110 hover:shadow-sm transition-all duration-200 ${
                          TIPO_COLORS[evento.tipo] || "bg-[var(--foreground-muted)]"
                        } text-white`}
                        title={evento.titulo}
                      >
                        <span className="hidden sm:inline">{evento.titulo}</span>
                        <span className="sm:hidden flex items-center gap-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${TIPO_DOT_COLORS[evento.tipo] || "bg-white"}`}
                          />
                          <span className="truncate">{evento.titulo}</span>
                        </span>
                      </button>
                    ))}
                    {dayEvents.length > MAX_VISIBLE && (
                      <span className="text-[10px] text-[var(--foreground-muted)] px-1">
                        {t.eventos.calendar_more.replace(
                          "{n}",
                          String(dayEvents.length - MAX_VISIBLE)
                        )}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 p-3 border-t border-[var(--border)]">
        {Object.entries(TIPO_COLORS).map(([tipo, color]) => (
          <div key={tipo} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
            <span className="text-[10px] sm:text-xs text-[var(--foreground-muted)] capitalize">
              {tipo}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
