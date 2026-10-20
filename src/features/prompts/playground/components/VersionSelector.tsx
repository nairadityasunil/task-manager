import React from "react";
import { GitBranch, Clock, Rocket, CheckCircle2, Zap } from "lucide-react";
import { PromptVersion, PromptItem, PromptCanaryDeployment } from "@/services/prompts";
import { buttonClass } from "@/components/ui";

interface VersionSelectorProps {
  activePrompt?: PromptItem | null;
  versionsList: PromptVersion[];
  selectedVersionNum: number;
  isPublishingProduction?: boolean;
  activeCanary?: PromptCanaryDeployment | null;
  onSelectVersion: (versionNum: number) => void;
  onOpenCompare: () => void;
  onPublishProduction?: (versionNum: number) => void;
}

export const VersionSelector: React.FC<VersionSelectorProps> = ({
  activePrompt,
  versionsList,
  selectedVersionNum,
  isPublishingProduction = false,
  activeCanary,
  onSelectVersion,
  onOpenCompare,
  onPublishProduction,
}) => {
  const prodVersionNum = activePrompt?.productionVersion;
  const isCanaryActive = activeCanary && ["active", "paused"].includes(activeCanary.status);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="m-0 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
          <GitBranch className="h-4 w-4 text-slate-400" /> Version history
        </h3>
        <button
          type="button"
          onClick={onOpenCompare}
          className={buttonClass("secondary", "sm")}
        >
          <GitBranch className="w-3.5 h-3.5" /> Compare Versions
        </button>
      </div>

      <div className="space-y-2">
        {versionsList.map((ver) => {
          const isSelected = selectedVersionNum === ver.version;
          const isProduction = prodVersionNum === ver.version;
          const noteText = ver.changeNote || (ver as unknown as Record<string, string>).changelog;

          const isCandidate = isCanaryActive && activeCanary?.candidateVersion === ver.version;
          const isCanaryEnvironment = (ver.environment as string) === "canary" || isCandidate;
          const isLegacy = isCanaryActive && activeCanary?.legacyVersion === ver.version;

          return (
            <div
              key={ver._id}
              onClick={() => onSelectVersion(ver.version)}
              className={`flex cursor-pointer flex-col justify-between gap-2 rounded-lg border p-3 text-[13px] transition sm:flex-row sm:items-center ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50/60 text-slate-900"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[13px] font-medium text-slate-900">v{ver.version}</span>

                  {isCanaryEnvironment ? (
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset flex items-center gap-1 bg-sky-50 text-sky-700 ring-sky-200">
                      <Zap className="w-3 h-3" /> Canary ({activeCanary?.trafficWeight?.canary ?? 5}%)
                    </span>
                  ) : isLegacy && isProduction ? (
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset flex items-center gap-1 bg-emerald-50 text-emerald-700 ring-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Production ({activeCanary?.trafficWeight?.legacy ?? 95}%)
                    </span>
                  ) : ver.environment === "production" || isProduction ? (
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset flex items-center gap-1 bg-emerald-50 text-emerald-700 ring-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Production
                    </span>
                  ) : ver.environment === "staging" ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                      Staging
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                      Development
                    </span>
                  )}

                  {noteText && (
                    <span className="text-xs text-slate-500">
                      • {noteText}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {ver.createdAt ? new Date(ver.createdAt).toLocaleString() : "Recently"}
                  </span>
                  {ver.provider && ver.modelName && (
                    <span className="font-mono">
                      {ver.provider}/{ver.modelName}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onPublishProduction && !isProduction && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPublishProduction(ver.version);
                    }}
                    disabled={isPublishingProduction}
                    className={buttonClass("secondary", "sm", "h-7 px-2.5 text-xs")}
                  >
                    <Rocket className="w-3 h-3 text-emerald-600" />
                    Set Prod
                  </button>
                )}
                {isSelected && (
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-white">
                    Active Editor
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
