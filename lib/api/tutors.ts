import { api } from './client';

export type TutorSummary = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  hourlyRate: number;
  isStudentTutor: boolean;
  subjects: { id: string; name: string; level: string }[];
};

export const tutorsApi = {
  getAvailable: () =>
    api.get<{ success: boolean; tutors: TutorSummary[] }>('/api/tutors/available'),

  browse: () =>
    api.get<{ success: boolean; tutors: TutorSummary[] }>('/api/browse/tutors'),

  getPublicProfile: (username: string) =>
    api.get<{ success: boolean; profile: any }>(`/api/users-public/${username}`),
};
