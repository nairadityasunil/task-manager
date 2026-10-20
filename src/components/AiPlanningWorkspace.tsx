import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, FileText, Loader2, Plus, Send, Sparkles, XCircle, Bot, Shield } from 'lucide-react';

import type { Project } from '@/types/project';
import type { AiPlanningContext, AiPlanningDraft, AiPlanningWorkspace, ProjectAiConfig } from '@/types/aiPlanning';
import {
  approveAiPlanningDraft,
  createAiPlanningSession,
  generateAiPlanningDraft,
  getAiPlanningContext,
  getAiPlanningSession,
  listAiPlanningSessions,
  rejectAiPlanningDraft,
  sendAiPlanningMessage,
  getProjectAiConfig,
  updateProjectAiConfig
} from '@/services/aiPlanning';
import { toDisplayErrorMessage } from '@/utils/apiError';
import { useAuth } from '@/context/AuthContext';

const PROVIDER_PRESETS = {
  openai: {
    models: ['GPT-5', 'GPT-5 Mini']
  },
  anthropic: {
    models: ['Claude Sonnet', 'Claude Opus']
  },
  gemini: {
    models: ['Gemini 3.6 Flash', 'Gemini 1.5 Flash', 'Gemini 1.5 Pro']
  }
};

type ProviderKey = keyof typeof PROVIDER_PRESETS;

interface AiPlanningWorkspaceProps {
  project: Project;
  onArtifactsCreated: () => void;
  onGoToSettings?: () => void;
}

