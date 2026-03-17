import { Router } from 'express';
import { requireAuth } from '@/routes/middleware/requireAuth';
import { notificationService } from '@/core/notifications/notification.service';
import { AuthContext } from '@/types/auth';

const router = Router();

/* ── GET /api/notifications ──────────────────────── */

router.get('/', requireAuth, async (req, res) => {
  try {
    const { userId } = res.locals.auth as AuthContext;
    const inbox = await notificationService.getInbox(userId);
    return res.json({ success: true, notifications: inbox });
  } catch (err) {
    console.error('[notifications/get] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load notifications' });
  }
});

/* ── POST /api/notifications/read-all ────────────── */

router.post('/read-all', requireAuth, async (req, res) => {
  try {
    const { userId } = res.locals.auth as AuthContext;
    await notificationService.markAllRead(userId);
    return res.json({ success: true });
  } catch (err) {
    console.error('[notifications/read-all] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to mark notifications read' });
  }
});

export default router;