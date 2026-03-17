// src/core/notifications/notification.types.ts
// ASSI Platform — Canonical Notification Types

export type NotificationType =
  /* --- Live Chat --- */
  | 'chat_request'
  | 'chat_message'
  | 'chat_ended'

  /* --- Sessions --- */
  | 'session_request'
  | 'session_started'
  | 'session_paused'
  | 'session_resumed'
  | 'session_ended'
  | 'session_inactivity'
  | 'session_no_tutor'

  /* --- Assignments (Branch One: Assignment Dropbox) --- */
  | 'assignment_submitted'
  | 'assignment_received'       // tutor sees this
  | 'assignment_in_review'
  | 'assignment_completed'
  | 'assignment_feedback_ready'
  | 'assignment_revision_requested'

  /* --- Reviews & Ratings --- */
  | 'review_received'
  | 'review_reminder'

  /* --- Bookings / Payments --- */
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'payment_success'
  | 'payment_failed'
  | 'refund_issued'
  | 'payout_sent'               // tutor-side

  /* --- Tutor Availability / Cooldowns --- */
  | 'tutor_available'
  | 'tutor_unavailable'
  | 'cooldown_active'
  | 'cooldown_expired'

  /* --- System / Admin --- */
  | 'system'
  | 'announcement'
  | 'policy_update'
  | 'maintenance'

  /* --- Account / Security --- */
  | 'account_warning'
  | 'account_suspended'
  | 'account_restored'
  | 'login_alert'
  | 'parental_consent_required'  // App Store compliance — minor accounts
  | 'parental_consent_approved';

// ─────────────────────────────────────────────
// PAYLOADS
// ─────────────────────────────────────────────

export interface NotificationPayload {
  userId: string;
  type:   NotificationType;
  title:  string;
  body:   string;
  data?:  Record<string, any>;
}

export interface NotificationDeliveryResult {
  deliveredVia: 'socket' | 'push' | 'none';
}
