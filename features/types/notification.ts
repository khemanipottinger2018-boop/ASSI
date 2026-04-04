// components/types/notification.ts
// ASSI Frontend — Canonical Notification Types

export type NotificationType =
  | 'chat_request'        | 'chat_message'         | 'chat_ended'
  | 'group_study_invite'
  | 'session_request'     | 'session_started'       | 'session_paused'
  | 'session_resumed'     | 'session_ended'         | 'session_inactivity'
  | 'session_no_tutor'
  | 'assignment_submitted'| 'assignment_received'   | 'assignment_in_review'
  | 'assignment_completed'| 'assignment_feedback_ready' | 'assignment_revision_requested'
  | 'review_received'     | 'review_reminder'
  | 'booking_confirmed'   | 'booking_cancelled'
  | 'payment_success'     | 'payment_failed'        | 'refund_issued' | 'payout_sent'
  | 'tutor_available'     | 'tutor_unavailable'     | 'cooldown_active' | 'cooldown_expired'
  | 'system'              | 'announcement'          | 'policy_update' | 'maintenance'
  | 'account_warning'     | 'account_suspended'     | 'account_restored'
  | 'login_alert'         | 'parental_consent_required' | 'parental_consent_approved'
  // Engagement
  | 'streak_milestone'    | 'badge_awarded'          | 'credits_earned' | 'goal_completed';

export interface Notification {
  id:        string;
  type:      NotificationType;
  title:     string;
  body:      string | null;
  metadata:  Record<string, any> | null;
  isRead:    boolean;
  createdAt: string;
  expiresAt: string | null;
}

/** Returns notifications that have not yet expired. */
export function filterActive(notifications: Notification[]): Notification[] {
  const now = Date.now();
  return notifications.filter(n => !n.expiresAt || new Date(n.expiresAt).getTime() > now);
}

export interface NotificationInboxResponse {
  success:       boolean;
  notifications: Notification[];
  // No unreadCount — derive from notifications.filter(n => !n.isRead).length
}
