// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { authService, AuthUser } from '@/core/auth/auth.service';

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Authentication required' });

  const user = authService.verifyAccessToken(token);
  if (!user) return res.status(401).json({ success: false, error: 'Invalid or expired session' });

  req.user = user;
  next();
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
    if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ success: false, error: 'Permission denied' });
    next();
  };
}

export const requireStudent = requireRole('student', 'tutor-applicant', 'admin');
export const requireTutor = requireRole('tutor', 'admin');
export const requireAdmin = requireRole('admin');
