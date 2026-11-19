import { useNavigate } from 'react-router-dom';
import { Check, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import Modal from '@/components/Modal';
import { Badge, Button, Input } from '@/components/ui';

import { useWorkspace } from '../context/WorkspaceContext';
import type { Workspace } from '../types/workspace';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog';

const ago = (iso: string | null | undefined): string => {
  if (!iso) return 'Not opened yet';
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return 'Opened today';
  if (days === 1) return 'Opened yesterday';
  if (days < 30) return `Opened ${days} days ago`;
  return `Opened ${new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

/** Every workspace of the person (the switcher only lists the five most recent), with search and a way to add one. */
export function AllWorkspacesDialog({ onClose }: { onClose: () => void }): JSX.Element {
  const { workspaces, activeWorkspace, switchWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? workspaces.filter((w) => w.name.toLowerCase().includes(q)) : workspaces;
  }, [workspaces, query]);

  if (creating) return <CreateWorkspaceDialog onClose={() => { setCreating(false); onClose(); }} />;

  const open = (ws: Workspace): void => {
    switchWorkspace(ws);
    onClose();
    navigate('/dashboard');
  };

  return (
    <Modal
      description={`${workspaces.length} workspace${workspaces.length === 1 ? '' : 's'}, the most recently opened first.`}
      footer={
        <div className="flex justify-end">
          <Button data-testid="all-workspaces-create" onClick={() => setCreating(true)} variant="secondary">
            <Plus size={14} /> New workspace
          </Button>
        </div>
      }
      maxWidth="max-w-xl"
      onClose={onClose}
      title="All workspaces"
    >
      <div className="grid gap-3" data-testid="all-workspaces">
        {workspaces.length > 6 ? (
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input aria-label="Search workspaces" className="pl-8" onChange={(e) => setQuery(e.target.value)} placeholder="Search workspaces" value={query} />
          </div>
        ) : null}
        <ul className="m-0 grid max-h-[55vh] list-none gap-1 overflow-y-auto p-0">
          {shown.map((ws) => {
            const active = ws.id === activeWorkspace?.id;
            return (
              <li key={ws.id}>
                <button
                  aria-current={active ? 'true' : undefined}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${active ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                  data-testid="all-workspaces-row"
                  onClick={() => open(ws)}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold ${active ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
                      {ws.name.trim().charAt(0).toUpperCase() || 'W'}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-slate-900">{ws.name}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {ws.memberCount} member{ws.memberCount === 1 ? '' : 's'} · {ws.projectCount} project{ws.projectCount === 1 ? '' : 's'} · {ago(ws.lastUsedAt)}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge tone={ws.role === 'OWNER' ? 'brand' : 'neutral'}>{ws.role.charAt(0) + ws.role.slice(1).toLowerCase()}</Badge>
                    {active ? <Check className="h-4 w-4 text-emerald-600" /> : null}
                  </span>
                </button>
              </li>
            );
          })}
          {shown.length === 0 ? <li className="px-3 py-6 text-center text-[13px] text-slate-500">No workspace matches "{query}".</li> : null}
        </ul>
      </div>
    </Modal>
  );
}
