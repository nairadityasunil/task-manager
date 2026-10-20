import React from "react";
import {
  Play,
  Pause,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Flame,
} from "lucide-react";
import { buttonClass } from "@/components/ui";
import { PromptCanaryDeployment } from "@/services/prompts";

interface CanaryDeploymentBannerProps {
  canary: PromptCanaryDeployment | null;
  onAdvance: () => void;
  onPause: () => void;
  onResume: () => void;
  onRollback: () => void;
  onComplete: () => void;
  isActionLoading?: boolean;
}

export const CanaryDeploymentBanner: React.FC<CanaryDeploymentBannerProps> = ({
  canary,
  onAdvance,
  onPause,
  onResume,
  onRollback,
  onComplete,
  isActionLoading = false,
}) => {
  if (!canary || canary.status === "completed" || canary.status === "cancelled") {
    return null;
  }

  const {
    status,
    currentPhase,
    trafficWeight,
    legacyVersion,
    candidateVersion,
    metrics,
    errorThreshold,
  } = canary;

  const totalRequests = metrics?.canaryRequests || 0;
  const errorCount = metrics?.canaryErrors || 0;
  const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
  const isErrorHigh = errorRate > (errorThreshold || 0.05) * 100;

  const isPaused = status === "paused";
  const isFailed = status === "failed" || status === "rolled_back";

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm transition-all ${
        isFailed
          ? "border-red-200 bg-red-50 text-red-900"
          : isPaused
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-slate-200 bg-white text-slate-900"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Status Information */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700">
              <Flame className="w-4 h-4" />
            </span>
            <h3 className="m-0 text-[15px] font-semibold">
              Canary Deployment Rollout
            </h3>

            {/* Status Pill */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${
                status === "active"
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : isPaused
                  ? "bg-amber-50 text-amber-700 ring-amber-200"
                  : "bg-red-50 text-red-700 ring-red-200"
              }`}
            >
              {status === "active" && <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />}
              {status}
            </span>

            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
              Phase {currentPhase}/4 ({trafficWeight?.canary ?? 5}% Traffic to v{candidateVersion})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-600">
            <span>
              Primary Prod: <strong className="font-mono">v{legacyVersion}</strong> ({trafficWeight?.legacy ?? 95}%)
            </span>
            <span>
              Candidate: <strong className="font-mono">v{candidateVersion}</strong> ({trafficWeight?.canary ?? 5}%)
            </span>
            <span>
              Canary Requests: <strong className="font-mono">{totalRequests}</strong>
            </span>
            <span
              className={`flex items-center gap-1 ${
                isErrorHigh ? "font-medium text-red-600" : "font-medium text-emerald-700"
              }`}
            >
              {isErrorHigh && <AlertTriangle className="w-3.5 h-3.5" />}
              Error Rate: <strong className="font-mono">{errorRate.toFixed(1)}%</strong>
              (Max {(errorThreshold * 100).toFixed(0)}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all duration-500 ${
                isFailed
                  ? "bg-red-500"
                  : isPaused
                  ? "bg-amber-500"
                  : "bg-sky-500"
              }`}
              style={{ width: `${trafficWeight?.canary ?? 5}%` }}
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {!isFailed && (
            <>
              {isPaused ? (
                <button
                  type="button"
                  onClick={onResume}
                  disabled={isActionLoading}
                  className={buttonClass("primary", "sm")}
                >
                  <Play className="w-3.5 h-3.5" /> Resume Traffic
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onPause}
                  disabled={isActionLoading}
                  className={buttonClass("secondary", "sm")}
                >
                  <Pause className="w-3.5 h-3.5 text-slate-600" /> Pause Traffic
                </button>
              )}

              {currentPhase < 4 ? (
                <button
                  type="button"
                  onClick={onAdvance}
                  disabled={isActionLoading || isPaused}
                  className={buttonClass("primary", "sm")}
                >
                  Advance Phase <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onComplete}
                  disabled={isActionLoading}
                  className={buttonClass("accent", "sm")}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Complete & Promote
                </button>
              )}

              <button
                type="button"
                onClick={onRollback}
                disabled={isActionLoading}
                className={buttonClass("danger", "sm")}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Rollback
              </button>
            </>
          )}

          {isFailed && (
            <div className="flex items-center gap-2 text-[13px] font-medium text-red-700">
              <span>{canary.rollbackReason || "Canary failed automatically"}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
