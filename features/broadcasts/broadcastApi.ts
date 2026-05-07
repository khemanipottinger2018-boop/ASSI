import { api } from '@/lib/api/client';

export type BroadcastType = 'note' | 'formula' | 'link' | 'announcement';

export type SessionBroadcast = {
  id:        string;
  sessionId: string;
  senderId:  string;
  content:   string;
  type:      BroadcastType;
  createdAt: string;
};

export const broadcastApi = {
  getMyBroadcasts: () =>
    api.get<{ success: boolean; broadcasts: SessionBroadcast[] }>('/api/sessions/broadcasts'),

  getSessionBroadcasts: (sessionId: string) =>
    api.get<{ success: boolean; broadcasts: SessionBroadcast[] }>(`/api/sessions/${sessionId}/broadcasts`),

  postBroadcast: (sessionId: string, content: string, type: BroadcastType) =>
    api.post<{ success: boolean; broadcast: SessionBroadcast }>(
      `/api/sessions/${sessionId}/broadcast`,
      { content, type },
    ),
};
