// backend/src/core/notifications/push.service.ts

import { NotificationPayload } from './notification.types';

class PushService {
  /**
   * Fallback delivery for offline users
   * Returns true if sent, false otherwise
   */
  async send(_payload: NotificationPayload): Promise<boolean> {
    // 🔕 Push disabled for now
    // Future implementations:
    // - Web Push (Service Workers)
    // - Firebase Cloud Messaging (FCM)
    // - Apple Push Notification Service (APNs)

    return false;
  }
}

export const pushService = new PushService();
