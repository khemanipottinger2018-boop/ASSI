import { api } from './client';

/* =====================================================
 * Admin User — GET /api/admin/users
 * ⚠️  Field is userId (not id)
 * ===================================================== */

export type AdminUser = {
  userId:      string;
  username:    string;
  role:        'student' | 'tutor' | 'tutor_applicant' | 'admin' | 'moderator';
  isSuspended: boolean;
  isDemo:      boolean;
  createdAt:   string;
};

/* =====================================================
 * Tutor Application — GET /api/tutor-applications/admin/all
 * ===================================================== */

export type ApplicationStatus =
  | 'pending'
  | 'seen'
  | 'under_review'
  | 'approved'
  | 'rejected';

export type AdminApplication = {
  id:          string;
  userId:      string;
  status:      ApplicationStatus;
  submittedAt: string | null;
  reviewedAt:  string | null;
  reviewedBy:  string | null;
  notes:       string | null;
  user: {
    username:  string;
    role:      string;
    createdAt: string;
  };
  applicationSubjects?: {
    subject: { id: string; name: string };
  }[];
};

/* Full detail — GET /api/tutor-applications/admin/:id */
export type AdminApplicationDetail = AdminApplication & {
  educationBackground: string | null;
  teachingExperience:  string | null;
  whyTutor:            string | null;
  qualifications:      string | null;
  ageVerified:         boolean;
  subjects:            { id: string; name: string; category: string | null }[];
};

/* =====================================================
 * Live Session — GET /api/admin/sessions/live
 * ⚠️  Does NOT have subjectName or messageCount
 * ===================================================== */

export type LiveSession = {
  sessionId:        string;
  status:           'waiting' | 'active';
  type:             'instant' | 'scheduled';
  studentId:        string;
  tutorId:          string | null;
  subjectId:        string | null;   // uuid only — no name
  startedAt:        number;          // ms epoch
  participants:     string[];
  participantCount: number;
};

/* =====================================================
 * Dashboard Stats — GET /api/admin/dashboard/stats
 * ===================================================== */

export type DashboardStats = {
  totalUsers:  number;
  tutors:      number;
  students:    number;
  onlineUsers: number;
};

/* =====================================================
 * Metrics — GET /api/admin/metrics
 * ⚠️  Does NOT have avgSessionDuration
 * ===================================================== */

export type AdminMetrics = {
  totalUsers:     number;
  totalTutors:    number;
  totalStudents:  number;
  onlineUsers:    number;
  activeSessions: number;
  totalSessions:  number;
};

/* ===================================================== */

export const adminApi = {
  /* ── Dashboard ─────────────────────────── */

  getDashboardStats: () =>
    api.get<{ success: boolean; stats: DashboardStats }>('/api/admin/dashboard/stats'),

  /* ── Users ─────────────────────────────── */

  getUsers: (page = 1, limit = 50) =>
    api.get<{ success: boolean; users: AdminUser[] }>(
      `/api/admin/users?page=${page}&limit=${limit}`
    ),

  // Backend expects 'tutor-applicant' (hyphen), not 'tutor_applicant' (underscore)
  updateUserRole: (userId: string, role: string) =>
    api.patch<{ success: boolean }>(`/api/admin/users/${userId}/role`, {
      role: role === 'tutor_applicant' ? 'tutor-applicant' : role,
    }),

  suspendUser: (userId: string, suspended: boolean) =>
    api.patch<{ success: boolean }>(`/api/admin/users/${userId}/suspend`, { suspended }),

  updateUserTier: (userId: string, tier: 'standard' | 'alpha' | 'tester' | 'beta') =>
    api.patch<{ success: boolean }>(`/api/admin/users/${userId}/tier`, { tier }),

  awardBadge: (userId: string, slug: string) =>
    api.post<{ success: boolean }>(`/api/admin/users/${userId}/badges/${slug}`),

  /* ── Tutor Applications ─────────────────
   * Canonical base: /api/admin/tutor-applications/admin/*
   * ───────────────────────────────────────── */

  getApplications: (status?: 'pending' | 'approved' | 'rejected') => {
    const qs = status ? `?status=${status}` : '';
    return api.get<{
      success:      boolean;
      total:        number;
      count:        number;
      applications: AdminApplication[];
    }>(`/api/admin/tutor-applications/admin/all${qs}`);
  },

  getApplication: (id: string) =>
    api.get<{ success: boolean; application: AdminApplicationDetail }>(
      `/api/admin/tutor-applications/admin/${id}`
    ),

  /* POST /api/admin/tutor-applications/admin/approve/:id */
  approveApplication: (id: string, reviewNotes?: string) =>
    api.post<{ success: boolean }>(
      `/api/admin/tutor-applications/admin/approve/${id}`,
      reviewNotes ? { review_notes: reviewNotes } : undefined
    ),

  /* POST /api/admin/tutor-applications/admin/reject/:id */
  rejectApplication: (id: string, reviewNotes?: string) =>
    api.post<{ success: boolean }>(
      `/api/admin/tutor-applications/admin/reject/${id}`,
      reviewNotes ? { review_notes: reviewNotes } : undefined
    ),

  /* ── Sessions ──────────────────────────── */

  getLiveSessions: () =>
    api.get<{ success: boolean; sessions: LiveSession[] }>('/api/admin/sessions/live'),

  endSession: (sessionId: string) =>
    api.post<{ success: boolean }>(`/api/admin/sessions/${sessionId}/end`),

  getSessionMessages: (sessionId: string) =>
    api.get<{ success: boolean; messages: any[]; session: any }>(
      `/api/admin/sessions/${sessionId}/messages`
    ),

  /* ── Metrics ───────────────────────────── */

  getMetrics: () =>
    api.get<{ success: boolean; metrics: AdminMetrics }>('/api/admin/metrics'),

  getRuntimeMetrics: () =>
    api.get<{ success: boolean; runtime: Record<string, unknown> }>('/api/admin/metrics/runtime'),

  /* ── Errors ────────────────────────────── */

  getErrors: (range?: '24h' | '7d' | '30d') =>
    api.get<{ success: boolean; range: string; total: number; count: number; errors: any[] }>(
      `/api/admin/errors${range ? `?range=${range}` : ''}`
    ),

  resolveError: (id: string) =>
    api.patch<{ success: boolean; error: { id: string; resolved: boolean } }>(
      `/api/admin/errors/${id}/resolve`
    ),
};