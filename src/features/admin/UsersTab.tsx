import { ChevronLeft, ChevronRight, Plus, Search, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import EmptyState from '@/components/EmptyState';
import { Badge, Button, Input, Select, avatarColor, cn, initialsOf } from '@/components/ui';
import { timeAgo } from '@/services/agents';

import { adminApi, type AdminUserRow, type Paged } from './adminService';
import { CreateUserModal } from './CreateUserModal';
import { UserDrawer } from './UserDrawer';

const STATUS_TONE = { active: 'success', suspended: 'warning', deleted: 'neutral' } as const;
const day = (v: string | null): string => (v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export function UsersTab({ currentUserId }: { currentUserId: string | null }): JSX.Element {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('all');
  const [role, setRole] = useState('all');
  const [provider, setProvider] = useState('all');
  const [sort, setSort] = useState('createdAt:desc');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<({ users: AdminUserRow[] } & Paged) | null>(null);
  const [error, setError] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebounced(q);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [q]);

  const load = useCallback(async () => {
    const [sortKey, order] = sort.split(':');
    try {
      setData(
        await adminApi.users({
          q: debounced || undefined,
          status: status === 'all' ? undefined : status,
          role: role === 'all' ? undefined : role,
          provider: provider === 'all' ? undefined : provider,
          sort: sortKey,
          order,
          page,
          limit: 25,
        })
      );
      setError(false);
    } catch {
      setError(true);
    }
  }, [debounced, status, role, provider, sort, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const filter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  return (
    <div className="grid gap-3" data-testid="admin-users">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input aria-label="Search people" className="pl-8" onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" value={q} />
        </div>
        <div className="w-36">
          <Select aria-label="Status" onValueChange={filter(setStatus)} options={[{ value: 'all', label: 'Any status' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }, { value: 'deleted', label: 'Deleted' }]} value={status} />
        </div>
        <div className="w-36">
          <Select aria-label="Role" onValueChange={filter(setRole)} options={[{ value: 'all', label: 'Any role' }, { value: 'super_admin', label: 'Super admins' }]} value={role} />
        </div>
        <div className="w-36">
          <Select aria-label="Sign-in" onValueChange={filter(setProvider)} options={[{ value: 'all', label: 'Any sign-in' }, { value: 'local', label: 'Password' }, { value: 'google', label: 'Google' }]} value={provider} />
        </div>
        <div className="w-44">
          <Select
            aria-label="Sort"
            onValueChange={filter(setSort)}
            options={[
              { value: 'createdAt:desc', label: 'Newest first' },
              { value: 'createdAt:asc', label: 'Oldest first' },
              { value: 'name:asc', label: 'Name A to Z' },
              { value: 'email:asc', label: 'Email A to Z' },
            ]}
            value={sort}
          />
        </div>
        <Button data-testid="create-user" icon={Plus} onClick={() => setCreating(true)} variant="primary">
          New user
        </Button>
      </div>

      {error ? (
        <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800" role="alert">
          People could not be loaded.
        </p>
      ) : null}

      {!data ? (
        <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
      ) : data.users.length === 0 ? (
        <EmptyState description="Try a different search or filter." icon={Search} title="No one matches" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[860px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                <th className="px-3 py-2 font-medium">Person</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Sign-in</th>
                <th className="px-3 py-2 text-right font-medium">Workspaces</th>
                <th className="px-3 py-2 text-right font-medium">Projects</th>
                <th className="px-3 py-2 font-medium">Last active</th>
                <th className="px-3 py-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr
                  className={cn('cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50', openId === u.id && 'bg-brand-50/50')}
                  data-testid="user-row"
                  key={u.id}
                  onClick={() => setOpenId(u.id)}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      <span aria-hidden className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold', avatarColor(u.id))}>
                        {initialsOf(u.name, u.email)}
                      </span>
                      <div className="min-w-0">
                        <button className="block max-w-[260px] truncate text-left font-medium text-slate-900 hover:underline" onClick={() => setOpenId(u.id)} type="button">
                          {u.name || u.email}
                          {u.id === currentUserId ? <span className="font-normal text-slate-500"> (you)</span> : null}
                        </button>
                        <div className="max-w-[260px] truncate text-xs text-slate-500">{u.name ? u.email : ''}</div>
                      </div>
                      {u.isSuperAdmin ? (
                        <Badge tone="violet">
                          <ShieldCheck size={11} /> Super admin
                        </Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge dot tone={STATUS_TONE[u.status]}>
                      {u.status === 'active' ? 'Active' : u.status === 'suspended' ? 'Suspended' : 'Deleted'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {u.authProvider === 'google' ? 'Google' : 'Password'}
                    {u.twoFactorEnabled ? <span className="ml-1.5 text-xs text-slate-500">+ 2-step</span> : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{u.workspaces}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{u.projects}</td>
                  <td className="px-3 py-2 text-slate-600">{u.lastActiveAt ? timeAgo(u.lastActiveAt) : <span className="text-slate-400">Never</span>}</td>
                  <td className="px-3 py-2 text-slate-600">{day(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data ? (
        <div className="flex items-center justify-between text-[13px] text-slate-600">
          <span data-testid="users-total">
            {data.total} {data.total === 1 ? 'person' : 'people'}
          </span>
          <div className="flex items-center gap-2">
            <Button aria-label="Previous page" disabled={page <= 1} icon={ChevronLeft} onClick={() => setPage((p) => p - 1)} size="icon-sm" variant="secondary" />
            <span className="tabular-nums">
              Page {data.page} of {data.totalPages}
            </span>
            <Button aria-label="Next page" disabled={page >= data.totalPages} icon={ChevronRight} onClick={() => setPage((p) => p + 1)} size="icon-sm" variant="secondary" />
          </div>
        </div>
      ) : null}

      {openId ? <UserDrawer currentUserId={currentUserId} onChanged={() => void load()} onClose={() => setOpenId(null)} userId={openId} /> : null}
      {creating ? (
        <CreateUserModal
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            void load();
            setOpenId(id);
          }}
        />
      ) : null}
    </div>
  );
}
