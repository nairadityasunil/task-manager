import ActivityTimelinePage from '@/pages/ActivityTimelinePage';
import TelemetryPage from '@/pages/TelemetryPage';
import InsightsPage from '@/pages/InsightsPage';
import AiGovernancePage from '@/pages/AiGovernancePage';
import { GovernanceReadyBadge } from '@/features/telemetry/TaskAutomationNote';
import { AiSpend } from '@/features/agents/components/AiSpend';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AddTaskForm from '@/components/AddTaskForm';
import { WorkspaceSwitcher } from '@/features/workspaces';
import EditTaskForm from '@/components/EditTaskForm';
import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import { Badge, Button, Menu, Select, IconTile, buttonClass, cn, tagColor, type BadgeTone } from '@/components/ui';
import Modal from '@/components/Modal';
import EpicForm from '@/components/EpicForm';
import NoteModal from '@/components/NoteModal';
import ProjectForm from '@/components/ProjectForm';
import { ClassificationSelect, ProjectLabelChip } from '@/features/agents/components/AdvancedGovernance';
import ProjectNotes from '@/components/ProjectNotes';
import ProjectPanel from '@/components/ProjectPanel';
import ProjectTeamPanel from '@/components/ProjectTeamPanel';
import { SubtasksModal } from '@/features/tasks/components/SubtasksModal';
import { ProjectSettings } from '@/features/projects/components/ProjectSettings';
import { WeeklyTimesheet } from '@/features/projects/components/WeeklyTimesheet';
import SettingsPanel from '@/components/SettingsPanel';
import SubtaskForm from '@/components/SubtaskForm';
import ChatPanel from '@/components/ChatPanel';
import { ActivityHistoryPanel } from '@/features/projects';
import { AllProjects } from '@/features/projects/components/AllProjects';
import { RunPromptModal } from '@/features/prompts/run/RunPromptModal';
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
import { CommandPalette, buildPaletteItems } from '@/components/CommandPalette';
import type { TaskWorkflowStatus } from '@/types/task';
import InvitationNotificationPanel from '@/components/InvitationNotificationPanel';
import TaskList from '@/components/TaskList';
import KanbanBoard from '@/components/KanbanBoard';
import TaskFilterBar from '@/components/TaskFilterBar';
import AssigneeSelector from '@/components/AssigneeSelector';
import SlaDashboard from '@/components/SlaDashboard';
import DashboardOverview from '@/features/dashboard/components/DashboardOverview';
import { TaskInspector } from '@/features/tasks';
import { Clock, SlidersHorizontal, Layers3, Edit3, FileText, Folder, Layout, List, MessageCircle, MessageSquare, Plus, Users, Trash2, History, RefreshCw, Calculator, Zap, Bot, Sparkles, MoreHorizontal, Settings, BookOpen, type LucideIcon } from 'lucide-react';
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
  return (
    <Menu
      items={items.map(({ label, icon, onSelect, disabled }) => ({ id: label, label, icon, onSelect, disabled }))}
      label="More project actions"
      trigger={
        <button className={headerButtonCls} type="button">
          <MoreHorizontal size={16} />
          <HeaderLabel>More</HeaderLabel>
        </button>
      }
    />
  );
}

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const { tab } = useParams();
  const dash = useDashboard();
  // With no epic chosen, the project's tasks show grouped by epic.
  const columnTasks = dash.selectedEpicId ? dash.activeEpicTasks : dash.visibleTasks;
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  // Links from the activity timeline or elsewhere open a task directly: /projects/:id?task=<taskId>.
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedTaskId = searchParams.get('task');
  useEffect(() => {
    if (!linkedTaskId) return;
    dash.setSelectedTaskId(linkedTaskId);
    const next = new URLSearchParams(searchParams);
    next.delete('task');
    setSearchParams(next, { replace: true });
  }, [linkedTaskId, searchParams, setSearchParams]);
  const closePalette = useCallback(() => setIsPaletteOpen(false), []);

  // ⌘K / Ctrl+K opens the command palette from anywhere in the app.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const [isRunPromptOpen, setIsRunPromptOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [viewSubtasksTaskId, setViewSubtasksTaskId] = useState<string | null>(null);
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

  // The task panel: beside the task list in a project, and over Home for tasks that belong to no project.
  const taskInspector = (
                <TaskInspector
                  isOpen={Boolean(dash.selectedTaskId && dash.activeTask)}
                  onClose={() => dash.setSelectedTaskId(null)}
                  task={dash.activeTask}
                  members={dash.activeProjectMembers}
                                    sidePanelTab={dash.sidePanelTab}
                  setSidePanelTab={dash.setSidePanelTab}
                  setSubtaskModalTask={dash.setSubtaskModalTask}
                  handleUpdateSubtaskStatus={dash.handleUpdateSubtaskStatus}
                  handleToggleBlocked={dash.handleToggleBlocked}
                  handleEvaluatePriority={dash.handleEvaluatePriority}
                  isEvaluatingPriority={dash.isEvaluatingPriority}
                  onViewSubtasks={(task) => setViewSubtasksTaskId(task.id)}
                  onNotesChanged={() => void dash.loadDashboard({ quiet: true })}
                  states={dash.activeTask?.projectId && dash.activeProject?.id === dash.activeTask.projectId ? dash.activeProjectStates : []}
                  onMoveToState={(t, stateId) => void dash.handleMoveTaskToState(t, stateId)}
                  statesLoading={!dash.activeProjectStatesLoaded}
                  handleUpdateTaskField={async (taskId, updates) => {
                    const task = dash.tasks.find((t) => t.id === taskId);
                    if (!task) return;
                    if (updates.status && Object.keys(updates).length === 1) {
                      await dash.handleUpdateTaskStatus(task, updates.status as TaskWorkflowStatus);
                      return;
                    }
                    await dash.handleUpdateTaskFields(taskId, updates);
                  }}
                />
  );

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
            if (dash.activeIntegrationId) {
              navigate(`/sdk-integrations/${dash.activeIntegrationId}/${targetTab || 'overview'}`);
            }
          } else if (view === 'sdk-docs') navigate('/sdk-docs');
          else if (view === 'settings') navigate('/settings');
          else if (view === 'agents') navigate('/agents');
          else if (view === 'activity') navigate('/activity');
          else if (view === 'projects') navigate('/projects');
          else if (view === 'telemetry') navigate('/telemetry');
          else if (view === 'insights') navigate('/insights');
          else if (view === 'ai-governance') navigate('/ai-governance');
        }}
        onNewProject={() => dash.setIsProjectCreateModalOpen(true)}
        onOpenSearch={() => setIsPaletteOpen(true)}
        projects={dash.projects}
        activeIntegrationId={dash.activeIntegrationId ?? undefined}
        activeIntegrationName={dash.activeIntegrationName}
        activeTab={tab || 'overview'}
      />

      <CommandPalette
        items={
          isPaletteOpen
            ? buildPaletteItems({
                projects: dash.projects,
                epics: dash.epics,
                tasks: dash.tasks,
                go: (path) => navigate(path),
                openTask: (task) => {
                  if (task.projectId) navigate(task.epicId ? `/projects/${task.projectId}/epics/${task.epicId}` : `/projects/${task.projectId}`);
                  dash.setSelectedTaskId(task.id);
                },
                actions: [
                  { id: 'project', label: 'New project', run: () => dash.setIsProjectCreateModalOpen(true) },
                  { id: 'plan', label: 'Plan a project with AI', run: () => dash.setIsAiPlanningWorkspaceOpen(true) }
                ]
              })
            : []
        }
        onClose={closePalette}
        open={isPaletteOpen}
      />

      {/* Right side wrapper */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <Topbar
          onMenuClick={() => setIsMobileNavOpen(true)}
          title={
            dash.activeView === 'settings'
              ? 'Settings'
              : dash.activeView === 'activity'
              ? 'Activity'
              : dash.activeView === 'projects'
              ? 'All projects'
              : dash.activeView === 'telemetry'
              ? 'Telemetry'
              : dash.activeView === 'insights'
              ? 'Insights'
              : dash.activeView === 'ai-governance'
              ? 'AI Governance'
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
          onLogout={dash.logout}
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
              ) : dash.activeView === 'activity' ? (
                <span className={crumbCurrentCls}>Activity</span>
              ) : dash.activeView === 'telemetry' ? (
                <span className={crumbCurrentCls}>Telemetry</span>
              ) : dash.activeView === 'insights' ? (
                <span className={crumbCurrentCls}>Insights</span>
              ) : dash.activeView === 'ai-governance' ? (
                <span className={crumbCurrentCls}>AI Governance</span>
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
                <span className={crumbCurrentCls}>{dash.activeView === 'projects' ? 'All projects' : 'Overview'}</span>
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
          ) : dash.activeView === 'activity' ? (
            <div className="h-full overflow-y-auto">
              <ActivityTimelinePage projects={dash.projects} />
            </div>
          ) : dash.activeView === 'insights' ? (
            <div className="h-full overflow-y-auto">
              <InsightsPage />
            </div>
          ) : dash.activeView === 'ai-governance' ? (
            <div className="h-full overflow-y-auto">
              <AiGovernancePage />
            </div>
          ) : dash.activeView === 'projects' ? (
            <div className="h-full overflow-y-auto">
              <AllProjects
                busyProjectId={dash.actionProjectId}
                onDelete={(project) => void dash.handleDeleteProject(project.id)}
                onEdit={(project) => dash.setEditingProject(project)}
                onNewProject={() => dash.setIsProjectCreateModalOpen(true)}
                onOpen={(id) => navigate(`/projects/${id}`)}
                onOpenSettings={(project) => {
                  if (project.currentUserRole === 'ADMIN') {
                    navigate(`/projects/${project.id}`);
                    setIsProjectSettingsOpen(true);
                  }
                }}
                reloadKey={dash.projectsVersion}
              />
            </div>
          ) : dash.activeView === 'telemetry' ? (
            <div className="h-full overflow-y-auto">
              <TelemetryPage projects={dash.projects} />
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
                  else dash.setSelectedTaskId(task.id);
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
              {taskInspector}
            </div>
          ) : (
            /* 3-column workspace */
            <div className="flex h-full flex-col overflow-hidden">
              <div className="header-band shrink-0 border-b border-slate-200 px-3 py-2.5 sm:px-5 lg:px-6">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <IconTile className="hidden sm:inline-flex" icon={Folder} size="md" tone="sky" />
                    <Select
                      aria-label="Switch project"
                      onValueChange={dash.handleProjectSelect}
                      options={dash.projects.map((project) => ({ value: project.id, label: project.name }))}
                      triggerClassName="h-8 max-w-[60vw] rounded-md pl-1.5 -ml-1.5 text-lg font-semibold tracking-tight text-slate-900 hover:bg-slate-100 sm:max-w-none"
                      value={dash.activeProject.id}
                    />
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                    <GovernanceReadyBadge projectId={dash.activeProject.id} refreshKey={dash.selectedTaskId} />
                    <ProjectLabelChip
                      // Remount after the edit dialog closes so a new label shows at once.
                      key={`${dash.activeProject.id}:${dash.editingProject ? 'editing' : 'view'}`}
                      onEdit={dash.canManageTeam ? () => dash.setEditingProject(dash.activeProject) : undefined}
                      projectId={dash.activeProject.id}
                    />
                    <AiSpend className="hidden md:inline-flex" projectId={dash.activeProject.id} />
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
                    {dash.activePermissions.prompts ? (
                      <button
                        className={headerButtonCls}
                        data-testid="run-prompt-button"
                        onClick={() => setIsRunPromptOpen(true)}
                        type="button"
                      >
                        <Sparkles size={16} />
                        <HeaderLabel>Run prompt</HeaderLabel>
                      </button>
                    ) : null}
                    {dash.canManageTeam ? (
                      <button
                        className={headerButtonCls}
                        data-testid="project-settings-button"
                        onClick={() => setIsProjectSettingsOpen(true)}
                        type="button"
                      >
                        <SlidersHorizontal size={16} />
                        <HeaderLabel>Settings</HeaderLabel>
                      </button>
                    ) : null}
                    <ProjectMoreMenu
                      items={[
                        { label: 'Project notes', icon: MessageSquare, onSelect: () => dash.handleOpenProjectNotesPanel(dash.activeProject!) },
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
                    {dash.activePermissions.aiPlanner ? (
                      <Button icon={Zap} onClick={() => dash.setIsAiPlanningWorkspaceOpen(true)} variant="primary">
                        AI Planner
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 transition-[padding] duration-200 sm:p-4 lg:flex-row lg:overflow-hidden lg:px-6 lg:py-4',
                  // On wide screens the task panel sits beside the list instead of covering it.
                  dash.selectedTaskId && dash.activeTask && 'xl:pr-[456px]'
                )}
              >
                {/* Column 1 — Epics */}
                <div className={`flex max-h-[32vh] w-full shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-card)] transition-[width] duration-300 ease-in-out lg:h-full lg:max-h-none ${dash.isSidebarCollapsed ? 'lg:w-14' : 'lg:w-[272px]'}`}>
                  <div className={`flex items-center justify-between gap-2 border-b border-slate-100 py-2.5 ${dash.isSidebarCollapsed ? 'px-3 lg:flex-col lg:gap-3 lg:px-2' : 'px-4'}`}>
                    {!dash.isSidebarCollapsed ? (
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="m-0 text-sm font-semibold tracking-tight text-slate-900">Epics</h3>
                        <Badge className="tabular-nums">{dash.activeProjectEpics.length}</Badge>
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
                      {dash.activeProjectEpics.length > 0 ? (
                        <button
                          aria-pressed={!dash.selectedEpicId}
                          className={cn(
                            'flex h-9 items-center gap-2 rounded-lg border px-2.5 text-left text-sm transition-colors duration-150',
                            !dash.selectedEpicId ? 'border-brand-200 bg-brand-50 font-medium text-slate-900' : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50'
                          )}
                          data-testid="all-epics"
                          onClick={() => dash.handleEpicSelect(null)}
                          type="button"
                        >
                          <Layers3 className="text-slate-500" size={14} />
                          All epics
                          <span className="ml-auto font-mono text-xs text-slate-500">{dash.visibleTasks.length}</span>
                        </button>
                      ) : null}
                      {dash.activeProjectEpics.map(epic => {
                        const isActive = dash.selectedEpicId === epic.id;
                        return (
                          <div
                            key={epic.id}
                            className={cn(
                              'group relative flex cursor-pointer flex-col gap-1 rounded-lg border px-2.5 py-2 transition-colors duration-150',
                              isActive
                                ? 'border-brand-200 bg-brand-50'
                                : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                            )}
                            onClick={() => dash.handleEpicSelect(isActive ? null : epic.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="m-0 flex min-w-0 items-center gap-2 truncate text-sm font-medium leading-snug text-slate-900">
                                <span aria-hidden className="h-2 w-2 shrink-0 rounded-sm" style={{ background: tagColor(epic.id) }} />
                                <span className="truncate">{epic.name}</span>
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
                {/* On a phone the panel is as tall as its list and the page scrolls; flex-1 here squeezed the list into a strip. */}
                <div className="flex min-w-0 flex-none flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-card)] lg:h-full lg:min-h-0 lg:flex-1">
                  {dash.selectedEpicId || dash.activeProjectEpics.length > 0 || dash.visibleTasks.length > 0 || dash.taskFilters.status !== 'all' || dash.taskFilters.assigneeId !== 'all' || dash.taskFilters.search.trim() !== '' ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
                        <div className="min-w-0">
                          <h3 className="m-0 truncate text-sm font-semibold tracking-tight text-slate-900">{dash.tasksHeading}</h3>
                          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                            <span className="max-w-[200px] truncate">
                              {dash.selectedEpicId ? dash.epics.find(e => e.id === dash.selectedEpicId)?.name : 'All epics'}
                            </span>
                            <span aria-hidden className="text-slate-300">·</span>
                            <span className="shrink-0">
                              {columnTasks.length} {columnTasks.length === 1 ? 'Task' : 'Tasks'}
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
                            {dash.activePermissions.time ? (
                              <button
                                aria-pressed={dash.viewMode === 'week'}
                                onClick={() => dash.setViewMode('week')}
                                className={`flex h-7 w-8 items-center justify-center rounded-md transition-colors ${dash.viewMode === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                data-testid="week-view-button"
                                title="Weekly time"
                                type="button"
                              >
                                <Clock size={16} />
                              </button>
                            ) : null}
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
                        <SlaDashboard enabled={dash.activeProject?.slaEnabled !== false} projectId={dash.activeProject?.id ?? null} refreshKey={dash.tasks} workspaceId={dash.activeWorkspaceId ?? null} />
                        <TaskFilterBar
                          filters={dash.taskFilters}
                          onFilterChange={dash.setTaskFilters}
                          members={dash.activeProjectMembers}
                          onClear={dash.handleClearFilters}
                          states={dash.activeProjectStates}
                          statesLoading={!dash.activeProjectStatesLoaded}
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
                        {dash.viewMode === 'week' && dash.activePermissions.time && dash.activeProject ? (
                          <WeeklyTimesheet isAdmin={dash.canManageTeam} key={dash.activeProject.id} projectId={dash.activeProject.id} projectName={dash.activeProject.name} />
                        ) : dash.viewMode === 'list' || dash.viewMode === 'week' ? (
                          <div className="p-3 sm:p-4">
                            <TaskList
                              actionTaskId={dash.actionTaskId}
                              states={dash.activeProjectStates}
                              epics={dash.epics}
                              onDelete={(taskId) => {
                                const task = dash.tasks.find(t => t.id === taskId);
                                void dash.handleDeleteTask(taskId, task?.title ?? 'this task');
                              }}
                              onEditTask={(task) => dash.setEditingTask(task)}
                              onUpdateStatus={(task, status) => void dash.handleUpdateTaskStatus(task, status)}
                              onUpdateEpic={(task, epicId) => void dash.handleUpdateTaskEpic(task, epicId)}
                              projects={dash.projects}
                              tasks={columnTasks}
                              onSelectTask={(task) => dash.setSelectedTaskId(task.id)}
                              onViewSubtasks={(task) => setViewSubtasksTaskId(task.id)}
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
                              tasks={columnTasks}
                              states={dash.activeProjectStates}
                              statesLoading={!dash.activeProjectStatesLoaded}
                              onMoveToState={async (taskId, stateId) => {
                                const task = dash.tasks.find((t) => t.id === taskId);
                                if (task) await dash.handleMoveTaskToState(task, stateId);
                              }}
                              onUpdateStatus={async (taskId, status) => {
                                const task = dash.tasks.find(t => t.id === taskId);
                                if (task) await dash.handleUpdateTaskStatus(task, status, true);
                              }}
                              onSelectTask={(task) => dash.setSelectedTaskId(task.id)}
                              onViewSubtasks={(task) => setViewSubtasksTaskId(task.id)}
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
                      <h4 className="m-0 text-sm font-semibold text-slate-900">No tasks yet</h4>
                      <p className="m-0 mt-1 max-w-xs text-sm text-slate-500">
                        Add your first task now. Epics are optional: use them later to group related work.
                      </p>
                      {dash.canManageActiveProject ? (
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                          <Button
                            icon={Plus}
                            onClick={() => {
                              dash.setTaskModalProjectId(dash.activeProject?.id ?? null);
                              dash.setIsTaskCreateModalOpen(true);
                            }}
                            variant="primary"
                          >
                            Add task
                          </Button>
                          <Button icon={Layers3} onClick={() => dash.setIsEpicCreateModalOpen(true)} variant="secondary">
                            Add epic
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Column 3 — Task Inspector */}
                {taskInspector}
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
          <div className="mt-4 border-t border-slate-100 pt-4" data-testid="project-data-label">
            <div className="mb-1.5 text-[13px] font-medium text-slate-700">Data label</div>
            <ClassificationSelect projectId={dash.editingProject.id} />
            <p className="m-0 mt-1.5 text-xs text-slate-500">Decides how strictly agents are governed here; saved as soon as you pick it. Tasks use it unless they have their own label.</p>
          </div>
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
      {viewSubtasksTaskId && (() => {
        const viewed = dash.tasks.find((t) => t.id === viewSubtasksTaskId);
        return viewed ? (
          <SubtasksModal
            editingSubtask={dash.editingSubtask}
            isUpdating={dash.actionTaskId === viewed.id}
            members={viewed.projectId ? (dash.projectMembersByProject?.[viewed.projectId] ?? dash.activeProjectMembers) : dash.activeProjectMembers}
            onAddSubtask={(t) => dash.setSubtaskModalTask(t)}
            onClose={() => setViewSubtasksTaskId(null)}
            onDeleteSubtask={dash.handleDeleteSubtask}
            onOpenSubtaskNote={dash.handleOpenSubtaskNote}
            onUpdateStatus={dash.handleUpdateSubtaskStatus}
            onUpdateSubtask={dash.handleUpdateSubtask}
            setEditingSubtask={dash.setEditingSubtask}
            task={viewed}
          />
        ) : null;
      })()}
      {isRunPromptOpen && dash.activeProject && dash.activeWorkspaceId && (
        <RunPromptModal
          epics={dash.activeProjectEpics}
          onClose={() => setIsRunPromptOpen(false)}
          onTasksCreated={() => void dash.loadDashboard()}
          projectId={dash.activeProject.id}
          projectName={dash.activeProject.name}
          workspaceId={dash.activeWorkspaceId}
        />
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
            canManageTeam={dash.activePermissions.team}
            currentUserId={dash.user?.id ?? null}
            isMutating={dash.teamMutationLoading}
            members={dash.activeProjectMembers}
            projectId={dash.activeProject.id}
            onInviteMember={dash.handleInviteProjectMember}
            workspaceId={dash.activeWorkspaceId ?? null}
            onAddWorkspaceMember={dash.handleAddWorkspaceMemberToProject}
            onRemoveMember={dash.handleRemoveProjectMember}
            onLeaveProject={dash.handleLeaveProject}
          />
        </Modal>
      )}
      {isProjectSettingsOpen && dash.activeProject && dash.canManageTeam && (
        <Modal
          bodyClassName="!p-0"
          onClose={() => setIsProjectSettingsOpen(false)}
          panelClassName="!max-w-[860px]"
          title={`Settings: ${dash.activeProject.name}`}
        >
          <ProjectSettings
            currentUserId={dash.user?.id ?? null}
            isAdmin={dash.canManageTeam}
            members={dash.activeProjectMembers}
            myPermissions={dash.activePermissions}
            onChanged={() => void Promise.all([dash.loadProjectTeam(dash.activeProject!.id), dash.loadDashboard({ quiet: true })])}
            onEditDetails={() => {
              setIsProjectSettingsOpen(false);
              dash.setEditingProject(dash.activeProject);
            }}
            onOpenAiSettings={() => {
              setIsProjectSettingsOpen(false);
              dash.setActiveView('settings');
            }}
            project={dash.activeProject}
            teamPanel={
              <ProjectTeamPanel
                canManageTeam={dash.activePermissions.team}
                currentUserId={dash.user?.id ?? null}
                isMutating={dash.teamMutationLoading}
                members={dash.activeProjectMembers}
                onAddWorkspaceMember={dash.handleAddWorkspaceMemberToProject}
                onInviteMember={dash.handleInviteProjectMember}
                onLeaveProject={dash.handleLeaveProject}
                onRemoveMember={dash.handleRemoveProjectMember}
                projectId={dash.activeProject.id}
                workspaceId={dash.activeWorkspaceId ?? null}
              />
            }
            workflowPanel={<ProjectWorkflowStatesPanel canManage={dash.canManageTeam} onChanged={() => void dash.loadProjectStates(dash.activeProject!.id)} projectId={dash.activeProject.id} />}
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
            openingNoteId={dash.openingNoteId}
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
            openingNoteId={dash.openingNoteId}
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
