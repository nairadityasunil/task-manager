import React, { createContext, useContext, useEffect, useState } from 'react';
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
  Home,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react';
import { avatarColor, cn, tagColor, type Area } from '@/components/ui';

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
  /** Projects listed under "Projects" (the first few). */
  projects?: Array<{ id: string; name: string }>;
  /** Opens the command palette. */
  onOpenSearch?: () => void;
}

const MAX_SIDEBAR_PROJECTS = 8;
const COLLAPSE_KEY = 'pristine.sidebar.collapsed';

/** True while the desktop sidebar is collapsed to an icon rail (the phone drawer is always full width). */
const CollapsedContext = createContext(false);

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  tone?: 'default' | 'muted';
  /** Product area (kept for callers; icons stay neutral). */
  area?: Area;
}

/** One 32px navigation row with a pill for the active page. */
function NavItem({ icon: Icon, label, isActive = false, onClick, tone = 'default' }: NavItemProps): JSX.Element {
  const collapsed = useContext(CollapsedContext);
  return (
    <button
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        'group relative flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] font-medium outline-none transition-colors duration-150',
        collapsed && 'lg:justify-center lg:px-0',
        'focus-visible:ring-2 focus-visible:ring-brand-600/40',
        isActive
          ? 'bg-slate-200 text-slate-900'
          : tone === 'muted'
          ? 'text-slate-600 font-normal hover:bg-slate-200/60 hover:text-slate-900'
          : 'text-slate-700 font-normal hover:bg-slate-200/60 hover:text-slate-900'
      )}
      onClick={onClick}
      type="button"
    >
      <Icon
        className={cn('shrink-0 transition-colors duration-150', isActive ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700')}
        size={16}
        strokeWidth={1.9}
      />
      <span className={cn('truncate', collapsed && 'lg:sr-only')}>{label}</span>
    </button>
  );
}

