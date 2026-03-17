// src/routes/admin/Admin.dashboard.ts
import { Router } from 'express';
import { requireAuth }          from '@/routes/middleware/requireAuth';
import { withRole }             from '@/routes/middleware/withRole';
import { prisma }               from '@/config/database';
import { redisPresenceService } from '@/infra/redis/redis.presence.service';

const router = Router();

router.get('/stats', requireAuth, withRole('admin'), async (_req, res) => {
  try {
    const [stats, onlineUsers] = await Promise.all([
      prisma.userProfile.groupBy({
        by:     ['role'],
        where:  { deletedAt: null },
        _count: { role: true },
      }),
      redisPresenceService.getOnlineCount(),
    ]);

    const total   = stats.reduce((sum, s) => sum + s._count.role, 0);
    const tutors  = stats.find(s => s.role === 'tutor'  )?._count.role ?? 0;
    const students = stats.find(s => s.role === 'student')?._count.role ?? 0;

    return res.json({
      success: true,
      stats: { totalUsers: total, tutors, students, onlineUsers },
    });
  } catch (err) {
    console.error('[admin/dashboard] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
});

export default router;
