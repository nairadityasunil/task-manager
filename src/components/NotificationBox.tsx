import React from 'react';
import { Link } from 'react-router-dom';

import { ApprovalRequestItem, type ApprovalDecision, type SecurityItem } from '@/features/agents/components/ApprovalRequest';
import type { AgentApproval } from '@/services/agents';
import { Bell, MessageCircle, UserPlus, X, ChevronRight } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'message' | 'team_join' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  link?: string;
  projectId?: string;
}

interface NotificationBoxProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onNotificationClick: (notification: Notification) => void;
  /** Agent actions waiting for this person's decision. */
  approvals?: AgentApproval[];
  /** Shadow AI, threat, DLP and drift alerts and open incidents. */
  security?: SecurityItem[];
  approvalBusyId?: string | null;
  onDecideApproval?: (approval: AgentApproval, decision: ApprovalDecision) => void;
}

const NotificationBox: React.FC<NotificationBoxProps> = ({
  notifications,
  onClose,
  onMarkAsRead,
  onClearAll,
  onNotificationClick,
  approvals = [],
  security = [],
  approvalBusyId = null,
  onDecideApproval,
}) => {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div
      className="fixed left-3 right-3 top-[58px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px]"
      style={{ zIndex: 9999 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="m-0 text-[15px] font-semibold text-slate-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[11px] font-medium leading-none text-white">
              {unreadCount} New
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              className="h-8 rounded-lg px-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              type="button"
            >
              Clear All
            </button>
          )}
          <button
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="custom-scrollbar max-h-[min(480px,70vh)] overflow-y-auto">
        {approvals.length > 0 && (
          <section aria-label="Agent approvals" className="border-b border-slate-200" data-testid="inbox-approvals">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <span className="text-xs font-medium text-slate-500">Agent approvals · {approvals.length}</span>
              <Link className="text-xs font-medium text-brand-600 hover:text-brand-700" onClick={onClose} to="/agents/approvals">
                Open all
              </Link>
            </div>
            {approvals.slice(0, 5).map((approval) => (
              <ApprovalRequestItem
                approval={approval}
                busy={approvalBusyId === approval.id}
                className="border-t border-slate-100 px-4 py-3 first-of-type:border-t-0"
                key={approval.id}
                onDecide={(decision) => onDecideApproval?.(approval, decision)}
              />
            ))}
          </section>
        )}
        {security.length > 0 && (
          <section aria-label="Security" className="border-b border-slate-200" data-testid="inbox-security">
            <div className="px-4 pb-1 pt-3 text-xs font-medium text-slate-500">Security · {security.length}</div>
            {security.map((item) => (
              <Link
                className="block border-t border-slate-100 px-4 py-2.5 first-of-type:border-t-0 hover:bg-slate-50"
                key={item.id}
                onClick={onClose}
                to={item.link}
              >
                <div className="flex items-center gap-2 text-[13px] font-medium text-slate-900">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.severity === 'critical' ? 'bg-red-500' : item.severity === 'warning' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                  <span className="truncate">{item.title}</span>
                </div>
                <div className="mt-0.5 line-clamp-2 pl-3.5 text-xs text-slate-500">{item.detail}</div>
              </Link>
            ))}
          </section>
        )}
        {notifications.length === 0 && (approvals.length > 0 || security.length > 0) ? null : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
              <Bell className="h-[18px] w-[18px]" />
            </div>
            <p className="m-0 text-sm font-medium text-slate-900">All caught up!</p>
            <p className="m-0 mt-1 text-[13px] text-slate-500">No new notifications at the moment.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => onNotificationClick(notification)}
                className={[
                  'group relative cursor-pointer px-4 py-3 transition-colors hover:bg-slate-50',
                  notification.isRead ? '' : 'bg-sky-50/40',
                ].join(' ')}
              >
                {!notification.isRead && (
                  <span className="absolute left-1.5 top-[22px] h-1.5 w-1.5 rounded-full bg-sky-500" />
                )}

                <div className="flex gap-3">
                  <div className={[
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    notification.type === 'team_join' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600',
                  ].join(' ')}>
                    {notification.type === 'message' ? <MessageCircle size={15} /> :
                      notification.type === 'team_join' ? <UserPlus size={15} /> :
                        <Bell size={15} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`m-0 text-sm leading-snug text-slate-900 ${notification.isRead ? 'font-normal' : 'font-medium'}`}>
                        {notification.title}
                      </h4>
                      <span className="shrink-0 text-xs text-slate-400">
                        {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="m-0 mt-0.5 line-clamp-2 text-[13px] text-slate-500">{notification.message}</p>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="flex items-center gap-0.5 text-xs font-medium text-slate-600 group-hover:text-slate-900">
                        View details <ChevronRight size={12} />
                      </span>
                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(notification.id);
                          }}
                          className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
                          type="button"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-2 text-center">
          <button
            onClick={onClose}
            className="h-8 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800"
            type="button"
          >
            Close Notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationBox;
