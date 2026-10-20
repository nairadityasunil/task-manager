import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart3,
  CheckSquare,
  Eye,
  Layers3,
  Radio,
  Rocket,
  Save,
  Sparkles,
  UsersRound,
  PencilLine
} from 'lucide-react';

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
import PageHeader from '@/components/PageHeader';
import { Badge, Button, Field, StatCard, Tabs, cn, inputClass, selectClass } from '@/components/ui';
import {
  ContentEditor,
  EditorDialog,
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
    <div className={hideHeader ? '' : 'min-h-full bg-slate-50'}>
      {!hideHeader && (
        <PageHeader
          title="Engagement"
          description="Guides, surveys, checklists, targeting, and behavior analytics"
          icon={Sparkles}
          tone="amber"
          actions={integrations.length > 0 && !propSdkIntegrationId ? (
            <div className="w-full sm:w-64">
              <select
                aria-label="Integration"
                value={activeIntegrationId}
                onChange={(e) => setActiveIntegrationId(e.target.value)}
                className={cn(selectClass, 'font-medium')}
              >
                {integrations.map((integration) => (
                  <option key={integration.id} value={integration.id}>
                    {integration.name} ({integration.environment})
                  </option>
                ))}
              </select>
            </div>
          ) : undefined}
        >
          <Tabs
            items={[
              { value: 'guides', label: 'Guides', icon: Layers3 },
              { value: 'surveys', label: 'Surveys', icon: Radio },
              { value: 'checklists', label: 'Checklists', icon: CheckSquare },
              { value: 'segments', label: 'Segments', icon: UsersRound },
              { value: 'analytics', label: 'Analytics', icon: BarChart3 }
            ]}
            value={tab}
            onChange={setTab}
          />
        </PageHeader>
      )}


      <div className={hideHeader ? '' : 'grid grid-cols-[minmax(0,1fr)] gap-4 px-3 py-4 sm:px-5 lg:px-6'}>
        {!hideHeader && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard hint="Showing to users now" hintTone={totals.live ? 'success' : 'neutral'} icon={Radio} label="Live" tone="emerald" value={totals.live} />
            <StatCard hint="Not published yet" icon={PencilLine} label="Drafts" tone="amber" value={totals.drafts} />
            <StatCard hint="Monthly tracked users" icon={UsersRound} label="MTU" tone="sky" value={new Intl.NumberFormat().format(analytics?.mtu.users ?? 0)} />
          </div>
        )}
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
    <div className="mr-auto w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800 sm:w-auto sm:max-w-xl" role="alert">
      <p className="m-0 font-medium">Fix these before saving:</p>
      <ul className="m-0 mt-1 list-disc pl-4">
        {errors.slice(0, 5).map((error) => <li key={error}>{error}</li>)}
        {errors.length > 5 && <li>…and {errors.length - 5} more</li>}
      </ul>
    </div>
  );
}

const TYPE_LABEL: Record<string, string> = {
  MODAL: 'Modal',
  TOUR: 'Product tour',
  SMART_TIP: 'Smart tip',
  HOTSPOT: 'Hotspot',
  BANNER: 'Banner',
  SURVEY: 'Survey',
  CHECKLIST: 'Checklist'
};

