import api from '@/services/api';

type Envelope<T> = { success: boolean; data: T };
const unwrap = <T>(promise: Promise<{ data: Envelope<T> }>): Promise<T> =>
  promise.then((res) => res.data.data);

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
export type LogRange = '15m' | '1h' | '6h' | '24h' | '7d' | '30d';
export const LOG_RANGES: Array<{ value: LogRange; label: string }> = [
  { value: '15m', label: 'Last 15 minutes' },
  { value: '1h', label: 'Last hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

export interface LogRow {
  id: string;
  ts: string;
  level: LogLevel;
  service: string;
  message: string;
  attributes: Record<string, string | number | boolean>;
  traceId: string | null;
  userIdentifier: string | null;
}

export interface LogFilters {
  integrationId: string;
  range: LogRange;
  levels?: LogLevel[];
  service?: string;
  q?: string;
  attr?: string;
  traceId?: string;
}

const params = (f: LogFilters) => ({
  integrationId: f.integrationId,
  range: f.range,
  levels: f.levels && f.levels.length ? f.levels.join(',') : undefined,
  service: f.service || undefined,
  q: f.q || undefined,
  attr: f.attr || undefined,
  traceId: f.traceId || undefined,
});

export interface LiveEvent {
  id: string;
  at: string;
  event: string;
  user: string | null;
  session: string | null;
  properties: Record<string, unknown>;
}

export interface PersonRow {
  id: string;
  events: number;
  sessions: number;
  firstSeen: string;
  lastSeen: string;
  properties: Record<string, string | number | boolean>;
}

export interface PersonProfile {
  id: string;
  properties: Record<string, string | number | boolean>;
  firstSeen: string | null;
  lastSeen: string | null;
  events: number;
  sessions: number;
  topEvents: Array<{ name: string; count: number }>;
  timeline: Array<{
    id: string;
    at: string;
    event: string;
    session: string | null;
    properties: Record<string, unknown>;
  }>;
}

const O = '/observability';
export const observabilityApi = {
  logs: (f: LogFilters, extra: { before?: string; after?: string; limit?: number } = {}) =>
    unwrap<{
      logs: LogRow[];
      hasMore: boolean;
      nextBefore: string | null;
      newest: string | null;
    }>(api.get(`${O}/logs`, { params: { ...params(f), ...extra }, silent: true })),
  logStats: (f: LogFilters) =>
    unwrap<{
      from: number;
      to: number;
      step: number;
      truncated: boolean;
      total: number;
      buckets: Array<{ t: number } & Record<LogLevel, number>>;
      byLevel: Record<LogLevel, number>;
      services: Array<{ name: string; count: number }>;
    }>(api.get(`${O}/logs/stats`, { params: params(f), silent: true })),
  live: (integrationId: string, extra: { after?: string; event?: string; user?: string } = {}) =>
    unwrap<{ events: LiveEvent[]; newest: string | null }>(
      api.get(`${O}/live`, { params: { integrationId, limit: 100, ...extra }, silent: true }),
    ),
  persons: (integrationId: string, q: string) =>
    unwrap<{ total: number; truncated: boolean; persons: PersonRow[] }>(
      api.get(`${O}/persons`, { params: { integrationId, q: q || undefined }, silent: true }),
    ),
  person: (integrationId: string, identifier: string) =>
    unwrap<PersonProfile>(
      api.get(`${O}/persons/${encodeURIComponent(identifier)}`, {
        params: { integrationId },
        silent: true,
      }),
    ),
};

export const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '#8a94a6',
  info: '#2a78d6',
  warn: '#eda100',
  error: '#e34948',
  fatal: '#7a1f1f',
};
