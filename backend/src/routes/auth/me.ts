// src/routes/auth/me.ts
// ASSI Platform — Current User
// Profile from Prisma userProfile. Email from Supabase Auth.

import { Router } from 'express';
import { requireAuth }      from '@/routes/middleware/requireAuth';
import { prisma, getSupabaseAdmin } from '@/config/database';
import { AuthContext }      from '@/types/auth';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  try {
    const { userId } = res.locals.auth as AuthContext;

    const [profile, authUser] = await Promise.all([
      prisma.userProfile.findUnique({
        where:  { userId },
        select: {
          userId:            true,
          username:          true,
          role:              true,
          disclaimerAccepted: true,
          isDemo:            true,
          demoExpiresAt:     true,
          deletedAt:         true,
        },
      }),
      getSupabaseAdmin().auth.admin.getUserById(userId),
    ]);

    if (!profile || profile.deletedAt) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    return res.json({
      success: true,
      user: {
        id:                 profile.userId,
        username:           profile.username,
        email:              authUser.data.user?.email ?? null,
        role:               profile.role,
        disclaimerAccepted: profile.disclaimerAccepted,
        isDemo:             profile.isDemo,
        demoExpiresAt:      profile.demoExpiresAt,
      },
    });
  } catch (err) {
    console.error('[me] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

export default router;
