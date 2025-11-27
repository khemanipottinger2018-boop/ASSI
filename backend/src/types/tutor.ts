// src/types/tutor.ts
export interface TutorProfile {
  tutor_id: string;           // From Tutors table
  user_id: string;            // From Tutors table  
  hourly_rate: number;        // From Tutors table
  total_sessions: number;     // From Tutors table
  is_available: boolean;      // From Tutors table
  response_time: number;      // From Tutors table (in minutes?)
  bio: string | null;         // From Tutors table
  date_of_birth: string;      // From Tutors table (Date)
  age_verified: boolean;      // From Tutors table
  teaching_philosophy: string | null;  // From Tutors table
  preferred_teaching_times: string | null;  // From Tutors table
  timezone: string | null;    // From Tutors table
  profile_completed_at: string | null; // From Tutors table (Date)
  is_student_tutor: boolean;  // From Tutors table
  
  // Joined from Users table
  username: string;
  email: string;
  role: string;
  user_bio?: string | null;
  phone_number?: string | null;
  show_phone?: boolean;
  created_at: string;
  last_login?: string;
  is_online: boolean;
  last_seen: string;
  
  // Joined from TutorSubjects and Subjects
  subjects: TutorSubject[];
}

export interface TutorSubject {
  subject_id: string;
  name: string;
  level: string;
  tutor_subject_id: string;
}

export interface TutorApplication {
  application_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  application_date: string;
  reviewed_by_admin_id?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  
  // User info
  username: string;
  email: string;
  
  // Application details
  education: TutorEducation[];
  exam_qualifications: TutorExamQualification[];
  subjects: ApplicationSubject[];
}

export interface TutorEducation {
  education_id: string;
  tutor_id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  year_completed: number;
  is_verified: boolean;
}

export interface TutorExamQualification {
  qualification_id: string;
  tutor_id: string;
  exam_name: string;
  score: string;
  year_taken: number;
  is_verified: boolean;
}

export interface ApplicationSubject {
  application_subject_id: string;
  application_id: string;
  subject_id: string;
  subject_name: string;
  subject_level: string;
}

// Query parameters for tutor search
export interface TutorQueryParams {
  subject_id?: string;
  min_rate?: number;
  max_rate?: number;
  is_available?: boolean;
  is_online?: boolean;
  is_student_tutor?: boolean;
  response_time_max?: number;
  page?: number;
  limit?: number;
}

// Response types
export interface TutorsResponse {
  success: boolean;
  tutors: TutorProfile[];
  total: number;
  page: number;
  limit: number;
}

export interface AvailabilityResponse {
  success: boolean;
  available: boolean;
  count: number;
  tutors: Pick<TutorProfile, 'tutor_id' | 'user_id' | 'username' | 'hourly_rate' | 'is_online'>[];
}

export interface TutorStats {
  total_sessions: number;
  average_rating: number;
  total_earnings: number;
  response_rate: number;
  student_count: number;
}

// For tutor dashboard
export interface TutorDashboard {
  stats: TutorStats;
  recent_sessions: any[]; // Define based on your session structure
  upcoming_sessions: any[];
  student_analytics: any[];
}