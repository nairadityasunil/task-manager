import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  CheckSquare,
  Layers3,
  Radio,
  Save,
  UsersRound,
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import {
  createChecklist,
  createGuide,
  createSurvey,
  deleteChecklist,
  deleteGuide,
  deleteSurvey,
  getGuideAnalyticsSummary,
  listChecklists,
  listGuides,
  listSurveys,
  updateChecklist,
  updateGuide,
  updateGuideStatus,
  updateSurvey,
  listSurveyResponses,
  type GuideAnalyticsSummary,
  type SurveyResponse,
  type GuidePayload,
  type SurveyPayload,
  type ChecklistPayload
} from '@/lib/engagement/api';
import { listIntegrations, type SdkIntegration } from '@/lib/sdk-integrations/api';
import { useConfirm } from '@/context/ConfirmationContext';
import {
  ContentEditor,
  GuideTypePicker,
  TemplatePicker,
  newChecklistItem,
  newGuideStep,
  newQuestion,
  validateExperience,
  type ExperienceTemplate
} from '@/features/engagement/components/ExperienceEditor';
import SegmentsPanel from '@/features/engagement/components/SegmentsPanel';
import ExperienceLibrary from '@/features/engagement/components/ExperienceLibrary';
import ExperienceAnalyticsModal from '@/features/engagement/components/ExperienceAnalyticsModal';
import { useToast } from '@/context/ToastContext';
import { RuleBuilder, SegmentPicker, UrlTargeting } from '@/features/engagement/components/TargetingRuleEditor';
import type {
  FrequencyRules,
  Guide,
  GuideStatus,
  GuidePriority,
  GuideStep,
  GuideType,
  TargetingRuleGroup
} from '@/lib/guides/types';

const STATUS_VERB: Record<GuideStatus, string> = {
  LIVE: 'published',
  PAUSED: 'paused',
  ARCHIVED: 'archived',
  DRAFT: 'restored to draft'
};

type BuilderTab = 'guides' | 'surveys' | 'checklists' | 'segments' | 'analytics';

const defaultRules = (): TargetingRuleGroup => ({
  id: crypto.randomUUID(),
  operator: 'AND',
  conditions: [],
  groups: []
});

const defaultFrequency: FrequencyRules = {
  showOncePerSession: true,
  cooldownHours: 24,
  maxDisplays: 5
};

const priorities: GuidePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export interface EngagementPageProps {
  sdkIntegrationId?: string;
  defaultTab?: BuilderTab;
  hideHeader?: boolean;
}

