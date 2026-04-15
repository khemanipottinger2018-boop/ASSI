import { api } from '@/lib/api/client';
import type { SessionStatus } from '@/lib/api/browse';

/* =====================================================
 * TYPES (must be exported explicitly)
 * ===================================================== */

export type BookedSession = {
  sessionId: string;
  status: SessionStatus;
  scheduledAt: string;
  durationMinutes: number;
  rate: number | null;
  notes: string | null;
  subjectName: string;
  partnerUsername: string;
};

export type ChatSession = {
  sessionId:   string;
  partnerId:   string | null;
  partnerName: string;
  subjectName: string;
  status:      SessionStatus;
  live:        boolean;
  startedAt:   string | null;
  type?:       'instant' | 'booked' | 'group_study' | 'conference';
};

export type SessionMessage = {
  messageId: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  content: string;
  isRead: boolean;
  timestamp: string;
  isMine: boolean;
};

/* =====================================================
 * API OBJECT (MUST BE EXPORTED)
 * ===================================================== */

export const sessionsApi = {
  getChatSessions: () =>
    api.get<{
      success: boolean;
      sessions: (Omit<ChatSession, 'sessionId'> & { id: string })[];
    }>('/api/chat/sessions')
    .then(res => ({
      ...res,
      sessions: res.sessions.map(s => {
        const { id, ...rest } = s;
        return { sessionId: id, ...rest } as ChatSession;
      }),
    })),

  getSessionMessages: (sessionId: string) =>
    api.get<{
      success: boolean;
      messages: SessionMessage[];
    }>(`/api/live-chat/${sessionId}/messages`),

  cancelLive: (sessionId: string, reason?: string) =>
    api.post<{ success: boolean }>(
      `/api/live-chat/${sessionId}/cancel`,
      reason ? { reason } : undefined
    ),

  getActiveSession: () =>
    api.get<{
      success: boolean;
      session: {
        sessionId: string;
        status: SessionStatus;
        partnerName: string;
        subjectName: string;
        startedAt: string | null;
      } | null;
    }>('/api/live-chat/active'),
};