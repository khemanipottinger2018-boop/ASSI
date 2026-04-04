'use client';

/**
 * NotificationsContext
 *
 * Provides a single shared notification state across the entire app.
 * All consumers (Sidebar badge, notifications page, etc.) read from
 * the same instance — so markAllRead() in one place updates all.
 *
 * Wrap the app once with <NotificationsProvider> inside SocketProvider.
 * Call useNotifications() anywhere to consume.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAuth }    from '@/features/auth';
import { useSocket }  from '@/features/socket';
import { notificationsApi, messagesApi } from '@/lib/api';
import type { Notification } from '@/features/types/notification';

interface NotificationsState {
  notifications:      Notification[];
  unreadCount:        number;
  notifUnreadCount:   number;
  messageUnreadCount: number;
  loading:            boolean;
  error:              string | null;
  refresh:            () => Promise<void>;
  markAllRead:        () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsState | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { subscribe }       = useSocket();

  const [notifications,      setNotifications]      = useState<Notification[]>([]);
  const [notifUnreadCount,   setNotifUnreadCount]   = useState(0);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [loading,            setLoading]            = useState(false);
  const [error,              setError]              = useState<string | null>(null);

  const unreadCount = notifUnreadCount + messageUnreadCount;

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      setError(null);

      const [notifData, msgData] = await Promise.allSettled([
        notificationsApi.getAll(),
        messagesApi.getUnreadCount(),
      ]);

      if (notifData.status === 'fulfilled') {
        const all = notifData.value.notifications ?? [];
        setNotifications(all);
        setNotifUnreadCount(all.filter((n: Notification) => !n.isRead).length);
      }

      if (msgData.status === 'fulfilled') {
        setMessageUnreadCount(msgData.value.count ?? 0);
      }
    } catch {
      setError('Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Initial load + reset on auth change
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setNotifUnreadCount(0);
      setMessageUnreadCount(0);
      setError(null);
      setLoading(false);
      return;
    }
    refresh();
  }, [isAuthenticated, refresh]);

  // Real-time: new notification pushed via socket
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsub = subscribe('notification:new', (payload: any) => {
      const incoming: Notification = {
        id:        String(payload.id ?? Date.now()),
        type:      payload.type    ?? 'system',
        title:     payload.title   ?? '',
        body:      payload.body    ?? payload.message ?? null,
        metadata:  payload.data    ?? null,
        isRead:    false,
        createdAt: payload.createdAt ?? new Date().toISOString(),
        expiresAt: payload.expiresAt ?? null,
      };

      setNotifications(prev => {
        if (prev.some(n => n.id === incoming.id)) return prev;
        const updated = [incoming, ...prev];
        setNotifUnreadCount(updated.filter(n => !n.isRead).length);
        return updated;
      });
    });

    return unsub;
  }, [isAuthenticated, subscribe]);

  // Real-time: message badge bump
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubDirect    = subscribe('message:new',       () => setMessageUnreadCount(c => c + 1));
    const unsubBroadcast = subscribe('message:broadcast', () => setMessageUnreadCount(c => c + 1));

    return () => { unsubDirect(); unsubBroadcast(); };
  }, [isAuthenticated, subscribe]);

  const markAllRead = useCallback(async () => {
    if (!isAuthenticated) return;

    // Optimistic clear
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setNotifUnreadCount(0);

    try {
      await notificationsApi.markAllRead();
      await refresh();
    } catch {
      await refresh();
    }
  }, [isAuthenticated, refresh]);

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      notifUnreadCount,
      messageUnreadCount,
      loading,
      error,
      refresh,
      markAllRead,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsState {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
}
