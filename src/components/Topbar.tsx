import React from 'react';
import { Bell } from 'lucide-react';
import UserAvatar from './UserAvatar';
import NotificationBox, { Notification } from './NotificationBox';

interface TopbarProps {
  title: string;
  breadcrumbs?: React.ReactNode;
  user: { name: string | null; email: string };
  notifications: Notification[];
  isNotificationsOpen: boolean;
  onNotificationsToggle: () => void;
  onNotificationsClose: () => void;
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onNotificationClick: (notification: Notification) => void;
  rightContent?: React.ReactNode;
}

const Topbar: React.FC<TopbarProps> = ({
  title,
  breadcrumbs,
  user,
  notifications,
  isNotificationsOpen,
  onNotificationsToggle,
  onNotificationsClose,
  onMarkAsRead,
  onClearAll,
  onNotificationClick,
  rightContent
}) => {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="relative z-50 flex items-center justify-between gap-4 px-6 h-[52px] shrink-0 bg-white border-b border-slate-200">
      {/* Left — title + breadcrumbs */}
      <div className="flex items-center gap-1.5 min-w-0">
        {breadcrumbs ? (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[0.8rem] text-slate-400 min-w-0">
            {breadcrumbs}
          </nav>
        ) : (
          <h1 className="text-[0.875rem] font-semibold text-slate-900 truncate">{title}</h1>
        )}
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {rightContent}

        {/* Bell */}
        <div className="relative">
          <button
            aria-label="Notifications"
            className="relative flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            onClick={onNotificationsToggle}
            type="button"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {isNotificationsOpen && (
            <NotificationBox
              notifications={notifications}
              onClose={onNotificationsClose}
              onMarkAsRead={onMarkAsRead}
              onClearAll={onClearAll}
              onNotificationClick={onNotificationClick}
            />
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <UserAvatar name={user.name} email={user.email} size="sm" showTooltip={false} />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-[0.75rem] font-medium text-slate-800">{user.name || 'User'}</span>
            <span className="text-[0.65rem] text-slate-400">{user.email}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;