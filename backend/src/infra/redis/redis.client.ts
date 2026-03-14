import { createClient, RedisClientType } from 'redis';

class RedisClient {
  private static instance: RedisClient;

  public client: RedisClientType;

  private constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            return new Error('Redis reconnect failed');
          }
          return Math.min(retries * 200, 2000);
        },
      },
    });

    this.client.on('connect', () => {
      console.log('🟢 Redis connected');
    });

    this.client.on('error', (err) => {
      console.error('🔴 Redis error:', err);
    });
  }

  static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  isReady(): boolean {
    return this.client.isOpen;
  }

  /**
   * Lightweight health check for Redis.
   * Returns 'PONG' if Redis is reachable.
   */
  async ping(): Promise<'PONG' | 'DISCONNECTED'> {
    if (!this.client.isOpen) {
      return 'DISCONNECTED';
    }

    try {
      const res = await this.client.ping();
      return res === 'PONG' ? 'PONG' : 'DISCONNECTED';
    } catch {
      return 'DISCONNECTED';
    }
  }
}

export const redisClient = RedisClient.getInstance();
