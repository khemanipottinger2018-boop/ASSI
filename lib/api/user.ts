import { api } from './client';
import type { UserSettings } from '@/contexts/SettingsContext';

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
  tier:      'early_bird' | 'alpha' | 'standard';  // new
  createdAt: string;
  tutor: {
    id:          string;
    hourlyRate:  number | null;
    isAvailable: boolean;
    bio:         string | null;       // new — tutor bio
    timezone:    string | null;       // new — tutor timezone
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
};