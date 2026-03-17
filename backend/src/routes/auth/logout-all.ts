import { Router, Request, Response } from 'express';
import { requireAuth } from '@/routes/middleware/requireAuth';
import { redisSessionService } from '@/infra/redis';
import { SESSION_COOKIE_NAME } from '@/config/cookies';
import { AuthContext } from '@/types/auth';

const router = Router();

/**
 * POST /api/auth/logout-all
 * Revoke all sessions for the authenticated user
 */
router.post('/', requireAuth, async (_req: Request, res: Response) => {
  const auth = res.locals.auth as AuthContext;
  const userId = auth.userId;

  await redisSessionService.revokeAllSessions(userId);

  // Clear current session cookie as well
  res.clearCookie(SESSION_COOKIE_NAME);

  res.json({ success: true });
});

export default router;
