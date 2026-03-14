// backend/src/infra/redis/redis.presence.service.ts

import { RedisClientType } from 'redis';
import { redisClient } from './redis.client';

export type StatusIntent =
  | 'available'
  | 'do_not_disturb'
  | 'busy_session'
  | 'busy_other';

export type PresenceStatus = 'online' | 'offline' | 'busy';

const PRESENCE_TTL_SECONDS = 120;
const AVAILABLE_TUTORS_SET = 'tutors:available';

/**
 * Counter key tracking how many presence hashes currently exist.
 * Incremented/decremented in sync with presence hash lifecycle.
 * Used by getOnlineCount() instead of KEYS (which blocks Redis at scale).
 */
const ONLINE_COUNT_KEY = 'presence:online:count';

interface FullPresence {
  online:          boolean;
  socketConnected: boolean;
  intent:          StatusIntent;
  lastActivity:    number | null;
  socketCount:     number;
  discoverable:    boolean;
}

export class RedisPresenceService {
  private client: RedisClientType;

  constructor() {
    this.client = redisClient.client;
  }

  private presenceKey(userId: string):    string { return `presence:user:${userId}`; }
  private legacyIntentKey(userId: string): string { return `status:intent:${userId}`; }

  /* ──────────────────────────────────────────────
     SOCKET LIFECYCLE
  ────────────────────────────────────────────── */

  async incrementPresence(userId: string, options?: { intent?: StatusIntent }): Promise<void> {
    const now           = Date.now();
    const key           = this.presenceKey(userId);
    const isNewUser     = (await this.client.exists(key)) === 0;
    const currentIntent = options?.intent ?? (await this.getStatusIntent(userId));

    await this.client
      .multi()
      .hIncrBy(key, 'socketCount', 1)
      .hSet(key, { lastSeenAt: now.toString(), intent: currentIntent })
      .expire(key, PRESENCE_TTL_SECONDS)
      .exec();

    // Increment the online counter only when we create a new presence hash
    if (isNewUser) {
      await this.client.incr(ONLINE_COUNT_KEY);
    }
  }

  async decrementPresence(userId: string): Promise<void> {
    const key    = this.presenceKey(userId);
    const exists = await this.client.exists(key);

    if (!exists) {
      await this.client.sRem(AVAILABLE_TUTORS_SET, userId);
      return;
    }

    const nextCount = await this.client.hIncrBy(key, 'socketCount', -1);

    if (nextCount <= 0) {
      await this.client
        .multi()
        .del(key)
        .sRem(AVAILABLE_TUTORS_SET, userId)
        .exec();

      // Decrement the online counter when presence hash is destroyed
      const current = await this.client.get(ONLINE_COUNT_KEY);
      if (current && Number(current) > 0) {
        await this.client.decr(ONLINE_COUNT_KEY);
      }
      return;
    }

    await this.client
      .multi()
      .hSet(key, { lastSeenAt: Date.now().toString() })
      .expire(key, PRESENCE_TTL_SECONDS)
      .exec();
  }

  /* ──────────────────────────────────────────────
     REST HEARTBEAT
  ────────────────────────────────────────────── */

  async refreshPresence(userId: string, intent?: StatusIntent): Promise<void> {
    const now    = Date.now();
    const key    = this.presenceKey(userId);
    const exists = await this.client.exists(key);

    if (exists) {
      const fields: Record<string, string> = { lastSeenAt: now.toString() };
      if (intent) fields.intent = intent;

      await this.client
        .multi()
        .hSet(key, fields)
        .expire(key, PRESENCE_TTL_SECONDS)
        .exec();
    } else {
      // REST-only client (no socket). socketCount = 0 means NOT discoverable
      // for live chat — isDiscoverableTutor() requires socketCount > 0.
      await this.client
        .multi()
        .hSet(key, {
          socketCount: '0',
          lastSeenAt:  now.toString(),
          intent:      intent ?? 'do_not_disturb',
        })
        .expire(key, PRESENCE_TTL_SECONDS)
        .exec();

      // Don't increment online counter — REST presence isn't truly "online"
      // for chat purposes. Counter only tracks socket-connected users.
    }
  }

  /* ──────────────────────────────────────────────
     ONLINE / SOCKET CHECKS
  ────────────────────────────────────────────── */

  async isOnline(userId: string): Promise<boolean> {
    return (await this.client.exists(this.presenceKey(userId))) === 1;
  }

  async getSocketCount(userId: string): Promise<number> {
    const raw = await this.client.hGet(this.presenceKey(userId), 'socketCount');
    return Number(raw || 0);
  }

  async isSocketConnected(userId: string): Promise<boolean> {
    return (await this.getSocketCount(userId)) > 0;
  }

