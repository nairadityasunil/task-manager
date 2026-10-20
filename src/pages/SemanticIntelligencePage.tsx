import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,
  Database,
  Gauge,
  GitBranch,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Workflow
} from 'lucide-react';
import noDataImg from '@/assets/no_data.png';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { Badge, Button, Card, IconTile, selectClass, type TileTone } from '@/components/ui';
import type { Project } from '@/types/project';
import {
  useSemanticIntelligence,
  timeRangeOptions,
  getValueRecord,
  getMetricNumber,
  formatMetricValue
} from '@/features/semantic-intelligence';
import type { MetricName } from '@/services/semanticAnalytics';

interface SemanticIntelligencePageProps {
  projects: Project[];
  selectedProjectId: string;
  allProjectsValue: string;
}

const ScoreRing = ({ score, size = 60, stroke = 5, color = 'var(--color-slate-700)' }: { score: number, size?: number, stroke?: number, color?: string }) => {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="rotate-[-90deg]" height={size} width={size}>
        <circle
          className="text-slate-100"
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth={stroke}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular-nums text-slate-800">
        {Math.round(score)}
      </span>
    </div>
  );
};

const Sparkline = ({ data }: { data: number[] }) => {
  if (!data || data.length < 2) return null;
  const width = 80;
  const height = 24;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg className="overflow-visible" height={height} width={width}>
      <polyline
        className="text-slate-300"
        fill="none"
        points={points}
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        className="text-slate-500"
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        fill="currentColor"
        r="2"
      />
    </svg>
  );
};

const FactorBar = ({ label, share, color = 'var(--color-slate-700)' }: { label: string, share: number, color?: string }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between gap-2 text-[13px]">
      <span className="font-medium text-slate-700">{label}</span>
      <span className="tabular-nums text-slate-500">{share}%</span>
    </div>
    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div
        className="h-full transition-all duration-1000 ease-out"
        style={{ width: `${share}%`, backgroundColor: color }}
      />
    </div>
  </div>
);

