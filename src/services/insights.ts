import api from '@/services/api';

type Envelope<T> = { success: boolean; data: T };
const unwrap = <T>(promise: Promise<{ data: Envelope<T> }>): Promise<T> =>
  promise.then((res) => res.data.data);

export type InsightKind = 'trends' | 'funnel' | 'retention' | 'paths';
export type Visualization = 'line' | 'bar' | 'number' | 'table';
export type MathOp = 'total' | 'unique_users' | 'unique_sessions' | 'sum' | 'average';
export type FilterOp = 'eq' | 'neq' | 'contains' | 'not_contains' | 'gt' | 'lt' | 'set' | 'not_set';
export type Source = 'events' | 'pristine';
export type Interval = 'hour' | 'day' | 'week';
export type RangeKey = '1h' | '24h' | '7d' | '14d' | '30d' | '90d' | '180d';

export interface PropertyFilter {
  property: string;
  op: FilterOp;
  value?: string | number | null;
}

export interface SeriesSpec {
  event: string;
  math: MathOp;
  property?: string | null;
  label?: string;
  /** Narrows this series' events (alerts keep the chart's filters here). */
  filters?: PropertyFilter[];
}

/** The query part of an insight, as the API takes it. */
export interface InsightQuery {
  series?: SeriesSpec[];
  breakdown?: string | null;
  interval?: Interval | null;
  compare?: boolean;
  filters?: PropertyFilter[];
  cohortId?: string | null;
  steps?: Array<{ event: string }>;
  windowHours?: number;
  by?: 'user' | 'session';
  startEvent?: string | null;
  returnEvent?: string | null;
  period?: 'day' | 'week';
  periods?: number;
  depth?: number;
  tzOffsetMinutes?: number;
}

export interface TrendsResult {
  kind: 'trends';
  from: number;
  to: number;
  interval: Interval;
  truncated: boolean;
  buckets: number[];
  series: Array<{
    key: string;
    label: string;
    event: string;
    breakdownValue: string | null;
    points: Array<{ t: number; value: number }>;
    total: number;
  }>;
  otherFolded: number;
  previousTotals: number[] | null;
}

export interface FunnelResult {
  kind: 'funnel';
  from: number;
  to: number;
  windowHours: number;
  truncated: boolean;
  entered: number;
  converted: number;
  steps: Array<{
    index: number;
    event: string;
    count: number;
    conversionFromStart: number;
    conversionFromPrevious: number;
    dropped: number;
    medianMsFromPrevious: number | null;
  }>;
}

export interface RetentionResult {
  kind: 'retention';
  from: number;
  to: number;
  period: 'day' | 'week';
  periods: number;
  truncated: boolean;
  cohorts: Array<{
    start: number;
    size: number;
    values: Array<number | null>;
    counts: Array<number | null>;
  }>;
  average: Array<number | null>;
}

export interface PathsResult {
  kind: 'paths';
  from: number;
  to: number;
  depth: number;
  truncated: boolean;
  sessions: number;
  edges: Array<{ step: number; from: string; to: string; count: number }>;
}

export type QueryResult = TrendsResult | FunnelResult | RetentionResult | PathsResult;

export interface SavedInsight {
  id: string;
  name: string;
  description?: string;
  kind: InsightKind;
  source: Source;
  integrationId: string | null;
  query: InsightQuery;
  visualization: Visualization;
  updatedAt: string;
}

export interface DashboardPanel {
  id: string;
  insightId: string;
  title?: string | null;
  width: 3 | 4 | 6 | 8 | 12;
  visualization?: Visualization | null;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  panels: DashboardPanel[];
  range: RangeKey;
  refreshSeconds: number;
  updatedAt: string;
  insights?: SavedInsight[];
}

export interface CohortRule {
  kind: 'did' | 'did_not';
  event: string;
  count?: number;
  withinDays: number;
}

export interface CohortDefinition {
  match: 'all' | 'any';
  rules: CohortRule[];
  properties?: PropertyFilter[];
}

export interface Cohort {
  id: string;
  integrationId: string;
  name: string;
  description?: string;
  definition: CohortDefinition;
  lastCount: number | null;
  lastComputedAt: string | null;
}

export type AlertCondition = 'above' | 'below' | 'change_up' | 'change_down';

export interface MetricAlert {
  id: string;
  name: string;
  source: Source;
  integrationId: string | null;
  metric: SeriesSpec;
  windowHours: number;
  condition: AlertCondition;
  threshold: number;
  enabled: boolean;
  state: 'ok' | 'firing' | 'no_data';
  lastValue: number | null;
  lastDetail: string | null;
  lastEvaluatedAt: string | null;
  lastFiredAt: string | null;
  openTask: { taskId: string; projectId: string | null } | null;
}

export interface Sources {
  integrations: Array<{ id: string; name: string; status: string }>;
  metrics: Array<{ id: string; label: string; unit: string }>;
}

export interface EventSchema {
  integration: { id: string; name: string };
  users: number;
  truncated: boolean;
  events: Array<{ name: string; count: number }>;
  properties: Array<{ name: string; count: number; samples: string[] }>;
}

