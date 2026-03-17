// backend/src/infra/socket/socket.watchdog.ts

import { Server } from 'socket.io';

import { redisRuntimeService } from '@/infra/redis/redis.runtime.service';
import { redisPresenceService } from '@/infra/redis';
import { notificationService }  from '@/core/notifications/notification.service';
import { emitNotification }      from './socket.notifications';

import type { NotificationPayload } from '@/core/notifications/notification.types';

const WATCHDOG_INTERVAL_MS = 30_000; // 30s

const toRoom = (sessionId: string) => `session:${sessionId}`;

export function attachWatchdog(io: Server) {
  setInterval(async () => {
    try {
      await Promise.all([
        runActiveSessionWatchdog(io),
        runWaitingSessionWatchdog(io),
      ]);
    } catch (err) {
      console.error('⚠️ Session watchdog error:', err);
    }
  }, WATCHDOG_INTERVAL_MS);
}

/* ──────────────────────────────────────────────────────────
   ACTIVE SESSION WATCHDOG
   Handles inactivity pause and auto-end for active/paused sessions.
────────────────────────────────────────────────────────── */

async function runActiveSessionWatchdog(io: Server): Promise<void> {
  const sessionIds = await redisRuntimeService.getActiveSessionIds();

  for (const sessionId of sessionIds) {
    try {
      const state = await redisRuntimeService.getSessionState(sessionId);
      if (!state || state.status === 'ended') continue;

      const { action } = await redisRuntimeService.evaluateInactivity(sessionId);

      /* ── PAUSE ── */
      if (action === 'pause' && state.status !== 'paused') {
        await redisRuntimeService.pauseSession(sessionId);
        io.to(toRoom(sessionId)).emit('session:paused', { reason: 'inactivity' });

        const targets = [state.studentId, state.tutorId].filter(Boolean) as string[];
        for (const userId of targets) {
          const payload: NotificationPayload = {
            userId,
            type:  'session_paused',
            title: 'Session paused',
            body:  'The session was paused due to inactivity.',
            data:  { sessionId },
          };
          const result = await notificationService.notify(payload);
          if (result.deliveredVia === 'socket') emitNotification(io, payload);
        }
      }

      /* ── END ── */
      if (action === 'end') {
        await redisRuntimeService.endSession(sessionId, 'inactivity');
        io.to(toRoom(sessionId)).emit('session:ended', { reason: 'inactivity' });

        const targets = [state.studentId, state.tutorId].filter(Boolean) as string[];
        for (const userId of targets) {
          const payload: NotificationPayload = {
            userId,
            type:  'session_inactivity',
            title: 'Session ended',
            body:  'The session ended due to inactivity.',
            data:  { sessionId },
          };
          const result = await notificationService.notify(payload);
          if (result.deliveredVia === 'socket') emitNotification(io, payload);
        }

        // ✅ Restore tutor availability — FIX #3: was missing isTutor=true arg
        if (state.tutorId) {
          const intent = await redisPresenceService.getStatusIntent(state.tutorId);
          if (intent === 'busy_session') {
            await redisPresenceService.setStatusIntent(state.tutorId, 'available');
            await redisPresenceService.syncTutorAvailability(state.tutorId, true); // ← FIXED
          }
        }
      }
    } catch (err) {
      console.error(`⚠️ Watchdog error on active session ${sessionId}:`, err);
    }
  }
}

/* ──────────────────────────────────────────────────────────
   WAITING SESSION WATCHDOG (BUG FIX #7)
   Waiting sessions that never get a tutor previously sat in
   Redis until the 2hr TTL expired with the student never told.
   Now we expire them after WAITING_TIMEOUT_MS (5 min) and
   notify the student so they can try again or use the AI.
────────────────────────────────────────────────────────── */

async function runWaitingSessionWatchdog(io: Server): Promise<void> {
  const waitingSessions = await redisRuntimeService.listWaitingSessions();

  for (const { sessionId, state, createdAt } of waitingSessions) {
    try {
      const expired = await redisRuntimeService.isWaitingSessionExpired(sessionId);
      if (!expired) continue;

      // No tutor accepted in time — cancel the session
      await redisRuntimeService.endSession(sessionId, 'no_tutor_available');

      // Notify the student in their personal room
      // (they may not be in the session room if they navigated away)
      io.to(`user:${state.studentId}`).emit('session:ended', {
        reason: 'no_tutor_available',
      });

      // Also emit to the session room in case they're still on the waiting page
      io.to(toRoom(sessionId)).emit('session:ended', {
        reason: 'no_tutor_available',
      });

      // Send notification
      const payload: NotificationPayload = {
        userId: state.studentId,
        type:   'session_no_tutor',
        title:  'No tutors available',
        body:   'We couldn\'t find an available tutor. Please try again in a few minutes.',
        data:   { sessionId },
      };
      const result = await notificationService.notify(payload);
      if (result.deliveredVia === 'socket') emitNotification(io, payload);
    } catch (err) {
      console.error(`⚠️ Watchdog error on waiting session ${sessionId}:`, err);
    }
  }
}