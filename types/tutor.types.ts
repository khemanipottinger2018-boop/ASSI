// types/tutor.types.ts

// ==================== CORE USER & PRESENCE TYPES ====================
export type UserStatus = 'online' | 'idle' | 'offline' | 'dnd'; // dnd = Do Not Disturb

export interface UserPresence {
  user_id: string;
  status: UserStatus;
  last_activity: string;
  status_set_at: string;
  custom_status?: string;
  quiet_hours_start?: string; // Time format: "22:00"
  quiet_hours_end?: string;   // Time format: "08:00"
  dnd_until?: string;         // DateTime for temporary DND
}

// ==================== TUTOR & SUBJECT TYPES ====================
export interface Tutor {
  tutor_id: string;
  name: string;
  profile_pic: string;
  status: UserStatus;
  expertise_level: string;
  hourly_rate: number;
  rating: number;
  bio: string;
  response_time: string;
  total_sessions: number;
  is_verified: boolean;
  user_id: string;
  username?: string;
  email?: string;
  subjects?: Subject[];
}

export interface Subject {
  subject_id: string;
  name: string;
  level: string;
  description?: string;
}

// ==================== CHAT SESSION & REQUEST TYPES ====================
export interface ChatSession {
  id: string;
  student_id: string;
  tutor_id: string;
  subject_id: string;
  status: 'requested' | 'accepted' | 'declined' | 'active' | 'completed' | 'expired';
  requested_at: string;
  accepted_at?: string;
  started_at?: string;
  ended_at?: string;
  expiry_time: string;
  student_notes?: string;
  decline_reason?: string;
  
  // Joined fields for UI
  student_name?: string;
  student_email?: string;
  tutor_name?: string;
  subject_name?: string;
  subject_level?: string;
}

export interface ChatRequest {
  session_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  subject_name: string;
  subject_level: string;
  student_notes?: string;
  requested_at: string;
  expiry_time: string;
  student_status?: UserStatus;
}

// ==================== MESSAGE & NOTIFICATION TYPES ====================
export interface ChatMessage {
  message_id: string;
  session_id?: string; // Added for session-based messaging
  from_user_id: string;
  to_user_id: string;
  message: string;
  message_type: 'text' | 'file' | 'system';
  sent_at: string;
  read_at: string | null;
  from_user: {
    id: string;
    username: string;
    role: string;
    status?: UserStatus;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'chat_request' | 'chat_accepted' | 'chat_declined' | 'message' | 'booking' | 'system';
  title: string;
  message: string;
  data: string; // JSON string with additional data
  is_read: boolean;
  created_at: string;
  related_session_id?: string;
  related_user_id?: string;
}

// ==================== THEME & UI TYPES ====================
export type ThemeName = 'caribbean-vibrant' | 'english' | 'math' | 'science' | 'it' | 'default';

export interface Theme {
  primary: string;
  accent: string;
  gradient: string;
}

// ==================== API & REAL-TIME TYPES ====================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PresenceUpdate {
  user_id: string;
  status: UserStatus;
  last_activity: string;
  custom_status?: string;
}

// ==================== BOOKING SYSTEM TYPES ====================
export interface Booking {
  id: string;
  student_id: string;
  tutor_id: string;
  subject_id: string;
  scheduled_time: string;
  duration: number; // in minutes
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  created_at: string;
  price?: number;
  
  // Joined fields
  student_name?: string;
  tutor_name?: string;
  subject_name?: string;
}

// ==================== STATUS CONFIGURATION ====================
export interface StatusConfig {
  label: string;
  color: string;
  description: string;
  showInList: boolean;
  availableForChat: boolean;
}

export const STATUS_CONFIG: Record<UserStatus, StatusConfig> = {
  online: {
    label: 'Online',
    color: 'bg-green-500',
    description: 'Available for chats',
    showInList: true,
    availableForChat: true
  },
  idle: {
    label: 'Idle',
    color: 'bg-yellow-500',
    description: 'Away from keyboard',
    showInList: true,
    availableForChat: true
  },
  offline: {
    label: 'Offline',
    color: 'bg-gray-500',
    description: 'Not available',
    showInList: true,
    availableForChat: false
  },
  dnd: {
    label: 'Do Not Disturb',
    color: 'bg-red-500',
    description: 'Please do not disturb',
    showInList: true,
    availableForChat: false
  }
};

// ==================== HELPER FUNCTIONS ====================
export const getStatusConfig = (status: UserStatus): StatusConfig => {
  return STATUS_CONFIG[status];
};

export const isUserAvailable = (status: UserStatus): boolean => {
  return STATUS_CONFIG[status].availableForChat;
};

export const formatLastSeen = (lastActivity: string): string => {
  const now = new Date();
  const activity = new Date(lastActivity);
  const diffMs = now.getTime() - activity.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return activity.toLocaleDateString();
};

// ==================== COMPONENT PROP TYPES ====================
export interface TutorCardProps {
  tutor: Tutor;
  subjectName: string;
  onTutorSelect: (tutor: Tutor) => void;
  isOnline: boolean;
}

export interface ChatRequestModalProps {
  tutor: Tutor;
  subjectName: string;
  onClose: () => void;
  onConfirm: (notes?: string) => void;
}

export interface AvailabilityToggleProps {
  currentStatus: UserStatus;
  onStatusChange: (status: UserStatus) => void;
  className?: string;
}