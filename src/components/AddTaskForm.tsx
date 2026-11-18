import { FormEvent, useState, useEffect } from 'react';

import type { Epic } from '@/types/epic';
import type { Project } from '@/types/project';
import { TASK_WORKFLOW_STATUS_OPTIONS, type TaskWorkflowStatus, type TaskPriority } from '@/types/task';
import { flattenProjectOptions } from '@/utils/projectTree';
import AssigneeSelector from './AssigneeSelector';
import { DueDateField } from './DueDateField';
import { useProjectStates } from '@/features/projects/useProjectStates';
import { useAuth } from '@/context/AuthContext';
import { AlertTriangle } from 'lucide-react';
import { Button, Field, selectClass, textareaClass, Select, Input } from '@/components/ui';

interface AddTaskFormProps {
  epics: Epic[];
  initialProjectId?: string | null;
  initialEpicId?: string | null;
  onCreateTask: (payload: {
    title: string;
    description?: string;
    note?: string;
    status?: TaskWorkflowStatus;
    stateId?: string | null;
    /** Due date (YYYY-MM-DD); left out when none is set. */
    date?: string | null;
    priority?: TaskPriority;
    projectId?: string | null;
    epicId?: string | null;
    assignedTo?: string;
  }) => Promise<void>;
  projects: Project[];
}

function AddTaskForm({ epics, initialProjectId = null, initialEpicId = null, onCreateTask, projects }: AddTaskFormProps): JSX.Element {
  const { user } = useAuth();
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [status, setStatus] = useState<TaskWorkflowStatus>('TODO');
  const [stateId, setStateId] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  // Off by default: a task only has a due date when one is chosen.
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>(initialProjectId ?? '');
  const [epicId, setEpicId] = useState<string>(initialEpicId ?? '');
  const [assignedTo, setAssignedTo] = useState<string>(user?.id ?? '');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // The project's own stages when it has them, so this list matches the board and the settings.
  const { states: projectStates, loaded: statesLoaded } = useProjectStates(projectId || initialProjectId || null);
  const usingStates = projectStates.length > 0;
  const chosenState = usingStates ? (projectStates.find((st) => st._id === stateId) ?? projectStates[0]) : null;

  useEffect(() => {
    if (user?.id && !assignedTo) {
      setAssignedTo(user.id);
    }
  }, [user?.id, assignedTo]);

  useEffect(() => {
    if (initialProjectId) {
      setProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  useEffect(() => {
    if (initialEpicId) {
      setEpicId(initialEpicId);
      // If we have an epic but no project ID, try to find the project ID from epics list
      if (!projectId) {
        const parentEpic = epics.find(e => e.id === initialEpicId);
        if (parentEpic) {
          setProjectId(parentEpic.projectId);
        }
      }
    }
  }, [initialEpicId, epics, projectId]);

  const projectOptions = flattenProjectOptions(projects);
  const visibleEpics = epics.filter((epic) => epic.projectId === (projectId || initialProjectId)).sort((left, right) => left.order - right.order);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (title.trim() === '') {
      setErrorMessage('Task title is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const finalProjectId = projectId || initialProjectId || null;
    const finalEpicId = epicId || initialEpicId || null;

    console.log('[DEBUG] AddTaskForm submitting:', { 
      projectId, initialProjectId, finalProjectId, 
      epicId, initialEpicId, finalEpicId 
    });

    try {
      await onCreateTask({
        title: title.trim(),
        description: description.trim() || undefined,
        note: note.trim() || undefined,
        ...(chosenState ? { stateId: chosenState._id } : { status }),
        date: dueDate,
        priority,
        projectId: finalProjectId,
        epicId: finalEpicId || null,
        assignedTo: assignedTo || undefined
      });
      setTitle('');
      setDescription('');
      setNote('');
      setStatus('TODO');
      setPriority('MEDIUM');
      setDueDate(null);
      setProjectId(initialProjectId ?? '');
      setEpicId(initialEpicId ?? '');
    } catch {
      setErrorMessage('Unable to create the task right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const optional = <span className="font-normal text-slate-400">(optional)</span>;

  return (
    <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <Field label="Task title">
        <Input
          autoFocus
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs to be done?"
          required
          type="text"
          value={title}
        />
      </Field>

      <Field label={<>Description {optional}</>}>
        <textarea
          className={`${textareaClass} min-h-[80px] resize-y`}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Add more details about this task"
          rows={2}
          value={description}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Priority">
          <Select
            className={selectClass}
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
            value={priority}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </Select>
        </Field>

        <Field label="Initial status">
          {!statesLoaded ? (
            <Select className={selectClass} disabled onChange={() => undefined} value="">
              <option value="">Loading…</option>
            </Select>
          ) : usingStates ? (
            <Select className={selectClass} onChange={(event) => setStateId(event.target.value)} value={chosenState?._id ?? ''}>
              {projectStates.map((st) => (
                <option key={st._id} value={st._id}>
                  {st.name}
                </option>
              ))}
            </Select>
          ) : (
            <Select className={selectClass} onChange={(event) => setStatus(event.target.value as TaskWorkflowStatus)} value={status}>
              {TASK_WORKFLOW_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <Field label={<>Due date {optional}</>}>
        <DueDateField onChange={setDueDate} value={dueDate} />
      </Field>

      <div className="grid gap-1.5">
        <AssigneeSelector
          projectId={projectId || initialProjectId || null}
          selectedUserId={assignedTo}
          onSelect={setAssignedTo}
          label="Assigned to"
        />
      </div>

      {!initialProjectId && (
        <Field label="Project">
          <Select
            className={selectClass}
            onChange={(event) => {
              setProjectId(event.target.value);
              setEpicId('');
            }}
            value={projectId}
          >
            <option value="">No project</option>
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>
                {project.label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {(!initialEpicId && (projectId || initialProjectId)) && (
        <Field label="Epic">
          <Select className={selectClass} onChange={(event) => setEpicId(event.target.value)} value={epicId}>
            <option value="">No epic</option>
            {visibleEpics.map((epic) => (
              <option key={epic.id} value={epic.id}>
                {epic.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {errorMessage ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
          <AlertTriangle size={14} className="shrink-0 text-red-500" />
          <p className="m-0 text-sm text-red-700">{errorMessage}</p>
        </div>
      ) : null}

      <div className="flex justify-end border-t border-slate-100 pt-4">
        <Button className="w-full sm:w-auto" disabled={submitting} type="submit" variant="primary">
          {submitting ? 'Creating task...' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
}

export default AddTaskForm;
