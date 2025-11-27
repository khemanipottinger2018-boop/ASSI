// /types/dashboard.ts
export interface Session {
  session_id: string;
  scheduled_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  price: number;
  topic: string;
  student_id: string;
  student_first_name: string;
  student_last_name: string;
  student_email: string;
  subject_name: string;
  created_at: string;
}

export interface PerformanceMetrics {
  completed_sessions: number;
  upcoming_sessions: number;
  avg_earnings: number;
  total_earnings: number;
  student_satisfaction: number;
  response_rate: number;
}

export interface StudentAnalytics {
  onlineStudents: number;
  newStudentsThisWeek: number;
  weeklyTrend: number;
}

export interface QuickStats {
  total_sessions: number;
  completed_count: number;
  scheduled_count: number;
  pending_count: number;
  cancelled_count: number;
}

export interface TutorRanking {
  rating: number;
  totalReviews: number;
  rank: string;
  subjectRank: number | null;
  primarySubject: string;
}

export interface DashboardData {
  profile: any;
  studentAnalytics: StudentAnalytics;
  performanceMetrics: PerformanceMetrics;
  upcomingSessions: Session[];
  quickStats: QuickStats;
  notifications: number;
  tutorRanking: TutorRanking;
}