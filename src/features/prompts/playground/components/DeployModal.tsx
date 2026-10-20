import React, { useState } from "react";
import { X, Rocket, ShieldCheck, Flame, GitBranch, ArrowRight, Code } from "lucide-react";
import { buttonClass, inputClass } from "@/components/ui";
import { PromptVersion, PromptItem } from "@/services/prompts";

interface DeployModalProps {
  isOpen: boolean;
  activePrompt: PromptItem | null;
  selectedVersion: PromptVersion | null;
  versionsList: PromptVersion[];
  onClose: () => void;
  onMoveToStaging: (versionNum: number) => void;
  onMoveToDevelopment: (versionNum: number) => void;
  onDeployDirect: (versionNum: number) => void;
  onStartCanary: (candidateVersionNum: number, options?: { minRequests?: number; errorThreshold?: number }) => void;
  isLoading?: boolean;
}

export const DeployModal: React.FC<DeployModalProps> = ({
  isOpen,
  activePrompt,
  selectedVersion,
  onClose,
  onMoveToStaging,
  onMoveToDevelopment,
  onDeployDirect,
  onStartCanary,
  isLoading = false,
}) => {
  const [deployType, setDeployType] = useState<"direct" | "canary" | "staging" | "development">("canary");
  const [minRequests, setMinRequests] = useState<number>(10);
  const [errorThreshold, setErrorThreshold] = useState<number>(5);

  if (!isOpen || !activePrompt || !selectedVersion) return null;

  const prodVersionNum = activePrompt.productionVersion || 1;
  const targetVersionNum = selectedVersion.version;
  const isTargetAlreadyProd = prodVersionNum === targetVersionNum;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (deployType === "staging") {
      onMoveToStaging(targetVersionNum);
    } else if (deployType === "development") {
      onMoveToDevelopment(targetVersionNum);
    } else if (deployType === "direct") {
      onDeployDirect(targetVersionNum);
    } else if (deployType === "canary") {
      onStartCanary(targetVersionNum, {
        minRequests,
        errorThreshold: errorThreshold / 100,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm animate-in fade-in duration-200 sm:p-5" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
              <Rocket className="h-[18px] w-[18px]" />
            </div>
            <div>
              <h3 className="m-0 text-base font-semibold text-slate-900">
                Deploy Prompt Version v{targetVersionNum}
              </h3>
              <p className="m-0 text-[13px] text-slate-500">
                Current Production: <strong className="font-mono text-slate-800">v{prodVersionNum}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          {isTargetAlreadyProd ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-[13px] text-emerald-800">
              Version <strong>v{targetVersionNum}</strong> is already the active production version!
            </div>
          ) : (
            <>
              {/* Option Selector */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Select Environment / Deployment Method
                </label>

                {/* Development Option */}
                <div
                  onClick={() => setDeployType("development")}
                  className={`p-3.5 rounded-lg border transition cursor-pointer flex items-start gap-3 ${
                    deployType === "development"
                      ? "border-emerald-500 bg-emerald-50/60 text-slate-900"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <Code className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                  <div className="space-y-0.5 text-[13px]">
                    <div className="font-medium text-slate-900">Move to Development</div>
                    <div className="text-slate-500">
                      Returns v{targetVersionNum} to development environment for ongoing editing and experimentation.
                    </div>
                  </div>
                </div>

                {/* Staging Option */}
                <div
                  onClick={() => setDeployType("staging")}
                  className={`p-3.5 rounded-lg border transition cursor-pointer flex items-start gap-3 ${
                    deployType === "staging"
                      ? "border-emerald-500 bg-emerald-50/60 text-slate-900"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <GitBranch className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-0.5 text-[13px]">
                    <div className="font-medium text-slate-900">Move to Staging</div>
                    <div className="text-slate-500">
                      Promotes v{targetVersionNum} to staging environment without receiving production traffic.
                    </div>
                  </div>
                </div>

                {/* Canary Option */}
                <div
                  onClick={() => setDeployType("canary")}
                  className={`p-3.5 rounded-lg border transition cursor-pointer flex items-start gap-3 ${
                    deployType === "canary"
                      ? "border-emerald-500 bg-emerald-50/60 text-slate-900"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <Flame className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
                  <div className="space-y-0.5 text-[13px]">
                    <div className="font-medium text-slate-900 flex items-center gap-1.5">
                      Canary Deployment <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">Recommended</span>
                    </div>
                    <div className="text-slate-500">
                      Gradually shift production traffic (5% → 25% → 50% → 100%) with automated error rate health monitoring and instant rollback.
                    </div>
                  </div>
                </div>

                {/* Direct Option */}
                <div
                  onClick={() => setDeployType("direct")}
                  className={`p-3.5 rounded-lg border transition cursor-pointer flex items-start gap-3 ${
                    deployType === "direct"
                      ? "border-emerald-500 bg-emerald-50/60 text-slate-900"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="space-y-0.5 text-[13px]">
                    <div className="font-medium text-slate-900">Direct Production Swap</div>
                    <div className="text-slate-500">
                      Atomically promotes v{targetVersionNum} to production immediately. Existing production version (v{prodVersionNum}) becomes staging.
                    </div>
                  </div>
                </div>
              </div>

              {/* Canary Parameters Config */}
              {deployType === "canary" && (
                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h4 className="m-0 text-sm font-medium text-slate-900">
                    Canary Health Parameters
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                        Min Requests Before Eval
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={minRequests}
                        onChange={(e) => setMinRequests(Number(e.target.value))}
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                        Max Error Threshold (%)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={errorThreshold}
                        onChange={(e) => setErrorThreshold(Number(e.target.value))}
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={buttonClass("secondary")}
            >
              Cancel
            </button>
            {!isTargetAlreadyProd && (
              <button
                type="submit"
                disabled={isLoading}
                className={buttonClass("primary")}
              >
                {isLoading ? "Processing..." : "Confirm Action"} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
