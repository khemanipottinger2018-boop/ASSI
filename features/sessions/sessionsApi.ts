import { api } from '@/lib/api/client';
import type { SessionStatus } from '@/lib/api/browse';

/* =====================================================
 * TYPES
 * ===================================================== */

export type BookedSession = {
  sessionId:       string;
  status:          SessionStatus;
  scheduledAt:     string;
  durationMinutes: number | null;
  rate:            number | null;
  notes:           string | null;
  subjectName:     string;
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
  messageId:  string;
  sessionId:  string;
  senderId:   string;
  senderName: string;
  content:    string;
  isRead:     boolean;
  /** Unix ms — backend returns createdAt.getTime() */
  timestamp:  number;
  isMine:     boolean;
};

/** Returned by GET /api/live-chat/upcoming */
export type UpcomingSession = {
  id:              string;
  type:            'booked' | 'conference';
  status:          string;
  subjectName:     string | null;
  partnerName:     string;
  scheduledAt:     string | null;
  durationMinutes: number | null;
  maxParticipants?: number;
  isPublic?:       boolean;
};

/** Returned by GET /api/live-chat/conferences/public */
export type PublicConference = {
  id:              string;
  subjectName:     string | null;
  maxParticipants: number | null;
  speakMode:       string | null;
  createdAt:       string;
  hostId:          string | null;
};

/* =====================================================
 * API
 * ===================================================== */

export const sessionsApi = {

  /**
   * GET /api/chat/sessions
   * Returns all sessions (live Redis + historical DB) for the current user.
   * Backend sends `sessionId` directly — no id→sessionId remapping needed.
   */
  getChatSessions: () =>
    api.get<{ success: boolean; sessions: ChatSession[] }>('/api/chat/sessions'),

  /**
   * GET /api/chat/sessions/:sessionId/messages
   * Universal endpoint — serves live (Redis) and historical (DB) messages.
   * Returns fully-formatted messages including senderName and isMine.
   */
  getSessionMessages: (sessionId: string) =>
    api.get<{
      success:  boolean;
      live:     boolean;
      messages: SessionMessage[];
    }>(`/api/chat/sessions/${sessionId}/messages`),

  /**
   * POST /api/live-chat/:sessionId/cancel
   * Ends or cancels a live instant session.
   */
  cancelLive: (sessionId: string, reason?: string) =>
    api.post<{ success: boolean }>(
      `/api/live-chat/${sessionId}/cancel`,
      reason ? { reason } : undefined,
    ),

  /**
   * GET /api/live-chat/active
   * Returns the current user's active session (null if none).
   */
  getActiveSession: () =>
    api.get<{
      success: boolean;
      session: {
        sessionId:   string;
        status:      SessionStatus;
        type:        'instant' | 'booked' | 'group_study' | 'conference';
        partnerName: string;
        subjectName: string;
        startedAt:   string | null;
      } | null;
    }>('/api/live-chat/active'),

  /**
   * GET /api/live-chat/upcoming
   * Returns upcoming booked sessions and active conferences.
   */
  getUpcoming: () =>
    api.get<{ success: boolean; sessions: UpcomingSession[] }>('/api/live-chat/upcoming'),

  /**
   * GET /api/live-chat/conferences/public
   * Lists joinable public conference sessions.
   */
  getPublicConferences: () =>
    api.get<{ success: boolean; conferences: PublicConference[] }>('/api/live-chat/conferences/public'),
};
