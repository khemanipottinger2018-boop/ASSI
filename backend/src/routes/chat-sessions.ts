// src/routes/chat-sessions.ts
// ASSI Platform — Chat Sessions (live + historical)
// Schema fixes: booked_sessions.id (not session_id), messages (not chat_messages)

import { Router } from 'express';
import { prisma }              from '@/config/database';
import { requireAuth }         from '@/routes/middleware/requireAuth';
import { redisRuntimeService } from '@/infra/redis/redis.runtime.service';
import { AuthContext }         from '@/types/auth';

const router = Router();

/* ── GET /api/chat/sessions ── */

router.get('/sessions', requireAuth, async (_req, res) => {
  try {
    const { userId, role } = res.locals.auth as AuthContext;
    const sessions: any[]  = [];

    /* ── Live sessions (Redis) ── */

    if (role === 'student') {
      const live = await redisRuntimeService.getActiveSessionByStudentId(userId);

      if (live) {
        const { sessionId, state } = live;

        const [partnerProfile, subject] = await Promise.all([
          state.tutorId
            ? prisma.userProfile.findUnique({ where: { userId: state.tutorId }, select: { username: true } })
            : null,
          state.subjectId
            ? prisma.subject.findUnique({ where: { id: state.subjectId }, select: { name: true } })
            : null,
        ]);

        sessions.push({
          id:          sessionId,
          partnerId:   state.tutorId ?? null,
          partnerName: partnerProfile?.username ?? '',
          subjectName: subject?.name ?? '',
          status:      state.status,
          live:        true,
          startedAt:   new Date(state.startedAt),
        });
      }
    } else {
      const [activeIds, waitingIds] = await Promise.all([
        redisRuntimeService.getActiveSessionIds(),
        redisRuntimeService.getWaitingSessionIds(),
      ]);

      const allIds = [...new Set([...activeIds, ...waitingIds])];
      const states = await Promise.all(
        allIds.map(id => redisRuntimeService.getSessionState(id).then(s => s ? { id, state: s } : null))
      );

      const relevant = states.filter(
        (s): s is NonNullable<typeof s> =>
          s !== null && (s.state.studentId === userId || s.state.tutorId === userId)
      );

      if (relevant.length) {
        const partnerIds = [...new Set(
          relevant.map(r => role === 'tutor' ? r.state.studentId : r.state.tutorId).filter(Boolean)
        )] as string[];
        const subjectIds = [...new Set(
          relevant.map(r => r.state.subjectId).filter(Boolean)
        )] as string[];

        const [partners, subjects] = await Promise.all([
          partnerIds.length
            ? prisma.userProfile.findMany({ where: { userId: { in: partnerIds } }, select: { userId: true, username: true } })
            : [],
          subjectIds.length
            ? prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true } })
            : [],
        ]);

        const partnerMap = new Map(partners.map(p => [p.userId, p.username]));
        const subjectMap = new Map(subjects.map(s => [s.id, s.name]));

        for (const { id: sessionId, state } of relevant) {
          const partnerId = role === 'tutor' ? state.studentId : state.tutorId;
          sessions.push({
            id:          sessionId,
            partnerId:   partnerId ?? null,
            partnerName: partnerId ? (partnerMap.get(partnerId) ?? '') : '',
            subjectName: state.subjectId ? (subjectMap.get(state.subjectId) ?? '') : '',
            status:      state.status,
            live:        true,
            startedAt:   new Date(state.startedAt),
          });
        }
      }
    }

    /* ── Historical sessions (DB) ── */
    // Schema: booked_sessions.id (not session_id), tutor relation via tutor.userProfile

    const booked = await prisma.bookedSession.findMany({
      where: role === 'student'
        ? { studentId: userId }
        : { tutor: { userProfile: { userId } } },
      orderBy: { scheduledAt: 'desc' },
      select: {
        id:          true,
        status:      true,
        scheduledAt: true,
        student:     { select: { username: true, userId: true } },
        tutor:       { select: { id: true, userProfile: { select: { username: true, userId: true } } } },
        subject:     { select: { name: true } },
      },
    });

    sessions.push(
      ...booked.map(s => ({
        id:          s.id,
        partnerId:   role === 'student' ? s.tutor?.userProfile?.userId   : s.student?.userId,
        partnerName: role === 'student' ? s.tutor?.userProfile?.username : s.student?.username ?? '',
        subjectName: s.subject?.name ?? '',
        status:      s.status,
        live:        false,
        startedAt:   s.scheduledAt,
      }))
    );

    return res.json({ success: true, sessions });
  } catch (err) {
    console.error('[chat/sessions] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
  }
});

/* ── GET /api/chat/sessions/:sessionId/messages ── */

router.get('/sessions/:sessionId/messages', requireAuth, async (req, res) => {
  try {
    const { userId }    = res.locals.auth as AuthContext;
    const { sessionId } = req.params;

    // Live session — read from Redis
    const runtimeState = await redisRuntimeService.getSessionState(sessionId);

    if (runtimeState) {
      const isMember =
        runtimeState.studentId === userId ||
        (runtimeState.tutorId && runtimeState.tutorId === userId);

      if (!isMember) {
        return res.status(403).json({ success: false, error: 'Not a participant' });
      }

      const messages = await redisRuntimeService.getMessages(sessionId);
      return res.json({ success: true, messages, live: true });
    }

    // Historical — read from messages table (schema: public.messages)
    const dbMessages = await prisma.message.findMany({
      where:   { sessionId },
      orderBy: { createdAt: 'asc' },
      select: {
        id:         true,
        senderId:   true,
        content:    true,
        isRead:     true,
        createdAt:  true,
        sender:     { select: { username: true } },
      },
    });

    // Confirm caller is a participant before returning history
    const isParticipant = dbMessages.some(m => m.senderId === userId);
    if (!isParticipant && dbMessages.length > 0) {
      return res.status(403).json({ success: false, error: 'Not a participant' });
    }

    return res.json({
      success: true,
      live:    false,
      messages: dbMessages.map(m => ({
        messageId:  m.id,
        sessionId,
        senderId:   m.senderId,
        senderName: m.sender?.username ?? '',
        content:    m.content,
        isRead:     m.isRead,
        timestamp:  m.createdAt.getTime(),
        isMine:     m.senderId === userId,
      })),
    });
  } catch (err) {
    console.error('[chat/messages] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

export default router;
