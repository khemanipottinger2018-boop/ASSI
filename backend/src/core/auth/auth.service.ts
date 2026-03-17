// src/core/auth/auth.service.ts
// ASSI Platform — Auth Service
// Session lifecycle, user lookup, and validation helpers.
// Password hashing/verification is handled entirely by Supabase Auth —
// we never touch raw passwords after they leave the auth routes.

import crypto from 'crypto';

import { prisma }              from '@/config/database';
import { redisSessionService } from '@/infra/redis';
import { UserRole }            from '@/types/roles';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface AuthUser {
  id:                 string;
  username:           string;
  email:              string;
  role:               UserRole;
  disclaimerAccepted: boolean;
  isMinor:            boolean;
  tutorProfile:       any | null;
}

// ─────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────

export class AuthService {

  // ── Session ─────────────────────────────────

  static async createSession(userId: string, role: UserRole): Promise<string> {
    const sid = crypto.randomUUID();
    await redisSessionService.createSession(sid, userId, role);
    return sid;
  }

  static async revokeSession(sid: string): Promise<void> {
    await redisSessionService.revokeSession(sid);
  }

  static async revokeAllSessions(userId: string): Promise<void> {
    await redisSessionService.revokeAllSessions(userId);
  }

  // ── User Lookup ─────────────────────────────

  static async getUserById(userId: string): Promise<AuthUser | null> {
    const profile = await prisma.userProfile.findUnique({
      where:  { userId },
      select: {
        userId:               true,
        username:             true,
        role:                 true,
        disclaimerAccepted:   true,
        dateOfBirth:          true,   // requires migration
        parentalConsentGiven: true,   // requires migration
        tutor: {
          select: {
            id:            true,
            bio:           true,
            hourlyRate:    true,
            isAvailable:   true,
            isVerified:    true,
            rating:        true,
            totalSessions: true,
          },
        },
      },
    });

    if (!profile) return null;

    const isMinor = profile.dateOfBirth
      ? AuthService.calculateIsMinor(profile.dateOfBirth)
      : false;

    return {
      id:                 profile.userId,
      username:           profile.username,
      email:              '',   // fetched separately via getEmailById()
      role:               profile.role as UserRole,
      disclaimerAccepted: profile.disclaimerAccepted ?? false,
      isMinor,
      tutorProfile:       profile.tutor ?? null,
    };
  }

  // Fetch email directly from Supabase Auth (not stored in user_profiles)
  static async getEmailById(userId: string): Promise<string | null> {
    const { getSupabaseAdmin } = await import('@/config/database');
    const { data, error } = await getSupabaseAdmin().auth.admin.getUserById(userId);
    if (error || !data?.user) return null;
    return data.user.email ?? null;
  }

  // ── Validation ──────────────────────────────

  static validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static validatePasswordStrength(password: string): {
    valid:   boolean;
    message: string;
  } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    return { valid: true, message: 'OK' };
  }

  // ── Minor Check (App Store compliance) ──────
  // ASSI serves under-18 users — gates features and parental consent flows.

  static calculateIsMinor(dateOfBirth: Date): boolean {
    const today     = new Date();
    const birthDate = new Date(dateOfBirth);
    const age =
      today.getFullYear() - birthDate.getFullYear() -
      (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0);
    return age < 18;
  }
}

export const authService = AuthService;