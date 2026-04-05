import { api } from '@/lib/api/client';
import type { SessionStatus } from '@/lib/api/browse';

/* =====================================================
 * Booked Session (lean version for chat context)
 * ===================================================== */

export type BookedSession = {
  sessionId:       string;
  status:          SessionStatus;
  scheduledAt:     string; // ISO
  durationMinutes: number;
  rate:            number | null;
  notes:           string | null;
  subjectName:     string;
  partnerUsername: string;
};

/* =====================================================
 * Chat Session (1:1 with booking session)
 * ===================================================== */

export type ChatSession = {
  sessionId:   string; // SAME as booking sessionId (enforced)
  partnerId:   string | null;
  partnerName: string;
  subjectName: string;
  status:      SessionStatus;
  live:        boolean;        // true = currently active/waiting
  startedAt:   string | null; // ISO (null until active)
};

/* =====================================================
 * Message
 * ===================================================== */

export type SessionMessage = {
  messageId:  string;
  sessionId:  string;
  senderId:   string;
  senderName: string;
  content:    string;
  isRead:     boolean;
  timestamp:  string; // ISO (standardized)
  isMine:     boolean;
};

/* ===================================================== */

export const sessionsApi = {
  /* GET all sessions (active + historical)
   * Backend returns `id` not `sessionId` — we remap here so callers stay stable.
   */
  getChatSessions: () =>
    api
      .get<{ success: boolean; sessions: (Omit<ChatSession, 'sessionId'> & { id: string })[] }>(
        '/api/chat/sessions'
      )
      .then(res => ({
        ...res,
        sessions: res.sessions.map(s => {
          const { id, ...rest } = s;
          return { sessionId: id, ...rest } as ChatSession;
        }),
      })),

  /* GET messages */
  getSessionMessages: (sessionId: string) =>
    api.get<{
      success: boolean;
      messages: SessionMessage[];
    }>(`/api/live-chat/${sessionId}/messages`),

  /* POST cancel a live/instant session */
  cancelLive: (sessionId: string, reason?: string) =>
    api.post<{ success: boolean }>(
      `/api/live-chat/${sessionId}/cancel`,
      reason ? { reason } : undefined
    ),

  /* GET currently active session (if any) */
  getActiveSession: () =>
    api.get<{
      success: boolean;
      session: {
        sessionId:   string;
        status:      SessionStatus;
        partnerName: string;
        subjectName: string;
        startedAt:   string | null; // ISO
      } | null;
    }>('/api/live-chat/active'),
};
