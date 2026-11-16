import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Download,
  MoreHorizontal,
  Play,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Modal from '@/components/Modal';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Field,
  Input,
  Menu,
  Radio,
  Select,
  Tabs,
  Textarea,
  cn,
} from '@/components/ui';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import {
  EU_LABELS,
  STAGE_LABELS,
  STAGE_ORDER,
  TIER_LABELS,
  TYPE_LABELS,
  aiGovApi,
  formatMetric,
  formatThreshold,
  type ApproverRole,
  type Catalog,
  type Gate,
  type RecordRow,
  type Requirement,
  type Risk,
  type SuggestedRisk,
  type UseCase,
} from '@/services/aiGovernance';
import { toDisplayErrorMessage } from '@/utils/apiError';

import { IssuesPanel } from './Panels';
import {
  ErrorNote,
  EuBadge,
  EvalBadge,
  Score,
  SeverityBadge,
  StageBadge,
  TierBadge,
  day,
  useAction,
} from './shared';

export type DetailTab =
  | 'summary'
  | 'assessment'
  | 'factsheet'
  | 'risks'
  | 'evaluations'
  | 'approvals'
  | 'issues'
  | 'history';

const SECTION_TAB: Record<Requirement['section'], DetailTab> = {
  assessment: 'assessment',
  factsheet: 'factsheet',
  risks: 'risks',
  evaluations: 'evaluations',
  approvals: 'approvals',
  issues: 'issues',
  review: 'summary',
};

