import React, { useState, useEffect } from "react";
import {
  centralizedAiService,
  AIProjectPlanResponse,
  AIPlanModificationResponse,
  WorkspaceSessionItem,
} from "@/services/centralizedAi";
import {
  Sparkles,
  Check,
  X,
  Plus,
  Edit3,
  BookOpen,
  MessageSquare,
  History,
  Copy,
  AlertCircle,
  FolderPlus,
  Trash2,
  Loader2,
} from "lucide-react";
import { Badge, Button, buttonClass, cn, Field, inputClass, selectClass, textareaClass } from "@/components/ui";

interface PlanningSessionItem {
  id: string;
  title: string;
  createdAt: string;
  plan?: AIProjectPlanResponse | null;
  messages?: Array<{ role: "user" | "ai"; content: string }>;
}

interface AiProjectPlanModalProps {
  isOpen: boolean;
  workspaceId?: string;
  onClose: () => void;
  onProjectCreated: (project: unknown) => void;
}

export const AiProjectPlanModal: React.FC<AiProjectPlanModalProps> = ({
  isOpen,
  workspaceId,
  onClose,
  onProjectCreated,
}) => {
  // Session History State
  const [sessions, setSessions] = useState<PlanningSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Conversation Stream State
  const [, setChatMessages] = useState<
    Array<{ role: "user" | "ai"; content: string; plan?: AIProjectPlanResponse; delta?: Record<string, unknown> }>
  >([]);
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [modifying, setModifying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [error, setError] = useState("");

  const [generatedPlan, setGeneratedPlan] = useState<AIProjectPlanResponse | null>(null);
  const [changeRequest, setChangeRequest] = useState("");
  const [lastDelta, setLastDelta] = useState<AIPlanModificationResponse["delta"] | null>(null);

  // Tabs: 'chat' | 'artifacts'
  const [activeMainTab, setActiveMainTab] = useState<"chat" | "artifacts">("chat");
  const [activeBlueprintSubTab, setActiveBlueprintSubTab] = useState<"blueprint" | "features" | "risks" | "timeline">("blueprint");

  // Selected Artifact State
  const [selectedArtifactType, setSelectedArtifactType] = useState<"project_plan" | "prd" | "tech_spec" | "timeline" | "risks">("project_plan");

  // Saved Workspace Artifacts
  const [savedWorkspacePlans, setSavedWorkspacePlans] = useState<Record<string, unknown>[]>([]);
  const [copiedText, setCopiedText] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Model Selector State
  const [selectedProvider, setSelectedProvider] = useState<"gemini" | "openai" | "anthropic">("gemini");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.6-flash");

  useEffect(() => {
    if (isOpen) {
      void loadSessionsAndWorkspacePlans();
    }
  }, [isOpen, workspaceId]);

  const loadSessionsAndWorkspacePlans = async () => {
    try {
      const [historySessions, plans] = await Promise.all([
        centralizedAiService.listWorkspaceSessions(workspaceId),
        centralizedAiService.listWorkspacePlans(workspaceId),
      ]);
      setSavedWorkspacePlans(plans);

      if (historySessions && historySessions.length > 0) {
        const formattedSessions = historySessions.map((s: WorkspaceSessionItem) => ({
          id: s.id,
          title: s.title || "Planning Session",
          createdAt: s.createdAt ? new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent",
        }));
        setSessions(formattedSessions);
        // Load the most recent session
        void handleSelectSession(formattedSessions[0]);
      } else {
        // Only if user has zero sessions, create the initial session
        void startNewSession();
      }
    } catch (err) {
      console.error("Failed to load workspace AI sessions/plans", err);
    }
  };

  const startNewSession = async () => {
    const defaultTitle = "New Planning Session";
    setError("");

    try {
      const backendSession = await centralizedAiService.createWorkspaceSession(workspaceId, defaultTitle);
      if (backendSession && backendSession.id) {
        const newSessItem: PlanningSessionItem = {
          id: backendSession.id,
          title: backendSession.title || defaultTitle,
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setSessions((prev) => [newSessItem, ...prev.filter((s) => s.id !== backendSession.id)]);
        setActiveSessionId(backendSession.id);
        setChatMessages([]);
        setGeneratedPlan(null);
        setLastDelta(null);
        setPrompt("");
        setContext("");
      }
    } catch (err) {
      console.warn("Failed to create new session", err);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await centralizedAiService.deleteWorkspaceSession(workspaceId, sessionId);
      const remaining = sessions.filter((s) => s.id !== sessionId);
      setSessions(remaining);

      if (activeSessionId === sessionId) {
        if (remaining.length > 0) {
          void handleSelectSession(remaining[0]);
        } else {
          void startNewSession();
        }
      }
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const handleSelectSession = async (sess: PlanningSessionItem) => {
    setActiveSessionId(sess.id);
    setError("");
    try {
      const detail = await centralizedAiService.getWorkspaceSession(workspaceId, sess.id);
      if (detail && detail.messages && detail.messages.length > 0) {
        setChatMessages(
          detail.messages.map((m: { role: string; content: string; metadata?: { plan?: AIProjectPlanResponse; delta?: AIPlanModificationResponse["delta"] } }) => ({
            role: m.role === "USER" ? "user" : "ai",
            content: m.content,
            plan: m.metadata?.plan,
            delta: m.metadata?.delta,
          })),
        );
      } else {
        setChatMessages([]);
      }

      if (detail && detail.drafts && detail.drafts.length > 0) {
        const latestDraft = detail.drafts[0];
        if (latestDraft.plan) {
          setGeneratedPlan(latestDraft.plan);
        }
      } else {
        setGeneratedPlan(null);
      }
    } catch (err) {
      console.error("Failed to fetch session detail", err);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");

    const userMsg = prompt;
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);

    try {
      const plan = await centralizedAiService.generateProjectPlan(
        prompt,
        context,
        activeSessionId,
        workspaceId,
        selectedProvider,
        selectedModel,
      );
      setGeneratedPlan(plan);
      setLastDelta(null);

      // Auto-title session
      const title = plan.name || prompt.slice(0, 32);
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, title, plan } : s)),
      );

      setChatMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: `Generated complete technical implementation blueprint for **${plan.name}**. System goal: ${plan.systemGoal || plan.description}`,
          plan,
        },
      ]);
      setPrompt("");
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } }; message?: string };
      setError(errorObj.response?.data?.error || errorObj.message || "Failed to generate project plan");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatedPlan || !changeRequest.trim()) return;
    setModifying(true);
    setError("");

    const reqMsg = changeRequest;
    setChatMessages((prev) => [...prev, { role: "user", content: `Change Request: ${reqMsg}` }]);

    try {
      const result = await centralizedAiService.modifyProjectPlan(
        generatedPlan,
        changeRequest,
        activeSessionId,
        workspaceId,
        selectedProvider,
        selectedModel,
      );
      setGeneratedPlan(result.updatedPlan);
      setLastDelta(result.delta);

      setChatMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: `Plan updated cleanly: ${result.delta.summary}`,
          plan: result.updatedPlan,
          delta: result.delta,
        },
      ]);
      setChangeRequest("");
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } }; message?: string };
      setError(errorObj.response?.data?.error || errorObj.message || "Failed to update project plan");
    } finally {
      setModifying(false);
    }
  };

  const handleConfirmPlanExecution = async () => {
    if (!generatedPlan) return;
    setConfirming(true);
    setError("");
    try {
      const project = await centralizedAiService.confirmProjectPlan(workspaceId || null, generatedPlan);
      setShowApprovalDialog(false);
      onProjectCreated(project);
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } }; message?: string };
      setError(errorObj.response?.data?.error || errorObj.message || "Failed to materialize project");
    } finally {
      setConfirming(false);
    }
  };

  const copyArtifactToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  if (!isOpen) return null;

  const subTabCls = (active: boolean) =>
    cn(
      "-mb-px shrink-0 border-b-2 pb-2.5 pt-1 text-sm font-medium capitalize transition-colors",
      active ? "border-emerald-500 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
    );
  const sectionLabel = "text-[13px] font-medium text-slate-500";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-slate-900/40 p-3 backdrop-blur-sm sm:p-4">
      <div className="relative flex h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl animate-modalIn sm:h-[90vh]">
        {/* Mobile history backdrop */}
        {showHistory && (
          <div className="absolute inset-0 z-20 bg-slate-900/20 md:hidden" onClick={() => setShowHistory(false)} />
        )}

        {/* Left History Sidebar */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 z-30 flex w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-slate-50 p-3 transition-transform md:static md:translate-x-0",
            showHistory ? "translate-x-0 shadow-xl" : "-translate-x-full"
          )}
        >
          <div className="flex-1 space-y-3 overflow-y-auto pr-0.5">
            <div className="flex items-center justify-between px-1 pt-1">
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700">
                <History className="h-4 w-4 text-slate-400" />
                <span>Conversation History</span>
              </span>
              <button
                aria-label="Close history"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/60 md:hidden"
                onClick={() => setShowHistory(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* New Chat Button */}
            <button
              onClick={() => {
                void startNewSession();
                setShowHistory(false);
              }}
              className={buttonClass("secondary", "sm", "w-full")}
              type="button"
            >
              <Plus className="h-4 w-4" />
              <span>+ New Planning Chat</span>
            </button>

            {/* Sessions List */}
            <div className="space-y-0.5 pt-1">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  onClick={() => {
                    void handleSelectSession(sess);
                    setShowHistory(false);
                  }}
                  className={cn(
                    "group flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors",
                    sess.id === activeSessionId ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                  )}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="truncate font-medium">{sess.title}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{sess.createdAt}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSession(e, sess.id)}
                    title="Delete Session"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-1 pt-3 text-xs text-slate-500">
            <span>Workspace AI Planner</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          </div>
        </div>

        {/* Right Main Content */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
          {/* Header & Main Tabs */}
          <div className="shrink-0 border-b border-slate-200 px-4 pt-4 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  aria-label="Conversation History"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 md:hidden"
                  onClick={() => setShowHistory(true)}
                  type="button"
                >
                  <History className="h-4 w-4" />
                </button>
                <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 md:flex">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="m-0 text-[15px] font-semibold text-slate-900 sm:text-base">AI Project Architect & Master Planner</h3>
                  <p className="m-0 mt-0.5 hidden text-[13px] text-slate-500 sm:block">Transform high-level system ideas into reviewable blueprints & PRDs</p>
                </div>
              </div>

              <button aria-label="Close" onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900" type="button">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              {/* Main Tabs: Chat vs Artifacts */}
              <div className="flex gap-5 overflow-x-auto hide-scrollbar">
                <button
                  onClick={() => setActiveMainTab("chat")}
                  className={cn(subTabCls(activeMainTab === "chat"), "flex items-center gap-1.5 normal-case")}
                  type="button"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Planner Chat</span>
                </button>
                <button
                  onClick={() => setActiveMainTab("artifacts")}
                  className={cn(subTabCls(activeMainTab === "artifacts"), "flex items-center gap-1.5 normal-case")}
                  type="button"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Artifacts & PRDs ({generatedPlan ? 1 + savedWorkspacePlans.length : savedWorkspacePlans.length})</span>
                </button>
              </div>

              {/* Model Selector Dropdown */}
              <label className="mb-2 flex min-w-0 items-center gap-2 text-[13px] text-slate-500">
                <span className="hidden sm:inline">Model:</span>
                <select
                  value={`${selectedProvider}:${selectedModel}`}
                  onChange={(e) => {
                    const [p, m] = e.target.value.split(":");
                    setSelectedProvider(p as "gemini" | "openai" | "anthropic");
                    setSelectedModel(m);
                  }}
                  className={cn(selectClass, "h-8 w-auto max-w-[240px] cursor-pointer text-[13px]")}
                >
                  <option value="gemini:gemini-3.6-flash">✨ Google Gemini 3.6 Flash (Default)</option>
                  <option value="gemini:gemini-2.5-pro">🧠 Google Gemini 2.5 Pro</option>
                  <option value="openai:gpt-4o">🚀 OpenAI GPT-4o</option>
                  <option value="openai:gpt-4o-mini">⚡ OpenAI GPT-4o Mini</option>
                  <option value="anthropic:claude-3-5-sonnet">🎭 Anthropic Claude 3.5 Sonnet</option>
                </select>
              </label>
            </div>
          </div>

          {/* Main Body */}
          {activeMainTab === "chat" ? (
            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
              {error && (
                <div className="space-y-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-700">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{error}</span>
                  </div>
                  {(error.includes("429") || error.includes("quota") || error.includes("RESOURCE_EXHAUSTED")) && (
                    <div className="border-t border-red-200 pt-1.5 text-xs text-red-700/90">
                      <span>💡 Quota limit reached on {selectedModel}. Switch to another AI Model using the dropdown in the top header above!</span>
                    </div>
                  )}
                </div>
              )}

              {!generatedPlan ? (
                /* System Prompt Input */
                <form onSubmit={handleGenerate} className="mx-auto max-w-2xl space-y-5 pt-2 sm:pt-6">
                  <div className="mb-2 space-y-1.5 text-center">
                    <h4 className="m-0 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">Describe Your System or Product Idea</h4>
                    <p className="mx-auto m-0 max-w-lg text-[13px] leading-relaxed text-slate-500">Describe the basic workflow in simple language. The AI will decompose actors, system modules, feature specs, effort, and risks without writing source code.</p>
                  </div>

                  <Field label="High-Level System Requirement">
                    <textarea
                      rows={5}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g. I want to build a SaaS CRM where sales reps manage leads and opportunities, managers monitor team pipelines and metrics, and admins configure user permissions."
                      className={textareaClass}
                      required
                    />
                  </Field>

                  <Field label="Technical Stack / Constraints (Optional)">
                    <textarea
                      rows={2}
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      placeholder="e.g. Stack: Node, React, Mongoose. Target: Launch MVP in 6 weeks."
                      className={textareaClass}
                    />
                  </Field>

                  {loading && (
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2.5 text-sm font-medium text-slate-900">
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-500" />
                        <span>AI Architect is synthesizing your technical blueprint...</span>
                      </div>
                      <div className="space-y-1.5 text-[13px] text-slate-600">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-500" />
                          <span>Decomposing user workflows, actors, permissions, and core modules</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                          <span>Generating frontend, backend, database schema & API specifications</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                          <span>Estimating engineering effort, risk mitigations & milestone roadmap</span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">
                        Detailed production engineering blueprints take ~30–60 seconds to synthesize.
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <Button className="h-10 w-full" disabled={loading} icon={Sparkles} type="submit" variant="primary">
                      {loading ? "Synthesizing Architecture..." : "Synthesize Technical Plan & PRD"}
                    </Button>
                  </div>
                </form>
              ) : (
                /* Generated Plan Interactive Workspace */
                <div className="space-y-5">
                  {/* Top Action Ribbon */}
                  <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="m-0 text-[15px] font-semibold text-slate-900">{generatedPlan.name}</h4>
                        <Badge dot tone="success">Blueprint synthesized</Badge>
                      </div>
                      <p className="m-0 text-[13px] text-slate-500 line-clamp-1">{generatedPlan.description}</p>
                    </div>

                    <Button className="shrink-0" icon={FolderPlus} onClick={() => setShowApprovalDialog(true)} variant="accent">
                      Materialize Project Structure
                    </Button>
                  </div>

                  {/* Delta Notification Callout */}
                  {lastDelta && (
                    <div className="space-y-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-[13px]">
                      <div className="flex items-center gap-1.5 font-medium text-emerald-800">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>Modification Applied cleanly:</span>
                      </div>
                      <p className="m-0 text-emerald-800/80">{lastDelta.summary}</p>
                    </div>
                  )}

                  {/* Sub-Tabs for Blueprint Sections */}
                  <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-slate-200">
                    <div className="flex gap-5 overflow-x-auto hide-scrollbar">
                      {(["blueprint", "features", "risks", "timeline"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveBlueprintSubTab(tab)}
                          className={subTabCls(activeBlueprintSubTab === tab)}
                          type="button"
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    <span className="pb-2.5 text-xs text-slate-500">
                      Estimated Timeline: {generatedPlan.timeline?.estimatedCalendarWeeks || 4} Weeks
                    </span>
                  </div>

                  {/* Sub-Tab Content Views */}
                  {activeBlueprintSubTab === "blueprint" && (
                    <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                      <div className="space-y-1.5 rounded-xl border border-slate-200 p-4">
                        <h5 className={cn(sectionLabel, "m-0")}>System Goal</h5>
                        <p className="m-0 leading-relaxed text-slate-700">{generatedPlan.systemGoal || generatedPlan.description}</p>
                      </div>

                      <div className="space-y-1.5 rounded-xl border border-slate-200 p-4">
                        <h5 className={cn(sectionLabel, "m-0")}>Target Tech Stack</h5>
                        <p className="m-0 leading-relaxed text-slate-700">{generatedPlan.recommendedStack || "React, Node.js, TypeScript, PostgreSQL"}</p>
                      </div>

                      <div className="space-y-2 rounded-xl border border-slate-200 p-4 md:col-span-2">
                        <h5 className={cn(sectionLabel, "m-0")}>System Modules & Epic Specs</h5>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {generatedPlan.modules?.map((m, idx) => (
                            <div key={idx} className="space-y-1 rounded-lg bg-slate-50 p-3">
                              <div className="font-medium text-slate-900">{m.name}</div>
                              <div className="text-[13px] text-slate-600">{m.description}</div>
                              {m.features && (
                                <div className="pt-1 text-xs text-slate-500">
                                  Features: {m.features.join(", ")}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeBlueprintSubTab === "features" && (
                    <div className="space-y-2 text-sm">
                      <h5 className={cn(sectionLabel, "m-0")}>Synthesized User Tasks & Work Breakdown</h5>
                      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                        {generatedPlan.tasks?.map((t, idx) => (
                          <div key={idx} className="flex items-start justify-between gap-3 px-4 py-3">
                            <div className="min-w-0 space-y-0.5">
                              <span className="font-medium text-slate-900">{t.title}</span>
                              <p className="m-0 text-[13px] text-slate-500">{t.description}</p>
                            </div>
                            <Badge className="tabular-nums">{t.estimatedHours || 4}h</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeBlueprintSubTab === "risks" && (
                    <div className="space-y-2 text-sm">
                      <h5 className={cn(sectionLabel, "m-0")}>Engineering Risk Assessment</h5>
                      <div className="grid grid-cols-1 gap-2">
                        {generatedPlan.risks?.map((r, idx) => (
                          <div key={idx} className="space-y-1 rounded-xl border border-slate-200 p-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <span className="font-medium text-slate-900">{r.title}</span>
                              <Badge dot tone={String(r.severity || "MEDIUM").toUpperCase() === "HIGH" || String(r.severity).toUpperCase() === "CRITICAL" ? "danger" : String(r.severity || "MEDIUM").toUpperCase() === "LOW" ? "neutral" : "warning"}>
                                {r.severity || "MEDIUM"}
                              </Badge>
                            </div>
                            <p className="m-0 text-[13px] text-slate-500">Mitigation: {r.mitigation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeBlueprintSubTab === "timeline" && (
                    <div className="space-y-2 rounded-xl border border-slate-200 p-4 text-sm">
                      <h5 className={cn(sectionLabel, "m-0")}>Execution Timeline & Milestones</h5>
                      <div className="space-y-2 text-slate-700">
                        <div>Estimated Engineering Duration: <span className="font-semibold text-slate-900">{generatedPlan.timeline?.estimatedCalendarWeeks || 4} Weeks</span></div>
                        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                          {generatedPlan.timeline?.milestones?.map((m, idx) => (
                            <div key={idx} className="flex justify-between gap-3 px-3 py-2">
                              <span className="font-medium text-slate-900">{m.name}</span>
                              <span className="shrink-0 tabular-nums text-slate-500">{m.targetWeek}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Refinement Change Request Input */}
                  <form onSubmit={handleApplyChangeRequest} className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                        <Edit3 className="h-4 w-4 text-slate-400" />
                        <span>Refine / Modify Blueprint</span>
                      </label>
                      <span className="text-xs text-slate-500">Ask the AI to add modules, tweak tech stack, adjust effort</span>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={changeRequest}
                        onChange={(e) => setChangeRequest(e.target.value)}
                        placeholder="e.g. Add a Stripe Payment Integration module and increase high availability effort"
                        className={cn(inputClass, "flex-1")}
                      />
                      <Button disabled={modifying || !changeRequest.trim()} loading={modifying} type="submit" variant="primary">
                        {modifying ? "Updating..." : "Apply Edit"}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ) : (
            /* Artifacts Tab View */
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 hide-scrollbar">
                  {(["project_plan", "prd", "tech_spec", "timeline", "risks"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedArtifactType(type)}
                      className={cn(
                        "shrink-0 rounded-md px-2.5 py-1 text-[13px] font-medium capitalize transition-colors",
                        selectedArtifactType === type ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      )}
                      type="button"
                    >
                      {type === "prd" ? "PRD" : type.replace("_", " ")}
                    </button>
                  ))}
                </div>

                {generatedPlan && (
                  <Button icon={copiedText ? Check : Copy} onClick={() => copyArtifactToClipboard(JSON.stringify(generatedPlan, null, 2))} size="sm" variant="secondary">
                    {copiedText ? "Copied JSON!" : "Copy JSON Schema"}
                  </Button>
                )}
              </div>

              {generatedPlan ? (
                <div className="max-h-[60vh] overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] text-slate-700">
                  <div className="space-y-4">
                    {selectedArtifactType === "project_plan" && (
                      <pre className="whitespace-pre-wrap font-sans">
                        # Product Blueprint: {generatedPlan.name}
                        {"\n\n"}
                        ## System Description
                        {generatedPlan.description}
                        {"\n\n"}
                        ## Core Goals
                        {generatedPlan.systemGoal}
                        {"\n\n"}
                        ## Modules
                        {generatedPlan.modules?.map((m) => `- **${m.name}**: ${m.description}`).join("\n")}
                      </pre>
                    )}

                    {selectedArtifactType === "prd" && (
                      <pre className="whitespace-pre-wrap font-sans">
                        # Product Requirements Document (PRD)
                        {"\n"}
                        Product Name: {generatedPlan.name}
                        {"\n\n"}
                        1. Executive Summary
                        {generatedPlan.description}
                        {"\n\n"}
                        2. Target Tech Stack
                        {generatedPlan.recommendedStack}
                        {"\n\n"}
                        3. Functional Specs
                        {generatedPlan.modules?.map((m) => `### ${m.name}\n${m.description}`).join("\n\n")}
                      </pre>
                    )}

                    {selectedArtifactType === "tech_spec" && (
                      <pre className="whitespace-pre-wrap font-sans">
                        # Engineering Technical Specification
                        {"\n"}
                        Architecture & Architecture Strategy
                        {"\n\n"}
                        ## Recommended Stack
                        {generatedPlan.recommendedStack}
                        {"\n\n"}
                        ## Task Decomposition ({generatedPlan.tasks?.length || 0} Tasks)
                        {generatedPlan.tasks?.map((t) => `* [${t.estimatedHours || 4}h] ${t.title}: ${t.description}`).join("\n")}
                      </pre>
                    )}

                    {selectedArtifactType === "timeline" && (
                      <pre className="whitespace-pre-wrap font-sans">
                        # Implementation Roadmap
                        {"\n"}
                        Estimated Duration: {generatedPlan.timeline?.estimatedCalendarWeeks || 4} Weeks
                        {"\n\n"}
                        Milestones:
                        {generatedPlan.timeline?.milestones?.map((m) => `- [${m.targetWeek}] ${m.name}`).join("\n")}
                      </pre>
                    )}

                    {selectedArtifactType === "risks" && (
                      <pre className="whitespace-pre-wrap font-sans">
                        # Risk Assessment Matrix
                        {"\n\n"}
                        {generatedPlan.risks?.map((r) => `[${r.severity}] ${r.title}\nMitigation: ${r.mitigation}`).join("\n\n")}
                      </pre>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center">
                  <BookOpen className="mb-3 h-5 w-5 text-slate-400" />
                  <p className="m-0 max-w-sm text-[13px] text-slate-500">
                    No active artifact generated for this conversation yet. Enter your system prompt in the Planner Chat tab to generate artifacts.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Explicit Approval Safety Confirmation Modal */}
      {showApprovalDialog && generatedPlan && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/40 p-3 sm:p-4">
          <div className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600">
                <FolderPlus className="h-5 w-5" />
              </div>
              <div>
                <h4 className="m-0 text-base font-semibold text-slate-900">Approve & Create Project</h4>
                <p className="m-0 text-[13px] text-slate-500">Confirm project materialization from approved plan</p>
              </div>
            </div>

            <dl className="m-0 divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
              <div className="flex justify-between gap-3 px-3.5 py-2.5">
                <dt className="text-slate-500">Project Name:</dt>
                <dd className="m-0 text-right font-medium text-slate-900">{generatedPlan.name}</dd>
              </div>
              <div className="flex justify-between gap-3 px-3.5 py-2.5">
                <dt className="text-slate-500">Modules & Epics:</dt>
                <dd className="m-0 font-medium text-slate-900">{generatedPlan.modules?.length || 0} Modules</dd>
              </div>
              <div className="flex justify-between gap-3 px-3.5 py-2.5">
                <dt className="text-slate-500">Tasks & Subtasks:</dt>
                <dd className="m-0 font-medium text-slate-900">{generatedPlan.tasks?.length || 0} Tasks</dd>
              </div>
              <div className="flex justify-between gap-3 px-3.5 py-2.5">
                <dt className="text-slate-500">Estimated Duration:</dt>
                <dd className="m-0 font-medium text-slate-900">~{generatedPlan.timeline?.estimatedCalendarWeeks || 4} Weeks</dd>
              </div>
            </dl>

            <p className="m-0 text-[13px] leading-relaxed text-slate-500">
              Clicking Confirm will create the Project, Custom Workflow States, Epics, Tasks, Subtasks, Dependencies, and canonical PRD Document.
            </p>

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button onClick={() => setShowApprovalDialog(false)} variant="secondary">
                Cancel
              </Button>
              <Button disabled={confirming} icon={Check} loading={confirming} onClick={handleConfirmPlanExecution} variant="accent">
                {confirming ? "Creating Project..." : "Confirm & Create"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiProjectPlanModal;