function EngagementPage({ sdkIntegrationId: propSdkIntegrationId, defaultTab, hideHeader = false }: EngagementPageProps): JSX.Element {
  const { integrationId } = useParams();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [analyticsExperience, setAnalyticsExperience] = useState<Guide | null>(null);
  const [activeIntegrationId, setActiveIntegrationId] = useState<string>('');
  const [integrations, setIntegrations] = useState<SdkIntegration[]>([]);
  const [tab, setTab] = useState<BuilderTab>(defaultTab ?? 'guides');
  const [guides, setGuides] = useState<Guide[]>([]);
  const [surveys, setSurveys] = useState<Guide[]>([]);
  const [checklists, setChecklists] = useState<Guide[]>([]);
  const [analytics, setAnalytics] = useState<GuideAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Action results surface as toasts rather than a banner that never clears.
  useEffect(() => {
    if (message) {
      showToast({ variant: 'success', message });
      setMessage(null);
    }
  }, [message, showToast]);
  const [selectedSurveyForResponses, setSelectedSurveyForResponses] = useState<Guide | null>(null);
  const [isResponsesModalOpen, setIsResponsesModalOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Guide | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalType, setCreateModalType] = useState<'guide' | 'survey' | 'checklist'>('guide');
  const [publishingExperience, setPublishingExperience] = useState<Guide | null>(null);

  useEffect(() => {
    if (defaultTab) {
      setTab(defaultTab);
    }
  }, [defaultTab]);

  useEffect(() => {
    const resolvedId = propSdkIntegrationId ?? integrationId;
    if (resolvedId) {
      setActiveIntegrationId(resolvedId);
    } else {
      const fetchIntegrations = async () => {
        try {
          const list = await listIntegrations();
          setIntegrations(list);
          if (list.length > 0) {
            setActiveIntegrationId(list[0].id);
          }
        } catch (err) {
          console.error('Failed to load integrations', err);
        }
      };
      void fetchIntegrations();
    }
  }, [propSdkIntegrationId, integrationId]);

  const load = async () => {
    if (!activeIntegrationId) return;
    setLoading(true);
    try {
      const [guideList, surveyList, checklistList, summary] = await Promise.all([
        listGuides(activeIntegrationId),
        listSurveys(activeIntegrationId),
        listChecklists(),
        getGuideAnalyticsSummary(activeIntegrationId)
      ]);
      setGuides(guideList);
      setSurveys(surveyList);
      setChecklists(checklistList);
      setAnalytics(summary);
    } catch (error) {
      console.error('Failed to load engagement data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeIntegrationId) {
      localStorage.setItem('active_sdk_integration_id', activeIntegrationId);
      window.dispatchEvent(new CustomEvent('sync:active-integration-changed', { detail: { id: activeIntegrationId } }));
      void load();
    }
  }, [activeIntegrationId]);

  const handleStatusChangeRequest = async (experience: Guide, status: GuideStatus) => {
    if (status === 'LIVE') {
      setPublishingExperience(experience);
    } else {
      await executeStatusChange(experience, status);
    }
  };

  const executeStatusChange = async (experience: Guide, status: GuideStatus) => {
    const verb = STATUS_VERB[status];
    if (experience.type === 'SURVEY') {
      await updateSurvey(activeIntegrationId, experience.id, { status });
      setMessage(`Survey ${verb}.`);
    } else if (experience.type === 'CHECKLIST') {
      await updateChecklist(experience.id, { status });
      setMessage(`Checklist ${verb}.`);
    } else {
      await updateGuideStatus(activeIntegrationId, experience.id, status);
      setMessage(`Guide ${verb}.`);
    }
    await load();
  };

  const totals = useMemo(
    () => ({
      live: [...guides, ...surveys, ...checklists].filter((item) => item.status === 'LIVE').length,
      drafts: [...guides, ...surveys, ...checklists].filter((item) => item.status === 'DRAFT').length
    }),
    [checklists, guides, surveys]
  );

  return (
    <div className={hideHeader ? '' : 'min-h-full bg-slate-50/50'}>
      {!hideHeader && (
        <div className="border-b border-slate-200 bg-white px-4 sm:px-8 pt-5 sm:pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="m-0 text-2xl font-bold text-slate-900 ">Engagement</h2>
                {integrations.length > 0 && !propSdkIntegrationId && (
                  <select
                    value={activeIntegrationId}
                    onChange={(e) => setActiveIntegrationId(e.target.value)}
                    className="rounded-lg border border-slate-200  bg-white  px-3 py-1.5 text-sm font-semibold text-slate-800  shadow-sm focus:border-slate-500 focus:outline-none"
                  >
                    {integrations.map((integration) => (
                      <option key={integration.id} value={integration.id}>
                        {integration.name} ({integration.environment})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="m-0 mt-1 text-sm text-slate-500 ">Guides, surveys, checklists, targeting, and behavior analytics</p>
            </div>
            <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:gap-3 sm:text-right">
              <Metric label="Live" value={totals.live} />
              <Metric label="Drafts" value={totals.drafts} />
              <Metric label="MTU" value={analytics?.mtu.users ?? 0} />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-6" role="tablist">
            <TabButton active={tab === 'guides'} icon={Layers3} label="Guides" onClick={() => setTab('guides')} />
            <TabButton active={tab === 'surveys'} icon={Radio} label="Surveys" onClick={() => setTab('surveys')} />
            <TabButton active={tab === 'checklists'} icon={CheckSquare} label="Checklists" onClick={() => setTab('checklists')} />
            <TabButton active={tab === 'segments'} icon={UsersRound} label="Segments" onClick={() => setTab('segments')} />
            <TabButton active={tab === 'analytics'} icon={BarChart3} label="Analytics" onClick={() => setTab('analytics')} />
          </div>
        </div>
      )}


      <div className={hideHeader ? '' : 'p-4 sm:p-8'}>
        {(tab === 'guides' || tab === 'surveys' || tab === 'checklists') && (
          <ExperienceLibrary
            kind={tab}
            experiences={tab === 'guides' ? guides : tab === 'surveys' ? surveys : checklists}
            loading={loading}
            onCreate={() => {
              setCreateModalType(tab === 'guides' ? 'guide' : tab === 'surveys' ? 'survey' : 'checklist');
              setIsCreateModalOpen(true);
            }}
            onStatusChange={handleStatusChangeRequest}
            onViewAnalytics={tab === 'checklists' ? undefined : (experience) => setAnalyticsExperience(experience)}
            onViewResponses={tab === 'surveys' ? (survey) => {
              setSelectedSurveyForResponses(survey);
              setIsResponsesModalOpen(true);
            } : undefined}
            onEdit={(experience) => {
              setEditingExperience(experience);
              setIsEditModalOpen(true);
            }}
            onDelete={async (experience) => {
              const isConfirmed = await confirm({
                title: 'Delete Experience',
                message: `Permanently delete "${experience.title}"? This cannot be undone.`,
                confirmText: 'Delete',
                type: 'danger'
              });
              if (!isConfirmed) return;
              if (experience.type === 'SURVEY') {
                await deleteSurvey(activeIntegrationId, experience.id);
                setMessage('Survey deleted.');
              } else if (experience.type === 'CHECKLIST') {
                await deleteChecklist(experience.id);
                setMessage('Checklist deleted.');
              } else {
                await deleteGuide(activeIntegrationId, experience.id);
                setMessage('Guide deleted.');
              }
              await load();
            }}
          />
        )}
        {tab === 'segments' && <SegmentsPanel />}
        {tab === 'analytics' && <AnalyticsDashboard analytics={analytics} />}
      </div>
      {analyticsExperience && (
        <ExperienceAnalyticsModal
          experience={analyticsExperience}
          onClose={() => setAnalyticsExperience(null)}
          sdkIntegrationId={activeIntegrationId}
        />
      )}
      {selectedSurveyForResponses && (
        <SurveyResponsesModal
          isOpen={isResponsesModalOpen}
          onClose={() => {
            setIsResponsesModalOpen(false);
            setSelectedSurveyForResponses(null);
          }}
          survey={selectedSurveyForResponses}
          sdkIntegrationId={activeIntegrationId}
        />
      )}
      {isEditModalOpen && editingExperience && (
        <EditExperienceModal
          experience={editingExperience}
          onClose={() => { setIsEditModalOpen(false); setEditingExperience(null); }}
          onSave={async (updated) => {
            if (editingExperience.type === 'CHECKLIST') {
              await updateChecklist(editingExperience.id, {
                title: updated.title,
                description: updated.description,
                items: updated.steps,
                targetingRules: updated.targetingRules ?? null,
                frequencyRules: updated.frequencyRules,
              });
            } else if (editingExperience.type === 'SURVEY') {
              await updateSurvey(activeIntegrationId, editingExperience.id, {
                title: updated.title,
                description: updated.description,
                priority: updated.priority,
                questions: updated.steps,
                targetingRules: updated.targetingRules ?? null,
                frequencyRules: updated.frequencyRules,
              });
            } else {
              await updateGuide(activeIntegrationId, editingExperience.id, {
                title: updated.title,
                description: updated.description,
                type: updated.type,
                priority: updated.priority,
                steps: updated.steps,
                targetingRules: updated.targetingRules ?? null,
                frequencyRules: updated.frequencyRules,
              });
            }
            setMessage('Experience updated.');
            setIsEditModalOpen(false);
            setEditingExperience(null);
            await load();
          }}
        />
      )}
      {publishingExperience && (
        <PublishConfirmModal
          isOpen={!!publishingExperience}
          onClose={() => setPublishingExperience(null)}
          onConfirm={async () => {
            const exp = publishingExperience;
            setPublishingExperience(null);
            await executeStatusChange(exp, 'LIVE');
          }}
          experience={publishingExperience}
        />
      )}
      {isCreateModalOpen && (
        <CreateExperienceModal
          type={createModalType}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={async (payload) => {
            if (createModalType === 'survey') {
              await createSurvey(activeIntegrationId, payload as SurveyPayload);
              setMessage('Survey saved.');
            } else if (createModalType === 'checklist') {
              await createChecklist(payload as ChecklistPayload);
              setMessage('Checklist saved.');
            } else {
              await createGuide(activeIntegrationId, payload as GuidePayload);
              setMessage('Guide saved.');
            }
            setIsCreateModalOpen(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function ValidationSummary({ errors }: { errors: string[] }): JSX.Element | null {
  if (errors.length === 0) return null;
  return (
    <div className="mr-auto max-w-xl rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" role="alert">
      <p className="m-0 font-semibold">Fix these before saving:</p>
      <ul className="m-0 mt-1 list-disc pl-4">
        {errors.slice(0, 5).map((error) => <li key={error}>{error}</li>)}
        {errors.length > 5 && <li>…and {errors.length - 5} more</li>}
      </ul>
    </div>
  );
}

function Preview({ guide }: { guide: Guide }): JSX.Element {
  return (
    <aside className="sticky top-6 h-fit rounded-lg border border-olive-200 bg-white p-5 shadow-sm">
      <SectionTitle icon={Bell} title="Preview" />
      <div className="mt-4 rounded-lg border border-olive-200 bg-olive-50 p-4">
        <p className="m-0 text-xs font-bold uppercase tracking-widest text-olive-500">{guide.type}</p>
        <h3 className="m-0 mt-2 text-lg font-bold text-olive-950">{guide.title}</h3>
        <p className="m-0 mt-2 text-sm text-olive-600">{guide.description}</p>
        <div className="mt-4 grid gap-2">
          {guide.steps.map((step, index) => (
            <div className="rounded-md bg-white px-3 py-2 text-sm" key={step.id}>
              <span className="font-bold text-olive-900">{index + 1}. {step.title}</span>
              {step.description && <p className="m-0 mt-1 text-xs text-olive-500">{step.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function AnalyticsDashboard({ analytics }: { analytics: GuideAnalyticsSummary | null }): JSX.Element {
  if (!analytics) {
    return <div className="rounded-lg border border-olive-200 bg-white p-6 text-sm text-olive-500">No analytics yet.</div>;
  }

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Impressions" value={analytics.guides.impressions} />
        <MetricCard label="Completions" value={analytics.guides.completions} />
        <MetricCard label="Dismissals" value={analytics.guides.dismissals} />
        <MetricCard label="NPS" value={Math.round(analytics.surveys.nps)} />
      </div>
      <div className="rounded-lg border border-olive-200 bg-white p-6">
        <SectionTitle icon={BarChart3} title="Engagement Events" />
        <div className="mt-4 grid gap-2">
          {analytics.events.map((event) => (
            <div className="grid grid-cols-[1fr_80px] rounded-md bg-slate-50  px-3 py-2 text-sm" key={event.eventName}>
              <span className="font-semibold text-slate-900 ">{event.eventName}</span>
              <span className="text-right font-bold text-slate-700 ">{event.count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Promoters" value={analytics.surveys.promoters} />
        <MetricCard label="Passives" value={analytics.surveys.passives} />
        <MetricCard label="Detractors" value={analytics.surveys.detractors} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 py-2.5">
      <p className="m-0 text-xs font-medium text-slate-500">{label}</p>
      <p className="m-0 mt-0.5 text-xl font-semibold tabular-nums text-slate-900">{new Intl.NumberFormat().format(value)}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="rounded-lg bg-white  p-5 shadow-md">
      <p className="m-0 text-xs font-bold uppercase tracking-widest text-slate-500 ">{label}</p>
      <p className="m-0 mt-2 text-3xl font-black text-slate-900 ">{value}</p>
    </div>
  );
}

function TabButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void }): JSX.Element {
  return (
    <button
      aria-selected={active}
      className={`-mb-px flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-semibold transition-colors ${
        active ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
      }`}
      onClick={onClick}
      role="tab"
      type="button"
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <Icon size={17} className="text-slate-700 " />
      <h3 className="m-0 text-sm font-black uppercase tracking-widest text-slate-900 ">{title}</h3>
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }): JSX.Element {
  return (
    <label className="grid gap-1 text-xs font-bold uppercase tracking-widest text-slate-500 min-w-0">
      {label}
      <input className="w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 focus:border-slate-500 focus:outline-none" onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}

function SelectInput({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }): JSX.Element {
  return (
    <label className="grid gap-1 text-xs font-bold uppercase tracking-widest text-slate-500 min-w-0">
      {label}
      <select className="w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 focus:border-slate-500 focus:outline-none" onChange={(event) => onChange(event.target.value)} value={value}>
        {values.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
      </select>
    </label>
  );
}

interface SurveyResponsesModalProps {
  isOpen: boolean;
  onClose: () => void;
  survey: Guide;
  sdkIntegrationId: string;
}

function SurveyResponsesModal({
  isOpen,
  onClose,
  survey,
  sdkIntegrationId
}: SurveyResponsesModalProps): JSX.Element | null {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && survey.id) {
      setLoading(true);
      listSurveyResponses(sdkIntegrationId, survey.id)
        .then(setResponses)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, survey.id, sdkIntegrationId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col rounded-xl border border-olive-200 bg-white shadow-2xl transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-olive-100 bg-olive-50/50 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-olive-950">Responses: {survey.title}</h3>
            <p className="mt-0.5 text-xs text-olive-500">Showing all collected response payloads, including dynamic custom fields.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-olive-400 hover:bg-olive-100 hover:text-olive-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm font-medium text-olive-600 animate-pulse">Loading responses...</p>
            </div>
          ) : responses.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-8">
              <Radio className="h-10 w-10 text-olive-300 animate-bounce" />
              <h4 className="mt-4 text-base font-semibold text-olive-900">No responses recorded yet</h4>
              <p className="mt-1 text-sm text-olive-500 max-w-xs">Once users submit responses through the SDK, they will appear here in real-time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {responses.map((response) => (
                <div key={response._id} className="rounded-lg border border-olive-100 bg-olive-50/20 p-4 hover:border-olive-200 transition-colors shadow-sm">
                  {/* Respondent Info */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-olive-100/50 pb-2 mb-3">
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="font-semibold text-olive-500">User:</span>{' '}
                        <span className="font-mono text-olive-900 bg-olive-100/50 px-1.5 py-0.5 rounded">{response.userId || 'Anonymous'}</span>
                      </div>
                      {response.sessionId && (
                        <div>
                          <span className="font-semibold text-olive-500">Session:</span>{' '}
                          <span className="font-mono text-olive-900">{response.sessionId}</span>
                        </div>
                      )}
                      {response.category && response.category !== 'NONE' && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-olive-500">NPS Class:</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                            response.category === 'PROMOTER'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : response.category === 'PASSIVE'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {response.category}
                          </span>
                        </div>
                      )}
                      {response.npsScore !== null && (
                        <div>
                          <span className="font-semibold text-olive-500">NPS Score:</span>{' '}
                          <span className="font-bold text-olive-900 bg-olive-100 px-1.5 py-0.5 rounded">{response.npsScore}/10</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-olive-400">
                      {new Date(response.submittedAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Answers */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-olive-800">Answers Payload</h4>
                      <div className="space-y-1.5">
                        {response.answers.map((answer) => (
                          <div key={answer.questionId} className="text-sm rounded border border-olive-100/65 bg-white p-2">
                            <div className="flex items-center justify-between text-xs text-olive-500">
                              <span className="font-medium truncate max-w-[200px]" title={answer.questionTitle}>
                                {answer.questionTitle}
                              </span>
                              <span className="bg-olive-50 px-1 rounded text-[10px] font-mono">{answer.questionType}</span>
                            </div>
                            <div className="mt-1 font-semibold text-olive-900">
                              {typeof answer.value === 'object' && answer.value !== null
                                ? JSON.stringify(answer.value, null, 2)
                                : String(answer.value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metadata & Raw Details */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-olive-800">Telemetry & Context</h4>
                      <div className="rounded border border-olive-100/65 bg-olive-50/40 p-2.5 space-y-1.5 text-xs text-olive-700">
                        {response.metadata && Object.keys(response.metadata).length > 0 ? (
                          Object.entries(response.metadata).map(([key, val]) => (
                            <div key={key} className="flex justify-between gap-4 py-0.5 border-b border-olive-100 last:border-0">
                              <span className="font-mono text-olive-500 shrink-0">{key}:</span>
                              <span className="font-medium text-olive-900 text-right break-all truncate max-w-[240px]" title={String(val)}>
                                {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-olive-400 italic">No additional telemetry sent.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-olive-100 bg-olive-50/50 px-6 py-3.5">
          <button
            onClick={onClose}
            className="rounded-md bg-olive-700 hover:bg-olive-800 text-white px-4 py-2 text-sm font-bold shadow transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function EditExperienceModal({
  experience,
  onClose,
  onSave,
}: {
  experience: Guide;
  onClose: () => void;
  onSave: (updated: Guide & { frequencyRules?: FrequencyRules }) => Promise<void>;
}): JSX.Element {
  const [title, setTitle] = useState(experience.title);
  const [description, setDescription] = useState(experience.description ?? '');
  const [type, setType] = useState<GuideType>(experience.type);
  const [priority, setPriority] = useState<GuidePriority>(experience.priority ?? 'MEDIUM');
  const [steps, setSteps] = useState<GuideStep[]>(experience.steps ?? []);
  const [rules, setRules] = useState<TargetingRuleGroup>(experience.targetingRules ?? defaultRules());
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const mode = experience.type === 'SURVEY' ? 'survey' : experience.type === 'CHECKLIST' ? 'checklist' : 'guide';
  const errors = validateExperience(mode, type, title, steps);

  const handleSave = async () => {
    if (errors.length > 0) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...experience, title, description, type, priority, steps, targetingRules: rules, frequencyRules: defaultFrequency });
    } finally {
      setSaving(false);
    }
  };

  const experienceMock: Guide = {
    ...experience,
    title,
    description,
    type,
    priority,
    steps,
    targetingRules: rules
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-6xl rounded border border-olive-200 bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-olive-100 px-6 py-4">
          <h3 className="text-base font-bold text-olive-950">Edit {experience.type === 'SURVEY' ? 'Survey' : experience.type === 'CHECKLIST' ? 'Checklist' : 'Guide'}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-olive-400 hover:bg-olive-100" type="button"><X size={18} /></button>
        </div>
        <div className="flex-grow overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <TextInput label="Name" value={title} onChange={setTitle} />
                {mode !== 'checklist' ? (
                  <SelectInput label="Priority" value={priority} values={priorities} onChange={(v) => setPriority(v as GuidePriority)} />
                ) : <span />}
                <div className="col-span-2">
                  <TextInput label="Description (only you see this)" value={description} onChange={setDescription} />
                </div>
              </div>
              {mode === 'guide' && <GuideTypePicker value={type} onChange={setType} />}
              <ContentEditor guideType={type} kind={mode} onChange={setSteps} steps={steps} />
              <SegmentPicker onApply={setRules} />
              <UrlTargeting rules={rules} onChange={setRules} />
              <RuleBuilder rules={rules} onChange={setRules} />
            </div>
            <div>
              <Preview guide={experienceMock} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-olive-100 px-6 py-4">
          <ValidationSummary errors={showErrors ? errors : []} />
          <button onClick={onClose} className="rounded border border-olive-200 px-4 py-2 text-sm font-semibold text-olive-700 hover:bg-olive-50" type="button">Cancel</button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex items-center gap-2 rounded bg-slate-900 hover:bg-slate-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            type="button"
          >
            <Save size={14} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateExperienceModal({
  type,
  onClose,
  onSave,
}: {
  type: 'guide' | 'survey' | 'checklist';
  onClose: () => void;
  onSave: (payload: GuidePayload | SurveyPayload | ChecklistPayload) => Promise<void>;
}): JSX.Element {
  const [title, setTitle] = useState(
    type === 'guide'
      ? 'New onboarding guide'
      : type === 'survey'
      ? 'NPS pulse'
      : 'Activation checklist'
  );
  const [description, setDescription] = useState(
    type === 'guide'
      ? 'Introduce the next best action.'
      : type === 'survey'
      ? 'Ask users how likely they are to recommend Pristine.'
      : 'Help users reach the first success milestone.'
  );
  const [guideType, setGuideType] = useState<GuideType>('MODAL');
  const [priority, setPriority] = useState<GuidePriority>('MEDIUM');
  const [steps, setSteps] = useState<GuideStep[]>(() => {
    if (type === 'survey') return [{ ...newQuestion('NPS', 'How likely are you to recommend us to a friend or colleague?'), required: true }];
    if (type === 'checklist') return [newChecklistItem('Create your first project', 'project_created')];
    return [newGuideStep('Welcome! 👋', 'Tell users what this is about.')];
  });
  const [rules, setRules] = useState<TargetingRuleGroup>(defaultRules());
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const errors = validateExperience(type, guideType, title, steps);

  const applyTemplate = (template: ExperienceTemplate) => {
    setTitle(template.title);
    setDescription(template.description);
    if (template.guideType) setGuideType(template.guideType);
    setSteps(template.build());
    setShowErrors(false);
  };

  const handleSave = async () => {
    if (errors.length > 0) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    try {
      if (type === 'survey') {
        await onSave({
          title,
          description,
          priority,
          questions: steps,
          targetingRules: rules,
          frequencyRules: defaultFrequency
        } as SurveyPayload);
      } else if (type === 'checklist') {
        await onSave({
          title,
          description,
          items: steps,
          targetingRules: rules,
          frequencyRules: defaultFrequency
        } as ChecklistPayload);
      } else {
        await onSave({
          title,
          description,
          type: guideType,
          priority,
          steps,
          targetingRules: rules,
          frequencyRules: defaultFrequency
        } as GuidePayload);
      }
    } finally {
      setSaving(false);
    }
  };

  const experienceMock: Guide = {
    id: 'preview',
    title,
    description,
    type: type === 'survey' ? 'SURVEY' : type === 'checklist' ? 'CHECKLIST' : guideType,
    priority,
    steps,
    targetingRules: rules,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-6xl rounded border border-olive-200 bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-olive-100 px-6 py-4">
          <h3 className="text-base font-bold text-olive-950">Create {type === 'guide' ? 'Guide' : type === 'survey' ? 'Survey' : 'Checklist'}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-olive-400 hover:bg-olive-100" type="button"><X size={18} /></button>
        </div>
        <div className="flex-grow overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
            <div className="space-y-5">
              <TemplatePicker kind={type} onPick={applyTemplate} />
              <div className="grid grid-cols-2 gap-4">
                <TextInput label="Name" value={title} onChange={setTitle} />
                {type !== 'checklist' ? (
                  <SelectInput label="Priority" value={priority} values={priorities} onChange={(v) => setPriority(v as GuidePriority)} />
                ) : <span />}
                <div className="col-span-2">
                  <TextInput label="Description (only you see this)" value={description} onChange={setDescription} />
                </div>
              </div>
              {type === 'guide' && <GuideTypePicker value={guideType} onChange={setGuideType} />}
              <ContentEditor guideType={guideType} kind={type} onChange={setSteps} steps={steps} />
              <SegmentPicker onApply={setRules} />
              <UrlTargeting rules={rules} onChange={setRules} />
              <RuleBuilder rules={rules} onChange={setRules} />
            </div>
            <div>
              <Preview guide={experienceMock} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-olive-100 px-6 py-4">
          <ValidationSummary errors={showErrors ? errors : []} />
          <button onClick={onClose} className="rounded border border-olive-200 px-4 py-2 text-sm font-semibold text-olive-700 hover:bg-olive-50" type="button">Cancel</button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex items-center gap-2 rounded bg-slate-900 hover:bg-slate-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            type="button"
          >
            <Save size={14} />
            {saving ? 'Creating…' : `Create ${type === 'guide' ? 'Guide' : type === 'survey' ? 'Survey' : 'Checklist'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function PublishConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  experience
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  experience: Guide | null;
}): JSX.Element | null {
  if (!isOpen || !experience) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded bg-white p-6 shadow-2xl border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-2">Publish Experience?</h3>
        <p className="text-sm text-slate-500 mb-6">
          Are you sure you want to publish <span className="font-semibold text-slate-800">"{experience.title}"</span>? 
          This will make it live and visible to matching users immediately.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors shadow"
          >
            Publish Live
          </button>
        </div>
      </div>
    </div>
  );
}

export default EngagementPage;
