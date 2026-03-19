'use client';

/**
 * useNotifications
 *
 * Fetches and manages the notification inbox.
 *
 * Backend endpoints:
 *   GET  /api/notifications          → { success, notifications }
 *   POST /api/notifications/read-all → { success }
 *
 * ⚠️  There is NO per-notification mark-read endpoint.
 *     PATCH /api/notifications/:id/read does NOT exist.
 *     Only bulk markAllRead is available.
 *
 * Real-time: listens to socket event 'notification:new'.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { notificationsApi } from '@/lib/api';
import type { Notification } from '@/lib/api';

function isExpired(n: Notification): boolean {
  if (!n.expiresAt) return false;
  return new Date(n.expiresAt) <= new Date();
}

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const { subscribe }       = useSocket();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      setError(null);
      const data   = await notificationsApi.getAll();
      const active = (data.notifications ?? []).filter(n => !isExpired(n));
      setNotifications(active);
      setUnreadCount(active.filter(n => !n.isRead).length);
    } catch {
      setError('Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

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

  /* ── Real-time socket listener ── */

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsub = subscribe('notification:new', (payload: any) => {
      const incoming: Notification = {
        id:        String(payload.id ?? Date.now()),
        type:      payload.type    ?? 'system',
        title:     payload.title   ?? '',
        body:      payload.body    ?? payload.message ?? null,
        metadata:  payload.metadata ?? null,
        isRead:    false,
        createdAt: payload.createdAt ?? new Date().toISOString(),
        expiresAt: payload.expiresAt ?? null,
      };

      if (isExpired(incoming)) return;

      setNotifications(prev => {
        if (prev.some(n => n.id === incoming.id)) return prev;
        return [incoming, ...prev];
      });
      setUnreadCount(count => count + 1);
    });

    return unsub;
  }, [isAuthenticated, subscribe]);

  /* ── Mark all read ──
   * Optimistic update — if POST fails, rollback via refresh.
   */
  const markAllRead = useCallback(async () => {
    if (!isAuthenticated) return;

    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await notificationsApi.markAllRead();
    } catch {
      await refresh();
    }
  }, [isAuthenticated, refresh]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAllRead,
  };
}