type Props = { uc: UseCase; catalog: Catalog; onChange: (next: UseCase) => void };

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function StageStepper({ uc }: { uc: UseCase }): JSX.Element {
  const current = STAGE_ORDER.indexOf(uc.stage as (typeof STAGE_ORDER)[number]);
  return (
    <ol
      aria-label="Lifecycle stage"
      className="m-0 flex list-none flex-wrap items-center gap-y-2 p-0"
      data-testid="stage-stepper"
    >
      {STAGE_ORDER.map((s, i) => {
        const done = uc.stage === 'retired' || i < current;
        const active = i === current;
        return (
          <li
            aria-current={active ? 'step' : undefined}
            className="flex items-center text-[13px]"
            key={s}
          >
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                done
                  ? 'bg-green-600 text-white'
                  : active
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-500',
              )}
            >
              {done ? <Check aria-hidden className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                'ml-1.5',
                active
                  ? 'font-semibold text-slate-900'
                  : done
                    ? 'text-slate-700'
                    : 'text-slate-500',
              )}
            >
              {STAGE_LABELS[s]}
            </span>
            {i < STAGE_ORDER.length - 1 ? (
              <span aria-hidden className="mx-2.5 h-px w-6 bg-slate-300 sm:w-10" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function ReasonModal({
  title,
  label,
  confirm,
  danger,
  onClose,
  onSubmit,
}: {
  title: string;
  label: string;
  confirm: string;
  danger?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<boolean>;
}): JSX.Element {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={reason.trim().length < 5}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const ok = await onSubmit(reason.trim());
              setBusy(false);
              if (ok) onClose();
            }}
            variant={danger ? 'danger' : 'primary'}
          >
            {confirm}
          </Button>
        </>
      }
      maxWidth="max-w-[480px]"
      onClose={onClose}
      title={title}
    >
      <Field hint="At least 5 characters. Kept in the history." label={label}>
        <Textarea
          aria-label="Reason"
          autoFocus
          maxLength={1000}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          value={reason}
        />
      </Field>
    </Modal>
  );
}

function Summary({ uc, onChange, onTab }: Props & { onTab: (t: DetailTab) => void }): JSX.Element {
  const action = useAction();
  const { showToast } = useToast();
  const [attesting, setAttesting] = useState(false);
  const [note, setNote] = useState('');
  const unmet = uc.requirements.filter((r) => !r.met);
  const overdue = uc.nextReviewAt != null && new Date(uc.nextReviewAt).getTime() < Date.now();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <ErrorNote message={action.error} />
      <Card className="grid gap-4 p-4">
        <StageStepper uc={uc} />
        {uc.status === 'rejected' ? (
          <p
            className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800"
            role="status"
          >
            This use case was rejected and cannot move on.
            {uc.tier === 'prohibited'
              ? ' It falls under a practice the EU AI Act prohibits; see the Assessment tab.'
              : ''}
          </p>
        ) : uc.nextStage ? (
          <div data-testid="requirements">
            <p className="m-0 mb-2 text-[13px] font-medium text-slate-900">
              To move to {STAGE_LABELS[uc.nextStage]}
            </p>
            <ul className="m-0 grid list-none gap-1.5 p-0">
              {uc.requirements.map((r) => (
                <li className="flex items-start gap-2 text-[13px]" key={r.id}>
                  {r.met ? (
                    <CheckCircle2
                      aria-label="Done"
                      className="mt-0.5 h-4 w-4 shrink-0 text-green-600"
                    />
                  ) : (
                    <Circle aria-label="To do" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  )}
                  <span className={r.met ? 'text-slate-500' : 'text-slate-900'}>{r.label}</span>
                  {!r.met && SECTION_TAB[r.section] !== 'summary' ? (
                    <button
                      className="border-0 bg-transparent p-0 text-[13px] font-medium text-brand-600 hover:text-brand-700"
                      onClick={() => onTab(SECTION_TAB[r.section])}
                      type="button"
                    >
                      Open {SECTION_TAB[r.section]}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                disabled={unmet.length > 0 || !uc.canEdit}
                icon={ArrowRight}
                loading={action.busy}
                onClick={async () => {
                  const next = await action.run(() => aiGovApi.advance(uc.id));
                  if (next) {
                    onChange(next);
                    showToast({
                      variant: 'success',
                      message: `Moved to ${STAGE_LABELS[next.stage]}`,
                    });
                  }
                }}
                variant="primary"
              >
                Move to {STAGE_LABELS[uc.nextStage]}
              </Button>
              {unmet.length ? (
                <span className="text-xs text-slate-500">
                  {unmet.length} requirement{unmet.length === 1 ? '' : 's'} left
                </span>
              ) : null}
            </div>
          </div>
        ) : uc.stage === 'production' ? (
          <div className="flex flex-wrap items-center gap-3" data-testid="review-box">
            <p className="m-0 min-w-0 flex-1 text-[13px] text-slate-700">
              In production. Last reviewed {day(uc.lastAttestedAt)}
              {uc.lastAttestedBy ? ` by ${uc.lastAttestedBy}` : ''}.{' '}
              <span className={overdue ? 'font-medium text-red-700' : undefined}>
                Next review {overdue ? 'was due' : 'due'} {day(uc.nextReviewAt)}.
              </span>
            </p>
            <Button onClick={() => setAttesting(true)} variant={overdue ? 'primary' : 'secondary'}>
              Review and attest
            </Button>
          </div>
        ) : (
          <p className="m-0 text-[13px] text-slate-600">
            This use case is retired. Its record is kept.
          </p>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-4">
          <p className="m-0 text-[13px] text-slate-600">Governance score</p>
          <div className="mt-1" data-testid="score">
            <Score size="lg" value={uc.score} />
          </div>
          <p className="m-0 mt-2 text-xs text-slate-500">
            How completely this use case follows the governance policy: information, assets,
            evidence and controls, 25 points each.
          </p>
          <dl className="m-0 mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            <dt className="text-slate-500">Kind</dt>
            <dd className="m-0 text-slate-900">{TYPE_LABELS[uc.type]}</dd>
            <dt className="text-slate-500">Risk tier</dt>
            <dd className="m-0">
              <TierBadge tier={uc.tier} />
            </dd>
            <dt className="text-slate-500">EU AI Act</dt>
            <dd className="m-0 text-slate-900">
              {uc.euCategory ? EU_LABELS[uc.euCategory] : 'Not assessed'}
            </dd>
            <dt className="text-slate-500">Evaluation</dt>
            <dd className="m-0">
              <EvalBadge status={uc.evaluationStatus} />
            </dd>
            <dt className="text-slate-500">Risks</dt>
            <dd className="m-0 text-slate-900">
              {uc.riskList.length} ({uc.riskList.filter((r) => r.status === 'open').length} open)
            </dd>
          </dl>
        </Card>
        <Card>
          <ul className="m-0 grid list-none divide-y divide-slate-100 p-0">
            {uc.scoreParts.map((p) => (
              <li className="px-4 py-3" key={p.id}>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-medium text-slate-900">{p.label}</span>
                  <span className="font-mono tabular-nums text-slate-700">
                    {p.points} / {p.max}
                  </span>
                </div>
                <ul className="m-0 mt-1.5 grid list-none gap-1 p-0">
                  {p.checks.map((c) => (
                    <li className="flex items-center gap-1.5 text-xs" key={c.label}>
                      {c.met ? (
                        <CheckCircle2 aria-label="Met" className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <XCircle aria-label="Not met" className="h-3.5 w-3.5 text-slate-400" />
                      )}
                      <span className={c.met ? 'text-slate-600' : 'text-slate-900'}>{c.label}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {uc.openIssues.length ? (
        <Card>
          <CardHeader
            title={`${uc.openIssues.length} open issue${uc.openIssues.length === 1 ? '' : 's'}`}
          />
          <ul className="m-0 list-none divide-y divide-slate-100 p-0">
            {uc.openIssues.map((i) => (
              <li className="flex items-center gap-2 px-4 py-2 text-[13px]" key={i.id}>
                <SeverityBadge severity={i.severity} />
                <button
                  className="min-w-0 flex-1 truncate border-0 bg-transparent p-0 text-left text-slate-900 hover:text-brand-700"
                  onClick={() => onTab('issues')}
                  type="button"
                >
                  {i.title}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {attesting ? (
        <Modal
          footer={
            <>
              <Button onClick={() => setAttesting(false)} variant="secondary">
                Cancel
              </Button>
              <Button
                loading={action.busy}
                onClick={async () => {
                  const next = await action.run(() => aiGovApi.attest(uc.id, note));
                  if (next) {
                    onChange(next);
                    setAttesting(false);
                    showToast({ variant: 'success', message: 'Review recorded' });
                  }
                }}
                variant="primary"
              >
                I confirm this is still correct
              </Button>
            </>
          }
          maxWidth="max-w-[520px]"
          onClose={() => setAttesting(false)}
          title="Periodic review"
        >
          <div className="grid gap-3">
            <ErrorNote message={action.error} />
            <p className="m-0 text-[13px] text-slate-700">
              By attesting you confirm that the factsheet, the risks and their controls, and the
              linked agents and prompts still describe how {uc.name} works today.
            </p>
            <Field label="Notes (optional)">
              <Textarea
                aria-label="Review notes"
                maxLength={1000}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                value={note}
              />
            </Field>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------

const EU_GROUPS: Array<{ id: string; title: string; hint: string }> = [
  { id: 'scope', title: 'Scope', hint: '' },
  {
    id: 'prohibited',
    title: 'Prohibited practices (Article 5)',
    hint: 'A "yes" to any of these means the use case cannot go ahead.',
  },
  { id: 'high_risk', title: 'High-risk uses (Article 6 and Annex III)', hint: '' },
  { id: 'exception', title: 'Exception for narrow tasks (Article 6(3))', hint: '' },
  { id: 'transparency', title: 'Transparency (Article 50)', hint: '' },
  { id: 'role', title: 'Your role', hint: '' },
];

function Assessment({ uc, catalog, onChange }: Props): JSX.Element {
  const [risk, setRisk] = useState<Record<string, string>>(uc.riskAnswers);
  const [eu, setEu] = useState<Record<string, string | boolean>>(uc.euAnswers);
  const action = useAction();
  const { showToast } = useToast();
  const locked = !uc.canEdit || uc.stage === 'retired';
  const outOfScope = eu.in_eu === false;
  const annex = typeof eu.high_risk_area === 'string' && eu.high_risk_area !== 'none';
  const euVisible = catalog.euQuestions.filter(
    (q) => q.group === 'scope' || (!outOfScope && (q.group !== 'exception' || annex)),
  );
  const left =
    catalog.riskQuestions.filter((q) => !risk[q.id]).length +
    euVisible.filter((q) => eu[q.id] === undefined).length;
  const save = async (complete: boolean) => {
    const next = await action.run(() =>
      aiGovApi.saveAssessment(uc.id, { riskAnswers: risk, euAnswers: eu, complete }),
    );
    if (next) {
      onChange(next);
      showToast({
        variant: 'success',
        message: complete ? `Assessed: ${TIER_LABELS[next.tier ?? 'low']}` : 'Draft saved',
      });
    }
  };
  const a = uc.assessment;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4" data-testid="assessment">
      <ErrorNote message={action.error} />
      {a ? (
        <Card className="grid gap-3 p-4" data-testid="assessment-result">
          <div className="flex flex-wrap items-center gap-2">
            <TierBadge tier={a.tier} />
            <EuBadge category={a.eu.category} />
            <span className="text-xs text-slate-500">
              Assessed {day(a.completedAt)} by {a.by}
            </span>
          </div>
          <ul className="m-0 grid list-disc gap-0.5 pl-5 text-[13px] text-slate-700">
            {[...a.reasons, ...a.eu.reasons].map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {a.eu.obligations.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
                <caption className="pb-1 text-left text-xs font-medium text-slate-600">
                  What the EU AI Act asks of you as {a.eu.role ?? 'provider'}
                </caption>
                <tbody>
                  {a.eu.obligations.map((o) => (
                    <tr className="border-t border-slate-100" key={o.article + o.title}>
                      <td className="whitespace-nowrap py-1.5 pr-3 font-mono text-xs text-slate-500">
                        {o.article}
                      </td>
                      <td className="py-1.5 pr-3 font-medium text-slate-900">{o.title}</td>
                      <td className="py-1.5 text-slate-600">{o.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <CardHeader
          description="Eight questions set the internal risk tier, which decides who must approve and how strict the evaluation thresholds are."
          title="Risk questionnaire"
        />
        <div className="grid gap-4 p-4">
          {catalog.riskQuestions.map((q) => (
            <fieldset className="m-0 border-0 p-0" disabled={locked} key={q.id}>
              <legend className="mb-1 p-0 text-[13px] font-medium text-slate-900">{q.text}</legend>
              <div className="grid gap-1">
                {q.options.map((o) => (
                  <Radio
                    checked={risk[q.id] === o.value}
                    key={o.value}
                    label={o.label}
                    name={`risk-${q.id}`}
                    onChange={() => setRisk({ ...risk, [q.id]: o.value })}
                  />
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          description="Works out whether the EU AI Act applies, the risk category and the obligations that follow. It is a guide, not legal advice."
          title="EU AI Act applicability"
        />
        <div className="grid gap-5 p-4">
          {EU_GROUPS.map((g) => {
            const questions = euVisible.filter((q) => q.group === g.id);
            if (!questions.length) return null;
            return (
              <section key={g.id}>
                <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {g.title}
                </h3>
                {g.hint ? <p className="m-0 mt-0.5 text-xs text-slate-500">{g.hint}</p> : null}
                <div className="mt-2 grid gap-3">
                  {questions.map((q) => (
                    <fieldset className="m-0 border-0 p-0" disabled={locked} key={q.id}>
                      <legend className="mb-1 p-0 text-[13px] text-slate-900">{q.text}</legend>
                      {q.kind === 'boolean' ? (
                        <div className="flex gap-5">
                          <Radio
                            checked={eu[q.id] === true}
                            label="Yes"
                            name={`eu-${q.id}`}
                            onChange={() => setEu({ ...eu, [q.id]: true })}
                          />
                          <Radio
                            checked={eu[q.id] === false}
                            label="No"
                            name={`eu-${q.id}`}
                            onChange={() => setEu({ ...eu, [q.id]: false })}
                          />
                        </div>
                      ) : (
                        <div className="grid gap-1">
                          {(q.options ?? []).map((o) => (
                            <Radio
                              checked={eu[q.id] === o.value}
                              key={o.value}
                              label={o.label}
                              name={`eu-${q.id}`}
                              onChange={() => setEu({ ...eu, [q.id]: o.value })}
                            />
                          ))}
                        </div>
                      )}
                    </fieldset>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
        {!locked ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
            <Button
              disabled={left > 0}
              loading={action.busy}
              onClick={() => void save(true)}
              variant="primary"
            >
              {a ? 'Re-assess' : 'Complete assessment'}
            </Button>
            <Button loading={action.busy} onClick={() => void save(false)}>
              Save draft
            </Button>
            <span className="text-xs text-slate-500" data-testid="questions-left">
              {left > 0
                ? `${left} question${left === 1 ? '' : 's'} left`
                : 'All questions answered'}
              {a ? '. A different risk tier supersedes earlier approvals.' : ''}
            </span>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Factsheet
// ---------------------------------------------------------------------------

function Factsheet({ uc, catalog, onChange }: Props): JSX.Element {
  const [sheet, setSheet] = useState<Record<string, string>>(uc.factsheet);
  const [name, setName] = useState(uc.name);
  const [description, setDescription] = useState(uc.description);
  const [links, setLinks] = useState(uc.links);
  const [assets, setAssets] = useState<Awaited<ReturnType<typeof aiGovApi.assets>> | null>(null);
  const action = useAction();
  const { showToast } = useToast();
  const locked = !uc.canEdit || uc.stage === 'retired';
  useEffect(() => {
    aiGovApi
      .assets()
      .then(setAssets)
      .catch(() => setAssets({ agents: [], prompts: [], vendors: [] }));
  }, []);
  const groups: Array<{
    key: 'agentIds' | 'promptIds' | 'vendorIds';
    label: string;
    items: Array<{ id: string; name: string }>;
  }> = [
    { key: 'agentIds', label: 'Agents', items: assets?.agents ?? [] },
    { key: 'promptIds', label: 'Prompts', items: assets?.prompts ?? [] },
    { key: 'vendorIds', label: 'Vendors', items: assets?.vendors ?? [] },
  ];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4" data-testid="factsheet">
      <ErrorNote message={action.error} />
      <Card>
        <CardHeader
          actions={
            <Button
              icon={Download}
              onClick={() =>
                aiGovApi
                  .downloadFactsheet(uc.id, uc.ref)
                  .catch((e) => showToast({ variant: 'error', message: toDisplayErrorMessage(e) }))
              }
              size="sm"
            >
              Download factsheet
            </Button>
          }
          description="The facts an auditor, a regulator or a new team member needs about this use case."
          title="Factsheet"
        />
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <Field className="sm:col-span-2" label="Name">
            <Input
              aria-label="Name"
              disabled={locked}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              value={name}
            />
          </Field>
          <Field className="sm:col-span-2" label="Description">
            <Textarea
              aria-label="Description"
              disabled={locked}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              value={description}
            />
          </Field>
          {catalog.factsheetFields.map((f) => {
            const short = ['modelProvider', 'modelName', 'modelVersion'].includes(f.key);
            return (
              <Field
                className={short ? undefined : 'sm:col-span-2'}
                key={f.key}
                label={f.required ? `${f.label} (required)` : f.label}
              >
                {short ? (
                  <Input
                    aria-label={f.label}
                    disabled={locked}
                    maxLength={200}
                    onChange={(e) => setSheet({ ...sheet, [f.key]: e.target.value })}
                    value={sheet[f.key] ?? ''}
                  />
                ) : (
                  <Textarea
                    aria-label={f.label}
                    disabled={locked}
                    maxLength={2000}
                    onChange={(e) => setSheet({ ...sheet, [f.key]: e.target.value })}
                    rows={2}
                    value={sheet[f.key] ?? ''}
                  />
                )}
              </Field>
            );
          })}
        </div>
      </Card>
      <Card>
        <CardHeader
          description="What this use case runs on. Calls made by linked agents and prompts feed its error rate and latency."
          title="Linked assets"
        />
        <div className="grid gap-4 p-4 sm:grid-cols-3" data-testid="linked-assets">
          {groups.map((g) => (
            <div key={g.key}>
              <p className="m-0 mb-1 text-xs font-medium text-slate-600">{g.label}</p>
              {g.items.length ? (
                <div className="grid max-h-48 gap-1 overflow-y-auto">
                  {g.items.map((item) => (
                    <Checkbox
                      checked={links[g.key].includes(item.id)}
                      disabled={locked}
                      key={item.id}
                      label={item.name}
                      onChange={() =>
                        setLinks({
                          ...links,
                          [g.key]: links[g.key].includes(item.id)
                            ? links[g.key].filter((x) => x !== item.id)
                            : [...links[g.key], item.id],
                        })
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="m-0 text-xs text-slate-500">
                  {assets ? `No ${g.label.toLowerCase()} in this workspace.` : 'Loading…'}
                </p>
              )}
            </div>
          ))}
        </div>
        {!locked ? (
          <div className="border-t border-slate-100 px-4 py-3">
            <Button
              disabled={name.trim().length < 3}
              loading={action.busy}
              onClick={async () => {
                const next = await action.run(() =>
                  aiGovApi.update(uc.id, {
                    name: name.trim(),
                    description,
                    factsheet: sheet,
                    links,
                  }),
                );
                if (next) {
                  onChange(next);
                  showToast({ variant: 'success', message: 'Factsheet saved' });
                }
              }}
              variant="primary"
            >
              Save factsheet
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Risks
// ---------------------------------------------------------------------------

const LEVEL_TONE = {
  low: 'success',
  medium: 'warning',
  high: 'orange',
  critical: 'danger',
} as const;
const ONE_TO_FIVE = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }));

function RiskEditor({
  uc,
  risk,
  catalog,
  onClose,
  onChange,
}: {
  uc: UseCase;
  risk: Risk;
  catalog: Catalog;
  onClose: () => void;
  onChange: (next: UseCase) => void;
}): JSX.Element {
  const [likelihood, setLikelihood] = useState(String(risk.likelihood));
  const [impact, setImpact] = useState(String(risk.impact));
  const [treatment, setTreatment] = useState<string>(risk.treatment ?? 'mitigate');
  const [controls, setControls] = useState<string[]>(risk.controls);
  const [rl, setRl] = useState(String(risk.residualLikelihood ?? Math.max(1, risk.likelihood - 1)));
  const [ri, setRi] = useState(String(risk.residualImpact ?? risk.impact));
  const [note, setNote] = useState(risk.note);
  const action = useAction();
  const mitigate = treatment === 'mitigate';
  return (
    <Modal
      dismissOnBackdrop={false}
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            loading={action.busy}
            onClick={async () => {
              const next = await action.run(() =>
                aiGovApi.updateRisk(uc.id, risk.id, {
                  likelihood: Number(likelihood),
                  impact: Number(impact),
                  treatment,
                  note,
                  ...(mitigate
                    ? { controls, residualLikelihood: Number(rl), residualImpact: Number(ri) }
                    : {}),
                }),
              );
              if (next) {
                onChange(next);
                onClose();
              }
            }}
            variant="primary"
          >
            Save risk
          </Button>
        </>
      }
      maxWidth="max-w-[620px]"
      onClose={onClose}
      title={risk.title}
    >
      <div className="grid gap-3" data-testid="risk-editor">
        <ErrorNote message={action.error} />
        {risk.description ? (
          <p className="m-0 text-[13px] text-slate-600">{risk.description}</p>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <Field hint="1 rare, 5 almost certain" label="Likelihood">
            <Select
              aria-label="Likelihood"
              onValueChange={setLikelihood}
              options={ONE_TO_FIVE}
              value={likelihood}
            />
          </Field>
          <Field hint="1 negligible, 5 severe" label="Impact">
            <Select
              aria-label="Impact"
              onValueChange={setImpact}
              options={ONE_TO_FIVE}
              value={impact}
            />
          </Field>
        </div>
        <Field label="Treatment">
          <Select
            aria-label="Treatment"
            onValueChange={setTreatment}
            options={[
              { value: 'mitigate', label: 'Mitigate: reduce it with controls' },
              { value: 'accept', label: 'Accept: live with it' },
              { value: 'avoid', label: 'Avoid: change the design so it cannot happen' },
              { value: 'transfer', label: 'Transfer: a contract or insurance covers it' },
            ]}
            value={treatment}
          />
        </Field>
        {mitigate ? (
          <>
            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-1 p-0 text-xs font-medium text-slate-600">
                Controls in place (choose at least one)
              </legend>
              <div className="grid max-h-44 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {Object.entries(catalog.controls).map(([id, label]) => (
                  <Checkbox
                    checked={controls.includes(id)}
                    key={id}
                    label={label}
                    onChange={() =>
                      setControls(
                        controls.includes(id)
                          ? controls.filter((c) => c !== id)
                          : [...controls, id],
                      )
                    }
                  />
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Likelihood after controls">
                <Select
                  aria-label="Likelihood after controls"
                  onValueChange={setRl}
                  options={ONE_TO_FIVE}
                  value={rl}
                />
              </Field>
              <Field label="Impact after controls">
                <Select
                  aria-label="Impact after controls"
                  onValueChange={setRi}
                  options={ONE_TO_FIVE}
                  value={ri}
                />
              </Field>
            </div>
          </>
        ) : null}
        <Field
          hint={mitigate ? undefined : 'At least 10 characters.'}
          label={mitigate ? 'Notes (optional)' : 'Why, and who agreed?'}
        >
          <Textarea
            aria-label="Risk notes"
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            value={note}
          />
        </Field>
      </div>
    </Modal>
  );
}

function Risks({ uc, catalog, onChange }: Props): JSX.Element {
  const [suggested, setSuggested] = useState<SuggestedRisk[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [editing, setEditing] = useState<Risk | null>(null);
  const [custom, setCustom] = useState('');
  const action = useAction();
  const confirm = useConfirm();
  const locked = !uc.canEdit || uc.stage === 'retired';
  useEffect(() => {
    aiGovApi
      .suggestedRisks(uc.id)
      .then(setSuggested)
      .catch(() => setSuggested([]));
  }, [uc.id, uc.riskList.length, uc.assessment?.completedAt]);
  const fresh = (suggested ?? []).filter((s) => !s.added);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4" data-testid="risks">
      <ErrorNote message={action.error} />
      <Card>
        <CardHeader
          description="Each risk is scored before and after controls. A risk is treated once it is mitigated with controls, accepted with a reason, avoided or transferred."
          title={`Risk register (${uc.riskList.length})`}
        />
        {uc.riskList.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  {['Risk', 'Before controls', 'Treatment', 'Now', 'Status', ''].map((h) => (
                    <th
                      aria-label={h || 'Actions'}
                      className="px-4 py-2 font-medium"
                      key={h}
                      scope="col"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uc.riskList.map((r) => (
                  <tr
                    className="border-b border-slate-100 last:border-0"
                    data-testid="risk-row"
                    key={r.id}
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-slate-900">{r.title}</span>
                      <span className="block text-xs text-slate-500">
                        {r.code ? `${r.code} · ` : ''}
                        {catalog.riskCategories[r.category] ?? r.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-700">
                      {r.likelihood} × {r.impact} = {r.likelihood * r.impact}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {r.treatment
                        ? r.treatment.charAt(0).toUpperCase() + r.treatment.slice(1)
                        : '—'}
                      {r.controls.length ? (
                        <span className="block text-xs text-slate-500">
                          {r.controls.length} control{r.controls.length === 1 ? '' : 's'}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={LEVEL_TONE[r.level]}>
                        {r.level.charAt(0).toUpperCase() + r.level.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={r.status === 'open' ? 'warning' : 'success'}>
                        {r.status === 'open'
                          ? 'Open'
                          : r.status === 'mitigated'
                            ? 'Mitigated'
                            : 'Accepted'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {!locked ? (
                        <span className="inline-flex gap-1">
                          <Button
                            aria-label={`Treat ${r.title}`}
                            onClick={() => setEditing(r)}
                            size="sm"
                          >
                            {r.status === 'open' ? 'Treat' : 'Edit'}
                          </Button>
                          <Button
                            aria-label={`Remove ${r.title}`}
                            icon={Trash2}
                            onClick={async () => {
                              if (
                                !(await confirm({
                                  title: `Remove "${r.title}"?`,
                                  message: 'The removal is kept in the history.',
                                  confirmText: 'Remove risk',
                                  type: 'danger',
                                }))
                              )
                                return;
                              const next = await action.run(() => aiGovApi.removeRisk(uc.id, r.id));
                              if (next) onChange(next);
                            }}
                            size="icon-sm"
                            variant="ghost"
                          />
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="m-0 px-4 py-6 text-center text-[13px] text-slate-500">
            No risks recorded yet. Add the suggested ones below, or your own.
          </p>
        )}
      </Card>

      {!locked ? (
        <Card>
          <CardHeader
            description={
              uc.assessment
                ? 'From the risk library, chosen to fit the kind of AI and your assessment answers.'
                : 'Complete the assessment to get suggestions that fit this use case.'
            }
            title="Suggested risks"
          />
          <div className="grid gap-2 p-4" data-testid="suggested-risks">
            {suggested == null ? (
              <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
            ) : fresh.length ? (
              <>
                {fresh.map((s) => (
                  <Checkbox
                    checked={picked.includes(s.code)}
                    description={`${s.categoryLabel}. ${s.description}`}
                    key={s.code}
                    label={s.title}
                    onChange={() =>
                      setPicked(
                        picked.includes(s.code)
                          ? picked.filter((c) => c !== s.code)
                          : [...picked, s.code],
                      )
                    }
                  />
                ))}
                <div className="mt-1 flex flex-wrap gap-2">
                  <Button
                    disabled={!picked.length}
                    icon={Plus}
                    loading={action.busy}
                    onClick={async () => {
                      const next = await action.run(() =>
                        aiGovApi.addRisks(uc.id, { codes: picked }),
                      );
                      if (next) {
                        setPicked([]);
                        onChange(next);
                      }
                    }}
                    variant="primary"
                  >
                    Add {picked.length || ''} selected
                  </Button>
                  <Button
                    loading={action.busy}
                    onClick={async () => {
                      const next = await action.run(() =>
                        aiGovApi.addRisks(uc.id, { codes: fresh.map((s) => s.code) }),
                      );
                      if (next) {
                        setPicked([]);
                        onChange(next);
                      }
                    }}
                  >
                    Add all {fresh.length}
                  </Button>
                </div>
              </>
            ) : (
              <p className="m-0 text-[13px] text-slate-500">
                Every suggested risk is in the register.
              </p>
            )}
            <div className="mt-2 flex gap-2 border-t border-slate-100 pt-3">
              <Input
                aria-label="Custom risk title"
                maxLength={160}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Add your own risk"
                value={custom}
              />
              <Button
                disabled={custom.trim().length < 3}
                onClick={async () => {
                  const next = await action.run(() =>
                    aiGovApi.addRisks(uc.id, { custom: { title: custom.trim() } }),
                  );
                  if (next) {
                    setCustom('');
                    onChange(next);
                  }
                }}
              >
                Add
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
      {editing ? (
        <RiskEditor
          catalog={catalog}
          onChange={onChange}
          onClose={() => setEditing(null)}
          risk={editing}
          uc={uc}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evaluations
// ---------------------------------------------------------------------------

function LogModal({
  uc,
  onClose,
  onLogged,
}: {
  uc: UseCase;
  onClose: () => void;
  onLogged: () => void;
}): JSX.Element {
  const [text, setText] = useState('');
  const action = useAction();
  const { showToast } = useToast();
  const [parseError, setParseError] = useState<string | null>(null);
  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={!text.trim()}
            loading={action.busy}
            onClick={async () => {
              let records: Array<Record<string, unknown>>;
              try {
                const parsed = JSON.parse(text) as unknown;
                records = Array.isArray(parsed)
                  ? (parsed as Array<Record<string, unknown>>)
                  : [parsed as Record<string, unknown>];
                setParseError(null);
              } catch {
                setParseError(
                  'This is not valid JSON. Paste a list like [{"input": "...", "output": "..."}].',
                );
                return;
              }
              const out = await action.run(() => aiGovApi.ingest(uc.id, records));
              if (out) {
                showToast({
                  variant: 'success',
                  message: `${out.accepted} interaction${out.accepted === 1 ? '' : 's'} logged${out.flagged ? `, ${out.flagged} flagged` : ''}`,
                });
                onLogged();
              }
            }}
            variant="primary"
          >
            Log interactions
          </Button>
        </>
      }
      maxWidth="max-w-[640px]"
      onClose={onClose}
      title="Log interactions"
    >
      <div className="grid gap-3">
        <ErrorNote message={parseError ?? action.error} />
        <p className="m-0 text-[13px] text-slate-700">
          Your application sends each AI interaction to Pristine. Personal data is masked before it
          is stored; the scores are computed first.
        </p>
        <pre className="m-0 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
          {`POST /api/ai-governance/use-cases/${uc.id}/records
Authorization: Bearer <agent key>

{ "records": [{
    "input": "the user's question",
    "output": "the model's answer",
    "context": "retrieved text, for faithfulness (optional)",
    "expected": "the right answer, for correctness (optional)",
    "feedback": "up" | "down" (optional),
    "latencyMs": 820 (optional)
}] }`}
        </pre>
        <Field
          hint="Up to 200 at a time. Useful for a test set during validation."
          label="Or paste records as JSON"
        >
          <Textarea
            aria-label="Records as JSON"
            className="font-mono text-xs"
            onChange={(e) => setText(e.target.value)}
            placeholder='[{"input": "What is the refund policy?", "output": "Refunds are available within 30 days."}]'
            rows={6}
            value={text}
          />
        </Field>
      </div>
    </Modal>
  );
}

function Evaluations({ uc, catalog, onChange }: Props): JSX.Element {
  const action = useAction();
  const { showToast } = useToast();
  const [logging, setLogging] = useState(false);
  const [flagged, setFlagged] = useState<{ total: number; records: RecordRow[] } | null>(null);
  const loadFlagged = useCallback(() => {
    aiGovApi
      .records(uc.id, true)
      .then(setFlagged)
      .catch(() => setFlagged({ total: 0, records: [] }));
  }, [uc.id]);
  useEffect(loadFlagged, [loadFlagged, uc.evaluation?.ranAt]);
  const ev = uc.evaluation;
  const describe = (key: string) => catalog.metrics.find((m) => m.key === key)?.description ?? '';
  const run = async () => {
    const next = await action.run(() => aiGovApi.evaluate(uc.id));
    if (next) {
      onChange(next);
      showToast({
        variant: next.evaluation?.status === 'fail' ? 'error' : 'success',
        message:
          next.evaluation?.status === 'pass'
            ? 'Evaluation passed'
            : next.evaluation?.status === 'fail'
              ? 'Evaluation failed'
              : 'Not enough data to evaluate yet',
      });
    }
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4" data-testid="evaluations">
      <ErrorNote message={action.error} />
      <Card>
        <CardHeader
          actions={
            <span className="flex flex-wrap gap-2">
              <Button onClick={() => setLogging(true)} size="sm">
                Log interactions
              </Button>
              <Button
                disabled={uc.stage === 'retired'}
                icon={Play}
                loading={action.busy}
                onClick={() => void run()}
                size="sm"
                variant="primary"
              >
                Run evaluation
              </Button>
            </span>
          }
          description={
            ev
              ? `Last run ${new Date(ev.ranAt).toLocaleString()} over ${ev.records} interaction${ev.records === 1 ? '' : 's'} from the previous ${ev.windowDays} days. In validation and production it also runs every hour.`
              : 'Scores logged interactions for safety, quality and drift against thresholds set by the risk tier.'
          }
          title={
            <span className="inline-flex items-center gap-2">
              Evaluation <EvalBadge status={ev?.status ?? null} />
            </span>
          }
        />
        {ev ? (
          <div className="overflow-x-auto">
            <table
              className="w-full min-w-[640px] border-collapse text-left text-[13px]"
              data-testid="metric-table"
            >
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  {['Metric', 'Value', 'Should be', 'Samples', 'Result'].map((h) => (
                    <th className="px-4 py-2 font-medium" key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ev.results.map((r) => (
                  <tr
                    className="border-b border-slate-100 last:border-0"
                    data-metric={r.key}
                    key={r.key}
                  >
                    <td className="px-4 py-2">
                      <span className="font-medium text-slate-900">{r.label}</span>
                      <span className="block text-xs text-slate-500">{describe(r.key)}</span>
                    </td>
                    <td className="px-4 py-2 font-mono tabular-nums text-slate-900">
                      {formatMetric(r)}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{formatThreshold(r)}</td>
                    <td className="px-4 py-2 font-mono tabular-nums text-slate-600">{r.samples}</td>
                    <td className="px-4 py-2">
                      {r.status === 'pass' ? (
                        <Badge tone="success">
                          <CheckCircle2 aria-hidden className="h-3 w-3" /> Pass
                        </Badge>
                      ) : r.status === 'fail' ? (
                        <Badge tone="danger">
                          <XCircle aria-hidden className="h-3 w-3" /> Fail
                        </Badge>
                      ) : (
                        <Badge tone="neutral">Not enough data</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="m-0 px-4 py-6 text-center text-[13px] text-slate-500">
            Not evaluated yet. Log at least 10 interactions, then run an evaluation.
          </p>
        )}
        <p className="m-0 flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
          <span>
            {uc.baseline
              ? `Drift is measured against ${uc.baseline.records} interactions captured ${day(uc.baseline.at)}.`
              : 'No drift baseline yet. One is captured when the use case goes to production.'}
          </span>
          {uc.canAdmin && uc.stage !== 'retired' ? (
            <button
              className="border-0 bg-transparent p-0 text-xs font-medium text-brand-600 hover:text-brand-700"
              onClick={async () => {
                const next = await action.run(() => aiGovApi.setBaseline(uc.id));
                if (next) {
                  onChange(next);
                  showToast({ variant: 'success', message: 'Drift baseline set' });
                }
              }}
              type="button"
            >
              {uc.baseline ? 'Reset baseline to current inputs' : 'Set baseline now'}
            </button>
          ) : null}
        </p>
      </Card>

      <Card>
        <CardHeader
          description="Interactions with personal data or harmful content in the output, or an injection attempt in the input. Text is shown masked."
          title={`Flagged interactions${flagged ? ` (${flagged.records.length}${flagged.records.length === 50 ? '+' : ''} of ${flagged.total} logged)` : ''}`}
        />
        {flagged == null ? (
          <div className="m-4 h-16 animate-pulse rounded-lg bg-slate-100" />
        ) : flagged.records.length ? (
          <ul className="m-0 list-none divide-y divide-slate-100 p-0" data-testid="flagged-records">
            {flagged.records.map((r) => (
              <li className="grid gap-1 px-4 py-2.5 text-[13px]" key={r.id}>
                <span className="flex flex-wrap items-center gap-1.5">
                  {r.flags.map((f) => (
                    <Badge key={f} tone="danger">
                      {f}
                    </Badge>
                  ))}
                  <span className="text-xs text-slate-500">{new Date(r.at).toLocaleString()}</span>
                </span>
                <span className="text-slate-600">
                  <span className="font-medium text-slate-900">In:</span> {r.input.slice(0, 240)}
                </span>
                <span className="text-slate-600">
                  <span className="font-medium text-slate-900">Out:</span> {r.output.slice(0, 240)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 px-4 py-6 text-center text-[13px] text-slate-500">
            {flagged.total
              ? `Nothing flagged in ${flagged.total} logged interactions.`
              : 'No interactions logged yet.'}
          </p>
        )}
      </Card>
      {logging ? (
        <LogModal
          onClose={() => setLogging(false)}
          onLogged={() => {
            setLogging(false);
            loadFlagged();
            void run();
          }}
          uc={uc}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

const GATE_TITLE: Record<Gate, string> = {
  development: 'Gate 1: approval to start development',
  production: 'Gate 2: approval to go to production',
};

function Approvals({ uc, onChange }: Props): JSX.Element {
  const action = useAction();
  const [rejecting, setRejecting] = useState<{ gate: Gate; role: ApproverRole } | null>(null);
  const decide = async (
    gate: Gate,
    role: ApproverRole,
    decision: 'approved' | 'rejected',
    comment?: string,
  ) => {
    const next = await action.run(() => aiGovApi.decide(uc.id, { gate, role, decision, comment }));
    if (next) onChange(next);
    return Boolean(next);
  };
  if (!uc.assessment)
    return (
      <Card className="p-6 text-center text-[13px] text-slate-500">
        Complete the assessment first. The risk tier decides who must approve.
      </Card>
    );
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4" data-testid="approvals">
      <ErrorNote message={action.error} />
      {uc.gates.map((g) => (
        <Card data-gate={g.gate} key={g.gate}>
          <CardHeader
            description={
              g.required.length
                ? g.pending.length
                  ? `${g.pending.length} sign-off${g.pending.length === 1 ? '' : 's'} still needed.`
                  : 'All sign-offs are in.'
                : 'No sign-off is possible for a prohibited use case.'
            }
            title={GATE_TITLE[g.gate]}
          />
          <ul className="m-0 list-none divide-y divide-slate-100 p-0">
            {g.required.map((r) => {
              const approved = r.signoff?.decision === 'approved';
              return (
                <li
                  className="flex flex-wrap items-center gap-3 px-4 py-2.5"
                  data-role={r.role}
                  key={r.role}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-slate-900">{r.label}</span>
                    <span className="text-xs text-slate-500">
                      {r.signoff
                        ? `${approved ? 'Approved' : 'Rejected'} by ${r.signoff.byName} on ${day(r.signoff.at)}${r.signoff.comment ? `: ${r.signoff.comment}` : ''}`
                        : 'Waiting'}
                    </span>
                  </span>
                  {approved ? (
                    <Badge tone="success">
                      <CheckCircle2 aria-hidden className="h-3 w-3" /> Approved
                    </Badge>
                  ) : r.signoff ? (
                    <Badge tone="danger">
                      <XCircle aria-hidden className="h-3 w-3" /> Rejected
                    </Badge>
                  ) : null}
                  {!approved && r.canSign && uc.stage !== 'retired' ? (
                    <span className="inline-flex gap-1.5">
                      <Button
                        aria-label={`Approve as ${r.label}`}
                        loading={action.busy}
                        onClick={() => void decide(g.gate, r.role, 'approved')}
                        size="sm"
                        variant="primary"
                      >
                        Approve
                      </Button>
                      <Button
                        aria-label={`Reject as ${r.label}`}
                        onClick={() => setRejecting({ gate: g.gate, role: r.role })}
                        size="sm"
                      >
                        Reject
                      </Button>
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
      {uc.approvals.some((a) => a.void) ? (
        <p className="m-0 text-xs text-slate-500">
          {uc.approvals.filter((a) => a.void).length} earlier sign-off(s) were superseded by a
          re-assessment or by sending the use case back. They are kept in the factsheet.
        </p>
      ) : null}
      {rejecting ? (
        <ReasonModal
          confirm="Reject"
          danger
          label="Why are you rejecting it?"
          onClose={() => setRejecting(null)}
          onSubmit={(reason) => decide(rejecting.gate, rejecting.role, 'rejected', reason)}
          title="Reject"
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

const TABS: Array<{ value: DetailTab; label: string }> = [
  { value: 'summary', label: 'Summary' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'factsheet', label: 'Factsheet' },
  { value: 'risks', label: 'Risks' },
  { value: 'evaluations', label: 'Evaluations' },
  { value: 'approvals', label: 'Approvals' },
  { value: 'issues', label: 'Issues' },
  { value: 'history', label: 'History' },
];

type Transition = 'hold' | 'resume' | 'reject' | 'retire' | 'send_back';
const TRANSITIONS: Record<
  Exclude<Transition, 'resume'>,
  { title: string; label: string; confirm: string; danger?: boolean }
> = {
  hold: { title: 'Put on hold', label: 'Why is it on hold?', confirm: 'Put on hold' },
  send_back: { title: 'Send back one stage', label: 'What needs to change?', confirm: 'Send back' },
  reject: {
    title: 'Reject this use case',
    label: 'Why is it rejected?',
    confirm: 'Reject',
    danger: true,
  },
  retire: {
    title: 'Retire this use case',
    label: 'Why is it retired?',
    confirm: 'Retire',
    danger: true,
  },
};

export function UseCaseDetail({
  id,
  catalog,
  tab,
  onTab,
  onBack,
}: {
  id: string;
  catalog: Catalog;
  tab: DetailTab;
  onTab: (t: DetailTab) => void;
  onBack: () => void;
}): JSX.Element {
  const [uc, setUc] = useState<UseCase | null>(null);
  const [missing, setMissing] = useState(false);
  const [transition, setTransition] = useState<Exclude<Transition, 'resume'> | null>(null);
  const { showToast } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const load = useCallback(() => {
    aiGovApi
      .get(id)
      .then(setUc)
      .catch(() => setMissing(true));
  }, [id]);
  useEffect(load, [load]);

  if (missing)
    return (
      <Card className="p-8 text-center">
        <p className="m-0 text-[13px] text-slate-600">
          This use case does not exist or you cannot see it.
        </p>
        <Button className="mt-3" onClick={onBack}>
          Back to use cases
        </Button>
      </Card>
    );
  if (!uc) return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;

  const doTransition = async (action: Transition, reason?: string): Promise<boolean> => {
    try {
      setUc(await aiGovApi.transition(uc.id, { action, reason }));
      return true;
    } catch (e) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(e) });
      return false;
    }
  };
  const props = { uc, catalog, onChange: setUc };
  const menu = [
    ...(uc.canAdmin && uc.status === 'active' && uc.stage !== 'retired'
      ? [{ label: 'Put on hold', onSelect: () => setTransition('hold') }]
      : []),
    ...(uc.canAdmin && uc.status === 'on_hold'
      ? [{ label: 'Take off hold', onSelect: () => void doTransition('resume') }]
      : []),
    ...(uc.canAdmin && uc.stage !== 'proposed' && uc.stage !== 'retired'
      ? [{ label: 'Send back one stage', onSelect: () => setTransition('send_back') }]
      : []),
    ...(uc.canAdmin &&
    uc.stage !== 'production' &&
    uc.stage !== 'retired' &&
    uc.status !== 'rejected'
      ? [{ label: 'Reject', onSelect: () => setTransition('reject'), danger: true }]
      : []),
    ...(uc.canEdit && uc.stage !== 'retired'
      ? [{ label: 'Retire', onSelect: () => setTransition('retire'), danger: true }]
      : []),
    ...(uc.canAdmin && uc.stage !== 'production'
      ? [
          {
            label: 'Delete',
            danger: true,
            onSelect: async () => {
              if (
                !(await confirm({
                  title: `Delete ${uc.ref} ${uc.name}?`,
                  message:
                    'Its assessment, risks, logged interactions and issues are deleted too. This cannot be undone.',
                  confirmText: 'Delete use case',
                  type: 'danger',
                }))
              )
                return;
              try {
                await aiGovApi.remove(uc.id);
                showToast({ variant: 'success', message: 'Use case deleted' });
                navigate('/ai-governance/use-cases');
              } catch (e) {
                showToast({ variant: 'error', message: toDisplayErrorMessage(e) });
              }
            },
          },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4" data-testid="use-case-detail">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          aria-label="Back to use cases"
          icon={ArrowLeft}
          onClick={onBack}
          size="sm"
          variant="ghost"
        >
          Use cases
        </Button>
        <h2 className="m-0 min-w-0 flex-1 truncate text-lg font-semibold text-slate-900">
          <span className="mr-2 font-mono text-sm font-normal text-slate-500">{uc.ref}</span>
          {uc.name}
        </h2>
        <StageBadge stage={uc.stage} status={uc.status} />
        <TierBadge tier={uc.tier} />
        <EuBadge category={uc.euCategory} />
        {menu.length ? (
          <Menu
            items={menu}
            trigger={
              <Button
                aria-label="More actions"
                icon={MoreHorizontal}
                size="icon-sm"
                variant="ghost"
              />
            }
          />
        ) : null}
      </div>
      <div className="border-b border-slate-200">
        <Tabs
          items={TABS.map((t) =>
            t.value === 'issues'
              ? { ...t, count: uc.openIssues.length || undefined }
              : t.value === 'risks'
                ? {
                    ...t,
                    count: uc.riskList.filter((r) => r.status === 'open').length || undefined,
                  }
                : t,
          )}
          onChange={onTab}
          value={tab}
        />
      </div>
      {tab === 'summary' ? (
        <Summary {...props} onTab={onTab} />
      ) : tab === 'assessment' ? (
        <Assessment {...props} />
      ) : tab === 'factsheet' ? (
        <Factsheet {...props} />
      ) : tab === 'risks' ? (
        <Risks {...props} />
      ) : tab === 'evaluations' ? (
        <Evaluations {...props} />
      ) : tab === 'approvals' ? (
        <Approvals {...props} />
      ) : tab === 'issues' ? (
        <IssuesPanel onChanged={load} useCaseId={uc.id} />
      ) : (
        <Card data-testid="history">
          <ul className="m-0 list-none divide-y divide-slate-100 p-0">
            {uc.history.map((h, i) => (
              <li className="flex flex-wrap gap-x-3 px-4 py-2 text-[13px]" key={`${h.at}-${i}`}>
                <span className="w-40 shrink-0 text-xs text-slate-500">
                  {new Date(h.at).toLocaleString()}
                </span>
                <span className="min-w-0 flex-1 text-slate-700">
                  <span className="font-medium text-slate-900">{h.byName}</span>{' '}
                  {h.action.replace(/_/g, ' ')}
                  {h.detail ? `: ${h.detail}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {transition ? (
        <ReasonModal
          {...TRANSITIONS[transition]}
          onClose={() => setTransition(null)}
          onSubmit={(reason) => doTransition(transition, reason)}
        />
      ) : null}
    </div>
  );
}
