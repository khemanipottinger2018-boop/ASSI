// app/live-chat/types/SocketEvents.ts

export type ChatMessage = {
  messageId: string;
  sessionId: string;
  senderId: string;
  content: string;
  timestamp: number;
};

export type PresencePayload = {
  sessionId: string;
  participants: string[];
  count: number;
};

/**
 * Emitted to the room when a participant initiates an invite.
 * InviteModal receives this shape and renders the approve/decline prompt.
 */
export type InviteRequest = {
  sessionId: string;
  fromUsername: string;
  inviteeUsername: string;
};

export type ServerToClientEvents = {
  'chat:message':         (msg: ChatMessage) => void;
  'chat:presence':        (p: PresencePayload) => void;
  'chat:typing':          (p: { userId: string; typing: boolean }) => void;
  'chat:tutor_joined':    (p: { sessionId: string; tutorId: string }) => void;

  'chat:invite_request':  (p: InviteRequest) => void;
  'chat:invite_accepted': (p: { sessionId: string; inviteeUsername: string }) => void;
  'chat:invite_declined': (p: { sessionId: string; declinerUsername?: string }) => void;
  'chat:invite_progress': (p: { sessionId: string; approvals: number; requiredApprovals: number }) => void;
  'chat:invite_error':    (p: { reason: string }) => void;

  'session:request':      (p: { sessionId: string }) => void;
  'session:ready':        (p: { sessionId: string }) => void;
  'session:started':      (p: { sessionId: string }) => void;
  'session:paused':       (p: { reason: string }) => void;
  'session:ended':        (p: { reason: string }) => void;
};

export type ClientToServerEvents = {
  'session:join':   (p: { sessionId: string }) => void;
  'session:accept': (p: { sessionId: string }) => void;
  'session:end':    (p: { sessionId: string; reason: string }) => void;

  'chat:join':  (sessionId: string) => void;
  'chat:leave': (sessionId: string) => void;

  'chat:message':       (p: { sessionId: string; content: string; messageId: string }) => void;
  'chat:accept_session': (sessionId: string) => void;

  'chat:typing:start': (p: { sessionId: string }) => void;
  'chat:typing:stop':  (p: { sessionId: string }) => void;

  'chat:invite_request': (p: { sessionId: string; fromUsername?: string; inviteeUsername: string }) => void;
  'chat:invite_accept':  (p: { sessionId: string; responderUsername?: string }) => void;
  'chat:invite_decline': (p: { sessionId: string; responderUsername?: string }) => void;
};
