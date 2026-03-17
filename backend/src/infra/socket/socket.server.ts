// src/infra/socket/socket.server.ts
// ASSI Platform — Socket.IO Server
// Reuses the shared Redis client for pub/sub instead of creating
// new connections. Uses CLIENT_URL (aligned with env.ts).

import { Server }     from 'socket.io';
import { Server as HttpServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';

import { redisClient }           from '@/infra/redis';
import { attachAuthMiddleware }  from './socket.auth';
import { attachLifecycleHandlers } from './socket.lifecycle';
import { attachSessionHandlers } from './socket.session';
import { attachChatHandlers }    from './socket.chat';
import { attachWatchdog }        from './socket.watchdog';
import { env }                   from '@/config/env';

let _io: Server | null = null;

export function getIO(): Server {
  if (!_io) throw new Error('Socket.IO not initialized yet');
  return _io;
}

function parseOrigins(raw?: string): string[] {
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

export async function createSocketServer(httpServer: HttpServer): Promise<Server> {
  // FRONTEND_URL is the canonical frontend origin — defined in env.ts
  const allowedOrigins = parseOrigins(env.frontendUrl);

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin)                  return cb(null, true);
        if (!allowedOrigins.length)   return cb(new Error('CORS origin not configured'), false);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('CORS origin not allowed'), false);
      },
      credentials: true,
    },
    pingInterval: 25_000,
    pingTimeout:  20_000,
  });

  // ── Redis Adapter ──────────────────────────────
  // Reuse the shared Redis connection instead of creating new ones.
  // pub and sub must be separate clients (Redis protocol requirement),
  // but we derive sub by duplicating the existing connection.
  await redisClient.connect(); // no-op if already connected
  const pubClient = redisClient.client;
  const subClient = pubClient.duplicate();

  subClient.on('error', (err) => console.error('[redis sub] error', err));
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));

  // ── Attach Modules ────────────────────────────
  attachAuthMiddleware(io);
  attachLifecycleHandlers(io);
  attachSessionHandlers(io);
  attachChatHandlers(io);
  attachWatchdog(io);

  _io = io;

  console.log('[socket] initialized', {
    origins: allowedOrigins,
    redis:   Boolean(env.redisUrl),
  });

  return io;
}
