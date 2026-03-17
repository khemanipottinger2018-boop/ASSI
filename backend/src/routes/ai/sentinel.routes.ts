// backend/src/routes/ai/sentinel.routes.ts
// Mount: app.use('/api/ai/sentinel', router)
// All routes: admin only via requireAuth + withRole('admin')

import { Router } from 'express';
import { requireAuth }             from '@/routes/middleware/requireAuth';
import { withRole }                from '@/routes/middleware/withRole';
import { prisma }                  from '@/config/database';
import { isUserRole }              from '@/types/roles';
import { TutorApplicationService } from '@/services/tutor-application.service';
import { redisRuntimeService }     from '@/infra/redis/redis.runtime.service';
import { RuntimeMetricsService }   from '@/services/runtime-metrics.service';

const router = Router();

router.use(requireAuth, withRole('admin'));

/* ── GET /api/ai/sentinel/users ─────────────────────
   Search users by role, suspended status, or username/email
   ?role=student|tutor|admin|tutor-applicant
   ?suspended=true|false
   ?q=username_or_email
   ───────────────────────────────────────────────────── */
router.get('/users', async (req, res) => {
  try {
    const { role, suspended, q } = req.query;

    const where: Record<string, any> = { deletedAt: null };

    if (role && isUserRole(role as string)) {
      where.role = role;
    }

    if (suspended === 'true')  where.isSuspended = true;
    if (suspended === 'false') where.isSuspended = false;

    if (q && typeof q === 'string' && q.trim().length >= 2) {
      const term = q.trim();
      where.OR = [
        { username: { contains: term, mode: 'insensitive' } },
        { email:    { contains: term, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.userProfile.findMany({
      where,
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: {
        id:          true,
        username:    true,
        email:       true,
        role:        true,
        isSuspended: true,
        isDemo:      true,
        createdAt:   true,
        lastLogin:   true,
      },
    });

    return res.json({ success: true, count: users.length, users });
  } catch (err) {
    console.error('[sentinel/users] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to search users' });
  }
});

/* ── GET /api/ai/sentinel/users/:identifier ──────────
   Get a single user by id, username, or email
   ───────────────────────────────────────────────────── */
router.get('/users/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    const user = await prisma.userProfile.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { id:       identifier },
          { username: identifier },
          { email:    identifier },
        ],
      },
      select: {
        id:                  true,
        username:            true,
        email:               true,
        role:                true,
        isSuspended:         true,
        isDemo:              true,
        demoExpiresAt:       true,
        createdAt:           true,
        lastLogin:           true,
        disclaimerAccepted:  true,
        bio:                 true,
        avatarUrl:           true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({ success: true, user });
  } catch (err) {
    console.error('[sentinel/users/:id] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

/* ── PATCH /api/ai/sentinel/users/:userId/suspend ────
   Suspend or unsuspend a user
   Body: { suspended: boolean, reason?: string }
   ───────────────────────────────────────────────────── */
router.patch('/users/:userId/suspend', async (req, res) => {
  try {
    const { userId }            = req.params;
    const { suspended, reason } = req.body;

    if (typeof suspended !== 'boolean') {
      return res.status(400).json({ success: false, error: 'suspended must be a boolean' });
    }

    await prisma.userProfile.updateMany({
      where: { id: userId, deletedAt: null },
      data:  { isSuspended: suspended, updatedAt: new Date() },
    });

    return res.json({ success: true, suspended, reason: reason ?? null });
  } catch (err) {
    console.error('[sentinel/suspend] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update suspension' });
  }
});

/* ── GET /api/ai/sentinel/applications ───────────────
   List pending tutor applications
   ───────────────────────────────────────────────────── */
router.get('/applications', async (_req, res) => {
  try {
    const applications = await TutorApplicationService.getPending();
    return res.json({ success: true, count: applications.length, applications });
  } catch (err) {
    console.error('[sentinel/applications] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch applications' });
  }
});

/* ── POST /api/ai/sentinel/applications/:id/approve ── */
router.post('/applications/:id/approve', async (req, res) => {
  try {
    await TutorApplicationService.approve(req.params.id, req.body.notes);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[sentinel/applications/approve] error:', err);
    return res.status(400).json({ success: false, error: err.message ?? 'Failed to approve' });
  }
});

/* ── POST /api/ai/sentinel/applications/:id/reject ─── */
router.post('/applications/:id/reject', async (req, res) => {
  try {
    await TutorApplicationService.reject(req.params.id, req.body.notes);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[sentinel/applications/reject] error:', err);
    return res.status(400).json({ success: false, error: err.message ?? 'Failed to reject' });
  }
});

/* ── GET /api/ai/sentinel/errors?range=24h|7d|30d ────
   ───────────────────────────────────────────────────── */
router.get('/errors', async (req, res) => {
  try {
    const range = (req.query.range as string) || '24h';

    const sinceMap: Record<string, number> = {
      '30d': 30 * 24 * 60 * 60 * 1000,
      '7d':   7 * 24 * 60 * 60 * 1000,
      '24h':      24 * 60 * 60 * 1000,
    };

    const since = new Date(Date.now() - (sinceMap[range] ?? sinceMap['24h']));

    const errors = await prisma.errorLog.findMany({
      where:   { createdAt: { gte: since } },
      take:    100,
      orderBy: { createdAt: 'desc' },
      select: {
        id:         true,
        userId:     true,
        errorType:  true,
        message:    true,
        endpoint:   true,
        method:     true,
        severity:   true,
        resolved:   true,
        createdAt:  true,
      },
    });

    return res.json({ success: true, range, count: errors.length, errors });
  } catch (err) {
    console.error('[sentinel/errors] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch errors' });
  }
});

/* ── GET /api/ai/sentinel/sessions/live ────────────── */
router.get('/sessions/live', async (_req, res) => {
  try {
    const sessions = await redisRuntimeService.getLiveSessions();
    return res.json({ success: true, count: sessions.length, sessions });
  } catch (err) {
    console.error('[sentinel/sessions/live] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch live sessions' });
  }
});

/* ── GET /api/ai/sentinel/metrics ──────────────────── */
router.get('/metrics', async (_req, res) => {
  try {
    const snapshot = await RuntimeMetricsService.snapshot();
    return res.json({ success: true, runtime: snapshot });
  } catch (err) {
    console.error('[sentinel/metrics] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch metrics' });
  }
});

export default router;