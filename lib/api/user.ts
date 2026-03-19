import { api } from './client';
import type { UserSettings } from '@/contexts/SettingsContext';

/* =====================================================
 * User shape returned by GET /api/user/me
 *
 * NOTE: /api/user/me does NOT return bio, phoneNumber,
 * subjects, or timezone. Those live on the tutor profile
 * and public profile endpoints respectively.
 * ===================================================== */

export type UserMe = {
  id:        string;
  username:  string;
  email:     string | null;
  role:      'student' | 'tutor' | 'tutor_applicant' | 'admin';
  createdAt: string;
  tutor: {
    id:          string;
    hourlyRate:  number | null;
    isAvailable: boolean;
  } | null;
};

export const userApi = {
  /* GET /api/user/me */
  getMe: () =>
    api.get<{ success: boolean; user: UserMe }>('/api/user/me'),

  /* GET /api/user/settings */
  getSettings: () =>
    api.get<{ success: boolean; settings: UserSettings }>('/api/user/settings'),

  /* PATCH /api/user/settings
   * Body: partial UserSettings object — send only fields to change.
   * e.g. { theme: 'dark' } or { emailNotifications: false }
   */
  updateSettings: (patch: Partial<UserSettings>) =>
    api.patch<{ success: boolean }>('/api/user/settings', patch),

  /* PATCH /api/user/profile
   * Body: snake_case field names as backend expects.
   * Returns { success: true } only — refetch getMe() after calling.
   *
   * Accepted fields:
   *   username, email, bio, phone_number, show_phone
   *   hourly_rate, timezone, teaching_philosophy,    <- tutor only
   *   chat_mode, max_concurrent_chats, is_student_tutor  <- tutor only
   */
  updateProfile: (body: Record<string, unknown>) =>
    api.patch<{ success: boolean }>('/api/user/profile', body),
};