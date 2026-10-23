import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AddTaskForm from '@/components/AddTaskForm';
import { WorkspaceSwitcher } from '@/features/workspaces';
import EditTaskForm from '@/components/EditTaskForm';
import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import { Badge, Button, IconTile, buttonClass, cn, type BadgeTone } from '@/components/ui';
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
import AgentsPage from '@/pages/AgentsPage';
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
import DashboardOverview from '@/features/dashboard/components/DashboardOverview';
import { TaskInspector } from '@/features/tasks';
import {
  Layers3,
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
  Settings,
  BookOpen,
  type LucideIcon
} from 'lucide-react';
import { Note } from '@/types/note';
import { useDashboard, ALL_PROJECTS_VALUE } from '@/features/dashboard';

const headerButtonCls = buttonClass('secondary', 'md', 'px-2.5 sm:px-3');

/** Below `sm` the header buttons show only their icon; the label stays as the accessible name. */
function HeaderLabel({ children }: { children: string }): JSX.Element {
  return <span className="sr-only sm:not-sr-only">{children}</span>;
}

const STATUS_TONES: Record<string, BadgeTone> = {
  planned: 'neutral',
  active: 'info',
  completed: 'success',
  archived: 'neutral',
  TODO: 'neutral',
  IN_PROGRESS: 'info',
  DONE: 'success',
  BLOCKED: 'danger'
};

