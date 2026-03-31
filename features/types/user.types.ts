// components/types/user.types.ts
// Core user types — all fields verified against backend contract.

export type UserRole = 'student' | 'tutor' | 'tutor_applicant' | 'admin';

export interface Subject {
  id:       string;   // was subjectId — backend returns id
  name:     string;
  category: string;   // was level — backend returns category (CSEC | CAPE)
}

export interface User {
  id:                 string;
  username:           string;
  email:              string;
  role:               UserRole;
  createdAt:          string;
  disclaimerAccepted: boolean;
}

export interface Tutor extends User {
  tutorId:            string;   // tutors table PK (different from User.id)
  bio:                string | null;
  hourlyRate:         number | null;
  teachingPhilosophy: string | null;
  timezone:           string | null;
  isStudentTutor:     boolean;
  chatMode:           string | null;
  maxConcurrentChats: number;
  subjects:           Subject[];
}