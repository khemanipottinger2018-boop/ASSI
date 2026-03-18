// src/types/profile.view.ts
// Single source of truth — import this everywhere.
// Delete components/types/user-profile.view.ts

export type UserProfileView = {
  id: string;
  username: string;
  role: 'student' | 'tutor' | 'admin' | 'tutor-applicant';
  createdAt: string;

  // Only returned for own profile
  email?: string;

  // From dbo.UserProfiles
  bio?: string;
  avatarUrl?: string;
  phoneNumber?: string;

  // Tutor-only
  hourlyRate?: number;
  timezone?: string;
  tutorBio?: string;
  subjects?: {
    id: string;
    name: string;
    level: string;
  }[];
};