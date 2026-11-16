import { Bot, Download, FileText, Inbox, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import {
  STAGE_LABELS,
  TYPE_LABELS,
  aiGovApi,
  type AiType,
  type ApproverRole,
  type GovernanceSettings,
  type Issue,
  type Severity,
  type Stage,
  type UseCaseSummary,
} from '@/services/aiGovernance';
import { toDisplayErrorMessage } from '@/utils/apiError';

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

/** Registers a new use case. `preset` links an agent or prompt found by discovery. */
export function NewUseCaseModal({
  preset,
  onClose,
  onCreated,
}: {
  preset?: { name: string; type: AiType; links: Record<string, string[]> } | null;
  onClose: () => void;
  onCreated: (id: string) => void;
}): JSX.Element {
  const [name, setName] = useState(preset?.name ?? '');
  const [type, setType] = useState<AiType>(preset?.type ?? 'generative');
  const [description, setDescription] = useState('');
  const [intendedUse, setIntendedUse] = useState('');
  const action = useAction();
  return (
    <Modal
      dismissOnBackdrop={false}
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={name.trim().length < 3}
            loading={action.busy}
            onClick={async () => {
              const made = await action.run(() =>
                aiGovApi.create({
                  name: name.trim(),
                  type,
                  description,
                  factsheet: { intendedUse },
                  links: preset?.links,
                }),
              );
              if (made) onCreated(made.id);
            }}
            variant="primary"
          >
            Register use case
          </Button>
        </>
      }
      maxWidth="max-w-[560px]"
      onClose={onClose}
      title="Register an AI use case"
    >
      <div className="grid gap-3">
        <ErrorNote message={action.error} />
        <Field label="Name">
          <Input
            aria-label="Use case name"
            autoFocus
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            placeholder="Support chatbot"
            value={name}
          />
        </Field>
        <Field label="Kind of AI">
          <Select
            aria-label="Kind of AI"
            onValueChange={(v) => setType(v as AiType)}
            options={(Object.keys(TYPE_LABELS) as AiType[]).map((t) => ({
              value: t,
              label: TYPE_LABELS[t],
            }))}
            value={type}
          />
        </Field>
        <Field
          hint="What it is for and who uses it. Needed before the risk assessment."
          label="Intended use"
        >
          <Textarea
            aria-label="Intended use"
            maxLength={2000}
            onChange={(e) => setIntendedUse(e.target.value)}
            rows={3}
            value={intendedUse}
          />
        </Field>
        <Field label="Description (optional)">
          <Textarea
            aria-label="Description"
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            value={description}
          />
        </Field>
      </div>
    </Modal>
  );
}

