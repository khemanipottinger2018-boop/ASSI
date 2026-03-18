import { api } from './client';

export type Session = {
  sessionId: string;
  status: string;
  scheduledTime: string;
  durationMinutes: number;
  subjectName: string;
  partnerUsername: string;
  partnerAvatarUrl: string | null;
  price?: number;
};

export const sessionsApi = {
  getMySessions: () =>
    api.get<{ success: boolean; sessions: Session[] }>('/api/browse/my-sessions'),

  getSession: (sessionId: string) =>
    api.get<{ success: boolean; session: Session }>(`/api/live-chat/${sessionId}`),

  bookSession: (body: { tutorId: string; subjectId: string; scheduledTime: string; durationMinutes: number }) =>
    api.post<{ success: boolean; session: Session }>('/api/browse/book', body),
};
