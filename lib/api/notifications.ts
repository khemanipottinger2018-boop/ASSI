import { api } from './client';
import type { Notification } from '@/components/types/notification';

export const notificationsApi = {
  getAll: () =>
    api.get<{ success: boolean; notifications: Notification[] }>('/api/notifications'),

  markRead: (id: string) =>
    api.patch<{ success: boolean }>(`/api/notifications/${id}/read`),

  markAllRead: () =>
    api.patch<{ success: boolean }>('/api/notifications/read-all'),
};
