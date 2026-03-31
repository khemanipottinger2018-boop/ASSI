import { api } from '@/lib/api/client';

// Use the canonical Notification type from components — single source of truth.
// lib/api must not define its own Notification with type: string,
// because NotificationItem and filterActive expect NotificationType (the union).
export type { Notification } from '@/features/types/notification';
import type { Notification } from '@/features/types/notification';

export const notificationsApi = {
  /* GET /api/notifications */
  getAll: () =>
    api.get<{ success: boolean; notifications: Notification[] }>('/api/notifications'),

  /* POST /api/notifications/read-all
   *
   * ⚠️  There is NO per-notification mark-read endpoint.
   * PATCH /api/notifications/:id/read does NOT exist on the backend.
   * Only bulk mark-all is supported.
   */
  markAllRead: () =>
    api.post<{ success: boolean }>('/api/notifications/read-all'),
};