function NavGroup({ label, children }: { label?: string; children: React.ReactNode }): JSX.Element {
  const collapsed = useContext(CollapsedContext);
  return (
    <div className="grid gap-px">
      {label ? <div className={cn('px-2.5 pb-1 text-[11px] font-medium text-slate-500', collapsed && 'lg:hidden')}>{label}</div> : null}
      {label && collapsed ? <div aria-hidden className="mx-2 mb-1 hidden h-px bg-slate-200 lg:block" /> : null}
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
  projects = [],
  onOpenSearch,
}) => {
  const displayName = user?.name || user?.email || '';
  const initials = (user?.name || user?.email || 'U')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggleCollapsed = () =>
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? '0' : '1');
      } catch {
        /* storage unavailable: remembered for this visit only */
      }
      return !value;
    });
  // Ctrl+\ or Cmd+\ toggles the sidebar.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === '\\') {
        event.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <CollapsedContext.Provider value={collapsed}>
      {mobileOpen && (
        <div aria-hidden className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-[1px] lg:hidden" onClick={onMobileClose} />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[61] flex h-full w-[264px] select-none flex-col border-r border-slate-200 bg-slate-100 transition-transform duration-200',
          'lg:static lg:z-auto lg:shrink-0 lg:translate-x-0 lg:transition-[width]',
          collapsed ? 'lg:w-[56px]' : 'lg:w-[232px]',
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        )}
        data-collapsed={collapsed || undefined}
        data-testid="sidebar"
        data-tip-side="right"
        // Choosing any item closes the drawer on small screens.
        onClickCapture={(event) => {
          if ((event.target as HTMLElement).closest('button')) onMobileClose?.();
        }}
      >
        {/* Brand */}
        <div className={cn('flex h-12 shrink-0 items-center gap-2 px-4', collapsed && 'lg:justify-center lg:px-0')}>
          <div className={cn('flex h-6 w-6 items-center justify-center rounded-md bg-white p-0.5 ring-1 ring-slate-200', collapsed && 'lg:hidden')}>
            <img src={logoImg} alt="Pristine" className="h-full w-full object-contain" />
          </div>
          <span className={cn('text-[14px] font-semibold tracking-tight text-slate-900', collapsed && 'lg:hidden')}>Pristine</span>
          <button
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'hidden h-7 w-7 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900 lg:grid',
              !collapsed && 'ml-auto -mr-1.5'
            )}
            data-testid="sidebar-toggle"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar (Ctrl+\\)' : 'Collapse sidebar (Ctrl+\\)'}
            type="button"
          >
            {collapsed ? <PanelLeftOpen size={16} strokeWidth={1.9} /> : <PanelLeftClose size={16} strokeWidth={1.9} />}
          </button>
        </div>
        {onOpenSearch ? (
          <div className={cn('px-3 pb-1', collapsed && 'lg:px-2')}>
            <button
              className={cn(
                'flex h-8 w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-left text-[13px] text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40',
                collapsed && 'lg:justify-center lg:px-0'
              )}
              data-testid="open-search"
              onClick={onOpenSearch}
              title={collapsed ? 'Search (⌘K)' : undefined}
              type="button"
            >
              <Search className="shrink-0" size={14} strokeWidth={2} />
              <span className={cn(collapsed && 'lg:sr-only')}>Search</span>
              <kbd className={cn('ml-auto font-mono text-[11px] text-slate-500', collapsed && 'lg:hidden')}>⌘K</kbd>
            </button>
          </div>
        ) : null}

        {/* Navigation */}
        <nav aria-label="Main" className={cn('scrollbar-thin flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4 pt-2', collapsed && 'lg:px-2')}>
          {activeIntegrationId ? (
            <>
              <div className={cn('rounded-lg border border-slate-200 bg-white p-2.5', collapsed && 'lg:hidden')}>
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
              <NavGroup>
                <NavItem
                  area="projects"
                  icon={Home}
                  isActive={selectedProjectView === allProjectsValue && activeView === 'dashboard'}
                  label="Home"
                  onClick={() => onProjectSelect(allProjectsValue)}
                />
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

              <NavGroup label="Projects">
                {projects.slice(0, MAX_SIDEBAR_PROJECTS).map((project) => {
                  const isActive = activeView === 'dashboard' && selectedProjectView === project.id;
                  return (
                    <button
                      aria-current={isActive ? 'page' : undefined}
                      title={collapsed ? project.name : undefined}
                      className={cn(
                        'flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-600/40',
                        collapsed && 'lg:justify-center lg:px-0',
                        isActive ? 'bg-slate-200 font-medium text-slate-900' : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
                      )}
                      key={project.id}
                      onClick={() => onProjectSelect(project.id)}
                      type="button"
                    >
                      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: tagColor(project.id) }} />
                      <span className={cn('truncate', collapsed && 'lg:sr-only')}>{project.name}</span>
                    </button>
                  );
                })}
                {projects.length > MAX_SIDEBAR_PROJECTS ? (
                  <NavItem icon={Folder} label={`All ${projects.length} projects`} onClick={() => onProjectSelect(allProjectsValue)} tone="muted" />
                ) : null}
                <NavItem area="tasks" icon={Plus} label="New Project" onClick={onNewProject} tone="muted" />
              </NavGroup>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className={cn('grid gap-px px-3 pb-2', collapsed && 'lg:px-2')}>
          <NavItem area="docs" icon={BookOpen} isActive={activeView === 'sdk-docs'} label="SDK Docs" onClick={() => onViewChange('sdk-docs')} />
          <NavItem area="settings" icon={Settings} isActive={activeView === 'settings'} label="Settings" onClick={() => onViewChange('settings')} />
        </div>

        <div className={cn('mx-3 mb-1 flex items-center gap-2.5 border-t border-slate-200 px-1 pt-2.5 pb-1', collapsed && 'lg:mx-2 lg:flex-col lg:px-0')}>
          {user ? (
            <>
              <div
                className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold', avatarColor(user.email || user.name))}
                title={collapsed ? displayName : undefined}
              >
                {initials}
              </div>
              <div className={cn('min-w-0 flex-1 leading-tight', collapsed && 'lg:hidden')}>
                <div className="truncate text-[13px] font-medium text-slate-900">{displayName}</div>
                {user.name ? <div className="truncate text-xs text-slate-500">{user.email}</div> : null}
              </div>
            </>
          ) : (
            <div className="flex-1" />
          )}
          <button
            aria-label="Sign out"
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700"
            onClick={onLogout}
            title="Sign out"
            type="button"
          >
            <LogOut size={15} strokeWidth={1.9} />
            <span className={user ? 'sr-only' : ''}>Sign out</span>
          </button>
        </div>
        <div className={cn('px-4 pb-2.5 text-[11px] text-slate-400', collapsed && 'lg:hidden')} title={`Built ${__APP_BUILT_AT__}`}>
          Version {__APP_COMMIT__}
        </div>
      </aside>
    </CollapsedContext.Provider>
  );
};

export default Sidebar;
