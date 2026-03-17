import { Request } from 'express';
import { UserRole } from '@/types/roles';

/**
 * Auth payload injected by requireAuth middleware
 */
export interface AuthContext {
  userId: string;
  role: UserRole;
  sid: string;
}

/**
 * Express request with authenticated user context
 * 
 * Used ONLY in routes that are protected by requireAuth
 */
export interface AuthenticatedRequest extends Request {
  auth: AuthContext;
}
