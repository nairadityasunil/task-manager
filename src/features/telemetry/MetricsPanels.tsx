import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  BookOpen,
  ClipboardList,
  MousePointerClick,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import { Badge, Card, CardHeader, Input, Select, cn } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { CreateTaskButton } from '@/features/tasks/components/CreateTaskFromInsight';
import { listIntegrations } from '@/lib/sdk-integrations/api';
import { KIND_LABELS, timeAgo, type AgentKind } from '@/services/agents';
import {
  formatDuration,
  telemetryApi,
  type AgentTelemetry,
  type GovernanceTelemetry,
  type Journey,
  type JourneyItem,
  type Person,
} from '@/services/telemetry';
import { toDisplayErrorMessage } from '@/utils/apiError';

const pct = (ratio: number | null | undefined): string =>
  ratio == null ? '—' : `${Math.round(ratio * 100)}%`;

/* ------------------------------------------------------------------ */
/* Governance telemetry                                                 */
/* ------------------------------------------------------------------ */

/** "6 hours (down from 2 days)" when both periods have a value. */
function withPrevious(current: number | null, previous: number | null): string {
  if (current == null) return 'No data yet';
  if (previous == null || Math.abs(current - previous) < Math.max(1000, previous * 0.05))
    return formatDuration(current);
  return `${formatDuration(current)} (${current < previous ? 'down' : 'up'} from ${formatDuration(previous)})`;
}

