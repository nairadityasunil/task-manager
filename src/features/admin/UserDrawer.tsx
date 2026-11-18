import { Ban, KeyRound, LogOut, Pencil, RotateCcw, ShieldCheck, ShieldOff, Smartphone, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Badge, Button, Input, avatarColor, cn, initialsOf } from '@/components/ui';
import { useConfirm, usePrompt } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import { compact, fmt } from '@/features/insights/charts';
import { timeAgo } from '@/services/agents';
import { toDisplayErrorMessage } from '@/utils/apiError';

import { adminApi, type AdminUserDetail } from './adminService';
import { TemporaryPassword } from './CreateUserModal';

const when = (v: string | null): string => (v ? new Date(v).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Never');
const ACTION_LABEL: Record<string, string> = {
  'user.create': 'Account created',
  'user.update': 'Details changed',
  'user.suspend': 'Suspended',
  'user.reactivate': 'Reactivated',
  'user.reset_password': 'Password reset',
  'user.disable_2fa': 'Two-step sign-in turned off',
  'user.revoke_sessions': 'Signed out everywhere',
  'user.make_super_admin': 'Made super admin',
  'user.remove_super_admin': 'Super admin removed',
  'user.delete': 'Account deleted',
};

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-base font-semibold tabular-nums text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

/** Everything about one person, and the actions an admin can take on them. */
export function UserDrawer({ userId, currentUserId, onClose, onChanged }: { userId: string; currentUserId: string | null; onClose: () => void; onChanged: () => void }): JSX.Element {
  const confirm = useConfirm();
  const ask = usePrompt();
  const { showToast } = useToast();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ name: string; email: string } | null>(null);
  const [temp, setTemp] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setUser(await adminApi.user(userId));
      setError(false);
    } catch {
      setError(true);
    }
  }, [userId]);

  useEffect(() => {
    setUser(null);
    void load();
  }, [load]);

  const act = async (key: string, fn: () => Promise<unknown>, success: string): Promise<boolean> => {
    setBusy(key);
    try {
      await fn();
      showToast({ variant: 'success', message: success });
      await load();
      onChanged();
      return true;
    } catch (err) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(err) });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const isSelf = user?.id === currentUserId;
  const deleted = user?.status === 'deleted';

  const suspend = async (): Promise<void> => {
    if (!user) return;
    const ok = await confirm({ title: 'Suspend this account?', message: `${user.email} is signed out now and cannot sign in until you reactivate the account.`, confirmText: 'Suspend', type: 'danger' });
    if (ok) await act('suspend', () => adminApi.suspend(user.id), 'Account suspended');
  };
  const reset = async (): Promise<void> => {
    if (!user) return;
    const ok = await confirm({ title: 'Reset the password?', message: `${user.email} is signed out everywhere and gets a new temporary password that you hand over.`, confirmText: 'Reset password', type: 'danger' });
    if (!ok) return;
    setBusy('reset');
    try {
      const res = await adminApi.resetPassword(user.id);
      setTemp(res.temporaryPassword);
      await load();
      onChanged();
    } catch (err) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(err) });
    } finally {
      setBusy(null);
    }
  };
  const signOut = async (): Promise<void> => {
    if (!user) return;
    if (await confirm({ title: 'Sign out everywhere?', message: `Every device of ${user.email} is signed out. They can sign in again.`, confirmText: 'Sign out', type: 'info' }))
      await act('signout', () => adminApi.signOut(user.id), 'Signed out everywhere');
  };
  const toggleAdmin = async (): Promise<void> => {
    if (!user) return;
    const on = !user.isSuperAdmin;
    const ok = await confirm({
      title: on ? 'Make a super admin?' : 'Remove super admin?',
      message: on ? `${user.email} will be able to see and manage everyone on the platform.` : `${user.email} loses access to this panel.`,
      confirmText: on ? 'Make super admin' : 'Remove access',
      type: on ? 'danger' : 'info',
    });
    if (ok) await act('admin', () => (on ? adminApi.makeSuperAdmin(user.id) : adminApi.removeSuperAdmin(user.id)), on ? 'Now a super admin' : 'Super admin removed');
  };
  const remove = async (): Promise<void> => {
    if (!user) return;
    const typed = await ask({
      title: 'Delete this account?',
      message: user.email + ' is signed out and anonymised: their details, keys and memberships are removed. Their work stays under "Deleted user". This cannot be undone.',
      label: 'Type their email to confirm',
      placeholder: user.email,
      confirmText: 'Delete account',
      optional: false,
    });
    if (typed == null) return;
    await act('delete', () => adminApi.deleteUser(user.id, typed), 'Account deleted');
  };

  return (
    <>
      <div className="fixed inset-0 z-[5000] bg-slate-900/30 xl:bg-transparent" onClick={onClose} />
      <aside aria-label="Person details" className="fixed right-0 top-0 z-[5001] flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-xl sm:w-[520px]" data-testid="user-drawer" role="dialog">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          {user ? (
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold', avatarColor(user.id))}>
                {initialsOf(user.name, user.email)}
              </span>
              <div className="min-w-0">
                <h2 className="m-0 truncate text-base font-semibold text-slate-900">{user.name || user.email}</h2>
                <p className="m-0 truncate text-[13px] text-slate-500">{user.email}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge dot tone={user.status === 'active' ? 'success' : user.status === 'suspended' ? 'warning' : 'neutral'}>
                    {user.status === 'active' ? 'Active' : user.status === 'suspended' ? 'Suspended' : 'Deleted'}
                  </Badge>
                  {user.isSuperAdmin ? (
                    <Badge tone="violet">
                      <ShieldCheck size={11} /> Super admin
                    </Badge>
                  ) : null}
                  {isSelf ? <Badge tone="neutral">You</Badge> : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-11 w-48 animate-pulse rounded bg-slate-100" />
          )}
          <Button aria-label="Close" icon={X} onClick={onClose} size="icon-sm" variant="ghost" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error ? <p className="m-0 text-[13px] text-red-700">This person could not be loaded.</p> : null}
          {user ? (
            <div className="grid gap-5">
              {user.status === 'suspended' ? (
                <p className="m-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                  Suspended {user.suspendedAt ? when(user.suspendedAt) : ''}
                  {user.suspendedReason ? `: ${user.suspendedReason}` : ''}
                </p>
              ) : null}

              {editing ? (
                <form
                  className="grid gap-2 rounded-lg border border-slate-200 p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act('edit', () => adminApi.updateUser(user.id, editing), 'Details saved').then((ok) => ok && setEditing(null));
                  }}
                >
                  <Input aria-label="Name" onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Name" value={editing.name} />
                  <Input aria-label="Email" onChange={(e) => setEditing({ ...editing, email: e.target.value })} placeholder="Email" type="email" value={editing.email} />
                  <div className="flex justify-end gap-2">
                    <Button onClick={() => setEditing(null)} size="sm" type="button" variant="secondary">
                      Cancel
                    </Button>
                    <Button loading={busy === 'edit'} size="sm" type="submit" variant="primary">
                      Save
                    </Button>
                  </div>
                </form>
              ) : null}

              <section aria-label="Actions" className="flex flex-wrap gap-2" data-testid="user-actions">
                {!deleted ? (
                  <>
                    <Button icon={Pencil} onClick={() => setEditing({ name: user.name ?? '', email: user.email })} size="sm" variant="secondary">
                      Edit
                    </Button>
                    {user.status === 'suspended' ? (
                      <Button icon={RotateCcw} loading={busy === 'reactivate'} onClick={() => void act('reactivate', () => adminApi.reactivate(user.id), 'Account reactivated')} size="sm" variant="secondary">
                        Reactivate
                      </Button>
                    ) : (
                      <Button disabled={isSelf} icon={Ban} loading={busy === 'suspend'} onClick={() => void suspend()} size="sm" title={isSelf ? 'You cannot suspend yourself' : undefined} variant="secondary">
                        Suspend
                      </Button>
                    )}
                    <Button icon={KeyRound} loading={busy === 'reset'} onClick={() => void reset()} size="sm" variant="secondary">
                      Reset password
                    </Button>
                    <Button icon={LogOut} loading={busy === 'signout'} onClick={() => void signOut()} size="sm" variant="secondary">
                      Sign out everywhere
                    </Button>
                    {user.twoFactorEnabled ? (
                      <Button icon={ShieldOff} loading={busy === 'tfa'} onClick={() => void act('tfa', () => adminApi.disableTwoFactor(user.id), 'Two-step sign-in turned off')} size="sm" variant="secondary">
                        Turn off 2-step
                      </Button>
                    ) : null}
                    <Button
                      disabled={isSelf || user.superAdminSource === 'settings'}
                      icon={ShieldCheck}
                      loading={busy === 'admin'}
                      onClick={() => void toggleAdmin()}
                      size="sm"
                      title={user.superAdminSource === 'settings' ? 'Set by the server settings (SUPER_ADMIN_EMAILS)' : isSelf ? 'You cannot change your own access' : undefined}
                      variant="secondary"
                    >
                      {user.isSuperAdmin ? 'Remove super admin' : 'Make super admin'}
                    </Button>
                    <Button disabled={isSelf} icon={Trash2} loading={busy === 'delete'} onClick={() => void remove()} size="sm" variant="danger">
                      Delete
                    </Button>
                  </>
                ) : (
                  <p className="m-0 text-[13px] text-slate-500">This account was deleted and anonymised. There is nothing more to change.</p>
                )}
              </section>

              <section>
                <h3 className="m-0 mb-2 text-sm font-semibold text-slate-900">Usage</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Stat label="Tasks created" value={fmt(user.stats.tasksCreated)} />
                  <Stat label="Tasks assigned" value={fmt(user.stats.tasksAssigned)} />
                  <Stat label="Invitations sent" value={fmt(user.stats.invitationsSent)} />
                  <Stat label="AI runs" value={fmt(user.stats.aiRuns)} />
                  <Stat label="AI tokens" value={compact(user.stats.aiTokens)} />
                  <Stat label="AI cost" value={'$' + user.stats.aiCost.toFixed(user.stats.aiCost < 1 ? 4 : 2)} />
                </div>
              </section>

              <section>
                <h3 className="m-0 mb-2 text-sm font-semibold text-slate-900">Account</h3>
                <dl className="m-0 grid gap-1.5 text-[13px]">
                  {(
                    [
                      ['Signs in with', user.authProvider === 'google' ? 'Google' : 'Password'],
                      ['Two-step sign-in', user.twoFactorEnabled ? 'On' : 'Off'],
                      ['Joined', when(user.createdAt)],
                      ['Last active', user.lastActiveAt ? when(user.lastActiveAt) : 'Never'],
                      ['Password changed', user.passwordChangedAt ? when(user.passwordChangedAt) : 'Never'],
                    ] as Array<[string, string]>
                  ).map(([k, v]) => (
                    <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-2" key={k}>
                      <dt className="text-slate-500">{k}</dt>
                      <dd className="m-0 text-slate-900">{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section>
                <h3 className="m-0 mb-2 text-sm font-semibold text-slate-900">Workspaces ({user.memberships.workspaces.length})</h3>
                {user.memberships.workspaces.length ? (
                  <ul className="m-0 grid list-none gap-1 p-0 text-[13px]">
                    {user.memberships.workspaces.map((w) => (
                      <li className="flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-1.5" key={w.id}>
                        <span className="truncate text-slate-900">{w.name}</span>
                        <Badge tone="neutral">{w.role.toLowerCase()}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-[13px] text-slate-500">None</p>
                )}
              </section>

              <section>
                <h3 className="m-0 mb-2 text-sm font-semibold text-slate-900">Projects ({user.memberships.projects.length})</h3>
                {user.memberships.projects.length ? (
                  <ul className="m-0 grid max-h-48 list-none gap-1 overflow-y-auto p-0 text-[13px]">
                    {user.memberships.projects.map((p) => (
                      <li className="flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-1.5" key={p.id}>
                        <span className="truncate text-slate-900">{p.name}</span>
                        <Badge tone={p.role === 'ADMIN' ? 'violet' : 'neutral'}>{p.role === 'ADMIN' ? 'admin' : 'member'}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-[13px] text-slate-500">None</p>
                )}
              </section>

              <section>
                <h3 className="m-0 mb-2 text-sm font-semibold text-slate-900">Devices and sessions</h3>
                {user.sessions.length ? (
                  <ul className="m-0 grid list-none gap-1.5 p-0 text-[13px]">
                    {user.sessions.slice(0, 8).map((s) => (
                      <li className="flex items-center gap-2 rounded-md border border-slate-100 px-2.5 py-1.5" key={s.id}>
                        <Smartphone className="shrink-0 text-slate-400" size={14} />
                        <span className="min-w-0 flex-1 truncate text-slate-800" title={s.userAgent ?? ''}>
                          {s.deviceName || s.deviceType}
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">{s.lastUsedAt ? timeAgo(s.lastUsedAt) : 'never used'}</span>
                        <Badge tone={s.active ? 'success' : 'neutral'}>{s.active ? 'signed in' : 'ended'}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-[13px] text-slate-500">No sessions</p>
                )}
              </section>

              <section>
                <h3 className="m-0 mb-2 text-sm font-semibold text-slate-900">Admin history</h3>
                {user.audit.length ? (
                  <ul className="m-0 grid list-none gap-1 p-0 text-[13px]">
                    {user.audit.map((a) => (
                      <li className="flex items-baseline justify-between gap-3" key={a.id}>
                        <span className="text-slate-800">
                          {ACTION_LABEL[a.action] ?? a.action} <span className="text-xs text-slate-500">by {a.actorEmail}</span>
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">{timeAgo(a.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-[13px] text-slate-500">Nothing yet</p>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </aside>
      {temp && user ? <TemporaryPassword email={user.email} onDone={() => setTemp(null)} password={temp} /> : null}
    </>
  );
}
