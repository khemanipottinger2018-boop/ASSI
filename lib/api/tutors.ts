import { api } from './client';

export type SubjectSummary = {
  id:       string;
  name:     string;
  category: string | null;
};

export type TutorSummary = {
  tutorId:        string;
  userId:         string;
  username:       string;
  avatarUrl:      string | null;   
  bio:            string;
  hourlyRate:     number;
  chatMode:       string | null;
  isStudentTutor?: boolean;
  totalSessions?:  number;
  timezone?:       string | null;
  subjects:        SubjectSummary[];
};

export type PublicProfile = {
  id:         string;
  username:   string;
  role:       'student' | 'tutor';
  tutorBio:   string | null;
  hourlyRate: number | null;
  avatarUrl:  string | null;       // ← added
  subjects:   SubjectSummary[];
};

export type BrowsePagination = {
  page:  number;
  limit: number;
  total: number;
  pages: number;
};

export type BrowseFilters = {
  subjectId?: string;
  minRate?:   number;
  maxRate?:   number;
  page?:      number;
  limit?:     number;
};

export const tutorsApi = {
  getAvailable: (subjectId?: string) => {
    const qs = subjectId ? `?subjectId=${subjectId}` : '';
    return api.get<{ success: boolean; tutors: TutorSummary[] }>(
      `/api/tutors/available${qs}`
    );
  },

  browse: (filters: BrowseFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.subjectId) params.set('subjectId', filters.subjectId);
    if (filters.minRate)   params.set('minRate',   String(filters.minRate));
    if (filters.maxRate)   params.set('maxRate',   String(filters.maxRate));
    if (filters.page)      params.set('page',      String(filters.page));
    if (filters.limit)     params.set('limit',     String(filters.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return api.get<{
      success:    boolean;
      tutors:     TutorSummary[];
      pagination: BrowsePagination;
    }>(`/api/browse/tutors${qs}`);
  },

  getPublicProfile: (username: string) =>
    api.get<{ success: boolean; user: PublicProfile }>(
      `/api/users-public/${username}`
    ),

  /* GET /api/tutors/my-subjects — auth-gated, returns the logged-in tutor's subjects */
  getMySubjects: () =>
    api.get<{ success: boolean; subjects: SubjectSummary[]; limit: number; tier: string }>(
      '/api/tutors/my-subjects'
    ),
};