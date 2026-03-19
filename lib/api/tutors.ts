import { api } from './client';

/* =====================================================
 * Shared subject shape — used across all tutor endpoints
 * ===================================================== */

export type SubjectSummary = {
  id:       string;
  name:     string;
  category: string | null;
};

/* =====================================================
 * TutorSummary — shape returned by both:
 *   GET /api/tutors/available
 *   GET /api/browse/tutors
 *
 * Note: tutorId = tutors table PK (uuid)
 *       userId  = auth user FK (uuid)
 * These are ALWAYS two different values.
 * ===================================================== */

export type TutorSummary = {
  tutorId:        string;
  userId:         string;
  username:       string;
  bio:            string;
  hourlyRate:     number;
  chatMode:       string | null;
  isStudentTutor?: boolean;
  totalSessions?:  number;
  timezone?:       string | null;
  subjects:        SubjectSummary[];
};

/* =====================================================
 * Public profile — GET /api/users-public/:username
 * ===================================================== */

export type PublicProfile = {
  id:         string;
  username:   string;
  role:       'student' | 'tutor';
  tutorBio:   string | null;
  hourlyRate: number | null;
  subjects:   SubjectSummary[];
};

/* =====================================================
 * Browse pagination
 * ===================================================== */

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

/* ===================================================== */

export const tutorsApi = {
  /* GET /api/tutors/available
   * Returns tutors currently online in Redis presence.
   * Optional: ?subjectId=uuid
   */
  getAvailable: (subjectId?: string) => {
    const qs = subjectId ? `?subjectId=${subjectId}` : '';
    return api.get<{ success: boolean; tutors: TutorSummary[] }>(
      `/api/tutors/available${qs}`
    );
  },

  /* GET /api/tutors/availability  (tutor role only)
   * Own availability status from Redis.
   */
  getMyAvailability: () =>
    api.get<{ success: boolean; available: boolean }>('/api/tutors/availability'),

  /* POST /api/tutors/availability  (tutor role only) */
  setAvailability: (available: boolean) =>
    api.post<{ success: boolean; available: boolean }>(
      '/api/tutors/availability',
      { available }
    ),

  /* GET /api/browse/tutors
   * Paginated tutor directory. Filters all optional.
   */
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

  /* GET /api/users-public/:username
   * Public profile — no auth required but client sends cookie anyway.
   */
  getPublicProfile: (username: string) =>
    api.get<{ success: boolean; user: PublicProfile }>(
      `/api/users-public/${username}`
    ),
};