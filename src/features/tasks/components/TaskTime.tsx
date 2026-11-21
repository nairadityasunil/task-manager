import { ChevronRight, Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import Modal from '@/components/Modal';
import { Button, DateInput, Field, Input } from '@/components/ui';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import { addTimeEntry, deleteTimeEntry, getTaskTime, updateTimeEntry, type TaskTimeEntry } from '@/services/time';
import type { Task } from '@/types/task';
import { toDisplayErrorMessage } from '@/utils/apiError';

import { formatDuration, parseDuration, todayIso } from '@/features/projects/components/time';

interface Props {
  task: Task;
}

type Data = { totalMinutes: number; entries: TaskTimeEntry[] };

const dayText = (day: string): string =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** One row in the task drawer: the summed time on this task. A click opens every time entry with its description. */
export function TaskTime({ task }: Props): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const projectId = task.projectId;

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      setData(await getTaskTime(projectId, task.id));
    } catch {
      setData((current) => current ?? { totalMinutes: 0, entries: [] });
    }
  }, [projectId, task.id]);

  useEffect(() => {
    setData(null);
    void load();
  }, [load]);

  if (!projectId) return null;
  const total = data?.totalMinutes ?? 0;

  return (
    <section data-testid="task-time">
      <button
        className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
        data-testid="task-time-button"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Clock className="shrink-0 text-slate-500" size={16} />
        <span className="shrink-0 text-[15px] font-semibold text-slate-900">
          Time <span className="font-normal tabular-nums text-slate-500">({data?.entries.length ?? 0})</span>
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-[13px] tabular-nums text-slate-500" data-testid="task-time-total">
          {data === null ? '…' : total ? `${formatDuration(total)} logged` : 'Log the first time'}
        </span>
        <ChevronRight className="shrink-0 text-slate-400" size={16} />
      </button>
      {open ? <TaskTimeModal data={data} onChanged={load} onClose={() => setOpen(false)} projectId={projectId} task={task} /> : null}
    </section>
  );
}

function TaskTimeModal({
  task,
  projectId,
  data,
  onChanged,
  onClose
}: {
  task: Task;
  projectId: string;
  data: Data | null;
  onChanged: () => Promise<void>;
  onClose: () => void;
}): JSX.Element {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [date, setDate] = useState(todayIso());
  const [duration, setDuration] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const begin = (entry?: TaskTimeEntry): void => {
    setEditing(entry ? entry.id : 'new');
    setDate(entry ? entry.date : todayIso());
    setDuration(entry ? formatDuration(entry.minutes) : '');
    setNote(entry ? entry.note : '');
    setError('');
  };

  const save = async (): Promise<void> => {
    const minutes = parseDuration(duration);
    if (minutes == null || minutes < 1) {
      setError('Enter the time spent, like 1h 30m, 45m or 1.5.');
      return;
    }
    if (minutes > 24 * 60) {
      setError('One entry can be at most 24 hours.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing === 'new') await addTimeEntry(projectId, { date, minutes, taskId: task.id, note: note.trim() });
      else if (editing) await updateTimeEntry(projectId, editing, { date, minutes, note: note.trim() });
      await onChanged();
      setEditing(null);
    } catch (err) {
      setError(toDisplayErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (entry: TaskTimeEntry): Promise<void> => {
    const sure = await confirm({
      title: 'Delete this time entry?',
      message: `${formatDuration(entry.minutes)} on ${dayText(entry.date)} will be removed from the task.`,
      confirmText: 'Delete entry',
      type: 'danger'
    });
    if (!sure) return;
    setRemoving(entry.id);
    try {
      await deleteTimeEntry(projectId, entry.id);
      await onChanged();
    } catch (err) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(err) });
    } finally {
      setRemoving(null);
    }
  };

  const entries = data?.entries ?? [];
  const total = data?.totalMinutes ?? 0;

  return (
    <Modal
      headerActions={
        editing === null ? (
          <Button data-testid="task-time-add" icon={Plus} onClick={() => begin()} size="sm" variant="primary">
            Log time
          </Button>
        ) : undefined
      }
      onClose={onClose}
      description={<>For <span className="font-medium text-slate-700">{task.title}</span></>}
      title="Time logged"
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <div className="flex items-baseline justify-between border-b border-slate-200 pb-3">
          <span className="text-[13px] font-medium text-slate-600">Total logged</span>
          <span className="text-xl font-semibold tabular-nums text-slate-900" data-testid="task-time-modal-total">
            {total ? formatDuration(total) : '0m'}
          </span>
        </div>

        {editing !== null ? (
          <form
            className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl bg-slate-50 p-3.5"
            data-testid="task-time-form"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date">
                <DateInput aria-label="Date" max={todayIso()} onValueChange={(next) => next && setDate(next)} value={date} />
              </Field>
              <Field label="Time spent">
                <Input data-testid="task-time-duration" onChange={(e) => setDuration(e.target.value)} placeholder="1h 30m" value={duration} />
              </Field>
            </div>
            <p className="m-0 -mt-1 text-xs text-slate-500">Time can be like 1h 30m, 45m or 1.5.</p>
            <Field label="What did you work on?">
              <Input data-testid="task-time-note" maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Short description" value={note} />
            </Field>
            {error ? (
              <p className="m-0 text-[13px] text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button disabled={saving} onClick={() => setEditing(null)} type="button" variant="secondary">
                Cancel
              </Button>
              <Button data-testid="task-time-save" loading={saving} type="submit" variant="primary">
                {editing === 'new' ? 'Add entry' : 'Save'}
              </Button>
            </div>
          </form>
        ) : null}

        {data === null ? (
          <div aria-busy="true" className="grid gap-2">
            {[0, 1].map((k) => (
              <div className="h-14 animate-pulse rounded-lg bg-slate-100" key={k} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="m-0 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-[13px] text-slate-500">No time logged on this task yet.</p>
        ) : (
          <ul className="m-0 grid max-h-[420px] list-none divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200 p-0" data-testid="task-time-list">
            {entries.map((entry) => (
              <li className="flex items-start gap-3 px-3 py-2.5" data-testid="task-time-entry" key={entry.id}>
                <span className="w-16 shrink-0 text-[15px] font-semibold tabular-nums text-slate-900">{formatDuration(entry.minutes)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm text-slate-800 [overflow-wrap:anywhere]">{entry.note || <span className="text-slate-400">No description</span>}</span>
                  <span className="block text-xs text-slate-500">
                    {entry.userName} · {dayText(entry.date)}
                  </span>
                </span>
                {entry.canModify ? (
                  <span className="flex shrink-0 gap-1">
                    <Button aria-label="Edit entry" icon={Pencil} onClick={() => begin(entry)} size="sm" variant="ghost" />
                    <Button aria-label="Delete entry" disabled={removing === entry.id} icon={Trash2} onClick={() => void remove(entry)} size="sm" variant="ghost" />
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
