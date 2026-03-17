// src/routes/tutors.routes.ts
// ASSI Platform — Tutor Availability

import { Router } from 'express';
import { requireAuth }          from '@/routes/middleware/requireAuth';
import { redisPresenceService } from '@/infra/redis/redis.presence.service';
import { prisma }               from '@/config/database';
import { AuthContext }          from '@/types/auth';

const router = Router();

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

/* ── GET /api/tutors/available ── */

router.get('/available', requireAuth, async (req, res) => {
  try {
    const subjectIdRaw = String(req.query.subjectId || '').trim();
    const subjectId    = subjectIdRaw && isUuid(subjectIdRaw) ? subjectIdRaw : null;

    const rawIds           = await redisPresenceService.listAvailableTutorIds();
    const availableUserIds = rawIds.map(String).filter(isUuid);

    if (!availableUserIds.length) {
      return res.json({ success: true, tutors: [] });
    }

    const tutors = await prisma.tutor.findMany({
      where: {
        userProfile: {
          userId:      { in: availableUserIds },
          deletedAt:   null,
          isSuspended: false,
        },
        ...(subjectId ? {
          subjects: { some: { subjectId } },
        } : {}),
      },
      select: {
        id:          true,
        hourlyRate:  true,
        bio:         true,
        isAvailable: true,
        chatMode:    true,
        userProfile: {
          select: { userId: true, username: true },
        },
        subjects: {
          select: {
            subject: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });

    return res.json({
      success: true,
      tutors: tutors.map(t => ({
        tutorId:    t.id,
        userId:     t.userProfile.userId,
        username:   t.userProfile.username,
        bio:        t.bio        ?? '',
        hourlyRate: t.hourlyRate ?? 0,
        chatMode:   t.chatMode,
        subjects:   t.subjects.map(ts => ts.subject),
      })),
    });
  } catch (err) {
    console.error('[tutors/available] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch tutors' });
  }
});

/* ── GET /api/tutors/availability ── */

router.get('/availability', requireAuth, async (_req, res) => {
  try {
    const { userId, role } = res.locals.auth as AuthContext;

    if (role !== 'tutor') {
      return res.status(403).json({ success: false, error: 'Only tutors can check availability' });
    }

    const available = await redisPresenceService.isTutorAvailable(userId);
    return res.json({ success: true, available });
  } catch (err) {
    console.error('[tutors/availability/get] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to get availability' });
  }
});

/* ── POST /api/tutors/availability ── */

router.post('/availability', requireAuth, async (req, res) => {
  try {
    const { userId, role } = res.locals.auth as AuthContext;

    if (role !== 'tutor') {
      return res.status(403).json({ success: false, error: 'Only tutors can set availability' });
    }

    const { available } = req.body;

    if (typeof available !== 'boolean') {
      return res.status(400).json({ success: false, error: 'available must be a boolean' });
    }

    if (available) {
      await redisPresenceService.setTutorAvailable(userId, true);
    } else {
      await redisPresenceService.setTutorUnavailable(userId);
    }

    return res.json({ success: true, available });
  } catch (err) {
    console.error('[tutors/availability/post] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update availability' });
  }
});

export default router;
