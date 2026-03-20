// Add this to your existing lib/api/index.ts or lib/api.ts
// alongside notificationsApi

import { api } from './client';

/* ── Message types ── */

export type InboxMessage = {
  id:          string;
  senderId:    string;
  senderName:  string;
  receiverId:  string | null;
  context:     'direct' | 'broadcast' | 'system' | 'session';
  subject:     string | null;
  content:     string;
  parentId:    string | null;
  isRead:      boolean;
  createdAt:   string;
  replyCount:  number;
  // admin sent view only
  receiverName?: string | null;
  readCount?:    number;
};

export type MessageThread = InboxMessage & {
  replies: InboxMessage[];
};

/* ── Shared messages API (all authenticated users) ── */

export const messagesApi = {
  /* GET /api/messages/inbox */
  getInbox: (page = 1, limit = 30) =>
    api.get<{ success: boolean; messages: InboxMessage[] }>(
      `/api/messages/inbox?page=${page}&limit=${limit}`
    ),

  /* GET /api/messages/unread-count */
  getUnreadCount: () =>
    api.get<{ success: boolean; count: number }>('/api/messages/unread-count'),

  /* GET /api/messages/:id */
  getThread: (id: string) =>
    api.get<{ success: boolean; message: MessageThread }>(`/api/messages/${id}`),

  /* PATCH /api/messages/:id/read */
  markRead: (id: string) =>
    api.patch<{ success: boolean }>(`/api/messages/${id}/read`),

  /* POST /api/messages/read-all */
  markAllRead: () =>
    api.post<{ success: boolean }>('/api/messages/read-all'),

  /* POST /api/messages/:id/reply */
  reply: (id: string, content: string) =>
    api.post<{ success: boolean; messageId: string }>(`/api/messages/${id}/reply`, { content }),

  /* DELETE /api/messages/:id */
  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/api/messages/${id}`),
};

/* ── Admin messages API ── */

export const adminMessagesApi = {
  /* POST /api/messages/admin/send */
  send: (data: { receiverId?: string; subject?: string; content: string }) =>
    api.post<{ success: boolean; messageId: string; type: string }>(
      '/api/messages/admin/send', data
    ),

  /* POST /api/messages/admin/send-system */
  sendSystem: (data: { receiverId: string; subject?: string; content: string }) =>
    api.post<{ success: boolean; messageId: string }>(
      '/api/messages/admin/send-system', data
    ),

  /* GET /api/messages/admin/sent */
  getSent: (page = 1, limit = 30) =>
    api.get<{ success: boolean; messages: InboxMessage[] }>(
      `/api/messages/admin/sent?page=${page}&limit=${limit}`
    ),

  /* GET /api/messages/admin/search-users?q= */
  searchUsers: (q: string) =>
    api.get<{ success: boolean; users: { userId: string; username: string; role: string }[] }>(
      `/api/messages/admin/search-users?q=${encodeURIComponent(q)}`
    ),

  /* DELETE /api/messages/admin/:id */
  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/api/messages/admin/${id}`),
};