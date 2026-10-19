import { ArrowDown, ArrowUp, FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import { Badge, Button, type BadgeTone } from '@/components/ui';
import type { Epic } from '@/types/epic';

interface EpicManagerProps {
  actionEpicId: string | null;
  epics: Epic[];
  onCreateEpic: () => void;
  onDeleteEpic: (epic: Epic) => Promise<void>;
  onEditEpic: (epic: Epic) => void;
  onMoveEpic: (epic: Epic, direction: 'up' | 'down') => Promise<void>;
  projectName: string;
}

const statusTone: Record<string, BadgeTone> = {
  planned: 'neutral',
  active: 'info',
  completed: 'success',
  archived: 'neutral'
};

function EpicManager({
  actionEpicId,
  epics,
  onCreateEpic,
  onDeleteEpic,
  onEditEpic,
  onMoveEpic,
  projectName
}: EpicManagerProps): JSX.Element {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-[15px] font-semibold text-slate-900">{projectName} epics</h3>
          <p className="m-0 mt-0.5 text-[13px] text-slate-500">Create, reorder, rename, or remove epics without affecting the underlying tasks.</p>
        </div>
        <Button icon={Plus} onClick={onCreateEpic} variant="primary">
          New epic
        </Button>
      </div>

      {epics.length === 0 ? (
        <EmptyState
          description="Create an epic to group related tasks inside this project."
          icon={FolderTree}
          title="No epics yet"
        />
      ) : (
        <ul className="m-0 grid list-none divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white p-0">
          {epics.map((epic, index) => (
            <li key={epic.id} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="grid min-w-0 gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">#{index + 1}</span>
                  <span className="truncate text-sm font-medium text-slate-900">{epic.name}</span>
                  <Badge tone={statusTone[epic.status] ?? 'neutral'}>{epic.status.charAt(0).toUpperCase() + epic.status.slice(1)}</Badge>
                </div>
                <span className="line-clamp-2 text-[13px] text-slate-500">
                  {epic.description?.trim() ? epic.description : 'No description provided.'}
                </span>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <Button disabled={index === 0 || actionEpicId === epic.id} icon={ArrowUp} onClick={() => void onMoveEpic(epic, 'up')} size="sm">
                  Up
                </Button>
                <Button disabled={index === epics.length - 1 || actionEpicId === epic.id} icon={ArrowDown} onClick={() => void onMoveEpic(epic, 'down')} size="sm">
                  Down
                </Button>
                <Button disabled={actionEpicId === epic.id} icon={Pencil} onClick={() => onEditEpic(epic)} size="sm">
                  Edit
                </Button>
                <Button disabled={actionEpicId === epic.id} icon={Trash2} onClick={() => void onDeleteEpic(epic)} size="sm" variant="danger">
                  {actionEpicId === epic.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default EpicManager;
