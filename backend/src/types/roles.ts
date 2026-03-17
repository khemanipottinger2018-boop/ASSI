export type UserRole =
  | 'student'
  | 'tutor-applicant'
  | 'tutor'
  | 'admin';

export function isUserRole(role: string): role is UserRole {
  return (
    role === 'student' ||
    role === 'tutor-applicant' ||
    role === 'tutor' ||
    role === 'admin'
  );
}
