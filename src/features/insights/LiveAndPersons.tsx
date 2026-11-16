import { Activity, ArrowLeft, Pause, Play, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import EmptyState from '@/components/EmptyState';
import { Badge, Button, Card, CardHeader, Input } from '@/components/ui';
import { timeAgo } from '@/services/agents';
import type { Sources } from '@/services/insights';
import {
  observabilityApi,
  type LiveEvent,
  type PersonProfile,
  type PersonRow,
} from '@/services/observability';
import { toDisplayErrorMessage } from '@/utils/apiError';

import { IntegrationPicker, NoApps, useIntegration } from './Logs';

const preview = (props: Record<string, unknown>): string =>
  Object.entries(props)
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join('  ·  ');

/** Events as they arrive, newest first. */
export function Live({
  sources,
  onPerson,
}: {
  sources: Sources;
  onPerson: (id: string, integrationId: string) => void;
}): JSX.Element {
  const [integrationId, setIntegrationId] = useIntegration(sources);
  const [events, setEvents] = useState<LiveEvent[] | null>(null);
  const [event, setEvent] = useState('');
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const newest = useRef<string | null>(null);

  useEffect(() => {
    if (!integrationId) return;
    let live = true;
    setEvents(null);
    setError(null);
    newest.current = null;
    observabilityApi
      .live(integrationId, { event: event || undefined })
      .then((r) => {
        if (!live) return;
        setEvents(r.events);
        newest.current = r.newest;
      })
      .catch((e) => live && (setEvents([]), setError(toDisplayErrorMessage(e))));
    return () => {
      live = false;
    };
  }, [integrationId, event]);

  useEffect(() => {
    if (paused || !integrationId) return;
    const id = window.setInterval(async () => {
      if (document.hidden || !newest.current) return;
      try {
        const r = await observabilityApi.live(integrationId, {
          after: newest.current,
          event: event || undefined,
        });
        if (r.events.length) {
          newest.current = r.newest;
          setEvents((cur) => [...r.events, ...(cur ?? [])].slice(0, 500));
        }
      } catch {
        /* try again on the next tick */
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [paused, integrationId, event]);

  if (!sources.integrations.length) return <NoApps what="live events" />;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3" data-testid="live-events">
      <div className="flex flex-wrap items-center gap-2">
        <IntegrationPicker onChange={setIntegrationId} sources={sources} value={integrationId} />
        <div className="w-56">
          <Input
            aria-label="Event name"
            onChange={(e) => setEvent(e.target.value.trim())}
            placeholder="Only this event name"
            value={event}
          />
        </div>
        <span className="flex-1" />
        <span
          aria-live="polite"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500"
        >
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full ${paused ? 'bg-slate-300' : 'animate-pulse bg-green-500'}`}
          />
          {paused ? 'Paused' : 'Live: new events appear within a few seconds'}
        </span>
        <Button icon={paused ? Play : Pause} onClick={() => setPaused(!paused)}>
          {paused ? 'Resume' : 'Pause'}
        </Button>
      </div>
      {error ? (
        <p
          className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : events == null ? (
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      ) : !events.length ? (
        <EmptyState
          compact
          description="Events your app sends with the SDK show up here as they happen."
          icon={Activity}
          title="No events in the last 24 hours"
        />
      ) : (
        <Card>
          <ul className="m-0 list-none divide-y divide-slate-100 p-0" data-testid="live-list">
            {events.map((e) => (
              <li
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2"
                data-testid="live-row"
                key={e.id}
              >
                <span
                  className="w-20 shrink-0 font-mono text-xs text-slate-500"
                  title={new Date(e.at).toLocaleString()}
                >
                  {new Date(e.at).toLocaleTimeString(undefined, { hour12: false })}
                </span>
                <span className="text-[13px] font-medium text-slate-900">{e.event}</span>
                {e.user ? (
                  <button
                    className="border-0 bg-transparent p-0 text-xs text-brand-600 hover:text-brand-700"
                    onClick={() => onPerson(e.user ?? '', integrationId)}
                    type="button"
                  >
                    {e.user}
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">anonymous</span>
                )}
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-500">
                  {preview(e.properties)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Profile({
  integrationId,
  id,
  onBack,
}: {
  integrationId: string;
  id: string;
  onBack: () => void;
}): JSX.Element {
  const [p, setP] = useState<PersonProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setP(null);
    setError(null);
    observabilityApi
      .person(integrationId, id)
      .then(setP)
      .catch((e) => setError(toDisplayErrorMessage(e)));
  }, [integrationId, id]);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3" data-testid="person-profile">
      <div className="flex items-center gap-2">
        <Button
          aria-label="Back to persons"
          icon={ArrowLeft}
          onClick={onBack}
          size="sm"
          variant="ghost"
        >
          Persons
        </Button>
        <h2 className="m-0 truncate text-lg font-semibold text-slate-900">{id}</h2>
      </div>
      {error ? (
        <p
          className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : !p ? (
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        <>
          <Card className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-4">
            {[
              ['Events', p.events.toLocaleString()],
              ['Sessions', p.sessions.toLocaleString()],
              ['First seen', p.firstSeen ? new Date(p.firstSeen).toLocaleDateString() : '—'],
              ['Last seen', p.lastSeen ? timeAgo(p.lastSeen) : '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="m-0 text-xs text-slate-500">{k}</p>
                <p className="m-0 font-mono text-lg font-semibold tabular-nums text-slate-900">
                  {v}
                </p>
              </div>
            ))}
          </Card>
          <div className="grid gap-3 lg:grid-cols-[1fr_1.6fr]">
            <div className="grid content-start gap-3">
              <Card>
                <CardHeader title="Properties" />
                {Object.keys(p.properties).length ? (
                  <dl
                    className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 p-4 text-[13px]"
                    data-testid="person-properties"
                  >
                    {Object.entries(p.properties).map(([k, v]) => (
                      <div className="contents" key={k}>
                        <dt className="text-slate-500">{k}</dt>
                        <dd className="m-0 break-all text-slate-900">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="m-0 px-4 py-4 text-[13px] text-slate-500">
                    No properties were sent for this person.
                  </p>
                )}
              </Card>
              <Card>
                <CardHeader title="Top events" />
                <ul className="m-0 list-none divide-y divide-slate-100 p-0">
                  {p.topEvents.map((e) => (
                    <li
                      className="flex items-center justify-between px-4 py-2 text-[13px]"
                      key={e.name}
                    >
                      <span className="text-slate-900">{e.name}</span>
                      <span className="font-mono tabular-nums text-slate-600">{e.count}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
            <Card>
              <CardHeader description="The most recent events, newest first." title="Timeline" />
              <ul
                className="m-0 list-none divide-y divide-slate-100 p-0"
                data-testid="person-timeline"
              >
                {p.timeline.map((e) => (
                  <li className="grid gap-0.5 px-4 py-2" key={e.id}>
                    <span className="flex items-baseline gap-2">
                      <span className="text-[13px] font-medium text-slate-900">{e.event}</span>
                      <span className="text-xs text-slate-500">
                        {new Date(e.at).toLocaleString()}
                      </span>
                    </span>
                    {Object.keys(e.properties).length ? (
                      <span className="truncate font-mono text-xs text-slate-500">
                        {preview(e.properties)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

/** Everyone who sent events in the last 90 days, with their properties and a timeline. */
export function Persons({
  sources,
  openId,
  openIntegration,
  onOpen,
}: {
  sources: Sources;
  openId: string | null;
  openIntegration: string | null;
  onOpen: (id: string | null, integrationId?: string) => void;
}): JSX.Element {
  const [integrationId, setIntegrationId] = useIntegration(sources);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState<Awaited<ReturnType<typeof observabilityApi.persons>> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => setQ(text.trim()), 300);
    return () => window.clearTimeout(t);
  }, [text]);
  useEffect(() => {
    if (!integrationId || openId) return;
    let live = true;
    setData(null);
    setError(null);
    observabilityApi
      .persons(integrationId, q)
      .then((r) => live && setData(r))
      .catch(
        (e) =>
          live &&
          (setData({ total: 0, truncated: false, persons: [] }),
          setError(toDisplayErrorMessage(e))),
      );
    return () => {
      live = false;
    };
  }, [integrationId, q, openId]);
  if (!sources.integrations.length) return <NoApps what="persons" />;
  if (openId)
    return (
      <Profile
        id={openId}
        integrationId={openIntegration ?? integrationId}
        onBack={() => onOpen(null)}
      />
    );
  const rows: PersonRow[] = data?.persons ?? [];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3" data-testid="persons">
      <div className="flex flex-wrap items-center gap-2">
        <IntegrationPicker onChange={setIntegrationId} sources={sources} value={integrationId} />
        <div className="min-w-[200px] flex-1">
          <Input
            aria-label="Search persons"
            onChange={(e) => setText(e.target.value)}
            placeholder="Search by identifier"
            value={text}
          />
        </div>
        {data ? (
          <span className="text-xs text-slate-500">
            {data.total.toLocaleString()} {data.total === 1 ? 'person' : 'people'}, last 90 days
          </span>
        ) : null}
      </div>
      {data?.truncated ? (
        <p
          className="m-0 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"
          role="status"
        >
          Partial list: only the newest 100,000 events were read, so some people and counts may be
          missing.
        </p>
      ) : null}
      {error ? (
        <p
          className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : data == null ? (
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      ) : !rows.length ? (
        <EmptyState
          compact
          description={
            q
              ? 'Nobody matches this search.'
              : 'People appear here once your app identifies them with the SDK.'
          }
          icon={Users}
          title={q ? 'No match' : 'No persons yet'}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                {['Person', 'Properties', 'Events', 'Sessions', 'Last seen'].map((h) => (
                  <th className="px-4 py-2 font-medium" key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  data-testid="person-row"
                  key={p.id}
                  onClick={() => onOpen(p.id, integrationId)}
                >
                  <td className="px-4 py-2">
                    <button
                      className="border-0 bg-transparent p-0 text-left font-medium text-slate-900 hover:text-brand-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(p.id, integrationId);
                      }}
                      type="button"
                    >
                      {p.id}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <span className="flex flex-wrap gap-1">
                      {Object.entries(p.properties)
                        .slice(0, 3)
                        .map(([k, v]) => (
                          <Badge key={k} tone="neutral">
                            {k}: {String(v)}
                          </Badge>
                        ))}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono tabular-nums">{p.events.toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono tabular-nums">{p.sessions}</td>
                  <td className="px-4 py-2 text-slate-600">{timeAgo(p.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
