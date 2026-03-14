import { RedisClientType } from 'redis';
import { redisClient } from './redis.client';

/* ===================== TYPES ===================== */

export interface TutorCooldownInfo {
  tutorId: string;
  studentId: string;
  expiresAt: number;
}

/* ===================== SERVICE ===================== */

export class RedisCooldownService {
  private client: RedisClientType;

  constructor() {
    this.client = redisClient.client;
  }

  /* ===================== KEY HELPERS ===================== */

  private key(tutorId: string, studentId: string): string {
    return `cooldown:tutor:${tutorId}:${studentId}`;
  }

  /* ===================== CREATE COOLDOWN ===================== */

  /**
   * Create a cooldown after a session ends.
   * Cooldown duration should be 50% of the session runtime.
   */
  async createCooldown(
    tutorId: string,
    studentId: string,
    sessionRuntimeMs: number
  ): Promise<void> {
    const cooldownMs = Math.floor(sessionRuntimeMs / 2);
    if (cooldownMs <= 0) return;

    const expiresAt = Date.now() + cooldownMs;
    const ttlSeconds = Math.ceil(cooldownMs / 1000);

    await this.client.set(
      this.key(tutorId, studentId),
      expiresAt.toString(),
      { EX: ttlSeconds }
    );
  }

  /* ===================== CHECK COOLDOWN ===================== */

  async isOnCooldown(
    tutorId: string,
    studentId: string
  ): Promise<{
    onCooldown: boolean;
    expiresAt?: number;
    remainingMs?: number;
  }> {
    const raw = await this.client.get(this.key(tutorId, studentId));
    if (!raw) return { onCooldown: false };

    const expiresAt = Number(raw);
    const remainingMs = expiresAt - Date.now();

    if (remainingMs <= 0) {
      await this.clearCooldown(tutorId, studentId);
      return { onCooldown: false };
    }

    return {
      onCooldown: true,
      expiresAt,
      remainingMs,
    };
  }

  /* ===================== OVERRIDE / CLEAR ===================== */

  /**
   * Tutor explicitly allows the student to bypass cooldown.
   */
  async overrideCooldown(
    tutorId: string,
    studentId: string
  ): Promise<void> {
    await this.clearCooldown(tutorId, studentId);
  }

  async clearCooldown(
    tutorId: string,
    studentId: string
  ): Promise<void> {
    await this.client.del(this.key(tutorId, studentId));
  }
}

export const redisCooldownService = new RedisCooldownService();
