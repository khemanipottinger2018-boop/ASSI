// src/routes/browse.routes.ts
// ASSI Platform — Browse Tutors + Book Sessions

import { Router } from 'express';
import { requireAuth } from '@/routes/middleware/requireAuth';
import { prisma }      from '@/config/database';
import { AuthContext } from '@/types/auth';

const router = Router();

/* ── GET /api/browse/tutors ── */

router.get('/tutors', requireAuth, async (req, res) => {
  try {
    const {
      subjectId,
      minRate,
      maxRate,
      page  = '1',
      limit = '20',
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page  as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));

    const where: Record<string, any> = {
      userProfile: { deletedAt: null, isSuspended: false },
    };

    if (subjectId) {
      where.subjects = { some: { subjectId: subjectId as string } };
    }
    if (minRate || maxRate) {
      where.hourlyRate = {};
      if (minRate) where.hourlyRate.gte = Number(minRate);
      if (maxRate) where.hourlyRate.lte = Number(maxRate);
    }

    const [total, tutors] = await Promise.all([
      prisma.tutor.count({ where }),
      prisma.tutor.findMany({
        where,
        skip:    (pageNum - 1) * limitNum,
        take:    limitNum,
        orderBy: { totalSessions: 'desc' },
        select: {
          id:           true,
          hourlyRate:   true,
          bio:          true,
          timezone:     true,
          chatMode:     true,
          isStudentTutor: true,
          totalSessions:  true,
          userProfile: {
            select: { userId: true, username: true },
          },
          subjects: {
            select: { subject: { select: { id: true, name: true, category: true } } },
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      tutors: tutors.map(t => ({
        tutorId:       t.id,
        userId:        t.userProfile.userId,
        username:      t.userProfile.username,
        bio:           t.bio           ?? '',
        hourlyRate:    t.hourlyRate    ?? 0,
        timezone:      t.timezone      ?? null,
        chatMode:      t.chatMode,
        isStudentTutor: t.isStudentTutor,
        totalSessions: t.totalSessions,
        subjects:      t.subjects.map(ts => ts.subject),
      })),
      pagination: {
        page:  pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('[browse/tutors] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch tutors' });
  }
});

/* ── POST /api/browse/book ── */

router.post('/book', requireAuth, async (req, res) => {
  try {
    const { userId, role } = res.locals.auth as AuthContext;

    if (role !== 'student') {
      return res.status(403).json({ success: false, error: 'Only students can book sessions' });
    }

    const { tutor_id, subject_id, scheduled_time, duration_minutes = 60, notes } = req.body;

    if (!tutor_id || !subject_id || !scheduled_time) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const scheduledAt = new Date(scheduled_time);
    if (isNaN(scheduledAt.getTime()) || scheduledAt.getTime() - Date.now() < 5 * 60 * 1000) {
      return res.status(400).json({ success: false, error: 'Sessions must be scheduled at least 5 minutes in advance' });
    }

    const tutor = await prisma.tutor.findFirst({
      where: {
        id:          tutor_id,
        userProfile: { deletedAt: null, isSuspended: false },
      },
      select: { id: true, hourlyRate: true },
    });

    if (!tutor) {
      return res.status(400).json({ success: false, error: 'Tutor not found or unavailable' });
    }

    const rate = tutor.hourlyRate ?? 0;

    const session = await prisma.bookedSession.create({
      data: {
        studentId:       userId,
        tutorId:         tutor.id,
        subjectId:       subject_id,
        scheduledAt,
        durationMinutes: Number(duration_minutes),
        rate,
        notes:           notes ?? '',
        status:          'pending',
      },
    });

    return res.status(201).json({ success: true, sessionId: session.id });
  } catch (err) {
    console.error('[browse/book] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to book session' });
  }
});

/* ── GET /api/browse/my-sessions ── */

router.get('/my-sessions', requireAuth, async (req, res) => {
  try {
    const { userId, role } = res.locals.auth as AuthContext;

    const sessions = await prisma.bookedSession.findMany({
      where: role === 'student'
        ? { studentId: userId }
        : { tutor: { userProfile: { userId } } },
      orderBy: { scheduledAt: 'desc' },
      select: {
        id:              true,
        status:          true,
        scheduledAt:     true,
        durationMinutes: true,
        rate:            true,
        notes:           true,
        subject:  { select: { name: true } },
        student:  { select: { username: true } },
        tutor:    { select: { userProfile: { select: { username: true } } } },
      },
    });

    return res.json({
      success: true,
      sessions: sessions.map(s => ({
        sessionId:      s.id,
        status:         s.status,
        scheduledAt:    s.scheduledAt,
        durationMinutes: s.durationMinutes,
        rate:           s.rate,
        notes:          s.notes,
        subjectName:    s.subject?.name ?? '',
        partnerUsername: role === 'student'
          ? s.tutor?.userProfile?.username ?? ''
          : s.student?.username ?? '',
      })),
    });
  } catch (err) {
    console.error('[browse/my-sessions] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
  }
});

export default router;
