// components/types/profile.view.ts
// Unified view type covering both /api/user/me and /api/users-public/:username.
//
// Field source map:
//   id, username, role, createdAt, email, tutor  → /api/user/me
//   id, username, role, tutorBio, hourlyRate,
//   subjects                                     → /api/users-public/:username
//
// ⚠️  bio, phoneNumber, timezone are NOT returned by any endpoint directly.
//     bio lives as tutorBio on the public profile.
//     phoneNumber / timezone only travel through PATCH /api/user/profile.

export type UserProfileView = {
  id:        string;
  username:  string;
  role:      'student' | 'tutor' | 'tutor_applicant' | 'admin';
  createdAt?: string;

  // /api/user/me only
  email?: string | null;

  // /api/users-public/:username — tutor only
  tutorBio?:   string | null;
  hourlyRate?: number | null;
  subjects?:   { id: string; name: string; category: string | null }[];

  // /api/user/me — present when role === 'tutor'
  tutor?: {
    id:          string;
    hourlyRate:  number | null;
    isAvailable: boolean;
  } | null;
};