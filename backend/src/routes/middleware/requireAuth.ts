import { Request, Response, NextFunction } from 'express';
import { redisSessionService } from '@/infra/redis';
import { SESSION_COOKIE_NAME } from '@/config/cookies';
import { AuthContext } from '@/types/auth';

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sid = req.cookies?.[SESSION_COOKIE_NAME];

    if (!sid) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const session = await redisSessionService.getSession(sid);

    if (!session) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const auth: AuthContext = {
      userId: session.userId,
      role:   session.role,
      sid,
    };

    // ✅ res.locals — not (req as any).auth
    // All protected routes read from res.locals.auth
    res.locals.auth = auth;

    next();
  } catch (err) {
    console.error('[requireAuth] error:', err);
    res.status(500).json({ success: false, error: 'Internal authentication error' });
  }
}