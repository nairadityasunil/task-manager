import { Activity, Bot, Building2, CheckCircle2, FolderKanban, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Select, StatCard } from '@/components/ui';
import { compact, fmt, pct } from '@/features/insights/charts';

import { adminApi, type Analytics } from './adminService';
import { BarList, DayChart, Panel, ShareBar } from './charts';

const money = (n: number): string => '$' + n.toLocaleString(undefined, { minimumFractionDigits: n < 1 ? 4 : 2, maximumFractionDigits: n < 1 ? 4 : 2 });
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const title = (s: string): string => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export function AnalyticsTab(): JSX.Element {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    adminApi
      .analytics(days)
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [days]);

  if (error) {
    return (
      <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800" role="alert">
        Analytics could not be loaded.
      </p>
    );
  }
  if (!data) return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;
  const { totals: t, series: s, engagement: e, ai, tasks, invitations: inv, security } = data;

  return (
    <div className="grid gap-4" data-testid="admin-analytics">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-[13px] text-slate-500">
          {data.from} to {data.to}
        </p>
        <div className="w-44">
          <Select
            aria-label="Time range"
            onValueChange={(v) => setDays(Number(v))}
            options={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
              { value: '365', label: 'Last 12 months' },
            ]}
            value={String(days)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard hint={`${fmt(t.newUsers)} new in this range`} icon={Users} label="People" tone="sky" value={fmt(t.users)} />
        <StatCard hint={`${fmt(e.wau)} this week · ${fmt(e.mau)} this month`} icon={Activity} label="Active today" tone="emerald" value={fmt(e.dau)} />
        <StatCard hint={`${fmt(t.projects)} projects`} icon={Building2} label="Workspaces" tone="violet" value={fmt(t.workspaces)} />
        <StatCard hint={`${pct(tasks.completionRate)} done`} icon={CheckCircle2} label="Tasks" tone="emerald" value={fmt(t.tasks)} />
        <StatCard hint={`${pct(ai.errorRate)} failed`} icon={Bot} label="AI runs" tone="sky" value={compact(ai.runs)} />
        <StatCard hint={`${compact(ai.tokens)} tokens`} icon={Bot} label="AI cost" tone="orange" value={money(ai.cost)} />
        <StatCard hint={`${fmt(t.deletedUsers)} deleted`} hintTone={t.suspendedUsers ? 'warning' : 'neutral'} icon={ShieldCheck} label="Suspended" tone="orange" value={fmt(t.suspendedUsers)} />
        <StatCard hint={`${fmt(t.agents)} agents · ${fmt(t.prompts)} prompts`} icon={FolderKanban} label="Super admins" tone="slate" value={fmt(t.superAdmins)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel hint={`${fmt(sum(s.signups))} in this range`} title="New people per day">
          <DayChart ariaLabel="New people per day" area days={s.days} series={[{ name: 'New people', values: s.signups }]} />
        </Panel>
        <Panel hint="People with any activity that day" title="Active people per day">
          <DayChart ariaLabel="Active people per day" area days={s.days} series={[{ name: 'Active people', values: s.activeUsers, color: 2 }]} />
        </Panel>
        <Panel title="Work created per day">
          <DayChart ariaLabel="Tasks and projects created per day" days={s.days} series={[{ name: 'Tasks', values: s.tasksCreated }, { name: 'Projects', values: s.projectsCreated, color: 1 }]} />
        </Panel>
        <Panel hint={`${fmt(sum(s.aiRuns))} runs · ${fmt(sum(s.aiErrors))} failed`} title="AI runs per day">
          <DayChart ariaLabel="AI runs and failures per day" days={s.days} series={[{ name: 'Runs', values: s.aiRuns }, { name: 'Failed', values: s.aiErrors, color: 7 }]} />
        </Panel>
        <Panel hint={`${money(ai.cost)} in this range`} title="AI cost per day">
          <DayChart ariaLabel="AI cost per day" area days={s.days} series={[{ name: 'Cost', values: s.aiCost, color: 3, format: money }]} />
        </Panel>
        <Panel title="Engagement">
          <div className="grid grid-cols-3 gap-3 text-center">
            {(
              [
                ['Today', e.dau],
                ['7 days', e.wau],
                ['30 days', e.mau],
              ] as Array<[string, number]>
            ).map(([label, v]) => (
              <div className="rounded-lg bg-slate-50 p-3" key={label}>
                <div className="text-xl font-semibold tabular-nums text-slate-900">{fmt(v)}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>
          <p className="m-0 mt-3 text-xs text-slate-500">
            Stickiness (today ÷ 30 days): <strong className="text-slate-900">{pct(e.stickiness)}</strong>
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel hint="All time" title="Tasks by status">
          <ShareBar parts={tasks.byStatus.map((r) => ({ label: title(r.status), value: r.count }))} />
        </Panel>
        <Panel hint="All time" title="Tasks by priority">
          <ShareBar parts={tasks.byPriority.map((r) => ({ label: title(r.priority), value: r.count }))} />
        </Panel>
        <Panel title="How people sign in">
          <ShareBar parts={[{ label: 'Password', value: security.passwordSignIn }, { label: 'Google', value: security.googleSignIn }]} />
          <p className="m-0 mt-3 text-xs text-slate-500">
            Two-step sign-in is on for <strong className="text-slate-900">{pct(security.twoFactorShare)}</strong> of people ({fmt(security.twoFactorEnabled)}).
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel hint="In this range" title="AI by model">
          {ai.providers.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="py-1.5 font-medium">Model</th>
                    <th className="py-1.5 text-right font-medium">Runs</th>
                    <th className="py-1.5 text-right font-medium">Failed</th>
                    <th className="py-1.5 text-right font-medium">Tokens</th>
                    <th className="py-1.5 text-right font-medium">Avg time</th>
                    <th className="py-1.5 text-right font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {ai.providers.map((p) => (
                    <tr className="border-b border-slate-100 last:border-0" key={`${p.provider}-${p.model}`}>
                      <td className="py-1.5 text-slate-900">
                        {p.model} <span className="text-xs text-slate-500">{p.provider}</span>
                      </td>
                      <td className="py-1.5 text-right tabular-nums">{fmt(p.runs)}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmt(p.errors)}</td>
                      <td className="py-1.5 text-right tabular-nums">{compact(p.tokens)}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmt(p.avgLatencyMs)} ms</td>
                      <td className="py-1.5 text-right tabular-nums">{money(p.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="m-0 py-6 text-center text-[13px] text-slate-500">No AI runs in this range.</p>
          )}
        </Panel>
        <Panel hint="In this range" title="Where AI runs come from">
          <BarList empty="No AI runs in this range." rows={ai.sources.map((r) => ({ label: title(r.source), value: r.runs }))} />
        </Panel>
        <Panel hint="By AI cost in this range" title="Top workspaces for AI">
          <BarList empty="No AI runs in this range." format={(n) => money(n)} rows={ai.topWorkspaces.map((w) => ({ label: w.name, value: w.cost, hint: `${fmt(w.runs)} runs` }))} />
        </Panel>
        <Panel title="Biggest workspaces">
          <BarList format={(n) => `${fmt(n)} people`} rows={data.topWorkspaces.map((w) => ({ label: w.name, value: w.members }))} />
        </Panel>
        <Panel title="Invitations">
          <ShareBar parts={[{ label: 'Accepted', value: inv.ACCEPTED }, { label: 'Waiting', value: inv.PENDING }, { label: 'Declined', value: inv.REJECTED }]} />
          <p className="m-0 mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500">
            <UserPlus size={13} /> Of the invitations answered, <strong className="text-slate-900">{inv.acceptanceRate == null ? 'none yet' : pct(inv.acceptanceRate)}</strong> were accepted.
          </p>
        </Panel>
        <Panel title="Agents and integrations">
          <BarList empty="No agents yet." rows={data.agentKinds.map((r) => ({ label: title(r.kind), value: r.count }))} />
        </Panel>
      </div>
    </div>
  );
}
