'use client';

/**
 * useNotifications
 *
 * Fetches and manages the notification inbox.
 * Now also fetches message unread count so the bell badge
 * reflects both notifications AND unread messages combined.
 *
 * Backend endpoints:
 *   GET  /api/notifications            → { success, notifications }
 *   POST /api/notifications/read-all   → { success }
 *   GET  /api/messages/unread-count    → { success, count }
 *
 * Real-time: listens to socket events:
 *   'notification:new'  — new notification pushed
 *   'message:new'       — new direct message (bumps badge)
 *   'message:broadcast' — new broadcast (bumps badge)
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth }           from '@/features/auth';
import { useSocket }         from '@/features/socket';
import { notificationsApi, messagesApi } from '@/lib/api';
import type { Notification } from '@/features/types/notification';

function isExpired(n: Notification): boolean {
  if (!n.expiresAt) return false;
  return new Date(n.expiresAt) <= new Date();
}

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const { subscribe }       = useSocket();

  const [notifications,       setNotifications]       = useState<Notification[]>([]);
  const [notifUnreadCount,    setNotifUnreadCount]    = useState(0);
  const [messageUnreadCount,  setMessageUnreadCount]  = useState(0);
  const [loading,             setLoading]             = useState(false);
  const [error,               setError]               = useState<string | null>(null);

  // Combined badge count — what the bell shows
  const unreadCount = notifUnreadCount + messageUnreadCount;

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      setError(null);

      // Fetch both in parallel
      const [notifData, msgData] = await Promise.allSettled([
        notificationsApi.getAll(),
        messagesApi.getUnreadCount(),
      ]);

      if (notifData.status === 'fulfilled') {
        const active = (notifData.value.notifications ?? []).filter(n => !isExpired(n));
        setNotifications(active);
        setNotifUnreadCount(active.filter(n => !n.isRead).length);
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

  /* ── Real-time: notification:new ── */
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
      setNotifUnreadCount(count => count + 1);
    });

    return unsub;
  }, [isAuthenticated, subscribe]);

  /* ── Real-time: message:new / message:broadcast → bump badge ── */
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubDirect    = subscribe('message:new',       () => setMessageUnreadCount(c => c + 1));
    const unsubBroadcast = subscribe('message:broadcast', () => setMessageUnreadCount(c => c + 1));

    return () => { unsubDirect(); unsubBroadcast(); };
  }, [isAuthenticated, subscribe]);

  /* ── Mark all notifications read ── */
  const markAllRead = useCallback(async () => {
    if (!isAuthenticated) return;

    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setNotifUnreadCount(0);

    try {
      await notificationsApi.markAllRead();
    } catch {
      await refresh();
    }
  }, [isAuthenticated, refresh]);

  return {
    notifications,
    unreadCount,          // combined — use this for the bell badge
    notifUnreadCount,     // notifications only
    messageUnreadCount,   // messages only
    loading,
    error,
    refresh,
    markAllRead,
  };
}