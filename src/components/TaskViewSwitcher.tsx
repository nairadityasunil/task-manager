import React from "react";
import { LayoutGrid, List, Calendar as CalendarIcon, GitCommitHorizontal } from "lucide-react";

export type TaskViewType = "kanban" | "list" | "calendar" | "timeline";

interface TaskViewSwitcherProps {
  currentView: TaskViewType;
  onViewChange: (view: TaskViewType) => void;
}

export const TaskViewSwitcher: React.FC<TaskViewSwitcherProps> = ({
  currentView,
  onViewChange,
}) => {
  const views: Array<{ id: TaskViewType; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: "kanban", label: "Board", icon: LayoutGrid },
    { id: "list", label: "List", icon: List },
    { id: "calendar", label: "Calendar", icon: CalendarIcon },
    { id: "timeline", label: "Timeline", icon: GitCommitHorizontal },
  ];

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-100 p-0.5" role="group">
      {views.map((v) => {
        const Icon = v.icon;
        const isActive = currentView === v.id;
        return (
          <button
            aria-pressed={isActive}
            key={v.id}
            onClick={() => onViewChange(v.id)}
            className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors ${
              isActive
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title={v.label}
            type="button"
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        );
      })}
    </div>
  );
};
