// src/routes/chat-sessions.ts
// ASSI Platform — Chat Sessions (live + historical)

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

        // Explicit tuple types so Map constructor is happy
        const partnerMap = new Map<string, string>(partners.map(p => [p.userId, p.username] as [string, string]));
        const subjectMap = new Map<string, string>(subjects.map(s => [s.id, s.name] as [string, string]));

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

    const booked = await prisma.bookedSession.findMany({
      where: role === 'student'
        ? { studentId: userId }
        : { tutor: { userId } },
      orderBy: { scheduledAt: 'desc' },
      include: {
        subject: { select: { name: true } },
        tutor:   { include: { userProfile: { select: { username: true, userId: true } } } },
      },
    });

    // Fetch student profiles for tutor view
    const studentIds = role === 'tutor'
      ? [...new Set(booked.map(s => s.studentId))]
      : [];

    const studentProfiles = studentIds.length
      ? await prisma.userProfile.findMany({
          where:  { userId: { in: studentIds } },
          select: { userId: true, username: true },
        })
      : [];

    const studentMap = new Map<string, string>(
      studentProfiles.map(p => [p.userId, p.username] as [string, string])
    );

    sessions.push(
      ...booked.map(s => ({
        id:          s.id,
        partnerId:   role === 'student' ? s.tutor?.userProfile?.userId   : s.studentId,
        partnerName: role === 'student'
          ? s.tutor?.userProfile?.username ?? ''
          : studentMap.get(s.studentId)   ?? '',
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

    // Historical — read from messages table
    const dbMessages = await prisma.message.findMany({
      where:   { sessionId },
      orderBy: { createdAt: 'asc' },
      select: {
        id:        true,
        senderId:  true,
        content:   true,
        isRead:    true,
        createdAt: true,
      },
    });

    const isParticipant = dbMessages.some(m => m.senderId === userId);
    if (!isParticipant && dbMessages.length > 0) {
      return res.status(403).json({ success: false, error: 'Not a participant' });
    }

    // Batch-fetch sender usernames
    const senderIds = [...new Set(dbMessages.map(m => m.senderId))];
    const senderProfiles = await prisma.userProfile.findMany({
      where:  { userId: { in: senderIds } },
      select: { userId: true, username: true },
    });
    const senderMap = new Map<string, string>(
      senderProfiles.map(p => [p.userId, p.username] as [string, string])
    );

    return res.json({
      success: true,
      live:    false,
      messages: dbMessages.map(m => ({
        messageId:  m.id,
        sessionId,
        senderId:   m.senderId,
        senderName: senderMap.get(m.senderId) ?? '',
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