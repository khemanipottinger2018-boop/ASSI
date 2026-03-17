// src/core/users/user.types.ts
// ASSI Platform — User & Tutor Types

import { UserRole } from '@/types/roles';

// ─────────────────────────────────────────────
// USER
// Maps to public.user_profiles in Supabase.
// Identity (email, password) lives in auth.users — same UUID as userId.
// ─────────────────────────────────────────────

export interface User {
  userId:   string;   // PK — FK to auth.users(id)
  username: string;
  role:     UserRole;

  // auth.users fields (fetched separately via Supabase Admin when needed)
  email?: string;

  bio?:         string;
  phoneNumber?: string;
  showPhone?:   boolean;

  disclaimerAccepted: boolean;
  isSuspended:        boolean;
  isDemo:             boolean;
  demoExpiresAt?:     Date;

  createdAt:  Date;
  updatedAt:  Date;
  lastLogin?: Date;
  deletedAt?: Date;

  // ── App Store / ASSI High School compliance ──
  // Columns require migration — add to user_profiles before use.
  // ALTER TABLE user_profiles ADD COLUMN date_of_birth date;
  // ALTER TABLE user_profiles ADD COLUMN parental_consent_given boolean DEFAULT false;
  // ALTER TABLE user_profiles ADD COLUMN parent_email text;
  dateOfBirth?:         Date;
  isMinor:              boolean;   // derived at auth time — not stored
  parentalConsentGiven: boolean;
  parentEmail?:         string;
}

// ─────────────────────────────────────────────
// TUTOR
// ─────────────────────────────────────────────

export interface Tutor extends User {
  tutorId: string;

  hourlyRate:               number;
  teachingPhilosophy?:      string;
  preferredTeachingTimes?:  string;
  timezone?:                string;

  profileCompletedAt?:  Date;
  lastProfileUpdate?:   Date;

  isStudentTutor:  boolean;
  serviceTier?:    string;

  chatMode:            string;
  maxConcurrentChats:  number;

  subjects: Subject[];
}

// ─────────────────────────────────────────────
// SUBJECT
// ─────────────────────────────────────────────

export interface Subject {
  subjectId: string;
  name:      string;
  level:     string;   // e.g. 'CSEC', 'CAPE', 'Primary'
}
