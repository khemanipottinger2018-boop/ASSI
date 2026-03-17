// src/routes/auth/login.ts
// ASSI Platform — Login
// Auth via Supabase Auth (email + password).
// Role + profile data from user_profiles via Prisma.

import { Router } from 'express';
import { getSupabaseAnon } from '@/config/database';
import { prisma }          from '@/config/database';
import { AuthService }     from '@/core/auth/auth.service';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/config/cookies';
import { isUserRole } from '@/types/roles';

const router = Router();

/**
 * POST /api/auth/login
 */
router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body as {
      email?:    string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Missing credentials' });
    }

    // 1. Authenticate via Supabase Auth
    const { data, error } = await getSupabaseAnon().auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
      password,
    });

    if (error || !data.user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const authUser = data.user;

    // 2. Fetch role + profile from user_profiles
    const profile = await prisma.userProfile.findUnique({
      where:  { userId: authUser.id },
      select: { role: true, username: true, disclaimerAccepted: true, deletedAt: true },
    });

    if (!profile || profile.deletedAt) {
      return res.status(401).json({ success: false, error: 'Account not found' });
    }

    if (!isUserRole(profile.role)) {
      console.error('[login] Invalid role in DB:', profile.role);
      return res.status(500).json({ success: false, error: 'Invalid user role' });
    }

    // 3. Create Redis-backed sliding session
    const sid = await AuthService.createSession(authUser.id, profile.role);

    res.cookie(SESSION_COOKIE_NAME, sid, sessionCookieOptions);

    return res.json({
      success: true,
      user: {
        id:       authUser.id,
        username: profile.username,
        email:    authUser.email,
        role:     profile.role,
      },
    });
  } catch (err) {
    console.error('[login] error:', err);
    return res.status(500).json({ success: false, error: 'Login failed' });
  }
});

export default router;
