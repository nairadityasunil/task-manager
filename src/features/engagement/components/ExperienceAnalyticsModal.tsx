import { useEffect, useState } from 'react';
import { BarChart3, X } from 'lucide-react';

import {
  getGuideAnalytics,
  getSurveyAnalytics,
  type GuideExperienceAnalytics,
  type SurveyExperienceAnalytics,
  type SurveyQuestionAnalytics
} from '@/lib/engagement/api';
import type { Guide } from '@/lib/guides/types';

const SCALE_TYPES = new Set(['NPS', 'RATING_SCALE', 'OPINION_SCALE', 'CSAT', 'CES']);
const MAX_BARS = 8;

const formatNumber = (value: number): string => new Intl.NumberFormat().format(Math.round(value));
const formatPercent = (value: number): string => `${value.toFixed(value >= 10 || value === 0 ? 0 : 1)}%`;
const formatDuration = (seconds: number): string => {
  if (!seconds) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
};

interface ExperienceAnalyticsModalProps {
  experience: Guide;
  sdkIntegrationId: string;
  onClose: () => void;
}

function ExperienceAnalyticsModal({ experience, sdkIntegrationId, onClose }: ExperienceAnalyticsModalProps): JSX.Element {
  const isSurvey = experience.type === 'SURVEY';
  const [guideData, setGuideData] = useState<GuideExperienceAnalytics | null>(null);
  const [surveyData, setSurveyData] = useState<SurveyExperienceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const request = isSurvey
      ? getSurveyAnalytics(sdkIntegrationId, experience.id).then((data) => !cancelled && setSurveyData(data))
      : getGuideAnalytics(sdkIntegrationId, experience.id).then((data) => !cancelled && setGuideData(data));
    request
      .catch((err: { message?: string }) => !cancelled && setError(err?.message ?? 'Failed to load analytics.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [experience.id, isSurvey, sdkIntegrationId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} role="presentation">
      <aside
        aria-label={`${experience.title} analytics`}
        aria-modal="true"
        className="flex h-full w-full max-w-2xl flex-col bg-slate-50 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="m-0 flex items-center gap-1.5 text-[13px] font-medium text-slate-500">
              <BarChart3 size={14} /> {isSurvey ? 'Survey' : 'Guide'} analytics
            </p>
            <h2 className="m-0 mt-0.5 truncate text-lg font-semibold tracking-tight text-slate-900">{experience.title}</h2>
          </div>
          <button aria-label="Close" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-5 sm:p-6">
          {loading && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-busy="true">
              {[0, 1, 2, 3].map((tile) => <div className="h-[76px] animate-pulse rounded-xl border border-slate-200 bg-white" key={tile} />)}
            </div>
          )}
          {!loading && error && <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {!loading && !error && guideData && <GuideAnalyticsView data={guideData} />}
          {!loading && !error && surveyData && <SurveyAnalyticsView data={surveyData} />}
        </div>
      </aside>
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }): JSX.Element {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm sm:px-4">
      <p className="m-0 truncate text-[13px] text-slate-500">{label}</p>
      <p className="m-0 mt-1 text-xl font-semibold tracking-tight tabular-nums text-slate-900">{value}</p>
      {hint && <p className="m-0 mt-0.5 truncate text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Panel({ title, children, subtitle }: { title: string; subtitle?: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="m-0 text-[15px] font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="m-0 mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Horizontal rate bar with the value printed beside it. */
function RateBar({ label, rate, tone }: { label: string; rate: number; tone: 'positive' | 'negative' }): JSX.Element {
  const pct = Math.max(0, Math.min(100, rate * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold tabular-nums text-slate-900">{formatPercent(pct)}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone === 'positive' ? 'bg-emerald-600' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function GuideAnalyticsView({ data }: { data: GuideExperienceAnalytics }): JSX.Element {
  if (data.impressions === 0 && data.uniqueUsers === 0) {
    return <EmptyAnalytics message="No one has seen this guide yet. Data appears here once it is live and shown to users." />;
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Impressions" value={formatNumber(data.impressions)} />
        <StatTile label="Users reached" value={formatNumber(data.uniqueUsers)} />
        <StatTile label="Completed" value={formatNumber(data.completions)} />
        <StatTile label="Dismissed" value={formatNumber(data.dismissals)} />
      </div>
      <Panel title="Outcomes" subtitle="Share of reached users">
        <div className="space-y-4">
          <RateBar label="Completion rate" rate={data.completionRate} tone="positive" />
          <RateBar label="Dismissal rate" rate={data.dismissalRate} tone="negative" />
        </div>
      </Panel>
    </>
  );
}

function SurveyAnalyticsView({ data }: { data: SurveyExperienceAnalytics }): JSX.Element {
  if (data.responses === 0 && data.impressions === 0) {
    return <EmptyAnalytics message="No responses yet. Results appear here as soon as users answer this survey." />;
  }
  const hasNps = data.promoters + data.passives + data.detractors > 0;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Responses" value={formatNumber(data.responses)} hint={`${formatNumber(data.impressions)} impressions`} />
        <StatTile label="Response rate" value={formatPercent(data.responseRate)} />
        <StatTile label="Drop-off" value={formatPercent(data.dropOffRate)} hint={`${formatNumber(data.starts)} started`} />
        <StatTile label="Avg. time" value={formatDuration(data.averageCompletionTime)} />
      </div>

      {hasNps && <NpsPanel data={data} />}
      {data.weeklyTrends.length > 1 && <TrendPanel trends={data.weeklyTrends} />}

      {data.questionAnalytics.map((question) => (
        <QuestionPanel key={question.questionId} question={question} />
      ))}
    </>
  );
}

function NpsPanel({ data }: { data: SurveyExperienceAnalytics }): JSX.Element {
  const total = data.promoters + data.passives + data.detractors;
  const segments = [
    { key: 'detractors', label: 'Detractors (0–6)', count: data.detractors, fill: 'bg-red-500', swatch: 'bg-red-500' },
    { key: 'passives', label: 'Passives (7–8)', count: data.passives, fill: 'bg-slate-400', swatch: 'bg-slate-400' },
    { key: 'promoters', label: 'Promoters (9–10)', count: data.promoters, fill: 'bg-emerald-600', swatch: 'bg-emerald-600' }
  ];
  return (
    <Panel title="Net Promoter Score">
      <div className="flex items-end gap-3">
        <span className="text-4xl font-semibold tabular-nums text-slate-900">{Math.round(data.nps)}</span>
        <span className="pb-1.5 text-xs text-slate-500">on a −100 to 100 scale · {formatNumber(total)} scored responses</span>
      </div>
      <div className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={segments.map((s) => `${s.label}: ${s.count}`).join(', ')}>
        {segments.filter((s) => s.count > 0).map((segment) => (
          <div className={`h-full ${segment.fill}`} key={segment.key} style={{ width: `${(segment.count / total) * 100}%` }} title={`${segment.label}: ${segment.count}`} />
        ))}
      </div>
      <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-xs">
        {segments.map((segment) => (
          <li className="flex items-center gap-1.5 text-slate-600" key={segment.key}>
            <span className={`h-2 w-2 rounded-full ${segment.swatch}`} />
            {segment.label}
            <span className="font-semibold tabular-nums text-slate-900">
              {formatNumber(segment.count)} · {formatPercent((segment.count / total) * 100)}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function TrendPanel({ trends }: { trends: SurveyExperienceAnalytics['weeklyTrends'] }): JSX.Element {
  const sorted = [...trends].sort((a, b) => a.period.localeCompare(b.period)).slice(-12);
  const max = Math.max(...sorted.map((entry) => entry.responses), 1);
  return (
    <Panel title="Responses per week">
      <div className="flex h-28 items-end gap-1.5 border-b border-slate-200">
        {sorted.map((entry) => (
          <div className="group relative flex h-full max-w-[48px] flex-1 flex-col justify-end" key={entry.period}>
            <div
              className="rounded-t-[4px] bg-slate-700 transition-colors group-hover:bg-slate-900"
              style={{ height: `${Math.max(4, (entry.responses / max) * 100)}%` }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white shadow-lg group-hover:block">
              {entry.period}: {formatNumber(entry.responses)} responses · NPS {Math.round(entry.nps)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-slate-500">
        <span>{sorted[0]?.period}</span>
        <span>{sorted[sorted.length - 1]?.period}</span>
      </div>
    </Panel>
  );
}

function QuestionPanel({ question }: { question: SurveyQuestionAnalytics }): JSX.Element {
  const isScale = SCALE_TYPES.has(question.type);
  const entries = Object.entries(question.distribution);
  // Scales read in scale order; choices read by popularity.
  const ordered = isScale
    ? entries.sort(([a], [b]) => Number(a) - Number(b))
    : entries.sort(([, a], [, b]) => b - a).slice(0, MAX_BARS);
  const max = Math.max(...ordered.map(([, count]) => count), 1);
  const answered = question.responseCount;
  const isFreeText = question.type === 'TEXT' || question.type === 'LONG_TEXT';

  return (
    <Panel
      title={question.title}
      subtitle={`${formatNumber(answered)} answered · ${formatNumber(question.skippedCount)} skipped${isScale && answered > 0 ? ` · average ${question.averageScore.toFixed(1)}` : ''}`}
    >
      {answered === 0 ? (
        <p className="m-0 text-sm text-slate-500">No answers yet.</p>
      ) : isFreeText ? (
        <ul className="m-0 list-none space-y-1.5 p-0">
          {ordered.map(([answer]) => (
            <li className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700" key={answer}>
              “{answer}”
            </li>
          ))}
          {entries.length > MAX_BARS && <li className="text-xs text-slate-500">Showing {MAX_BARS} of {entries.length}. See Responses for every answer.</li>}
        </ul>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {ordered.map(([answer, count]) => (
            <li className="group grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 text-xs" key={answer} title={`${answer}: ${count} (${formatPercent((count / answered) * 100)})`}>
              <span className="truncate font-medium text-slate-600">{answer}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <span className="block h-full rounded-full bg-slate-700 group-hover:bg-slate-900" style={{ width: `${(count / max) * 100}%` }} />
              </span>
              <span className="w-16 text-right tabular-nums text-slate-900">
                {formatNumber(count)} <span className="text-slate-400">{formatPercent((count / answered) * 100)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function EmptyAnalytics({ message }: { message: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
        <BarChart3 size={20} />
      </span>
      <p className="m-0 mt-4 text-[15px] font-semibold text-slate-900">No data yet</p>
      <p className="m-0 mt-1 max-w-sm text-sm text-slate-500">{message}</p>
    </div>
  );
}

export default ExperienceAnalyticsModal;