const crumbLinkCls = 'rounded text-slate-500 transition-colors hover:text-slate-900';
const crumbCurrentCls = 'truncate font-medium text-slate-900';
const crumbSep = <span aria-hidden className="text-slate-300">/</span>;

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
        <MoreHorizontal size={16} />
        <HeaderLabel>More</HeaderLabel>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-40 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
          role="menu"
        >
          {items.map(({ label, icon: Icon, onSelect, disabled }) => (
            <button
              className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
              disabled={disabled}
              key={label}
              onClick={() => {
                setOpen(false);
                onSelect();
              }}
              role="menuitem"
              type="button"
            >
              <Icon className="shrink-0 text-slate-400" size={16} />
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
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Toast Notification */}
      {allMutationMessages.length > 0 && (
        <div className="fixed left-3 right-3 top-3 z-[9999] flex flex-col items-end gap-2 sm:left-auto sm:right-4 sm:top-4">
          {allMutationMessages.map((msg, i) => (
            <div
              key={i}
              className={`w-full max-w-sm rounded-lg border px-3.5 py-2.5 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-4 ${
                msg?.toLowerCase().includes('unable') || msg?.toLowerCase().includes('error')
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0">{msg}</span>
                <button
                  aria-label="Dismiss"
                  className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-60 transition-opacity hover:opacity-100"
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
                  <Plus className="rotate-45" size={16} />
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
          else if (view === 'agents') navigate('/agents');
        }}
        onNewProject={() => dash.setIsProjectCreateModalOpen(true)}
        onLogout={dash.logout}
        user={dash.user ? { name: dash.user.name || null, email: dash.user.email || '' } : null}
        activeIntegrationId={dash.activeIntegrationName}
        activeIntegrationName={dash.activeIntegrationName}
        activeTab={tab || 'overview'}
      />

      {/* Right side wrapper */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <Topbar
          onMenuClick={() => setIsMobileNavOpen(true)}
          title={
            dash.activeView === 'settings'
              ? 'Settings'
              : dash.activeView === 'agents'
              ? 'Agent Governance'
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
              : 'Overview'
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
                className={crumbLinkCls}
                type="button"
              >
                Dashboard
              </button>

              {crumbSep}

              {dash.activeView === 'settings' ? (
                <span className={crumbCurrentCls}>Settings</span>
              ) : dash.activeView === 'agents' ? (
                <span className={crumbCurrentCls}>Agent Governance</span>
              ) : dash.activeView === 'sdk-docs' ? (
                <span className={crumbCurrentCls}>SDK Documentation</span>
              ) : dash.activeView === 'event-tracking' ? (
                <span className={crumbCurrentCls}>Event Tracking</span>
              ) : dash.activeView === 'engagement' ? (
                <span className={crumbCurrentCls}>Engagement</span>
              ) : dash.activeView === 'sdk-integrations' ? (
                <span className={crumbCurrentCls}>SDK Integrations</span>
              ) : dash.activeView === 'sdk-integration-detail' ? (
                <>
                  <button
                    onClick={() => navigate('/sdk-integrations')}
                    className={crumbLinkCls}
                    type="button"
                  >
                    SDK Integrations
                  </button>
                  {crumbSep}
                  <span className={crumbCurrentCls}>Integration Detail</span>
                </>
              ) : dash.activeView === 'prompts' ? (
                <span className={crumbCurrentCls}>Prompt Library</span>
              ) : dash.activeView === 'playground' ? (
                <span className={crumbCurrentCls}>Prompt Playground</span>
              ) : dash.activeView === 'semantic-intelligence' ? (
                <span className={crumbCurrentCls}>Semantic Intelligence</span>
              ) : dash.activeProject ? (
                <>
                  <button
                    onClick={() => dash.handleProjectSelect(ALL_PROJECTS_VALUE)}
                    className={crumbLinkCls}
                    type="button"
                  >
                    Projects
                  </button>
                  {crumbSep}
                  <span className={crumbCurrentCls}>{dash.activeProject.name}</span>
                  {dash.activeProjectAiEnabled ? (
                    <Badge className="ml-1 select-none" dot tone="success">
                      AI{dash.activeProjectAiProvider ? ` · ${dash.activeProjectAiProvider}` : ''}
                    </Badge>
                  ) : (
                    <Badge className="ml-1 select-none" title="No AI provider is configured for this project; built-in rules are used.">
                      AI off
                    </Badge>
                  )}
                </>
              ) : (
                <span className={crumbCurrentCls}>Overview</span>
              )}
            </>
          }
          rightContent={
            <div className="flex items-center gap-1 sm:gap-1.5">
              <WorkspaceSwitcher />
              <InvitationNotificationPanel />
            </div>
          }
        />

        {/* Main View Area */}
        <main className="flex-1 overflow-hidden">
          {dash.activeView === 'settings' ? (
            <div className="h-full overflow-y-auto">
              <PageHeader description="Account and preferences" icon={Settings} title="Settings" tone="slate" />
              <div className="px-3 py-4 sm:px-5 lg:px-6">
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
          ) : dash.activeView === 'agents' ? (
            <AgentsPage projects={dash.projects} />
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
            <div className="h-full overflow-y-auto bg-slate-50">
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
              <PageHeader description="Integration guide and API reference" icon={BookOpen} title="SDK Documentation" tone="orange" />
              <div className="px-3 py-4 sm:px-5 lg:px-6">
                <SdkDocsPanel />
              </div>
            </div>
          ) : !dash.activeProject ? (
            <div className="h-full overflow-y-auto">
              <DashboardOverview
                epics={dash.epics}
                loading={dash.loading}
                onNewProject={() => dash.setIsProjectCreateModalOpen(true)}
                onOpenAiPlanner={() => dash.setIsAiPlanningWorkspaceOpen(true)}
                onOpenTask={(task) => {
                  if (task.projectId && task.epicId) navigate(`/projects/${task.projectId}/epics/${task.epicId}`);
                  else if (task.projectId) dash.handleProjectSelect(task.projectId);
                }}
                projects={dash.projects}
                tasks={dash.tasks}
                user={dash.user ? { id: dash.user.id, name: dash.user.name ?? null, email: dash.user.email ?? null } : null}
              >
                <ProjectPanel
                  actionProjectId={dash.actionProjectId}
                  currentPage={dash.projectPage}
                  embedded
                  epics={dash.epics}
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
                  tasks={dash.tasks}
                  totalPages={dash.projectTotalPages}
                  onPageChange={dash.handleProjectPageChange}
                  onSearch={dash.handleProjectSearch}
                  searchTerm={dash.projectSearchTerm}
                />
              </DashboardOverview>
            </div>
          ) : (
            /* 3-column workspace */
            <div className="flex h-full flex-col overflow-hidden">
              <div className="header-band shrink-0 border-b border-slate-200 px-3 py-2.5 sm:px-5 lg:px-6">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <IconTile className="hidden sm:inline-flex" icon={Folder} size="md" tone="sky" />
                    <div className="relative flex min-w-0 items-center">
                      <select
                        aria-label="Switch project"
                        className="m-0 max-w-[60vw] cursor-pointer appearance-none truncate rounded-md border-none bg-transparent p-0 pr-6 text-lg font-semibold tracking-tight text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 sm:max-w-none"
                        onChange={(e) => dash.handleProjectSelect(e.target.value)}
                        value={dash.activeProject.id}
                      >
                        {dash.projects.map((project) => (
                          <option
                            className="bg-white text-base font-normal text-slate-900"
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
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      className={headerButtonCls}
                      onClick={() => dash.setIsProjectTeamModalOpen(true)}
                      type="button"
                    >
                      <Users size={16} />
                      <HeaderLabel>Team</HeaderLabel>
                    </button>
                    <button
                      aria-pressed={dash.isChatPanelOpen}
                      className={cn(headerButtonCls, dash.isChatPanelOpen && '!border-emerald-200 !bg-emerald-50 !text-emerald-800')}
                      onClick={() => dash.setIsChatPanelOpen(!dash.isChatPanelOpen)}
                      type="button"
                    >
                      <MessageCircle size={16} />
                      <HeaderLabel>Chat</HeaderLabel>
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
                    <Button icon={Zap} onClick={() => dash.setIsAiPlanningWorkspaceOpen(true)} variant="primary">
                      AI Planner
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 sm:p-4 lg:flex-row lg:overflow-hidden lg:px-6 lg:py-4">
                {/* Column 1 — Epics */}
                <div className={`flex max-h-[45vh] w-full shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-card)] transition-[width] duration-300 ease-in-out lg:h-full lg:max-h-none ${dash.isSidebarCollapsed ? 'lg:w-14' : 'lg:w-[272px]'}`}>
                  <div className={`flex items-center justify-between gap-2 border-b border-slate-100 py-2.5 ${dash.isSidebarCollapsed ? 'px-3 lg:flex-col lg:gap-3 lg:px-2' : 'px-4'}`}>
                    {!dash.isSidebarCollapsed ? (
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="m-0 text-sm font-semibold tracking-tight text-slate-900">Epics</h3>
                        <Badge className="tabular-nums">{dash.epics.length}</Badge>
                      </div>
                    ) : (
                      <h3 className="m-0 text-[15px] font-semibold text-slate-900 lg:sr-only">Epics</h3>
                    )}
                    <div className={`flex items-center gap-1 ${dash.isSidebarCollapsed ? 'lg:flex-col' : ''}`}>
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        onClick={() => dash.setIsSidebarCollapsed(!dash.isSidebarCollapsed)}
                        title={dash.isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        type="button"
                      >
                        {dash.isSidebarCollapsed ? <Layout size={16} /> : <List size={16} />}
                      </button>
                      {!dash.isSidebarCollapsed && (
                        <Button
                          disabled={!dash.canManageActiveProject}
                          onClick={() => dash.setIsEpicCreateModalOpen(true)}
                          size="icon-sm"
                          title="New Epic"
                          variant="primary"
                        >
                          <Plus size={16} />
                        </Button>
                      )}
                    </div>
                  </div>

                  {!dash.isSidebarCollapsed && (
                    <div className="custom-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto p-2">
                      {dash.activeProjectEpics.map(epic => {
                        const isActive = dash.selectedEpicId === epic.id;
                        return (
                          <div
                            key={epic.id}
                            className={cn(
                              'group relative flex cursor-pointer flex-col gap-1 rounded-lg border px-2.5 py-2 transition-colors duration-150',
                              isActive
                                ? 'border-emerald-200 bg-emerald-50/60 shadow-[inset_3px_0_0_0_#10b981]'
                                : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                            )}
                            onClick={() => dash.handleEpicSelect(isActive ? null : epic.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="m-0 min-w-0 truncate text-sm font-medium leading-snug text-slate-900">
                                {epic.name}
                              </h4>
                              <Badge className="shrink-0" tone={STATUS_TONES[epic.status] ?? 'neutral'}>
                                {epicStatusLabel(epic.status)}
                              </Badge>
                            </div>

                            <div className="-mb-1 -ml-1.5 flex items-center gap-0.5">
                              <button
                                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700"
                                onClick={(e) => { e.stopPropagation(); dash.handleOpenEpicNotesPanel(epic); }}
                                title="Notes"
                                type="button"
                              >
                                <FileText size={14} />
                              </button>
                              <button
                                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-40"
                                disabled={!dash.canManageActiveProject}
                                onClick={(e) => { e.stopPropagation(); dash.setEditingEpic(epic); }}
                                title="Edit"
                                type="button"
                              >
                                <Edit3 size={14} />
                              </button>
                              <div className="flex-1" />
                              <button
                                className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-40"
                                disabled={dash.actionEpicId === epic.id || dash.activeProject?.currentUserRole !== 'ADMIN'}
                                onClick={(e) => { e.stopPropagation(); void dash.handleDeleteEpic(epic.id); }}
                                title="Delete"
                                type="button"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {dash.activeProjectEpics.length === 0 && (
                        <div className="p-1.5">
                          <EmptyState
                            action={
                              dash.canManageActiveProject ? (
                                <Button icon={Plus} onClick={() => dash.setIsEpicCreateModalOpen(true)} size="sm" variant="secondary">
                                  Add epic
                                </Button>
                              ) : undefined
                            }
                            compact
                            description="Create an epic to group your tasks."
                            icon={List}
                            title="No epics"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Column 2 — Tasks */}
                <div className="flex min-h-[60vh] min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-card)] lg:h-full lg:min-h-0">
                  {dash.selectedEpicId ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
                        <div className="min-w-0">
                          <h3 className="m-0 truncate text-sm font-semibold tracking-tight text-slate-900">{dash.tasksHeading}</h3>
                          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                            <span className="max-w-[200px] truncate">
                              {dash.epics.find(e => e.id === dash.selectedEpicId)?.name}
                            </span>
                            <span aria-hidden className="text-slate-300">·</span>
                            <span className="shrink-0">
                              {dash.activeEpicTasks.length} {dash.activeEpicTasks.length === 1 ? 'Task' : 'Tasks'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                            <button
                              aria-pressed={dash.viewMode === 'list'}
                              onClick={() => dash.setViewMode('list')}
                              className={`flex h-7 w-8 items-center justify-center rounded-md transition-colors ${dash.viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                              title="List View"
                              type="button"
                            >
                              <List size={16} />
                            </button>
                            <button
                              aria-pressed={dash.viewMode === 'kanban'}
                              onClick={() => dash.setViewMode('kanban')}
                              className={`flex h-7 w-8 items-center justify-center rounded-md transition-colors ${dash.viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                              title="Kanban Board"
                              type="button"
                            >
                              <Layout size={16} />
                            </button>
                          </div>
                          <Button
                            disabled={!dash.canManageActiveProject}
                            onClick={() => {
                              const activeEpic = dash.epics.find(e => e.id === dash.selectedEpicId);
                              dash.setTaskModalProjectId(activeEpic?.projectId ?? dash.activeProject?.id ?? null);
                              dash.setIsTaskCreateModalOpen(true);
                            }}
                            size="icon"
                            title="New Task"
                            variant="primary"
                          >
                            <Plus size={18} />
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-2.5 border-b border-slate-100 px-4 py-3">
                        <SlaDashboard />
                        <TaskFilterBar
                          filters={dash.taskFilters}
                          onFilterChange={dash.setTaskFilters}
                          members={dash.activeProjectMembers}
                          onClear={dash.handleClearFilters}
                        />
                      </div>

                      {dash.selectedTaskIds.length > 0 && (
                        <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-900">
                              {dash.selectedTaskIds.length} tasks selected
                            </span>
                            <button
                              onClick={() => dash.setSelectedTaskIds([])}
                              className="text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900"
                              type="button"
                            >
                              Deselect all
                            </button>
                          </div>
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="text-[13px] text-slate-500">Assign to</span>
                            <AssigneeSelector
                              projectId={dash.activeProject?.id ?? null}
                              selectedUserId=""
                              onSelect={(userId) => void dash.handleBulkAssign(userId)}
                              className="w-48"
                            />
                          </div>
                        </div>
                      )}

                      <div className="custom-scrollbar flex-1 overflow-auto">
                        {dash.viewMode === 'list' ? (
                          <div className="p-3 sm:p-4">
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
                    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                      <IconTile className="mb-3" icon={Layers3} size="lg" tone="emerald" />
                      <h4 className="m-0 text-sm font-semibold text-slate-900">Select an epic</h4>
                      <p className="m-0 mt-1 max-w-xs text-sm text-slate-500">
                        Choose an epic from the list to view its execution plan and tasks.
                      </p>
                      {dash.activeProjectEpics.length === 0 && dash.canManageActiveProject ? (
                        <Button className="mt-4" icon={Plus} onClick={() => dash.setIsEpicCreateModalOpen(true)} variant="primary">
                          Add epic
                        </Button>
                      ) : null}
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
            className="fixed inset-0 z-[2000] bg-slate-950/30 backdrop-blur-[2px] animate-in fade-in duration-200"
            onClick={() => dash.setIsChatPanelOpen(false)}
          />
          <div className="fixed right-0 top-0 z-[5001] flex h-full w-full flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right duration-300 sm:w-[480px] lg:w-[560px]">
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
        <Modal
          footer={
            <Button onClick={() => dash.setPriorityEvaluationModalOpen(false)} variant="primary">
              Close
            </Button>
          }
          onClose={() => dash.setPriorityEvaluationModalOpen(false)}
          title="Priority Evaluation"
        >
          <dl className="m-0 grid divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
            {[
              ['Base priority', dash.priorityEvaluationResult.basePriority],
              ['Dynamic priority', <Badge key="dp" tone="dark">{dash.priorityEvaluationResult.dynamicPriority}</Badge>],
              ['Dynamic score', dash.priorityEvaluationResult.dynamicPriorityScore],
              ['Urgency / impact', `${dash.priorityEvaluationResult.urgencyScore} / ${dash.priorityEvaluationResult.impactScore}`],
              ['Downstream impact', `${dash.priorityEvaluationResult.downstreamTaskCount} tasks (${dash.priorityEvaluationResult.dependencyWeight} weight)`]
            ].map(([label, value]) => (
              <div className="flex items-center justify-between gap-4 px-4 py-2.5" key={String(label)}>
                <dt className="text-slate-500">{label}</dt>
                <dd className="m-0 text-right font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="m-0 mb-1 text-sm font-medium text-slate-700">Reasoning</h4>
            <p className="m-0 text-sm text-slate-600">{dash.priorityEvaluationResult.reason}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default DashboardPage;
