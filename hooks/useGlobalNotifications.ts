'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { notificationsApi } from '@/lib/api';
import type { Notification } from '@/components/types/notification';

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const { subscribe } = useSocket();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const mapNotification = useCallback((n: any): Notification => ({
    id:        String(n.id),
    title:     String(n.title ?? ''),
    body:      String(n.body ?? n.message ?? ''),
    read:      Boolean(n.read ?? n.is_read),
    createdAt: String(n.createdAt ?? n.created_at ?? new Date().toISOString()),
    type:      n.type ?? undefined,
    data:      n.data ?? undefined,
  }), []);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);

      const data = await notificationsApi.getAll();
      const mapped: Notification[] = (data.notifications ?? []).map(mapNotification);

      setNotifications(mapped);
      setUnreadCount(mapped.filter((n) => !n.read).length);
    } catch {
      setError('Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, mapNotification]);

  // Initial load
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      setLoading(false);
      return;
    }
    refresh();
  }, [isAuthenticated, refresh]);

  // Real-time socket listener
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsub = subscribe('notification:new', (payload: any) => {
      const incoming: Notification = {
        id:        String(payload.id ?? Date.now()),
        title:     payload.title ?? '',
        body:      payload.body ?? payload.message ?? '',
        read:      false,
        createdAt: payload.createdAt ?? new Date().toISOString(),
        type:      payload.type ?? undefined,
        data:      payload.data ?? undefined,
      };

      setNotifications((prev) => {
        if (prev.some((n) => n.id === incoming.id)) return prev;
        return [incoming, ...prev];
      });

      setUnreadCount((count) => count + 1);
    });

    return unsub;
  }, [isAuthenticated, subscribe]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      await notificationsApi.markRead(id);
    } catch {
      // silent — optimistic update stays
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!isAuthenticated) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await notificationsApi.markAllRead();
    } catch {
      // silent — optimistic update stays
    }
  }, [isAuthenticated]);

  return { notifications, unreadCount, loading, error, refresh, markRead, markAllRead };
}
