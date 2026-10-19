import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, Workflow, X } from 'lucide-react';

import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import projectStateService, { type ProjectState } from '@/services/projectStates';

type StateCategory = ProjectState['category'];

const CATEGORIES: { value: StateCategory; label: string }[] = [
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'UNSTARTED', label: 'Not started' },
  { value: 'STARTED', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELED', label: 'Canceled' }
];

const DEFAULT_STATES: { name: string; color: string; category: StateCategory }[] = [
  { name: 'Backlog', color: '#9CA3AF', category: 'BACKLOG' },
  { name: 'In Progress', color: '#3B82F6', category: 'STARTED' },
  { name: 'Review', color: '#8B5CF6', category: 'STARTED' },
  { name: 'Done', color: '#10B981', category: 'COMPLETED' }
];

const MAX_NAME_LENGTH = 50;

interface StateDraft {
  name: string;
  color: string;
  category: StateCategory;
  description: string;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const FALLBACK_COLOR = '#6B7280';

const emptyDraft = (): StateDraft => ({ name: '', color: '#3B82F6', category: 'STARTED', description: '' });

const categoryLabel = (category: StateCategory): string =>
  CATEGORIES.find((entry) => entry.value === category)?.label ?? category;

const sortStates = (states: ProjectState[]): ProjectState[] =>
  states.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

const errorMessage = (error: unknown, fallback: string): string =>
  typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: unknown }).message === 'string'
    ? (error as { message: string }).message
    : fallback;

interface ProjectWorkflowStatesPanelProps {
  projectId: string;
  canManage: boolean;
}

