import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { workspaceService } from '../services/workspaceService';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Workspace } from '../types/workspace';
import { Button, inputClass } from '@/components/ui';

interface WorkspaceDangerZoneProps {
  workspace: Workspace;
}

export function WorkspaceDangerZone({ workspace }: WorkspaceDangerZoneProps): JSX.Element | null {
  const { refreshWorkspaces } = useWorkspace();
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  if (workspace.role !== 'OWNER') return null;

  const handleDelete = async () => {
    if (confirmName !== workspace.name) {
      setError(`Type "${workspace.name}" to confirm deletion.`);
      return;
    }
    setIsDeleting(true);
    setError('');
    try {
      await workspaceService.deleteWorkspace(workspace.id);
      await refreshWorkspaces();
      // Navigation handled by refreshWorkspaces → workspace list changes
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete workspace');
      setIsDeleting(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-red-200 bg-white">
      <div className="flex items-center gap-2 border-b border-red-100 bg-red-50/60 px-4 py-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
        <h4 className="m-0 text-sm font-semibold text-red-700">Danger Zone</h4>
      </div>

      <div className="p-4">
        {!showConfirm ? (
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900">Delete this workspace</div>
              <div className="mt-0.5 text-[13px] text-slate-500">
                Permanently deletes the workspace and removes all member access. Projects are preserved but unlinked.
              </div>
            </div>
            <Button variant="danger" size="sm" icon={Trash2} onClick={() => setShowConfirm(true)}>
              Delete Workspace
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="m-0 text-sm text-slate-700">
              Type <span className="font-semibold text-red-700">{workspace.name}</span> to confirm deletion:
            </p>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={workspace.name}
              className={`${inputClass} focus:border-red-500 focus:ring-red-600/10`}
            />
            {error && <p className="m-0 text-xs text-red-600">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={() => { setShowConfirm(false); setConfirmName(''); setError(''); }}>
                Cancel
              </Button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting || confirmName !== workspace.name}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-red-600 px-3.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-600/30 disabled:pointer-events-none disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Deleting…' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkspaceDangerZone;
