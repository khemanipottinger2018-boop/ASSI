export type SessionUser = {
  id: string;
  username: string;
  email?: string;
  role: 'student' | 'tutor' | 'admin';
};
