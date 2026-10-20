import React from 'react';
import { Bell, Menu } from 'lucide-react';
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
  /** Opens the navigation drawer on small screens. */
  onMenuClick?: () => void;
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
  rightContent,
  onMenuClick
}) => {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="relative z-50 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 sm:px-5 lg:px-6">
      {/* Left: menu, title / breadcrumbs */}
      <div className="flex min-w-0 items-center gap-1.5">
        {onMenuClick && (
          <button
            aria-label="Open navigation"
            className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            onClick={onMenuClick}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <h1 className="m-0 truncate text-[15px] font-semibold text-slate-900 md:hidden">{title}</h1>
        {breadcrumbs ? (
          <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-[13px] text-slate-500 md:flex">
            {breadcrumbs}
          </nav>
        ) : (
          <h1 className="m-0 hidden truncate text-sm font-semibold text-slate-900 md:block">{title}</h1>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-1">
        {rightContent}

        <div className="relative">
          <button
            aria-expanded={isNotificationsOpen}
            aria-label="Notifications"
            className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              isNotificationsOpen ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`}
            onClick={onNotificationsToggle}
            type="button"
            title="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.9} />
            {unreadCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-white">
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

        <div className="ml-1 flex items-center gap-2.5 border-l border-slate-200 pl-2.5 sm:ml-1.5 sm:pl-3">
          <UserAvatar name={user.name} email={user.email} size="md" showTooltip={false} />
          <div className="hidden min-w-0 flex-col leading-tight xl:flex">
            <span className="max-w-[160px] truncate text-[13px] font-medium text-slate-900">{user.name || 'User'}</span>
            <span className="max-w-[160px] truncate text-xs text-slate-500">{user.email}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
