'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, RefreshCw } from 'lucide-react';
import { useNotifications } from '@/features/notifications';
import NotificationItem from './components/NotificationItem';
import EmptyState from './components/EmptyState';
import type { Notification } from '@/features/types/notification';

function resolveNotificationRoute(n: Notification): string | null {
  const sessionId = n.metadata?.sessionId as string | undefined;
  switch (n.type) {
    case 'session_request':
    case 'booking_confirmed':
    case 'booking_cancelled':
      return sessionId ? `/sessions` : '/sessions';
    case 'chat_request':
    case 'session_started':
    case 'group_study_invite':
      return sessionId ? `/live-chat/${sessionId}` : null;
    default:
      return null;
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAllRead,   // markRead(id) removed — no per-notification endpoint exists
  } = useNotifications();

  // Auto-mark all read when the page is visited
  useEffect(() => {
    if (unreadCount > 0) markAllRead();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="glass-soft w-10 h-10 rounded-xl flex items-center justify-center">
            <Bell className="text-white/80" size={18} />
          </div>

          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Notifications
            </h1>
            <p className="text-xs text-white/40">
              {loading
                ? 'Loading notifications…'
                : unreadCount > 0
                ? `${unreadCount} unread`
                : 'All caught up'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={refresh}
            disabled={loading}
            className="glass-soft px-3 py-2 rounded-lg text-white/50 hover:text-white/80 transition disabled:opacity-50"
            title="Refresh notifications"
            type="button"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs px-3 py-2 rounded-lg bg-blue-500/15 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition"
              type="button"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="surface rounded-2xl px-4 py-10 text-center">
          <p className="text-sm text-red-300/90">Could not load notifications.</p>
          <button
            onClick={refresh}
            className="mt-3 text-xs text-white/60 hover:text-white/90 transition"
            type="button"
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl p-4 panel"
            >
              <div className="flex justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-white/10 animate-pulse" />
                  <div className="h-3 w-64 max-w-full rounded bg-white/10 animate-pulse" />
                </div>
                <div className="mt-1 h-2 w-2 rounded-full bg-white/10 animate-pulse shrink-0" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              // No per-notification read endpoint — clicking just marks all read visually
              // Real-time socket events keep the list fresh
              onClick={() => {
                if (unreadCount > 0) markAllRead();
                const route = resolveNotificationRoute(notification);
                if (route) router.push(route);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}