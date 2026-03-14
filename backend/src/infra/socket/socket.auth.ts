import { Server, Socket } from 'socket.io';
import cookie from 'cookie';

import { SESSION_COOKIE_NAME } from '@/config/cookies';
import { redisSessionService } from '@/infra/redis';
import { UserRole } from '@/types/roles';

export type SocketUser = {
  userId: string;
  role: UserRole;
  sid: string;
};

declare module 'socket.io' {
  interface Socket {
    user?: SocketUser;
  }
}

export function attachAuthMiddleware(io: Server) {
  io.use(async (socket: Socket, next) => {
    try {
      // Some proxies can provide cookie as string | string[]
      const raw = socket.handshake.headers?.cookie;
      const rawCookie =
        Array.isArray(raw) ? raw.join(';') : (raw ?? '');

      if (!rawCookie) return next(new Error('Not authenticated'));

      const cookies = cookie.parse(rawCookie);
      const sid = cookies?.[SESSION_COOKIE_NAME];
      if (!sid) return next(new Error('Not authenticated'));

      const session = await redisSessionService.getSession(sid);
      if (!session) return next(new Error('Session expired'));

      socket.user = {
        userId: session.userId,
        role: session.role,
        sid,
      };

      // ✅ Keep this OR lifecycle's touch, not both.
      // I recommend keeping it here (auth layer owns session validity).
      await redisSessionService.touchSession(sid);

      return next();
    } catch (err) {
      console.error('[socket][auth] middleware error:', err);
      return next(new Error('Authentication failed'));
    }
  });
}