'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import type { Notification } from '@/components/types/notification';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const { subscribe } = useSocket();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapNotification = useCallback((n: any): Notification => {
    return {
      id: String(n.id),
      title: String(n.title ?? ''),
      body: String(n.body ?? n.message ?? ''),
      read: Boolean(n.read ?? n.is_read),
      createdAt: String(n.createdAt ?? n.created_at ?? new Date().toISOString()),
      type: n.type ?? undefined,
      data: n.data ?? undefined,
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_URL}/api/notifications`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await res.json();

      const mapped: Notification[] = (data.notifications || []).map(mapNotification);

      setNotifications(mapped);
      setUnreadCount(mapped.filter((n) => !n.read).length);
    } catch {
      setError('Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, mapNotification]);

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

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsub = subscribe('notification:new', (payload: any) => {
      const incoming: Notification = {
        id: String(payload.id ?? Date.now()),
        title: payload.title ?? '',
        body: payload.body ?? payload.message ?? '',
        read: false,
        createdAt: payload.createdAt ?? new Date().toISOString(),
        type: payload.type ?? undefined,
        data: payload.data ?? undefined,
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
      await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // optional: re-sync with refresh() if needed
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!isAuthenticated) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // optional: re-sync with refresh() if needed
    }
  }, [isAuthenticated]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  };
}