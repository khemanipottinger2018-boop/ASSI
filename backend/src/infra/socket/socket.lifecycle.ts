// backend/src/infra/socket/socket.lifecycle.ts

import { Server, Socket } from 'socket.io';
import { redisPresenceService } from '@/infra/redis';

export function attachLifecycleHandlers(io: Server) {
  io.on('connection', async (socket: Socket) => {
    const user = socket.user;

    if (!user) {
      socket.disconnect(true);
      return;
    }

    const { userId, role } = user;

    try {
      // join personal room
      socket.join(`user:${userId}`);

      // register socket presence
      await redisPresenceService.incrementPresence(userId);

      if (role === 'tutor') {
        const presence = await redisPresenceService.getFullPresence(userId);

        // if tutor reconnects while busy, preserve that
        if (presence.intent === 'busy_session' || presence.intent === 'busy_other') {
          await redisPresenceService.syncTutorAvailability(userId, true);
        } else {
          // otherwise tutor becomes available by default
          await redisPresenceService.setStatusIntent(userId, 'available');
          await redisPresenceService.syncTutorAvailability(userId, true);
        }
      }

    } catch (err) {
      console.error('[socket][connect lifecycle] error:', err);
    }

    socket.on('disconnect', async () => {
      try {
        await redisPresenceService.decrementPresence(userId);

        if (role === 'tutor') {
          await redisPresenceService.syncTutorAvailability(userId, true);
        }

      } catch (err) {
        console.error('[socket][disconnect lifecycle] error:', err);
      }
    });
  });
}