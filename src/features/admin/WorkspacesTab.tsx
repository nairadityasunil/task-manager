import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import EmptyState from '@/components/EmptyState';
import { Badge, Button, Input } from '@/components/ui';
import { fmt } from '@/features/insights/charts';

import { adminApi, type AdminWorkspaceDetail, type AdminWorkspaceRow, type Paged } from './adminService';

const day = (v: string | null): string => (v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function WorkspaceDrawer({ id, onClose }: { id: string; onClose: () => void }): JSX.Element {
  const [ws, setWs] = useState<AdminWorkspaceDetail | null>(null);
  useEffect(() => {
    setWs(null);
    adminApi.workspace(id).then(setWs).catch(() => setWs(null));
  }, [id]);
  return (
    <>
      <div className="fixed inset-0 z-[5000] bg-slate-900/30 xl:bg-transparent" onClick={onClose} />
      <aside aria-label="Workspace details" className="fixed right-0 top-0 z-[5001] flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-xl sm:w-[480px]" data-testid="workspace-drawer" role="dialog">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div className="min-w-0">
            <h2 className="m-0 truncate text-base font-semibold text-slate-900">{ws?.name ?? 'Workspace'}</h2>
            <p className="m-0 text-[13px] text-slate-500">{ws ? `Created ${day(ws.createdAt)}` : 'Loading'}</p>
          </div>
          <Button aria-label="Close" icon={X} onClick={onClose} size="icon-sm" variant="ghost" />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {ws ? (
            <div className="grid gap-5">
              <section>
                <h3 className="m-0 mb-2 text-sm font-semibold text-slate-900">People ({ws.members.length})</h3>
                <ul className="m-0 grid list-none gap-1 p-0 text-[13px]">
                  {ws.members.map((m) => (
                    <li className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-1.5" key={m.userId}>
                      <span className="min-w-0 truncate text-slate-900">
                        {m.name || m.email}
                        {m.name ? <span className="ml-1.5 text-xs text-slate-500">{m.email}</span> : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {m.status !== 'active' ? <Badge tone="warning">{m.status}</Badge> : null}
                        <Badge tone={m.userId === ws.ownerId ? 'violet' : 'neutral'}>{m.userId === ws.ownerId ? 'owner' : m.role.toLowerCase()}</Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="m-0 mb-2 text-sm font-semibold text-slate-900">Projects ({ws.projects.length})</h3>
                {ws.projects.length ? (
                  <ul className="m-0 grid list-none gap-1 p-0 text-[13px]">
                    {ws.projects.map((p) => (
                      <li className="flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-1.5" key={p.id}>
                        <span className="truncate text-slate-900">{p.name}</span>
                        <span className="shrink-0 text-xs tabular-nums text-slate-500">{fmt(p.tasks)} tasks</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-[13px] text-slate-500">No projects</p>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}

export function WorkspacesTab(): JSX.Element {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<({ workspaces: AdminWorkspaceRow[] } & Paged) | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebounced(q);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [q]);

  useEffect(() => {
    adminApi.workspaces({ q: debounced || undefined, page, limit: 25 }).then(setData).catch(() => setData(null));
  }, [debounced, page]);

  return (
    <div className="grid gap-3" data-testid="admin-workspaces">
      <div className="relative max-w-md">
        <Search aria-hidden className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input aria-label="Search workspaces" className="pl-8" onChange={(e) => setQ(e.target.value)} placeholder="Search workspaces" value={q} />
      </div>
      {!data ? (
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      ) : data.workspaces.length === 0 ? (
        <EmptyState description="Try a different search." icon={Search} title="No workspace matches" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[680px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                <th className="px-3 py-2 font-medium">Workspace</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 text-right font-medium">People</th>
                <th className="px-3 py-2 text-right font-medium">Projects</th>
                <th className="px-3 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.workspaces.map((w) => (
                <tr className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50" data-testid="workspace-row" key={w.id} onClick={() => setOpenId(w.id)}>
                  <td className="px-3 py-2 font-medium text-slate-900">{w.name}</td>
                  <td className="px-3 py-2 text-slate-600">{w.owner ? w.owner.name || w.owner.email : 'Unknown'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{w.members}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{w.projects}</td>
                  <td className="px-3 py-2 text-slate-600">{day(w.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data ? (
        <div className="flex items-center justify-between text-[13px] text-slate-600">
          <span>{data.total} workspaces</span>
          <div className="flex items-center gap-2">
            <Button aria-label="Previous page" disabled={page <= 1} icon={ChevronLeft} onClick={() => setPage((p) => p - 1)} size="icon-sm" variant="secondary" />
            <span className="tabular-nums">
              Page {data.page} of {data.totalPages}
            </span>
            <Button aria-label="Next page" disabled={page >= data.totalPages} icon={ChevronRight} onClick={() => setPage((p) => p + 1)} size="icon-sm" variant="secondary" />
          </div>
        </div>
      ) : null}
      {openId ? <WorkspaceDrawer id={openId} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}
