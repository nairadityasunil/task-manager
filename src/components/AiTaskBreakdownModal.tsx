import React, { useState } from "react";
import centralizedAiService, { AITaskBreakdownResponse } from "../services/centralizedAi";
import { Sparkles, Check, Clock, Layers, X } from "lucide-react";
import { buttonClass, inputClass, textareaClass } from "@/components/ui";

interface AiTaskBreakdownModalProps {
  isOpen: boolean;
  taskId?: string;
  taskTitle?: string;
  taskDescription?: string;
  onClose: () => void;
  onApplyBreakdown: (breakdown: AITaskBreakdownResponse) => void;
}

export const AiTaskBreakdownModal: React.FC<AiTaskBreakdownModalProps> = ({
  isOpen,
  taskId,
  taskTitle = "",
  taskDescription = "",
  onClose,
  onApplyBreakdown,
}) => {
  const [title, setTitle] = useState(taskTitle);
  const [description, setDescription] = useState(taskDescription);
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<AITaskBreakdownResponse | null>(null);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleDecompose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await centralizedAiService.decomposeTask(taskId, title, description);
      setBreakdown(res);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } }; message?: string };
      setError(errorObj.response?.data?.error || errorObj.message || "Failed to breakdown task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-3 backdrop-blur-sm sm:p-4">
      <div className="max-h-[90vh] w-full max-w-xl space-y-5 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl sm:p-6">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Sparkles className="h-[18px] w-[18px] shrink-0 text-slate-400" />
            <h3 className="m-0 text-base font-semibold text-slate-900">Decompose Task with AI</h3>
          </div>
          <button aria-label="Close" onClick={onClose} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900" type="button">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">{error}</div>}

        {!breakdown ? (
          <form onSubmit={handleDecompose} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Task Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Implement JWT authentication and session handling"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide initial context or requirements..."
                className={textareaClass}
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={loading}
                className={buttonClass("primary", "md")}
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? "Decomposing..." : "Break Down Task"}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-900">{breakdown.title}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Est: {breakdown.estimatedHours} hours</span>
                </span>
              </div>
              <p className="m-0 text-[13px] text-slate-600">{breakdown.description}</p>
            </div>

            <div>
              <h4 className="m-0 mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Layers className="h-4 w-4 text-slate-400" />
                <span>Generated Subtasks ({breakdown.subtasks?.length || 0})</span>
              </h4>
              <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                {breakdown.subtasks?.map((sub, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="text-slate-800">{sub.title}</span>
                    {sub.estimatedHours && <span className="shrink-0 text-xs tabular-nums text-slate-500">{sub.estimatedHours}h</span>}
                  </div>
                ))}
              </div>
            </div>

            {breakdown.rationale && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-600">
                <span className="font-medium text-slate-900">Rationale: </span>
                {breakdown.rationale}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setBreakdown(null)}
                className={buttonClass("ghost", "sm")}
              >
                ← Edit Prompt
              </button>
              <button
                type="button"
                onClick={() => {
                  onApplyBreakdown(breakdown);
                  onClose();
                }}
                className={buttonClass("accent", "md")}
              >
                <Check className="w-4 h-4" />
                <span>Apply Breakdown to Task</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
