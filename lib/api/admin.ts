import { api } from './client';

/* =====================================================
 * Admin User — GET /api/admin/users
 * ⚠️  Field is userId (not id)
 * ===================================================== */

export type AdminUser = {
  userId:      string;
  username:    string;
  role:        'student' | 'tutor' | 'tutor_applicant' | 'admin';
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

  updateUserRole: (userId: string, role: string) =>
    api.patch<{ success: boolean }>(`/api/admin/users/${userId}/role`, { role }),

  suspendUser: (userId: string, suspended: boolean) =>
    api.patch<{ success: boolean }>(`/api/admin/users/${userId}/suspend`, { suspended }),

  /* ── Tutor Applications ─────────────────
   * Canonical base: /api/tutor-applications/admin/*
   * (not /api/admin/tutor-applications/*)
   * ───────────────────────────────────────── */

  getApplications: (status?: ApplicationStatus) => {
    const qs = status ? `?status=${status}` : '';
    return api.get<{
      success:      boolean;
      count:        number;
      applications: AdminApplication[];
    }>(`/api/tutor-applications/admin/all${qs}`);
  },

  getApplication: (id: string) =>
    api.get<{ success: boolean; application: AdminApplicationDetail }>(
      `/api/tutor-applications/admin/${id}`
    ),

  setApplicationStatus: (id: string, status: 'seen' | 'under_review') =>
    api.patch<{ success: boolean; status: string }>(
      `/api/tutor-applications/admin/${id}/status`,
      { status }
    ),

  /* POST /api/tutor-applications/admin/:id/approve */
  approveApplication: (id: string, notes?: string) =>
    api.post<{ success: boolean }>(
      `/api/tutor-applications/admin/${id}/approve`,
      notes ? { notes } : undefined
    ),

  /* POST /api/tutor-applications/admin/:id/reject */
  rejectApplication: (id: string, notes?: string) =>
    api.post<{ success: boolean }>(
      `/api/tutor-applications/admin/${id}/reject`,
      notes ? { notes } : undefined
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

  /* ── Errors (stubbed — always returns []) ── */

  getErrors: () =>
    api.get<{ success: boolean; count: number; errors: any[] }>('/api/admin/errors'),
};