import React from "react";
import { GitCommitHorizontal, Clock } from "lucide-react";
import { Badge } from "@/components/ui";
import { TASK_STATUS_TONE, taskStatusLabel } from "@/components/TaskCard";

interface TimelineTask {
  id: string;
  title: string;
  date?: string;
  status: string;
  priority: string;
  epicName?: string;
}

interface TimelineViewProps {
  tasks: TimelineTask[];
  onTaskClick?: (task: TimelineTask) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ tasks, onTaskClick }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex items-center gap-2.5">
        <GitCommitHorizontal className="h-[18px] w-[18px] text-slate-400" />
        <h3 className="m-0 text-[15px] font-semibold text-slate-900">Project Timeline & Milestones</h3>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-[13px] text-slate-500">
          No tasks found on timeline.
        </div>
      ) : (
        <div className="relative space-y-3 border-l border-slate-200 pl-5">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onTaskClick?.(task)}
              className="group relative cursor-pointer"
            >
              {/* Dot */}
              <div className="absolute -left-[25px] top-4 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400 ring-1 ring-slate-300 transition-colors group-hover:bg-slate-900" />

              <div className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 p-3 transition-colors hover:border-slate-300 hover:bg-slate-50 md:flex-row md:items-center">
                <div className="min-w-0">
                  <div className="mb-0.5 text-xs text-slate-500">
                    {task.epicName || "Milestone Task"}
                  </div>
                  <h4 className="m-0 truncate text-sm font-medium text-slate-900">
                    {task.title}
                  </h4>
                </div>

                <div className="flex shrink-0 items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>{task.date || "Scheduled"}</span>
                  </span>
                  <Badge dot tone={TASK_STATUS_TONE[task.status] ?? "neutral"}>{taskStatusLabel(task.status)}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
