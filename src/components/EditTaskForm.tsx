import { FormEvent, useMemo, useState } from 'react';

import type { Epic } from '@/types/epic';
import type { Project } from '@/types/project';
import { TASK_WORKFLOW_STATUS_OPTIONS, type Task, type TaskWorkflowStatus, type TaskPriority } from '@/types/task';
import AssigneeSelector from './AssigneeSelector';
import { AlertCircle } from 'lucide-react';
import { Button, Field, inputClass, selectClass, textareaClass } from '@/components/ui';

interface EditTaskFormProps {
  epics: Epic[];
  allTasks: Task[];
  onSubmit: (payload: {
    title: string;
    description?: string;
    note?: string;
    date: string;
    status: TaskWorkflowStatus;
    priority: TaskPriority;
    isBlocked: boolean;
    blockedByTaskId: string | null;
    projectId: string | null;
    epicId: string | null;
    assignedTo: string;
  }) => Promise<void>;
  projects: Project[];
  task: Task;
}

function EditTaskForm({ epics, allTasks, onSubmit, projects, task }: EditTaskFormProps): JSX.Element {
  const initialStatus: TaskWorkflowStatus =
    task.status === 'rolled_over' ? 'TODO' : (task.status as TaskWorkflowStatus);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [note] = useState(task.note ?? '');
  const [date, setDate] = useState(task.date);
  const [status, setStatus] = useState<TaskWorkflowStatus>(initialStatus);
  const [priority, setPriority] = useState<TaskPriority>(task.priority || 'MEDIUM');
  const [isBlocked, setIsBlocked] = useState(task.isBlocked || false);
  const [blockedByTaskId, setBlockedByTaskId] = useState<string>(task.blockedByTaskId || '');
  const [projectId, setProjectId] = useState<string>(task.projectId ?? '');
  const [epicId, setEpicId] = useState<string>(task.epicId ?? '');
  const [assignedTo, setAssignedTo] = useState<string>(task.assignedTo?.id || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentProject = useMemo(
    () => projects.find((project) => project.id === projectId) ?? null,
    [projectId, projects]
  );
  const canChangeProject = currentProject == null || currentProject.currentUserRole === 'ADMIN';
  const selectableProjects = useMemo(
    () => projects.filter((project) => project.currentUserRole === 'ADMIN' || project.id === task.projectId),
    [projects, task.projectId]
  );

  const handleProjectChange = (newProjectId: string): void => {
    setProjectId(newProjectId);
    const currentEpic = epics.find((epic) => epic.id === epicId);

    if (currentEpic && currentEpic.projectId !== newProjectId) {
      setEpicId('');
    }
  };

  const availableEpics = projectId
    ? epics.filter((epic) => epic.projectId === projectId)
    : [];

  const otherTasks = useMemo(() => {
    return allTasks.filter(t => t.id !== task.id && (projectId ? t.projectId === projectId : true));
  }, [allTasks, task.id, projectId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!title.trim()) {
      setErrorMessage('Task title is required.');
      return;
    }

    if (!date) {
      setErrorMessage('Task date is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        note: note.trim() || undefined,
        date,
        status,
        priority,
        isBlocked,
        blockedByTaskId: isBlocked ? (blockedByTaskId || null) : null,
        projectId: projectId || null,
        epicId: epicId || null,
        assignedTo,
      });
    } catch {
      setErrorMessage('Unable to save the task right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const optional = <span className="font-normal text-slate-400">(optional)</span>;

  return (
    <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <Field label="Title">
        <input
          autoFocus
          className={inputClass}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Task title"
          type="text"
          value={title}
        />
      </Field>

      <Field label={<>Description {optional}</>}>
        <textarea
          className={`${textareaClass} min-h-[88px] resize-y`}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional context or details"
          rows={3}
          value={description}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Priority">
          <select
            className={selectClass}
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
            value={priority}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </Field>

        <Field label="Status">
          <select
            className={selectClass}
            onChange={(event) => setStatus(event.target.value as TaskWorkflowStatus)}
            value={status}
          >
            {TASK_WORKFLOW_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className={`rounded-xl border p-3.5 transition-colors ${isBlocked ? 'border-red-200 bg-red-50/60' : 'border-slate-200 bg-slate-50'}`}>
        <button
          type="button"
          onClick={() => setIsBlocked(!isBlocked)}
          className="flex items-center gap-3"
        >
          <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${isBlocked ? 'bg-red-500' : 'bg-slate-300'}`}>
            <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isBlocked ? 'translate-x-4' : 'translate-x-0'}`} />
          </span>
          <span className={`flex items-center gap-1.5 text-sm font-medium ${isBlocked ? 'text-red-700' : 'text-slate-700'}`}>
            <AlertCircle size={15} className={isBlocked ? 'text-red-500' : 'text-slate-400'} />
            Mark as Blocked
          </span>
        </button>

        {isBlocked && (
          <div className="mt-3 border-t border-red-200/60 pt-3">
            <Field label="Blocking task">
              <select
                className={`${selectClass} !border-red-200 focus:!border-red-500`}
                onChange={(event) => setBlockedByTaskId(event.target.value)}
                value={blockedByTaskId}
              >
                <option value="">Select a task...</option>
                {otherTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Date">
          <input
            className={inputClass}
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
          />
        </Field>

        <div className="grid gap-1.5">
          <AssigneeSelector
            projectId={projectId || null}
            selectedUserId={assignedTo}
            onSelect={setAssignedTo}
            label="Assigned to"
            disabled={!task.permissions.canAssign && !task.permissions.canReassign}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={<>Project {optional}</>}>
          <select
            className={selectClass}
            disabled={!canChangeProject}
            onChange={(event) => handleProjectChange(event.target.value)}
            value={projectId}
          >
            <option value="">No project</option>
            {selectableProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>

        {projectId && (
          <Field label={<>Epic {optional}</>}>
            <select
              className={selectClass}
              onChange={(event) => setEpicId(event.target.value)}
              value={epicId}
            >
              <option value="">No epic</option>
              {availableEpics.map((epic) => (
                <option key={epic.id} value={epic.id}>
                  {epic.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      {errorMessage ? <p className="m-0 text-sm text-red-600">{errorMessage}</p> : null}

      <div className="flex justify-end border-t border-slate-100 pt-4">
        <Button className="w-full sm:w-auto" disabled={submitting} type="submit" variant="primary">
          {submitting ? 'Saving task...' : 'Update Task'}
        </Button>
      </div>
    </form>
  );
}

export default EditTaskForm;
