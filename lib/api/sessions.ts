import { api } from './client';

/* =====================================================
 * Booked session — GET /api/browse/my-sessions
 * ===================================================== */

export type BookedSession = {
  sessionId:       string;
  status:          'pending' | 'confirmed' | 'in_progress' | 'active' | 'completed' | 'cancelled';
  scheduledAt:     string;   // ISO date
  durationMinutes: number;
  rate:            number | null;
  notes:           string | null;
  subjectName:     string;
  partnerUsername: string;
};

/* =====================================================
 * Chat session — GET /api/chat/sessions
 * Includes both live (Redis) and historical (DB) sessions
 * ===================================================== */

export type ChatSession = {
  id:          string;
  partnerId:   string | null;
  partnerName: string;
  subjectName: string;
  status:      string;
  live:        boolean;
  startedAt:   string;  // ISO date
};

/* =====================================================
 * Message — GET /api/chat/sessions/:sessionId/messages
 * ===================================================== */

export type SessionMessage = {
  messageId:  string;
  sessionId:  string;
  senderId:   string;
  senderName: string;
  content:    string;
  isRead:     boolean;
  timestamp:  number;  // ms epoch
  isMine:     boolean;
};

/* =====================================================
 * Book session body — POST /api/browse/book
 * Note: backend field is scheduled_time (snake_case)
 * ===================================================== */

export type BookSessionBody = {
  tutor_id:         string;
  subject_id:       string;
  scheduled_time:   string;   // ISO date string
  duration_minutes?: number;  // default 60
  notes?:           string;
};

/* ===================================================== */

export const sessionsApi = {
  /* GET /api/browse/my-sessions
   * Booked/scheduled sessions for the current user (student or tutor).
   */
  getMySessions: () =>
    api.get<{ success: boolean; sessions: BookedSession[] }>('/api/browse/my-sessions'),

  /* GET /api/chat/sessions
   * All sessions — live (Redis) + historical (DB).
   */
  getChatSessions: () =>
    api.get<{ success: boolean; sessions: ChatSession[] }>('/api/chat/sessions'),

  /* GET /api/chat/sessions/:sessionId/messages */
  getSessionMessages: (sessionId: string) =>
    api.get<{ success: boolean; messages: SessionMessage[]; live: boolean }>(
      `/api/chat/sessions/${sessionId}/messages`
    ),

  /* POST /api/browse/book
   * Student only. Returns sessionId on success.
   */
  bookSession: (body: BookSessionBody) =>
    api.post<{ success: boolean; sessionId: string }>('/api/browse/book', body),

  /* GET /api/live-chat/active
   * Student only — own active live session from Redis.
   */
  getActiveSession: () =>
    api.get<{
      success: boolean;
      session: {
        sessionId:   string;
        status:      string;
        tutorName:   string;
        subjectName: string;
        startedAt:   number;
      } | null;
    }>('/api/live-chat/active'),
};