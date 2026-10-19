import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AddTaskForm from '@/components/AddTaskForm';
import { WorkspaceSwitcher } from '@/features/workspaces';
import EditTaskForm from '@/components/EditTaskForm';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import EpicForm from '@/components/EpicForm';
import NoteModal from '@/components/NoteModal';
import ProjectForm from '@/components/ProjectForm';
import ProjectNotes from '@/components/ProjectNotes';
import ProjectPanel from '@/components/ProjectPanel';
import ProjectTeamPanel from '@/components/ProjectTeamPanel';
import SettingsPanel from '@/components/SettingsPanel';
import SubtaskForm from '@/components/SubtaskForm';
import ChatPanel from '@/components/ChatPanel';
import { ActivityHistoryPanel } from '@/features/projects';
import { AiProjectPlanModal, ProjectWorkflowStatesPanel } from '@/features/projects';
import SdkDocsPanel from '@/components/SdkDocsPanel';
import EventTrackingPage from '@/pages/EventTrackingPage';
import SemanticIntelligencePage from '@/pages/SemanticIntelligencePage';
import EngagementPage from '@/pages/EngagementPage';
import SdkIntegrationsPage from '@/pages/SdkIntegrationsPage';
import SdkIntegrationDetailPage from '@/pages/SdkIntegrationDetailPage';
import PromptLibraryPage from '@/pages/PromptLibraryPage';
import PromptPlaygroundPage from '@/pages/PromptPlaygroundPage';
import Sidebar, { SidebarView } from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import type { TaskWorkflowStatus } from '@/types/task';
import InvitationNotificationPanel from '@/components/InvitationNotificationPanel';
import TaskList from '@/components/TaskList';
import KanbanBoard from '@/components/KanbanBoard';
import TaskFilterBar from '@/components/TaskFilterBar';
import AssigneeSelector from '@/components/AssigneeSelector';
import SlaDashboard from '@/components/SlaDashboard';
import { TaskInspector } from '@/features/tasks';
import {
  Calendar,
  ChevronDown,
  Edit3,
  FileText,
  Folder,
  Layout,
  List,
  MessageCircle,
  MessageSquare,
  Plus,
  Users,
  Trash2,
  History,
  RefreshCw,
  Calculator,
  Zap,
  Bot,
  MoreHorizontal,
  Workflow,
  type LucideIcon
} from 'lucide-react';
import { Note } from '@/types/note';
import { useDashboard, ALL_PROJECTS_VALUE } from '@/features/dashboard';

const headerButtonCls =
  'flex items-center gap-2 h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-colors whitespace-nowrap';

interface MoreMenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
}

