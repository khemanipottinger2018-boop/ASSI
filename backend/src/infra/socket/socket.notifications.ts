// backend/src/infra/socket/socket.notifications.ts
import { Server } from 'socket.io';
import { NotificationPayload } from '@/core/notifications/notification.types';

export function emitNotification(io: Server, payload: NotificationPayload): void {
  if (!payload?.userId) return;
  io.to(`user:${payload.userId}`).emit('notification:new', payload);
}