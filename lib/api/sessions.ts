import { api } from './client';
import type { SessionStatus } from './browse';

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
  /* GET all sessions (active + historical) */
  getChatSessions: () =>
    api.get<{ success: boolean; sessions: ChatSession[] }>(
      '/api/chat/sessions'
    ),

  /* GET messages */
  getSessionMessages: (sessionId: string) =>
    api.get<{
      success: boolean;
      messages: SessionMessage[];
    }>(`/api/chat/sessions/${sessionId}/messages`),

  /* GET currently active session (if any) */
  getActiveSession: () =>
    api.get<{
      success: boolean;
      session: {
        sessionId:   string;
        status:      SessionStatus;
        tutorName:   string;
        subjectName: string;
        startedAt:   string; // ISO
      } | null;
    }>('/api/live-chat/active'),
};