function ProjectMoreMenu({ items }: { items: MoreMenuItem[] }): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className={headerButtonCls}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <MoreHorizontal size={15} />
        More
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-40 mt-1.5 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          role="menu"
        >
          {items.map(({ label, icon: Icon, onSelect, disabled }) => (
            <button
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
              disabled={disabled}
              key={label}
              onClick={() => {
                setOpen(false);
                onSelect();
              }}
              role="menuitem"
              type="button"
            >
              <Icon className="text-slate-400" size={15} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const { tab } = useParams();
  const dash = useDashboard();
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const statusPillCls: Record<string, string> = {
    planned: 'bg-slate-50 text-slate-600 border-slate-200',
    active: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    archived: 'bg-slate-100 text-slate-500 border-slate-200',
    TODO: 'bg-slate-50 text-slate-600 border-slate-200',
    IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
    DONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    BLOCKED: 'bg-red-50 text-red-700 border-red-200',
  };
  const epicStatusLabel = (status: string): string => {
    const words = status.toLowerCase().replace(/_/g, ' ');
    return status === 'TODO' ? 'To do' : words.charAt(0).toUpperCase() + words.slice(1);
  };

  const allMutationMessages = [
    dash.taskMutationError,
    dash.taskMutationSuccess,
    dash.projectMutationError,
    dash.projectMutationSuccess,
    dash.epicMutationError,
    dash.epicMutationSuccess,
    dash.noteMutationError,
    dash.noteMutationSuccess,
    dash.error
  ].filter(Boolean);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 text-slate-900 transition-colors duration-250">
      {/* Toast Notification */}
      {allMutationMessages.length > 0 && (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
          {allMutationMessages.map((msg, i) => (
            <div
              key={i}
              className={`px-4 py-2.5 rounded-lg shadow-lg border text-sm font-medium animate-in fade-in slide-in-from-top-4 ${
                msg?.toLowerCase().includes('unable') || msg?.toLowerCase().includes('error')
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span>{msg}</span>
                <button
                  className="opacity-50 hover:opacity-100 transition-opacity"
                  onClick={() => {
                    dash.setTaskMutationError(null);
                    dash.setTaskMutationSuccess(null);
                    dash.setProjectMutationError(null);
                    dash.setProjectMutationSuccess(null);
                    dash.setEpicMutationError(null);
                    dash.setEpicMutationSuccess(null);
                    dash.setNoteMutationError(null);
                    dash.setNoteMutationSuccess(null);
                    dash.setError(null);
                  }}
                >
                  <Plus className="rotate-45" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        mobileOpen={isMobileNavOpen}
        onMobileClose={() => setIsMobileNavOpen(false)}
        activeView={dash.activeView}
        selectedProjectView={dash.selectedProjectView}
        allProjectsValue={ALL_PROJECTS_VALUE}
        onProjectSelect={dash.handleProjectSelect}
        onViewChange={(view: SidebarView, targetTab?: string) => {
          if (view === 'dashboard') navigate('/dashboard');
          else if (view === 'semantic-intelligence') navigate('/intelligence');
          else if (view === 'prompts') navigate('/prompts');
          else if (view === 'playground') navigate('/playground');
          else if (view === 'event-tracking') navigate('/event-tracking');
          else if (view === 'engagement') navigate('/engagement');
          else if (view === 'sdk-integrations') navigate('/sdk-integrations');
          else if (view === 'sdk-integration-detail') {
            if (dash.activeIntegrationName) {
              navigate(`/sdk-integrations/${dash.activeIntegrationName}/${targetTab || 'overview'}`);
            }
          } else if (view === 'sdk-docs') navigate('/sdk-docs');
          else if (view === 'settings') navigate('/settings');
        }}
        onNewProject={() => dash.setIsProjectCreateModalOpen(true)}
        onLogout={dash.logout}
        activeIntegrationId={dash.activeIntegrationName}
        activeIntegrationName={dash.activeIntegrationName}
        activeTab={tab || 'overview'}
      />

      {/* Right side wrapper */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <Topbar
          onMenuClick={() => setIsMobileNavOpen(true)}
          title={
            dash.activeView === 'settings'
              ? 'Settings'
              : dash.activeView === 'sdk-docs'
              ? 'SDK Documentation'
              : dash.activeView === 'event-tracking'
              ? 'Event Tracking'
              : dash.activeView === 'engagement'
              ? 'Engagement'
              : dash.activeView === 'prompts'
              ? 'Prompt Library'
              : dash.activeView === 'playground'
              ? 'Prompt Playground'
              : dash.activeView === 'sdk-integrations'
              ? 'SDK Integrations'
              : dash.activeView === 'sdk-integration-detail'
              ? dash.activeIntegrationName || 'Integration'
              : dash.activeView === 'semantic-intelligence'
              ? 'Semantic Intelligence'
              : dash.activeProject
              ? dash.activeProject.name
              : 'All Projects'
          }
          user={{ name: dash.user?.name || null, email: dash.user?.email || '' }}
          notifications={dash.notifications}
          isNotificationsOpen={dash.isNotificationsOpen}
          onNotificationsToggle={() => dash.setIsNotificationsOpen(!dash.isNotificationsOpen)}
          onNotificationsClose={() => dash.setIsNotificationsOpen(false)}
          onMarkAsRead={dash.handleMarkAsRead}
          onClearAll={dash.handleClearAll}
          onNotificationClick={dash.handleNotificationClick}
          breadcrumbs={
            <>
              <button
                onClick={() => dash.handleProjectSelect(ALL_PROJECTS_VALUE)}
                className="hover:text-slate-600 transition-colors"
                type="button"
              >
                Dashboard
              </button>

              <span className="text-slate-300">/</span>

              {dash.activeView === 'settings' ? (
                <span className="text-slate-800 font-medium truncate">Settings</span>
              ) : dash.activeView === 'sdk-docs' ? (
                <span className="text-slate-800 font-medium truncate">SDK Documentation</span>
              ) : dash.activeView === 'event-tracking' ? (
                <span className="text-slate-800 font-medium truncate">Event Tracking</span>
              ) : dash.activeView === 'engagement' ? (
                <span className="text-slate-800 font-medium truncate">Engagement</span>
              ) : dash.activeView === 'sdk-integrations' ? (
                <span className="text-slate-800 font-medium truncate">SDK Integrations</span>
              ) : dash.activeView === 'sdk-integration-detail' ? (
                <>
                  <button
                    onClick={() => navigate('/sdk-integrations')}
                    className="hover:text-slate-600 transition-colors"
                    type="button"
                  >
                    SDK Integrations
                  </button>
                  <span className="text-slate-300">/</span>
                  <span className="text-slate-800 font-medium truncate">Integration Detail</span>
                </>
              ) : dash.activeView === 'prompts' ? (
                <span className="text-slate-800 font-medium truncate">Prompt Library</span>
              ) : dash.activeView === 'playground' ? (
                <span className="text-slate-800 font-medium truncate">Prompt Playground</span>
              ) : dash.activeView === 'semantic-intelligence' ? (
                <span className="text-slate-800 font-medium truncate">Semantic Intelligence</span>
              ) : dash.activeProject ? (
                <>
                  <button
                    onClick={() => dash.handleProjectSelect(ALL_PROJECTS_VALUE)}
                    className="hover:text-slate-600 transition-colors"
                    type="button"
                  >
                    Projects
                  </button>
                  <span className="text-slate-300">/</span>
                  <span className="text-slate-800 font-medium truncate">{dash.activeProject.name}</span>
                  {dash.activeProjectAiEnabled ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium text-[11px] select-none ml-1.5 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      AI{dash.activeProjectAiProvider ? ` · ${dash.activeProjectAiProvider}` : ''}
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-medium text-[11px] select-none ml-1.5 whitespace-nowrap"
                      title="No AI provider is configured for this project; built-in rules are used."
                    >
                      AI off
                    </span>
                  )}
                </>
              ) : (
                <span className="text-slate-800 font-medium">All Projects</span>
              )}
            </>
          }
          rightContent={
            <div className="flex items-center gap-3">
              <WorkspaceSwitcher />
              <InvitationNotificationPanel />
            </div>
          }
        />

        {/* Main View Area */}
        <main className="flex-1 overflow-hidden">
          {dash.activeView === 'settings' ? (
            <div className="h-full overflow-y-auto">
              <div className="px-4 sm:px-8 py-5 sm:py-6 border-b border-slate-200 bg-white">
                <h3 className="text-xl font-semibold text-slate-950 m-0">Settings</h3>
                <p className="text-slate-500 m-0 text-sm mt-0.5">Account &amp; Preferences</p>
              </div>
              <div className="p-4 sm:p-8">
                <SettingsPanel
                  projects={dash.projects}
                  activeProject={dash.activeProject}
                  onAiConfigChange={(enabled, provider) => {
                    dash.setActiveProjectAiEnabled(enabled);
                    dash.setActiveProjectAiProvider(provider);
                  }}
                />
              </div>
            </div>
          ) : dash.activeView === 'event-tracking' ? (
            <div className="h-full overflow-y-auto">
              <EventTrackingPage onOpenDocs={() => navigate('/sdk-docs')} />
            </div>
          ) : dash.activeView === 'engagement' ? (
            <div className="h-full overflow-y-auto">
              <EngagementPage />
            </div>
          ) : dash.activeView === 'sdk-integrations' ? (
            <div className="h-full overflow-y-auto">
              <SdkIntegrationsPage />
            </div>
          ) : dash.activeView === 'sdk-integration-detail' ? (
            <div className="h-full overflow-y-auto">
              <SdkIntegrationDetailPage />
            </div>
          ) : dash.activeView === 'prompts' ? (
            <div className="h-full overflow-y-auto bg-slate-950">
              <PromptLibraryPage workspaceId={dash.activeWorkspaceId} />
            </div>
          ) : dash.activeView === 'playground' ? (
            <div className="h-full overflow-y-auto">
              <PromptPlaygroundPage workspaceId={dash.activeWorkspaceId} />
            </div>
          ) : dash.activeView === 'semantic-intelligence' ? (
            <div className="h-full overflow-y-auto">
              <SemanticIntelligencePage
                allProjectsValue={ALL_PROJECTS_VALUE}
                projects={dash.projects}
                selectedProjectId={dash.selectedProjectView}
              />
            </div>
          ) : dash.activeView === 'sdk-docs' ? (
            <div className="h-full overflow-y-auto">
              <div className="px-4 sm:px-8 py-5 sm:py-6 border-b border-slate-200 bg-white">
                <h3 className="text-xl font-semibold text-slate-950 m-0">SDK Documentation</h3>
                <p className="text-slate-500 m-0 text-sm mt-0.5">Integration Guide &amp; API Reference</p>
              </div>
              <div className="p-3">
                <SdkDocsPanel />
              </div>
            </div>
          ) : !dash.activeProject ? (
            <div className="h-full overflow-y-auto">
              <ProjectPanel
                actionProjectId={dash.actionProjectId}
                currentPage={dash.projectPage}
                loading={dash.loading}
                onDeleteProject={dash.handleDeleteProject}
                onDeleteProjects={dash.handleDeleteProjects}
                onOpenCreateProject={() => dash.setIsProjectCreateModalOpen(true)}
                onOpenEpicManager={(project) => {
                  dash.handleProjectSelect(project.id);
                }}
                onOpenProject={(projId) => {
                  dash.handleProjectSelect(projId ?? ALL_PROJECTS_VALUE);
                }}
                onOpenUpdateProject={(project) => {
                  dash.setEditingProject(project);
                }}
                projects={dash.projects}
                totalPages={dash.projectTotalPages}
                onPageChange={dash.handleProjectPageChange}
                onSearch={dash.handleProjectSearch}
                searchTerm={dash.projectSearchTerm}
              />
            </div>
          ) : (
            /* 3-column workspace */
            <div className="flex flex-col h-full overflow-hidden bg-white">
              <div className="shrink-0 px-3 sm:px-6 py-3 sm:py-3.5 border-b border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900 text-white shrink-0">
                      <Folder size={17} />
                    </div>
                    <div className="relative flex min-w-0 items-center">
                      <select
                        aria-label="Switch project"
                        className="appearance-none truncate bg-transparent border-none text-lg font-semibold text-slate-900 focus:outline-none focus:ring-0 cursor-pointer pr-6 m-0 p-0 tracking-tight"
                        onChange={(e) => dash.handleProjectSelect(e.target.value)}
                        value={dash.activeProject.id}
                      >
                        {dash.projects.map((project) => (
                          <option
                            className="text-slate-900 bg-white text-base font-normal"
                            key={project.id}
                            value={project.id}
                          >
                            {project.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
                        <ChevronDown className="text-slate-400" size={16} />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className={headerButtonCls}
                      onClick={() => dash.setIsProjectTeamModalOpen(true)}
                      type="button"
                    >
                      <Users size={15} />
                      Team
                    </button>
                    <button
                      aria-pressed={dash.isChatPanelOpen}
                      className={dash.isChatPanelOpen ? `${headerButtonCls} !bg-slate-100 !border-slate-300 !text-slate-900` : headerButtonCls}
                      onClick={() => dash.setIsChatPanelOpen(!dash.isChatPanelOpen)}
                      type="button"
                    >
                      <MessageCircle size={15} />
                      Chat
                    </button>
                    <ProjectMoreMenu
                      items={[
                        { label: 'Project notes', icon: MessageSquare, onSelect: () => dash.handleOpenProjectNotesPanel(dash.activeProject!) },
                        { label: 'Workflow states', icon: Workflow, onSelect: () => setIsWorkflowModalOpen(true) },
                        { label: 'Activity history', icon: History, onSelect: () => dash.setIsActivityHistoryOpen(true) },
                        {
                          label: dash.isRecalculatingPriorities ? 'Recalculating priorities…' : 'Recalculate priorities',
                          icon: Calculator,
                          disabled: dash.isRecalculatingPriorities,
                          onSelect: () => void dash.handleRecalculatePriorities()
                        },
                        { label: 'AI settings', icon: Bot, onSelect: () => dash.setActiveView('settings') },
                        { label: 'Refresh', icon: RefreshCw, onSelect: () => void dash.loadDashboard() }
                      ]}
                    />
                    <button
                      className="flex items-center gap-2 h-9 px-3.5 bg-slate-900 rounded-lg text-sm font-semibold text-white hover:bg-slate-800 shadow-sm transition-colors whitespace-nowrap"
                      onClick={() => dash.setIsAiPlanningWorkspaceOpen(true)}
                      type="button"
                    >
                      <Zap size={15} />
                      AI Planner
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-y-auto lg:overflow-hidden gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-50">
                {/* Column 1 — Epics (Sidebar) */}
                <div className={`flex flex-col shrink-0 w-full max-h-[45vh] lg:max-h-none lg:h-full rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-500 ease-in-out ${dash.isSidebarCollapsed ? 'lg:w-14' : 'lg:w-[300px]'}`}>
                  <div className={`flex items-center justify-between px-4 py-3.5 border-b border-slate-100 ${dash.isSidebarCollapsed ? 'flex-col gap-4' : ''}`}>
                    {!dash.isSidebarCollapsed && (
                      <div className="animate-in fade-in duration-500">
                        <h3 className="text-[15px] font-semibold text-slate-900 m-0">Epics</h3>
                        <p className="m-0 mt-0.5 text-xs text-slate-500">{dash.epics.length} in this project</p>
                      </div>
                    )}
                    <div className={`flex items-center gap-1.5 ${dash.isSidebarCollapsed ? 'flex-col' : ''}`}>
                      {!dash.isSidebarCollapsed && (
                        <button
                          className="flex items-center justify-center w-9 h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-40"
                          disabled={!dash.canManageActiveProject}
                          onClick={() => dash.setIsEpicCreateModalOpen(true)}
                          title="New Epic"
                          type="button"
                        >
                          <Plus size={16} />
                        </button>
                      )}
                      <button
                        className="flex items-center justify-center w-9 h-9 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
                        onClick={() => dash.setIsSidebarCollapsed(!dash.isSidebarCollapsed)}
                        title={dash.isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                      >
                        {dash.isSidebarCollapsed ? <Layout size={18} /> : <List size={18} />}
                      </button>
                    </div>
                  </div>

                  {!dash.isSidebarCollapsed && (
                    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
                      {dash.activeProjectEpics.map(epic => {
                        const isActive = dash.selectedEpicId === epic.id;
                        return (
                          <div
                            key={epic.id}
                            className={`relative flex flex-col gap-2 px-3.5 py-3 rounded-lg border transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                            onClick={() => dash.handleEpicSelect(isActive ? null : epic.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="text-sm font-semibold m-0 leading-snug text-slate-900">
                                {epic.name}
                              </h4>
                              <span className={`shrink-0 whitespace-nowrap text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusPillCls[epic.status] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                {epicStatusLabel(epic.status)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                onClick={(e) => { e.stopPropagation(); dash.handleOpenEpicNotesPanel(epic); }}
                                title="Notes"
                              >
                                <FileText size={12} />
                              </button>
                              <button
                                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
                                disabled={!dash.canManageActiveProject}
                                onClick={(e) => { e.stopPropagation(); dash.setEditingEpic(epic); }}
                                title="Edit"
                              >
                                <Edit3 size={12} />
                              </button>
                              <div className="flex-1" />
                              <button
                                className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
                                disabled={dash.actionEpicId === epic.id || dash.activeProject?.currentUserRole !== 'ADMIN'}
                                onClick={(e) => { e.stopPropagation(); void dash.handleDeleteEpic(epic.id); }}
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {dash.activeProjectEpics.length === 0 && (
                        <div className="py-10 text-center opacity-40">
                          <EmptyState description="Create an epic to group your tasks." icon={List} title="No epics" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Column 2 — Main Workspace (Tasks) */}
                <div className="flex flex-col flex-1 min-w-0 min-h-[60vh] lg:min-h-0 lg:h-full rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                  {dash.selectedEpicId ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100">
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-semibold text-slate-900 m-0">{dash.tasksHeading}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-slate-500 text-xs truncate max-w-[200px]">
                              {dash.epics.find(e => e.id === dash.selectedEpicId)?.name}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="text-[11px] font-semibold text-slate-600">
                              {dash.activeEpicTasks.length} {dash.activeEpicTasks.length === 1 ? 'Task' : 'Tasks'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/50">
                            <button
                              onClick={() => dash.setViewMode('list')}
                              className={`p-1.5 rounded-md transition-all ${dash.viewMode === 'list' ? 'bg-white shadow-sm text-slate-600' : 'text-slate-400 hover:text-slate-600'}`}
                              title="List View"
                            >
                              <List size={18} />
                            </button>
                            <button
                              onClick={() => dash.setViewMode('kanban')}
                              className={`p-1.5 rounded-md transition-all ${dash.viewMode === 'kanban' ? 'bg-white shadow-sm text-slate-600' : 'text-slate-400 hover:text-slate-600'}`}
                              title="Kanban Board"
                            >
                              <Layout size={18} />
                            </button>
                          </div>
                          <button
                            className="flex items-center justify-center w-10 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm transition-all duration-300 hover:scale-[1.03] active:scale-95 disabled:opacity-40"
                            disabled={!dash.canManageActiveProject}
                            onClick={() => {
                              const activeEpic = dash.epics.find(e => e.id === dash.selectedEpicId);
                              dash.setTaskModalProjectId(activeEpic?.projectId ?? dash.activeProject?.id ?? null);
                              dash.setIsTaskCreateModalOpen(true);
                            }}
                            title="New Task"
                            type="button"
                          >
                            <Plus size={20} />
                          </button>
                        </div>
                      </div>

                      <div className="px-3 sm:px-6 py-2 border-b border-slate-100">
                        <div className="mb-3">
                          <SlaDashboard />
                        </div>
                        <TaskFilterBar
                          filters={dash.taskFilters}
                          onFilterChange={dash.setTaskFilters}
                          members={dash.activeProjectMembers}
                          onClear={dash.handleClearFilters}
                        />
                      </div>

                      {dash.selectedTaskIds.length > 0 && (
                        <div className="mx-3 sm:mx-6 my-2 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              {dash.selectedTaskIds.length} tasks selected
                            </span>
                            <button
                              onClick={() => dash.setSelectedTaskIds([])}
                              className="text-xs text-slate-600 hover:text-red-500 font-medium transition-colors underline decoration-dotted"
                            >
                              Deselect all
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Assign to:</span>
                            <AssigneeSelector
                              projectId={dash.activeProject?.id ?? null}
                              selectedUserId=""
                              onSelect={(userId) => void dash.handleBulkAssign(userId)}
                              className="w-48"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex-1 overflow-auto custom-scrollbar">
                        {dash.viewMode === 'list' ? (
                          <div className="p-6">
                            <TaskList
                              actionTaskId={dash.actionTaskId}
                              epics={dash.epics}
                              onDelete={(taskId) => {
                                const task = dash.tasks.find(t => t.id === taskId);
                                void dash.handleDeleteTask(taskId, task?.title ?? 'this task');
                              }}
                              onEditTask={(task) => dash.setEditingTask(task)}
                              onUpdateStatus={(task, status) => void dash.handleUpdateTaskStatus(task, status)}
                              onUpdateEpic={(task, epicId) => void dash.handleUpdateTaskEpic(task, epicId)}
                              projects={dash.projects}
                              tasks={dash.activeEpicTasks}
                              onSelectTask={(task) => dash.setSelectedTaskId(task.id)}
                              onCommentTask={(task) => {
                                dash.setSelectedTaskId(task.id);
                                dash.setSidePanelTab('comments');
                              }}
                              onToggleBlocked={(task) => void dash.handleToggleBlocked(task)}
                              selectedTaskId={dash.selectedTaskId}
                              selectedTaskIds={dash.selectedTaskIds}
                              onToggleSelection={dash.handleToggleTaskSelection}
                              loading={dash.loading && dash.tasks.length === 0}
                            />
                            {!dash.loading && dash.activeEpicTasks.length === 0 && (
                              <div className="py-20 flex flex-col items-center opacity-30">
                                <EmptyState description="No tasks scheduled for this epic." icon={Calendar} title="Empty Workspace" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-full">
                            <KanbanBoard
                              tasks={dash.activeEpicTasks}
                              onUpdateStatus={async (taskId, status) => {
                                const task = dash.tasks.find(t => t.id === taskId);
                                if (task) await dash.handleUpdateTaskStatus(task, status, true);
                              }}
                              onSelectTask={(task) => dash.setSelectedTaskId(task.id)}
                              onCommentTask={(task) => {
                                dash.setSelectedTaskId(task.id);
                                dash.setSidePanelTab('comments');
                              }}
                              onToggleBlocked={(task) => void dash.handleToggleBlocked(task)}
                              onDeleteTask={(taskId) => {
                                const task = dash.tasks.find(t => t.id === taskId);
                                void dash.handleDeleteTask(taskId, task?.title ?? 'this task');
                              }}
                              onEditTask={(task) => dash.setEditingTask(task)}
                              loading={dash.loading && dash.tasks.length === 0}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 mb-4">
                        <Folder size={22} className="text-slate-400" />
                      </div>
                      <h4 className="text-base font-semibold text-slate-900 m-0">Select an epic</h4>
                      <p className="text-sm text-slate-500 max-w-xs mt-1.5">Choose an epic from the sidebar to view its execution plan and tasks.</p>
                    </div>
                  )}
                </div>

                {/* Column 3 — Task Inspector */}
                <TaskInspector
                  isOpen={Boolean(dash.selectedTaskId && dash.activeTask)}
                  onClose={() => dash.setSelectedTaskId(null)}
                  task={dash.activeTask}
                  members={dash.activeProjectMembers}
                  actionTaskId={dash.actionTaskId}
                  sidePanelTab={dash.sidePanelTab}
                  setSidePanelTab={dash.setSidePanelTab}
                  editingSubtask={dash.editingSubtask}
                  setEditingSubtask={dash.setEditingSubtask}
                  setSubtaskModalTask={dash.setSubtaskModalTask}
                  handleUpdateSubtaskStatus={dash.handleUpdateSubtaskStatus}
                  handleUpdateSubtask={dash.handleUpdateSubtask}
                  handleDeleteSubtask={dash.handleDeleteSubtask}
                  handleOpenSubtaskNote={dash.handleOpenSubtaskNote}
                  handleToggleBlocked={dash.handleToggleBlocked}
                  handleEvaluatePriority={dash.handleEvaluatePriority}
                  isEvaluatingPriority={dash.isEvaluatingPriority}
                  handleOpenTaskNote={dash.handleOpenTaskNote}
                  handleUpdateTaskField={async (taskId, updates) => {
                    const task = dash.tasks.find(t => t.id === taskId);
                    if (task) {
                      await dash.handleUpdateTask({
                        title: updates.title ?? task.title,
                        description: updates.description ?? task.description,
                        note: updates.note ?? task.note,
                        date: updates.date ?? task.date,
                        status: (updates.status ?? (task.status === 'rolled_over' ? 'planned' : task.status)) as TaskWorkflowStatus,
                        priority: updates.priority ?? task.priority,
                        isBlocked: updates.isBlocked ?? task.isBlocked,
                        blockedByTaskId: updates.blockedByTaskId ?? task.blockedByTaskId,
                        projectId: updates.projectId !== undefined ? updates.projectId : (task.projectId || null),
                        epicId: updates.epicId !== undefined ? updates.epicId : (task.epicId || null),
                        assignedTo: updates.assignedTo,
                      });
                    }
                  }}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals & Overlays */}
      {dash.isProjectCreateModalOpen && (
        <Modal onClose={() => dash.setIsProjectCreateModalOpen(false)} title="Create Project">
          <ProjectForm onSubmit={dash.handleCreateProject} />
        </Modal>
      )}
      {dash.isAiPlanningWorkspaceOpen && (
        <AiProjectPlanModal
          isOpen={dash.isAiPlanningWorkspaceOpen}
          onClose={() => dash.setIsAiPlanningWorkspaceOpen(false)}
          onProjectCreated={() => {
            dash.setIsAiPlanningWorkspaceOpen(false);
            void dash.loadDashboard();
          }}
        />
      )}
      {dash.isChatPanelOpen && dash.activeProject && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-[2000] animate-in fade-in duration-300"
            onClick={() => dash.setIsChatPanelOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full md:w-1/2 lg:max-w-1/2 bg-white z-[5001] shadow-xl animate-in slide-in-from-right duration-500 overflow-hidden border-l border-slate-200 flex flex-col">
            <ChatPanel
              project={dash.activeProject}
              members={dash.activeProjectMembers}
              isOpen={dash.isChatPanelOpen}
              onClose={() => dash.setIsChatPanelOpen(false)}
            />
          </div>
        </>
      )}
      {dash.editingProject && (
        <Modal onClose={() => dash.setEditingProject(null)} title="Update Project">
          <ProjectForm initialDescription={dash.editingProject.description} initialName={dash.editingProject.name} onSubmit={dash.handleUpdateProject} submitLabel="Update project" />
        </Modal>
      )}
      {dash.isEpicCreateModalOpen && dash.activeProject && (
        <Modal onClose={() => dash.setIsEpicCreateModalOpen(false)} title={`Create Epic for ${dash.activeProject.name}`}>
          <EpicForm onSubmit={dash.handleCreateEpic} submitLabel="Create epic" />
        </Modal>
      )}
      {dash.editingEpic && dash.activeProject && (
        <Modal onClose={() => dash.setEditingEpic(null)} title={`Update Epic for ${dash.activeProject.name}`}>
          <EpicForm
            initialDescription={dash.editingEpic.description}
            initialName={dash.editingEpic.name}
            initialStatus={dash.editingEpic.status}
            onSubmit={dash.handleUpdateEpic}
            submitLabel="Update epic"
          />
        </Modal>
      )}
      {dash.isTaskCreateModalOpen && (
        <Modal onClose={() => dash.setIsTaskCreateModalOpen(false)} title="Create Task">
          <AddTaskForm
            epics={dash.epics}
            initialProjectId={dash.taskModalProjectId}
            initialEpicId={dash.selectedEpicId}
            onCreateTask={dash.handleCreateTask}
            projects={dash.projects}
          />
        </Modal>
      )}
      {dash.isProjectTeamModalOpen && dash.activeProject && (
        <Modal
          bodyClassName="!p-0"
          onClose={() => dash.setIsProjectTeamModalOpen(false)}
          panelClassName="!max-w-[820px]"
          title={`Team for ${dash.activeProject.name}`}
        >
          <ProjectTeamPanel
            canManageTeam={dash.canManageTeam}
            currentUserId={dash.user?.id ?? null}
            isMutating={dash.teamMutationLoading}
            members={dash.activeProjectMembers}
            projectId={dash.activeProject.id}
            onInviteMember={dash.handleInviteProjectMember}
            onRemoveMember={dash.handleRemoveProjectMember}
            onLeaveProject={dash.handleLeaveProject}
          />
        </Modal>
      )}
      {isWorkflowModalOpen && dash.activeProject && (
        <Modal
          bodyClassName="!p-0"
          onClose={() => setIsWorkflowModalOpen(false)}
          panelClassName="!max-w-[720px]"
          title={`Workflow — ${dash.activeProject.name}`}
        >
          <ProjectWorkflowStatesPanel
            canManage={dash.canManageTeam}
            projectId={dash.activeProject.id}
          />
        </Modal>
      )}
      {dash.isActivityHistoryOpen && dash.activeProject && (
        <Modal
          bodyClassName="!p-0"
          onClose={() => dash.setIsActivityHistoryOpen(false)}
          panelClassName="!max-w-[720px]"
          title={`Activity History — ${dash.activeProject.name}`}
        >
          <ActivityHistoryPanel
            projectId={dash.activeProject.id}
            projectName={dash.activeProject.name}
          />
        </Modal>
      )}
      {dash.isProjectNotesModalOpen && dash.activeProjectForNotes && (
        <Modal onClose={() => dash.setIsProjectNotesModalOpen(false)} title={dash.activeProjectNotesModalTitle}>
          <ProjectNotes
            actionNoteId={dash.actionNoteId}
            heading="Project notes"
            loading={dash.notesLoadingKey === `project:${dash.activeProjectForNotes.id}`}
            notes={dash.activeProjectNotes}
            onCreateNote={() => dash.activeProjectForNotes && dash.handleOpenCreateProjectNote(dash.activeProjectForNotes)}
            onDeleteNote={dash.activeProjectForNotes.currentUserRole === 'ADMIN' ? (note) => void dash.handleDeleteNote(note) : undefined}
            onOpenNote={(note) => void dash.handleOpenExistingNote(note)}
          />
        </Modal>
      )}
      {dash.isEpicNotesModalOpen && dash.activeEpicForNotes && (
        <Modal onClose={() => dash.setIsEpicNotesModalOpen(false)} title={dash.activeEpicNotesModalTitle}>
          <ProjectNotes
            actionNoteId={dash.actionNoteId}
            createLabel="Create epic note"
            emptyDescription="Create the first note to capture decisions, references, or follow-ups for this epic."
            emptyTitle="No epic notes yet"
            heading="Epic notes"
            loading={dash.notesLoadingKey === `epic:${dash.activeEpicForNotes.id}`}
            notes={dash.activeEpicNotes}
            onCreateNote={dash.projects.find((project) => project.id === dash.activeEpicForNotes?.projectId)?.currentUserRole === 'ADMIN' ? () => dash.handleOpenCreateEpicNote(dash.activeEpicForNotes!) : undefined}
            onDeleteNote={dash.projects.find((project) => project.id === dash.activeEpicForNotes?.projectId)?.currentUserRole === 'ADMIN' ? (note) => void dash.handleDeleteNote(note) : undefined}
            onOpenNote={(note) => void dash.handleOpenExistingNote(note)}
          />
        </Modal>
      )}
      {dash.editingTask && (
        <Modal onClose={() => dash.setEditingTask(null)} title={`Edit Task: ${dash.editingTask.title}`}>
          <EditTaskForm
            epics={dash.epics}
            allTasks={dash.tasks}
            onSubmit={dash.handleUpdateTask}
            projects={dash.projects}
            task={dash.editingTask}
          />
        </Modal>
      )}
      {dash.subtaskModalTask && (
        <Modal
          onClose={() => dash.setSubtaskModalTask(null)}
          title={`Create Subtask for ${dash.subtaskModalTask.title}`}
        >
          <SubtaskForm members={dash.activeProjectMembers} onSubmit={dash.handleCreateSubtask} />
        </Modal>
      )}
      {dash.activeNoteEditor && (
        <NoteModal
          allowAppend={(dash.activeNoteEditor.kind === 'project' || dash.activeNoteEditor.kind === 'epic') && dash.activeNoteEditor.note != null}
          allowDelete={
            dash.activeNoteEditor.kind === 'project' || dash.activeNoteEditor.kind === 'epic'
              ? dash.activeNoteEditor.note != null
              : dash.activeNoteEditor.kind === 'task'
              ? Boolean(dash.activeNoteEditor.task.note?.trim())
              : Boolean(dash.activeNoteEditor.subtask.note?.trim())
          }
          deleteLabel={
            dash.activeNoteEditor.kind === 'project'
              ? 'Delete Note'
              : dash.activeNoteEditor.kind === 'epic'
              ? 'Delete Epic Note'
              : dash.activeNoteEditor.kind === 'task'
              ? 'Delete Task Note'
              : 'Delete Sub-task Note'
          }
          entityLabel={
            dash.activeNoteEditor.kind === 'project'
              ? dash.activeNoteEditor.projectName
              : dash.activeNoteEditor.kind === 'epic'
              ? dash.activeNoteEditor.epicName
              : dash.activeNoteEditor.kind === 'task'
              ? dash.activeNoteEditor.task.title
              : `${dash.activeNoteEditor.task.title} / ${dash.activeNoteEditor.subtask.title}`
          }
          modalTitle={
            dash.activeNoteEditor.kind === 'project'
              ? dash.activeNoteEditor.note
                ? 'Edit Project Note'
                : 'Create Project Note'
              : dash.activeNoteEditor.kind === 'epic'
              ? dash.activeNoteEditor.note
                ? 'Edit Epic Note'
                : 'Create Epic Note'
              : dash.activeNoteEditor.kind === 'task'
              ? dash.activeNoteEditor.task.note?.trim()
                ? 'Edit Task Note'
                : 'Create Task Note'
              : dash.activeNoteEditor.subtask.note?.trim()
              ? 'Edit Sub-task Note'
              : 'Create Sub-task Note'
          }
          note={
            dash.activeNoteEditor.kind === 'project'
              ? dash.activeNoteEditor.note
              : dash.activeNoteEditor.kind === 'epic'
              ? dash.activeNoteEditor.note
              : dash.activeNoteEditor.kind === 'task'
              ? { title: '', content: dash.activeNoteEditor.task.note ?? '' }
              : { title: '', content: dash.activeNoteEditor.subtask.note ?? '' }
          }
          onClose={() => dash.setActiveNoteEditor(null)}
          onDelete={
            'note' in dash.activeNoteEditor && dash.activeNoteEditor.note
              ? () => void dash.handleDeleteNote((dash.activeNoteEditor as { note: Note }).note)
              : () => void dash.handleDeleteInlineNote()
          }
          onSave={dash.handleSaveNote}
          showTitle={dash.activeNoteEditor.kind === 'project' || dash.activeNoteEditor.kind === 'epic'}
          titlePlaceholder="Sprint recap"
        />
      )}
      {dash.priorityEvaluationModalOpen && dash.priorityEvaluationResult && (
        <Modal onClose={() => dash.setPriorityEvaluationModalOpen(false)} title="Priority Evaluation">
          <div className="grid gap-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="font-semibold text-slate-700">Base Priority</span>
                <span className="text-slate-900 font-medium">{dash.priorityEvaluationResult.basePriority}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="font-semibold text-slate-700">Dynamic Priority</span>
                <span className="text-slate-900 font-semibold px-2 py-0.5 bg-slate-100 rounded">{dash.priorityEvaluationResult.dynamicPriority}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="font-semibold text-slate-700">Dynamic Score</span>
                <span className="text-slate-900">{dash.priorityEvaluationResult.dynamicPriorityScore}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="font-semibold text-slate-700">Urgency / Impact</span>
                <span className="text-slate-900">{dash.priorityEvaluationResult.urgencyScore} / {dash.priorityEvaluationResult.impactScore}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="font-semibold text-slate-700">Downstream Impact</span>
                <span className="text-slate-900">{dash.priorityEvaluationResult.downstreamTaskCount} tasks ({dash.priorityEvaluationResult.dependencyWeight} weight)</span>
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1">Reasoning</h4>
              <p className="text-sm text-slate-600 m-0">{dash.priorityEvaluationResult.reason}</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
                onClick={() => dash.setPriorityEvaluationModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default DashboardPage;
