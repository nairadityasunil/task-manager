import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

interface CalendarTask {
  id: string;
  title: string;
  date?: string;
  priority?: string;
  status?: string;
}

interface CalendarViewProps {
  tasks: CalendarTask[];
  onTaskClick?: (task: CalendarTask) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onTaskClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Map tasks by date YYYY-MM-DD
  const tasksByDate: Record<string, typeof tasks> = {};
  tasks.forEach((t) => {
    if (t.date) {
      tasksByDate[t.date] = tasksByDate[t.date] || [];
      tasksByDate[t.date].push(t);
    }
  });

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CalendarIcon className="h-[18px] w-[18px] text-slate-400" />
          <h3 className="m-0 text-[15px] font-semibold text-slate-900">
            {monthNames[month]} {year}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous month"
            onClick={prevMonth}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            aria-label="Next month"
            onClick={nextMonth}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase tracking-wide text-slate-500 sm:gap-1.5">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="h-16 rounded-lg bg-slate-50/60 sm:h-28" />
        ))}
        {daysArray.map((day) => {
          const formattedDay = day < 10 ? `0${day}` : `${day}`;
          const formattedMonth = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
          const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
          const dayTasks = tasksByDate[dateStr] || [];
          const isToday = dateStr === todayStr;

          return (
            <div
              key={`day-${day}`}
              className="flex h-16 min-w-0 flex-col gap-1 rounded-lg border border-slate-200 p-1 transition-colors hover:border-slate-300 sm:h-28 sm:p-1.5"
            >
              <div className={isToday ? "flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-medium text-white" : "px-0.5 text-xs font-medium text-slate-500"}>{day}</div>
              <div className="min-h-0 space-y-0.5 overflow-y-auto">
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onTaskClick?.(t)}
                    className="cursor-pointer truncate rounded border-l-2 border-slate-900 bg-slate-100 px-1 py-0.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-200"
                    title={t.title}
                  >
                    {t.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
