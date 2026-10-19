import React, { useState } from "react";
import { X, Rocket, ShieldCheck, Flame, GitBranch, ArrowRight, Code } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Deploy Prompt Version v{targetVersionNum}
              </h3>
              <p className="text-xs text-slate-500">
                Current Production: <strong className="font-mono text-slate-800">v{prodVersionNum}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {isTargetAlreadyProd ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              Version <strong>v{targetVersionNum}</strong> is already the active production version!
            </div>
          ) : (
            <>
              {/* Option Selector */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Select Environment / Deployment Method
                </label>

                {/* Development Option */}
                <div
                  onClick={() => setDeployType("development")}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                    deployType === "development"
                      ? "bg-slate-100 border-slate-400 text-slate-950"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <Code className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                  <div className="text-xs space-y-0.5">
                    <div className="font-semibold text-slate-900">Move to Development</div>
                    <div className="text-slate-500">
                      Returns v{targetVersionNum} to development environment for ongoing editing and experimentation.
                    </div>
                  </div>
                </div>

                {/* Staging Option */}
                <div
                  onClick={() => setDeployType("staging")}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                    deployType === "staging"
                      ? "bg-amber-50/80 border-amber-400 text-amber-950"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <GitBranch className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-xs space-y-0.5">
                    <div className="font-semibold text-slate-900">Move to Staging</div>
                    <div className="text-slate-500">
                      Promotes v{targetVersionNum} to staging environment without receiving production traffic.
                    </div>
                  </div>
                </div>

                {/* Canary Option */}
                <div
                  onClick={() => setDeployType("canary")}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                    deployType === "canary"
                      ? "bg-indigo-50/80 border-indigo-400 text-indigo-950"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <Flame className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div className="text-xs space-y-0.5">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      Canary Deployment <span className="text-[11px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-mono font-semibold">Recommended</span>
                    </div>
                    <div className="text-slate-500">
                      Gradually shift production traffic (5% → 25% → 50% → 100%) with automated error rate health monitoring and instant rollback.
                    </div>
                  </div>
                </div>

                {/* Direct Option */}
                <div
                  onClick={() => setDeployType("direct")}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                    deployType === "direct"
                      ? "bg-emerald-50/80 border-emerald-400 text-emerald-950"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="text-xs space-y-0.5">
                    <div className="font-semibold text-slate-900">Direct Production Swap</div>
                    <div className="text-slate-500">
                      Atomically promotes v{targetVersionNum} to production immediately. Existing production version (v{prodVersionNum}) becomes staging.
                    </div>
                  </div>
                </div>
              </div>

              {/* Canary Parameters Config */}
              {deployType === "canary" && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-800">
                    Canary Health Parameters
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Min Requests Before Eval
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={minRequests}
                        onChange={(e) => setMinRequests(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-300 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Max Error Threshold (%)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={errorThreshold}
                        onChange={(e) => setErrorThreshold(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-300 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            {!isTargetAlreadyProd && (
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
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
