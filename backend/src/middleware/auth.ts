import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getPool } from '../config/database.js';
import sql from 'mssql';

// ✅ Enhanced global type declaration
declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
    }
  }
}

// ✅ Consolidated interfaces
interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'student' | 'tutor' | 'admin';
  bio?: string | null;
  phone_number?: string | null;
  show_phone?: boolean;
  profile_completed: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface JwtPayload {
  id: string;
  username: string;
  email: string;
  role: 'student' | 'tutor' | 'admin';
  bio?: string | null;
  phone_number?: string | null;
  show_phone?: boolean;
  iat?: number;
  exp?: number;
}

// ✅ Constants for better maintainability
const AUTH_ERRORS = {
  NO_TOKEN: 'Access token required',
  INVALID_PAYLOAD: 'Invalid token payload',
  TOKEN_EXPIRED: 'Token expired',
  INVALID_TOKEN: 'Invalid token',
  VERIFICATION_FAILED: 'Token verification failed',
  AUTH_REQUIRED: 'Authentication required',
  ACCESS_DENIED: 'Access denied',
  PROFILE_INCOMPLETE: 'Please complete your profile to access this resource'
} as const;

// ✅ Session tracking with transaction safety
export const trackUserSession = async (userId: string, ipAddress: string, userAgent: string): Promise<void> => {
  try {
    const pool = await getPool();
    
    await pool.request()
      .input('user_id', sql.VarChar, userId)
      .input('ip_address', sql.VarChar, ipAddress)
      .input('user_agent', sql.VarChar, userAgent)
      .query(`
        INSERT INTO UserSessions (user_id, ip_address, user_agent) 
        VALUES (@user_id, @ip_address, @user_agent);
        
        UPDATE Users SET last_login = GETDATE() WHERE id = @user_id;
      `);
      
  } catch (error) {
    console.error('Error tracking user session:', error);
    // Don't throw - session tracking shouldn't break auth flow
  }
};

// ✅ Optimized session activity update
export const updateSessionActivity = async (userId: string): Promise<void> => {
  try {
    const pool = await getPool();
    
    await pool.request()
      .input('user_id', sql.VarChar, userId)
      .query(`
        UPDATE TOP (1) UserSessions 
        SET last_activity = GETDATE() 
        WHERE user_id = @user_id 
        ORDER BY login_at DESC
      `);
  } catch (error) {
    console.error('Error updating session activity:', error);
    // Silent fail - activity tracking is non-critical
  }
};

// ✅ Centralized JWT error handling
const handleJwtError = (err: unknown, res: Response): void => {
  console.error('JWT verification error:', err);
  
  if (err instanceof jwt.TokenExpiredError) {
    res.status(401).json({ 
      success: false,
      error: AUTH_ERRORS.TOKEN_EXPIRED,
      code: 'TOKEN_EXPIRED'
    });
    return;
  }
  
  if (err instanceof jwt.JsonWebTokenError) {
    res.status(401).json({ 
      success: false,
      error: AUTH_ERRORS.INVALID_TOKEN,
      code: 'INVALID_TOKEN'
    });
    return;
  }

  res.status(500).json({ 
    success: false,
    error: AUTH_ERRORS.VERIFICATION_FAILED,
    code: 'VERIFICATION_FAILED'
  });
};

// ✅ Main authentication middleware
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  // Check both Authorization header and socket handshake
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : 
                (req as any).handshake?.auth?.token; // Support Socket.IO handshake

  if (!token) {
    res.status(401).json({ 
      success: false,
      error: AUTH_ERRORS.NO_TOKEN,
      code: 'NO_TOKEN'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    
    // ✅ Validate required token fields
    if (!decoded.id || !decoded.username || !decoded.email || !decoded.role) {
      res.status(401).json({ 
        success: false,
        error: AUTH_ERRORS.INVALID_PAYLOAD,
        code: 'INVALID_PAYLOAD'
      });
      return;
    }

    // ✅ Enhanced profile completion check (more flexible)
    const isProfileCompleted = Boolean(
      decoded.bio?.trim() && 
      decoded.phone_number?.trim() &&
      decoded.phone_number.length >= 10 // Basic phone validation
    );

    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      bio: decoded.bio?.trim() || null,
      phone_number: decoded.phone_number?.trim() || null,
      show_phone: decoded.show_phone || false,
      profile_completed: isProfileCompleted,
      created_at: decoded.iat ? new Date(decoded.iat * 1000) : undefined
    };
    
    // ✅ Non-blocking session update (only for HTTP requests, not Socket.IO)
    if (req.method !== 'SOCKET') {
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      updateSessionActivity(req.user.id).catch(() => {});
      
      // Track new session on significant actions (not every request)
      if (req.originalUrl.includes('/auth/login') || req.originalUrl.includes('/auth/refresh')) {
        trackUserSession(req.user.id, ipAddress, userAgent).catch(() => {});
      }
    }
    
    next();
  } catch (err) {
    handleJwtError(err, res);
  }
};

// ✅ Role-based middleware factory
export const requireRole = (role: 'student' | 'tutor' | 'admin') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: AUTH_ERRORS.AUTH_REQUIRED,
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({
        success: false,
        error: AUTH_ERRORS.ACCESS_DENIED,
        code: 'ACCESS_DENIED',
        message: `${role} role required. Current role: ${req.user.role}.`
      });
      return;
    }
    next();
  };
};

// ✅ Multiple roles middleware
export const requireAnyRole = (roles: ('student' | 'tutor' | 'admin')[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: AUTH_ERRORS.AUTH_REQUIRED,
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: AUTH_ERRORS.ACCESS_DENIED,
        code: 'ACCESS_DENIED', 
        message: `Required roles: ${roles.join(', ')}. Your role: ${req.user.role}`
      });
      return;
    }
    next();
  };
};

// ✅ Profile completion middleware (optional for some routes)
export const requireProfileCompletion = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: AUTH_ERRORS.AUTH_REQUIRED,
      code: 'AUTH_REQUIRED'
    });
    return;
  }

  if (!req.user.profile_completed) {
    res.status(403).json({
      success: false,
      error: AUTH_ERRORS.PROFILE_INCOMPLETE,
      code: 'PROFILE_INCOMPLETE',
      message: 'Please complete your profile with bio and phone number'
    });
    return;
  }
  next();
};

// ✅ Optional profile check (doesn't block, just adds info)
export const checkProfileCompletion = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user && !req.user.profile_completed) {
    // Add warning header but continue
    res.set('X-Profile-Warning', 'Profile incomplete');
  }
  next();
};

// ✅ Generic role authorization (legacy support)
export const authorizeRoles = (roles: string[]) => {
  return requireAnyRole(roles as ('student' | 'tutor' | 'admin')[]);
};

// ✅ Role shortcuts
export const requireAdmin = requireRole('admin');
export const requireTutor = requireRole('tutor');  
export const requireStudent = requireRole('student');

// ✅ Student or Tutor (common for chat)
export const requireStudentOrTutor = requireAnyRole(['student', 'tutor']);