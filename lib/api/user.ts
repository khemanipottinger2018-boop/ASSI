import { api } from './client';
import type { UserSettings } from '@/features/settings';

/* ── GET /api/user/me ─────────────────────────────────────────────
 * Full response shape from user.routes.ts.
 * bio and timezone live on the tutor sub-object (tutors table),
 * not on the root user object (user_profiles table).
 * tier is a new root-level field.
 * ---------------------------------------------------------------- */

export type UserMe = {
  id:        string;
  username:  string;
  email:     string | null;
  role:      'student' | 'tutor' | 'tutor_applicant' | 'admin';
  tier:      'early_bird' | 'alpha' | 'standard' | 'beta' | 'tester' | 'pro';
  createdAt: string;
  // Extended fields returned by backend
  creditBalance?:     number;
  assiPlus?:          boolean;
  assiPlusExpiresAt?: string | null;
  // Note: disclaimerAccepted / isDemo / demoExpiresAt live on AuthUser (from /api/auth/me).
  // They may also appear here but rely on useAuth() for those values.
  disclaimerAccepted?: boolean;
  isDemo?:             boolean;
  demoExpiresAt?:      string | null;
  twoFactorEnabled?:   boolean;
  showPhone?:          boolean;
  tutor: {
    id:          string;
    hourlyRate:  number | null;
    isAvailable: boolean;
    bio:         string | null;
    timezone:    string | null;
  } | null;
};

/* ── GET /api/user/streak ─────────────────────────────────────────
 * Safe defaults for new users — no null checks needed on the numbers.
 * lastActiveAt is null for new users, ISO date string otherwise.
 * ---------------------------------------------------------------- */

export type UserStreak = {
  currentStreak: number;
  longestStreak: number;
  lastActiveAt:  string | null;  // "YYYY-MM-DD" or null
};

/* ── GET /api/user/badges ─────────────────────────────────────────
 * Returns [] for users with no badges — always safe to map.
 * ---------------------------------------------------------------- */

export type UserBadge = {
  slug:        string;
  name:        string;
  description: string;
  iconUrl:     string | null;
  awardedAt:   string;  // ISO timestamp
};

/* ── GET /api/user/features ───────────────────────────────────────
 * Single source of truth for what UI to show per user tier.
 * All keys return boolean — no undefined checks needed.
 * ---------------------------------------------------------------- */

export type UserFeatures = {
  forums:           boolean;
  assignments:      boolean;
  ai_bundles:       boolean;
  past_papers:      boolean;
  assi_plus_prompt: boolean;
};

export type UserFeaturesResponse = {
  success:  boolean;
  tier:     string;
  features: UserFeatures;
};

/* ── GET /api/user/credits ────────────────────────────────────── */

export type CreditTransaction = {
  id:          string;
  amount:      number;        // positive = earned, negative = spent
  reason:      string;
  referenceId: string | null;
  balance:     number;        // running total after this transaction
  createdAt:   string;
};

/* ── GET /api/user/quota ──────────────────────────────────────── */

export type UserQuota = {
  ai_queries: { used: number; limit: number };
  sessions:   { used: number; limit: number };
};

/* ── GET /api/user/tasks/today ────────────────────────────────── */

export type DailyTask = {
  id:          string;
  slug:        'login' | 'send_message' | 'complete_session' | 'submit_assignment' | string;
  title:       string;
  description: string;
  completed:   boolean;
  completedAt: string | null;
  reward:      number;   // credits awarded on completion
};

/* ── API client ───────────────────────────────────────────────── */

export const userApi = {
  /* GET /api/user/me */
  getMe: () =>
    api.get<{ success: boolean; user: UserMe }>('/api/user/me'),

  /* GET /api/user/settings */
  getSettings: () =>
    api.get<{ success: boolean; settings: UserSettings }>('/api/user/settings'),

  /* PATCH /api/user/settings
   * Body: partial UserSettings — send only fields to change.
   */
  updateSettings: (patch: Partial<UserSettings>) =>
    api.patch<{ success: boolean }>('/api/user/settings', patch),

  /* PATCH /api/user/profile
   * Body: snake_case field names as backend expects.
   * Returns { success: true } only — refetch getMe() after calling.
   *
   * Accepted fields:
   *   username, email, bio, phone_number, show_phone
   *   hourly_rate, timezone, teaching_philosophy,    ← tutor only
   *   chat_mode, max_concurrent_chats, is_student_tutor  ← tutor only
   *
   * Note: bio and timezone update the tutors table (tutor only).
   */
  updateProfile: (body: Record<string, unknown>) =>
    api.patch<{ success: boolean }>('/api/user/profile', body),

  /* GET /api/user/streak */
  getStreak: () =>
    api.get<{ success: boolean; streak: UserStreak }>('/api/user/streak'),

  /* GET /api/user/badges */
  getBadges: () =>
    api.get<{ success: boolean; badges: UserBadge[] }>('/api/user/badges'),

  /* GET /api/user/features
   * Call this once on mount and store in context.
   * Use features.assi_plus_prompt before rendering ASSI+ upsell.
   */
  getFeatures: () =>
    api.get<UserFeaturesResponse>('/api/user/features'),

  /* GET /api/user/credits */
  getCredits: () =>
    api.get<{ success: boolean; balance: number; transactions: CreditTransaction[] }>(
      '/api/user/credits'
    ),

  /* POST /api/user/credits/spend */
  spendCredits: (body: { amount: number; reason: string; referenceId?: string }) =>
    api.post<{ success: boolean; balance: number }>(
      '/api/user/credits/spend',
      body
    ),

  /* GET /api/user/quota */
  getQuota: () =>
    api.get<{ success: boolean; quota: UserQuota }>('/api/user/quota'),

  /* GET /api/user/tasks/today */
  getDailyTasks: () =>
    api.get<{ success: boolean; tasks: DailyTask[] }>('/api/user/tasks/today'),

  /* POST /api/auth/2fa/setup — generates TOTP secret + QR code */
  setup2FA: () =>
    api.post<{ success: boolean; otpauth: string; qrDataUrl: string }>(
      '/api/auth/2fa/setup'
    ),

  /* POST /api/auth/2fa/verify — activates 2FA after scanning QR */
  verify2FA: (code: string) =>
    api.post<{ success: boolean }>('/api/auth/2fa/verify', { code }),

  /* POST /api/auth/2fa/disable */
  disable2FA: (code: string) =>
    api.post<{ success: boolean }>('/api/auth/2fa/disable', { code }),
};