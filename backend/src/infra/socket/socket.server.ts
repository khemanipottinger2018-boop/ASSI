// backend/src/infra/socket/socket.server.ts
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

import { attachAuthMiddleware } from './socket.auth';
import { attachLifecycleHandlers } from './socket.lifecycle';
import { attachSessionHandlers } from './socket.session';
import { attachChatHandlers } from './socket.chat';
import { attachWatchdog } from './socket.watchdog';

let _io: Server | null = null;

export function getIO(): Server {
  if (!_io) throw new Error('Socket.IO not initialized yet');
  return _io;
}

function parseOrigins(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export async function createSocketServer(httpServer: HttpServer) {
  const allowedOrigins = parseOrigins(process.env.FRONTEND_URL);

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        // Allow non-browser clients or same-origin
        if (!origin) return cb(null, true);

        // If no allowlist specified, deny by default (safer)
        if (!allowedOrigins.length) return cb(new Error('CORS origin not allowed'), false);

        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('CORS origin not allowed'), false);
      },
      credentials: true,
    },

    // If you deploy behind a reverse proxy and need a custom path, set it in env and match frontend
    // path: process.env.SOCKET_PATH || '/socket.io',

    // Optional stability tuning (avoid aggressive ping timeouts in flaky networks)
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  /* ── Redis Adapter ── */
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.error('[redis pub] error', err));
  subClient.on('error', (err) => console.error('[redis sub] error', err));

  await pubClient.connect();
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));

  /* ── Attach Modules ── */
  attachAuthMiddleware(io);
  attachLifecycleHandlers(io); 
  attachSessionHandlers(io);
  attachChatHandlers(io);
  attachWatchdog(io);

  _io = io;

  console.log('[socket] initialized', {
    origins: allowedOrigins,
    redis: Boolean(process.env.REDIS_URL),
  });

  return io;
}