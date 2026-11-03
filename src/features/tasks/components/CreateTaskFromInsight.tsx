import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListPlus } from 'lucide-react';

import Modal from '@/components/Modal';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { getEpics } from '@/services/epics';
import { getProjects } from '@/services/projects';
import { createTask } from '@/services/tasks';
import type { TaskPriority } from '@/types/task';
import { toDisplayErrorMessage } from '@/utils/apiError';

/** What the task is about: shown in the dialog and written into the task with a link back. */
export interface Insight {
  /** Suggested task title, e.g. "Fix drop-off on step 2 of Welcome guide". */
  title: string;
  /** What was seen, e.g. "42% of users who reached step 2 left the guide there." */
  summary: string;
  /** Where it came from, e.g. "Guide · Welcome guide". */
  source: string;
  /** Path inside the portal that shows the insight (a link back from the task). */
  link?: string;
  priority?: TaskPriority;
}

const today = () => new Date().toISOString().slice(0, 10);
const LAST_PROJECT_KEY = 'pristine.insight.lastProject';

export function insightDescription(insight: Insight): string {
  const url = insight.link ? `${window.location.origin}${insight.link}` : '';
  return [insight.summary, '', `Source: ${insight.source}`, url ? `Open the insight: ${url}` : ''].filter((line, i) => line || i === 1).join('\n').trim();
}

/** Dialog that turns an analytics finding into a task, pre-filled and linked back to where it came from. */
export function CreateTaskFromInsightDialog({ insight, onClose }: { insight: Insight; onClose: () => void }): JSX.Element {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [title, setTitle] = useState(insight.title);
  const [description, setDescription] = useState(() => insightDescription(insight));
  const [priority, setPriority] = useState<TaskPriority>(insight.priority ?? 'MEDIUM');
  const [projects, setProjects] = useState<Array<{ id: string; name: string }> | null>(null);
  const [projectId, setProjectId] = useState('');
  const [epics, setEpics] = useState<Array<{ id: string; name: string }>>([]);
  const [epicId, setEpicId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProjects({ limit: 100 })
      .then(({ projects: list }) => {
        setProjects(list.map((p) => ({ id: p.id, name: p.name })));
        let remembered = '';
        try {
          remembered = localStorage.getItem(LAST_PROJECT_KEY) ?? '';
        } catch {
          /* storage unavailable */
        }
        setProjectId(list.some((p) => p.id === remembered) ? remembered : list[0]?.id ?? '');
      })
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    setEpicId('');
    setEpics([]);
    if (!projectId) return;
    getEpics(projectId)
      .then((list) => setEpics(list.map((e) => ({ id: e.id, name: e.name }))))
      .catch(() => setEpics([]));
  }, [projectId]);

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const task = await createTask({
        title: title.trim(),
        description: description.trim(),
        date: today(),
        priority,
        projectId: projectId || null,
        epicId: epicId || null
      });
      try {
        if (projectId) localStorage.setItem(LAST_PROJECT_KEY, projectId);
      } catch {
        /* storage unavailable */
      }
      onClose();
      showToast({
        variant: 'success',
        message: `Task created: ${task.title}`,
        ...(projectId
          ? { action: { label: 'Open', onClick: () => navigate(epicId ? `/projects/${projectId}/epics/${epicId}` : `/projects/${projectId}`) } }
          : {})
      });
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      description={insight.source}
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button disabled={!title.trim()} icon={ListPlus} loading={saving} onClick={() => void submit()} variant="primary">
            Create task
          </Button>
        </>
      }
      maxWidth="max-w-[560px]"
      onClose={onClose}
      title="Create task from this"
    >
      <Field label="Title">
        <Input autoFocus onChange={(e) => setTitle(e.target.value)} value={title} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field className="sm:col-span-1" label="Project">
          <Select
            disabled={projects == null}
            onValueChange={setProjectId}
            options={[{ value: '', label: 'No project' }, ...(projects ?? []).map((p) => ({ value: p.id, label: p.name }))]}
            value={projectId}
          />
        </Field>
        <Field label="Epic">
          <Select
            disabled={!projectId || epics.length === 0}
            onValueChange={setEpicId}
            options={[{ value: '', label: epics.length ? 'No epic' : 'No epics' }, ...epics.map((e) => ({ value: e.id, label: e.name }))]}
            value={epicId}
          />
        </Field>
        <Field label="Priority">
          <Select
            onValueChange={(value) => setPriority(value as TaskPriority)}
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
              { value: 'CRITICAL', label: 'Critical' }
            ]}
            value={priority}
          />
        </Field>
      </div>
      <Field hint="Includes a link back to this insight." label="Description">
        <Textarea onChange={(e) => setDescription(e.target.value)} rows={5} value={description} />
      </Field>
    </Modal>
  );
}

/** A small "Create task" button that opens the dialog for one insight. */
export function CreateTaskButton({
  insight,
  label = 'Create task',
  children
}: {
  insight: Insight;
  label?: string;
  children?: ReactNode;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        data-testid="create-task-from-insight"
        icon={ListPlus}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        size="sm"
        variant="secondary"
      >
        {children ?? label}
      </Button>
      {open ? <CreateTaskFromInsightDialog insight={insight} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
