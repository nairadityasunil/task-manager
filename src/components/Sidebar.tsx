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
} from 'lucide-react';
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
}) => {
  // Dark slate palette tokens
  const BG_GRADIENT = '#0f172a';
  const BORDER      = 'rgba(148,163,184,0.14)';
  const ACTIVE_BG   = 'rgba(255,255,255,0.08)';
  const TEXT_DIM    = 'rgba(148,163,184,0.75)';

  const NavBtn = ({
    isActive,
    onClick,
    children
  }: {
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group relative flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg text-[13px] transition-all duration-200 justify-start overflow-hidden outline-none ${
          isActive
            ? 'font-medium text-[#ffffff]'
            : 'text-white/70 hover:text-white'
        }`}
        style={{
          background: isActive ? ACTIVE_BG : 'transparent',
          border: isActive ? '1px solid transparent' : '1px solid transparent',
        }}
      >
        {/* Left active indicator line */}
        {isActive && (
          <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r bg-[#34d399]" />
        )}
        
        {/* Hover overlay backdrop */}
        {!isActive && (
          <div className="absolute inset-0 bg-transparent group-hover:bg-white/[0.05] transition-all duration-200" />
        )}

        <span className="relative z-10 flex items-center gap-3 w-full">
          {children}
        </span>
      </button>
    );
  };

  return (
    <>
    {mobileOpen && (
      <div aria-hidden className="fixed inset-0 z-[60] bg-slate-950/50 lg:hidden" onClick={onMobileClose} />
    )}
    <aside
      className={`fixed inset-y-0 left-0 z-[61] flex flex-col w-[260px] h-full select-none transition-transform duration-200 lg:static lg:z-auto lg:w-[230px] lg:shrink-0 lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
      }`}
      // Choosing any item closes the drawer on small screens.
      onClickCapture={(event) => {
        if ((event.target as HTMLElement).closest('button')) onMobileClose?.();
      }}
      style={{ background: BG_GRADIENT, borderRight: `1px solid ${BORDER}` }}
    >
      {/* Brand logo header */}
      <div
        className="flex items-center gap-3 px-5 h-[56px] shrink-0"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="w-7 h-7 p-1 rounded-md bg-white flex items-center justify-center">
          <img src={logoImg} alt="Pristine" className="w-full h-full object-contain" />
        </div>
        <span
          className="tracking-tight"
          style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 600 }}
        >
          Pristine
        </span>
      </div>

      {/* Nav Link Lists */}
      <div className="flex flex-col flex-1 overflow-y-auto p-4 gap-1.5 scrollbar-thin">
        {activeIntegrationId ? (
          <>
            {/* Active Integration Status Widget */}
            <div
              className="mb-4 p-3 rounded-lg border flex flex-col gap-1.5 relative overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderColor: BORDER,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: TEXT_DIM }}>
                  Integration
                </span>

              </div>
              <span className="text-[13px] font-medium flex items-center gap-2 truncate text-white/90">
                <Plug size={13} className="text-[#34d399] shrink-0" />
                {activeIntegrationName || 'Loading…'}
              </span>
            </div>

            <span className="text-[11px] font-semibold uppercase tracking-wide px-2 pb-1 block" style={{ color: TEXT_DIM }}>
              Workspace
            </span>
            <NavBtn isActive={activeTab === 'overview'} onClick={() => onViewChange('sdk-integration-detail', 'overview')}>
              <Settings size={14} className={activeTab === 'overview' ? 'text-[#ffffff]' : 'text-white/50 group-hover:text-white/80'} strokeWidth={1.8} />
              Overview
            </NavBtn>
            <NavBtn isActive={activeTab === 'guides'} onClick={() => onViewChange('sdk-integration-detail', 'guides')}>
              <BookOpen size={14} className={activeTab === 'guides' ? 'text-[#ffffff]' : 'text-white/50 group-hover:text-white/80'} strokeWidth={1.8} />
              Guides
            </NavBtn>
            <NavBtn isActive={activeTab === 'surveys'} onClick={() => onViewChange('sdk-integration-detail', 'surveys')}>
              <Target size={14} className={activeTab === 'surveys' ? 'text-[#ffffff]' : 'text-white/50 group-hover:text-white/80'} strokeWidth={1.8} />
              Surveys
            </NavBtn>
            <NavBtn isActive={activeTab === 'events'} onClick={() => onViewChange('sdk-integration-detail', 'events')}>
              <Activity size={14} className={activeTab === 'events' ? 'text-[#ffffff]' : 'text-white/50 group-hover:text-white/80'} strokeWidth={1.8} />
              Events
            </NavBtn>

            <div className="h-px my-2" style={{ background: BORDER }} />

            <button
              type="button"
              className="group relative flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg text-[13px] transition-all duration-200 text-white/70 hover:text-[#d47070] overflow-hidden"
              onClick={() => onViewChange('sdk-integrations')}
            >
              <div className="absolute inset-0 bg-transparent group-hover:bg-[rgba(220,80,80,0.04)] transition-all duration-200" />
              <Plug size={14} strokeWidth={1.8} className="rotate-180 text-white/50 group-hover:text-[#d47070] relative z-10" />
              <span className="relative z-10 transition-transform duration-200 group-hover:translate-x-0.5">Exit Workspace</span>
            </button>
          </>
        ) : (
          <>
            <span className="text-[11px] font-semibold uppercase tracking-wide px-2 pb-1 block" style={{ color: TEXT_DIM }}>
              Navigate
            </span>
            <NavBtn isActive={selectedProjectView === allProjectsValue && activeView === 'dashboard'} onClick={() => onProjectSelect(allProjectsValue)}>
              <Folder size={14} className={selectedProjectView === allProjectsValue && activeView === 'dashboard' ? 'text-[#ffffff]' : 'text-white/50 group-hover:text-white/80'} strokeWidth={1.8} />
              All Projects
            </NavBtn>
            <NavBtn isActive={activeView === 'semantic-intelligence'} onClick={() => onViewChange('semantic-intelligence')}>
              <BrainCircuit size={14} className={activeView === 'semantic-intelligence' ? 'text-[#ffffff]' : 'text-white/50 group-hover:text-white/80'} strokeWidth={1.8} />
              Intelligence
            </NavBtn>
            <NavBtn isActive={activeView === 'prompts'} onClick={() => onViewChange('prompts')}>
              <Sparkles size={14} className={activeView === 'prompts' ? 'text-[#ffffff]' : 'text-white/50 group-hover:text-white/80'} strokeWidth={1.8} />
              Prompt Library
            </NavBtn>
            <NavBtn isActive={activeView === 'playground'} onClick={() => onViewChange('playground')}>
              <Play size={14} className={activeView === 'playground' ? 'text-[#ffffff]' : 'text-white/50 group-hover:text-white/80'} strokeWidth={1.8} />
              Prompt Playground
            </NavBtn>
            <NavBtn isActive={activeView === 'sdk-integrations'} onClick={() => onViewChange('sdk-integrations')}>
              <Plug size={14} className={activeView === 'sdk-integrations' ? 'text-[#ffffff]' : 'text-white/50 group-hover:text-white/80'} strokeWidth={1.8} />
              SDK Integrations
            </NavBtn>

            <div className="h-px my-2" style={{ background: BORDER }} />

            <button
              type="button"
              className="group relative flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg text-[13px] transition-all duration-200 text-white/70 hover:text-white overflow-hidden"
              onClick={onNewProject}
            >
              <div className="absolute inset-0 bg-transparent group-hover:bg-white/[0.05] transition-all duration-200" />
              <Plus size={14} strokeWidth={1.8} className="text-white/50 group-hover:text-white relative z-10" />
              <span className="relative z-10 transition-transform duration-200 group-hover:translate-x-0.5">New Project</span>
            </button>
          </>
        )}
      </div>

      {/* Footer Area */}
      <div className="p-4 flex flex-col gap-1" style={{ borderTop: `1px solid ${BORDER}` }}>
        <NavBtn isActive={activeView === 'sdk-docs'} onClick={() => onViewChange('sdk-docs')}>
          <BookOpen size={14} className={activeView === 'sdk-docs' ? 'text-[#ffffff]' : 'text-white/50 group-hover:text-white/80'} strokeWidth={1.8} />
          SDK Docs
        </NavBtn>
        <NavBtn isActive={activeView === 'settings'} onClick={() => onViewChange('settings')}>
          <Settings size={14} className={activeView === 'settings' ? 'text-[#ffffff]' : 'text-white/50 group-hover:text-white/80'} strokeWidth={1.8} />
          Settings
        </NavBtn>
        <button
          type="button"
          className="group relative flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg text-[13px] transition-all duration-200 mt-1 text-white/50 hover:text-[#e57373] overflow-hidden"
          onClick={onLogout}
        >
          <div className="absolute inset-0 bg-transparent group-hover:bg-[rgba(229,115,115,0.06)] transition-all duration-200" />
          <LogOut size={14} strokeWidth={1.8} className="text-white/40 group-hover:text-[#e57373] relative z-10" />
          <span className="relative z-10 transition-transform duration-200 group-hover:translate-x-0.5">Sign out</span>
        </button>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
