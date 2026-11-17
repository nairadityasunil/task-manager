import {
  Download,
  EyeOff,
  FileSearch,
  Inbox,
  KeyRound,
  Plus,
  Radar,
  ScanSearch,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
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
  FileInput,
  Input,
  Select,
  StatCard,
  Tabs,
  Textarea,
  type BadgeTone,
} from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import {
  DATA_TYPES,
  SOURCE_LABELS,
  STATUS_LABELS,
  shadowApi,
  type ImportResult,
  type RiskLevel,
  type ScanResult,
  type ShadowConnector,
  type ShadowOverview,
  type ShadowRequest,
  type ShadowSettings,
  type ShadowTool,
  type ShadowToolDetail,
  type ShadowToken,
  type ToolStatus,
} from '@/services/shadowAi';

import { ErrorNote, day, useAction } from './shared';

const STATUS_TONE: Record<ToolStatus, BadgeTone> = {
  unreviewed: 'warning',
  sanctioned: 'success',
  restricted: 'orange',
  prohibited: 'danger',
  dismissed: 'neutral',
};
const RISK_TONE: Record<RiskLevel, BadgeTone> = {
  low: 'success',
  medium: 'warning',
  high: 'orange',
  critical: 'danger',
};

const StatusBadge = ({ status }: { status: ToolStatus }): JSX.Element => (
  <Badge tone={STATUS_TONE[status]}>{STATUS_LABELS[status]}</Badge>
);
const RiskBadge = ({
  tool,
}: {
  tool: Pick<ShadowTool, 'riskLevel' | 'riskScore'>;
}): JSX.Element => (
  <Badge tone={RISK_TONE[tool.riskLevel]}>
    {tool.riskLevel.charAt(0).toUpperCase() + tool.riskLevel.slice(1)} · {tool.riskScore}
  </Badge>
);
const bytes = (n: number): string =>
  n < 1024
    ? `${n} B`
    : n < 1048576
      ? `${(n / 1024).toFixed(0)} KB`
      : `${(n / 1048576).toFixed(1)} MB`;

type Sub = 'overview' | 'tools' | 'sources' | 'policy' | 'requests';

/** Shadow AI: AI tools in use that nobody approved. Admins see everything; members can declare what they use. */
type ConnectorType = ShadowConnector['type'];

