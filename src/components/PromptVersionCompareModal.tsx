import React, { useState, useEffect } from "react";
import {
  X,
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Play,
} from "lucide-react";
import { buttonClass, inputClass, selectClass } from "@/components/ui";
import {
  promptService,
  PromptItem,
  PromptVersion,
} from "@/services/prompts";

interface PromptVersionCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  prompt: PromptItem;
  onOpenPlayground?: (prompt: PromptItem, versionNum?: number) => void;
}

export const PromptVersionCompareModal: React.FC<PromptVersionCompareModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  prompt,
  onOpenPlayground,
}) => {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [v1Number, setV1Number] = useState<number>(1);
  const [v2Number, setV2Number] = useState<number>(prompt.version);
  const [compareData, setCompareData] = useState<{
    v1: PromptVersion;
    v2: PromptVersion;
    hashMatch: boolean;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<
    "side-by-side" | "unified-diff" | "variables" | "model-config" | "test-exec"
  >("side-by-side");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [testVars, setTestVars] = useState<Record<string, string>>({});
  const [executedOutput, setExecutedOutput] = useState<string>("");

  useEffect(() => {
    if (isOpen && prompt) {
      loadVersions();
    }
  }, [isOpen, prompt]);

  const loadVersions = async () => {
    try {
      setIsLoading(true);
      const list = await promptService.getPromptVersions(workspaceId, prompt._id);
      setVersions(list);
      if (list.length >= 2) {
        setV1Number(list[list.length - 1].version);
        setV2Number(list[0].version);
        fetchCompare(list[list.length - 1].version, list[0].version);
      } else if (list.length === 1) {
        setV1Number(list[0].version);
        setV2Number(list[0].version);
        fetchCompare(list[0].version, list[0].version);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompare = async (v1: number, v2: number) => {
    try {
      setIsLoading(true);
      const res = await promptService.comparePromptVersions(
        workspaceId,
        prompt._id,
        v1,
        v2,
      );
      setCompareData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectV1 = (v: number) => {
    setV1Number(v);
    fetchCompare(v, v2Number);
  };

  const handleSelectV2 = (v: number) => {
    setV2Number(v);
    fetchCompare(v1Number, v);
  };

  if (!isOpen) return null;

  const renderUnifiedDiff = (str1: string, str2: string) => {
    const lines1 = str1.split("\n");
    const lines2 = str2.split("\n");
    const maxLen = Math.max(lines1.length, lines2.length);
    const diffRows = [];

    for (let i = 0; i < maxLen; i++) {
      const l1 = lines1[i] ?? "";
      const l2 = lines2[i] ?? "";
      if (l1 === l2) {
        diffRows.push(
          <div key={i} className="whitespace-pre-wrap break-words px-4 py-0.5 font-mono text-xs text-slate-500">
            {l1}
          </div>,
        );
      } else {
        if (l1) {
          diffRows.push(
            <div key={`del-${i}`} className="whitespace-pre-wrap break-words border-l-2 border-red-500 bg-red-50 px-4 py-0.5 font-mono text-xs text-red-800">
              - {l1}
            </div>,
          );
        }
        if (l2) {
          diffRows.push(
            <div key={`add-${i}`} className="whitespace-pre-wrap break-words border-l-2 border-emerald-500 bg-emerald-50 px-4 py-0.5 font-mono text-xs text-emerald-800">
              + {l2}
            </div>,
          );
        }
      }
    }
    return diffRows;
  };

  const runTestPreview = () => {
    if (!compareData) return;
    let template = compareData.v2.body || "";
    for (const [key, val] of Object.entries(testVars)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
      template = template.replace(regex, val || `[${key}]`);
    }
    setExecutedOutput(template);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden text-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 sm:flex">
              <GitCompare className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0">
              <h2 className="m-0 text-base font-semibold text-slate-900">
                5-Tab Version Compare — {prompt.name}
              </h2>
              <p className="m-0 mt-0.5 text-[13px] text-slate-500">
                Compare immutable SHA-256 content hashes, variables, and multi-role prompt structures.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Version Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700">Base Version (v1):</span>
              <select
                value={v1Number}
                onChange={(e) => handleSelectV1(Number(e.target.value))}
                className={`${selectClass} h-8 w-auto font-mono text-xs`}
              >
                {versions.map((v) => (
                  <option key={v.version} value={v.version}>
                    v{v.version} ({new Date(v.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-slate-400">vs</span>

            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700">Candidate Version (v2):</span>
              <select
                value={v2Number}
                onChange={(e) => handleSelectV2(Number(e.target.value))}
                className={`${selectClass} h-8 w-auto font-mono text-xs`}
              >
                {versions.map((v) => (
                  <option key={v.version} value={v.version}>
                    v{v.version} ({new Date(v.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {compareData && (
            <div className="flex items-center gap-2">
              {compareData.hashMatch ? (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Canonical SHA-256 Match
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Content Hash Modified
                </span>
              )}
            </div>
          )}
        </div>

        {/* 5-Tab Navigation Header */}
        <div className="flex shrink-0 gap-5 overflow-x-auto border-b border-slate-200 px-4 text-sm font-medium hide-scrollbar sm:px-6">
          <button
            onClick={() => setActiveTab("side-by-side")}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 py-3 transition-colors ${
              activeTab === "side-by-side"
                ? "border-emerald-500 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            1. Side-by-Side
          </button>
          <button
            onClick={() => setActiveTab("unified-diff")}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 py-3 transition-colors ${
              activeTab === "unified-diff"
                ? "border-emerald-500 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            2. Unified Diff
          </button>
          <button
            onClick={() => setActiveTab("variables")}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 py-3 transition-colors ${
              activeTab === "variables"
                ? "border-emerald-500 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            3. Variables Schema
          </button>
          <button
            onClick={() => setActiveTab("model-config")}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 py-3 transition-colors ${
              activeTab === "model-config"
                ? "border-emerald-500 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            4. SHA-256 & Audit
          </button>
          <button
            onClick={() => setActiveTab("test-exec")}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 py-3 transition-colors ${
              activeTab === "test-exec"
                ? "border-emerald-500 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            5. Test Preview
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Loading version data...
            </div>
          ) : !compareData ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Select two versions to compare.
            </div>
          ) : (
            <>
              {/* TAB 1: SIDE-BY-SIDE */}
              {activeTab === "side-by-side" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 rounded-lg bg-slate-50/60 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 border-b border-slate-200 pb-2">
                      <span>v{compareData.v1.version} Prompt Body</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {compareData.v1.hash ? compareData.v1.hash.slice(0, 8) : "N/A"}
                      </span>
                    </div>
                    <pre className="font-mono text-xs text-slate-900 whitespace-pre-wrap leading-relaxed">
                      {compareData.v1.body}
                    </pre>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50/60 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-900 border-b border-slate-200 pb-2">
                      <span>v{compareData.v2.version} Prompt Body</span>
                      <span className="font-mono text-[11px] text-slate-600">
                        {compareData.v2.hash ? compareData.v2.hash.slice(0, 8) : "N/A"}
                      </span>
                    </div>
                    <pre className="font-mono text-xs text-slate-900 whitespace-pre-wrap leading-relaxed">
                      {compareData.v2.body}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 2: UNIFIED DIFF */}
              {activeTab === "unified-diff" && (
                <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
                  <div className="text-xs font-semibold text-slate-700 pb-2 border-b border-slate-200">
                    Line-by-Line Diff (v{compareData.v1.version} → v{compareData.v2.version})
                  </div>
                  <div className="py-2">
                    {renderUnifiedDiff(compareData.v1.body, compareData.v2.body)}
                  </div>
                </div>
              )}

              {/* TAB 3: VARIABLES SCHEMA */}
              {activeTab === "variables" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="p-4 rounded-lg bg-slate-50/60 border border-slate-200 space-y-3">
                    <h4 className="font-semibold text-slate-800 border-b border-slate-200 pb-2">
                      v{compareData.v1.version} Variables ({compareData.v1.variables?.length || 0})
                    </h4>
                    {(compareData.v1.variables || []).map((v) => (
                      <div key={v.name} className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono">
                        <span className="text-slate-900 font-semibold">{`{{${v.name}}}`}</span> ({v.type || "string"})
                        <p className="text-[11px] text-slate-600 mt-1 font-sans">{v.description || "No description"}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50/60 border border-slate-200 space-y-3">
                    <h4 className="font-semibold text-slate-900 border-b border-slate-200 pb-2">
                      v{compareData.v2.version} Variables ({compareData.v2.variables?.length || 0})
                    </h4>
                    {(compareData.v2.variables || []).map((v) => (
                      <div key={v.name} className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono">
                        <span className="text-slate-900 font-semibold">{`{{${v.name}}}`}</span> ({v.type || "string"})
                        <p className="text-[11px] text-slate-600 mt-1 font-sans">{v.description || "No description"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: MODEL CONFIG & SHA-256 AUDIT */}
              {activeTab === "model-config" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-lg bg-slate-50/60 border border-slate-200 space-y-3">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Canonical Version Hashes & Immutability Ledger
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="p-3 rounded-lg bg-white border border-slate-200">
                        <div className="text-slate-700 font-medium">v{compareData.v1.version} SHA-256 Hash</div>
                        <div className="font-mono text-emerald-700 font-semibold break-all text-[11px] mt-1">
                          {compareData.v1.hash || "Legacy unhashed version"}
                        </div>
                        <div className="text-slate-500 mt-2">
                          Changed by: {compareData.v1.changedBy?.name || "System"} on{" "}
                          {new Date(compareData.v1.createdAt).toLocaleString()}
                        </div>
                        <div className="text-slate-600 italic mt-1">{compareData.v1.changeNote || "Initial creation"}</div>
                      </div>

                      <div className="p-3 rounded-lg bg-white border border-slate-200">
                        <div className="text-slate-800 font-medium">v{compareData.v2.version} SHA-256 Hash</div>
                        <div className="font-mono text-slate-900 font-semibold break-all text-[11px] mt-1">
                          {compareData.v2.hash || "Legacy unhashed version"}
                        </div>
                        <div className="text-slate-500 mt-2">
                          Changed by: {compareData.v2.changedBy?.name || "System"} on{" "}
                          {new Date(compareData.v2.createdAt).toLocaleString()}
                        </div>
                        <div className="text-slate-600 italic mt-1">{compareData.v2.changeNote || "Updated version"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: TEST PREVIEW */}
              {activeTab === "test-exec" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-lg bg-slate-50/60 border border-slate-200 space-y-3">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Play className="w-4 h-4 text-slate-800" />
                      Test Execution Preview (v{compareData.v2.version})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-3">
                        <span className="text-slate-700 font-semibold">Populate Test Variables:</span>
                        {(compareData.v2.variables || []).map((v) => (
                          <div key={v.name}>
                            <label className="block text-[11px] font-mono text-slate-900 font-semibold mb-1">
                              {`{{${v.name}}}`}
                            </label>
                            <input
                              type="text"
                              value={testVars[v.name] || ""}
                              onChange={(e) =>
                                setTestVars({ ...testVars, [v.name]: e.target.value })
                              }
                              placeholder={v.defaultValue || `Enter ${v.name}...`}
                              className={`${inputClass} h-8 font-mono text-xs`}
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={runTestPreview}
                          className={buttonClass("primary", "sm", "mt-2")}
                        >
                          <Play className="w-3.5 h-3.5" /> Render Template Preview
                        </button>
                      </div>

                      <div className="space-y-2">
                        <span className="text-slate-700 font-semibold">Rendered Output:</span>
                        <div className="p-3 rounded-lg bg-white border border-slate-200 font-mono text-slate-900 min-h-[160px] whitespace-pre-wrap">
                          {executedOutput || "Click 'Render Template Preview' to inspect resolved prompt..."}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 sm:px-6">
          <div>
            {onOpenPlayground && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPlayground(prompt, v2Number);
                }}
                className={buttonClass("primary", "sm")}
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Open v{v2Number} in Playground
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={buttonClass("secondary", "sm")}
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
