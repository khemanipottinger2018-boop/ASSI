import { Router } from 'express';
import { requireAuth }          from '@/routes/middleware/requireAuth';
import { withRole }             from '@/routes/middleware/withRole';
import { redisRuntimeService }  from '@/infra/redis/redis.runtime.service';
import { redisPresenceService } from '@/infra/redis';
import { getIO }                from '@/infra/socket/socket.server';

const router = Router();

/* ── GET /api/admin/sessions/live ───────────────────────────
   Returns ALL active + waiting sessions with full state.
   ─────────────────────────────────────────────────────────── */

router.get('/live', requireAuth, withRole('admin'), async (_req, res) => {
  try {
    const [activeIds, waitingIds] = await Promise.all([
      redisRuntimeService.getActiveSessionIds(),
      redisRuntimeService.getWaitingSessionIds(),
    ]);

    const allIds = [...new Set([...activeIds, ...waitingIds])];

    const sessions = await Promise.all(
      allIds.map(async (sessionId) => {
        const [state, participants] = await Promise.all([
          redisRuntimeService.getSessionState(sessionId),
          redisRuntimeService.getParticipantIds(sessionId),
        ]);
        if (!state) return null;
        return {
          sessionId,
          status:           state.status,
          type:             state.type,
          studentId:        state.studentId,
          tutorId:          state.tutorId ?? null,
          subjectId:        state.subjectId ?? null,
          startedAt:        state.startedAt,
          participants,
          participantCount: participants.length,
        };
      })
    );

    return res.json({ success: true, sessions: sessions.filter(Boolean) });
  } catch (err) {
    console.error('[admin/sessions/live] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load live sessions' });
  }
});

/* ── GET /api/admin/sessions/:sessionId/messages ────────────
   Admin-only message history — bypasses participant check.
   ─────────────────────────────────────────────────────────── */

router.get('/:sessionId/messages', requireAuth, withRole('admin'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) return res.status(400).json({ success: false, error: 'Missing sessionId' });

    const state = await redisRuntimeService.getSessionState(sessionId);
    if (!state) return res.status(404).json({ success: false, error: 'Session not found' });

    const messages = await redisRuntimeService.getMessages(sessionId);
    return res.json({ success: true, messages, session: state });
  } catch (err) {
    console.error('[admin/sessions/messages] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load messages' });
  }
});

/* ── POST /api/admin/sessions/:sessionId/end ────────────────
   Force-end a session. Emits session:ended to the room.

   FIX #5: was missing tutor availability restore.
   Tutors force-ended by admin were permanently stuck as busy_session
   (invisible to students) until they disconnected and reconnected.
   ─────────────────────────────────────────────────────────── */

router.post('/:sessionId/end', requireAuth, withRole('admin'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) return res.status(400).json({ success: false, error: 'Missing sessionId' });

    const state = await redisRuntimeService.getSessionState(sessionId);
    if (!state)                   return res.status(404).json({ success: false, error: 'Session not found' });
    if (state.status === 'ended') return res.status(409).json({ success: false, error: 'Session already ended' });

    await redisRuntimeService.endSession(sessionId, 'system');

    // Restore tutor availability — same pattern as watchdog + socket.session
    if (state.tutorId) {
      const intent = await redisPresenceService.getStatusIntent(state.tutorId);
      if (intent === 'busy_session') {
        await redisPresenceService.setStatusIntent(state.tutorId, 'available');
        await redisPresenceService.syncTutorAvailability(state.tutorId, true);
      }
    }

    try {
      const io = getIO();
      io.to(`session:${sessionId}`).emit('session:ended', { reason: 'system' });
    } catch { /* socket may not be available in test env */ }

    return res.json({ success: true });
  } catch (err) {
    console.error('[admin/sessions/end] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to end session' });
  }
});

export default router;
