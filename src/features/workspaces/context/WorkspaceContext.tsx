import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { workspaceService } from '../services/workspaceService';
import type { Workspace } from '../types/workspace';

const ACTIVE_WS_KEY = 'active_workspace_id';
const RECENT_COUNT = 5;

/** Most recently opened first; workspaces never opened keep the order they were created in. */
const sortRecent = (list: Workspace[]): Workspace[] =>
  [...list].sort((a, b) => {
    const at = a.lastUsedAt ? Date.parse(a.lastUsedAt) : -1;
    const bt = b.lastUsedAt ? Date.parse(b.lastUsedAt) : -1;
    if (at !== bt) return bt - at;
    return Date.parse(a.createdAt) - Date.parse(b.createdAt);
  });

interface WorkspaceContextValue {
  /** Every workspace of the person, most recently opened first. */
  workspaces: Workspace[];
  /** The five most recently opened (the open one is always among them). */
  recentWorkspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeWorkspaceId: string;
  isLoading: boolean;
  switchWorkspace: (workspace: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string, slug?: string) => Promise<Workspace>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

function getPersistedWorkspaceId(): string {
  return localStorage.getItem(ACTIVE_WS_KEY) ?? '';
}

/** Makes this workspace the one to open next (used after joining through an invitation). */
export function rememberActiveWorkspace(id: string): void {
  localStorage.setItem(ACTIVE_WS_KEY, id);
}

function persistWorkspaceId(id: string): void {
  localStorage.setItem(ACTIVE_WS_KEY, id);
}

interface WorkspaceProviderProps {
  children: React.ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps): JSX.Element {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(getPersistedWorkspaceId);
  const [isLoading, setIsLoading] = useState(true);
  const markedOnLoad = useRef(false);

  const loadWorkspaces = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = sortRecent(await workspaceService.listWorkspaces());
      setWorkspaces(list);

      // Restore persisted selection or default to first
      const persisted = getPersistedWorkspaceId();
      const isValid = persisted && list.some((w) => w.id === persisted);
      const openId = isValid ? persisted : (list[0]?.id ?? '');
      if (isValid) {
        setActiveWorkspaceId(persisted);
      } else if (list.length > 0) {
        setActiveWorkspaceId(openId);
        persistWorkspaceId(openId);
      }
      // Opening the app opens that workspace: count it as used once per page load.
      if (openId && !markedOnLoad.current) {
        markedOnLoad.current = true;
        void workspaceService.markUsed(openId).catch(() => undefined);
      }
    } catch {
      // Non-fatal — workspace list will be empty
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load workspaces once sign-in has finished, and again when the user
  // changes. Fetching earlier (e.g. while a Google sign-in is still being
  // confirmed) sends a stale or missing token and gets a 401.
  const signedInUserId = !authLoading && isAuthenticated ? user?.id ?? null : null;
  useEffect(() => {
    if (!signedInUserId) {
      setWorkspaces([]);
      setIsLoading(false);
      return;
    }
    void loadWorkspaces();
  }, [signedInUserId, loadWorkspaces]);

  const switchWorkspace = useCallback((workspace: Workspace) => {
    setActiveWorkspaceId(workspace.id);
    persistWorkspaceId(workspace.id);
    // Opening a workspace makes it the most recent one, here at once and on the server for next time.
    const now = new Date().toISOString();
    setWorkspaces((prev) => sortRecent(prev.map((w) => (w.id === workspace.id ? { ...w, lastUsedAt: now } : w))));
    void workspaceService.markUsed(workspace.id).catch(() => undefined);
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    await loadWorkspaces();
  }, [loadWorkspaces]);

  const createWorkspace = useCallback(
    async (name: string, slug?: string): Promise<Workspace> => {
      const created = await workspaceService.createWorkspace(name, slug);
      setWorkspaces((prev) => sortRecent([...prev, { ...created, lastUsedAt: new Date().toISOString() }]));
      switchWorkspace(created);
      return created;
    },
    [switchWorkspace],
  );

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0] ?? null,
    [workspaces, activeWorkspaceId],
  );

  const recentWorkspaces = useMemo(() => {
    const top = workspaces.slice(0, RECENT_COUNT);
    if (activeWorkspace && !top.some((w) => w.id === activeWorkspace.id)) return [...top.slice(0, RECENT_COUNT - 1), activeWorkspace];
    return top;
  }, [workspaces, activeWorkspace]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      recentWorkspaces,
      activeWorkspace,
      activeWorkspaceId: activeWorkspace?.id ?? '',
      isLoading,
      switchWorkspace,
      refreshWorkspaces,
      createWorkspace,
    }),
    [workspaces, recentWorkspaces, activeWorkspace, isLoading, switchWorkspace, refreshWorkspaces, createWorkspace],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return ctx;
}

export default WorkspaceProvider;
