// backend/src/infra/socket/socket.session.ts
import { Server, Socket } from 'socket.io';

import { redisRuntimeService } from '@/infra/redis/redis.runtime.service';
import { redisPresenceService, redisCooldownService } from '@/infra/redis';

const toRoom = (sessionId: string) => `session:${sessionId}`;

const isMember = (userId: string, state: { studentId: string; tutorId?: string }) =>
  state.studentId === userId || state.tutorId === userId;

export function attachSessionHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    const user = socket.user;
    if (!user) return socket.disconnect(true);

    const { userId, role } = user;

    /* =====================
       TUTOR ACCEPT SESSION (authoritative claim)

       This is the ONLY canonical accept path.
       chat:accept_session in socket.chat.ts is deprecated and
       only exists as a fallback alias — it now delegates here.

       Emits both session:ready (to student's personal room) AND
       session:started (to the session room) so both views hydrate
       correctly regardless of which event they listen to.
       ===================== */
    socket.on('session:accept', async ({ sessionId }) => {
      try {
        if (role !== 'tutor') return;
        if (!sessionId)        return;

        const online = await redisPresenceService.isOnline(userId);
        if (!online) return;

        const state = await redisRuntimeService.getSessionState(sessionId);
        if (!state) return;
        if (state.tutorId && state.tutorId !== userId) return;

        // Atomic Lua claim — only one tutor wins
        const updated = await redisRuntimeService.acceptWaitingSession(sessionId, userId);
        if (!updated) return; // Lost the race

        // ✅ Tutor is now busy — remove from discoverable set
        await redisPresenceService.setStatusIntent(userId, 'busy_session');
        await redisPresenceService.syncTutorAvailability(userId, true); // FIX #2: isTutor=true

        socket.join(toRoom(sessionId));

        // Notify student in their personal room (they may not be in the session room yet)
        io.to(`user:${updated.studentId}`).emit('session:ready',      { sessionId });
        // Notify everyone in the session room
        io.to(toRoom(sessionId)).emit('chat:tutor_joined', { tutorId: userId, sessionId });
        io.to(toRoom(sessionId)).emit('session:started',   { sessionId });
      } catch (err) {
        console.error('[socket][session:accept] error:', err);
      }
    });

    /* =====================
       JOIN SESSION (ANYTIME)

       Called by both StudentChatView and TutorChatView on mount
       and on socket reconnect (joinedRef is reset on disconnect).
       ===================== */
    socket.on('session:join', async ({ sessionId }) => {
      try {
        if (!sessionId) return;

        const state = await redisRuntimeService.getSessionState(sessionId);
        if (!state) return;

        // Waiting: only student can join until tutor accepts
        if (state.status === 'waiting') {
          if (state.studentId !== userId) return;
        } else {
          if (!isMember(userId, state)) return;
        }

        socket.join(toRoom(sessionId));
        await redisRuntimeService.markActivity(sessionId);

        const participants = await redisRuntimeService.getParticipantIds(sessionId);
        io.to(toRoom(sessionId)).emit('chat:presence', {
          sessionId,
          participants,
          count: participants.length,
        });
      } catch (err) {
        console.error('[socket][session:join] error:', err);
      }
    });

    /* =====================
       ACTIVITY HEARTBEAT
       ===================== */
    socket.on('session:activity', async ({ sessionId }) => {
      try {
        if (!sessionId) return;

        const state = await redisRuntimeService.getSessionState(sessionId);
        if (!state) return;

        if (state.status === 'waiting') {
          if (state.studentId !== userId) return;
        } else {
          if (!isMember(userId, state)) return;
        }

        await redisRuntimeService.markActivity(sessionId);
      } catch (err) {
        console.error('[socket][session:activity] error:', err);
      }
    });

    /* =====================
       END SESSION
       ===================== */
    socket.on('session:end', async ({ sessionId, reason }) => {
      try {
        if (!sessionId || !reason) return;

        const state = await redisRuntimeService.getSessionState(sessionId);
        if (!state) return;

        // Waiting: only student can cancel before tutor accepts
        if (state.status === 'waiting') {
          if (state.studentId !== userId) return;
        } else {
          if (!isMember(userId, state)) return;
        }

        await redisRuntimeService.endSession(sessionId, reason);

        // Cooldown only on booked sessions with an assigned tutor
        if (state.type === 'booked' && state.tutorId) {
          const runtimeMs = Date.now() - state.startedAt;
          await redisCooldownService.createCooldown(state.tutorId, state.studentId, runtimeMs);
        }

        // ✅ Restore tutor availability — FIX #2: was syncTutorAvailability(tutorId) missing isTutor
        if (state.tutorId) {
          const intent = await redisPresenceService.getStatusIntent(state.tutorId);
          if (intent === 'busy_session') {
            await redisPresenceService.setStatusIntent(state.tutorId, 'available');
            await redisPresenceService.syncTutorAvailability(state.tutorId, true); // ← FIXED
          }
        }

        io.to(toRoom(sessionId)).emit('session:ended', { reason });
      } catch (err) {
        console.error('[socket][session:end] error:', err);
      }
    });

  });
}
