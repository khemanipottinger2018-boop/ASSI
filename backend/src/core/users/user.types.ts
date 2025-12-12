// src/types/user.types.ts

export type UserRole = 'student' | 'tutor' | 'tutor-applicant';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  bio?: string;
  phoneNumber?: string;
  showPhone?: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  disclaimerAccepted: boolean;
}

export interface Tutor extends User {
  tutorId: string;
  hourlyRate: number;
  teachingPhilosophy?: string;
  preferredTeachingTimes?: string;
  timezone?: string;
  profileCompletedAt?: Date;
  lastProfileUpdate?: Date;
  isStudentTutor: boolean;
  serviceTier?: string;
  chatMode: string;
  maxConcurrentChats: number;
  subjects: Subject[];
}

export interface Subject {
  subjectId: string;
  name: string;
  level: string;
}
