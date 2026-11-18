import { ChevronLeft, ChevronRight, ScrollText, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import EmptyState from '@/components/EmptyState';
import { Button, Input, Select } from '@/components/ui';

import { adminApi, type AuditEntry, type Paged } from './adminService';

const LABELS: Record<string, string> = {
  'user.create': 'Created an account',
  'user.update': 'Changed details',
  'user.suspend': 'Suspended',
  'user.reactivate': 'Reactivated',
  'user.reset_password': 'Reset the password of',
  'user.disable_2fa': 'Turned off two-step sign-in for',
  'user.revoke_sessions': 'Signed out everywhere',
  'user.make_super_admin': 'Made a super admin',
  'user.remove_super_admin': 'Removed super admin from',
  'user.delete': 'Deleted the account of',
};

export function AuditTab(): JSX.Element {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [action, setAction] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<({ entries: AuditEntry[] } & Paged) | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebounced(q);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [q]);

  useEffect(() => {
    adminApi.audit({ q: debounced || undefined, action: action === 'all' ? undefined : action, page, limit: 25 }).then(setData).catch(() => setData(null));
  }, [debounced, action, page]);

  return (
    <div className="grid gap-3" data-testid="admin-audit">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input aria-label="Search the log" className="pl-8" onChange={(e) => setQ(e.target.value)} placeholder="Search by admin or person" value={q} />
        </div>
        <div className="w-60">
          <Select
            aria-label="Action"
            onValueChange={(v) => {
              setAction(v);
              setPage(1);
            }}
            options={[{ value: 'all', label: 'Every action' }, ...Object.entries(LABELS).map(([value, label]) => ({ value, label }))]}
            value={action}
          />
        </div>
      </div>
      {!data ? (
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      ) : data.entries.length === 0 ? (
        <EmptyState description="Changes made in this panel are recorded here." icon={ScrollText} title="Nothing logged" />
      ) : (
        <ul className="m-0 list-none divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white p-0">
          {data.entries.map((a) => (
            <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5 text-[13px]" data-testid="audit-row" key={a.id}>
              <span className="text-slate-800">
                <strong className="font-medium text-slate-900">{a.actorEmail}</strong> {LABELS[a.action]?.toLowerCase() ?? a.action}{' '}
                <strong className="font-medium text-slate-900">{a.targetLabel ?? ''}</strong>
                {a.action === 'user.suspend' && a.details.reason ? <span className="text-slate-500"> ({String(a.details.reason)})</span> : null}
              </span>
              <time className="text-xs text-slate-500" dateTime={a.createdAt}>
                {new Date(a.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
              </time>
            </li>
          ))}
        </ul>
      )}
      {data ? (
        <div className="flex items-center justify-between text-[13px] text-slate-600">
          <span>{data.total} entries</span>
          <div className="flex items-center gap-2">
            <Button aria-label="Previous page" disabled={page <= 1} icon={ChevronLeft} onClick={() => setPage((p) => p - 1)} size="icon-sm" variant="secondary" />
            <span className="tabular-nums">
              Page {data.page} of {data.totalPages}
            </span>
            <Button aria-label="Next page" disabled={page >= data.totalPages} icon={ChevronRight} onClick={() => setPage((p) => p + 1)} size="icon-sm" variant="secondary" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
