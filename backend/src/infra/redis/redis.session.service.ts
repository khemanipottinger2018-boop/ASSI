// backend/src/infra/redis/redis.session.service.ts

import { RedisClientType } from 'redis';
import { redisClient } from './redis.client';
import { UserRole } from '@/types/roles';

/* ===================== TYPES ===================== */

export interface UserSession {
  userId: string;
  role: UserRole;
  email?: string;
  username?: string;
  createdAt: number;
}

/* ===================== CONSTANTS ===================== */

const SESSION_TTL_SECONDS    = 60 * 60 * 24 * 7; // 7 days
const SESSION_PREFIX         = 'session:auth:';
const USER_SESSIONS_PREFIX   = 'user:sessions:';  // set of sids per userId

/* ===================== SERVICE ===================== */

export class RedisSessionService {
  private client: RedisClientType;

  constructor() {
    this.client = redisClient.client;
  }

  private key(sid: string): string {
    return `${SESSION_PREFIX}${sid}`;
  }

  private userSessionsKey(userId: string): string {
    return `${USER_SESSIONS_PREFIX}${userId}`;
  }

  /* =====================
     CREATE SESSION
     Called by AuthService.createSession(sid, userId, role)
     Also supports passing a full UserSession object.
     ===================== */
  async createSession(
    sid: string,
    userIdOrData: string | UserSession,
    role?: UserRole
  ): Promise<void> {
    // Support both call signatures:
    //   createSession(sid, userId, role)   ← what AuthService calls
    //   createSession(sid, data)            ← direct usage
    const data: UserSession =
      typeof userIdOrData === 'string'
        ? { userId: userIdOrData, role: role!, createdAt: Date.now() }
        : userIdOrData;

    await this.client
      .multi()
      .set(this.key(sid), JSON.stringify(data), { EX: SESSION_TTL_SECONDS })
      // Track this sid under the user so we can revoke all later
      .sAdd(this.userSessionsKey(data.userId), sid)
      .expire(this.userSessionsKey(data.userId), SESSION_TTL_SECONDS)
      .exec();
  }

  /* =====================
     GET SESSION
     ===================== */
  async getSession(sid: string): Promise<UserSession | null> {
    const raw = await this.client.get(this.key(sid));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserSession;
    } catch {
      return null;
    }
  }

  /* =====================
     TOUCH SESSION (reset TTL)
     Called on socket connect + active requests
     ===================== */
  async touchSession(sid: string): Promise<void> {
    await this.client.expire(this.key(sid), SESSION_TTL_SECONDS);
  }

  /* =====================
     REVOKE SESSION (single)
     Called by AuthService.revokeSession(sid) — i.e. logout
     ===================== */
  async revokeSession(sid: string): Promise<void> {
    const session = await this.getSession(sid);
    const pipeline = this.client.multi().del(this.key(sid));

    if (session?.userId) {
      pipeline.sRem(this.userSessionsKey(session.userId), sid);
    }

    await pipeline.exec();
  }

  /* =====================
     REVOKE ALL SESSIONS (user)
     Called by AuthService.revokeAllSessions(userId) — e.g. password change
     ===================== */
  async revokeAllSessions(userId: string): Promise<void> {
    const sids = await this.client.sMembers(this.userSessionsKey(userId));
    if (!sids.length) return;

    const pipeline = this.client.multi();
    sids.forEach((sid) => pipeline.del(this.key(sid)));
    pipeline.del(this.userSessionsKey(userId));
    await pipeline.exec();
  }

  /* =====================
     DELETE SESSION (alias — kept for any direct usage)
     ===================== */
  async deleteSession(sid: string): Promise<void> {
    return this.revokeSession(sid);
  }

  /* =====================
     EXISTS
     ===================== */
  async sessionExists(sid: string): Promise<boolean> {
    return (await this.client.exists(this.key(sid))) === 1;
  }
}

export const redisSessionService = new RedisSessionService();