export function ShadowAiHub(): JSX.Element {
  const [overview, setOverview] = useState<ShadowOverview | null>(null);
  const [state, setState] = useState<'loading' | 'admin' | 'member' | 'error'>('loading');
  const [sub, setSub] = useState<Sub>('overview');
  const [declaring, setDeclaring] = useState(false);
  const [openTool, setOpenTool] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const [checking, setChecking] = useState(false);
  const { showToast } = useToast();
  const runCheck = async () => {
    setChecking(true);
    try {
      const r = await shadowApi.runCheck();
      showToast({
        variant: 'success',
        message: `Check done: ${r.alerts} new alert${r.alerts === 1 ? '' : 's'}, ${r.tasks} new task${r.tasks === 1 ? '' : 's'}`,
      });
      refresh();
    } catch {
      showToast({ variant: 'error', message: 'The check could not run' });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    shadowApi
      .overview()
      .then((o) => {
        setOverview(o);
        setState('admin');
      })
      .catch((e: { response?: { status?: number } }) =>
        setState(e?.response?.status === 403 ? 'member' : 'error'),
      );
  }, [version]);

  if (state === 'loading') return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;
  if (state === 'error')
    return (
      <EmptyState
        description="The server could not be reached, or it does not have Shadow AI yet."
        icon={ShieldAlert}
        title="Shadow AI is not available"
      />
    );
  if (state === 'member')
    return (
      <div data-testid="shadow-member">
        <MemberView onDeclare={() => setDeclaring(true)} version={version} />
        {declaring ? (
          <DeclareModal
            onClose={() => setDeclaring(false)}
            onDone={() => {
              setDeclaring(false);
              refresh();
            }}
          />
        ) : null}
      </div>
    );

  const t = overview?.totals;
  return (
    <div className="grid gap-4" data-testid="shadow-ai">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          items={[
            { value: 'overview', label: 'Overview' },
            { value: 'tools', label: 'Tools found' },
            { value: 'sources', label: 'Sources' },
            { value: 'policy', label: 'Policy' },
            {
              value: 'requests',
              label: t?.openRequests ? `Requests (${t.openRequests})` : 'Requests',
            },
          ]}
          onChange={(v) => setSub(v as Sub)}
          value={sub}
        />
        <div className="flex gap-2">
          <Button disabled={checking} onClick={() => void runCheck()}>
            {checking ? 'Checking' : 'Run check now'}
          </Button>
          <Button icon={Plus} onClick={() => setDeclaring(true)}>
            Declare an AI tool
          </Button>
        </div>
      </div>
      {sub === 'overview' && overview ? (
        <OverviewView onOpen={setOpenTool} onSub={setSub} overview={overview} />
      ) : sub === 'tools' ? (
        <ToolsView onOpen={setOpenTool} version={version} />
      ) : sub === 'sources' ? (
        <SourcesView onChanged={refresh} />
      ) : sub === 'policy' ? (
        <PolicyView onChanged={refresh} />
      ) : (
        <RequestsView isAdmin onChanged={refresh} onOpenTool={setOpenTool} version={version} />
      )}
      {openTool ? (
        <ToolModal id={openTool} onChanged={refresh} onClose={() => setOpenTool(null)} />
      ) : null}
      {declaring ? (
        <DeclareModal
          onClose={() => setDeclaring(false)}
          onDone={() => {
            setDeclaring(false);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function OverviewView({
  overview,
  onOpen,
  onSub,
}: {
  overview: ShadowOverview;
  onOpen: (id: string) => void;
  onSub: (s: Sub) => void;
}): JSX.Element {
  const t = overview.totals;
  const maxWeek = Math.max(1, ...overview.newPerWeek.map((w) => w.found));
  if (!t.tools && !overview.sourcesConnected.length)
    return (
      <EmptyState
        action={
          <Button onClick={() => onSub('sources')} variant="primary">
            Add a source
          </Button>
        }
        description="Import a proxy or DNS log, scan your code for AI libraries and keys, or ask staff to declare what they use. Nothing has been found yet, which is not the same as nothing being used."
        icon={Radar}
        title="No AI tools discovered yet"
      />
    );
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-testid="shadow-stats">
        <StatCard hint="found so far" icon={Radar} label="AI tools found" value={t.tools} />
        <StatCard
          hint={`${t.unreviewedShare}% of all tools`}
          hintTone={t.unreviewed ? 'warning' : 'success'}
          icon={EyeOff}
          label="Not yet reviewed"
          onClick={() => onSub('tools')}
          tone="amber"
          value={t.unreviewed}
        />
        <StatCard
          hint="outside the approved list"
          icon={ScanSearch}
          label="People on unapproved tools"
          value={t.peopleOnUnsanctioned}
        />
        <StatCard
          hint="used in the last 14 days"
          hintTone={t.prohibitedInUse ? 'danger' : 'success'}
          icon={ShieldAlert}
          label="Prohibited, still used"
          tone="rose"
          value={t.prohibitedInUse}
        />
        <StatCard
          hint="keys found in code"
          hintTone={t.keysInCode ? 'danger' : 'success'}
          icon={KeyRound}
          label="Exposed AI keys"
          tone="rose"
          value={t.keysInCode}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            description="The riskiest tools that are not sanctioned. Review these first."
            title="Review first"
          />
          {overview.topRisks.length ? (
            <ul className="m-0 list-none divide-y divide-slate-100 p-0">
              {overview.topRisks.map((tool) => (
                <li className="flex flex-wrap items-center gap-3 px-4 py-2.5" key={tool.id}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-slate-900">
                      {tool.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {tool.kindLabel} ·{' '}
                      {tool.users
                        ? `${tool.users} ${tool.users === 1 ? 'person' : 'people'}`
                        : 'not tied to a person'}{' '}
                      · last seen {day(tool.lastSeenAt)}
                    </span>
                  </span>
                  <StatusBadge status={tool.status} />
                  <RiskBadge tool={tool} />
                  <Button onClick={() => onOpen(tool.id)} size="sm">
                    Review
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 p-4 text-[13px] text-slate-500">
              Every tool found has been sanctioned.
            </p>
          )}
        </Card>
        <div className="grid content-start gap-4">
          <Card>
            <CardHeader
              description="How the findings reached us."
              title="Where evidence comes from"
            />
            <ul className="m-0 grid list-none gap-1.5 p-4 text-[13px]">
              {Object.entries(overview.coverage).map(([source, n]) => (
                <li className="flex justify-between" key={source}>
                  <span className="text-slate-600">
                    {SOURCE_LABELS[source as keyof typeof SOURCE_LABELS] ?? source}
                  </span>
                  <span className="font-mono tabular-nums text-slate-900">{n}</span>
                </li>
              ))}
              {!Object.keys(overview.coverage).length ? (
                <li className="text-slate-500">No sources yet.</li>
              ) : null}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Speed of review" />
            <dl className="m-0 grid gap-1.5 p-4 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-slate-600">Average days to decide</dt>
                <dd className="m-0 font-mono tabular-nums">
                  {overview.meanDaysToDecision ?? 'No decisions yet'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Oldest waiting (days)</dt>
                <dd className="m-0 font-mono tabular-nums">{overview.oldestUnreviewedDays}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
      <Card>
        <CardHeader
          description="New AI tools found each week, last 8 weeks."
          title="New tools per week"
        />
        <ol className="m-0 flex list-none items-end gap-2 p-4" data-testid="shadow-weeks">
          {overview.newPerWeek.map((w) => (
            <li className="flex flex-1 flex-col items-center gap-1" key={w.weekEnding}>
              <span className="text-xs font-medium tabular-nums text-slate-700">{w.found}</span>
              <span
                className="w-full max-w-10 rounded-t bg-violet-500"
                style={{ height: `${Math.max(2, (w.found / maxWeek) * 64)}px` }}
              />
              <span className="text-[11px] text-slate-500">{w.weekEnding.slice(5)}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ToolsView({
  onOpen,
  version,
}: {
  onOpen: (id: string) => void;
  version: number;
}): JSX.Element {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [tools, setTools] = useState<ShadowTool[] | null>(null);
  useEffect(() => {
    setTools(null);
    shadowApi
      .tools({ status: status || undefined, q: q || undefined })
      .then(setTools)
      .catch(() => setTools([]));
  }, [status, q, version]);
  return (
    <Card data-testid="shadow-tools">
      <div className="flex flex-wrap gap-2 border-b border-slate-100 p-3">
        <Input
          aria-label="Search tools"
          className="w-56"
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tools"
          value={q}
        />
        <div className="w-52">
          <Select
            aria-label="Filter by status"
            onValueChange={setStatus}
            options={[
              { value: '', label: 'All except ignored' },
              ...(
                [
                  'unreviewed',
                  'sanctioned',
                  'restricted',
                  'prohibited',
                  'dismissed',
                ] as ToolStatus[]
              ).map((s) => ({ value: s, label: STATUS_LABELS[s] })),
            ]}
            value={status}
          />
        </div>
      </div>
      {!tools ? (
        <div className="m-4 h-32 animate-pulse rounded-lg bg-slate-100" />
      ) : !tools.length ? (
        <EmptyState
          description="Nothing matches. Import a log or scan code under Sources."
          icon={FileSearch}
          title="No tools"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Tool</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Risk</th>
                <th className="px-2 py-2 text-right font-medium">People</th>
                <th className="px-2 py-2 font-medium">Seen through</th>
                <th className="px-2 py-2 font-medium">Last seen</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tools.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2">
                    <span className="block font-medium text-slate-900">{t.name}</span>
                    <span className="text-xs text-slate-500">
                      {t.kindLabel}
                      {t.catalog ? '' : ' · not in catalog'}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-2 py-2">
                    <RiskBadge tool={t} />
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{t.users}</td>
                  <td className="px-2 py-2 text-xs text-slate-600">
                    {t.sources.map((s) => SOURCE_LABELS[s] ?? s).join(', ')}
                  </td>
                  <td className="px-2 py-2 text-slate-600">{day(t.lastSeenAt)}</td>
                  <td className="px-4 py-2 text-right">
                    <Button onClick={() => onOpen(t.id)} size="sm">
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------

function ToolModal({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}): JSX.Element {
  const [tool, setTool] = useState<ShadowToolDetail | null>(null);
  const [status, setStatus] = useState<ToolStatus>('sanctioned');
  const [reason, setReason] = useState('');
  const [conditions, setConditions] = useState('');
  const [alternative, setAlternative] = useState('');
  const [register, setRegister] = useState(false);
  const action = useAction();
  const { showToast } = useToast();
  const load = useCallback(() => {
    shadowApi
      .tool(id)
      .then(setTool)
      .catch(() => onClose());
  }, [id, onClose]);
  useEffect(load, [load]);

  const decide = async () => {
    const done = await action.run(() =>
      shadowApi.decide(id, {
        status,
        reason,
        conditions,
        alternative,
        registerUseCase: register && (status === 'sanctioned' || status === 'restricted'),
      }),
    );
    if (done) {
      showToast({
        variant: 'success',
        message: `${done.name} marked ${STATUS_LABELS[done.status].toLowerCase()}`,
      });
      setReason('');
      onChanged();
      load();
    }
  };
  const reopen = async () => {
    const done = await action.run(() => shadowApi.reopen(id, 'Re-opened for review'));
    if (done) {
      onChanged();
      load();
    }
  };

  return (
    <Modal onClose={onClose} panelClassName="max-w-3xl" title={tool ? tool.name : 'AI tool'}>
      {!tool ? (
        <div className="h-48 animate-pulse rounded-lg bg-slate-100" />
      ) : (
        <div className="grid gap-4" data-testid="shadow-tool">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={tool.status} />
            <RiskBadge tool={tool} />
            <span className="text-xs text-slate-500">
              {tool.kindLabel} · {tool.vendor} · first seen {day(tool.firstSeenAt)}
            </span>
          </div>
          {tool.status !== 'unreviewed' ? (
            <p className="m-0 rounded-lg bg-slate-50 p-3 text-[13px] text-slate-700">
              <strong>{STATUS_LABELS[tool.status]}</strong> by {tool.decidedByName || 'an admin'}
              {tool.decidedAt ? ` on ${day(tool.decidedAt)}` : ''}: {tool.reason}
              {tool.conditions ? ` Conditions: ${tool.conditions}.` : ''}
              {tool.alternative ? ` Use instead: ${tool.alternative}.` : ''}
            </p>
          ) : null}
          <section>
            <h3 className="m-0 mb-1 text-[13px] font-semibold text-slate-900">
              Why this risk score
            </h3>
            <ul className="m-0 grid list-none gap-1 p-0 text-[13px]">
              {tool.factors.map((f) => (
                <li className="flex justify-between gap-3" key={f.label}>
                  <span className="text-slate-700">{f.label}</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {f.points > 0 ? '+' : ''}
                    {f.points}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="m-0 mb-1 text-[13px] font-semibold text-slate-900">
              Evidence ({tool.users} {tool.users === 1 ? 'person' : 'people'},{' '}
              {bytes(tool.bytesOut)} sent out, {tool.uploads} upload{tool.uploads === 1 ? '' : 's'}
              {tool.sensitive
                ? `, sensitive data seen ${tool.sensitive} time${tool.sensitive === 1 ? '' : 's'}`
                : ''}
              )
            </h3>
            <div className="max-h-48 overflow-auto rounded-lg border border-slate-100">
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-slate-100">
                  {tool.sightings.map((s, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 text-slate-800">
                        {s.user === 'unknown' ? 'Not tied to a person' : s.user}
                      </td>
                      <td className="px-2 py-1.5 text-slate-600">
                        {SOURCE_LABELS[s.source] ?? s.source}
                      </td>
                      <td className="px-2 py-1.5 tabular-nums text-slate-600">{s.count}×</td>
                      <td className="px-2 py-1.5 text-slate-600">
                        {s.secret ? <Badge tone="danger">Key</Badge> : null}
                        {s.sensitive ? <Badge tone="danger">Sensitive data</Badge> : null}
                        {s.broad ? <Badge tone="warning">Company data</Badge> : null}
                        {s.personal ? <Badge tone="neutral">Personal account</Badge> : null}
                      </td>
                      <td className="max-w-64 truncate px-2 py-1.5 text-slate-500" title={s.detail}>
                        {s.detail}
                      </td>
                      <td className="px-3 py-1.5 text-right text-slate-500">{day(s.lastAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="grid gap-3 rounded-lg border border-slate-200 p-3">
            <h3 className="m-0 text-[13px] font-semibold text-slate-900">Decide</h3>
            <ErrorNote message={action.error} />
            <Field label="Decision">
              <Select
                onValueChange={(v) => setStatus(v as ToolStatus)}
                options={(
                  ['sanctioned', 'restricted', 'prohibited', 'dismissed'] as ToolStatus[]
                ).map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
                value={status}
              />
            </Field>
            <Field hint="At least 10 characters. Kept in the audit trail." label="Reason">
              <Textarea onChange={(e) => setReason(e.target.value)} rows={2} value={reason} />
            </Field>
            {status === 'restricted' ? (
              <Field label="Conditions">
                <Input
                  onChange={(e) => setConditions(e.target.value)}
                  placeholder="e.g. Public and internal data only, company account"
                  value={conditions}
                />
              </Field>
            ) : null}
            {status === 'restricted' || status === 'prohibited' ? (
              <Field hint="Shown to people who declare this tool." label="Use this instead">
                <Input onChange={(e) => setAlternative(e.target.value)} value={alternative} />
              </Field>
            ) : null}
            {status === 'sanctioned' || status === 'restricted' ? (
              <Checkbox
                checked={register}
                label="Also register it as a use case so it gets assessed"
                onChange={() => setRegister(!register)}
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={action.busy || reason.trim().length < 10}
                onClick={() => void decide()}
                variant="primary"
              >
                Save decision
              </Button>
              {tool.status !== 'unreviewed' ? (
                <Button disabled={action.busy} onClick={() => void reopen()}>
                  Put back in review
                </Button>
              ) : null}
            </div>
          </section>
          {tool.history.length ? (
            <section>
              <h3 className="m-0 mb-1 text-[13px] font-semibold text-slate-900">History</h3>
              <ul className="m-0 grid list-none gap-1 p-0 text-xs text-slate-600">
                {tool.history.map((h, i) => (
                  <li key={i}>
                    {day(h.at)} · {h.byName} · {h.action}
                    {h.detail ? `: ${h.detail}` : ''}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------

const SCAN_FILE =
  /(^|\/)(package\.json|requirements[^/]*\.txt|pyproject\.toml|pipfile)$|\.(ts|tsx|js|jsx|mjs|cjs|py|env)$/i;

function SourcesView({ onChanged }: { onChanged: () => void }): JSX.Element {
  const [log, setLog] = useState('');
  const [logResult, setLogResult] = useState<ImportResult | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [repo, setRepo] = useState('');
  const [tokens, setTokens] = useState<ShadowToken[]>([]);
  const [tokenName, setTokenName] = useState('');
  const [fresh, setFresh] = useState<string | null>(null);
  const logAction = useAction();
  const scanAction = useAction();
  const tokenAction = useAction();
  const loadTokens = useCallback(() => {
    shadowApi
      .tokens()
      .then(setTokens)
      .catch(() => setTokens([]));
  }, []);
  useEffect(loadTokens, [loadTokens]);

  const importText = async () => {
    const r = await logAction.run(() => shadowApi.importLog(log));
    if (r) {
      setLogResult(r);
      setLog('');
      onChanged();
    }
  };
  const pickLog = async (file: File | undefined) => {
    if (file) setLog(await file.text());
  };
  const pickCode = async (files: FileList | null) => {
    if (!files?.length) return;
    const picked = Array.from(files)
      .filter(
        (f) =>
          SCAN_FILE.test(
            (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
          ) && f.size < 400_000,
      )
      .slice(0, 400);
    const payload = await Promise.all(
      picked.map(async (f) => ({
        path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
        content: await f.text(),
      })),
    );
    if (!payload.length) {
      scanAction.clear();
      setScan({ files: 0, packages: 0, keys: 0, newTools: 0, findings: [] });
      return;
    }
    const r = await scanAction.run(() => shadowApi.scan(payload, repo));
    if (r) {
      setScan(r);
      onChanged();
    }
  };
  const create = async () => {
    const r = await tokenAction.run(() => shadowApi.createToken(tokenName));
    if (r) {
      setFresh(r.token);
      setTokenName('');
      loadTokens();
    }
  };
  const revoke = async (id: string) => {
    if (await tokenAction.run(() => shadowApi.revokeToken(id))) loadTokens();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2" data-testid="shadow-sources">
      <ConnectorsCard onChanged={onChanged} />
      <Card>
        <CardHeader
          description="Export from your proxy, DNS filter or firewall (Zscaler, Netskope, Squid, Cloudflare, Palo Alto) as CSV with a header row naming the host, user, bytes and time. A plain list of hosts also works."
          title="Import a network log"
        />
        <div className="grid gap-3 p-4">
          <ErrorNote message={logAction.error} />
          <FileInput accept=".csv,.txt,.log" onChange={(e) => void pickLog(e.target.files?.[0])} />
          <Textarea
            aria-label="Log contents"
            onChange={(e) => setLog(e.target.value)}
            placeholder={
              'time,user,host,bytes_out\n2026-11-10T09:00:00Z,ada@example.com,chatgpt.com,4096'
            }
            rows={5}
            value={log}
          />
          <div>
            <Button
              disabled={logAction.busy || !log.trim()}
              onClick={() => void importText()}
              variant="primary"
            >
              Import log
            </Button>
          </div>
          {logResult ? (
            <p className="m-0 text-[13px] text-slate-700" data-testid="shadow-log-result">
              {logResult.matched} request{logResult.matched === 1 ? '' : 's'} matched AI tools,{' '}
              {logResult.newTools} new tool{logResult.newTools === 1 ? '' : 's'} found,{' '}
              {logResult.ignored + (logResult.unreadable ?? 0)} line
              {logResult.ignored + (logResult.unreadable ?? 0) === 1 ? '' : 's'} ignored.
            </p>
          ) : null}
        </div>
      </Card>
      <Card>
        <CardHeader
          description="Pick a project folder. Files are read in your browser and sent here for matching. We look for AI libraries and for keys that look like OpenAI, Anthropic, Google, Hugging Face and similar. A key found is never stored or shown in full."
          title="Scan code"
        />
        <div className="grid gap-3 p-4">
          <ErrorNote message={scanAction.error} />
          <Field label="Repository name (optional)">
            <Input onChange={(e) => setRepo(e.target.value)} value={repo} />
          </Field>
          <input
            aria-label="Choose a folder to scan"
            className="text-[13px]"
            data-testid="shadow-scan-input"
            multiple
            onChange={(e) => void pickCode(e.target.files)}
            type="file"
            // Folder picking is a non-standard but widely supported attribute.
            {...({ webkitdirectory: '' } as Record<string, string>)}
          />
          {scan ? (
            <div data-testid="shadow-scan-result">
              <p className="m-0 text-[13px] text-slate-700">
                {scan.files} file{scan.files === 1 ? '' : 's'} scanned: {scan.packages} AI librar
                {scan.packages === 1 ? 'y' : 'ies'}, {scan.keys} key{scan.keys === 1 ? '' : 's'}.
              </p>
              {scan.keys ? (
                <p
                  className="m-0 mt-1 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800"
                  role="alert"
                >
                  Rotate every key listed and move it to a secret store. A key that was committed
                  stays readable in the repository history.
                </p>
              ) : null}
              <ul className="m-0 mt-2 grid max-h-40 list-none gap-1 overflow-auto p-0 text-xs text-slate-600">
                {scan.findings.map((f, i) => (
                  <li key={i}>
                    <Badge tone={f.type === 'key' ? 'danger' : 'info'}>
                      {f.type === 'key' ? 'Key' : 'Library'}
                    </Badge>{' '}
                    {f.tool} · {f.path}:{f.line}
                    {f.preview ? ` · ${f.preview}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Card>
      <Card className="lg:col-span-2" data-testid="shadow-extension">
        <CardHeader
          description="A Chrome or Edge extension that tells staff whether an AI site is approved, blocks the prohibited ones with the reason and the approved alternative, and checks text pasted into AI sites for card numbers, keys and personal data. Only the kinds and counts reach the server, never the text."
          title="Browser extension"
        />
        <div className="grid gap-2 p-4 text-[13px] text-slate-700">
          <p className="m-0">
            Build it for your server with{' '}
            <code className="text-xs">
              SHADOW_AI_SERVER=https://your-api node extensions/shadow-ai/build.mjs
            </code>{' '}
            (in the backend repository), then roll the folder out with your device management, or
            load it unpacked to try it. Staff open its settings and enter the server address and a
            token created below. Pasting is checked; typed text is not.
          </p>
        </div>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader
          description="For a scheduled job that forwards proxy logs, OAuth app lists or cloud inventories. A token can only send shadow AI signals. It is not an SDK key and cannot read anything."
          title="Tokens for log forwarders and scanners"
        />
        <div className="grid gap-3 p-4">
          <ErrorNote message={tokenAction.error} />
          {fresh ? (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900"
              data-testid="shadow-token-fresh"
            >
              <p className="m-0 font-medium">Copy this token now. It is not shown again.</p>
              <code className="mt-1 block break-all font-mono text-xs">{fresh}</code>
              <pre className="m-0 mt-2 overflow-auto rounded bg-white/70 p-2 text-[11px] text-slate-800">{`curl -X POST ${window.location.origin.replace(/:\d+$/, '')}/api/shadow-ai/ingest/signals \\
  -H "x-shadow-ai-token: <token>" -H "content-type: application/json" \\
  -d '{"source":"oauth","signals":[{"target":"Otter.ai","user":"ada@example.com","scopes":["calendar"]}]}'`}</pre>
              <Button className="mt-2" onClick={() => setFresh(null)} size="sm">
                I have copied it
              </Button>
            </div>
          ) : null}
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Name">
              <Input
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="e.g. Zscaler nightly export"
                value={tokenName}
              />
            </Field>
            <Button
              disabled={tokenAction.busy || tokenName.trim().length < 3}
              onClick={() => void create()}
            >
              Create token
            </Button>
          </div>
          {tokens.length ? (
            <ul className="m-0 grid list-none divide-y divide-slate-100 p-0 text-[13px]">
              {tokens.map((t) => (
                <li className="flex flex-wrap items-center gap-3 py-2" key={t.id}>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-slate-900">{t.name}</span>{' '}
                    <code className="text-xs text-slate-500">{t.prefix}…</code>
                  </span>
                  <span className="text-xs text-slate-500">
                    {t.revokedAt
                      ? `Revoked ${day(t.revokedAt)}`
                      : t.lastUsedAt
                        ? `Last used ${day(t.lastUsedAt)}`
                        : 'Never used'}
                  </span>
                  {!t.revokedAt ? (
                    <Button icon={Trash2} onClick={() => void revoke(t.id)} size="sm">
                      Revoke
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ConnectorsCard({ onChanged }: { onChanged: () => void }): JSX.Element {
  const [rows, setRows] = useState<ShadowConnector[] | null>(null);
  const [adding, setAdding] = useState<ConnectorType | null>(null);
  const action = useAction();
  const { showToast } = useToast();
  const load = useCallback(() => {
    shadowApi
      .connectors()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);
  useEffect(load, [load]);
  const sync = async (id: string) => {
    const r = await action.run(() => shadowApi.syncConnector(id));
    if (r) {
      showToast({
        variant: r.lastStatus === 'ok' ? 'success' : 'error',
        message: r.lastStatus === 'ok' ? `Synced: ${r.lastSignals} grants` : r.lastError,
      });
      load();
      onChanged();
    }
  };
  const remove = async (id: string) => {
    if (await action.run(() => shadowApi.removeConnector(id))) {
      load();
      onChanged();
    }
  };
  return (
    <Card className="lg:col-span-2" data-testid="shadow-connectors">
      <CardHeader
        description="Connect your identity provider and Pristine reads which apps people have granted access to their work account, every hour. AI apps are found without anyone pasting a log. Credentials are stored encrypted and only read the list of apps."
        title="Connected accounts"
      />
      <div className="grid gap-3 p-4">
        <ErrorNote message={action.error} />
        {rows?.length ? (
          <ul className="m-0 grid list-none divide-y divide-slate-100 p-0 text-[13px]">
            {rows.map((c) => (
              <li className="flex flex-wrap items-center gap-3 py-2" key={c.id}>
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-slate-900">{c.name}</span>{' '}
                  <span className="text-xs text-slate-500">
                    {c.name !== CONNECTOR_INFO[c.type].title
                      ? `${CONNECTOR_INFO[c.type].title} · `
                      : ''}
                    {c.account}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {c.lastStatus === 'never'
                      ? 'Not synced yet'
                      : c.lastStatus === 'ok'
                        ? `Synced ${day(c.lastSyncAt)} · ${c.type === 'azure_ai' || c.type === 'aws_ai' ? '' : `${c.lastUsers} ${c.lastUsers === 1 ? 'person' : 'people'}, `}${c.lastSignals} ${c.type === 'azure_ai' || c.type === 'aws_ai' ? 'AI resource' : 'grant'}${c.lastSignals === 1 ? '' : 's'}${c.lastTruncated ? ' (first 2,000 people only)' : ''}`
                        : null}
                  </span>
                </span>
                {c.lastStatus === 'error' ? (
                  <span className="max-w-md text-xs text-red-700" role="alert">
                    Last sync failed: {c.lastError}
                  </span>
                ) : null}
                <Button disabled={action.busy} onClick={() => void sync(c.id)} size="sm">
                  Sync now
                </Button>
                <Button
                  aria-label={`Remove ${c.name}`}
                  disabled={action.busy}
                  icon={Trash2}
                  onClick={() => void remove(c.id)}
                  size="sm"
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : rows ? (
          <p className="m-0 text-[13px] text-slate-500">No account connected yet.</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setAdding('google_workspace')}>Connect Google Workspace</Button>
          <Button onClick={() => setAdding('microsoft_entra')}>Connect Microsoft Entra</Button>
          <Button onClick={() => setAdding('azure_ai')}>Connect Azure AI</Button>
          <Button onClick={() => setAdding('aws_ai')}>Connect AWS AI</Button>
        </div>
      </div>
      {adding ? (
        <ConnectorModal
          onClose={() => setAdding(null)}
          onDone={() => {
            setAdding(null);
            load();
            onChanged();
          }}
          type={adding}
        />
      ) : null}
    </Card>
  );
}

const CONNECTOR_INFO: Record<
  ConnectorType,
  {
    title: string;
    help: string;
    fields: Array<{
      id: string;
      label: string;
      secret?: boolean;
      area?: boolean;
      optional?: boolean;
    }>;
  }
> = {
  google_workspace: {
    title: 'Google Workspace',
    help: 'Create a service account, turn on domain-wide delegation, and allow the scopes admin.directory.user.readonly and admin.directory.user.security. Then upload its JSON key and name a Workspace admin it can act as.',
    fields: [
      { id: 'adminEmail', label: 'Admin email to act as' },
      { id: 'serviceAccountKey', label: 'Service account key (JSON)', area: true },
    ],
  },
  microsoft_entra: {
    title: 'Microsoft Entra',
    help: 'Register an app, grant it the application permissions Directory.Read.All and DelegatedPermissionGrant.Read.All (admin consent), and create a client secret.',
    fields: [
      { id: 'tenantId', label: 'Tenant ID or domain' },
      { id: 'clientId', label: 'Client ID' },
      { id: 'clientSecret', label: 'Client secret', secret: true },
    ],
  },
  azure_ai: {
    title: 'Azure AI',
    help: 'Lists Azure OpenAI and AI Services resources in one subscription. Use an app registration with the Reader role on that subscription. This finds AI that has been set up, not calls made to it.',
    fields: [
      { id: 'tenantId', label: 'Tenant ID or domain' },
      { id: 'subscriptionId', label: 'Subscription ID' },
      { id: 'clientId', label: 'Client ID' },
      { id: 'clientSecret', label: 'Client secret', secret: true },
    ],
  },
  aws_ai: {
    title: 'AWS AI',
    help: 'Lists Bedrock custom models and provisioned throughput, and SageMaker endpoints, in the regions you give. Use a read-only access key with the List permissions for those services. This finds AI that has been set up, not calls made to it.',
    fields: [
      { id: 'accessKeyId', label: 'Access key ID' },
      { id: 'secretAccessKey', label: 'Secret access key', secret: true },
      { id: 'regions', label: 'Regions (comma separated, e.g. us-east-1, eu-west-1)' },
    ],
  },
};

function ConnectorModal({
  type,
  onClose,
  onDone,
}: {
  type: ConnectorType;
  onClose: () => void;
  onDone: () => void;
}): JSX.Element {
  const info = CONNECTOR_INFO[type];
  const [name, setName] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const action = useAction();
  const { showToast } = useToast();
  const pick = async (file: File | undefined) => {
    if (file) setValues((v) => ({ ...v, serviceAccountKey: '' }));
    if (file) {
      const text = await file.text();
      setValues((v) => ({ ...v, serviceAccountKey: text }));
    }
  };
  const ready = info.fields.every((f) => f.optional || (values[f.id] ?? '').trim().length > 0);
  const submit = async () => {
    const r = await action.run(() => shadowApi.addConnector({ type, name, ...values }));
    if (r) {
      showToast({
        variant: 'success',
        message: `Connected: ${r.lastSignals} ${type === 'azure_ai' || type === 'aws_ai' ? 'AI resources' : 'grants'} found`,
      });
      onDone();
    }
  };
  return (
    <Modal onClose={onClose} title={`Connect ${info.title}`}>
      <div className="grid gap-3" data-testid="shadow-connector-form">
        <p className="m-0 text-[13px] text-slate-600">
          {info.help} We test the connection before saving.
        </p>
        <ErrorNote message={action.error} />
        <Field label="Name (optional)">
          <Input onChange={(e) => setName(e.target.value)} value={name} />
        </Field>
        {info.fields.map((f) =>
          f.area ? (
            <Field key={f.id} label={f.label}>
              <>
                <FileInput accept=".json" onChange={(e) => void pick(e.target.files?.[0])} />
                <Textarea
                  aria-label={`${f.label} contents`}
                  className="mt-2"
                  onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                  rows={3}
                  value={values[f.id] ?? ''}
                />
              </>
            </Field>
          ) : (
            <Field key={f.id} label={f.label}>
              <Input
                autoComplete="off"
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                type={f.secret ? 'password' : 'text'}
                value={values[f.id] ?? ''}
              />
            </Field>
          ),
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button disabled={action.busy || !ready} onClick={() => void submit()} variant="primary">
            {action.busy ? 'Testing connection' : 'Connect'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function PolicyView({ onChanged }: { onChanged: () => void }): JSX.Element {
  const [settings, setSettings] = useState<ShadowSettings | null>(null);
  const [until, setUntil] = useState('');
  const [message, setMessage] = useState('');
  const [days, setDays] = useState('14');
  const action = useAction();
  const { showToast } = useToast();
  useEffect(() => {
    shadowApi
      .settings()
      .then((s) => {
        setSettings(s);
        setUntil(s.amnestyUntil ? s.amnestyUntil.slice(0, 10) : '');
        setMessage(s.coachMessage);
        setDays(String(s.reviewDays));
      })
      .catch(() => undefined);
  }, []);
  const save = async () => {
    const s = await action.run(() =>
      shadowApi.updateSettings({
        amnestyUntil: until ? new Date(`${until}T23:59:59`).toISOString() : null,
        coachMessage: message,
        reviewDays: Number(days),
      }),
    );
    if (s) {
      setSettings(s);
      showToast({ variant: 'success', message: 'Policy saved' });
      onChanged();
    }
  };
  if (!settings) return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;
  return (
    <div className="grid max-w-3xl gap-4" data-testid="shadow-policy">
      <Card>
        <CardHeader
          description="Hand the list of prohibited sites to your firewall or secure web gateway, or keep the full list as evidence for an audit."
          title="Export the policy"
        />
        <div className="flex flex-wrap gap-2 p-4">
          <Button icon={Download} onClick={() => void shadowApi.downloadPolicy('blocklist')}>
            Blocklist (.txt)
          </Button>
          <Button icon={Download} onClick={() => void shadowApi.downloadPolicy('csv')}>
            Full policy (CSV)
          </Button>
          <Button icon={Download} onClick={() => void shadowApi.downloadPolicy('json')}>
            Full policy (JSON)
          </Button>
        </div>
      </Card>
      <Card>
        <CardHeader
          description="Staff are more likely to tell you what they use when it is safe to say so."
          title="Amnesty and guidance"
        />
        <div className="grid gap-3 p-4">
          <ErrorNote message={action.error} />
          <Field
            hint="Declarations until this date are recorded without blame."
            label="Amnesty until"
          >
            <Input onChange={(e) => setUntil(e.target.value)} type="date" value={until} />
          </Field>
          <Field hint="Shown to a person after they declare a tool." label="Message to staff">
            <Textarea
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you use. We will help you do it safely, not take it away."
              rows={3}
              value={message}
            />
          </Field>
          <Field
            hint="A tool still waiting after this many days opens a task for the owner."
            label="Review within (days)"
          >
            <Input
              max={90}
              min={1}
              onChange={(e) => setDays(e.target.value)}
              type="number"
              value={days}
            />
          </Field>
          <div>
            <Button disabled={action.busy} onClick={() => void save()} variant="primary">
              Save
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------

const REQ_TONE: Record<ShadowRequest['status'], BadgeTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  withdrawn: 'neutral',
};

function RequestsView({
  isAdmin,
  onChanged,
  onOpenTool,
  version,
}: {
  isAdmin: boolean;
  onChanged: () => void;
  onOpenTool: (id: string) => void;
  version: number;
}): JSX.Element {
  const [rows, setRows] = useState<ShadowRequest[] | null>(null);
  const [deciding, setDeciding] = useState<{
    row: ShadowRequest;
    decision: 'approved' | 'rejected';
  } | null>(null);
  const [note, setNote] = useState('');
  const action = useAction();
  const load = useCallback(() => {
    shadowApi
      .requests()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);
  useEffect(load, [load, version]);
  const submit = async () => {
    if (!deciding) return;
    const r = await action.run(() =>
      shadowApi.decideRequest(deciding.row.id, deciding.decision, note),
    );
    if (r) {
      setDeciding(null);
      setNote('');
      load();
      onChanged();
    }
  };
  const withdraw = async (id: string) => {
    if (await action.run(() => shadowApi.withdraw(id))) {
      load();
      onChanged();
    }
  };
  if (!rows) return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;
  if (!rows.length)
    return (
      <EmptyState
        description="When staff declare an AI tool or ask to use one, it shows up here."
        icon={Inbox}
        title="No requests"
      />
    );
  return (
    <Card data-testid="shadow-requests">
      <ErrorNote message={action.error} />
      <ul className="m-0 list-none divide-y divide-slate-100 p-0">
        {rows.map((r) => (
          <li className="grid gap-1 px-4 py-3" key={r.id}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-medium text-slate-900">{r.toolName}</span>
              <Badge tone={REQ_TONE[r.status]}>{r.status}</Badge>
              <Badge tone="neutral">
                {r.kind === 'declared' ? 'Already using' : 'Asking to use'}
              </Badge>
              {r.amnesty ? <Badge tone="info">Amnesty</Badge> : null}
              <span className="text-xs text-slate-500">
                {isAdmin ? `${r.userName} · ` : ''}
                {day(r.createdAt)}
              </span>
              <span className="ml-auto flex gap-2">
                {isAdmin && r.toolId ? (
                  <Button onClick={() => onOpenTool(r.toolId as string)} size="sm">
                    Open tool
                  </Button>
                ) : null}
                {isAdmin && r.status === 'pending' ? (
                  <>
                    <Button
                      onClick={() => setDeciding({ row: r, decision: 'approved' })}
                      size="sm"
                      variant="primary"
                    >
                      Approve
                    </Button>
                    <Button onClick={() => setDeciding({ row: r, decision: 'rejected' })} size="sm">
                      Decline
                    </Button>
                  </>
                ) : null}
                {r.isMine && r.status === 'pending' ? (
                  <Button onClick={() => void withdraw(r.id)} size="sm">
                    Withdraw
                  </Button>
                ) : null}
              </span>
            </div>
            <p className="m-0 text-[13px] text-slate-700">{r.purpose}</p>
            {r.dataTypes.length ? (
              <p className="m-0 text-xs text-slate-500">
                Data:{' '}
                {r.dataTypes.map((d) => DATA_TYPES.find((x) => x.id === d)?.label ?? d).join(', ')}
              </p>
            ) : null}
            {r.decisionNote ? (
              <p className="m-0 text-xs text-slate-600">
                {r.decidedByName}: {r.decisionNote}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      {deciding ? (
        <Modal
          onClose={() => setDeciding(null)}
          title={`${deciding.decision === 'approved' ? 'Approve' : 'Decline'} ${deciding.row.toolName}`}
        >
          <div className="grid gap-3">
            <ErrorNote message={action.error} />
            <Field hint="The person sees this." label="Note">
              <Textarea onChange={(e) => setNote(e.target.value)} rows={3} value={note} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setDeciding(null)}>Cancel</Button>
              <Button
                disabled={action.busy || note.trim().length < 5}
                onClick={() => void submit()}
                variant="primary"
              >
                Send decision
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------

function MemberView({
  onDeclare,
  version,
}: {
  onDeclare: () => void;
  version: number;
}): JSX.Element {
  return (
    <div className="grid max-w-3xl gap-4">
      <Card>
        <CardHeader
          description="Using an AI tool for work that is not on the approved list? Tell us. We will check it, say whether it is fine to use, and suggest an approved alternative if not."
          title="Tell us about an AI tool you use"
        />
        <div className="p-4">
          <Button icon={Plus} onClick={onDeclare} variant="primary">
            Declare an AI tool
          </Button>
        </div>
      </Card>
      <RequestsView
        isAdmin={false}
        onChanged={() => undefined}
        onOpenTool={() => undefined}
        version={version}
      />
    </div>
  );
}

function DeclareModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}): JSX.Element {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'declared' | 'request'>('declared');
  const [purpose, setPurpose] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [answer, setAnswer] = useState<Awaited<ReturnType<typeof shadowApi.declare>> | null>(null);
  const action = useAction();
  useEffect(() => {
    shadowApi
      .catalog()
      .then((c) => setNames(c.tools.map((t) => t.name)))
      .catch(() => undefined);
  }, []);
  const listId = useMemo(() => `ai-tools-${Math.random().toString(36).slice(2, 8)}`, []);
  const submit = async () => {
    const r = await action.run(() =>
      shadowApi.declare({ toolName: name, kind, purpose, dataTypes: types }),
    );
    if (r) setAnswer(r);
  };
  return (
    <Modal onClose={answer ? onDone : onClose} title={answer ? 'Thank you' : 'Declare an AI tool'}>
      {answer ? (
        <div className="grid gap-3 text-[13px] text-slate-700" data-testid="shadow-declared">
          <p className="m-0">
            {answer.amnesty
              ? 'Recorded. An amnesty is running, so there is no blame for tools you were already using.'
              : 'Recorded. An admin will look at it.'}
          </p>
          {answer.tool && answer.tool.status !== 'unreviewed' ? (
            <p className="m-0 rounded-lg bg-slate-50 p-3">
              <strong>{answer.tool.name}</strong> is currently{' '}
              <strong>{STATUS_LABELS[answer.tool.status].toLowerCase()}</strong>.
              {answer.tool.conditions ? ` Conditions: ${answer.tool.conditions}.` : ''}
              {answer.tool.reason ? ` Why: ${answer.tool.reason}.` : ''}
              {answer.tool.alternative ? ` Use instead: ${answer.tool.alternative}.` : ''}
            </p>
          ) : null}
          {answer.message ? <p className="m-0 text-slate-600">{answer.message}</p> : null}
          <div className="flex justify-end">
            <Button onClick={onDone} variant="primary">
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3" data-testid="shadow-declare-form">
          <ErrorNote message={action.error} />
          <Field label="Which tool?">
            <>
              <Input
                list={listId}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ChatGPT, Otter.ai"
                value={name}
              />
              <datalist id={listId}>
                {names.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </>
          </Field>
          <Field label="Your situation">
            <Select
              onValueChange={(v) => setKind(v as 'declared' | 'request')}
              options={[
                { value: 'declared', label: 'I already use it' },
                { value: 'request', label: 'I would like to start using it' },
              ]}
              value={kind}
            />
          </Field>
          <Field hint="At least 10 characters." label="What do you use it for?">
            <Textarea onChange={(e) => setPurpose(e.target.value)} rows={3} value={purpose} />
          </Field>
          <fieldset className="m-0 grid gap-1 border-0 p-0">
            <legend className="mb-1 text-[13px] font-medium text-slate-900">
              What information goes into it?
            </legend>
            <div className="grid gap-1 sm:grid-cols-2">
              {DATA_TYPES.map((d) => (
                <Checkbox
                  checked={types.includes(d.id)}
                  key={d.id}
                  label={d.label}
                  onChange={() =>
                    setTypes((c) => (c.includes(d.id) ? c.filter((x) => x !== d.id) : [...c, d.id]))
                  }
                />
              ))}
            </div>
          </fieldset>
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              disabled={action.busy || name.trim().length < 2 || purpose.trim().length < 10}
              onClick={() => void submit()}
              variant="primary"
            >
              Send
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
