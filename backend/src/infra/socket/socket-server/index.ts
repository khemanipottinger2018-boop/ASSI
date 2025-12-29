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

  /* =====================================================
   * SOCKET AUTH
   * ===================================================== */
  io.use(socketAuthMiddleware);

  /* =====================================================
   * REDIS ADAPTER
   * ===================================================== */
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  await pubClient.connect();
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));

  /* =====================================================
   * CONNECTION
   * ===================================================== */
  io.on('connection', async (socket) => {
    const { userId, role } = socket as AuthenticatedSocket;

    /* ---------------------------------------------------
     * GLOBAL USER ROOM
     * --------------------------------------------------- */
    socket.join(`user:${userId}`);

    /* ---------------------------------------------------
     * PRESENCE (TTL + realtime)
     * --------------------------------------------------- */
    await redisService.updateLastSeen(userId);
    const markActive = () => redisService.updateLastSeen(userId);

    socket.emit('presence:self', { userId, role });

    /* ---------------------------------------------------
     * STAGE 8.2 — TUTOR AVAILABILITY REGISTRY
     * --------------------------------------------------- */
    if (role === 'tutor') {
      await redisService.client.sAdd('tutors:online', userId);
    }

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

      /* -----------------------------------------------
       * STAGE 8.2 — STUDENT TRIGGERS TUTOR NOTIFICATION
       * ----------------------------------------------- */
      if (role === 'student') {
        const tutors = await redisService.client.sMembers(
          'tutors:online'
        );

        for (const tutorId of tutors) {
          io.to(`user:${tutorId}`).emit(
            'tutor:chat_available',
            {
              chatId,
              studentId: userId,
            }
          );
        }
      }
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
            return ack?.({
              ok: false,
              error: 'Message too long',
            });

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
     * CHAT SYNC
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
            return ack?.({
              ok: false,
              error: 'chatId required',
            });

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
     * TUTOR ACCEPT CHAT (Stage 8.2)
     * --------------------------------------------------- */
    socket.on(
      'tutor:accept_chat',
      async (
        payload: { chatId: string },
        ack?: (res: { ok: boolean; error?: string }) => void
      ) => {
        if (role !== 'tutor') {
          return ack?.({
            ok: false,
            error: 'Not authorized',
          });
        }

        const chatId = payload?.chatId?.trim();
        if (!chatId) {
          return ack?.({
            ok: false,
            error: 'chatId required',
          });
        }

        const lockKey = `chat:assign:${chatId}`;
        const locked = await redisService.acquireLock(
          lockKey,
          5
        );

        if (!locked) {
          return ack?.({
            ok: false,
            error: 'Chat already being assigned',
          });
        }

        try {
          const assigned = await redisService.client.get(
            `chat:assignedTutor:${chatId}`
          );

          if (assigned) {
            return ack?.({
              ok: false,
              error: 'Chat already assigned',
            });
          }

          await redisService.client.set(
            `chat:assignedTutor:${chatId}`,
            userId
          );

          socket.join(chatId);

          io.to(chatId).emit('chat:tutor_joined', {
            tutorId: userId,
          });

          return ack?.({ ok: true });
        } finally {
          await redisService.releaseLock(lockKey);
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
     * DISCONNECT
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

        const participants =
          await redisService.client.sMembers(
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

      if (role === 'tutor') {
        await redisService.client.sRem(
          'tutors:online',
          userId
        );
      }
    });
  });

  return io;
}
