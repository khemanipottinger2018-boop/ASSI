// services/RedisService.ts
import { createClient, RedisClientType } from 'redis';

export type PresenceStatus = 'online' | 'offline' | 'idle' | 'dnd' | 'busy';

export class RedisService {
  private static instance: RedisService;

  public client: RedisClientType;
  public subscriber: RedisClientType;

  private constructor() {
    this.client = createClient({ url: process.env.REDIS_URL });
    this.subscriber = createClient({ url: process.env.REDIS_URL });

    this.client.on('error', (err) => console.error('❌ Redis Client Error:', err));
    this.subscriber.on('error', (err) => console.error('❌ Redis Subscriber Error:', err));
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

  // -------------------- PRESENCE --------------------
  async setUserStatus(userId: string, status: PresenceStatus) {
    await this.client.hSet('user:status', userId, status);
  }

  async getUserStatus(userId: string): Promise<PresenceStatus | null> {
    return (await this.client.hGet('user:status', userId)) as PresenceStatus | null;
  }

  async getAllUserStatuses(): Promise<Record<string, PresenceStatus>> {
    return this.client.hGetAll('user:status') as Promise<Record<string, PresenceStatus>>;
  }

  // -------------------- NOTIFICATIONS --------------------
  async addNotification(userId: string, notification: string) {
    await this.client.lPush(`user:notifications:${userId}`, notification);
  }

  async getNotifications(userId: string, limit = 50): Promise<string[]> {
    const list = await this.client.lRange(`user:notifications:${userId}`, 0, limit - 1);
    return list;
  }

  async clearNotifications(userId: string) {
    await this.client.del(`user:notifications:${userId}`);
  }

  // -------------------- REFRESH TOKENS --------------------
  async setRefreshToken(userId: string, token: string, ttl: number) {
    // ttl in milliseconds
    await this.client.set(`refresh_token:${userId}`, token, { PX: ttl });
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    return this.client.get(`refresh_token:${userId}`);
  }

  async deleteRefreshToken(userId: string) {
    await this.client.del(`refresh_token:${userId}`);
  }

  // -------------------- HEALTH CHECK --------------------
  async ping() {
    return this.client.ping();
  }
}

export const redisService = RedisService.getInstance();
