import { Request, Response, NextFunction } from 'express';
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  sessionCookieOptions,
} from '@/config/cookies';
import { redisSessionService } from '@/infra/redis/redis.session.service';

export async function refreshSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const sid = req.cookies?.[SESSION_COOKIE_NAME];
    if (!sid) return next();

    const session = await redisSessionService.getSession(sid);
    if (!session) return next();

    // 🔁 Refresh Redis TTL (authoritative)
    await redisSessionService.touchSession(sid);

    // 🔁 Refresh browser cookie expiry
    res.cookie(SESSION_COOKIE_NAME, sid, {
      ...sessionCookieOptions,
      maxAge: SESSION_TTL_SECONDS * 1000,
    });

    next();
  } catch (err) {
    // Never block requests due to refresh issues
    console.warn('[SESSION REFRESH SKIPPED]', err);
    next();
  }
}
