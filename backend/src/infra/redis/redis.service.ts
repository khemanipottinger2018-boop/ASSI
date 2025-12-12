// src/infra/redis/redis.service.ts
import { createClient, RedisClientType } from 'redis';

/* =====================================================
 * TYPES & CONSTANTS
 * ===================================================== */

export type PresenceStatus = 'online' | 'idle' | 'offline';

const PRESENCE_TTL_SECONDS = 60 * 20;        // 20 minutes
const ONLINE_THRESHOLD_MS = 30_000;          // 30 seconds
const IDLE_THRESHOLD_MS = 15 * 60_000;       // 15 minutes
const NOTIFICATION_LIMIT = 100;

/* =====================================================
 * REDIS SERVICE (Singleton)
 * ===================================================== */

export class RedisService {
  private static instance: RedisService;

  public client: RedisClientType;
  public subscriber: RedisClientType;

  private constructor() {
    this.client = createClient({ url: process.env.REDIS_URL });
    this.subscriber = createClient({ url: process.env.REDIS_URL });

    this.client.on('error', (err) =>
      console.error('❌ Redis Client Error:', err)
    );
    this.subscriber.on('error', (err) =>
      console.error('❌ Redis Subscriber Error:', err)
    );
  }

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  async connect() {
    if (!this.client.isOpen) await this.client.connect();
    if (!this.subscriber.isOpen) await this.subscriber.connect();
  }

  async disconnect() {
    if (this.client.isOpen) await this.client.disconnect();
    if (this.subscriber.isOpen) await this.subscriber.disconnect();
  }

  /* =====================================================
   * PRESENCE (Stage 2 – derived, TTL-based)
   * ===================================================== */

  async updateLastSeen(userId: string): Promise<void> {
    await this.client.set(
      `presence:lastSeen:${userId}`,
      Date.now().toString(),
      { EX: PRESENCE_TTL_SECONDS }
    );
  }

  async getPresence(userId: string): Promise<PresenceStatus> {
    const raw = await this.client.get(`presence:lastSeen:${userId}`);
    if (!raw) return 'offline';

    const lastSeen = Number(raw);
    const diff = Date.now() - lastSeen;

    if (diff <= ONLINE_THRESHOLD_MS) return 'online';
    if (diff <= IDLE_THRESHOLD_MS) return 'idle';
    return 'offline';
  }

  async getOnlineCount(): Promise<number> {
    const keys = await this.client.keys('presence:lastSeen:*');
    return keys.length;
  }

  /* =====================================================
   * LEGACY PRESENCE (DEPRECATED — transitional only)
   * ===================================================== */

  /**
   * @deprecated Do NOT use for realtime presence.
   * Kept only to avoid breaking legacy routes.
   */
  async setUserStatus(userId: string, status: string): Promise<void> {
    await this.client.hSet('user:status', userId, status);
  }

  /**
   * @deprecated
   */
  async getUserStatus(userId: string): Promise<string | null> {
    return this.client.hGet('user:status', userId);
  }

  /* =====================================================
   * NOTIFICATIONS (Stage 3 – inbox model)
   * ===================================================== */

  async pushNotification(
    userId: string,
    notification: {
      id: string;
      type: string;
      title: string;
      body: string;
      createdAt: number;
    }
  ): Promise<void> {
    const inboxKey = `notifications:inbox:${userId}`;
    const unreadKey = `notifications:unread:${userId}`;

    await this.client
      .multi()
      .lPush(
        inboxKey,
        JSON.stringify({ ...notification, read: false })
      )
      .lTrim(inboxKey, 0, NOTIFICATION_LIMIT - 1)
      .incr(unreadKey)
      .exec();
  }

  async getNotifications(
    userId: string,
    limit = 20
  ): Promise<any[]> {
    const raw = await this.client.lRange(
      `notifications:inbox:${userId}`,
      0,
      limit - 1
    );

    return raw.map((item) => JSON.parse(item));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const count = await this.client.get(`notifications:unread:${userId}`);
    return Number(count ?? 0);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.client.set(`notifications:unread:${userId}`, 0);
  }
  
  /* =====================================================
   * LOCKS & CONCURRENCY (Stage 5)
   * ===================================================== */

  /**
   * Acquire a short-lived distributed lock.
   * Used to prevent race conditions (e.g. tutor overbooking).
   */
  async acquireLock(
    key: string,
    ttlSeconds = 5
  ): Promise<boolean> {
    const result = await this.client.set(
      `lock:${key}`,
      '1',
      { NX: true, EX: ttlSeconds }
    );
    return result === 'OK';
  }

  /**
   * Release a previously acquired lock.
   */
  async releaseLock(key: string): Promise<void> {
    await this.client.del(`lock:${key}`);
  }

  /**
   * Get how many active sessions a tutor currently has.
   */
  async getTutorActiveCount(tutorId: string): Promise<number> {
    return this.client.sCard(
      `tutor:active_sessions:${tutorId}`
    );
  }

  /**
   * Register a session as active for a tutor.
   */
  async addTutorActiveSession(
    tutorId: string,
    sessionId: string
  ): Promise<void> {
    await this.client.sAdd(
      `tutor:active_sessions:${tutorId}`,
      sessionId
    );
  }

  /**
   * Remove an active session from a tutor.
   */
  async removeTutorActiveSession(
    tutorId: string,
    sessionId: string
  ): Promise<void> {
    await this.client.sRem(
      `tutor:active_sessions:${tutorId}`,
      sessionId
    );
  }

  /* =====================================================
   * REFRESH TOKENS
   * ===================================================== */

  async setRefreshToken(
    userId: string,
    token: string,
    ttlMs: number
  ): Promise<void> {
    await this.client.set(
      `refresh_token:${userId}`,
      token,
      { PX: ttlMs }
    );
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    return this.client.get(`refresh_token:${userId}`);
  }

  async deleteRefreshToken(userId: string): Promise<void> {
    await this.client.del(`refresh_token:${userId}`);
  }

  /* =====================================================
   * HEALTH
   * ===================================================== */

  async ping(): Promise<string> {
    return this.client.ping();
  }
}

export const redisService = RedisService.getInstance();
