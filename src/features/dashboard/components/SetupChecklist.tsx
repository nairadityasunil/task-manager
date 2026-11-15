import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, cn } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/features/workspaces';
import { workspaceService } from '@/features/workspaces/services/workspaceService';
import { listIntegrations } from '@/lib/sdk-integrations/api';

interface Step {
  id: string;
  title: string;
  detail: string;
  done: boolean;
  action: string;
  run: () => void;
}

const storageKey = (userId?: string) => `pristine.setup.dismissed.${userId ?? 'anon'}`;

/** "Finish setting up": four first steps, each checked from real workspace state. */
export function SetupChecklist({
  projectCount,
  onNewProject
}: {
  projectCount: number;
  onNewProject: () => void;
}): JSX.Element | null {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [integrationCount, setIntegrationCount] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey(user?.id)) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (dismissed) return;
    let cancelled = false;
    if (activeWorkspace?.id) {
      workspaceService
        .listMembers(activeWorkspace.id)
        .then((members) => !cancelled && setMemberCount(members.length))
        .catch(() => !cancelled && setMemberCount(0));
    }
    listIntegrations()
      .then((items) => !cancelled && setIntegrationCount(items.length))
      .catch(() => !cancelled && setIntegrationCount(0));
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace?.id, dismissed]);

  if (dismissed || memberCount == null || integrationCount == null) return null;

  const aiReady = Boolean(
    user?.geminiApiKeyConfigured || user?.openaiApiKeyConfigured || user?.anthropicApiKeyConfigured || user?.aiPlatformProviders?.length
  );
  const steps: Step[] = [
    { id: 'project', title: 'Create your first project', detail: 'Projects hold epics and tasks.', done: projectCount > 0, action: 'New project', run: onNewProject },
    {
      id: 'team',
      title: 'Invite your team',
      detail: 'Add people to the workspace so you can assign work.',
      done: memberCount > 1,
      action: 'Invite',
      run: () => navigate('/settings?tab=workspace&invite=1')
    },
    {
      id: 'ai',
      title: 'Connect an AI provider',
      detail: 'Plan projects and break down tasks. Gemini has a free tier.',
      done: aiReady,
      action: 'Connect',
      run: () => navigate('/settings?tab=profile&section=ai')
    },
    {
      id: 'sdk',
      title: 'Add the SDK to your app',
      detail: 'Show guides and surveys to your users. About 5 minutes.',
      done: integrationCount > 0,
      action: 'View steps',
      run: () => navigate('/sdk-integrations')
    }
  ];
  const doneCount = steps.filter((step) => step.done).length;
  if (doneCount === steps.length) return null;
  const nextId = steps.find((step) => !step.done)?.id;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey(user?.id), '1');
    } catch {
      /* storage unavailable: hidden for this visit only */
    }
  };

  return (
    <section aria-labelledby="setup-title" className="rounded-[10px] border border-slate-200 bg-white" data-testid="setup-checklist">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
        <h2 className="m-0 text-sm font-semibold text-slate-900" id="setup-title">
          Finish setting up
        </h2>
        <span className="font-mono text-xs text-slate-500">
          {doneCount} of {steps.length}
        </span>
        <span aria-hidden className="flex gap-[3px]">
          {steps.map((step) => (
            <span className={cn('h-1 w-[18px] rounded-sm', step.done ? 'bg-slate-900' : 'bg-slate-200')} key={step.id} />
          ))}
        </span>
        <Button className="ml-auto" onClick={dismiss} size="sm" variant="ghost">
          Dismiss
        </Button>
      </div>
      <ul className="m-0 list-none p-0">
        {steps.map((step) => (
          <li className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-b-0" key={step.id}>
            {step.done ? (
              <span aria-label="Done" className="inline-grid h-4 w-4 shrink-0 place-items-center rounded-full bg-slate-600" role="img">
                <svg aria-hidden fill="none" height="10" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" viewBox="0 0 24 24" width="10">
                  <path d="m5 12 5 5 9-10" />
                </svg>
              </span>
            ) : (
              <span aria-label="To do" className="h-4 w-4 shrink-0 rounded-full border-[1.5px] border-slate-400" role="img" />
            )}
            <div className="min-w-[200px] flex-1">
              <div className={cn('text-[13px]', step.done ? 'text-slate-500 line-through' : 'font-medium text-slate-900')}>{step.title}</div>
              {!step.done ? <div className="text-[13px] text-slate-600">{step.detail}</div> : null}
            </div>
            {!step.done ? (
              <Button onClick={step.run} size="sm" variant={step.id === nextId ? 'primary' : 'secondary'}>
                {step.action}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
