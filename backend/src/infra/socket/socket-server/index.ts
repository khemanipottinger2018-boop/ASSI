import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import crypto from 'crypto';

import { redisService } from '@/infra/redis/redis.service';
import {
  socketAuthMiddleware,
  AuthenticatedSocket,
} from './socket.auth';

type ChatMessageServer = {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: number;
  seq: number;
};

export async function createSocketServer(httpServer: any) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  /* ---------------------------------------------------
   * SOCKET AUTH (LOCKED)
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
    const { userId, role } = socket as AuthenticatedSocket;

    /* ---------------------------------------------------
     * GLOBAL USER ROOM (Slack / Discord pattern)
     * --------------------------------------------------- */
    socket.join(`user:${userId}`);

    /* ---------------------------------------------------
     * PRESENCE (TTL + realtime)
     * --------------------------------------------------- */
    await redisService.updateLastSeen(userId);
    const markActive = () => redisService.updateLastSeen(userId);

    socket.emit('presence:self', { userId, role });

    /* ---------------------------------------------------
     * CHAT JOIN
     * --------------------------------------------------- */
    socket.on('chat:join', async (chatId: string) => {
      if (!chatId) return;

      socket.join(chatId);
      markActive();

      await redisService.client
        .multi()
        .sAdd(`user:live_sessions:${userId}`, chatId)
        .sAdd(`chat:participants:${chatId}`, userId)
        .exec();

      const participants = await redisService.client.sMembers(
        `chat:participants:${chatId}`
      );

      io.to(chatId).emit('chat:presence', {
        chatId,
        participants,
      });
    });

    /* ---------------------------------------------------
     * CHAT LEAVE
     * --------------------------------------------------- */
    socket.on('chat:leave', async (chatId: string) => {
      if (!chatId) return;

      socket.leave(chatId);

      await redisService.client
        .multi()
        .sRem(`user:live_sessions:${userId}`, chatId)
        .sRem(`chat:participants:${chatId}`, userId)
        .exec();

      const participants = await redisService.client.sMembers(
        `chat:participants:${chatId}`
      );

      io.to(chatId).emit('chat:presence', {
        chatId,
        participants,
      });
    });

    /* ---------------------------------------------------
     * CHAT SEND (Reliable, ordered, ACKed)
     * --------------------------------------------------- */
    socket.on(
      'chat:send',
      async (
        payload: {
          chatId: string;
          content: string;
          clientMsgId?: string;
        },
        ack?: (res: {
          ok: boolean;
          message?: ChatMessageServer;
          error?: string;
        }) => void
      ) => {
        try {
          markActive();

          const chatId = payload?.chatId?.trim();
          const content = payload?.content?.trim();

          if (!chatId)
            return ack?.({ ok: false, error: 'chatId required' });
          if (!content)
            return ack?.({ ok: false, error: 'Empty message' });
          if (content.length > 4000)
            return ack?.({ ok: false, error: 'Message too long' });

          if (payload.clientMsgId) {
            const dedupeKey = `chat:dedupe:${chatId}:${payload.clientMsgId}`;
            const first = await redisService.client.set(
              dedupeKey,
              '1',
              { NX: true, EX: 30 }
            );
            if (first === null) return ack?.({ ok: true });
          }

          const seq = await redisService.client.incr(
            `chat:seq:${chatId}`
          );

          const message: ChatMessageServer = {
            id: crypto.randomUUID(),
            chatId,
            senderId: userId,
            content,
            createdAt: Date.now(),
            seq,
          };

          await redisService.client
            .multi()
            .rPush(
              `chat:messages:${chatId}`,
              JSON.stringify(message)
            )
            .lTrim(`chat:messages:${chatId}`, -500, -1)
            .exec();

          io.to(chatId).emit('chat:new', message);
          return ack?.({ ok: true, message });
        } catch (err) {
          console.error('chat:send error', err);
          return ack?.({
            ok: false,
            error: 'Failed to send message',
          });
        }
      }
    );

    /* ---------------------------------------------------
     * CHAT SYNC (Reconnect safety)
     * --------------------------------------------------- */
    socket.on(
      'chat:sync',
      async (
        payload: {
          chatId: string;
          afterSeq?: number;
          limit?: number;
        },
        ack?: (res: {
          ok: boolean;
          messages?: ChatMessageServer[];
          error?: string;
        }) => void
      ) => {
        try {
          const chatId = payload?.chatId?.trim();
          if (!chatId)
            return ack?.({ ok: false, error: 'chatId required' });

          const afterSeq = payload.afterSeq ?? 0;
          const limit = Math.min(
            Math.max(payload.limit ?? 100, 1),
            500
          );

          const raw = await redisService.client.lRange(
            `chat:messages:${chatId}`,
            -limit,
            -1
          );

          const messages = raw
            .map((m) => JSON.parse(m))
            .filter(
              (m: ChatMessageServer) =>
                typeof m.seq === 'number' && m.seq > afterSeq
            );

          return ack?.({ ok: true, messages });
        } catch (err) {
          console.error('chat:sync error', err);
          return ack?.({
            ok: false,
            error: 'Failed to sync messages',
          });
        }
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
     * DISCONNECT (Stage 8.1 FINAL)
     * --------------------------------------------------- */
    socket.on('disconnect', async () => {
      const chatIds = await redisService.client.sMembers(
        `user:live_sessions:${userId}`
      );

      for (const chatId of chatIds) {
        await redisService.client.sRem(
          `chat:participants:${chatId}`,
          userId
        );

        const participants = await redisService.client.sMembers(
          `chat:participants:${chatId}`
        );

        io.to(chatId).emit('chat:presence', {
          chatId,
          participants,
        });
      }

      await redisService.client.del(
        `user:live_sessions:${userId}`
      );
    });
  });

  return io;
}
