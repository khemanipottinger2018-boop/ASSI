import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

import { redisService } from '@/infra/redis/redis.service';
import {
  socketAuthMiddleware,
  AuthenticatedSocket,
} from './socket.auth';

interface ChatMessage {
  senderId: string;
  content: string;
  timestamp: number;
}

export async function createSocketServer(httpServer: any) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  /* ---------------------------------------------------
   * SOCKET AUTH (🔥 CRITICAL)
   * --------------------------------------------------- */
  io.use(socketAuthMiddleware);

  /* ---------------------------------------------------
   * REDIS ADAPTER
   * --------------------------------------------------- */
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  await pubClient.connect();
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));

  /* ---------------------------------------------------
   * CONNECTION
   * --------------------------------------------------- */
  io.on('connection', async (socket) => {
    const { userId } = socket as AuthenticatedSocket;

    // 🔐 Global user room (Slack/Discord pattern)
    socket.join(`user:${userId}`);

    // ✅ Mark user as active ONCE on connect
    await redisService.updateLastSeen(userId);

    // Helper for meaningful activity
    const markActive = () => redisService.updateLastSeen(userId);

    /* ---------------------------------------------------
     * CHAT ROOMS
     * --------------------------------------------------- */
    socket.on('chat:join', async (sessionId: string) => {
      socket.join(sessionId);
      markActive();

      await redisService.client.sAdd(
        `user:live_sessions:${userId}`,
        sessionId
      );
    });

    socket.on('chat:leave', async (sessionId: string) => {
      socket.leave(sessionId);

      await redisService.client.sRem(
        `user:live_sessions:${userId}`,
        sessionId
      );
    });

    /* ---------------------------------------------------
     * MESSAGES
     * --------------------------------------------------- */
    socket.on(
      'chat:send',
      async ({ chatId, message }: { chatId: string; message: ChatMessage }) => {
        markActive();

        const safeMessage: ChatMessage = {
          senderId: userId,          // 🔐 server truth
          content: message.content,
          timestamp: Date.now(),
        };

        await redisService.client.rPush(
          `chat:messages:${chatId}`,
          JSON.stringify(safeMessage)
        );

        io.to(chatId).emit('chat:new', safeMessage);
      }
    );

    /* ---------------------------------------------------
     * TYPING
     * --------------------------------------------------- */
    socket.on('typing:start', async (chatId: string) => {
      markActive();

      await redisService.client.sAdd(`typing:chat:${chatId}`, userId);

      io.to(chatId).emit('typing:update', {
        users: await redisService.client.sMembers(`typing:chat:${chatId}`),
      });
    });

    socket.on('typing:stop', async (chatId: string) => {
      await redisService.client.sRem(`typing:chat:${chatId}`, userId);

      io.to(chatId).emit('typing:update', {
        users: await redisService.client.sMembers(`typing:chat:${chatId}`),
      });
    });

    /* ---------------------------------------------------
     * NOTIFICATIONS (GLOBAL)
     * --------------------------------------------------- */
    socket.on(
      'notification:send',
      async ({
        targetUserId,
        notification,
      }: {
        targetUserId: string;
        notification: string;
      }) => {
        await redisService.addNotification(targetUserId, notification);

        io.to(`user:${targetUserId}`).emit('notification:new', {
          id: Date.now(),
          message: notification,
        });
      }
    );

    /* ---------------------------------------------------
     * DISCONNECT
     * --------------------------------------------------- */
    socket.on('disconnect', () => {
      // ✅ NO ACTION
      // Presence expires naturally via Redis TTL
    });
  });

  return io;
}
