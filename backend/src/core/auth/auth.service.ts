// services/auth.service.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '@/config/database';
import { redisService } from '@/infra/redis/redis.service';
import { User } from '@/core/users/user.types';


const JWT_SECRET = process.env.JWT_SECRET!;
const ACCESS_TOKEN_EXPIRY = '1h'; // 1 hour
const REFRESH_TOKEN_EXPIRY = 365 * 24 * 60 * 60; // 1 year in seconds

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: 'student' | 'tutor-applicant' | 'tutor' | 'admin';
  disclaimerAccepted?: boolean;
  tutorProfile?: any | null;
}

export class AuthService {
  // --------- PASSWORD ----------
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // --------- TOKEN ----------
  static generateAccessToken(user: AuthUser): string {
    const payload = { id: user.id, username: user.username, email: user.email, role: user.role };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  }

  static generateRefreshToken(user: AuthUser): string {
    const payload = { id: user.id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY }); // number in seconds

    // Save in Redis for invalidation
    redisService.setRefreshToken(user.id, token, REFRESH_TOKEN_EXPIRY * 1000);
    return token;
  }

  static verifyAccessToken(token: string): AuthUser | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (!decoded?.id || !decoded?.username || !decoded?.email || !decoded?.role) return null;
      return {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role as AuthUser['role'],
      };
    } catch {
      return null;
    }
  }

  static verifyRefreshToken(token: string): { id: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (!decoded?.id) return null;
      return { id: decoded.id };
    } catch {
      return null;
    }
  }

  // --------- USER FETCH ----------
  static async getUserById(userId: string): Promise<AuthUser | null> {
    const user = await db.queryOne<{
      id: string;
      username: string;
      email: string;
      role: string;
      disclaimer_accepted: boolean;
    }>(
      `SELECT id, username, email, role, disclaimer_accepted FROM Users WHERE id=@userId`,
      { userId }
    );
    if (!user) return null;

    const tutorProfile = await db.queryOne(`SELECT * FROM Tutors WHERE user_id=@userId`, { userId });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role as AuthUser['role'],
      disclaimerAccepted: user.disclaimer_accepted,
      tutorProfile: tutorProfile || null,
    };
  }

  // --------- PRESENCE ----------
  static async setUserOnline(userId: string) {
    await redisService.setUserStatus(userId, 'online');
  }

  static async setUserOffline(userId: string) {
    await redisService.setUserStatus(userId, 'offline');
  }

  static async getUserStatus(userId: string) {
    return redisService.getUserStatus(userId);
  }

  // --------- EMAIL VALIDATION ----------
  static validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

export const authService = AuthService;
