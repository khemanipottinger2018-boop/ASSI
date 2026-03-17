// src/routes/admin/Admin.metrics.ts
import { Router } from 'express';
import { requireAuth }          from '@/routes/middleware/requireAuth';
import { withRole }             from '@/routes/middleware/withRole';
import { prisma }               from '@/config/database';
import { redisPresenceService } from '@/infra/redis/redis.presence.service';
import { redisRuntimeService }  from '@/infra/redis/redis.runtime.service';

const router = Router();

/* ── GET /api/admin/metrics ── */

router.get('/', requireAuth, withRole('admin'), async (_req, res) => {
  try {
    const [userStats, onlineUsers, activeSessions, totalSessions] = await Promise.all([
      prisma.userProfile.groupBy({
        by:     ['role'],
        where:  { deletedAt: null },
        _count: { role: true },
      }),
      redisPresenceService.getOnlineCount(),
      redisRuntimeService.getActiveSessionIds().then(ids => ids.length),
      prisma.bookedSession.count(),
    ]);

    const totalUsers  = userStats.reduce((sum, s) => sum + s._count.role, 0);
    const totalTutors = userStats.find(s => s.role === 'tutor'  )?._count.role ?? 0;
    const totalStudents = userStats.find(s => s.role === 'student')?._count.role ?? 0;

    return res.json({
      success: true,
      metrics: { totalUsers, totalTutors, totalStudents, onlineUsers, activeSessions, totalSessions },
    });
  } catch (err) {
    console.error('[admin/metrics] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load metrics' });
  }
});

/* ── GET /api/admin/metrics/runtime ── */
// Returns live Node.js process stats.
// RuntimeMetricsService was removed (depended on a non-existent service).

router.get('/runtime', requireAuth, withRole('admin'), async (_req, res) => {
  try {
    const mem = process.memoryUsage();
    return res.json({
      success: true,
      runtime: {
        heap_used_mb:  Math.round(mem.heapUsed  / 1024 / 1024),
        rss_mb:        Math.round(mem.rss       / 1024 / 1024),
        external_mb:   Math.round(mem.external  / 1024 / 1024),
        uptime_s:      Math.round(process.uptime()),
      },
    });
  } catch (err) {
    console.error('[admin/metrics/runtime] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load runtime metrics' });
  }
});

export default router;
