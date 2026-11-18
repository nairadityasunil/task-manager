import { ArrowLeft, BarChart3, Building2, LogOut, Mail, Menu, ScrollText, ShieldCheck, Users, X, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export type AdminTab = 'analytics' | 'users' | 'workspaces' | 'emails' | 'audit';

export const ADMIN_TABS: Array<{ value: AdminTab; label: string; description: string; icon: LucideIcon }> = [
  { value: 'analytics', label: 'Analytics', description: 'How the platform is used.', icon: BarChart3 },
  { value: 'users', label: 'People', description: 'Every account on the platform.', icon: Users },
  { value: 'workspaces', label: 'Workspaces', description: 'Every workspace and who is in it.', icon: Building2 },
  { value: 'emails', label: 'Email templates', description: 'The emails the platform sends: edit the wording and variables.', icon: Mail },
  { value: 'audit', label: 'Audit log', description: 'A record of what platform admins change.', icon: ScrollText },
];

/**
 * The platform admin console: its own sidebar and header, separate from the app that everyone else uses (no
 * projects, no workspace switcher). Only super admins are sent here.
 */
export function AdminLayout({ tab, onTab, children }: { tab: AdminTab; onTab: (tab: AdminTab) => void; children: ReactNode }): JSX.Element {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const current = ADMIN_TABS.find((t) => t.value === tab) ?? ADMIN_TABS[0];

  useEffect(() => setOpen(false), [tab]);

  const nav = (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200">
          <ShieldCheck size={17} />
        </span>
        <div className="min-w-0 leading-tight">
          <div className="text-[14px] font-semibold tracking-tight text-slate-900">Pristine</div>
          <div className="text-[11px] font-medium text-slate-500">Platform admin</div>
        </div>
      </div>
      <nav aria-label="Platform admin" className="grid flex-1 content-start gap-0.5 px-3 py-3">
        {ADMIN_TABS.map(({ value, label, icon: Icon }) => (
          <button
            aria-current={value === tab ? 'page' : undefined}
            className={cn(
              'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600/40',
              value === tab ? 'bg-slate-200 text-slate-900' : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
            )}
            data-testid={`admin-nav-${value}`}
            key={value}
            onClick={() => onTab(value)}
            type="button"
          >
            <Icon className="shrink-0" size={16} strokeWidth={1.9} />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </nav>
      <div className="grid gap-1 border-t border-slate-200 p-3">
        <Link className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-200/60 hover:text-slate-900" data-testid="admin-back-to-app" to="/dashboard">
          <ArrowLeft size={16} /> Back to the app
        </Link>
        <div className="flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5">
          <span className="min-w-0 truncate text-[12px] text-slate-500" title={user?.email}>
            {user?.email}
          </span>
          <button aria-label="Sign out" className="rounded p-1 text-slate-500 hover:bg-slate-200/60 hover:text-slate-900" onClick={logout} title="Sign out" type="button">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full bg-slate-50" data-testid="admin-page">
      <aside className="hidden w-[232px] shrink-0 flex-col border-r border-slate-200 bg-slate-100 lg:flex" data-testid="admin-sidebar">
        {nav}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close the menu" className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)} type="button" />
          <aside className="relative flex h-full w-64 flex-col border-r border-slate-200 bg-slate-100 shadow-2xl">
            <button aria-label="Close the menu" className="absolute right-2 top-3 rounded p-1.5 text-slate-500 hover:bg-slate-200/60" onClick={() => setOpen(false)} type="button">
              <X size={16} />
            </button>
            {nav}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 sm:px-5 lg:px-6">
          <button aria-label="Open the menu" className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} type="button">
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="m-0 truncate text-[16px] font-semibold tracking-tight text-slate-900">{current.label}</h1>
            <p className="m-0 hidden truncate text-[12px] text-slate-500 sm:block">{current.description}</p>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 lg:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
