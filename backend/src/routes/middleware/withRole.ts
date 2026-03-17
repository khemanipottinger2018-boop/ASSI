import { RequestHandler } from 'express';
import { UserRole } from '@/types/roles';
import { AuthContext } from '@/types/auth';

export function withRole(requiredRole: UserRole): RequestHandler {
  return (req, res, next) => {
    const auth = res.locals.auth as AuthContext;

    if (!auth) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    if (auth.role !== requiredRole) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    next();
  };
}