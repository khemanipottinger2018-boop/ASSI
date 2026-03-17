// src/routes/middleware/requireActiveUser.ts
// ASSI Platform — Active User Guard
// Runs after requireAuth. Confirms the user exists and isn't a demo
// account that has expired. Uses Prisma userProfile (not raw SQL).

import { Request, Response, NextFunction } from 'express';
import { prisma }      from '@/config/database';
import { AuthContext } from '@/types/auth';

export async function requireActiveUser(
  _req: Request,
  res:  Response,
  next: NextFunction
) {
  try {
    const auth = res.locals.auth as AuthContext;

    if (!auth?.userId) {
      console.error('[requireActiveUser] Missing auth context — check middleware order');
      return res.status(500).json({ success: false, error: 'Authentication context missing' });
    }

    const profile = await prisma.userProfile.findUnique({
      where:  { userId: auth.userId },
      select: { isDemo: true, demoExpiresAt: true, deletedAt: true },
    });

    if (!profile || profile.deletedAt) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const isDemoExpired =
      profile.isDemo &&
      profile.demoExpiresAt !== null &&
      new Date(profile.demoExpiresAt) < new Date();

    if (isDemoExpired) {
      return res.status(403).json({
        success: false,
        code:    'DEMO_EXPIRED',
        message: 'Your demo has expired. Please create a full account to continue.',
      });
    }

    next();
  } catch (err) {
    console.error('[requireActiveUser] error:', err);
    return res.status(500).json({ success: false, error: 'Authorization check failed' });
  }
}
