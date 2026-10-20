import React, { useState } from "react";
import centralizedAiService, { AIDailyScheduleResponse } from "../services/centralizedAi";
import { Sparkles, Calendar, X } from "lucide-react";
import { buttonClass, textareaClass } from "@/components/ui";

interface AiDailyPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiDailyPlannerModal: React.FC<AiDailyPlannerModalProps> = ({ isOpen, onClose }) => {
  const [workloadContext, setWorkloadContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<AIDailyScheduleResponse | null>(null);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handlePlanDay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await centralizedAiService.planDailyWork(workloadContext);
      setSchedule(res);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } }; message?: string };
      setError(errorObj.response?.data?.error || errorObj.message || "Failed to generate daily schedule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-3 backdrop-blur-sm sm:p-4">
      <div className="max-h-[90vh] w-full max-w-xl space-y-5 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl sm:p-6">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Calendar className="h-[18px] w-[18px] shrink-0 text-slate-400" />
            <h3 className="m-0 text-base font-semibold text-slate-900">✨ AI Daily & Sprint Planner</h3>
          </div>
          <button aria-label="Close" onClick={onClose} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900" type="button">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">{error}</div>}

        {!schedule ? (
          <form onSubmit={handlePlanDay} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Workload Constraints or Focus for Today (Optional)
              </label>
              <textarea
                rows={3}
                value={workloadContext}
                onChange={(e) => setWorkloadContext(e.target.value)}
                placeholder="e.g. Focus 3 hours on critical authentication bugs, 1 hour on PR reviews, leave afternoon open for client demo."
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
                <span>{loading ? "Planning Schedule..." : "Plan My Work for Today"}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="m-0 mb-1 text-sm font-semibold text-slate-900">Today's Focus Summary</h4>
              <p className="m-0 text-[13px] leading-relaxed text-slate-600">{schedule.summary}</p>
            </div>

            <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              {schedule.timeBlocks?.map((tb, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2.5 text-sm"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-700">
                      {tb.time}
                    </span>
                    <div>
                      <div className="font-medium text-slate-900">{tb.taskTitle}</div>
                      {tb.notes && <div className="mt-0.5 text-[13px] text-slate-500">{tb.notes}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setSchedule(null)}
                className={buttonClass("ghost", "sm")}
              >
                ← Re-plan
              </button>
              <button
                type="button"
                onClick={onClose}
                className={buttonClass("primary", "md")}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
