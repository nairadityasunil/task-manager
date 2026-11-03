import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Bot, CircleUser, ListChecks, MousePointerClick, RefreshCw, ShieldCheck } from 'lucide-react';

import { Button, cn, DateInput, Field, Select } from '@/components/ui';
import { useWorkspace } from '@/features/workspaces';
import { workspaceService } from '@/features/workspaces/services/workspaceService';
import api from '@/services/api';
import { timeAgo } from '@/services/agents';

type Kind = 'work' | 'agent' | 'approval' | 'event';

interface TimelineItem {
  id: string;
  kind: Kind;
  at: string;
  title: string;
  detail?: string;
  actor: { type: 'person' | 'agent' | 'end_user'; id?: string; name: string };
  projectId?: string | null;
  link?: string;
}

const KINDS: Array<{ id: Kind; label: string; icon: typeof Activity }> = [
  { id: 'work', label: 'Task changes', icon: ListChecks },
  { id: 'agent', label: 'Agent actions', icon: Bot },
  { id: 'approval', label: 'Approvals', icon: ShieldCheck },
  { id: 'event', label: 'User events', icon: MousePointerClick }
];

const KIND_TONE: Record<Kind, string> = {
  work: 'bg-slate-100 text-slate-700',
  agent: 'bg-violet-50 text-violet-700',
  approval: 'bg-orange-50 text-orange-700',
  event: 'bg-sky-50 text-sky-700'
};

const dayLabel = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};

/** One list for everything that happened: task changes, agent actions, approvals and user events. */
export default function ActivityTimelinePage({ projects }: { projects: Array<{ id: string; name: string }> }): JSX.Element {
  const { activeWorkspace } = useWorkspace();
  const [kinds, setKinds] = useState<Kind[]>(['work', 'agent', 'approval', 'event']);
  const [projectId, setProjectId] = useState('');
  const [personId, setPersonId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');
  const [items, setItems] = useState<TimelineItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<Array<{ id: string; name: string }>>([]);
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (activeWorkspace?.id) {
      workspaceService
        .listMembers(activeWorkspace.id)
        .then((members) => setPeople(members.map((member) => ({ id: member.userId, name: member.name || member.email }))))
        .catch(() => setPeople([]));
    }
    api
      .get('/agents/timeline/agents', { silent: true })
      .then((response) => setAgents((response.data as { data: Array<{ id: string; name: string }> }).data ?? []))
      .catch(() => setAgents([]));
  }, [activeWorkspace?.id]);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/agents/timeline', {
        params: {
          kinds: kinds.join(','),
          projectId: projectId || undefined,
          userId: personId || undefined,
          agentId: agentId || undefined,
          since: since ? `${since}T00:00:00` : undefined,
          until: until ? `${until}T23:59:59` : undefined,
          limit: 120
        }
      })
      .then((response) => setItems((response.data as { data: TimelineItem[] }).data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [kinds, projectId, personId, agentId, since, until]);

  useEffect(load, [load]);

  const groups = useMemo(() => {
    const out: Array<{ day: string; rows: TimelineItem[] }> = [];
    for (const item of items ?? []) {
      const day = dayLabel(item.at);
      if (out[out.length - 1]?.day !== day) out.push({ day, rows: [] });
      out[out.length - 1].rows.push(item);
    }
    return out;
  }, [items]);

  const toggleKind = (kind: Kind) =>
    setKinds((current) => (current.includes(kind) ? (current.length > 1 ? current.filter((k) => k !== kind) : current) : [...current, kind]));

  return (
    <div className="grid gap-5 px-3 py-6 sm:px-6 lg:px-8" data-testid="activity-timeline">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-900">Activity</h1>
          <p className="m-0 mt-1 text-[13px] text-slate-600">Task changes, AI agent actions, approvals and user events in one place.</p>
        </div>
        <Button icon={RefreshCw} loading={loading} onClick={load} size="sm">
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 rounded-[10px] border border-slate-200 bg-white p-3.5">
        <div aria-label="Show" className="flex flex-wrap gap-1.5" role="group">
          {KINDS.map(({ id, label, icon: Icon }) => {
            const on = kinds.includes(id);
            return (
              <button
                aria-pressed={on}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-colors',
                  on ? 'border-slate-300 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                )}
                key={id}
                onClick={() => toggleKind(id)}
                type="button"
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Project">
            <Select onValueChange={setProjectId} options={[{ value: '', label: 'All projects' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} value={projectId} />
          </Field>
          <Field label="Person">
            <Select onValueChange={setPersonId} options={[{ value: '', label: 'Everyone' }, ...people.map((p) => ({ value: p.id, label: p.name }))]} value={personId} />
          </Field>
          <Field label="Agent">
            <Select onValueChange={setAgentId} options={[{ value: '', label: 'Any agent' }, ...agents.map((a) => ({ value: a.id, label: a.name }))]} value={agentId} />
          </Field>
          <Field label="From">
            <DateInput onValueChange={setSince} value={since} />
          </Field>
          <Field label="To">
            <DateInput onValueChange={setUntil} value={until} />
          </Field>
        </div>
      </div>

      {items == null ? (
        <div className="h-40 animate-pulse rounded-[10px] bg-slate-100" />
      ) : items.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <Activity className="mx-auto text-slate-400" size={20} />
          <p className="m-0 mt-2 text-sm font-medium text-slate-900">Nothing matches these filters</p>
          <p className="m-0 mt-1 text-[13px] text-slate-500">Try another time range or show more kinds of activity.</p>
        </div>
      ) : (
        <div className="grid gap-5">
          {groups.map((group) => (
            <section aria-label={group.day} key={group.day}>
              <h2 className="m-0 mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{group.day}</h2>
              <ol className="m-0 list-none overflow-hidden rounded-[10px] border border-slate-200 bg-white p-0">
                {group.rows.map((item) => {
                  const kind = KINDS.find((k) => k.id === item.kind);
                  const Icon = kind?.icon ?? Activity;
                  const ActorIcon = item.actor.type === 'agent' ? Bot : CircleUser;
                  const body = (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <span aria-hidden className={cn('mt-0.5 inline-grid h-7 w-7 shrink-0 place-items-center rounded-md', KIND_TONE[item.kind])}>
                        <Icon size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] text-slate-900">{item.title}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
                          <ActorIcon size={12} />
                          <span>{item.actor.name}</span>
                          {item.detail ? <span>· {item.detail}</span> : null}
                          <span className="sr-only">{kind?.label}</span>
                        </div>
                      </div>
                      <time className="shrink-0 font-mono text-xs text-slate-500" dateTime={item.at} title={new Date(item.at).toLocaleString()}>
                        {timeAgo(item.at)}
                      </time>
                    </div>
                  );
                  return (
                    <li className="border-b border-slate-100 last:border-b-0" data-kind={item.kind} data-testid="timeline-item" key={item.id}>
                      {item.link ? (
                        <Link className="block hover:bg-slate-50" to={item.link}>
                          {body}
                        </Link>
                      ) : (
                        body
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
