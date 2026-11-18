import { ChevronLeft, ChevronRight, Clock, Download, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Modal from '@/components/Modal';
import { Button, Input, Select, cn } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { addTimeEntry, deleteTimeEntry, getTimeWeek, type TimeEntry, type TimeWeek } from '@/services/time';
import { toDisplayErrorMessage } from '@/utils/apiError';

import { ExportTimesheetModal } from './ExportTimesheetModal';
import { dayLabel, formatDuration, parseDuration, shiftDay, todayIso } from './time';

const NO_TASK = '__none__';

interface Props {
  projectId: string;
  projectName?: string;
  /** Project admins can also look at everyone's time. */
  isAdmin: boolean;
}

/** A ClickUp-style weekly timesheet: tasks down the side, Monday to Sunday across, hours in the cells. */
export function WeeklyTimesheet({ projectId, projectName = 'project', isAdmin }: Props): JSX.Element {
  const { showToast } = useToast();
  const [start, setStart] = useState(todayIso());
  const [scope, setScope] = useState<'me' | 'all'>('me');
  const [week, setWeek] = useState<TimeWeek | null>(null);
  const [error, setError] = useState(false);
  const [extraRows, setExtraRows] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [cell, setCell] = useState<{ taskId: string | null; day: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setWeek(await getTimeWeek(projectId, { start, scope: scope === 'all' ? 'all' : undefined }));
      setError(false);
    } catch {
      setError(true);
    }
  }, [projectId, start, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const today = todayIso();
  const monday = week?.weekStart ?? start;
  const days = week?.days ?? [];
  const thisWeek = week ? week.days.includes(today) : true;

  // Rows: every task with time this week, tasks the person added to the grid, and "No task".
  const rows = useMemo(() => {
    if (!week || scope === 'all') return [];
    const ids = new Set<string>();
    for (const e of week.entries) ids.add(e.taskId ?? NO_TASK);
    for (const id of extraRows) ids.add(id);
    ids.add(NO_TASK);
    return [...ids].map((id) => {
      const task = week.tasks.find((t) => t.id === id);
      return { id, title: id === NO_TASK ? 'No task (general time)' : (task?.title ?? 'Task'), estimate: task?.estimatedHours ?? null };
    });
  }, [week, scope, extraRows]);

  const minutesAt = (taskId: string, day: string): number =>
    (week?.entries ?? []).filter((e) => (e.taskId ?? NO_TASK) === taskId && e.date === day).reduce((n, e) => n + e.minutes, 0);
  const dayTotal = (day: string): number => (week?.entries ?? []).filter((e) => e.date === day).reduce((n, e) => n + e.minutes, 0);
  const weekTotal = (week?.entries ?? []).reduce((n, e) => n + e.minutes, 0);

  const addableTasks = (week?.tasks ?? []).filter((t) => !rows.some((r) => r.id === t.id));
  const range = days.length ? `${dayLabel(days[0]).date} – ${dayLabel(days[6]).date}` : '';

  return (
    <div className="grid gap-3 p-3 sm:p-4" data-testid="weekly-timesheet">
      {exporting ? <ExportTimesheetModal initialScope={scope} isAdmin={isAdmin} onClose={() => setExporting(false)} projectId={projectId} projectName={projectName} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button aria-label="Previous week" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" onClick={() => setStart(shiftDay(monday, -7))} type="button">
            <ChevronLeft size={16} />
          </button>
          <button aria-label="Next week" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" onClick={() => setStart(shiftDay(monday, 7))} type="button">
            <ChevronRight size={16} />
          </button>
          <span className="ml-1 text-sm font-semibold text-slate-900" data-testid="week-range">
            {range}
          </span>
          {!thisWeek ? (
            <Button onClick={() => setStart(todayIso())} size="sm" variant="secondary">
              This week
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[13px]" role="group" aria-label="Whose time">
              {(['me', 'all'] as const).map((value) => (
                <button
                  aria-pressed={scope === value}
                  className={cn('rounded-md px-2.5 py-1 font-medium transition-colors', scope === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}
                  key={value}
                  onClick={() => setScope(value)}
                  type="button"
                >
                  {value === 'me' ? 'My time' : 'Everyone'}
                </button>
              ))}
            </div>
          ) : null}
          <Button data-testid="export-open" onClick={() => setExporting(true)} size="sm" variant="secondary">
            <Download size={14} /> Export
          </Button>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[13px] font-medium text-slate-800" data-testid="week-total">
            <Clock size={14} /> {formatDuration(weekTotal) || '0h'} this week
          </span>
        </div>
      </div>

      {error ? (
        <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800" role="alert">
          Time could not be loaded. You may not have access to time management in this project.
        </p>
      ) : null}

      {!week ? (
        !error && <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                <th className="px-3 py-2 font-medium">{scope === 'all' ? 'Person' : 'Task'}</th>
                {days.map((d) => {
                  const l = dayLabel(d);
                  return (
                    <th className={cn('w-[84px] px-2 py-2 text-center font-medium', d === today && 'text-brand-700')} key={d}>
                      <div>{l.weekday}</div>
                      <div className="font-normal">{l.date}</div>
                    </th>
                  );
                })}
                <th className="w-[84px] px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {scope === 'all'
                ? week.totals.length === 0
                  ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-slate-500" colSpan={9}>
                        Nobody logged time this week.
                      </td>
                    </tr>
                    )
                  : week.totals.map((p) => (
                      <tr className="border-b border-slate-100 last:border-0" data-testid="timesheet-person-row" key={p.userId}>
                        <td className="px-3 py-2 font-medium text-slate-900">{p.userName}</td>
                        {days.map((d) => {
                          const m = week.entries.filter((e) => e.userId === p.userId && e.date === d).reduce((n, e) => n + e.minutes, 0);
                          return (
                            <td className="px-2 py-2 text-center tabular-nums text-slate-700" key={d}>
                              {formatDuration(m) || <span className="text-slate-300">–</span>}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{formatDuration(p.minutes)}</td>
                      </tr>
                    ))
                : rows.map((row) => {
                    const total = days.reduce((n, d) => n + minutesAt(row.id, d), 0);
                    return (
                      <tr className="border-b border-slate-100 last:border-0" data-testid="timesheet-row" key={row.id}>
                        <td className="max-w-[260px] px-3 py-1.5">
                          <div className="truncate font-medium text-slate-900" title={row.title}>
                            {row.title}
                          </div>
                          {row.estimate ? <div className="text-xs text-slate-500">Estimate {row.estimate}h</div> : null}
                        </td>
                        {days.map((d) => {
                          const m = minutesAt(row.id, d);
                          return (
                            <td className="px-1 py-1 text-center" key={d}>
                              <button
                                aria-label={`Log time for ${row.title} on ${d}`}
                                className={cn(
                                  'h-9 w-full rounded-md border text-[13px] tabular-nums transition-colors',
                                  m ? 'border-brand-200 bg-brand-50 font-medium text-slate-900 hover:border-brand-300' : 'border-transparent text-slate-300 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-500',
                                  d === today && !m && 'bg-slate-50/70'
                                )}
                                data-testid="timesheet-cell"
                                onClick={() => setCell({ taskId: row.id === NO_TASK ? null : row.id, day: d })}
                                type="button"
                              >
                                {formatDuration(m) || '+'}
                              </button>
                            </td>
                          );
                        })}
                        <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-slate-900">{formatDuration(total) || <span className="text-slate-300">–</span>}</td>
                      </tr>
                    );
                  })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                <td className="px-3 py-2">{scope === 'all' ? 'Team total' : 'Total'}</td>
                {days.map((d) => (
                  <td className="px-2 py-2 text-center tabular-nums" key={d}>
                    {formatDuration(dayTotal(d)) || <span className="font-normal text-slate-300">–</span>}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums">{formatDuration(weekTotal) || '0h'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {week && scope === 'me' && addableTasks.length > 0 ? (
        <div className="flex max-w-md items-center gap-2">
          <Plus aria-hidden className="shrink-0 text-slate-400" size={16} />
          <div className="min-w-0 flex-1">
            <Select
              aria-label="Add a task to the timesheet"
              onValueChange={(id) => id && setExtraRows((current) => [...current, id])}
              options={[{ value: '', label: 'Add a task to this timesheet' }, ...addableTasks.map((t) => ({ value: t.id, label: t.title }))]}
              value=""
            />
          </div>
        </div>
      ) : null}

      {cell && week ? (
        <LogTimeModal
          entries={week.entries.filter((e) => (e.taskId ?? null) === cell.taskId && e.date === cell.day)}
          day={cell.day}
          onChanged={() => void load()}
          onClose={() => setCell(null)}
          projectId={projectId}
          showToast={(message, variant) => showToast({ message, variant })}
          taskId={cell.taskId}
          title={cell.taskId ? (week.tasks.find((t) => t.id === cell.taskId)?.title ?? 'Task') : 'General time'}
        />
      ) : null}
    </div>
  );
}

function LogTimeModal({
  projectId,
  taskId,
  day,
  title,
  entries,
  onChanged,
  onClose,
  showToast,
}: {
  projectId: string;
  taskId: string | null;
  day: string;
  title: string;
  entries: TimeEntry[];
  onChanged: () => void;
  onClose: () => void;
  showToast: (message: string, variant: 'success' | 'error') => void;
}): JSX.Element {
  const [duration, setDuration] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const minutes = parseDuration(duration);
  const label = dayLabel(day);

  const add = async (): Promise<void> => {
    if (!minutes) return;
    setBusy(true);
    try {
      await addTimeEntry(projectId, { date: day, minutes, taskId, note: note.trim() || undefined });
      setDuration('');
      setNote('');
      onChanged();
    } catch (err) {
      showToast(toDisplayErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (entry: TimeEntry): Promise<void> => {
    try {
      await deleteTimeEntry(projectId, entry.id);
      onChanged();
    } catch (err) {
      showToast(toDisplayErrorMessage(err), 'error');
    }
  };

  return (
    <Modal description={`${label.weekday} ${label.date}`} onClose={onClose} title={`Log time: ${title}`}>
      <div className="grid gap-4" data-testid="log-time-modal">
        {entries.length ? (
          <ul className="m-0 grid list-none gap-1.5 p-0">
            {entries.map((e) => (
              <li className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[13px]" key={e.id}>
                <span className="font-semibold tabular-nums text-slate-900">{formatDuration(e.minutes)}</span>
                <span className="min-w-0 flex-1 truncate text-slate-600">{e.note || 'No note'}</span>
                <button aria-label="Delete entry" className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => void remove(e)} type="button">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-[13px] text-slate-500">Nothing logged here yet.</p>
        )}
        <form
          className="grid gap-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            void add();
          }}
        >
          <div className="grid gap-2 sm:grid-cols-[130px_1fr]">
            <Input aria-label="Time spent" autoFocus onChange={(e) => setDuration(e.target.value)} placeholder="1h 30m" value={duration} />
            <Input aria-label="Note" onChange={(e) => setNote(e.target.value)} placeholder="What did you do? (optional)" value={note} />
          </div>
          <p className="m-0 text-xs text-slate-500">Type 1.5, 1:30, 90m or 1h 30m.{duration && !minutes ? <span className="text-red-600"> That is not a time.</span> : null}</p>
          <div className="flex justify-end gap-2">
            <Button onClick={onClose} type="button" variant="secondary">
              Done
            </Button>
            <Button disabled={!minutes} loading={busy} type="submit" variant="primary">
              Add time
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
