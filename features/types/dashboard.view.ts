// src/types/dashboard.view.ts

export type DashboardStats = {
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
};

export type UpcomingSession = {
  sessionId: string;
  type: 'instant' | 'booked';
  startsAt: string;
  tutorName?: string;
  studentName?: string;
};

export type StudentDashboardView = {
  role: 'student';
  upcomingSessions: UpcomingSession[];
  stats: DashboardStats;
};

export type TutorDashboardView = {
  role: 'tutor';
  upcomingSessions: UpcomingSession[];
  stats: DashboardStats;
  isOnline: boolean;
};

export type DashboardView =
  | StudentDashboardView
  | TutorDashboardView;
