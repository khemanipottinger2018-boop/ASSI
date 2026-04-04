import { api } from '@/lib/api/client';

/* =====================================================
 * Session Status (GLOBAL — shared across system)
 * ===================================================== */

export type SessionStatus =
  | 'pending'     // awaiting tutor (booked or instant)
  | 'matched'     // tutor accepted (instant flow)
  | 'confirmed'   // scheduled session confirmed
  | 'active'      // session in progress
  | 'completed'
  | 'cancelled';

/* =====================================================
 * Request Bodies
 * ===================================================== */

export type BookSessionBody = {
  tutor_id:         string;
  subject_id:       string;
  scheduled_time:   string; // ISO
  duration_minutes: number;
  notes?:           string;
};

export type InstantChatBody = {
  tutor_id:   string;
  subject_id: string;
};

/* =====================================================
 * Session Summary (for listings)
 * ===================================================== */

export type SessionSummary = {
  sessionId:        string;
  status:           SessionStatus;
  scheduledAt:      string; // ISO
  durationMinutes:  number;
  rate:             number | null;
  notes:            string | null;
  subjectName:      string;
  partnerUsername:  string;
  partnerAvatarUrl: string | null;
};

/* ===================================================== */

export const browseApi = {
  book: (body: BookSessionBody) =>
    api.post<{ success: boolean; sessionId: string }>(
      '/api/browse/book',
      body
    ),

  instantChat: (body: InstantChatBody) =>
    api.post<{ success: boolean; sessionId: string }>(
      '/api/browse/instant-chat',
      body
    ),

  confirm: (sessionId: string) =>
    api.patch<{ success: boolean }>(
      `/api/browse/sessions/${sessionId}/confirm`
    ),

  cancel: (sessionId: string, reason?: string) =>
    api.patch<{ success: boolean }>(
      `/api/browse/sessions/${sessionId}/cancel`,
      reason ? { reason } : undefined
    ),

  complete: (sessionId: string) =>
    api.post<{ success: boolean; charge: number }>(
      `/api/browse/sessions/${sessionId}/complete`
    ),

  mySessions: () =>
    api.get<{ success: boolean; sessions: SessionSummary[] }>(
      '/api/browse/my-sessions'
    ),
};