function Preview({ guide }: { guide: Guide }): JSX.Element {
  return (
    <aside className="h-fit rounded-xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-0">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
          <Eye size={15} className="text-slate-400" /> Preview
        </span>
        <Badge>{TYPE_LABEL[guide.type] ?? guide.type}</Badge>
      </div>
      <div className="p-3 sm:p-4">
        <div className="rounded-lg border border-slate-200 bg-slate-100/80 p-3 sm:p-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="m-0 text-[15px] font-semibold text-slate-900">{guide.title || 'Untitled'}</h3>
            {guide.description && <p className="m-0 mt-1 text-[13px] text-slate-500">{guide.description}</p>}
            <ol className="m-0 mt-3 grid list-none gap-2 p-0">
              {guide.steps.map((step, index) => (
                <li className="flex gap-2.5 rounded-md border border-slate-100 bg-slate-50 px-3 py-2" key={step.id}>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="m-0 text-[13px] font-medium text-slate-900">{step.title}</p>
                    {step.description && <p className="m-0 mt-0.5 text-xs text-slate-500">{step.description}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <p className="m-0 mt-2 text-xs text-slate-500">A rough preview. The SDK renders the final look in your app.</p>
      </div>
    </aside>
  );
}

function AnalyticsDashboard({ analytics }: { analytics: GuideAnalyticsSummary | null }): JSX.Element {
  if (!analytics) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
          <BarChart3 size={20} />
        </span>
        <p className="m-0 mt-4 text-[15px] font-semibold text-slate-900">No analytics yet.</p>
        <p className="m-0 mt-1 text-sm text-slate-500">Numbers appear here once users see your guides and surveys.</p>
      </div>
    );
  }

  const maxEvent = Math.max(1, ...analytics.events.map((event) => event.count));

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Impressions" value={analytics.guides.impressions} />
        <MetricCard label="Completions" value={analytics.guides.completions} />
        <MetricCard label="Dismissals" value={analytics.guides.dismissals} />
        <MetricCard label="NPS" value={Math.round(analytics.surveys.nps)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
            <h3 className="m-0 text-[15px] font-semibold text-slate-900">Engagement Events</h3>
            <p className="m-0 mt-0.5 text-[13px] text-slate-500">Counts of each engagement event received.</p>
          </div>
          {analytics.events.length === 0 ? (
            <p className="m-0 px-4 py-6 text-sm text-slate-500 sm:px-5">No engagement events yet.</p>
          ) : (
            <ul className="m-0 grid list-none gap-3 p-4">
              {analytics.events.map((event) => (
                <li className="grid gap-1.5" key={event.eventName}>
                  <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="truncate font-mono text-slate-700">{event.eventName}</span>
                    <span className="font-medium tabular-nums text-slate-900">{new Intl.NumberFormat().format(event.count)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-slate-700" style={{ width: `${(event.count / maxEvent) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
            <h3 className="m-0 text-[15px] font-semibold text-slate-900">Survey sentiment</h3>
            <p className="m-0 mt-0.5 text-[13px] text-slate-500">NPS respondents by group.</p>
          </div>
          <dl className="m-0 grid grid-cols-3 divide-x divide-slate-100">
            {[
              { label: 'Promoters', value: analytics.surveys.promoters, dot: 'bg-emerald-600' },
              { label: 'Passives', value: analytics.surveys.passives, dot: 'bg-slate-400' },
              { label: 'Detractors', value: analytics.surveys.detractors, dot: 'bg-red-500' }
            ].map((entry) => (
              <div className="min-w-0 px-3 py-4 sm:px-5" key={entry.label}>
                <dt className="flex items-center gap-1.5 truncate text-[13px] text-slate-500">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${entry.dot}`} />
                  {entry.label}
                </dt>
                <dd className="m-0 mt-1 text-xl font-semibold tracking-tight tabular-nums text-slate-900">{entry.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="m-0 truncate text-[13px] text-slate-500">{label}</p>
      <p className="m-0 mt-1.5 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }): JSX.Element {
  return (
    <Field className="min-w-0" label={label}>
      <input className={cn(inputClass, 'min-w-0')} onChange={(event) => onChange(event.target.value)} value={value} />
    </Field>
  );
}

function SelectInput({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }): JSX.Element {
  return (
    <Field className="min-w-0" label={label}>
      <select className={cn(selectClass, 'min-w-0')} onChange={(event) => onChange(event.target.value)} value={value}>
        {values.map((entry) => <option key={entry} value={entry}>{entry.charAt(0) + entry.slice(1).toLowerCase()}</option>)}
      </select>
    </Field>
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
    <EditorDialog
      bodyClassName="bg-slate-50/60"
      closeLabel="Dismiss"
      description="Showing all collected response payloads, including dynamic custom fields."
      footer={<Button onClick={onClose} variant="primary">Close</Button>}
      maxWidth="max-w-5xl"
      onClose={onClose}
      title={`Responses: ${survey.title}`}
    >
      {loading ? (
        <div aria-busy="true" className="grid gap-3">
          {[0, 1, 2].map((row) => <div className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" key={row} />)}
          <p className="sr-only">Loading responses...</p>
        </div>
      ) : responses.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
            <Radio size={20} />
          </span>
          <h4 className="m-0 mt-4 text-[15px] font-semibold text-slate-900">No responses recorded yet</h4>
          <p className="m-0 mt-1 max-w-xs text-sm text-slate-500">Once users submit responses through the SDK, they will appear here in real-time.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {responses.map((response) => (
            <div key={response._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {/* Respondent Info */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                  <div className="min-w-0">
                    <span className="text-slate-500">User:</span>{' '}
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-900">{response.userId || 'Anonymous'}</span>
                  </div>
                  {response.sessionId && (
                    <div className="min-w-0 truncate">
                      <span className="text-slate-500">Session:</span>{' '}
                      <span className="font-mono text-slate-900">{response.sessionId}</span>
                    </div>
                  )}
                  {response.category && response.category !== 'NONE' && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">NPS Class:</span>
                      <Badge tone={response.category === 'PROMOTER' ? 'success' : response.category === 'PASSIVE' ? 'warning' : 'danger'}>
                        {response.category.charAt(0) + response.category.slice(1).toLowerCase()}
                      </Badge>
                    </div>
                  )}
                  {response.npsScore !== null && (
                    <div>
                      <span className="text-slate-500">NPS Score:</span>{' '}
                      <span className="font-medium text-slate-900">{response.npsScore}/10</span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(response.submittedAt).toLocaleString()}
                </span>
              </div>

              {/* Answers */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid content-start gap-2">
                  <h4 className="m-0 text-[13px] font-medium text-slate-700">Answers</h4>
                  <div className="grid gap-1.5">
                    {response.answers.map((answer) => (
                      <div key={answer.questionId} className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="min-w-0 truncate" title={answer.questionTitle}>
                            {answer.questionTitle}
                          </span>
                          <span className="shrink-0 rounded bg-slate-100 px-1.5 font-mono text-[11px]">{answer.questionType}</span>
                        </div>
                        <div className="mt-1 whitespace-pre-wrap break-words font-medium text-slate-900">
                          {typeof answer.value === 'object' && answer.value !== null
                            ? JSON.stringify(answer.value, null, 2)
                            : String(answer.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Metadata & Raw Details */}
                <div className="grid content-start gap-2">
                  <h4 className="m-0 text-[13px] font-medium text-slate-700">Telemetry &amp; context</h4>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
                    {response.metadata && Object.keys(response.metadata).length > 0 ? (
                      Object.entries(response.metadata).map(([key, val]) => (
                        <div key={key} className="flex justify-between gap-4 border-b border-slate-200/70 py-1.5 last:border-0">
                          <span className="shrink-0 font-mono text-slate-500">{key}</span>
                          <span className="min-w-0 truncate text-right font-medium text-slate-900" title={String(val)}>
                            {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="m-0 py-1.5 text-slate-500">No additional telemetry sent.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </EditorDialog>
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
    <EditorDialog
      footer={
        <>
          <ValidationSummary errors={showErrors ? errors : []} />
          <Button onClick={onClose}>Cancel</Button>
          <Button disabled={saving} icon={Save} onClick={() => void handleSave()} variant="primary">
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </>
      }
      onClose={onClose}
      title={`Edit ${experience.type === 'SURVEY' ? 'Survey' : experience.type === 'CHECKLIST' ? 'Checklist' : 'Guide'}`}
    >
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Name" value={title} onChange={setTitle} />
            {mode !== 'checklist' ? (
              <SelectInput label="Priority" value={priority} values={priorities} onChange={(v) => setPriority(v as GuidePriority)} />
            ) : <span className="hidden sm:block" />}
            <div className="sm:col-span-2">
              <TextInput label="Description (only you see this)" value={description} onChange={setDescription} />
            </div>
          </div>
          {mode === 'guide' && <GuideTypePicker value={type} onChange={setType} />}
          <ContentEditor guideType={type} kind={mode} onChange={setSteps} steps={steps} />
          <TargetingSection>
            <SegmentPicker onApply={setRules} />
            <UrlTargeting rules={rules} onChange={setRules} />
            <RuleBuilder rules={rules} onChange={setRules} />
          </TargetingSection>
        </div>
        <Preview guide={experienceMock} />
      </div>
    </EditorDialog>
  );
}

function TargetingSection({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <section className="grid gap-3 border-t border-slate-200 pt-5">
      <div>
        <h4 className="m-0 text-[15px] font-semibold text-slate-900">Targeting</h4>
        <p className="m-0 mt-0.5 text-[13px] text-slate-500">Choose where this appears and who sees it.</p>
      </div>
      {children}
    </section>
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

  const noun = type === 'guide' ? 'Guide' : type === 'survey' ? 'Survey' : 'Checklist';

  return (
    <EditorDialog
      footer={
        <>
          <ValidationSummary errors={showErrors ? errors : []} />
          <Button onClick={onClose}>Cancel</Button>
          <Button disabled={saving} icon={Save} onClick={() => void handleSave()} variant="primary">
            {saving ? 'Creating…' : `Create ${noun}`}
          </Button>
        </>
      }
      onClose={onClose}
      title={`Create ${noun}`}
    >
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-4">
          <TemplatePicker kind={type} onPick={applyTemplate} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Name" value={title} onChange={setTitle} />
            {type !== 'checklist' ? (
              <SelectInput label="Priority" value={priority} values={priorities} onChange={(v) => setPriority(v as GuidePriority)} />
            ) : <span className="hidden sm:block" />}
            <div className="sm:col-span-2">
              <TextInput label="Description (only you see this)" value={description} onChange={setDescription} />
            </div>
          </div>
          {type === 'guide' && <GuideTypePicker value={guideType} onChange={setGuideType} />}
          <ContentEditor guideType={guideType} kind={type} onChange={setSteps} steps={steps} />
          <TargetingSection>
            <SegmentPicker onApply={setRules} />
            <UrlTargeting rules={rules} onChange={setRules} />
            <RuleBuilder rules={rules} onChange={setRules} />
          </TargetingSection>
        </div>
        <Preview guide={experienceMock} />
      </div>
    </EditorDialog>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-5">
      <div aria-modal="true" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6" role="dialog">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
          <Rocket size={18} />
        </span>
        <h3 className="m-0 mt-4 text-base font-semibold text-slate-900">Publish Experience?</h3>
        <p className="m-0 mt-1.5 text-sm text-slate-500">
          Are you sure you want to publish <span className="font-medium text-slate-800">"{experience.title}"</span>?
          This will make it live and visible to matching users immediately.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="accent">
            Publish Live
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EngagementPage;
