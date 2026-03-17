import { Router } from 'express';
import { redisSessionService } from '@/infra/redis';
import { SESSION_COOKIE_NAME } from '@/config/cookies';

const router = Router();

router.post('/', async (req, res) => {
  const sid = req.cookies?.[SESSION_COOKIE_NAME];
  if (sid) {
    await redisSessionService.revokeSession(sid);
  }

  res.clearCookie(SESSION_COOKIE_NAME);
  res.json({ success: true });
});

export default router;
