import React from 'react';
import {
  Folder,
  Plus,
  Settings,
  Activity,
  BrainCircuit,
  LogOut,
  BookOpen,
  Target,
  Plug,
  Sparkles,
  Play,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/components/ui';
import logoImg from '@/assets/logo.png';

export type SidebarView =
  | 'dashboard'
  | 'settings'
  | 'event-tracking'
  | 'semantic-intelligence'
  | 'prompts'
  | 'playground'
  | 'sdk-docs'
  | 'engagement'
  | 'sdk-integrations'
  | 'sdk-integration-detail';

interface SidebarProps {
  activeView: SidebarView;
  selectedProjectView: string;
  allProjectsValue: string;
  onProjectSelect: (projectId: string) => void;
  onViewChange: (view: SidebarView, tab?: string) => void;
  onNewProject: () => void;
  onPlanWithAi?: () => void;
  onPlanMyDay?: () => void;
  onLogout: () => void;
  activeIntegrationId?: string;
  activeIntegrationName?: string;
  activeTab?: string;
  /** Below the lg breakpoint the sidebar is a drawer; these control it. */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  /** Shown in the account area at the bottom. */
  user?: { name: string | null; email: string } | null;
}

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  tone?: 'default' | 'muted';
}

/** One 36px navigation row. */
function NavItem({ icon: Icon, label, isActive = false, onClick, tone = 'default' }: NavItemProps): JSX.Element {
  return (
    <button
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-medium outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-emerald-400/50',
        isActive
          ? 'bg-white/[0.08] text-white'
          : tone === 'muted'
          ? 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
          : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
      )}
      onClick={onClick}
      type="button"
    >
      <Icon
        className={cn('shrink-0', isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300')}
        size={16}
        strokeWidth={1.9}
      />
      <span className="truncate">{label}</span>
    </button>
  );
}

function NavGroup({ label, children }: { label?: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="grid gap-0.5">
      {label ? <div className="px-2.5 pb-1 pt-1 text-xs font-medium text-slate-500">{label}</div> : null}
      {children}
    </div>
  );
}

const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  selectedProjectView,
  allProjectsValue,
  onProjectSelect,
  onViewChange,
  onNewProject,
  onLogout,
  activeIntegrationId,
  activeIntegrationName,
  activeTab,
  mobileOpen = false,
  onMobileClose,
  user,
}) => {
  const displayName = user?.name || user?.email || '';
  const initials = (user?.name || user?.email || 'U')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      {mobileOpen && (
        <div aria-hidden className="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-[1px] lg:hidden" onClick={onMobileClose} />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[61] flex h-full w-[264px] select-none flex-col border-r border-white/[0.06] bg-slate-900 transition-transform duration-200',
          'lg:static lg:z-auto lg:w-[240px] lg:shrink-0 lg:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        )}
        // Choosing any item closes the drawer on small screens.
        onClickCapture={(event) => {
          if ((event.target as HTMLElement).closest('button')) onMobileClose?.();
        }}
      >
        {/* Brand */}
        <div className="flex h-[52px] shrink-0 items-center gap-2.5 border-b border-white/[0.06] px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white p-1">
            <img src={logoImg} alt="Pristine" className="h-full w-full object-contain" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-white">Pristine</span>
        </div>

        {/* Navigation */}
        <nav aria-label="Main" className="scrollbar-thin flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
          {activeIntegrationId ? (
            <>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
                <div className="text-xs font-medium text-slate-500">Integration</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
                    <Plug size={13} />
                  </span>
                  <span className="truncate text-[13px] font-medium text-white">{activeIntegrationName || 'Loading…'}</span>
                </div>
              </div>

              <NavGroup label="Workspace">
                <NavItem icon={Settings} isActive={activeTab === 'overview'} label="Overview" onClick={() => onViewChange('sdk-integration-detail', 'overview')} />
                <NavItem icon={BookOpen} isActive={activeTab === 'guides'} label="Guides" onClick={() => onViewChange('sdk-integration-detail', 'guides')} />
                <NavItem icon={Target} isActive={activeTab === 'surveys'} label="Surveys" onClick={() => onViewChange('sdk-integration-detail', 'surveys')} />
                <NavItem icon={Activity} isActive={activeTab === 'events'} label="Events" onClick={() => onViewChange('sdk-integration-detail', 'events')} />
              </NavGroup>

              <NavGroup>
                <NavItem icon={ArrowLeft} label="Exit Workspace" onClick={() => onViewChange('sdk-integrations')} tone="muted" />
              </NavGroup>
            </>
          ) : (
            <>
              <NavGroup label="Workspace">
                <NavItem
                  icon={Folder}
                  isActive={selectedProjectView === allProjectsValue && activeView === 'dashboard'}
                  label="All Projects"
                  onClick={() => onProjectSelect(allProjectsValue)}
                />
                <NavItem icon={Plus} label="New Project" onClick={onNewProject} tone="muted" />
              </NavGroup>

              <NavGroup label="AI">
                <NavItem icon={BrainCircuit} isActive={activeView === 'semantic-intelligence'} label="Intelligence" onClick={() => onViewChange('semantic-intelligence')} />
                <NavItem icon={Sparkles} isActive={activeView === 'prompts'} label="Prompt Library" onClick={() => onViewChange('prompts')} />
                <NavItem icon={Play} isActive={activeView === 'playground'} label="Prompt Playground" onClick={() => onViewChange('playground')} />
              </NavGroup>

              <NavGroup label="Product">
                <NavItem icon={Plug} isActive={activeView === 'sdk-integrations'} label="SDK Integrations" onClick={() => onViewChange('sdk-integrations')} />
              </NavGroup>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="grid gap-0.5 border-t border-white/[0.06] px-3 py-3">
          <NavItem icon={BookOpen} isActive={activeView === 'sdk-docs'} label="SDK Docs" onClick={() => onViewChange('sdk-docs')} />
          <NavItem icon={Settings} isActive={activeView === 'settings'} label="Settings" onClick={() => onViewChange('settings')} />
        </div>

        <div className="flex items-center gap-2.5 border-t border-white/[0.06] px-3 py-3">
          {user ? (
            <>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[11px] font-semibold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-[13px] font-medium text-white">{displayName}</div>
                {user.name ? <div className="truncate text-xs text-slate-500">{user.email}</div> : null}
              </div>
            </>
          ) : (
            <div className="flex-1" />
          )}
          <button
            aria-label="Sign out"
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-red-300"
            onClick={onLogout}
            title="Sign out"
            type="button"
          >
            <LogOut size={15} strokeWidth={1.9} />
            <span className={user ? 'sr-only' : ''}>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
