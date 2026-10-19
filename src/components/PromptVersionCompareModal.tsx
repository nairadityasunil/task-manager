import React, { useState, useEffect } from "react";
import {
  X,
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Play,
} from "lucide-react";
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
          <div key={i} className="text-slate-400 px-4 py-0.5 font-mono text-xs">
            {l1}
          </div>,
        );
      } else {
        if (l1) {
          diffRows.push(
            <div key={`del-${i}`} className="bg-rose-500/10 text-rose-300 px-4 py-0.5 font-mono text-xs border-l-2 border-rose-500">
              - {l1}
            </div>,
          );
        }
        if (l2) {
          diffRows.push(
            <div key={`add-${i}`} className="bg-emerald-500/10 text-emerald-300 px-4 py-0.5 font-mono text-xs border-l-2 border-emerald-500">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden text-slate-950">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                5-Tab Version Compare — {prompt.name}
              </h2>
              <p className="text-xs text-slate-600">
                Compare immutable SHA-256 content hashes, variables, and multi-role prompt structures.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-950 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Version Selector Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold">Base Version (v1):</span>
              <select
                value={v1Number}
                onChange={(e) => handleSelectV1(Number(e.target.value))}
                className="bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-1 font-mono focus:outline-none"
              >
                {versions.map((v) => (
                  <option key={v.version} value={v.version}>
                    v{v.version} ({new Date(v.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-slate-400 font-semibold">vs</span>

            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold">Candidate Version (v2):</span>
              <select
                value={v2Number}
                onChange={(e) => handleSelectV2(Number(e.target.value))}
                className="bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-1 font-mono focus:outline-none"
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
            <div className="flex items-center gap-2 text-xs">
              {compareData.hashMatch ? (
                <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Canonical SHA-256 Match
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-mono">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Content Hash Modified
                </span>
              )}
            </div>
          )}
        </div>

        {/* 5-Tab Navigation Header */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("side-by-side")}
            className={`py-3 px-4 border-b-2 transition ${
              activeTab === "side-by-side"
                ? "border-slate-900 text-slate-950 font-semibold"
                : "border-transparent text-slate-600 hover:text-slate-950"
            }`}
          >
            1. Side-by-Side
          </button>
          <button
            onClick={() => setActiveTab("unified-diff")}
            className={`py-3 px-4 border-b-2 transition ${
              activeTab === "unified-diff"
                ? "border-slate-900 text-slate-950 font-semibold"
                : "border-transparent text-slate-600 hover:text-slate-950"
            }`}
          >
            2. Unified Diff
          </button>
          <button
            onClick={() => setActiveTab("variables")}
            className={`py-3 px-4 border-b-2 transition ${
              activeTab === "variables"
                ? "border-slate-900 text-slate-950 font-semibold"
                : "border-transparent text-slate-600 hover:text-slate-950"
            }`}
          >
            3. Variables Schema
          </button>
          <button
            onClick={() => setActiveTab("model-config")}
            className={`py-3 px-4 border-b-2 transition ${
              activeTab === "model-config"
                ? "border-slate-900 text-slate-950 font-semibold"
                : "border-transparent text-slate-600 hover:text-slate-950"
            }`}
          >
            4. SHA-256 & Audit
          </button>
          <button
            onClick={() => setActiveTab("test-exec")}
            className={`py-3 px-4 border-b-2 transition ${
              activeTab === "test-exec"
                ? "border-slate-900 text-slate-950 font-semibold"
                : "border-transparent text-slate-600 hover:text-slate-950"
            }`}
          >
            5. Test Preview
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
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
                  <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200 space-y-3">
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

                  <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200 space-y-3">
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
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
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
                  <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200 space-y-3">
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

                  <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200 space-y-3">
                    <h4 className="font-semibold text-slate-950 border-b border-slate-200 pb-2">
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
                  <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200 space-y-3">
                    <h4 className="font-semibold text-slate-950 flex items-center gap-2">
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
                        <div className="font-mono text-slate-950 font-semibold break-all text-[11px] mt-1">
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
                  <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200 space-y-3">
                    <h4 className="font-semibold text-slate-950 flex items-center gap-2">
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
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-950 font-mono focus:outline-none focus:border-slate-400"
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={runTestPreview}
                          className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-black transition flex items-center gap-2 mt-2"
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
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/70">
          <div>
            {onOpenPlayground && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPlayground(prompt, v2Number);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 text-emerald-400 fill-current" /> Open v{v2Number} in Playground
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 text-sm font-semibold transition"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