function AiPlanningWorkspacePanel({ project, onArtifactsCreated, onGoToSettings }: AiPlanningWorkspaceProps): JSX.Element {
  const { user } = useAuth();
  const [context, setContext] = useState<AiPlanningContext | null>(null);
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof listAiPlanningSessions>>>([]);
  const [workspace, setWorkspace] = useState<AiPlanningWorkspace | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<ProjectAiConfig | null>(null);
  const [updatingModel, setUpdatingModel] = useState(false);

  const loadSession = useCallback(async (sessionId: string) => {
    setWorkspace(await getAiPlanningSession(project.id, sessionId));
  }, [project.id]);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextContext, nextSessions, config] = await Promise.all([
        getAiPlanningContext(project.id),
        listAiPlanningSessions(project.id),
        getProjectAiConfig(project.id)
      ]);
      setContext(nextContext);
      setAiConfig(config);
      if (nextSessions.length === 0) {
        const created = await createAiPlanningSession(project.id);
        setSessions([created]);
        await loadSession(created.id);
      } else {
        setSessions(nextSessions);
        await loadSession(nextSessions[0].id);
      }
    } catch (requestError) {
      setError(toDisplayErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [loadSession, project.id]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const refreshSession = async (): Promise<void> => {
    if (workspace) {
      await loadSession(workspace.session.id);
    }
  };

  const handleNewSession = async (): Promise<void> => {
    setLoading(true);
    try {
      const session = await createAiPlanningSession(project.id);
      setSessions((current) => [session, ...current]);
      await loadSession(session.id);
    } catch (requestError) {
      setError(toDisplayErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (): Promise<void> => {
    if (!workspace || !message.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await sendAiPlanningMessage(project.id, workspace.session.id, message);
      setMessage('');
      await refreshSession();
    } catch (requestError) {
      setError(toDisplayErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDraft = async (): Promise<void> => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    try {
      await generateAiPlanningDraft(project.id, workspace.session.id);
      await refreshSession();
    } catch (requestError) {
      setError(toDisplayErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (draft: AiPlanningDraft): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await approveAiPlanningDraft(project.id, draft.id);
      await Promise.all([refreshSession(), getAiPlanningContext(project.id).then(setContext)]);
      onArtifactsCreated();
    } catch (requestError) {
      setError(toDisplayErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (draft: AiPlanningDraft): Promise<void> => {
    const reason = window.prompt('Optional rejection reason');
    if (reason === null) return;
    setLoading(true);
    setError(null);
    try {
      await rejectAiPlanningDraft(project.id, draft.id, reason || undefined);
      await refreshSession();
    } catch (requestError) {
      setError(toDisplayErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = async (fields: Partial<ProjectAiConfig>) => {
    if (!aiConfig) return;
    setUpdatingModel(true);
    setError(null);
    try {
      const updatedFields = { ...fields };
      if (fields.provider && fields.provider !== aiConfig.provider) {
        const provider = fields.provider;
        const models = PROVIDER_PRESETS[provider as ProviderKey]?.models || [];
        updatedFields.modelName = models[0] || '';
      }
      const updated = await updateProjectAiConfig(project.id, {
        ...aiConfig,
        ...updatedFields,
        apiKey: '••••••••'
      });
      setAiConfig(updated);
    } catch (requestError) {
      setError(toDisplayErrorMessage(requestError));
    } finally {
      setUpdatingModel(false);
    }
  };

  const isAdmin = context?.project.currentUserRole === 'ADMIN';

  return (
    <div className="grid gap-5">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Milestones', context?.milestones.length ?? 0],
          ['Tasks', context?.tasks.length ?? 0],
          ['Notes', context?.notes.length ?? 0],
          ['Team', context?.team.length ?? 0]
        ].map(([label, value]) => (
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm" key={label}>
            <div className="text-[13px] text-slate-500">{label}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="m-0 text-[15px] font-semibold text-slate-900">Planning conversation</h3>
            <p className="m-0 mt-0.5 text-[13px] text-slate-500">AI asks scope questions. Draft stays review-only until admin approval.</p>
          </div>
          <div className="flex gap-2">
            <select
              className="h-9 max-w-[220px] rounded-lg border border-slate-300 bg-white pl-2.5 pr-8 text-[13px] shadow-sm"
              onChange={(event) => void loadSession(event.target.value)}
              value={workspace?.session.id ?? ''}
            >
              {sessions.map((session) => <option key={session.id} value={session.id}>{session.title}</option>)}
            </select>
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50" onClick={() => void handleNewSession()} title="New session" type="button">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {aiConfig && (
          <div className="flex flex-col gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Bot size={15} className="text-slate-600" />
                <span className="text-[13px] font-medium text-slate-900">Enable AI Planning Workspace</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={aiConfig.enabled}
                  disabled={!isAdmin || updatingModel}
                  onChange={(e) => void handleConfigChange({ enabled: e.target.checked })}
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-slate-700">AI Provider</span>
                {isAdmin ? (
                  <select
                    className="h-8 cursor-pointer rounded-lg border border-slate-300 bg-white px-2 text-[13px] text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10 disabled:opacity-50"
                    value={aiConfig.provider}
                    disabled={updatingModel}
                    onChange={(e) => void handleConfigChange({ provider: e.target.value as ProjectAiConfig['provider'] })}
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic Claude</option>
                  </select>
                ) : (
                  <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-medium text-slate-800">
                    {aiConfig.provider === 'openai' ? 'OpenAI' : aiConfig.provider === 'gemini' ? 'Google Gemini' : 'Anthropic Claude'}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-medium text-slate-700">Model Preset</span>
                {isAdmin ? (
                  <select
                    className="h-8 cursor-pointer rounded-lg border border-slate-300 bg-white px-2 text-[13px] text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10 disabled:opacity-50"
                    value={aiConfig.modelName}
                    disabled={updatingModel}
                    onChange={(e) => void handleConfigChange({ modelName: e.target.value })}
                  >
                    {PROVIDER_PRESETS[aiConfig.provider as ProviderKey]?.models.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-medium text-slate-800">
                    {aiConfig.modelName}
                  </span>
                )}
              </div>
            </div>

            {/* Key configured status check / Enabled check */}
            {!user?.[`${aiConfig.provider}ApiKeyConfigured` as keyof typeof user] ? (
              <div className="mt-1 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                <Shield size={12} className="shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-semibold">Missing API Key:</span> No key is set for {aiConfig.provider === 'openai' ? 'OpenAI' : aiConfig.provider === 'gemini' ? 'Google Gemini' : 'Anthropic Claude'}. Configure it globally in the{' '}
                  {onGoToSettings ? (
                    <button
                      onClick={onGoToSettings}
                      className="font-semibold underline text-amber-900 hover:text-amber-950 focus:outline-none cursor-pointer"
                      type="button"
                    >
                      Settings
                    </button>
                  ) : (
                    <span className="font-semibold">Settings</span>
                  )}{' '}
                  tab.
                </div>
              </div>
            ) : !aiConfig.enabled ? (
              <div className="mt-1 flex gap-1.5 rounded-lg border border-dashed border-slate-200 bg-white p-2 text-xs text-slate-500">
                <Shield size={12} className="shrink-0 text-slate-400 mt-0.5" />
                <span>AI planning is disabled. Toggle it on to use your configured credentials.</span>
              </div>
            ) : null}
          </div>
        )}

        <div className="max-h-[260px] min-h-[140px] space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
          {workspace?.messages.length ? workspace.messages.map((item) => (
            <div className={`max-w-[88%] rounded-lg px-3 py-2 text-sm ${item.role === 'USER' ? 'ml-auto bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-800'}`} key={item.id}>
              <div className="mb-0.5 text-xs font-medium opacity-70">{item.role === 'USER' ? 'You' : 'AI planner'}</div>
              <div className="whitespace-pre-wrap">{item.content}</div>
            </div>
          )) : <p className="text-sm text-slate-500">Describe goal, users, scope, constraints, and required outcomes.</p>}
        </div>

        <div className="flex gap-2">
          <textarea
            className="min-h-[72px] flex-1 resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Describe requirements or answer next planning question..."
            value={message}
          />
          <button className="inline-flex h-10 w-10 items-center justify-center self-end rounded-lg bg-slate-900 text-white shadow-sm hover:bg-slate-800 disabled:opacity-50" disabled={loading || !message.trim()} onClick={() => void handleSend()} type="button">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
        <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50" disabled={loading || !workspace?.messages.some((item) => item.role === 'USER')} onClick={() => void handleGenerateDraft()} type="button">
          <Sparkles size={16} /> Generate review draft
        </button>
      </section>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">{error}</div> : null}
      {workspace?.drafts.map((draft) => (
        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" key={draft.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="text-slate-400" size={18} />
              <h3 className="m-0 text-[15px] font-semibold text-slate-900">{draft.plan.documentationTitle}</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-inset ring-slate-200">{draft.status}</span>
          </div>
          <pre className="max-h-[180px] overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{draft.plan.documentation}</pre>
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <h4 className="m-0 text-[13px] font-medium text-slate-500">Milestones mapped to epics</h4>
              {draft.plan.milestones.map((milestone) => <div className="mt-1 text-sm text-slate-800" key={milestone.name}>- {milestone.name}</div>)}
            </div>
            <div>
              <h4 className="m-0 text-[13px] font-medium text-slate-500">Tasks and subtasks</h4>
              {draft.plan.tasks.map((task) => <div className="mt-1 text-sm text-slate-800" key={task.title}>- {task.title} ({task.subtasks.length})</div>)}
            </div>
          </div>
          {draft.failureReason ? <p className="text-sm text-red-700">{draft.failureReason}</p> : null}
          {draft.status === 'REVIEW' ? (
            <div className="flex flex-wrap justify-end gap-2">
              <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50" disabled={loading} onClick={() => void handleReject(draft)} type="button"><XCircle size={16} /> Reject</button>
              {isAdmin ? <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white shadow-sm hover:bg-slate-800" disabled={loading} onClick={() => void handleApprove(draft)} type="button"><CheckCircle size={16} /> Approve and create</button> : <span className="self-center text-xs text-slate-500">Admin approval required</span>}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}

export default AiPlanningWorkspacePanel;
