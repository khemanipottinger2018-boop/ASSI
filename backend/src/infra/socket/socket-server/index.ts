import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import crypto from 'crypto';

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
   * SOCKET AUTH (🔥 LOCKED)
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

    /* ---------------------------------------------------
     * GLOBAL USER ROOM
     * --------------------------------------------------- */
    socket.join(`user:${userId}`);

    /* ---------------------------------------------------
     * PRESENCE (Stage 2)
     * --------------------------------------------------- */
    await redisService.updateLastSeen(userId);
    const markActive = () => redisService.updateLastSeen(userId);

    /* ---------------------------------------------------
     * SERVER-DRIVEN NOTIFICATIONS (Stage 3)
     * --------------------------------------------------- */
    const notifyUser = async (
      targetUserId: string,
      payload: {
        type: string;
        title: string;
        body: string;
      }
    ) => {
      const notification = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        ...payload,
      };

      await redisService.pushNotification(targetUserId, notification);

      io.to(`user:${targetUserId}`).emit(
        'notification:new',
        notification
      );
    };

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
      async ({
        chatId,
        message,
      }: {
        chatId: string;
        message: ChatMessage;
      }) => {
        markActive();

        const safeMessage: ChatMessage = {
          senderId: userId,
          content: message.content,
          timestamp: Date.now(),
        };

        await redisService.client.rPush(
          `chat:messages:${chatId}`,
          JSON.stringify(safeMessage)
        );

        io.to(chatId).emit('chat:new', safeMessage);

        // 🔔 Example notification hook (optional, but correct)
        // notifyUser(otherUserId, {
        //   type: 'chat',
        //   title: 'New message',
        //   body: safeMessage.content,
        // });
      }
    );

    /* ---------------------------------------------------
     * TYPING
     * --------------------------------------------------- */
    socket.on('typing:start', async (chatId: string) => {
      markActive();

      await redisService.client.sAdd(
        `typing:chat:${chatId}`,
        userId
      );

      io.to(chatId).emit('typing:update', {
        users: await redisService.client.sMembers(
          `typing:chat:${chatId}`
        ),
      });
    });

    socket.on('typing:stop', async (chatId: string) => {
      await redisService.client.sRem(
        `typing:chat:${chatId}`,
        userId
      );

      io.to(chatId).emit('typing:update', {
        users: await redisService.client.sMembers(
          `typing:chat:${chatId}`
        ),
      });
    });

    /* ---------------------------------------------------
     * DISCONNECT
     * --------------------------------------------------- */
    socket.on('disconnect', () => {
      // Presence expires naturally via Redis TTL
    });
  });

  return io;
}