export function UseCaseList({
  onOpen,
  onNew,
}: {
  onOpen: (id: string) => void;
  onNew: () => void;
}): JSX.Element {
  const [list, setList] = useState<UseCaseSummary[] | null>(null);
  const [stage, setStage] = useState('all');
  const [tier, setTier] = useState('all');
  const [query, setQuery] = useState('');
  const { showToast } = useToast();
  useEffect(() => {
    aiGovApi
      .list()
      .then(setList)
      .catch(() => setList([]));
  }, []);
  const shown = useMemo(
    () =>
      (list ?? []).filter(
        (u) =>
          (stage === 'all' || u.stage === stage) &&
          (tier === 'all' || (tier === 'none' ? !u.tier : u.tier === tier)) &&
          (!query.trim() ||
            `${u.ref} ${u.name}`.toLowerCase().includes(query.trim().toLowerCase())),
      ),
    [list, stage, tier, query],
  );
  if (list == null) return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;
  if (!list.length)
    return (
      <EmptyState
        action={
          <Button icon={Plus} onClick={onNew} variant="primary">
            Register a use case
          </Button>
        }
        description="The inventory lists every way your organisation uses AI, with its risk tier, stage and governance score."
        icon={FileText}
        title="The inventory is empty"
      />
    );
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <Input
            aria-label="Search use cases"
            className="pl-8"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or reference"
            value={query}
          />
        </div>
        <Select
          aria-label="Stage filter"
          className="w-44"
          onValueChange={setStage}
          options={[
            { value: 'all', label: 'All stages' },
            ...(Object.keys(STAGE_LABELS) as Stage[]).map((s) => ({
              value: s,
              label: STAGE_LABELS[s],
            })),
          ]}
          value={stage}
        />
        <Select
          aria-label="Risk filter"
          className="w-40"
          onValueChange={setTier}
          options={[
            { value: 'all', label: 'All risk tiers' },
            { value: 'high', label: 'High risk' },
            { value: 'medium', label: 'Medium risk' },
            { value: 'low', label: 'Low risk' },
            { value: 'none', label: 'Not assessed' },
          ]}
          value={tier}
        />
        <Button
          icon={Download}
          onClick={() =>
            aiGovApi
              .downloadInventory()
              .catch((e) => showToast({ variant: 'error', message: toDisplayErrorMessage(e) }))
          }
        >
          Export CSV
        </Button>
      </div>
      <Card className="overflow-x-auto" data-testid="use-case-table">
        <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              {['Use case', 'Stage', 'Risk', 'Evaluation', 'Score', 'Next review'].map((h) => (
                <th className="px-4 py-2 font-medium" key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((u) => (
              <tr
                className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                data-testid="use-case-row"
                key={u.id}
                onClick={() => onOpen(u.id)}
              >
                <td className="px-4 py-2.5">
                  <button
                    className="border-0 bg-transparent p-0 text-left font-medium text-slate-900 hover:text-brand-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(u.id);
                    }}
                    type="button"
                  >
                    <span className="mr-2 font-mono text-xs font-normal text-slate-500">
                      {u.ref}
                    </span>
                    {u.name}
                  </button>
                  <span className="block text-xs text-slate-500">{TYPE_LABELS[u.type]}</span>
                </td>
                <td className="px-4 py-2.5">
                  <StageBadge stage={u.stage} status={u.status} />
                </td>
                <td className="px-4 py-2.5">
                  <span className="flex flex-wrap gap-1">
                    <TierBadge tier={u.tier} />
                    {u.euCategory === 'high' || u.euCategory === 'prohibited' ? (
                      <EuBadge category={u.euCategory} />
                    ) : null}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <EvalBadge status={u.evaluationStatus} />
                </td>
                <td className="px-4 py-2.5">
                  <Score value={u.score} />
                </td>
                <td className="px-4 py-2.5 text-slate-600">
                  {u.nextReviewAt ? (
                    <span
                      className={
                        new Date(u.nextReviewAt).getTime() < Date.now()
                          ? 'font-medium text-red-700'
                          : undefined
                      }
                    >
                      {day(u.nextReviewAt)}
                      {new Date(u.nextReviewAt).getTime() < Date.now() ? ' (overdue)' : ''}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length ? (
          <p className="m-0 px-4 py-6 text-center text-[13px] text-slate-500">
            No use case matches these filters.
          </p>
        ) : null}
      </Card>
    </div>
  );
}

/** AI that is running but has no use case: the intake queue. */
export function Discovery({
  onRegister,
}: {
  onRegister: (preset: { name: string; type: AiType; links: Record<string, string[]> }) => void;
}): JSX.Element {
  const [data, setData] = useState<Awaited<ReturnType<typeof aiGovApi.ungoverned>> | null>(null);
  useEffect(() => {
    aiGovApi
      .ungoverned()
      .then(setData)
      .catch(() => setData({ agents: [], prompts: [] }));
  }, []);
  if (!data) return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;
  if (!data.agents.length && !data.prompts.length)
    return (
      <EmptyState
        description="Every active agent and prompt belongs to a registered use case."
        icon={Bot}
        title="Nothing ungoverned"
      />
    );
  const rows = [
    ...data.agents.map((a) => ({
      key: `a${a.id}`,
      name: a.name,
      kind: `Agent · ${a.kind.replace(/_/g, ' ')}`,
      preset: { name: a.name, type: 'agentic' as AiType, links: { agentIds: [a.id] } },
    })),
    ...data.prompts.map((p) => ({
      key: `p${p.id}`,
      name: p.name,
      kind: 'Prompt',
      preset: { name: p.name, type: 'generative' as AiType, links: { promptIds: [p.id] } },
    })),
  ];
  return (
    <Card data-testid="discovery">
      <CardHeader
        description="These agents and prompts are in use but belong to no use case, so nobody has assessed or approved them."
        title={`${rows.length} asset${rows.length === 1 ? '' : 's'} with no use case`}
      />
      <ul className="m-0 list-none divide-y divide-slate-100 p-0">
        {rows.map((r) => (
          <li className="flex flex-wrap items-center gap-3 px-4 py-2.5" key={r.key}>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-slate-900">
                {r.name}
              </span>
              <span className="text-xs text-slate-500">{r.kind}</span>
            </span>
            <Button
              aria-label={`Register a use case for ${r.name}`}
              onClick={() => onRegister(r.preset)}
              size="sm"
            >
              Register use case
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const STATUS_LABEL: Record<Issue['status'], string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  accepted: 'Accepted',
};

function IssueModal({
  issue,
  onClose,
  onChanged,
}: {
  issue: Issue;
  onClose: () => void;
  onChanged: (next: Issue) => void;
}): JSX.Element {
  const action = useAction();
  const [resolution, setResolution] = useState('');
  const [newAction, setNewAction] = useState('');
  const closed = issue.status === 'resolved' || issue.status === 'accepted';
  const patch = async (body: Record<string, unknown>) => {
    const next = await action.run(() => aiGovApi.updateIssue(issue.id, body));
    if (next)
      onChanged({
        ...issue,
        ...next,
        useCaseName: issue.useCaseName,
        useCaseRef: issue.useCaseRef,
      });
    return next;
  };
  return (
    <Modal
      footer={
        closed ? (
          <Button loading={action.busy} onClick={() => void patch({ status: 'open' })}>
            Reopen
          </Button>
        ) : (
          <>
            {issue.status === 'open' ? (
              <Button loading={action.busy} onClick={() => void patch({ status: 'in_progress' })}>
                Start work
              </Button>
            ) : null}
            <Button
              disabled={resolution.trim().length < 10}
              loading={action.busy}
              onClick={() => void patch({ status: 'accepted', resolution })}
            >
              Accept without fixing
            </Button>
            <Button
              disabled={resolution.trim().length < 10}
              loading={action.busy}
              onClick={() => void patch({ status: 'resolved', resolution })}
              variant="primary"
            >
              Resolve
            </Button>
          </>
        )
      }
      maxWidth="max-w-[600px]"
      onClose={onClose}
      title={issue.title}
    >
      <div className="grid gap-3" data-testid="issue-detail">
        <ErrorNote message={action.error} />
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <SeverityBadge severity={issue.severity} />
          <Badge tone={closed ? 'success' : 'info'}>{STATUS_LABEL[issue.status]}</Badge>
          {issue.source !== 'manual' ? <Badge tone="neutral">Opened automatically</Badge> : null}
          <span>
            {issue.useCaseRef} {issue.useCaseName}
          </span>
          <span className={issue.overdue ? 'font-medium text-red-700' : undefined}>
            Due {day(issue.dueAt)}
            {issue.overdue ? ' (overdue)' : ''}
          </span>
        </div>
        {issue.description ? (
          <p className="m-0 whitespace-pre-wrap text-[13px] text-slate-700">{issue.description}</p>
        ) : null}
        <div>
          <p className="m-0 mb-1 text-xs font-medium text-slate-600">Actions</p>
          {issue.actions.length ? (
            <ul className="m-0 grid list-none gap-1 p-0">
              {issue.actions.map((a) => (
                <li key={a.id}>
                  <Checkbox
                    checked={a.done}
                    disabled={closed || action.busy}
                    label={a.done && a.doneBy ? `${a.title} (done by ${a.doneBy})` : a.title}
                    onChange={() => void patch({ toggleAction: a.id })}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-xs text-slate-500">No actions yet.</p>
          )}
          {!closed ? (
            <div className="mt-2 flex gap-2">
              <Input
                aria-label="New action"
                maxLength={200}
                onChange={(e) => setNewAction(e.target.value)}
                placeholder="Add an action"
                value={newAction}
              />
              <Button
                disabled={newAction.trim().length < 3}
                onClick={async () => {
                  if (await patch({ addAction: newAction })) setNewAction('');
                }}
                size="sm"
              >
                Add
              </Button>
            </div>
          ) : null}
        </div>
        {closed ? (
          <p className="m-0 rounded-md bg-slate-50 px-3 py-2 text-[13px] text-slate-700">
            <span className="font-medium">{STATUS_LABEL[issue.status]}</span> on{' '}
            {day(issue.resolvedAt)}: {issue.resolution}
          </p>
        ) : (
          <Field
            hint="At least 10 characters. Needed to resolve or accept the issue."
            label="How was it resolved, or why is it accepted?"
          >
            <Textarea
              aria-label="Resolution"
              maxLength={2000}
              onChange={(e) => setResolution(e.target.value)}
              rows={2}
              value={resolution}
            />
          </Field>
        )}
      </div>
    </Modal>
  );
}

export function NewIssueModal({
  useCaseId,
  onClose,
  onCreated,
}: {
  useCaseId: string;
  onClose: () => void;
  onCreated: () => void;
}): JSX.Element {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const action = useAction();
  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={title.trim().length < 5}
            loading={action.busy}
            onClick={async () => {
              if (
                await action.run(() =>
                  aiGovApi.createIssue({ useCaseId, title, description, severity }),
                )
              )
                onCreated();
            }}
            variant="primary"
          >
            Open issue
          </Button>
        </>
      }
      maxWidth="max-w-[520px]"
      onClose={onClose}
      title="Open an issue"
    >
      <div className="grid gap-3">
        <ErrorNote message={action.error} />
        <Field label="Title">
          <Input
            aria-label="Issue title"
            autoFocus
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            value={title}
          />
        </Field>
        <Field hint="High and critical issues block the move to production." label="Severity">
          <Select
            aria-label="Severity"
            onValueChange={(v) => setSeverity(v as Severity)}
            options={['low', 'medium', 'high', 'critical'].map((s) => ({
              value: s,
              label: s.charAt(0).toUpperCase() + s.slice(1),
            }))}
            value={severity}
          />
        </Field>
        <Field label="What is wrong?">
          <Textarea
            aria-label="Issue description"
            maxLength={4000}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            value={description}
          />
        </Field>
      </div>
    </Modal>
  );
}

/** Issues for the whole workspace, or for one use case. */
export function IssuesPanel({
  useCaseId,
  onChanged,
}: {
  useCaseId?: string;
  onChanged?: () => void;
}): JSX.Element {
  const [status, setStatus] = useState('open');
  const [list, setList] = useState<Issue[] | null>(null);
  const [open, setOpen] = useState<Issue | null>(null);
  const [creating, setCreating] = useState(false);
  const load = useCallback(() => {
    aiGovApi
      .issues({ status: status === 'all' ? undefined : status, useCaseId })
      .then(setList)
      .catch(() => setList([]));
  }, [status, useCaseId]);
  useEffect(load, [load]);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3" data-testid="issues-panel">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Issue status filter"
          className="w-44"
          onValueChange={setStatus}
          options={[
            { value: 'open', label: 'Open issues' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'all', label: 'All issues' },
          ]}
          value={status}
        />
        <span className="flex-1" />
        {useCaseId ? (
          <Button icon={Plus} onClick={() => setCreating(true)} size="sm">
            Open issue
          </Button>
        ) : null}
      </div>
      {list == null ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
      ) : !list.length ? (
        <EmptyState
          compact
          description={
            status === 'open'
              ? 'Failing evaluations and overdue reviews open issues here automatically.'
              : 'No issue matches this filter.'
          }
          icon={Inbox}
          title={status === 'open' ? 'No open issues' : 'Nothing here'}
        />
      ) : (
        <Card>
          <ul className="m-0 list-none divide-y divide-slate-100 p-0">
            {list.map((i) => (
              <li key={i.id}>
                <button
                  className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 border-0 bg-transparent px-4 py-2.5 text-left hover:bg-slate-50"
                  data-testid="issue-row"
                  onClick={() => setOpen(i)}
                  type="button"
                >
                  <SeverityBadge severity={i.severity} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-slate-900">
                      {i.title}
                    </span>
                    <span className="text-xs text-slate-500">
                      {useCaseId ? '' : `${i.useCaseRef ?? ''} ${i.useCaseName ?? ''} · `}
                      {i.source === 'manual' ? 'Opened by a person' : 'Opened automatically'} ·{' '}
                      {i.actions.filter((a) => a.done).length}/{i.actions.length} actions
                    </span>
                  </span>
                  <span
                    className={
                      i.overdue ? 'text-xs font-medium text-red-700' : 'text-xs text-slate-500'
                    }
                  >
                    {i.status === 'resolved' || i.status === 'accepted'
                      ? STATUS_LABEL[i.status]
                      : `Due ${day(i.dueAt)}${i.overdue ? ' (overdue)' : ''}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {open ? (
        <IssueModal
          issue={open}
          onChanged={(next) => {
            setOpen(next);
            load();
            onChanged?.();
          }}
          onClose={() => setOpen(null)}
        />
      ) : null}
      {creating && useCaseId ? (
        <NewIssueModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
            onChanged?.();
          }}
          useCaseId={useCaseId}
        />
      ) : null}
    </div>
  );
}

const SIGN_ROLES: Array<{ id: ApproverRole; label: string; hint: string }> = [
  { id: 'risk', label: 'Risk', hint: 'Signs medium and high-risk use cases.' },
  {
    id: 'legal',
    label: 'Legal and compliance',
    hint: 'Signs high-risk use cases before production.',
  },
  { id: 'ethics', label: 'AI ethics', hint: 'Signs high-risk use cases before production.' },
  { id: 'security', label: 'Security', hint: 'Only when required below.' },
];

export function SettingsPanel(): JSX.Element {
  const [settings, setSettings] = useState<GovernanceSettings | null>(null);
  const action = useAction();
  const { showToast } = useToast();
  useEffect(() => {
    aiGovApi
      .settings()
      .then(setSettings)
      .catch(() => setSettings({ approvers: {}, highRiskExtraRoles: [], members: [] }));
  }, []);
  if (!settings) return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;
  const save = async (body: Partial<GovernanceSettings>) => {
    const next = await action.run(() => aiGovApi.updateSettings(body));
    if (next) {
      setSettings(next);
      showToast({ variant: 'success', message: 'Settings saved' });
    }
  };
  return (
    <div className="grid max-w-3xl gap-4" data-testid="aigov-settings">
      <ErrorNote message={action.error} />
      <Card>
        <CardHeader
          description="Who signs for each role at the approval gates. With nobody chosen, any workspace owner or admin can sign. The use case owner always signs as owner."
          title="Approvers"
        />
        <div className="grid gap-3 p-4">
          {SIGN_ROLES.map((role) => {
            const chosen = settings.approvers[role.id] ?? [];
            return (
              <div key={role.id}>
                <p className="m-0 text-[13px] font-medium text-slate-900">{role.label}</p>
                <p className="m-0 mb-1 text-xs text-slate-500">{role.hint}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {settings.members.map((m) => (
                    <Checkbox
                      checked={chosen.includes(m.id)}
                      disabled={action.busy}
                      key={m.id}
                      label={m.name}
                      onChange={() =>
                        void save({
                          approvers: {
                            ...settings.approvers,
                            [role.id]: chosen.includes(m.id)
                              ? chosen.filter((x) => x !== m.id)
                              : [...chosen, m.id],
                          },
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <CardHeader
          description="Low risk needs the owner. Medium adds Risk. High adds Legal and AI ethics. When more than one admin exists, one person cannot sign two roles at the same gate."
          title="Approval rules"
        />
        <div className="p-4">
          <Checkbox
            checked={settings.highRiskExtraRoles.includes('security')}
            disabled={action.busy}
            label="High-risk use cases also need a Security sign-off before production"
            onChange={() =>
              void save({
                highRiskExtraRoles: settings.highRiskExtraRoles.includes('security')
                  ? []
                  : ['security'],
              })
            }
          />
        </div>
      </Card>
    </div>
  );
}