export default function SemanticIntelligencePage({
  projects,
  selectedProjectId,
  allProjectsValue
}: SemanticIntelligencePageProps): JSX.Element {
  const intel = useSemanticIntelligence(projects, selectedProjectId, allProjectsValue);

  const completion = intel.resultByMetric.get('task_completion_rate');
  const health = intel.resultByMetric.get('project_health_score');
  const perUserRows = (getValueRecord(intel.resultByMetric.get('tasks_completed_per_user')).rows ?? []) as Array<{
    userId: string;
    name?: string | null;
    email?: string;
    count: number;
  }>;
  const healthStatus = String(getValueRecord(health).status ?? 'unknown');
  const maxCompleted = Math.max(...perUserRows.map((row) => row.count), 1);

  if (intel.loading && intel.metrics.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-slate-400" size={28} />
          <p className="mt-3 text-sm font-medium text-slate-500">Hydrating Semantic Layer</p>
        </div>
      </div>
    );
  }

  const sectionIcon = (Icon: typeof Activity, tone: 'neutral' | 'red' | 'emerald' = 'neutral') => (
    <div
      className={[
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
        tone === 'red'
          ? 'border-red-100 bg-red-50 text-red-600'
          : tone === 'emerald'
          ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-600'
      ].join(' ')}
    >
      <Icon size={17} />
    </div>
  );

  return (
    <div className="min-h-full bg-slate-50 font-sans">
      <PageHeader
        icon={Sparkles}
        tone="violet"
        title="Semantic Intelligence"
        description="Governed metrics, anomalies and trends across your projects."
      >
        {/* Filter toolbar */}
        <div className="flex flex-wrap items-center gap-2 pb-4 sm:gap-3">
          <div className="relative w-full sm:w-64">
            <Workflow className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              aria-label="Project scope"
              className={`${selectClass} pl-8`}
              onChange={(event) => intel.setActiveProjectId(event.target.value)}
              value={intel.activeProjectId}
            >
              <option value={allProjectsValue}>All Workspaces</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-0.5 hide-scrollbar">
            {timeRangeOptions.map((option) => (
              <button
                className={[
                  'h-8 shrink-0 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors',
                  intel.timeRange === option.value
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:text-slate-900'
                ].join(' ')}
                key={option.value}
                onClick={() => intel.setTimeRange(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          <Button
            className="sm:ml-auto"
            disabled={intel.loading}
            icon={RefreshCw}
            loading={intel.loading}
            onClick={() => void intel.loadIntelligence()}
            variant="primary"
          >
            Sync
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-4 px-3 py-4 sm:px-5 lg:px-6">
        {intel.error ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <AlertTriangle className="shrink-0" size={16} />
            {intel.error}
          </div>
        ) : null}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { metric: 'project_health_score' as MetricName, icon: Gauge, hint: healthStatus.replace(/_/g, ' '), color: 'var(--color-violet-600)', tone: 'violet' as TileTone },
            { metric: 'task_completion_rate' as MetricName, icon: CheckCircle2, hint: `${getMetricNumber(completion, ['completed'])} completed`, color: 'var(--color-emerald-600)', tone: 'emerald' as TileTone },
            { metric: 'overdue_tasks' as MetricName, icon: AlertTriangle, hint: 'open past due date', color: 'var(--color-red-600)', tone: 'rose' as TileTone },
            { metric: 'stale_tasks' as MetricName, icon: Clock3, hint: 'not updated in 7 days', color: 'var(--color-amber-600)', tone: 'amber' as TileTone }
          ].map(({ metric, icon: Icon, hint, color, tone }) => {
            const result = intel.resultByMetric.get(metric);
            const definition = intel.metricByName.get(metric);
            const scoreValue = typeof getValueRecord(result).score === 'number' ? (getValueRecord(result).score as number) : null;
            const label = result?.label ?? metric.replace(/_/g, ' ');

            return (
              <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" key={metric}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="m-0 text-[13px] font-medium text-slate-500 first-letter:uppercase">{label}</p>
                    <h4 className="m-0 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
                      {formatMetricValue(result)}
                    </h4>
                  </div>
                  {scoreValue !== null ? (
                    <ScoreRing color={color} score={scoreValue} size={48} stroke={4} />
                  ) : (
                    <IconTile icon={Icon} size="md" tone={tone} />
                  )}
                </div>

                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <p className="m-0 text-xs text-slate-500 first-letter:uppercase">{hint}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="neutral">
                        <ShieldCheck size={10} />
                        {result?.semantic?.stability ?? definition?.stability ?? 'STABLE'}
                      </Badge>
                      {definition?.AIVisibility === 'safe' && <Badge tone="success">AI-SAFE</Badge>}
                    </div>
                  </div>
                  <Sparkline data={[40, 35, 55, 45, 60, 50, scoreValue ?? 70]} />
                </div>

                {definition?.drilldownSupport && (
                  <Button
                    className="mt-4 w-full"
                    disabled={intel.drilldownLoading === metric}
                    icon={GitBranch}
                    loading={intel.drilldownLoading === metric}
                    onClick={() => void intel.openDrilldown(metric)}
                    size="sm"
                  >
                    Explore Lineage
                  </Button>
                )}
              </section>
            );
          })}
        </div>

        {/* Reasoning Panel */}
        {intel.reasoning && (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col xl:flex-row">
              <div className="min-w-0 flex-1 space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {sectionIcon(Sparkles)}
                    <h4 className="m-0 text-[15px] font-semibold text-slate-900">Operational Reasoning</h4>
                  </div>
                  <Badge
                    className="capitalize"
                    dot
                    tone={intel.reasoning.status === 'at_risk' ? 'danger' : intel.reasoning.status === 'watch' ? 'warning' : 'success'}
                  >
                    {intel.reasoning.status.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <p className="m-0 text-[15px] leading-relaxed text-slate-700">{intel.reasoning.narrative}</p>
                  {intel.reasoning.causalNarrative && (
                    <p className="m-0 border-l-2 border-slate-200 pl-3 text-sm text-slate-500">
                      {intel.reasoning.causalNarrative}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="m-0 mb-3 text-sm font-medium text-slate-700">Semantic Context</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(intel.reasoning.semanticInterpretation ?? {}).map(([key, value]) => (
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700" key={key}>
                          <span className="mr-1 text-slate-500">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                          {value.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="m-0 mb-3 text-sm font-medium text-slate-700">Governance Recommendations</p>
                    <ul className="m-0 list-none space-y-2.5 p-0">
                      {(intel.reasoning.recommendations ?? []).slice(0, 3).map((rec, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={14} />
                          <p className="m-0 text-sm leading-snug text-slate-700">{rec}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="w-full border-t border-slate-200 bg-slate-50/60 p-4 xl:w-80 xl:border-l xl:border-t-0">
                <p className="m-0 mb-4 text-sm font-medium text-slate-700">Intelligence Vectors</p>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  {[
                    { label: 'Delivery Risk', value: intel.reasoning.scores.deliveryRisk, color: 'var(--color-red-500)' },
                    { label: 'Execution Confidence', value: intel.reasoning.scores.executionConfidence, color: 'var(--color-emerald-500)' },
                    { label: 'Workflow Friction', value: intel.reasoning.scores.workflowFriction, color: 'var(--color-amber-500)' },
                    { label: 'Project Momentum', value: intel.reasoning.scores.projectMomentum, color: 'var(--color-sky-500)' }
                  ].map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="m-0 text-[13px] text-slate-600">{item.label}</p>
                        <span className="text-base font-semibold tabular-nums text-slate-900">{item.value}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${item.value}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Intelligence Grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Anomalies Panel */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-3">
                {sectionIcon(AlertTriangle, 'red')}
                <h4 className="m-0 text-[15px] font-semibold text-slate-900">Operational Anomalies</h4>
              </div>
              <span className="text-xs text-slate-500">Threshold: 2.5σ</span>
            </div>

            <div className="space-y-3 p-4">
              {intel.anomalies.length === 0 ? (
                <EmptyState
                  compact
                  description="Operational state within expected semantic bounds."
                  icon={ShieldCheck}
                  title="No anomalies detected"
                />
              ) : (
                intel.anomalies.slice(0, 4).map((anomaly) => (
                  <div className="rounded-lg border border-slate-200 p-4" key={anomaly.metric}>
                    <div className="mb-1.5 flex items-start justify-between gap-3">
                      <span className="break-all font-mono text-xs text-slate-500">{anomaly.metric}</span>
                      <Badge tone="danger">{anomaly.deviation}x deviation</Badge>
                    </div>
                    <p className="m-0 mb-1 text-sm font-medium text-slate-900">{anomaly.explanation}</p>
                    <p className="m-0 text-[13px] text-slate-500">{anomaly.mitigationHints?.[0] || 'No immediate action required'}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Operational Trends Panel */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-3">
                {sectionIcon(TrendingUp)}
                <h4 className="m-0 text-[15px] font-semibold text-slate-900">Operational Trends</h4>
              </div>
              <span className="text-xs text-slate-500">Causal Vectors</span>
            </div>

            <div className="space-y-3 p-4">
              {intel.trends.length === 0 ? (
                <EmptyState
                  compact
                  description="Trends appear once enough activity has been recorded in this window."
                  icon={TrendingUp}
                  title="No trends yet"
                />
              ) : (
                intel.trends.slice(0, 4).map((trend) => (
                  <div className="rounded-lg border border-slate-200 p-4" key={trend.metric}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="break-all font-mono text-xs font-medium text-slate-700">{trend.metric}</span>
                      <Badge tone={trend.direction === 'up' ? 'success' : 'warning'}>{trend.direction.toUpperCase()}</Badge>
                    </div>
                    <p className="m-0 mb-2 text-sm text-slate-600">{trend.interpretation}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums text-slate-500">
                      <span>Confidence: {Math.round(trend.confidence * 100)}%</span>
                      <span>Delta: {trend.delta}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Explainability & Causal Root Cause Section */}
        {intel.explanation && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                {sectionIcon(BarChart3)}
                <div className="min-w-0">
                  <h4 className="m-0 text-[15px] font-semibold text-slate-900">Metric Explainability — Delivery Risk</h4>
                  <p className="m-0 text-[13px] text-slate-500">Deconstructed semantic drivers and root cause attribution</p>
                </div>
              </div>
              <Badge tone="neutral">
                <ShieldCheck size={12} className="text-emerald-600" />
                Lineage: {intel.lineage?.lineage?.sourceCollections?.join(', ') || 'N/A'}
              </Badge>
            </div>

            <div className="grid gap-4 p-4 md:grid-cols-3">
              {intel.explanation.factors.map((factor) => (
                <div key={factor.label} className="space-y-2.5 rounded-lg border border-slate-200 p-4">
                  <FactorBar label={factor.label} share={Math.round(factor.weight * 100)} />
                  <p className="m-0 text-[13px] text-slate-600">{factor.explanation}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Predictive Simulation & Counterfactual Interventions */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex min-w-0 items-center gap-3">
              {sectionIcon(Bot, 'emerald')}
              <div className="min-w-0">
                <h4 className="m-0 text-[15px] font-semibold text-slate-900">Predictive Simulation Engine</h4>
                <p className="m-0 text-[13px] text-slate-500">Simulate counterfactual interventions to evaluate impact prior to execution</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                disabled={intel.simulating}
                icon={ArrowRight}
                loading={intel.simulating}
                onClick={() => void intel.runSimulation('reduce_blockers')}
                size="sm"
                variant="primary"
              >
                Simulate Blockers Reduction
              </Button>
              <Button disabled={intel.simulating} onClick={() => void intel.runSimulation('resolve_overdue')} size="sm">
                Simulate Resolving Overdue
              </Button>
            </div>
          </div>

          {intel.simulation && (
            <div className="mx-4 mb-4 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 sm:mx-5 sm:mb-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-emerald-800">Intervention Simulation Result</span>
                <Badge tone="success">
                  Expected Impact: {intel.simulation.impact > 0 ? `+${intel.simulation.impact}` : intel.simulation.impact} Risk Score
                </Badge>
              </div>
              <p className="m-0 text-sm text-emerald-900">{intel.simulation.explanation}</p>
            </div>
          )}
        </Card>

        {/* User Engagement Performance Grid */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-3">
              {sectionIcon(Database)}
              <h4 className="m-0 text-[15px] font-semibold text-slate-900">Team Execution Breakdown</h4>
            </div>
            <span className="text-xs text-slate-500">{perUserRows.length} active contributors</span>
          </div>

          <div className="p-4">
            {perUserRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <img alt="No activity" className="mb-3 w-24 opacity-50" src={noDataImg} />
                <p className="m-0 text-[13px] text-slate-500">No contributor records found in this window.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {perUserRows.map((row) => (
                  <div key={row.userId} className="space-y-2.5 rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-900">{row.name || row.email || 'User'}</span>
                      <span className="shrink-0 text-xs tabular-nums text-slate-500">{row.count} completed</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-700 transition-all duration-700"
                        style={{ width: `${Math.min(100, (row.count / maxCompleted) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Drilldown Modal */}
        {intel.drilldown && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
                <div className="min-w-0">
                  <h4 className="m-0 truncate text-base font-semibold capitalize text-slate-900">{intel.drilldown.metric.replace(/_/g, ' ')} Lineage</h4>
                  <p className="m-0 text-[13px] text-slate-500">Drilldown results: {intel.drilldown.pagination.total} records</p>
                </div>
                <Button onClick={() => intel.setDrilldown(null)} size="sm" variant="ghost">
                  Close
                </Button>
              </div>

              <div className="space-y-2 overflow-y-auto p-4 sm:p-6">
                {intel.drilldown.rows.map((row, idx) => (
                  <div key={idx} className="space-y-1 rounded-lg border border-slate-200 p-3">
                    <div className="text-sm font-medium text-slate-900">{String(row.title || `Record #${idx + 1}`)}</div>
                    <div className="break-all font-mono text-xs text-slate-500">{JSON.stringify(row)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
