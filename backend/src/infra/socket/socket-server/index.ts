import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisService } from '@/infra/redis/redis.service';
import { createClient } from 'redis';

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

  // Redis adapter (horizontal scaling ready)
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  await pubClient.connect();
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));

  io.on('connection', async (socket) => {
    const { userId } = socket.handshake.auth;
    if (!userId) {
      socket.disconnect();
      return;
    }

    /* ---------------------------------------------------
     * PRESENCE
     * --------------------------------------------------- */
    await redisService.setUserStatus(userId, 'online');

    const presenceInterval = setInterval(
      () => redisService.setUserStatus(userId, 'online'),
      15_000
    );

    let idleTimeout: NodeJS.Timeout | null = null;

    socket.onAny(() => {
      if (idleTimeout) clearTimeout(idleTimeout);
      idleTimeout = setTimeout(
        () => redisService.setUserStatus(userId, 'idle'),
        15 * 60 * 1000
      );
    });

    /* ---------------------------------------------------
     * CHAT ROOMS / LIVE SESSION TRACKING
     * --------------------------------------------------- */
    socket.on('chat:join', async (sessionId: string) => {
      socket.join(sessionId);

      // 🔑 CRITICAL: track live sessions per user
      await redisService.client.sAdd(
        `user:live_sessions:${userId}`,
        sessionId
      );
    });

    socket.on('chat:leave', async (sessionId: string) => {
      socket.leave(sessionId);

      // Optional cleanup (safe for explicit leaves)
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
      async ({
        chatId,
        message,
      }: {
        chatId: string;
        message: ChatMessage;
      }) => {
        await redisService.client.rPush(
          `chat:messages:${chatId}`,
          JSON.stringify(message)
        );

        io.to(chatId).emit('chat:new', message);
      }
    );

    /* ---------------------------------------------------
     * TYPING INDICATORS
     * --------------------------------------------------- */
    socket.on('typing:start', async (chatId: string) => {
      await redisService.client.sAdd(`typing:chat:${chatId}`, userId);

      io.to(chatId).emit('typing:update', {
        users: await redisService.client.sMembers(
          `typing:chat:${chatId}`
        ),
      });
    });

    socket.on('typing:stop', async (chatId: string) => {
      await redisService.client.sRem(`typing:chat:${chatId}`, userId);

      io.to(chatId).emit('typing:update', {
        users: await redisService.client.sMembers(
          `typing:chat:${chatId}`
        ),
      });
    });

    /* ---------------------------------------------------
     * NOTIFICATIONS
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

        io.to(targetUserId).emit(`notification:${targetUserId}`, {
          id: Date.now(),
          message: notification,
        });
      }
    );

    /* ---------------------------------------------------
     * DISCONNECT
     * --------------------------------------------------- */
    socket.on('disconnect', async () => {
      clearInterval(presenceInterval);
      if (idleTimeout) clearTimeout(idleTimeout);

      await redisService.setUserStatus(userId, 'offline');
    });
  });

  return io;
}
