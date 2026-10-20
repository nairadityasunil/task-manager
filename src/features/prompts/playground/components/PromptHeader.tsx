import React from "react";
import { FileText, Save, Code2, FolderInput, Rocket, CheckCircle2, SlidersHorizontal, Zap } from "lucide-react";
import { PromptItem, PromptCanaryDeployment } from "@/services/prompts";
import { buttonClass } from "@/components/ui";

interface PromptHeaderProps {
  activePrompt: PromptItem | null;
  selectedVersionNum: number;
  hasVersionedConfigurationChanged: boolean;
  isSaving: boolean;
  isEditingPromptContent: boolean;
  isPublishingProduction?: boolean;
  activeCanary?: PromptCanaryDeployment | null;
  onSavePrompt: () => void;
  onToggleEditStructure: () => void;
  onOpenMoveModal: () => void;
  onPublishProduction?: (versionNum: number) => void;
  onOpenDeployModal?: () => void;
  onOpenParametersModal?: () => void;
}

export const PromptHeader: React.FC<PromptHeaderProps> = ({
  activePrompt,
  selectedVersionNum,
  hasVersionedConfigurationChanged,
  isSaving,
  isEditingPromptContent,
  isPublishingProduction = false,
  activeCanary,
  onSavePrompt,
  onToggleEditStructure,
  onOpenMoveModal,
  onPublishProduction,
  onOpenDeployModal,
  onOpenParametersModal,
}) => {
  const isCurrentProduction = activePrompt?.productionVersion === selectedVersionNum && selectedVersionNum > 0;
  const isCanaryCandidate =
    activeCanary &&
    ["active", "paused"].includes(activeCanary.status) &&
    activeCanary.candidateVersion === selectedVersionNum;

  return (
    <div className="flex w-full flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 xl:flex-row xl:items-start">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 sm:flex">
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="m-0 mr-1 min-w-0 truncate text-lg font-semibold tracking-tight text-slate-900">
              {activePrompt?.name || "New Prompt"}
            </h2>
            <span className="rounded-full bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
              {selectedVersionNum > 0 ? `v${selectedVersionNum}` : "No saved version yet"}
            </span>

            {/* Canary Candidate Badge */}
            {isCanaryCandidate && (
              <span className="flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
                <Zap className="w-3 h-3" /> Canary Candidate ({activeCanary.trafficWeight?.canary ?? 5}%)
              </span>
            )}

            {/* Production Badge */}
            {activePrompt?.productionVersion ? (
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                  isCurrentProduction
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-sky-50 text-sky-700 ring-sky-200"
                }`}
              >
                <CheckCircle2 className="w-3 h-3" /> Prod v{activePrompt.productionVersion}
              </span>
            ) : (
              <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
                Not Published
              </span>
            )}

            {hasVersionedConfigurationChanged ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Unsaved changes
              </span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                Saved
              </span>
            )}
          </div>
          <p className="m-0 mt-1 text-[13px] text-slate-500">
            Provider: <span className="font-mono text-slate-700 font-medium">{activePrompt?.provider || "gemini"}</span> • Model:{" "}
            <span className="font-mono text-slate-700 font-medium">{activePrompt?.modelName || "gemini-3.6-flash"}</span>
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSavePrompt}
          disabled={isSaving || (!hasVersionedConfigurationChanged && selectedVersionNum > 0)}
          className={buttonClass(hasVersionedConfigurationChanged || selectedVersionNum === 0 ? "primary" : "secondary", "sm")}
        >
          <Save className="w-3.5 h-3.5" />
          {isSaving ? "Saving..." : "Save"}
        </button>

        {onOpenDeployModal && selectedVersionNum > 0 ? (
          <button
            type="button"
            onClick={onOpenDeployModal}
            className={buttonClass("accent", "sm")}
          >
            <Rocket className="w-3.5 h-3.5" /> Deploy...
          </button>
        ) : onPublishProduction && selectedVersionNum > 0 ? (
          <button
            type="button"
            onClick={() => onPublishProduction(selectedVersionNum)}
            disabled={isPublishingProduction || isCurrentProduction}
            className={
              isCurrentProduction
                ? "inline-flex h-8 cursor-default items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[13px] font-medium text-emerald-700"
                : buttonClass("accent", "sm")
            }
          >
            <Rocket className="w-3.5 h-3.5" />
            {isPublishingProduction
              ? "Publishing..."
              : isCurrentProduction
              ? "Production Active"
              : "Publish to Prod"}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onOpenMoveModal}
          disabled={!activePrompt}
          className={buttonClass("secondary", "sm")}
        >
          <FolderInput className="w-3.5 h-3.5 text-slate-500" />
          Move
        </button>

        <button
          type="button"
          onClick={onToggleEditStructure}
          className={buttonClass("secondary", "sm")}
        >
          <Code2 className="w-3.5 h-3.5 text-slate-500" />
          {isEditingPromptContent ? "Done Editing" : "Edit Structure"}
        </button>

        {onOpenParametersModal && (
          <button
            type="button"
            onClick={onOpenParametersModal}
            className={buttonClass("secondary", "sm")}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            Parameters
          </button>
        )}
      </div>
    </div>
  );
};