  /* ──────────────────────────────────────────────
     INTENT
  ────────────────────────────────────────────── */

  async setStatusIntent(userId: string, intent: StatusIntent): Promise<void> {
    const key    = this.presenceKey(userId);
    const exists = await this.client.exists(key);

    const pipeline = this.client.multi().set(this.legacyIntentKey(userId), intent);
    if (exists) pipeline.hSet(key, { intent });

    await pipeline.exec();
  }

  async getStatusIntent(userId: string): Promise<StatusIntent> {
    const fromHash = await this.client.hGet(this.presenceKey(userId), 'intent');
    if (fromHash) return fromHash as StatusIntent;

    const fromLegacy = await this.client.get(this.legacyIntentKey(userId));
    return (fromLegacy as StatusIntent) || 'do_not_disturb';
  }

  async clearStatusIntent(userId: string): Promise<void> {
    await this.client.del(this.legacyIntentKey(userId));
  }

  /* ──────────────────────────────────────────────
     DISCOVERABILITY / AVAILABILITY
  ────────────────────────────────────────────── */

  async isAvailable(userId: string): Promise<boolean> {
    if (!(await this.isOnline(userId))) return false;
    return (await this.getStatusIntent(userId)) === 'available';
  }

  async isDiscoverableTutor(userId: string): Promise<boolean> {
    if (!(await this.isOnline(userId)))          return false;
    if (!(await this.isSocketConnected(userId))) return false;
    return (await this.getStatusIntent(userId)) === 'available';
  }

  async listAvailableTutorIds(): Promise<string[]> {
    return this.client.sMembers(AVAILABLE_TUTORS_SET);
  }

  async isTutorAvailable(userId: string): Promise<boolean> {
    return (await this.client.sIsMember(AVAILABLE_TUTORS_SET, userId)) === 1;
  }

  async setTutorAvailable(userId: string, isTutor: boolean): Promise<void> {
    await this.setStatusIntent(userId, 'available');
    await this.syncTutorAvailability(userId, isTutor);
  }

  async setTutorUnavailable(userId: string): Promise<void> {
    await this.setStatusIntent(userId, 'do_not_disturb');
    await this.client.sRem(AVAILABLE_TUTORS_SET, userId);
  }

  async syncTutorAvailability(userId: string, isTutor: boolean): Promise<void> {
    if (!isTutor) {
      await this.client.sRem(AVAILABLE_TUTORS_SET, userId);
      return;
    }

    const discoverable = await this.isDiscoverableTutor(userId);
    if (discoverable) {
      await this.client.sAdd(AVAILABLE_TUTORS_SET, userId);
    } else {
      await this.client.sRem(AVAILABLE_TUTORS_SET, userId);
    }
  }

  /* ──────────────────────────────────────────────
     PRESENCE SHAPES FOR API
  ────────────────────────────────────────────── */

  async getFullPresence(userId: string): Promise<FullPresence> {
    const online = await this.isOnline(userId);

    if (!online) {
      return {
        online:          false,
        socketConnected: false,
        intent:          await this.getStatusIntent(userId),
        lastActivity:    null,
        socketCount:     0,
        discoverable:    false,
      };
    }

    const raw          = await this.client.hGetAll(this.presenceKey(userId));
    const socketCount  = Number(raw?.socketCount || 0);
    const lastActivity = raw?.lastSeenAt ? Number(raw.lastSeenAt) : null;
    const intent       = (raw?.intent as StatusIntent) || (await this.getStatusIntent(userId));
    const socketConnected = socketCount > 0;
    const discoverable    = socketConnected && intent === 'available';

    return { online: true, socketConnected, intent, lastActivity, socketCount, discoverable };
  }

  async getPresenceData(userId: string): Promise<{ status: PresenceStatus; lastActivity: number | null }> {
    const full = await this.getFullPresence(userId);

    let status: PresenceStatus = 'offline';
    if (!full.online || full.intent === 'do_not_disturb') {
      status = 'offline';
    } else if (full.intent === 'busy_session' || full.intent === 'busy_other') {
      status = 'busy';
    } else {
      status = 'online';
    }

    return { status, lastActivity: full.lastActivity };
  }

  /* ──────────────────────────────────────────────
     ONLINE COUNT (BUG FIX #4 — was KEYS, now O(1) counter)
     KEYS 'presence:user:*' blocks Redis event loop at scale.
     Counter is maintained in sync with incrementPresence /
     decrementPresence so this is always O(1).
  ────────────────────────────────────────────── */

  async getOnlineCount(): Promise<number> {
    const raw = await this.client.get(ONLINE_COUNT_KEY);
    return Math.max(0, Number(raw || 0));
  }
}

export const redisPresenceService = new RedisPresenceService();
