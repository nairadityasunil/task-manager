import { useEffect, useState } from 'react';

import projectStateService, { type ProjectState } from '@/services/projectStates';

import { sortStates } from './workflowStates';

/**
 * The workflow states of one project, for forms that pick a status. `loaded` is false while they load (and
 * for a task with no project), so a form can wait instead of showing the built-in statuses and then switching.
 */
export function useProjectStates(projectId: string | null | undefined): { states: ProjectState[]; loaded: boolean } {
  const [state, setState] = useState<{ id: string | null; states: ProjectState[] }>({ id: null, states: [] });

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    projectStateService
      .getProjectStates(projectId)
      .then((list) => !cancelled && setState({ id: projectId, states: sortStates(list) }))
      .catch(() => !cancelled && setState({ id: projectId, states: [] }));
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (!projectId) return { states: [], loaded: true };
  return state.id === projectId ? { states: state.states, loaded: true } : { states: [], loaded: false };
}
