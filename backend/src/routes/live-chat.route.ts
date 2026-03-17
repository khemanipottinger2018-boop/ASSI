// src/routes/live-chat.route.ts
// ASSI Platform — Live Chat REST layer
// Redis handles session state. Prisma for user/subject name lookups only.

import { Router } from 'express';
import crypto      from 'crypto';
import { requireAuth }          from '@/routes/middleware/requireAuth';
import { redisRuntimeService }  from '@/infra/redis/redis.runtime.service';
import { redisPresenceService } from '@/infra/redis';
import { getIO }                from '@/infra/socket/socket.server';
import { prisma }               from '@/config/database';
import { AuthContext }          from '@/types/auth';

const router = Router();

/* ── GET /api/live-chat/active ── */

router.get('/active', requireAuth, async (_req, res) => {
  try {
    const { userId, role } = res.locals.auth as AuthContext;

    if (role !== 'student') {
      return res.json({ success: true, session: null });
    }

    const result = await redisRuntimeService.getActiveSessionByStudentId(userId);
    if (!result) return res.json({ success: true, session: null });

    const { sessionId, state } = result;

    const [tutorProfile, subject] = await Promise.all([
      state.tutorId
        ? prisma.userProfile.findUnique({
            where:  { userId: state.tutorId },
            select: { username: true },
          })
        : null,
      state.subjectId
        ? prisma.subject.findUnique({
            where:  { id: state.subjectId },
            select: { name: true },
          })
        : null,
    ]);

    return res.json({
      success: true,
      session: {
        sessionId,
        status:      state.status,
        tutorName:   tutorProfile?.username ?? 'Tutor',
        subjectName: subject?.name         ?? '',
        startedAt:   state.startedAt,
      },
    });
  } catch (err) {
    console.error('[live-chat/active] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to check active session' });
  }
});

/* ── POST /api/live-chat/create ── */

router.post('/create', requireAuth, async (req, res) => {
  try {
    const { userId, role } = res.locals.auth as AuthContext;

    if (role !== 'student') {
      return res.status(403).json({ success: false, error: 'Only students can start chat sessions' });
    }

    const { subjectId = null, tutorId = null } = req.body;

    if (!tutorId) {
      return res.status(400).json({ success: false, error: 'tutorId is required' });
    }

    const existing = await redisRuntimeService.getActiveSessionByStudentId(userId);
    if (existing) {
      return res.status(409).json({
        success: false,
        error:   'You already have an active session',
        chatId:  existing.sessionId,
      });
    }

    const isAvailable = await redisPresenceService.isTutorAvailable(tutorId);
    if (!isAvailable) {
      return res.status(409).json({ success: false, error: 'That tutor is no longer available' });
    }

    const chatId = crypto.randomUUID();

    await redisRuntimeService.createSession(chatId, {
      type:      'instant',
      studentId: userId,
      tutorId,
      status:    'waiting',
      ...(subjectId ? { subjectId } : {}),
    });

    try {
      const io = getIO();
      io.to(`user:${tutorId}`).emit('session:request', {
        sessionId: chatId,
        subjectId: subjectId ?? undefined,
      });
    } catch (socketErr) {
      console.warn('[live-chat/create] socket notify skipped:', socketErr);
    }

    return res.status(201).json({ success: true, chatId });
  } catch (err) {
    console.error('[live-chat/create] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to start chat' });
  }
});

/* ── POST /api/live-chat/:chatId/accept ── */

router.post('/:chatId/accept', requireAuth, async (req, res) => {
  try {
    const { userId, role } = res.locals.auth as AuthContext;
    const { chatId }       = req.params;

    if (role !== 'tutor') {
      return res.status(403).json({ success: false, error: 'Only tutors can accept sessions' });
    }

    const state = await redisRuntimeService.getSessionState(chatId);
    if (!state) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    if (state.status !== 'waiting') {
      return res.json({ success: true, chatId, alreadyActive: true });
    }
    if (state.tutorId && state.tutorId !== userId) {
      return res.status(403).json({ success: false, error: 'Session assigned to another tutor' });
    }

    const updated = await redisRuntimeService.acceptWaitingSession(chatId, userId);
    if (!updated) {
      return res.status(409).json({ success: false, error: 'Session could not be accepted' });
    }

    await redisPresenceService.setStatusIntent(userId, 'busy_session');
    await redisPresenceService.syncTutorAvailability(userId, true);

    try {
      const io = getIO();
      io.to(`user:${updated.studentId}`).emit('session:ready',    { sessionId: chatId });
      io.to(`session:${chatId}`).emit('chat:tutor_joined', { tutorId: userId, sessionId: chatId });
      io.to(`session:${chatId}`).emit('session:started',   { sessionId: chatId });
    } catch (socketErr) {
      console.warn('[live-chat/accept] socket emit skipped:', socketErr);
    }

    return res.json({ success: true, chatId });
  } catch (err) {
    console.error('[live-chat/accept] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to accept session' });
  }
});

/* ── GET /api/live-chat/:chatId/messages ── */

router.get('/:chatId/messages', requireAuth, async (req, res) => {
  try {
    const { userId } = res.locals.auth as AuthContext;
    const { chatId } = req.params;

    const state = await redisRuntimeService.getSessionState(chatId);
    if (!state) return res.status(404).json({ success: false, error: 'Session not found' });

    if (state.studentId !== userId && state.tutorId !== userId) {
      return res.status(403).json({ success: false, error: 'Not a participant' });
    }

    const messages = await redisRuntimeService.getMessages(chatId);
    return res.json({ success: true, messages });
  } catch (err) {
    console.error('[live-chat/messages] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load messages' });
  }
});

/* ── GET /api/live-chat/:chatId ── */

router.get('/:chatId', requireAuth, async (req, res) => {
  try {
    const { userId } = res.locals.auth as AuthContext;
    const { chatId } = req.params;

    const state = await redisRuntimeService.getSessionState(chatId);
    if (!state) return res.status(404).json({ success: false, error: 'Session not found' });

    if (state.studentId !== userId && state.tutorId !== userId) {
      return res.status(403).json({ success: false, error: 'Not a participant' });
    }

    return res.json({ success: true, session: state });
  } catch (err) {
    console.error('[live-chat/get] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load session' });
  }
});

export default router;
