import React from "react";
import { GitBranch, Clock, Rocket, CheckCircle2, Zap } from "lucide-react";
import { PromptVersion, PromptItem, PromptCanaryDeployment } from "@/services/prompts";

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
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-slate-500" /> Version History
        </h3>
        <button
          type="button"
          onClick={onOpenCompare}
          className="px-3 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
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
              className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between text-xs ${
                isSelected
                  ? "bg-slate-50/80 border-slate-400 font-medium text-slate-950 shadow-2xs"
                  : "border-slate-200 hover:bg-slate-50 text-slate-700 font-normal"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-semibold text-slate-900">v{ver.version}</span>

                  {isCanaryEnvironment ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-purple-600" /> Canary ({activeCanary?.trafficWeight?.canary ?? 5}%)
                    </span>
                  ) : isLegacy && isProduction ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Production ({activeCanary?.trafficWeight?.legacy ?? 95}%)
                    </span>
                  ) : ver.environment === "production" || isProduction ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Production
                    </span>
                  ) : ver.environment === "staging" ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-300">
                      Staging
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      Development
                    </span>
                  )}

                  {noteText && (
                    <span className="text-[11px] text-slate-500 font-normal">
                      • {noteText}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-normal flex items-center gap-3">
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
                    className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-medium transition flex items-center gap-1 border border-indigo-200 cursor-pointer disabled:opacity-50"
                  >
                    <Rocket className="w-3 h-3 text-indigo-600" />
                    Set Prod
                  </button>
                )}
                {isSelected && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-700 text-white">
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
