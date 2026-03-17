import { UserRole } from '@/types/roles';

/* ===============================
   Shared
   =============================== */

export type UUID = string;

/* ===============================
   Users
   =============================== */

export interface User {
  id: UUID;
  username: string;
  email: string;
  password_hash: string;

  role: UserRole;

  /* Profile */
  avatar_url?: string;
  first_name?: string;
  last_name?: string;
  bio?: string;

  phone_number?: string;
  show_phone: boolean;

  /* Compliance / age */
  date_of_birth?: string;
  is_age_verified: boolean;
  age_verification_date?: Date;

  /* Audit */
  created_at: Date;
  updated_at?: Date;
  last_login?: Date;
}

/* ===============================
   Tutors
   =============================== */

export interface Tutor {
  tutor_id: UUID;
  user_id: UUID;

  hourly_rate: number;
  is_available: boolean;

  bio?: string;
  teaching_philosophy?: string;
  preferred_teaching_times?: string;
  timezone?: string;

  profile_completed_at?: Date;
  last_profile_update?: Date;

  is_student_tutor: boolean;
  service_tier?: string;

  chat_mode: string;
  max_concurrent_chats: number;
}

/* ===============================
   Tutor Applications
   NOTE: Canonical type lives in tutor-application.types.ts
   Import TutorApplication from there, not here.
   =============================== */

export { TutorApplication, TutorApplicationStatus, TutorApplicationInput } from '@/types/tutor-application.types';

/* ===============================
   Subjects
   =============================== */

export interface Subject {
  subject_id: UUID;
  name: string;
  level: string;
}

/* ===============================
   Tutor <-> Subject (Join)
   =============================== */

export interface TutorSubject {
  tutor_subject_id: UUID;
  tutor_id: UUID;
  subject_id: UUID;
}

export interface ApplicationSubject {
  application_subject_id: UUID;
  application_id: UUID;
  subject_id: UUID;
}

/* ===============================
   Chat & Messaging
   =============================== */

export interface ChatSession {
  id: UUID;
  student_id: UUID;
  tutor_id: UUID;
  subject_id: UUID;

  status: 'pending' | 'active' | 'ended' | 'declined';

  requested_at: Date;
  accepted_at?: Date;
  started_at?: Date;
  ended_at?: Date;

  student_notes?: string;
  decline_reason?: string;
  expiry_time?: Date;

  ended_by?: UUID;
}

export interface ChatMessage {
  id: UUID;
  session_id: UUID;
  from_user_id: UUID;

  message: string;
  message_type_id: number;

  sent_at: Date;
  read_at?: Date;
}

/* ===============================
   Notifications
   =============================== */

export interface Notification {
  id: UUID;
  user_id: UUID;

  type: string;
  title: string;
  message: string;
  data?: any;

  is_read: boolean;
  created_at: Date;
}

/* ===============================
   Reviews
   =============================== */

export interface SessionReview {
  review_id: UUID;
  session_id: UUID;
  student_id: UUID;
  tutor_id: UUID;

  rating: number;
  comment?: string;

  created_at: Date;
}

/* ===============================
   Booked Sessions (Scheduled)
   =============================== */

export interface BookedSession {
  session_id: UUID;
  student_id: UUID;
  tutor_id: UUID;
  subject_id: UUID;

  scheduled_time: Date;
  duration_minutes: number;

  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

  price: number;
  meeting_link?: string;
  notes?: string;

  created_at: Date;
  updated_at?: Date;
}

/* ===============================
   Helper / Join Types
   =============================== */

export interface TutorWithUser extends Tutor {
  username: string;
  email: string;
  user_bio?: string;
  avatar_url?: string;
}

export interface ChatSessionWithDetails extends ChatSession {
  student_username: string;
  tutor_username: string;
  subject_name: string;
}

/* ===============================
   IMPORTANT NOTE
   =============================== */