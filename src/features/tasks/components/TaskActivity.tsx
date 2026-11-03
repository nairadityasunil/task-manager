import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot } from 'lucide-react';

import { getProjectActivities, type ActivityLog } from '@/services/activity';
import { timeAgo } from '@/services/agents';

/** Who changed this task and its sub-tasks, with changes made by AI agents marked and linked. */
export function TaskActivity({ projectId, entityIds, refreshKey }: { projectId: string; entityIds: string[]; refreshKey?: unknown }): JSX.Element | null {
  const [items, setItems] = useState<ActivityLog[] | null>(null);
  const key = entityIds.join(',');

  useEffect(() => {
    if (!projectId || !key) return;
    let cancelled = false;
    getProjectActivities(projectId, { entityIds: key.split(','), limit: 15 })
      .then((result) => !cancelled && setItems(result.activities))
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, [projectId, key, refreshKey]);

  if (!projectId) return null;
  return (
    <section aria-labelledby="task-activity-title" className="rounded-lg border border-slate-200" data-testid="task-activity">
      <h3 className="m-0 border-b border-slate-100 px-3.5 py-2.5 text-[13px] font-semibold text-slate-900" id="task-activity-title">
        Activity
      </h3>
      {items == null ? (
        <div className="m-3 h-10 animate-pulse rounded bg-slate-50" />
      ) : items.length === 0 ? (
        <p className="m-0 px-3.5 py-3 text-[13px] text-slate-500">No changes recorded yet.</p>
      ) : (
        <ol className="m-0 grid list-none gap-0 p-0">
          {items.map((item) => {
            const agent = item.metadata?.agent as { id?: string; name?: string } | undefined;
            return (
              <li className="flex gap-2.5 border-b border-slate-100 px-3.5 py-2.5 text-[13px] last:border-b-0" key={item.id}>
                <div className="min-w-0 flex-1">
                  <div className="text-slate-800">{item.description}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    {agent ? (
                      <Link
                        className="inline-flex items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 font-medium text-violet-800 hover:bg-violet-100"
                        data-testid="activity-agent"
                        title="Changed by an AI agent; open it in Agent Governance"
                        to={agent.id ? `/agents/inventory?agent=${agent.id}` : '/agents/activity'}
                      >
                        <Bot size={11} />
                        {agent.name ?? 'Agent'}
                      </Link>
                    ) : null}
                    <span>
                      {agent ? `for ${item.userName}` : item.userName} · {timeAgo(item.createdAt)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
