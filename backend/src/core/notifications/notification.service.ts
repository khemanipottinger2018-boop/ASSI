// src/core/notifications/notification.service.ts
// ASSI Platform — Notification Service
// Persists notifications to DB, then delivers via socket (online)
// or push (offline). All DB ops go through Prisma.

import { prisma }               from '@/config/database';
import { redisPresenceService } from '@/infra/redis';
import { pushService }          from './push.service';

import {
  NotificationPayload,
  NotificationDeliveryResult,
} from './notification.types';

// ─────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────

export class NotificationService {

  // ── Create & Deliver ────────────────────────

  async notify(payload: NotificationPayload): Promise<NotificationDeliveryResult> {
    // 1. Persist — always, regardless of online status
    await prisma.notification.create({
      data: {
        userId:   payload.userId,
        type:     payload.type,
        title:    payload.title,
        body:     payload.body,          // schema: body text
        metadata: payload.data ?? {},    // schema: metadata jsonb
        isRead:   false,
      },
    });

    // 2. Deliver — socket if online, push if not
    const isOnline = await redisPresenceService.isOnline(payload.userId);

    if (isOnline) {
      // Socket delivery is handled by the socket gateway
      // which listens for new notifications in Redis pub/sub.
      return { deliveredVia: 'socket' };
    }

    const pushed = await pushService.send(payload);
    return { deliveredVia: pushed ? 'push' : 'none' };
  }

  // ── Inbox ────────────────────────────────────

  async getInbox(userId: string, limit = 30) {
    return prisma.notification.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    limit,
      select: {
        id:        true,
        type:      true,
        title:     true,
        body:      true,       // schema: body text
        metadata:  true,       // schema: metadata jsonb
        isRead:    true,
        createdAt: true,
      },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  // ── Mark Read ────────────────────────────────

  async markOneRead(userId: string, notificationId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },   // userId guard prevents other users marking yours
      data:  { isRead: true },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data:  { isRead: true },
    });
  }

  // ── Delete ───────────────────────────────────

  async deleteOne(userId: string, notificationId: string): Promise<void> {
    await prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }
}

export const notificationService = new NotificationService();
