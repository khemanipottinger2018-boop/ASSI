// app/dashboard/admin/types/admin.ts
export interface DashboardStats {
  users: {
    total_users: number;
    total_tutors: number;
    total_students: number;
    new_users_30d: number;
  };
  applications: {
    total_applications: number;
    pending_applications: number;
    approved_applications: number;
    rejected_applications: number;
  };
  activity: {
    logins_7d: number;
  };
  online: {
    online_users: number;
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'student' | 'tutor' | 'admin';
  created_at: string;
  last_login: string;
  application_count: number;
}

export interface UserActivity {
  session_id: string;
  user_id: string;
  username: string;
  email: string;
  login_at: string;
  last_activity: string;
  ip_address: string;
  user_agent: string;
  logout_at: string;
}

export interface OnlineUser {
  user_id: string;
  username: string;
  email: string;
  role: string;
  last_activity: string;
  ip_address: string;
  login_at: string;
}

export type AdminTab = 'dashboard' | 'users' | 'applications' | 'activity' | 'online';