function Stat({
  label,
  value,
  hint,
  testId,
}: {
  label: string;
  value: string;
  hint?: string;
  testId?: string;
}): JSX.Element {
  return (
    <div className="min-w-0 px-4 py-3" data-testid={testId}>
      <div className="text-[13px] text-slate-600">{label}</div>
      <div className="mt-1 text-[15px] font-semibold leading-snug text-slate-900">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function Trend({ points }: { points: Array<{ date: string; score: number }> }): JSX.Element | null {
  if (points.length < 2) return null;
  const w = 320;
  const h = 56;
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map((p) => h - 4 - (Math.min(100, Math.max(0, p.score)) / 100) * (h - 8));
  return (
    <svg
      aria-label={`Compliance score from ${points[0].score} to ${points[points.length - 1].score}`}
      className="h-14 w-full max-w-xs"
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${w} ${h}`}
    >
      <polyline
        fill="none"
        points={xs.map((x, i) => `${x},${ys[i]}`).join(' ')}
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** How well governance itself is working: detect, remediate, approve, contain. */
export function GovernanceMetrics(): JSX.Element {
  const { showToast } = useToast();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<GovernanceTelemetry | null | undefined>(undefined);

  useEffect(() => {
    setData(undefined);
    telemetryApi
      .governance(days)
      .then(setData)
      .catch((error) => {
        setData(null);
        if ((error as { response?: { status?: number } })?.response?.status !== 403)
          showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
      });
  }, [days, showToast]);

  if (data === null)
    return (
      <EmptyState
        description="Workspace owners and admins see how governance is performing."
        icon={ShieldCheck}
        title="Governance metrics are for admins"
      />
    );
  const c = data?.current;
  const p = data?.previous;
  const trend = data?.complianceTrend ?? [];
  return (
    <Card data-testid="governance-metrics">
      <CardHeader
        actions={
          <Select
            aria-label="Period"
            className="w-36"
            onValueChange={(value) => setDays(Number(value))}
            options={[7, 30, 90].map((v) => ({ value: String(v), label: `Last ${v} days` }))}
            value={String(days)}
          />
        }
        description="Measured from real events, compared with the period before."
        icon={<ShieldCheck className="h-4 w-4 text-slate-400" />}
        title="How governance is performing"
      />
      {!c || !p ? (
        <div className="p-4">
          <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
        </div>
      ) : (
        <>
          <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            <Stat
              hint={`${c.shadowAi.detected} unregistered agent${c.shadowAi.detected === 1 ? '' : 's'} found`}
              label="Time to detect shadow AI"
              testId="metric-detect"
              value={withPrevious(c.shadowAi.detectMs, p.shadowAi.detectMs)}
            />
            <Stat
              hint={`${c.shadowAi.remediated} of ${c.shadowAi.detected} given a key or blocked`}
              label="Time to remediate shadow AI"
              testId="metric-remediate"
              value={withPrevious(c.shadowAi.remediateMs, p.shadowAi.remediateMs)}
            />
            <Stat
              hint={`${c.approvals.decided} decided · median ${formatDuration(c.approvals.medianMs)}`}
              label="Approval latency"
              testId="metric-approval"
              value={withPrevious(c.approvals.averageMs, p.approvals.averageMs)}
            />
            <Stat
              hint={`${c.incidents.opened} incident${c.incidents.opened === 1 ? '' : 's'}${c.incidents.resolveMs != null ? ` · resolved in ${formatDuration(c.incidents.resolveMs)}` : ''}`}
              label="Mean time to contain"
              testId="metric-contain"
              value={withPrevious(c.incidents.containMs, p.incidents.containMs)}
            />
          </div>
          <div className="grid gap-4 border-t border-slate-100 p-4 lg:grid-cols-2">
            <div>
              <div className="text-[13px] font-medium text-slate-900">Policy hit rate</div>
              <p className="m-0 mt-0.5 text-xs text-slate-500">
                {pct(c.policies.hitRate)} of {c.policies.actions.toLocaleString()} agent actions
                were decided by a policy · {(c.policies.outcomes.blocked ?? 0).toLocaleString()}{' '}
                blocked · {(c.policies.outcomes.pending_approval ?? 0).toLocaleString()} held
              </p>
              {c.policies.top.length ? (
                <ul className="m-0 mt-2 list-none space-y-1 p-0">
                  {c.policies.top.map((policy) => (
                    <li
                      className="flex items-center justify-between gap-3 text-xs"
                      key={policy.name}
                    >
                      <span className="truncate text-slate-700">{policy.name}</span>
                      <span className="font-mono text-slate-500">
                        {policy.hits.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-medium text-slate-900">
                  Compliance score trend
                </span>
                <Link
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  to="/agents/compliance"
                >
                  Open compliance
                </Link>
              </div>
              {trend.length >= 2 ? (
                <div className="mt-1 text-brand-600">
                  <Trend points={trend} />
                  <p className="m-0 text-xs text-slate-500">
                    {trend[0].score} on {new Date(trend[0].date).toLocaleDateString()} →{' '}
                    {trend[trend.length - 1].score} today
                  </p>
                </div>
              ) : (
                <p className="m-0 mt-1 text-xs text-slate-500">
                  {trend.length
                    ? `Score ${trend[0].score}. A trend appears after a second day of checks.`
                    : 'No compliance checks yet.'}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Agents and AI                                                        */
/* ------------------------------------------------------------------ */

export function AgentMetrics(): JSX.Element {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<AgentTelemetry | null>(null);
  useEffect(() => {
    setData(null);
    telemetryApi
      .agents(days)
      .then(setData)
      .catch(() =>
        setData({
          days,
          agents: [],
          totals: { calls: 0, blocked: 0, held: 0, costUsd: 0, tokens: 0 },
        }),
      );
  }, [days]);
  const cell = 'px-3 py-2.5 text-right font-mono tabular-nums';
  return (
    <Card data-testid="agent-metrics">
      <CardHeader
        actions={
          <Select
            aria-label="Period"
            className="w-36"
            onValueChange={(value) => setDays(Number(value))}
            options={[7, 30].map((v) => ({ value: String(v), label: `Last ${v} days` }))}
            value={String(days)}
          />
        }
        description={
          data
            ? `${data.totals.calls.toLocaleString()} calls · ${data.totals.blocked} blocked · ${data.totals.held} held · $${data.totals.costUsd.toFixed(2)} AI cost`
            : 'Calls, decisions, speed and AI cost per agent.'
        }
        icon={<Bot className="h-4 w-4 text-slate-400" />}
        title="Agents and AI"
      />
      {data == null ? (
        <div className="p-4">
          <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
        </div>
      ) : data.agents.length === 0 ? (
        <div className="p-4">
          <EmptyState
            compact
            description="Agents appear here once they make a call."
            icon={Bot}
            title="No agent activity in this period"
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="px-3 py-2 text-right font-medium">Calls</th>
                <th className="px-3 py-2 text-right font-medium">Blocked</th>
                <th className="px-3 py-2 text-right font-medium">Held</th>
                <th className="px-3 py-2 text-right font-medium">Avg time</th>
                <th className="px-3 py-2 text-right font-medium">AI calls</th>
                <th className="px-3 py-2 text-right font-medium">Tokens</th>
                <th className="px-4 py-2 text-right font-medium">AI cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.agents.map((agent) => (
                <tr className="hover:bg-slate-50/60" data-testid="agent-metric-row" key={agent.id}>
                  <td className="px-4 py-2.5">
                    <Link
                      className="font-medium text-slate-900 hover:text-brand-700"
                      to={`/agents/inventory?agent=${agent.id}`}
                    >
                      {agent.name}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {KIND_LABELS[agent.kind as AgentKind] ?? agent.kind}
                      {agent.status !== 'active' ? ` · ${agent.status}` : ''}
                    </div>
                  </td>
                  <td className={cell}>{agent.calls.toLocaleString()}</td>
                  <td className={cell}>
                    {agent.blocked ? (
                      <Link
                        className="text-red-700 hover:underline"
                        title="See the blocked actions and the rule that blocked each"
                        to={`/activity?agent=${agent.id}&outcome=blocked`}
                      >
                        {agent.blocked}
                      </Link>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className={cell}>
                    {agent.held ? (
                      <Link
                        className="text-amber-700 hover:underline"
                        to={`/activity?agent=${agent.id}&outcome=pending_approval`}
                      >
                        {agent.held}
                      </Link>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className={cell}>
                    {agent.latencyMs != null ? `${agent.latencyMs} ms` : '—'}
                  </td>
                  <td className={cell}>{agent.aiCalls.toLocaleString()}</td>
                  <td className={cell}>{agent.tokens.toLocaleString()}</td>
                  <td className={cn(cell, 'pr-4')}>
                    {agent.costUsd ? `$${agent.costUsd.toFixed(2)}` : '—'}
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

/* ------------------------------------------------------------------ */
/* What one person did                                                  */
/* ------------------------------------------------------------------ */

const KIND_ICON = { event: MousePointerClick, guide: BookOpen, survey: ClipboardList } as const;

function JourneyRow({
  item,
  who,
  integration,
}: {
  item: JourneyItem;
  who: string;
  integration: string;
}): JSX.Element {
  const Icon = KIND_ICON[item.kind];
  const props =
    item.properties && Object.keys(item.properties).length ? JSON.stringify(item.properties) : '';
  return (
    <li className="flex items-start gap-3 px-4 py-2.5" data-testid="journey-item">
      <span
        aria-hidden
        className="mt-0.5 inline-grid h-6 w-6 shrink-0 place-items-center rounded bg-slate-100 text-slate-600"
      >
        <Icon size={13} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-slate-900">
          {item.title}
          {item.detail ? <span className="text-slate-500"> · {item.detail}</span> : null}
        </div>
        {props ? (
          <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500" title={props}>
            {props}
          </div>
        ) : null}
      </div>
      <time
        className="shrink-0 font-mono text-xs text-slate-500"
        dateTime={item.at}
        title={new Date(item.at).toLocaleString()}
      >
        {new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </time>
      <CreateTaskButton
        insight={{
          title: `Follow up with ${who}: ${item.title}`,
          summary: `${who} in ${integration}: ${item.title}${item.detail ? ` (${item.detail})` : ''} on ${new Date(item.at).toLocaleString()}.`,
          source: `User journey · ${integration}`,
          link: item.link,
        }}
        label="Task"
      />
    </li>
  );
}

/** Look up a person (or a session) and see what they did, in order. Properties are masked. */
export function PeoplePanel(): JSX.Element {
  const [integrations, setIntegrations] = useState<Array<{ id: string; name: string }> | null>(
    null,
  );
  const [integrationId, setIntegrationId] = useState('');
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<Person[] | null>(null);
  const [selected, setSelected] = useState<{ user?: string; session?: string } | null>(null);
  const [journey, setJourney] = useState<Journey | null>(null);

  useEffect(() => {
    listIntegrations()
      .then((items) => {
        setIntegrations(items.map((i) => ({ id: i.id, name: i.name })));
        setIntegrationId((current) => current || items[0]?.id || '');
      })
      .catch(() => setIntegrations([]));
  }, []);

  useEffect(() => {
    if (!integrationId) return;
    setPeople(null);
    const timer = window.setTimeout(() => {
      telemetryApi
        .people(integrationId, query.trim())
        .then(setPeople)
        .catch(() => setPeople([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [integrationId, query]);

  useEffect(() => {
    if (!integrationId || !selected) return;
    setJourney(null);
    telemetryApi
      .journey(integrationId, selected)
      .then(setJourney)
      .catch(() =>
        setJourney({
          items: [],
          summary: {
            events: 0,
            guidesCompleted: 0,
            guidesLeft: 0,
            surveys: 0,
            firstSeen: null,
            lastSeen: null,
          },
        }),
      );
  }, [integrationId, selected]);

  const integrationName = integrations?.find((i) => i.id === integrationId)?.name ?? 'your app';
  if (integrations && integrations.length === 0) {
    return (
      <EmptyState
        description="Add the SDK to your app to see what each person does."
        icon={Users}
        title="No SDK integration yet"
      />
    );
  }
  const who = selected?.user ?? (selected?.session ? `session ${selected.session}` : '');
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]" data-testid="people-panel">
      <Card>
        <CardHeader
          description="People seen recently in the integration."
          icon={<Users className="h-4 w-4 text-slate-400" />}
          title="People"
        />
        <div className="space-y-2 border-b border-slate-100 p-3">
          <Select
            aria-label="Integration"
            onValueChange={(value) => {
              setIntegrationId(value);
              setSelected(null);
            }}
            options={(integrations ?? []).map((i) => ({ value: i.id, label: i.name }))}
            value={integrationId}
          />
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            />
            <Input
              aria-label="Find a person or session"
              className="pl-8"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="User id, or session:abc"
              value={query}
            />
          </div>
          {query.trim().startsWith('session:') && query.trim().length > 8 ? (
            <button
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
              onClick={() => setSelected({ session: query.trim().slice(8) })}
              type="button"
            >
              Show session {query.trim().slice(8)}
            </button>
          ) : null}
        </div>
        {people == null ? (
          <div className="space-y-2 p-3">
            <div className="h-9 animate-pulse rounded bg-slate-100" />
            <div className="h-9 animate-pulse rounded bg-slate-100" />
          </div>
        ) : people.length === 0 ? (
          <p className="m-0 px-4 py-4 text-[13px] text-slate-600">No one found.</p>
        ) : (
          <ul className="m-0 max-h-[420px] list-none divide-y divide-slate-100 overflow-y-auto p-0">
            {people.map((person) => (
              <li key={person.user}>
                <button
                  aria-pressed={selected?.user === person.user}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50',
                    selected?.user === person.user && 'bg-slate-50',
                  )}
                  data-testid="person-row"
                  onClick={() => setSelected({ user: person.user })}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-slate-900">
                      {person.user}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {person.events} event{person.events === 1 ? '' : 's'} · {person.sessions}{' '}
                      session{person.sessions === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {timeAgo(person.lastSeen)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card data-testid="journey">
        <CardHeader
          description={
            selected
              ? 'Oldest first. Emails, phone numbers and secrets in event properties are masked.'
              : 'Choose a person to see what they did.'
          }
          icon={<MousePointerClick className="h-4 w-4 text-slate-400" />}
          title={selected ? `What ${who} did` : 'Journey'}
        />
        {!selected ? (
          <div className="p-4">
            <EmptyState
              compact
              description="Pick someone on the left, or search by user id or session."
              icon={Users}
              title="No one selected"
            />
          </div>
        ) : journey == null ? (
          <div className="p-4">
            <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : journey.items.length === 0 ? (
          <p className="m-0 px-4 py-4 text-[13px] text-slate-600">Nothing recorded for {who}.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-2.5">
              <Badge tone="neutral">
                {journey.summary.events} event{journey.summary.events === 1 ? '' : 's'}
              </Badge>
              <Badge tone={journey.summary.guidesCompleted ? 'success' : 'neutral'}>
                {journey.summary.guidesCompleted} guide
                {journey.summary.guidesCompleted === 1 ? '' : 's'} completed
              </Badge>
              {journey.summary.guidesLeft ? (
                <Badge tone="warning">
                  {journey.summary.guidesLeft} guide{journey.summary.guidesLeft === 1 ? '' : 's'}{' '}
                  not finished
                </Badge>
              ) : null}
              <Badge tone="neutral">
                {journey.summary.surveys} survey answer{journey.summary.surveys === 1 ? '' : 's'}
              </Badge>
            </div>
            <ul className="m-0 list-none divide-y divide-slate-100 p-0">
              {journey.items.map((item, index) => (
                <JourneyRow
                  integration={integrationName}
                  item={item}
                  key={`${item.at}-${index}`}
                  who={who}
                />
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
