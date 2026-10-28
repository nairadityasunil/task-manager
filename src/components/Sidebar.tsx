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
  ShieldHalf,
  Bot,
  type LucideIcon,
} from 'lucide-react';
import { avatarColor, cn, type Area } from '@/components/ui';

/** Icon colour on hover, one per product area (literal classes so Tailwind sees them). */
const AREA_HOVER: Record<Area, string> = {
  projects: 'group-hover:text-sky-600',
  tasks: 'group-hover:text-emerald-600',
  ai: 'group-hover:text-violet-600',
  prompts: 'group-hover:text-indigo-600',
  engagement: 'group-hover:text-amber-600',
  events: 'group-hover:text-rose-600',
  integrations: 'group-hover:text-teal-600',
  docs: 'group-hover:text-orange-600',
  settings: 'group-hover:text-slate-700'
};
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
  | 'sdk-integration-detail'
  | 'agents';

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
  /** Product area; tints the icon on hover. */
  area?: Area;
}

/** One 32px navigation row with a pill for the active page. */
function NavItem({ icon: Icon, label, isActive = false, onClick, tone = 'default', area }: NavItemProps): JSX.Element {
  return (
    <button
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-medium outline-none transition-colors duration-150',
        'focus-visible:ring-2 focus-visible:ring-emerald-500/40',
        isActive
          ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200'
          : tone === 'muted'
          ? 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-900'
          : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
      )}
      onClick={onClick}
      type="button"
    >
      {isActive ? <span aria-hidden className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-emerald-500" /> : null}
      <Icon
        className={cn('shrink-0 transition-colors duration-150', isActive ? 'text-emerald-600' : cn('text-slate-400', area ? AREA_HOVER[area] : 'group-hover:text-slate-700'))}
        size={16}
        strokeWidth={1.9}
      />
      <span className="truncate">{label}</span>
    </button>
  );
}

function NavGroup({ label, children }: { label?: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="grid gap-px">
      {label ? <div className="px-2.5 pb-1 text-xs font-medium text-slate-400">{label}</div> : null}
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
        <div aria-hidden className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-[1px] lg:hidden" onClick={onMobileClose} />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[61] flex h-full w-[264px] select-none flex-col border-r border-slate-200 bg-slate-50 transition-transform duration-200',
          'lg:static lg:z-auto lg:w-[232px] lg:shrink-0 lg:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        )}
        // Choosing any item closes the drawer on small screens.
        onClickCapture={(event) => {
          if ((event.target as HTMLElement).closest('button')) onMobileClose?.();
        }}
      >
        {/* Brand */}
        <div className="flex h-12 shrink-0 items-center gap-2.5 px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200">
            <img src={logoImg} alt="Pristine" className="h-full w-full object-contain" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-slate-900">Pristine</span>
        </div>

        {/* Navigation */}
        <nav aria-label="Main" className="scrollbar-thin flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4 pt-2">
          {activeIntegrationId ? (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
                <div className="text-xs font-medium text-slate-500">Integration</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-600 ring-1 ring-inset ring-teal-100">
                    <Plug size={13} />
                  </span>
                  <span className="truncate text-[13px] font-medium text-slate-900">{activeIntegrationName || 'Loading…'}</span>
                </div>
              </div>

              <NavGroup label="Workspace">
                <NavItem area="settings" icon={Settings} isActive={activeTab === 'overview'} label="Overview" onClick={() => onViewChange('sdk-integration-detail', 'overview')} />
                <NavItem area="engagement" icon={BookOpen} isActive={activeTab === 'guides'} label="Guides" onClick={() => onViewChange('sdk-integration-detail', 'guides')} />
                <NavItem area="ai" icon={Target} isActive={activeTab === 'surveys'} label="Surveys" onClick={() => onViewChange('sdk-integration-detail', 'surveys')} />
                <NavItem area="events" icon={Activity} isActive={activeTab === 'events'} label="Events" onClick={() => onViewChange('sdk-integration-detail', 'events')} />
                <NavItem area="events" icon={Bot} isActive={activeTab === 'ai-traffic'} label="AI traffic" onClick={() => onViewChange('sdk-integration-detail', 'ai-traffic')} />
              </NavGroup>

              <NavGroup>
                <NavItem icon={ArrowLeft} label="Exit Workspace" onClick={() => onViewChange('sdk-integrations')} tone="muted" />
              </NavGroup>
            </>
          ) : (
            <>
              <NavGroup label="Workspace">
                <NavItem
                  area="projects"
                  icon={Folder}
                  isActive={selectedProjectView === allProjectsValue && activeView === 'dashboard'}
                  label="All Projects"
                  onClick={() => onProjectSelect(allProjectsValue)}
                />
                <NavItem area="tasks" icon={Plus} label="New Project" onClick={onNewProject} tone="muted" />
              </NavGroup>

              <NavGroup label="AI">
                <NavItem area="ai" icon={BrainCircuit} isActive={activeView === 'semantic-intelligence'} label="Intelligence" onClick={() => onViewChange('semantic-intelligence')} />
                <NavItem area="prompts" icon={Sparkles} isActive={activeView === 'prompts'} label="Prompt Library" onClick={() => onViewChange('prompts')} />
                <NavItem area="prompts" icon={Play} isActive={activeView === 'playground'} label="Prompt Playground" onClick={() => onViewChange('playground')} />
                <NavItem area="ai" icon={ShieldHalf} isActive={activeView === 'agents'} label="Agent Governance" onClick={() => onViewChange('agents')} />
              </NavGroup>

              <NavGroup label="Product">
                <NavItem area="integrations" icon={Plug} isActive={activeView === 'sdk-integrations'} label="SDK Integrations" onClick={() => onViewChange('sdk-integrations')} />
              </NavGroup>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="grid gap-px px-3 pb-2">
          <NavItem area="docs" icon={BookOpen} isActive={activeView === 'sdk-docs'} label="SDK Docs" onClick={() => onViewChange('sdk-docs')} />
          <NavItem area="settings" icon={Settings} isActive={activeView === 'settings'} label="Settings" onClick={() => onViewChange('settings')} />
        </div>

        <div className="mx-3 mb-2 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          {user ? (
            <>
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold', avatarColor(user.email || user.name))}>
                {initials}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-[13px] font-medium text-slate-900">{displayName}</div>
                {user.name ? <div className="truncate text-xs text-slate-500">{user.email}</div> : null}
              </div>
            </>
          ) : (
            <div className="flex-1" />
          )}
          <button
            aria-label="Sign out"
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
            onClick={onLogout}
            title="Sign out"
            type="button"
          >
            <LogOut size={15} strokeWidth={1.9} />
            <span className={user ? 'sr-only' : ''}>Sign out</span>
          </button>
        </div>
        <div className="px-4 pb-2.5 text-[11px] text-slate-400" title={`Built ${__APP_BUILT_AT__}`}>
          Version {__APP_COMMIT__}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
