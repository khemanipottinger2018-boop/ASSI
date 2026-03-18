import { api } from './client';

export const adminApi = {
  getUsers: () =>
    api.get<{ success: boolean; users: any[] }>('/api/admin/users'),

  updateUserRole: (userId: string, role: string) =>
    api.patch(`/api/admin/users/${userId}/role`, { role }),

  suspendUser: (userId: string) =>
    api.patch(`/api/admin/users/${userId}/suspend`),

  getApplications: () =>
    api.get<{ success: boolean; applications: any[] }>('/api/admin/tutor-applications'),

  reviewApplication: (id: string, action: 'approve' | 'reject') =>
    api.post(`/api/admin/tutor-applications/${id}/${action}`),

  getLiveSessions: () =>
    api.get<{ success: boolean; sessions: any[] }>('/api/admin/sessions/live'),

  endSession: (sessionId: string) =>
    api.post(`/api/admin/sessions/${sessionId}/end`),

  getMetrics: () =>
    api.get<{ success: boolean }>('/api/admin/metrics'),

  getErrors: (range: string) =>
    api.get<{ success: boolean }>(`/api/admin/errors?range=${range}`),
};
