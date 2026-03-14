// backend/src/infra/socket/socket.chat.ts
import { Server, Socket } from 'socket.io';
import { redisRuntimeService } from '@/infra/redis/redis.runtime.service';
import { redisPresenceService } from '@/infra/redis';

const MAX_PARTICIPANTS = 4;
const toRoom   = (sessionId: string) => `session:${sessionId}`;
const isMember = (userId: string, state: { studentId: string; tutorId?: string }) =>
  state.studentId === userId || state.tutorId === userId;

export function attachChatHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    const user = socket.user;
    if (!user) return socket.disconnect(true);

    const { userId, role } = user;

    /* =====================
       JOIN CHAT ROOM
       ===================== */
    socket.on('chat:join', async (sessionId: string) => {
      try {
        if (!sessionId) return;

        const state = await redisRuntimeService.getSessionState(sessionId);
        if (!state) return;

        if (state.status === 'waiting') {
          if (state.studentId !== userId) return;
        } else {
          if (!isMember(userId, state)) return;
        }

        const roomId = toRoom(sessionId);
        socket.join(roomId);
        await redisRuntimeService.markActivity(sessionId);

        const participants = await redisRuntimeService.getParticipantIds(sessionId);
        io.to(roomId).emit('chat:presence', { sessionId, participants, count: participants.length });
      } catch (err) {
        console.error('[socket][chat:join] error:', err);
      }
    });

    /* =====================
       LEAVE CHAT ROOM
       ===================== */
    socket.on('chat:leave', async (sessionId: string) => {
      try {
        if (!sessionId) return;

        const state = await redisRuntimeService.getSessionState(sessionId);
        if (!state) return;

        if (state.status === 'waiting') {
          if (state.studentId !== userId) return;
        } else {
          if (!isMember(userId, state)) return;
        }

        const roomId = toRoom(sessionId);
        socket.leave(roomId);

        const participants = await redisRuntimeService.getParticipantIds(sessionId);
        io.to(roomId).emit('chat:presence', { sessionId, participants, count: participants.length });
      } catch (err) {
        console.error('[socket][chat:leave] error:', err);
      }
    });

    /* =====================
       SEND MESSAGE
       ===================== */
    socket.on('chat:message', async ({ sessionId, content, messageId }) => {
      try {
        if (!sessionId || !content?.trim() || !messageId) return;

        const state = await redisRuntimeService.getSessionState(sessionId);
        if (!state) return;

        if (state.status === 'waiting') {
          if (state.studentId !== userId) return;
        } else {
          if (!isMember(userId, state)) return;
        }

        await redisRuntimeService.markActivity(sessionId);
        await redisRuntimeService.saveMessage(sessionId, {
          messageId,
          senderId:  userId,
          content:   content.trim(),
          timestamp: Date.now(),
        });

        io.to(toRoom(sessionId)).emit('chat:message', {
          messageId,
          sessionId,
          senderId:  userId,
          content:   content.trim(),
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('[socket][chat:message] error:', err);
      }
    });

    /* =====================
       TYPING INDICATORS
       ===================== */
    socket.on('chat:typing:start', async ({ sessionId }) => {
      try {
        if (!sessionId) return;
        const state = await redisRuntimeService.getSessionState(sessionId);
        if (!state) return;

        if (state.status === 'waiting') {
          if (state.studentId !== userId) return;
        } else {
          if (!isMember(userId, state)) return;
        }

        socket.to(toRoom(sessionId)).emit('chat:typing', { userId, typing: true });
      } catch (err) {
        console.error('[socket][chat:typing:start] error:', err);
      }
    });

    socket.on('chat:typing:stop', async ({ sessionId }) => {
      try {
        if (!sessionId) return;
        const state = await redisRuntimeService.getSessionState(sessionId);
        if (!state) return;

        if (state.status === 'waiting') {
          if (state.studentId !== userId) return;
        } else {
          if (!isMember(userId, state)) return;
        }

        socket.to(toRoom(sessionId)).emit('chat:typing', { userId, typing: false });
      } catch (err) {
        console.error('[socket][chat:typing:stop] error:', err);
      }
    });

    /* =====================
       INVITE REQUEST
       ===================== */
    socket.on('chat:invite_request', async ({ sessionId, fromUsername, inviteeUsername }) => {
      try {
        if (!sessionId || !inviteeUsername) return;

        const state = await redisRuntimeService.getSessionState(sessionId);
        if (!state) return;
        if (state.status !== 'active') return;
        if (!isMember(userId, state)) return;

        const participants = await redisRuntimeService.getParticipantIds(sessionId);
        if (participants.length >= MAX_PARTICIPANTS) {
          socket.emit('chat:invite_error', { reason: 'Session is at maximum capacity (4 participants)' });
          return;
        }

        const roomId = toRoom(sessionId);
        socket.to(roomId).emit('chat:invite_request', {
          fromUserId: userId, fromUsername, inviteeUsername, sessionId,
        });

        await redisRuntimeService.setPendingInvite(sessionId, {
          fromUserId:        userId,
          inviteeUsername,
          approvals:         [userId],
          requiredApprovals: participants.length,
          createdAt:         Date.now(),
        });
      } catch (err) {
        console.error('[socket][chat:invite_request] error:', err);
      }
    });

    /* =====================
       INVITE ACCEPT
       ===================== */
    socket.on('chat:invite_accept', async ({ sessionId, responderUsername }) => {
      try {
        if (!sessionId) return;

        const state = await redisRuntimeService.getSessionState(sessionId);
        if (!state || state.status !== 'active') return;
        if (!isMember(userId, state)) return;

        const invite = await redisRuntimeService.getPendingInvite(sessionId);
        if (!invite) return;

        const updatedApprovals = [...new Set([...invite.approvals, userId])];
        await redisRuntimeService.setPendingInvite(sessionId, { ...invite, approvals: updatedApprovals });

        const roomId = toRoom(sessionId);
        if (updatedApprovals.length >= invite.requiredApprovals) {
          await redisRuntimeService.clearPendingInvite(sessionId);
          io.to(roomId).emit('chat:invite_accepted', { inviteeUsername: invite.inviteeUsername, sessionId });
        } else {
          io.to(roomId).emit('chat:invite_progress', {
            sessionId,
            approvals:         updatedApprovals.length,
            requiredApprovals: invite.requiredApprovals,
          });
        }
      } catch (err) {
        console.error('[socket][chat:invite_accept] error:', err);
      }
    });

    /* =====================
       INVITE DECLINE
       ===================== */
    socket.on('chat:invite_decline', async ({ sessionId, responderUsername }) => {
      try {
        if (!sessionId) return;

        const state = await redisRuntimeService.getSessionState(sessionId);
        if (!state || state.status !== 'active') return;
        if (!isMember(userId, state)) return;

        const invite = await redisRuntimeService.getPendingInvite(sessionId);
        if (!invite) return;

        await redisRuntimeService.clearPendingInvite(sessionId);
        io.to(toRoom(sessionId)).emit('chat:invite_declined', {
          declinerUsername: responderUsername, sessionId,
        });
      } catch (err) {
        console.error('[socket][chat:invite_decline] error:', err);
      }
    });

    /* =====================
       DEPRECATED: chat:accept_session
       FIX #5: was a split-brain accept path that didn't emit session:ready
       or session:started, leaving the student stuck on "Waiting for tutor"
       even though the tutor had accepted.

       Now delegates to the same Lua-atomic claim and emits all three events
       exactly like session:accept in socket.session.ts.
       TODO: remove after all clients migrate to session:accept.
       ===================== */
    socket.on('chat:accept_session', async (sessionId: string) => {
      console.warn('[socket][chat:accept_session] DEPRECATED — clients should emit session:accept');
      try {
        if (!sessionId)        return;
        if (role !== 'tutor') return;

        const presence = await redisPresenceService.getFullPresence(userId);
        if (!presence.online || !presence.socketConnected) return;
        if (presence.intent !== 'available') return;

        const state = await redisRuntimeService.getSessionState(sessionId);
        if (!state || state.status !== 'waiting') return;
        if (state.tutorId && state.tutorId !== userId) return;

        const updated = await redisRuntimeService.acceptWaitingSession(sessionId, userId);
        if (!updated) return;

        await redisPresenceService.setStatusIntent(userId, 'busy_session');
        await redisPresenceService.syncTutorAvailability(userId, true);

        const roomId = toRoom(sessionId);
        socket.join(roomId);

        // ✅ Now emits all three events — was previously missing session:ready + session:started
        io.to(`user:${updated.studentId}`).emit('session:ready',      { sessionId });
        io.to(roomId).emit('chat:tutor_joined', { tutorId: userId, sessionId });
        io.to(roomId).emit('session:started',   { sessionId });

        const participants = await redisRuntimeService.getParticipantIds(sessionId);
        io.to(roomId).emit('chat:presence', { sessionId, participants, count: participants.length });
      } catch (err) {
        console.error('[socket][chat:accept_session] error:', err);
      }
    });
  });
}