function ProjectWorkflowStatesPanel({ projectId, canManage }: ProjectWorkflowStatesPanelProps): JSX.Element {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [states, setStates] = useState<ProjectState[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newDraft, setNewDraft] = useState<StateDraft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<StateDraft>(emptyDraft());

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setStates(sortStates(await projectStateService.getProjectStates(projectId)));
    } catch (error) {
      setLoadError(errorMessage(error, 'Failed to load workflow states.'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Every mutation goes through here so only one request runs at a time and
  // failures leave the list as the server last reported it.
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch {
      // The API client already shows the error toast; resync with the server.
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = () =>
    run(async () => {
      const created = await projectStateService.createProjectState(projectId, {
        name: newDraft.name.trim(),
        color: newDraft.color,
        category: newDraft.category,
        description: newDraft.description.trim()
      });
      setStates((current) => sortStates([...current, created]));
      setNewDraft(emptyDraft());
      showToast({ variant: 'success', message: `Added "${created.name}".` });
    });

  const handleAddDefaults = () =>
    run(async () => {
      const created: ProjectState[] = [];
      for (const state of DEFAULT_STATES) {
        created.push(await projectStateService.createProjectState(projectId, state));
      }
      setStates(sortStates(created));
      showToast({ variant: 'success', message: 'Default workflow added.' });
    });

  const startEdit = (state: ProjectState) => {
    setEditingId(state._id);
    setEditDraft({
      name: state.name,
      color: HEX_COLOR.test(state.color) ? state.color : FALLBACK_COLOR,
      category: state.category,
      description: state.description ?? ''
    });
  };

  const handleSaveEdit = (stateId: string) =>
    run(async () => {
      const updated = await projectStateService.updateProjectState(projectId, stateId, {
        name: editDraft.name.trim(),
        color: editDraft.color,
        category: editDraft.category,
        description: editDraft.description.trim()
      });
      setStates((current) => current.map((state) => (state._id === stateId ? { ...state, ...updated } : state)));
      setEditingId(null);
    });

  const handleDelete = async (state: ProjectState) => {
    const isConfirmed = await confirm({
      title: 'Delete Workflow State',
      message: `Delete the "${state.name}" state from this project's workflow?`,
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!isConfirmed) return;
    await run(async () => {
      await projectStateService.deleteProjectState(projectId, state._id);
      setStates((current) =>
        current.filter((entry) => entry._id !== state._id).map((entry, index) => ({ ...entry, position: index }))
      );
    });
  };

  const handleMove = (index: number, direction: -1 | 1) =>
    run(async () => {
      const target = index + direction;
      if (target < 0 || target >= states.length) return;
      const reordered = states.slice();
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      setStates(reordered);
      const saved = await projectStateService.reorderProjectStates(projectId, reordered.map((state) => state._id));
      setStates(sortStates(saved));
    });

  const isNameValid = (name: string) => name.trim().length > 0 && name.trim().length <= MAX_NAME_LENGTH;

  return (
    <div className="space-y-5 p-6">
      <p className="m-0 text-sm text-slate-600">
        Workflow states describe the stages work moves through in this project. The AI planner uses them when it plans and reports on the project.
      </p>

      {loading && <p className="m-0 text-sm text-slate-500">Loading workflow…</p>}

      {!loading && loadError && (
        <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{loadError}</span>
          <button className="font-semibold underline" onClick={() => void load()} type="button">Retry</button>
        </div>
      )}

      {!loading && !loadError && states.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-200 px-6 py-8 text-center">
          <Workflow className="mx-auto text-slate-400" size={26} />
          <p className="m-0 mt-3 text-sm font-semibold text-slate-800">No workflow states yet</p>
          {canManage ? (
            <button
              className="mt-4 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={busy}
              onClick={() => void handleAddDefaults()}
              type="button"
            >
              Add default workflow (Backlog → In Progress → Review → Done)
            </button>
          ) : (
            <p className="m-0 mt-1 text-sm text-slate-500">A project admin can set up the workflow.</p>
          )}
        </div>
      )}

      {!loading && !loadError && states.length > 0 && (
        <ol className="m-0 grid list-none gap-2 p-0">
          {states.map((state, index) => (
            <li className="rounded-lg border border-slate-200 bg-white px-4 py-3" key={state._id}>
              {editingId === state._id ? (
                <StateFields
                  draft={editDraft}
                  onChange={setEditDraft}
                  actions={(
                    <>
                      <button
                        aria-label="Save state"
                        className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                        disabled={busy || !isNameValid(editDraft.name)}
                        onClick={() => void handleSaveEdit(state._id)}
                        type="button"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        aria-label="Cancel editing"
                        className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                        onClick={() => setEditingId(null)}
                        type="button"
                      >
                        <X size={16} />
                      </button>
                    </>
                  )}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <span className="w-5 text-right text-xs font-semibold text-slate-400">{index + 1}</span>
                  <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: state.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-950">{state.name}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{categoryLabel(state.category)}</span>
                    </div>
                    {state.description && <p className="m-0 mt-0.5 truncate text-xs text-slate-500">{state.description}</p>}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <IconButton disabled={busy || index === 0} label="Move up" onClick={() => void handleMove(index, -1)}><ArrowUp size={14} /></IconButton>
                      <IconButton disabled={busy || index === states.length - 1} label="Move down" onClick={() => void handleMove(index, 1)}><ArrowDown size={14} /></IconButton>
                      <IconButton disabled={busy} label="Edit state" onClick={() => startEdit(state)}><Pencil size={14} /></IconButton>
                      <IconButton danger disabled={busy} label="Delete state" onClick={() => void handleDelete(state)}><Trash2 size={14} /></IconButton>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {!loading && !loadError && canManage && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <p className="m-0 mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Add state</p>
          <StateFields
            draft={newDraft}
            onChange={setNewDraft}
            actions={(
              <button
                className="flex h-9 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                disabled={busy || !isNameValid(newDraft.name)}
                onClick={() => void handleCreate()}
                type="button"
              >
                <Plus size={14} /> Add
              </button>
            )}
          />
        </div>
      )}

      {!loading && !loadError && !canManage && states.length > 0 && (
        <p className="m-0 text-xs text-slate-500">Only project admins can change the workflow.</p>
      )}
    </div>
  );
}

function StateFields({
  draft,
  onChange,
  actions
}: {
  draft: StateDraft;
  onChange: (draft: StateDraft) => void;
  actions: React.ReactNode;
}): JSX.Element {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label="State color"
          className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-slate-200 bg-white p-1"
          onChange={(event) => onChange({ ...draft, color: event.target.value.toUpperCase() })}
          type="color"
          value={draft.color}
        />
        <input
          aria-label="State name"
          className="h-9 min-w-[160px] flex-1 rounded-md border border-slate-200 px-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          maxLength={MAX_NAME_LENGTH}
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
          placeholder="State name"
          value={draft.name}
        />
        <select
          aria-label="State category"
          className="h-9 rounded-md border border-slate-200 px-2 text-sm text-slate-900"
          onChange={(event) => onChange({ ...draft, category: event.target.value as StateCategory })}
          value={draft.category}
        >
          {CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>{category.label}</option>
          ))}
        </select>
        {actions}
      </div>
      <input
        aria-label="State description"
        className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
        maxLength={200}
        onChange={(event) => onChange({ ...draft, description: event.target.value })}
        placeholder="Description (optional)"
        value={draft.description}
      />
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
  danger = false
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}): JSX.Element {
  return (
    <button
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-md text-slate-500 disabled:opacity-30 ${danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-slate-100 hover:text-slate-800'}`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

export default ProjectWorkflowStatesPanel;