/** The viewer's offset from UTC in minutes (east positive), so days follow their clock. */
export const tzOffsetMinutes = (): number => -new Date().getTimezoneOffset();

export const insightsApi = {
  sources: () => unwrap<Sources>(api.get('/insights/sources')),
  schema: (integrationId: string) =>
    unwrap<EventSchema>(api.get('/insights/schema', { params: { integrationId }, silent: true })),
  query: (body: {
    kind: InsightKind;
    source: Source;
    integrationId?: string | null;
    query: InsightQuery;
    range?: RangeKey;
  }) =>
    unwrap<QueryResult>(
      api.post(
        '/insights/query',
        { ...body, query: { ...body.query, tzOffsetMinutes: tzOffsetMinutes() } },
        { silent: true },
      ),
    ),

  saved: () => unwrap<SavedInsight[]>(api.get('/insights/saved')),
  save: (body: Omit<SavedInsight, 'id' | 'updatedAt'>) =>
    unwrap<SavedInsight>(api.post('/insights/saved', body)),
  updateSaved: (id: string, body: Partial<Omit<SavedInsight, 'id' | 'updatedAt'>>) =>
    unwrap<SavedInsight>(api.patch(`/insights/saved/${id}`, body)),
  deleteSaved: (id: string) => unwrap<{ deleted: boolean }>(api.delete(`/insights/saved/${id}`)),
  runSaved: (id: string, range: RangeKey) =>
    unwrap<{ insight: SavedInsight; result: QueryResult }>(
      api.post(`/insights/saved/${id}/run`, { range }, { silent: true }),
    ),

  dashboards: () => unwrap<Dashboard[]>(api.get('/insights/dashboards')),
  dashboard: (id: string) => unwrap<Dashboard>(api.get(`/insights/dashboards/${id}`)),
  createDashboard: (body: Partial<Dashboard>) =>
    unwrap<Dashboard>(api.post('/insights/dashboards', body)),
  updateDashboard: (id: string, body: Partial<Dashboard>) =>
    unwrap<Dashboard>(api.patch(`/insights/dashboards/${id}`, body)),
  deleteDashboard: (id: string) =>
    unwrap<{ deleted: boolean }>(api.delete(`/insights/dashboards/${id}`)),

  cohorts: (integrationId?: string) =>
    unwrap<Cohort[]>(api.get('/insights/cohorts', { params: { integrationId } })),
  createCohort: (body: {
    integrationId: string;
    name: string;
    description?: string;
    definition: CohortDefinition;
  }) => unwrap<Cohort>(api.post('/insights/cohorts', body)),
  updateCohort: (
    id: string,
    body: Partial<{ name: string; description: string; definition: CohortDefinition }>,
  ) => unwrap<Cohort>(api.patch(`/insights/cohorts/${id}`, body)),
  deleteCohort: (id: string) => unwrap<{ deleted: boolean }>(api.delete(`/insights/cohorts/${id}`)),
  previewCohort: (integrationId: string, definition: CohortDefinition) =>
    unwrap<{ count: number; sample: string[]; truncated: boolean }>(
      api.post('/insights/cohorts/preview', { integrationId, definition }, { silent: true }),
    ),
  cohortMembers: (id: string) =>
    unwrap<{ count: number; sample: string[]; truncated: boolean }>(
      api.get(`/insights/cohorts/${id}/members`),
    ),

  alerts: () => unwrap<MetricAlert[]>(api.get('/insights/alerts')),
  createAlert: (body: Partial<MetricAlert>) =>
    unwrap<MetricAlert>(api.post('/insights/alerts', body)),
  updateAlert: (id: string, body: Partial<MetricAlert>) =>
    unwrap<MetricAlert>(api.patch(`/insights/alerts/${id}`, body)),
  deleteAlert: (id: string) => unwrap<{ deleted: boolean }>(api.delete(`/insights/alerts/${id}`)),
  checkAlert: (id: string) =>
    unwrap<{ outcome: string; alert: MetricAlert }>(api.post(`/insights/alerts/${id}/check`)),
};

export const RANGE_OPTIONS: Array<{ value: RangeKey; label: string }> = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '180d', label: 'Last 180 days' },
];

export const MATH_LABELS: Record<MathOp, string> = {
  total: 'Total count',
  unique_users: 'Unique users',
  unique_sessions: 'Unique sessions',
  sum: 'Sum of a property',
  average: 'Average of a property',
};

export const FILTER_OP_LABELS: Record<FilterOp, string> = {
  eq: 'is',
  neq: 'is not',
  contains: 'contains',
  not_contains: 'does not contain',
  gt: 'greater than',
  lt: 'less than',
  set: 'is set',
  not_set: 'is not set',
};

export const CONDITION_LABELS: Record<AlertCondition, string> = {
  above: 'goes above',
  below: 'goes below',
  change_up: 'rises by more than (%)',
  change_down: 'falls by more than (%)',
};

export const KIND_LABELS: Record<InsightKind, string> = {
  trends: 'Trends',
  funnel: 'Funnel',
  retention: 'Retention',
  paths: 'Paths',
};
