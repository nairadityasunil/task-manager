import { Link } from 'react-router-dom';

import { ApprovalRequestItem, usePendingApprovals } from '@/features/agents/components/ApprovalRequest';

/** Agent actions held for your decision, decided right here. */
export function WaitingOnYou(): JSX.Element {
  const { approvals, busy, decide } = usePendingApprovals(30_000);

  return (
    <section aria-labelledby="waiting-title" data-testid="waiting-on-you">
      <h2 className="m-0 mb-2 text-sm font-semibold text-slate-900" id="waiting-title">
        Waiting on you
      </h2>
      <div className="rounded-[10px] border border-slate-200 bg-white">
        {approvals == null ? (
          <div className="h-16 animate-pulse rounded-[10px] bg-slate-50" />
        ) : approvals.length === 0 ? (
          <p className="m-0 px-4 py-4 text-[13px] text-slate-600">Nothing is waiting on you.</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {approvals.slice(0, 4).map((approval) => (
              <li className="border-b border-slate-100 px-3.5 py-3 last:border-b-0" key={approval.id}>
                <ApprovalRequestItem approval={approval} busy={busy === approval.id} onDecide={(approve) => void decide(approval, approve)} />
              </li>
            ))}
          </ul>
        )}
        {approvals && approvals.length > 4 ? (
          <Link className="block border-t border-slate-100 px-4 py-2.5 text-[13px] text-brand-600 hover:text-brand-700" to="/agents/approvals">
            See all {approvals.length}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
