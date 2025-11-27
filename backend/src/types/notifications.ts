// src/types/notifications.ts

// ✅ Comprehensive notification types for your platform
export type NotificationType = 
  | 'session_booked'      // Student booked a session
  | 'session_cancelled'   // Session was cancelled
  | 'session_reminder'    // Upcoming session reminder
  | 'session_starting'    // Session starts soon (15min)
  | 'message_received'    // New chat message
  | 'tutor_approved'      // Tutor application approved
  | 'tutor_rejected'      // Tutor application rejected
  | 'payment_received'    // Payment completed
  | 'payment_failed'      // Payment failed
  | 'review_received'     // New review/rating
  | 'assignment_help'     // Student requested assignment help
  | 'subject_match'       // Tutor available for student's subject
  | 'system_alert'        // Platform announcements
  | 'profile_verified'    // Profile verification complete
  | 'subscription_expiry' // Tutor subscription expiring soon
  | 'goal_achieved';      // Student reached a learning goal

// ✅ Notification data with proper typing
export interface NotificationData {
  // Session-related
  session_id?: string;
  session_time?: string;
  session_duration?: number;
  
  // User-related
  sender_id?: string;
  sender_name?: string;
  sender_role?: 'student' | 'tutor' | 'admin';
  
  // Payment-related
  amount?: number;
  currency?: string;
  payment_id?: string;
  
  // Review-related
  review_id?: string;
  rating?: number;
  
  // Application-related
  application_id?: string;
  
  // Navigation
  redirect_url?: string;
  action_required?: boolean;
  
  // Additional context
  subject_id?: string;
  assignment_id?: string;
  goal_id?: string;
}

// ✅ Main notification interface
export interface Notification {
  notification_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData;
  is_read: boolean;
  is_actionable: boolean;  // Whether user needs to take action
  priority: 'low' | 'medium' | 'high';
  expires_at?: string;     // For time-sensitive notifications
  created_at: string;
  updated_at: string;
}

// ✅ Notification preferences
export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  in_app_notifications: boolean;
  sms_notifications: boolean;
  
  // Category-specific preferences
  session_alerts: boolean;
  message_alerts: boolean;
  payment_alerts: boolean;
  system_alerts: boolean;
  promotion_alerts: boolean;
}

// ✅ Real-time notification response
export interface NotificationResponse {
  notification: Notification;
  unread_count: number;
  total_count: number;
}

// ✅ Bulk notification actions
export interface MarkAsReadPayload {
  notification_ids: string[];
  mark_all?: boolean;
}

// ✅ Notification filters
export interface NotificationFilters {
  is_read?: boolean;
  type?: NotificationType;
  priority?: 'low' | 'medium' | 'high';
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

// ✅ Notification stats for dashboard
export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  by_type: Record<NotificationType, number>;
  by_priority: {
    low: number;
    medium: number;
    high: number;
  };
}