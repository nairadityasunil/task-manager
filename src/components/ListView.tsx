import React from "react";
import { Clock, AlertCircle, Sparkles, User } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { PRIORITY_META, PriorityIcon, TASK_STATUS_TONE, taskStatusLabel } from "@/components/TaskCard";
import type { TaskPriority } from "@/types/task";

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  date?: string;
  assignedTo?: { name?: string | null; email?: string };
  isBlocked?: boolean;
}

interface ListViewProps {
  tasks: TaskItem[];
  onTaskClick?: (task: TaskItem) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  onDecomposeAi?: (task: TaskItem) => void;
}

export const ListView: React.FC<ListViewProps> = ({
  tasks,
  onTaskClick,
  onDecomposeAi,
}) => {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
          <Clock className="h-5 w-5 text-slate-400" />
        </div>
        <h4 className="m-0 mb-1 text-sm font-medium text-slate-900">No tasks in list</h4>
        <p className="m-0 text-[13px] text-slate-500">Create a task or plan with AI to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Task Title</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Priority</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Assignee</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Due Date</th>
              <th className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className="group cursor-pointer transition-colors hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-medium text-slate-900">
                  <div className="flex min-w-0 items-center gap-2">
                    {task.isBlocked && (
                      <span title="Blocked">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                      </span>
                    )}
                    <span className="truncate">{task.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge dot tone={TASK_STATUS_TONE[task.status] ?? 'neutral'}>{taskStatusLabel(task.status)}</Badge>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-600">
                    {task.priority in PRIORITY_META ? <PriorityIcon priority={task.priority as TaskPriority} /> : null}
                    {PRIORITY_META[task.priority as TaskPriority]?.label ?? task.priority}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-[13px] text-slate-600 md:table-cell">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate">{task.assignedTo?.name || task.assignedTo?.email || "Unassigned"}</span>
                  </div>
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 text-[13px] text-slate-500 md:table-cell">
                  {task.date || "No due date"}
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  {onDecomposeAi && (
                    <Button icon={Sparkles} onClick={() => onDecomposeAi(task)} size="sm" title="Decompose with AI" variant="secondary">
                      Break Down
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
