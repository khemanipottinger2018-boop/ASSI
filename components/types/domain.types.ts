// frontend/types/dashboard.types.ts

export type StudentDashboardStats = {
  completedSessions: number;
  activeChats: number;
  tutorsUsed: number;
  creditsRemaining: number;
};

export type ActiveChat = {
  id: number;
  tutorId: number;
  tutorName: string;
  subject: string;
  startedAt: string;
};

export type AvailableTutor = {
  id: number;
  name: string;
  status: 'online' | 'idle' | 'offline';
  subjects: string[];
  avatarUrl: string;
};

export type RecentSession = {
  id: number;
  tutorName: string;
  subject: string;
  endedAt: string;
  rating: number | 'Not rated';
};

export type StudentDashboardData = {
  user: {
    id: number;
    username: string;
    email: string;
    role: 'student';
  };
  stats: StudentDashboardStats;
  activeChats: ActiveChat[];
  availableTutors: AvailableTutor[];
  recentSessions: RecentSession[];
  quickActions: {
    label: string;
    action: string;
    icon: string;
  }[];
};
