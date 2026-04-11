// app/live-chat/types/SocketEvents.ts

export type SessionType   = 'instant' | 'group_study' | 'conference' | 'admin_broadcast';
export type SpeakMode     = 'request' | 'open';
export type SessionStatus = 'waiting' | 'active' | 'paused' | 'ended';

export type Participant = {
  userId:     string;
  username:   string;
  role:       'student' | 'tutor' | 'admin';
  isMuted:    boolean;
  handRaised: boolean;
  isHost:     boolean;
};

export type ChatMessage = {
  messageId:   string;
  sessionId:   string;
  senderId:    string;
  senderName?: string;
  content:     string;
  timestamp:   number;
};

export type PresencePayload = {
  sessionId:    string;
  participants: string[];
  count:        number;
};

export type InviteRequest = {
  sessionId:       string;
  fromUsername:    string;
  inviteeUsername: string;
};

export type SessionMeta = {
  sessionId:       string;
  type:            SessionType;
  speakMode:       SpeakMode;
  hostId:          string;
  subjectName?:    string;
  maxParticipants: number;
  isPublic?:       boolean;
  // Server-authoritative time fields (ms epoch)
  startedAt?:      number;
  endsAt?:         number;
  // Participant display names resolved server-side
  tutorName?:      string;
  studentName?:    string;
  tutorId?:        string;
  studentId?:      string;
};

export type ServerToClientEvents = {
  'chat:message':          (msg: ChatMessage) => void;
  'chat:presence':         (p: PresencePayload) => void;
  'chat:typing':           (p: { userId: string; typing: boolean }) => void;
  'chat:tutor_joined':     (p: { sessionId: string; tutorId: string }) => void;

  'chat:invite_request':   (p: InviteRequest) => void;
  'chat:invite_accepted':  (p: { sessionId: string; inviteeUsername: string }) => void;
  'chat:invite_declined':  (p: { sessionId: string; declinerUsername?: string }) => void;
  'chat:invite_progress':  (p: { sessionId: string; approvals: number; requiredApprovals: number }) => void;
  'chat:invite_error':     (p: { reason: string }) => void;

  'session:meta':          (meta: SessionMeta) => void;
  'session:request':       (p: { sessionId: string }) => void;
  'session:ready':         (p: { sessionId: string }) => void;
  'session:started':       (p: { sessionId: string }) => void;
  'session:paused':        (p: { reason: string }) => void;
  'session:ended':         (p: { sessionId?: string; reason: string }) => void;
  'session:host_left':     (p: { sessionId: string; graceExpiresAt: number }) => void;
  'session:resumed':       (p: { sessionId: string }) => void;
  'session:updated':       (p: Partial<SessionMeta> & { sessionId: string }) => void;
  'session:participants':  (p: { sessionId: string; participants: Participant[] }) => void;
  'chat:system_message':   (p: { sessionId: string; content: string; timestamp: number }) => void;

  'conference:hand_raised':   (p: { sessionId: string; userId: string; username: string }) => void;
  'conference:hand_lowered':  (p: { sessionId: string; userId: string }) => void;
  'conference:speak_mode':    (p: { sessionId: string; mode: SpeakMode }) => void;
  'conference:muted':         (p: { sessionId: string; userId: string }) => void;
  'conference:unmuted':       (p: { sessionId: string; userId: string }) => void;
  'conference:floor_granted': (p: { sessionId: string; userId: string }) => void;
};

export type ClientToServerEvents = {
  'session:join':       (p: { sessionId: string }) => void;
  'session:accept':     (p: { sessionId: string }) => void;
  'session:end':        (p: { sessionId: string; reason: string }) => void;
  // Tutor intentionally steps away without ending — triggers 2-min grace period
  'session:host_leave': (p: { sessionId: string }) => void;

  'chat:join':  (sessionId: string) => void;
  'chat:leave': (sessionId: string) => void;

  'chat:message':        (p: { sessionId: string; content: string; messageId: string }) => void;
  'chat:accept_session': (sessionId: string) => void;

  'chat:typing:start': (p: { sessionId: string }) => void;
  'chat:typing:stop':  (p: { sessionId: string }) => void;

  'chat:invite_request': (p: { sessionId: string; fromUsername?: string; inviteeUsername: string }) => void;
  'chat:invite_accept':  (p: { sessionId: string; responderUsername?: string }) => void;
  'chat:invite_decline': (p: { sessionId: string; responderUsername?: string }) => void;

  'conference:raise_hand':     (p: { sessionId: string }) => void;
  'conference:lower_hand':     (p: { sessionId: string }) => void;
  'conference:grant_floor':    (p: { sessionId: string; userId: string }) => void;
  'conference:mute_user':      (p: { sessionId: string; userId: string }) => void;
  'conference:unmute_user':    (p: { sessionId: string; userId: string }) => void;
  'conference:set_speak_mode': (p: { sessionId: string; mode: SpeakMode }) => void;
};